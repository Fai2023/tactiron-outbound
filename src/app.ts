/**
 * Fastify Operational Application Factory
 * Implements headless operational endpoints, provider webhooks, and emergency controls.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { VerticalSliceOrchestrator } from './vertical-slice.js';
import { RawLeadImport } from './modules/leads/ingestion.js';
import { config } from './config/env.js';
import { ApolloDiscoveryService } from './modules/leads/apollo-discovery.js';
import { ApolloCsvImporter } from './modules/leads/apollo-csv.js';
import { MockApolloAdapter, ApolloApiAdapter } from './integrations/apollo/adapter.js';
import { getConsoleHtml } from './ui/console.js';
import { DispatchQueue, DispatchWorker, AutomationSettings } from './modules/dispatch/index.js';
import { WhatsAppHandler } from './modules/whatsapp/handler.js';
import { MockOdooWhatsAppAdapter, OdooWhatsAppAdapter } from './integrations/odoo/whatsapp-adapter.js';
import { MockLLMAdapter } from './integrations/llm/adapter.js';

export function buildApp(
  orchestrator: VerticalSliceOrchestrator = new VerticalSliceOrchestrator(),
  dispatchWorker?: DispatchWorker,
  whatsAppHandler?: WhatsAppHandler
): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
    }
  });

  let isKillSwitchActive = config.KILL_SWITCH_ACTIVE;

  const queue = new DispatchQueue();
  const worker = dispatchWorker || new DispatchWorker(
    queue,
    undefined,
    () => isKillSwitchActive
  );

  const whatsAppAdapter = config.ODOO_URL && config.ODOO_DB && config.ODOO_USERNAME && config.ODOO_API_KEY
    ? new OdooWhatsAppAdapter(config.ODOO_URL, config.ODOO_DB, config.ODOO_USERNAME, config.ODOO_API_KEY)
    : new MockOdooWhatsAppAdapter();

  const waHandler = whatsAppHandler || new WhatsAppHandler(
    new MockLLMAdapter(),
    whatsAppAdapter,
    orchestrator.odooAdapter
  );

  // In non-test environments, start automated background worker runner
  if (config.NODE_ENV !== 'test') {
    worker.start();
  }

  app.addHook('onClose', async () => {
    worker.stop();
  });

  // 1. Health & Readiness Endpoints
  app.get('/health', async () => {
    return {
      status: 'UP',
      service: 'tactiron-outbound-sales',
      timestamp: new Date().toISOString()
    };
  });

  app.get('/ready', async () => {
    return {
      ready: true,
      killSwitchActive: isKillSwitchActive,
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString()
    };
  });

  // 2. Lead Import Endpoint (Batch Ingestion)
  const LeadImportSchema = z.object({
    leads: z.array(z.object({
      companyName: z.string().min(1),
      domain: z.string().min(1),
      website: z.string().optional(),
      country: z.string().length(2),
      region: z.enum(['GCC', 'AFRICA', 'EUROPE', 'OTHER']).optional(),
      industry: z.string().optional(),
      teamSize: z.number().int().positive().optional(),
      segmentFit: z.boolean().optional(),
      contactEmail: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      jobTitle: z.string().optional(),
      phone: z.string().optional(),
      roleIsTarget: z.boolean().optional(),
      source: z.string().default('API_IMPORT'),
      sourceId: z.string().optional(),
      emailDeliverability: z.enum(['deliverable', 'risky', 'undeliverable', 'unknown']).optional()
    }))
  });

  app.post('/leads/import', async (req, reply) => {
    const parseResult = LeadImportSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        details: parseResult.error.format()
      });
    }

    const results = parseResult.data.leads.map(lead => {
      return orchestrator.ingestionService.ingest(lead as RawLeadImport);
    });

    return reply.status(201).send({
      importedCount: results.length,
      companiesCount: new Set(results.map(r => r.company.domain)).size,
      contacts: results.map(r => ({
        email: r.contact.email,
        company: r.company.name,
        isNew: r.isNewContact,
        status: r.contact.status
      }))
    });
  });

  // 2b. Apollo ICP Lead Discovery Endpoint
  const ApolloDiscoverySchema = z.object({
    countries: z.array(z.string()).min(1),
    titles: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    minEmployees: z.number().int().positive().optional(),
    page: z.number().int().positive().optional(),
    perPage: z.number().int().positive().max(100).optional()
  });

  const apolloAdapter = config.APOLLO_API_KEY
    ? new ApolloApiAdapter(config.APOLLO_API_KEY)
    : new MockApolloAdapter();

  const apolloDiscoveryService = new ApolloDiscoveryService(
    apolloAdapter,
    orchestrator.ingestionService,
    orchestrator.complianceRouter,
    orchestrator.qualificationEngine
  );

  app.post('/leads/discover/apollo', async (req, reply) => {
    const parseResult = ApolloDiscoverySchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        details: parseResult.error.format()
      });
    }

    const report = await apolloDiscoveryService.discoverLeads(parseResult.data);
    return reply.status(200).send({
      success: true,
      provider: config.APOLLO_API_KEY ? 'APOLLO_LIVE_API' : 'APOLLO_SANDBOX_MOCK',
      report: {
        totalDiscovered: report.totalDiscovered,
        newCompaniesCount: report.newCompaniesCount,
        newContactsCount: report.newContactsCount,
        skippedNoEmailCount: report.skippedNoEmailCount,
        unknownCountryCount: report.unknownCountryCount,
        unknownTeamSizeCount: report.unknownTeamSizeCount,
        eligibleForOutreachCount: report.eligibleForOutreachCount,
        blockedByComplianceCount: report.blockedByComplianceCount,
        leads: report.leads.map(l => ({
          companyName: l.ingestion.company.name,
          jobTitle: l.ingestion.contact.jobTitle,
          contactName: [l.ingestion.contact.firstName, l.ingestion.contact.lastName].filter(Boolean).join(' ') || l.ingestion.contact.email,
          contactEmail: l.ingestion.contact.email,
          contactPhone: l.ingestion.contact.phone,
          companyPhone: l.ingestion.company.companyPhone,
          country: l.ingestion.contact.country,
          industry: l.ingestion.company.industry,
          teamSize: l.ingestion.company.teamSize,
          complianceAllowed: l.compliance.allowed,
          complianceReason: l.compliance.reasonCode,
          qualificationOutcome: l.qualification.outcome
        }))
      }
    });
  });

  // 2c. Apollo CSV Import Endpoint
  const apolloCsvImporter = new ApolloCsvImporter(
    orchestrator.ingestionService,
    orchestrator.complianceRouter,
    orchestrator.qualificationEngine
  );

  app.post('/leads/import/apollo-csv', async (req, reply) => {
    const body = req.body as { csvContent?: string };
    if (!body?.csvContent) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Request body must contain "csvContent" string.'
      });
    }

    const result = apolloCsvImporter.importCsvText(body.csvContent);
    return reply.status(200).send({
      success: true,
      result
    });
  });

  // 2c-2. Leads Export Endpoint (Export all ingested/discovered leads as CSV or JSON)
  app.get('/leads/export', async (req, reply) => {
    const query = req.query as { format?: string } | undefined;
    const format = query?.format?.toLowerCase() || 'csv';

    if (format === 'json') {
      const records = orchestrator.ingestionService.getExportableRecords();
      return reply.status(200).send({
        total: records.length,
        leads: records
      });
    }

    const csv = orchestrator.ingestionService.exportToCsv();
    const dateStr = new Date().toISOString().slice(0, 10);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="leads_export_${dateStr}.csv"`)
      .status(200)
      .send(csv);
  });

  // 2d. Queue Discovered Leads into Outreach Campaign Endpoint
  const QueueLeadsSchema = z.object({
    campaignName: z.string().optional().default('PTT GCC & Regional Fleet Outbound'),
    leads: z.array(z.object({
      contactEmail: z.string().email(),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      jobTitle: z.string().optional(),
      contactPhone: z.string().optional(),
      companyPhone: z.string().optional(),
      country: z.string().optional(),
      industry: z.string().optional(),
      complianceAllowed: z.boolean().optional(),
      complianceReason: z.string().optional(),
      qualificationOutcome: z.string().optional()
    })).min(1)
  });

  app.post('/campaigns/queue-leads', async (req, reply) => {
    if (isKillSwitchActive) {
      return reply.status(403).send({
        error: 'KILL_SWITCH_ACTIVE',
        message: 'Campaign queuing blocked: Emergency kill switch is currently active.'
      });
    }

    const parseResult = QueueLeadsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        details: parseResult.error.format()
      });
    }

    const { campaignName, leads } = parseResult.data;
    const queued: Array<{ email: string; company?: string }> = [];
    const blocked: Array<{ email: string; reason?: string }> = [];

    for (const lead of leads) {
      // If marked as not compliant, block from outreach campaign
      if (lead.complianceAllowed === false) {
        blocked.push({
          email: lead.contactEmail,
          reason: lead.complianceReason || 'BLOCKED_BY_COMPLIANCE'
        });
        continue;
      }

      // If contact is actively chatting on WhatsApp, block/suppress from email campaign
      const contact = orchestrator.ingestionService.getContact(lead.contactEmail);
      const contactPhone = lead.contactPhone || contact?.phone;
      if (contactPhone && waHandler.isPhoneActiveOnWhatsApp(contactPhone)) {
        blocked.push({
          email: lead.contactEmail,
          reason: 'BLOCKED_ACTIVE_WHATSAPP_CONVERSATION: Prospect is actively conversing via WhatsApp; email sequence suppressed.'
        });
        continue;
      }

      // Update contact status in ingestion store
      if (contact) {
        contact.status = 'IN_CAMPAIGN';
      }

      // Enqueue job into Dispatch Queue for automated worker
      worker.getQueue().enqueue({
        leadEmail: lead.contactEmail,
        companyName: lead.companyName || 'Unknown Company',
        campaignName,
        step: 1,
        status: 'PENDING',
        scheduledAt: new Date()
      });

      queued.push({
        email: lead.contactEmail,
        company: lead.companyName
      });
    }

    return reply.status(200).send({
      success: true,
      campaignName,
      totalSubmitted: leads.length,
      queuedCount: queued.length,
      blockedCount: blocked.length,
      queued,
      blocked,
      message: `Successfully queued ${queued.length} eligible lead(s) for outreach in campaign "${campaignName}".${blocked.length > 0 ? ` (${blocked.length} lead(s) blocked by compliance).` : ''}`
    });
  });

  // 3. Smartlead Inbound Reply Webhook
  const SmartleadWebhookSchema = z.object({
    event_type: z.string(), // E.g., 'EMAIL_REPLY', 'EMAIL_BOUNCE', 'UNSUBSCRIBE'
    campaign_id: z.string().or(z.number()),
    lead_email: z.string().email(),
    reply_text: z.string().optional(),
    secret_key: z.string().optional()
  });

  app.post('/webhooks/smartlead', async (req, reply) => {
    const parseResult = SmartleadWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_WEBHOOK_PAYLOAD',
        details: parseResult.error.format()
      });
    }

    const data = parseResult.data;

    // Handle Unsubscribe / Bounce
    if (data.event_type === 'UNSUBSCRIBE' || data.event_type === 'EMAIL_BOUNCE') {
      const contact = orchestrator.ingestionService.getContact(data.lead_email);
      if (contact) {
        contact.status = 'SUPPRESSED';
      }
      return reply.status(200).send({
        received: true,
        action: 'CONTACT_SUPPRESSED',
        email: data.lead_email
      });
    }

    // Handle Inbound Reply
    if (data.event_type === 'EMAIL_REPLY' && data.reply_text) {
      const contact = orchestrator.ingestionService.getContact(data.lead_email);
      const company = contact ? orchestrator.ingestionService.getCompany(contact.email.split('@')[1]) : undefined;

      if (!contact || !company) {
        return reply.status(404).send({
          error: 'CONTACT_OR_COMPANY_NOT_FOUND',
          leadEmail: data.lead_email
        });
      }

      const execution = await orchestrator.run({
        lead: {
          companyName: company.name,
          domain: company.domain,
          country: company.country,
          teamSize: company.teamSize,
          segmentFit: company.segmentFit,
          contactEmail: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          jobTitle: contact.jobTitle,
          roleIsTarget: contact.roleIsTarget,
          source: 'SMARTLEAD_WEBHOOK'
        },
        channel: 'EMAIL',
        simulatedOutboundMessage: 'Previous outreach dispatch',
        simulatedInboundReply: data.reply_text
      });

      return reply.status(200).send({
        received: true,
        replyClassification: execution.replyClassification,
        qualificationOutcome: execution.qualification.outcome,
        handoverStatus: execution.handoverEvent?.status || 'NO_HANDOVER_REQUIRED',
        odooLeadId: execution.handoverEvent?.odooLeadId
      });
    }

    return reply.status(200).send({ received: true, status: 'IGNORED_EVENT_TYPE' });
  });

  // 3b. Odoo Native WhatsApp Inbound Webhook
  const OdooWhatsAppWebhookSchema = z.object({
    channelId: z.number().int().positive(),
    phone: z.string().min(1),
    partnerName: z.string().min(1),
    messageBody: z.string().min(1),
    partnerEmail: z.string().email().optional(),
    timestamp: z.string().optional()
  });

  app.post('/webhooks/odoo/whatsapp', async (req, reply) => {
    const parseResult = OdooWhatsAppWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_WEBHOOK_PAYLOAD',
        details: parseResult.error.format()
      });
    }

    const data = parseResult.data;
    const result = await waHandler.handleIncoming(data);

    // Suppress pending email dispatch jobs for this prospect to prevent double outreach
    const emailToSuppress = data.partnerEmail || (() => {
      // Look up contact by phone if email wasn't provided directly in webhook
      const contacts = orchestrator.ingestionService.getAllContacts();
      for (const c of contacts) {
        if (c.phone && waHandler.isPhoneActiveOnWhatsApp(c.phone)) {
          return c.email;
        }
      }
      return undefined;
    })();

    if (emailToSuppress) {
      const contact = orchestrator.ingestionService.getContact(emailToSuppress);
      if (contact) {
        contact.status = 'HANDED_OVER';
      }

      const pendingJobs = worker.getQueue().getAllJobs().filter(
        j => j.leadEmail.toLowerCase() === emailToSuppress.toLowerCase() && j.status === 'PENDING'
      );
      for (const job of pendingJobs) {
        worker.getQueue().updateJob(job.id, {
          status: 'SUPPRESSED',
          lastError: 'ACTIVE_WHATSAPP_CONVERSATION: Email sequence paused due to active WhatsApp conversation.'
        });
      }
    }

    return reply.status(200).send({
      received: true,
      ...result
    });
  });

  // 3c. WhatsApp Conversations List for Ops UI
  app.get('/internal/whatsapp/conversations', async () => {
    return {
      total: waHandler.conversationLog.length,
      activePhones: Array.from(waHandler.activeWhatsAppPhones),
      conversations: waHandler.conversationLog
    };
  });

  // 3d. Simulate WhatsApp Message Endpoint (for Testing and Console Demo)
  const SimulateWhatsAppSchema = z.object({
    phone: z.string().default('+971501234567'),
    partnerName: z.string().default('Ahmed Al-Mansoor'),
    messageBody: z.string().min(1),
    partnerEmail: z.string().email().optional(),
    channelId: z.number().int().positive().default(42)
  });

  app.post('/internal/whatsapp/simulate', async (req, reply) => {
    const parseResult = SimulateWhatsAppSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', details: parseResult.error.format() });
    }

    const data = parseResult.data;
    const result = await waHandler.handleIncoming(data);

    if (data.partnerEmail) {
      const contact = orchestrator.ingestionService.getContact(data.partnerEmail);
      if (contact) {
        contact.status = 'HANDED_OVER';
      }

      const pendingJobs = worker.getQueue().getAllJobs().filter(
        j => j.leadEmail.toLowerCase() === data.partnerEmail!.toLowerCase() && j.status === 'PENDING'
      );
      for (const job of pendingJobs) {
        worker.getQueue().updateJob(job.id, {
          status: 'SUPPRESSED',
          lastError: 'ACTIVE_WHATSAPP_CONVERSATION: Email sequence paused due to active WhatsApp conversation.'
        });
      }
    }

    return reply.status(200).send({
      success: true,
      ...result
    });
  });

  // 4. Emergency Kill Switch Endpoints
  app.post('/internal/campaigns/pause', async (_req, reply) => {
    isKillSwitchActive = true;
    return reply.status(200).send({
      message: 'EMERGENCY KILL SWITCH ACTIVATED. All outbound dispatches are frozen.',
      killSwitchActive: true,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/internal/campaigns/resume', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.includes('Bearer')) {
      return reply.status(401).send({ error: 'UNAUTHORIZED_RESUME_REQUEST' });
    }

    isKillSwitchActive = false;
    return reply.status(200).send({
      message: 'Outbound campaigns safely resumed with authorization.',
      killSwitchActive: false,
      timestamp: new Date().toISOString()
    });
  });

  // 5. KPIs and Operational Tracking
  app.get('/internal/kpis', async () => {
    const odooLeads = orchestrator.odooAdapter.getAllLeads();
    return {
      leadsHandedOverCount: odooLeads.length,
      missedEscalations: 0,
      missedEscalationStatus: 'On target (0)',
      targetSLA: {
        demoMeetingRequests: 'Within 1 hour',
        commercialHandovers: 'Within 4 business hours',
        complianceEscalations: 'Within 1 business day'
      }
    };
  });

  // 6. Odoo Handovers List for Ops UI
  app.get('/internal/handovers', async () => {
    const odooLeads = orchestrator.odooAdapter.getAllLeads();
    return {
      total: odooLeads.length,
      leads: odooLeads.map(l => ({
        id: l.id,
        contact_name: l.payload.contact_name,
        email_from: l.payload.email_from,
        partner_name: l.payload.partner_name,
        priority: l.payload.priority,
        description: l.payload.description,
        updatedAt: l.updatedAt
      }))
    };
  });

  // 7. Interactive Reply Simulator for Ops Testing
  const SimulateReplySchema = z.object({
    replyText: z.string().min(1),
    companyName: z.string().default('Simulated Fleet LLC'),
    country: z.string().default('AE'),
    contactEmail: z.string().email().default('operations@fleet.ae'),
    teamSize: z.number().default(40)
  });

  app.post('/internal/simulate-reply', async (req, reply) => {
    const parseResult = SimulateReplySchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', details: parseResult.error.format() });
    }

    const { replyText, companyName, country, contactEmail, teamSize } = parseResult.data;
    const domain = contactEmail.split('@')[1];

    const execution = await orchestrator.run({
      lead: {
        companyName,
        domain,
        country,
        teamSize,
        segmentFit: true,
        contactEmail,
        firstName: 'Simulated',
        lastName: 'Contact',
        jobTitle: 'Fleet Director',
        roleIsTarget: true,
        source: 'OPS_CONSOLE_SIMULATOR'
      },
      channel: 'EMAIL',
      simulatedOutboundMessage: 'Previous PTT introduction message',
      simulatedInboundReply: replyText
    });

    return reply.status(200).send({
      replyClassification: execution.replyClassification,
      qualificationOutcome: execution.qualification.outcome,
      handoverStatus: execution.handoverEvent?.status || 'NO_HANDOVER',
      handoverDescription: execution.handoverEvent
        ? orchestrator.handoverService.formatOdooDescription(
            execution.handoverEvent.handoverPack,
            execution.handoverEvent.priority,
            execution.handoverEvent.slaDeadline
          )
        : null
    });
  });

  // 7b. Automation Settings & Dispatch Worker Queue Endpoints
  app.get('/internal/automation/settings', async () => {
    return {
      settings: worker.getSettings(),
      stats: worker.getStats()
    };
  });

  const UpdateSettingsSchema = z.object({
    schedule: z.object({
      sendStart: z.string().optional(),
      sendEnd: z.string().optional(),
      timezone: z.string().optional(),
      sendDays: z.array(z.string()).optional(),
      maxPerDay: z.number().int().positive().optional()
    }).optional(),
    cadence: z.object({
      followupDelayDays: z.number().int().positive().optional(),
      maxSequenceSteps: z.number().int().positive().optional(),
      batchIntervalMinutes: z.number().int().positive().optional()
    }).optional(),
    retry: z.object({
      maxRetries: z.number().int().nonnegative().optional(),
      retryBackoffSeconds: z.number().int().positive().optional(),
      onBounceAction: z.enum(['suppress', 'retry_once', 'flag']).optional()
    }).optional(),
    classification: z.object({
      confidenceThreshold: z.number().min(0).max(100).optional(),
      qaMode: z.enum(['full_review', 'sample_review', 'auto']).optional()
    }).optional()
  });

  app.post('/internal/automation/settings', async (req, reply) => {
    const parseResult = UpdateSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        details: parseResult.error.format()
      });
    }

    const updatedSettings = worker.updateSettings(parseResult.data as any);
    return reply.status(200).send({
      success: true,
      settings: updatedSettings,
      stats: worker.getStats(),
      message: 'Automation settings updated and dispatch worker rescheduled successfully.'
    });
  });

  app.get('/internal/automation/queue', async () => {
    return {
      stats: worker.getStats(),
      jobs: worker.getQueue().getAllJobs()
    };
  });

  app.post('/internal/automation/trigger-batch', async (req) => {
    const body = (req.body as { forceWindow?: boolean } | undefined) || {};
    const result = await worker.runBatch(Boolean(body.forceWindow));
    return {
      success: true,
      result,
      stats: worker.getStats()
    };
  });

  // 8. Serve Operations & Tech Web Console UI
  app.get('/', async (_req, reply) => {
    return reply.redirect('/console');
  });

  app.get('/console', async (_req, reply) => {
    reply.type('text/html; charset=utf-8');
    return reply.send(getConsoleHtml());
  });

  return app;
}
