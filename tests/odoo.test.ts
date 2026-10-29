import { describe, it, expect, vi, afterEach } from 'vitest';
import { OdooJsonRpcAdapter, OdooLeadPayload, RecordingOdooAdapter, MockOdooAdapter } from '../src/integrations/odoo/adapter.js';

type Call = { model: string; method: string; args: any[]; kwargs: Record<string, any> };

// A fake Odoo /jsonrpc endpoint: `handlers` answers model.method calls, every call is recorded
function fakeOdoo(handlers: Record<string, (call: Call) => unknown>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    const { params } = JSON.parse(String(init.body));
    let result: unknown;
    if (params.service === 'common') {
      result = 30; // uid
    } else {
      const [, , , model, method, args, kwargs] = params.args;
      const call = { model, method, args, kwargs };
      calls.push(call);
      const handler = handlers[`${model}.${method}`];
      if (!handler) throw new Error(`Unexpected Odoo call ${model}.${method}`);
      result = handler(call);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), { status: 200 });
  }));
  return calls;
}

const handover: OdooLeadPayload = {
  name: '[AI Handover] Atlas Logistics - Tariq',
  contact_name: 'Tariq Haddad',
  email_from: 'tariq@atlaslogistics.ae',
  partner_name: 'Atlas Logistics',
  description: 'Priority: URGENT_1H\nRisk: <none>',
  priority: '3',
  tagNames: ['AI_HANDOVER', 'DEMO_REQUEST', 'Missing Tag']
};

const pipeline = { teamName: 'Fleet sales' };

describe('OdooJsonRpcAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('adds a note to an existing lead or deal instead of overwriting it', async () => {
    const calls = fakeOdoo({
      'crm.lead.search': () => [412],
      'crm.lead.message_post': () => 9001
    });
    const adapter = new OdooJsonRpcAdapter('https://odoo.test/', 'tactiron_test', 'technical@tactiron.com', 'key', pipeline);

    const result = await adapter.createOrUpdateLead(handover);

    expect(result).toEqual({ odooLeadId: 412, isNew: false });
    expect(calls.map(c => `${c.model}.${c.method}`)).toEqual(['crm.lead.search', 'crm.lead.message_post']);
    // Archived and lost records count as existing, newest active first
    expect(calls[0].kwargs.context).toEqual({ active_test: false });
    expect(calls[0].args[0]).toEqual([['email_from', '=ilike', 'tariq@atlaslogistics.ae']]);
    const note = calls[1];
    expect(note.args).toEqual([[412]]);
    expect(note.kwargs.subtype_xmlid).toBe('mail.mt_note');
    expect(note.kwargs.body_is_html).toBe(true);
    expect(note.kwargs.body).toContain('Priority: URGENT_1H<br>Risk: &lt;none&gt;');
  });

  it('creates a new opportunity in the configured pipeline, stage and tags', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const calls = fakeOdoo({
      'crm.lead.search': () => [],
      'crm.team.search': () => [7],
      'crm.stage.search': () => [3],
      'crm.tag.search_read': () => [{ id: 11, name: 'AI_HANDOVER' }, { id: 13, name: 'DEMO_REQUEST' }],
      'crm.lead.create': () => 555
    });
    const adapter = new OdooJsonRpcAdapter('https://odoo.test', 'tactiron_test', 'technical@tactiron.com', 'key', pipeline);

    const result = await adapter.createOrUpdateLead(handover);

    expect(result).toEqual({ odooLeadId: 555, isNew: true });
    const created = calls.find(c => c.method === 'create')!.args[0];
    expect(created).toMatchObject({
      type: 'opportunity',
      team_id: 7,
      stage_id: 3,
      tag_ids: [[6, 0, [11, 13]]],
      priority: '3',
      email_from: 'tariq@atlaslogistics.ae'
    });
    expect(created.description).toBe('Priority: URGENT_1H<br>Risk: &lt;none&gt;');
    expect(created).not.toHaveProperty('tagNames');
    // Without a stage name, the team's own first stage is used, not the shared stages Odoo would pick
    const stageSearch = calls.find(c => c.model === 'crm.stage')!;
    expect(stageSearch.args[0]).toEqual([['team_ids', 'in', [7]]]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Missing Tag'));

    // Pipeline IDs are looked up once and reused
    await adapter.createOrUpdateLead({ ...handover, email_from: 'second@atlaslogistics.ae' });
    expect(calls.filter(c => c.model === 'crm.team')).toHaveLength(1);
    expect(calls.filter(c => c.model === 'crm.tag')).toHaveLength(2); // second call only retries the missing tag
  });

  it('refuses to fall back to the default pipeline when the sales team is missing', async () => {
    const calls = fakeOdoo({
      'crm.lead.search': () => [],
      'crm.team.search': () => []
    });
    const adapter = new OdooJsonRpcAdapter('https://odoo.test', 'tactiron_test', 'technical@tactiron.com', 'key', pipeline);

    await expect(adapter.createOrUpdateLead(handover)).rejects.toThrow('Odoo sales team "Fleet sales" not found');
    expect(calls.some(c => c.method === 'create')).toBe(false);
  });

  it('matches WhatsApp contacts without an email on phone number', async () => {
    const calls = fakeOdoo({
      'crm.lead.search': () => [88],
      'crm.lead.message_post': () => 1
    });
    const adapter = new OdooJsonRpcAdapter('https://odoo.test', 'tactiron_test', 'technical@tactiron.com', 'key');

    await adapter.createOrUpdateLead({ ...handover, email_from: undefined, phone: '+971501234567' });

    expect(calls[0].args[0]).toEqual(['|', ['phone', '=', '+971501234567'], ['phone_sanitized', '=', '+971501234567']]);
  });
});

describe('Odoo stage lookup by name', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a named stage owned by the team or shared, and fails if it does not exist', async () => {
    const calls = fakeOdoo({
      'crm.lead.search': () => [],
      'crm.team.search': () => [7],
      'crm.stage.search': () => [],
    });
    const adapter = new OdooJsonRpcAdapter('https://odoo.test', 'tactiron_test', 'technical@tactiron.com', 'key', { teamName: 'Fleet sales', stageName: 'Nope' });

    await expect(adapter.createOrUpdateLead({ ...handover, tagNames: [] })).rejects.toThrow('Odoo CRM stage "Nope" not found for team "Fleet sales"');
    expect(calls.find(c => c.model === 'crm.stage')!.args[0]).toEqual([
      ['name', '=ilike', 'Nope'], '|', ['team_ids', 'in', [7]], ['team_ids', '=', false]
    ]);
  });
});

describe('Handover records kept for the ops console', () => {
  it('records what was sent to the CRM, including notes on existing contacts', async () => {
    const recording = new RecordingOdooAdapter(new MockOdooAdapter());

    await recording.createOrUpdateLead(handover);
    await recording.createOrUpdateLead({ ...handover, description: 'Second reply' });

    const leads = recording.getAllLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0].payload.description).toBe(handover.description);
    expect(leads[0].notes).toEqual(['Second reply']);
    expect(recording.getLeadByEmail('TARIQ@atlaslogistics.ae')?.id).toBe(leads[0].id);
  });
});
