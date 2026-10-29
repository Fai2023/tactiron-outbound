/**
 * Odoo CRM Integration Adapter
 * Creates leads in Odoo CRM for warm handovers. A contact who already has a lead or deal in
 * Odoo is never overwritten: the handover is posted on that record as an internal note instead.
 */

import { HandoverPack, HandoverPriority } from '../../core/types/index.js';

export interface OdooLeadPayload {
  name: string; // Opportunity / Lead title
  contact_name: string;
  email_from?: string; // Absent for WhatsApp contacts with no known email; matched on phone instead
  phone?: string;
  partner_name: string; // Company name
  description: string;  // Formatted handover pack description (plain text)
  priority: '0' | '1' | '2' | '3'; // Odoo priority stars
  /** Tag names for a new record, e.g. ['AI_HANDOVER', 'DEMO_REQUEST']; not sent to Odoo as a field */
  tagNames?: string[];
}

export interface OdooSyncResult {
  odooLeadId: number;
  /** false when the contact already had a lead or deal and the handover was added as a note */
  isNew: boolean;
}

export interface IOdooAdapter {
  createOrUpdateLead(payload: OdooLeadPayload): Promise<OdooSyncResult>;
}

/** Where new handovers land in Odoo. Names, not IDs, so the same settings work on test and live. */
export interface OdooPipelineConfig {
  /** Sales team that owns the pipeline, e.g. "Fleet Sales". Unset: Odoo's default team. */
  teamName?: string;
  /** Stage for new leads. Unset: the team's own first stage (not the shared stages Odoo would pick). */
  stageName?: string;
}

export interface OdooLeadRecord {
  id: number;
  payload: OdooLeadPayload;
  /** Handovers added to an existing record instead of overwriting it */
  notes: string[];
  updatedAt: Date;
}

function matchKey(payload: OdooLeadPayload): string {
  return (payload.email_from || payload.phone || payload.name).toLowerCase().trim();
}

/**
 * Mock Odoo CRM Adapter for Local Development and Integration Testing
 * Keeps state in-memory and follows the same rule as Odoo: an existing contact gets a note, not an overwrite.
 */
export class MockOdooAdapter implements IOdooAdapter {
  private leads: Map<string, OdooLeadRecord> = new Map();
  private nextId = 1001;
  public simulateNetworkFailure = false;

  public async createOrUpdateLead(payload: OdooLeadPayload): Promise<OdooSyncResult> {
    if (this.simulateNetworkFailure) {
      throw new Error('Simulated Odoo connection timeout (HTTP 504)');
    }

    const key = matchKey(payload);
    const existing = this.leads.get(key);

    if (existing) {
      existing.notes.push(payload.description);
      existing.updatedAt = new Date();
      return { odooLeadId: existing.id, isNew: false };
    }

    const odooLeadId = this.nextId++;
    this.leads.set(key, { id: odooLeadId, payload, notes: [], updatedAt: new Date() });
    return { odooLeadId, isNew: true };
  }

  public getLeadByEmail(email: string) {
    return this.leads.get(email.toLowerCase().trim());
  }

  public getAllLeads() {
    return Array.from(this.leads.values());
  }
}

/**
 * Forwards every handover to the real CRM adapter and keeps a local copy of what was sent,
 * which the ops console lists at /internal/handovers.
 */
export class RecordingOdooAdapter implements IOdooAdapter {
  private records: Map<number, OdooLeadRecord> = new Map();

  constructor(private delegate: IOdooAdapter) {}

  public async createOrUpdateLead(payload: OdooLeadPayload): Promise<OdooSyncResult> {
    const result = await this.delegate.createOrUpdateLead(payload);
    const existing = this.records.get(result.odooLeadId);
    if (existing) {
      existing.notes.push(payload.description);
      existing.updatedAt = new Date();
    } else {
      this.records.set(result.odooLeadId, {
        id: result.odooLeadId,
        payload,
        notes: result.isNew ? [] : [payload.description],
        updatedAt: new Date()
      });
    }
    return result;
  }

  public getLeadByEmail(email: string) {
    const key = email.toLowerCase().trim();
    return this.getAllLeads().find(r => r.payload.email_from?.toLowerCase().trim() === key);
  }

  public getAllLeads() {
    return Array.from(this.records.values());
  }
}

/** Odoo's description and chatter fields are HTML; keep the pack's line breaks */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped.split('\n').join('<br>');
}

/**
 * Production Odoo JSON-RPC Adapter
 * Interacts with Odoo's standard /jsonrpc endpoint
 */
export class OdooJsonRpcAdapter implements IOdooAdapter {
  private url: string;
  private db: string;
  private username: string;
  private apiKey: string;
  private pipeline: OdooPipelineConfig;
  private uid: number | null = null;
  private pipelineFields: Promise<Record<string, unknown>> | null = null;
  private tagIds: Map<string, number> = new Map();

  constructor(url: string, db: string, username: string, apiKey: string, pipeline: OdooPipelineConfig = {}) {
    this.url = url.replace(/\/+$/, '');
    this.db = db;
    this.username = username;
    this.apiKey = apiKey;
    this.pipeline = pipeline;
  }

  private async jsonRpcCall(service: string, method: string, args: unknown[]): Promise<unknown> {
    const response = await fetch(`${this.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service, method, args },
        id: Math.floor(Math.random() * 100000)
      })
    });

    if (!response.ok) {
      throw new Error(`Odoo HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { result?: unknown; error?: { message: string; data?: { message?: string } } };
    if (data.error) {
      throw new Error(`Odoo RPC Error: ${data.error.data?.message || data.error.message}`);
    }

    return data.result;
  }

  private async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = await this.jsonRpcCall('common', 'authenticate', [
      this.db,
      this.username,
      this.apiKey,
      {}
    ]) as number;

    if (!uid) {
      throw new Error('Odoo authentication failed: Invalid credentials');
    }
    this.uid = uid;
    return uid;
  }

  private async execute<T>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
    const uid = await this.authenticate();
    return await this.jsonRpcCall('object', 'execute_kw', [this.db, uid, this.apiKey, model, method, args, kwargs]) as T;
  }

  /** Team, stage and tag IDs for new leads, looked up by name once and cached */
  private resolvePipelineFields(): Promise<Record<string, unknown>> {
    if (!this.pipelineFields) {
      this.pipelineFields = this.lookupPipelineFields().catch(err => {
        this.pipelineFields = null; // Retry the lookup on the next handover
        throw err;
      });
    }
    return this.pipelineFields;
  }

  private async lookupPipelineFields(): Promise<Record<string, unknown>> {
    const fields: Record<string, unknown> = {};
    const { teamName, stageName } = this.pipeline;

    if (teamName) {
      // Fail loudly rather than drop handovers into the default pipeline
      const teams = await this.execute<number[]>('crm.team', 'search', [[['name', '=ilike', teamName]]], { limit: 1 });
      if (!teams.length) throw new Error(`Odoo sales team "${teamName}" not found`);
      fields.team_id = teams[0];
    }

    // Stages belong to teams through team_ids (Odoo 17+). Without an explicit stage Odoo would pick the
    // lowest-sequence stage including shared ones, which is not the team's own intake stage.
    if (stageName || fields.team_id) {
      const domain: unknown[] = stageName ? [['name', '=ilike', stageName]] : [];
      if (fields.team_id) {
        domain.push(...(stageName
          ? ['|', ['team_ids', 'in', [fields.team_id]], ['team_ids', '=', false]]
          : [['team_ids', 'in', [fields.team_id]]]));
      }
      const stages = await this.execute<number[]>('crm.stage', 'search', [domain], { limit: 1, order: 'sequence asc, id asc' });
      if (stages.length) {
        fields.stage_id = stages[0];
      } else if (stageName) {
        throw new Error(`Odoo CRM stage "${stageName}" not found${teamName ? ` for team "${teamName}"` : ''}`);
      }
    }

    return fields;
  }

  /** Tag IDs by name, looked up once per name; missing tags are skipped, never created */
  private async resolveTagIds(names: string[]): Promise<number[]> {
    const unknown = names.filter(n => !this.tagIds.has(n.toLowerCase()));
    if (unknown.length) {
      const tags = await this.execute<{ id: number; name: string }[]>(
        'crm.tag', 'search_read', [[['name', 'in', unknown]]], { fields: ['id', 'name'] }
      );
      for (const tag of tags) this.tagIds.set(tag.name.toLowerCase(), tag.id);
      const missing = unknown.filter(n => !this.tagIds.has(n.toLowerCase()));
      if (missing.length) console.warn(`Odoo tags not found, skipped: ${missing.join(', ')}`);
    }
    return names.map(n => this.tagIds.get(n.toLowerCase())).filter((id): id is number => id !== undefined);
  }

  /** The contact's newest lead or deal, including archived and lost ones */
  private async findExisting(payload: OdooLeadPayload): Promise<number | undefined> {
    let domain: unknown[];
    if (payload.email_from) {
      domain = [['email_from', '=ilike', payload.email_from.trim()]];
    } else if (payload.phone) {
      domain = ['|', ['phone', '=', payload.phone], ['phone_sanitized', '=', payload.phone]];
    } else {
      return undefined;
    }

    const ids = await this.execute<number[]>('crm.lead', 'search', [domain], {
      limit: 1,
      order: 'active desc, id desc',
      context: { active_test: false }
    });
    return ids[0];
  }

  public async createOrUpdateLead(payload: OdooLeadPayload): Promise<OdooSyncResult> {
    const existingId = await this.findExisting(payload);

    if (existingId) {
      // Never overwrite a record a rep may already be working: add the handover to its chatter
      // Over RPC the body arrives as a plain string, which Odoo escapes unless body_is_html is set
      await this.execute('crm.lead', 'message_post', [[existingId]], {
        body: textToHtml(`${payload.name}\n\n${payload.description}`),
        body_is_html: true,
        message_type: 'comment',
        subtype_xmlid: 'mail.mt_note'
      });
      return { odooLeadId: existingId, isNew: false };
    }

    const { tagNames, ...fields } = payload;
    const pipelineFields = await this.resolvePipelineFields();
    const tagIds = tagNames?.length ? await this.resolveTagIds(tagNames) : [];
    const newId = await this.execute<number>('crm.lead', 'create', [{
      ...fields,
      description: textToHtml(payload.description),
      type: 'opportunity', // Lands in the pipeline, not the Leads inbox
      ...pipelineFields,
      ...(tagIds.length ? { tag_ids: [[6, 0, tagIds]] } : {})
    }]);

    return { odooLeadId: newId, isNew: true };
  }
}

/** Real Odoo when every connection setting is present, otherwise the in-memory mock */
export function createOdooAdapter(settings: {
  url?: string;
  db?: string;
  username?: string;
  apiKey?: string;
  pipeline?: OdooPipelineConfig;
}): RecordingOdooAdapter | MockOdooAdapter {
  const { url, db, username, apiKey } = settings;
  if (url && db && username && apiKey) {
    return new RecordingOdooAdapter(new OdooJsonRpcAdapter(url, db, username, apiKey, settings.pipeline));
  }
  return new MockOdooAdapter();
}
