import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MockOdooAdapter } from '../src/integrations/odoo/adapter.js';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { VerticalSliceOrchestrator } from '../src/vertical-slice.js';

describe('Operational API & Webhook Endpoints', () => {
  let app: FastifyInstance;
  let orchestrator: VerticalSliceOrchestrator;

  beforeAll(async () => {
    orchestrator = new VerticalSliceOrchestrator();
    app = buildApp(orchestrator);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns UP status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('UP');
    expect(body.service).toBe('tactiron-outbound-sales');
  });

  it('GET /ready returns readiness and kill switch state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/ready'
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ready).toBe(true);
    expect(body.killSwitchActive).toBe(false);
  });

  it('POST /leads/import ingests and deduplicates a batch of leads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/leads/import',
      payload: {
        leads: [
          {
            companyName: 'Red Sea Logistics',
            domain: 'redsealogistics.eg',
            country: 'EG',
            region: 'AFRICA',
            teamSize: 40,
            segmentFit: true,
            contactEmail: 'director@redsealogistics.eg',
            firstName: 'Amr',
            lastName: 'Diab',
            jobTitle: 'Fleet Director',
            roleIsTarget: true,
            source: 'Apollo'
          }
        ]
      }
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.importedCount).toBe(1);
    expect(body.contacts[0].email).toBe('director@redsealogistics.eg');
    expect(body.contacts[0].isNew).toBe(true);
  });

  it('POST /webhooks/smartlead processes an UNSUBSCRIBE event and suppresses the contact', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/smartlead',
      payload: {
        event_type: 'UNSUBSCRIBE',
        campaign_id: 'camp_123',
        lead_email: 'director@redsealogistics.eg'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.action).toBe('CONTACT_SUPPRESSED');

    const contact = orchestrator.ingestionService.getContact('director@redsealogistics.eg');
    expect(contact?.status).toBe('SUPPRESSED');
  });

  it('POST /internal/campaigns/pause activates global emergency kill switch', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/campaigns/pause'
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.killSwitchActive).toBe(true);
  });

  it('POST /internal/campaigns/resume requires authorization', async () => {
    const unauthorizedRes = await app.inject({
      method: 'POST',
      url: '/internal/campaigns/resume'
    });
    expect(unauthorizedRes.statusCode).toBe(401);

    const authorizedRes = await app.inject({
      method: 'POST',
      url: '/internal/campaigns/resume',
      headers: {
        authorization: 'Bearer valid_admin_token'
      }
    });
    expect(authorizedRes.statusCode).toBe(200);
    expect(authorizedRes.json().killSwitchActive).toBe(false);
  });

  it('GET /internal/kpis returns zero missed escalations and target SLAs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/kpis'
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.missedEscalations).toBe(0);
    expect(body.missedEscalationStatus).toBe('On target (0)');
    expect(body.targetSLA.demoMeetingRequests).toBe('Within 1 hour');
  });

  it('GET /console renders the Operations & Tech Console UI HTML', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/console'
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Tactiron Outbound Ops Console');
    expect(res.body).toContain('Apollo ICP Lead Discovery');
    expect(res.body).toContain('Inbound Reply & Guardrail Testing Lab');
  });

  it('GET / redirects to /console', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/'
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/console');
  });

  it('POST /internal/simulate-reply explains a failed Odoo handover', async () => {
    const odoo = orchestrator.odooAdapter as MockOdooAdapter;
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    odoo.simulateNetworkFailure = true;
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/internal/simulate-reply',
        payload: { contactEmail: 'ops@failingcrm.ae', replyText: 'Can we book a demo next week?' }
      });

      const body = res.json();
      expect(body.handoverStatus).toBe('FAILED_RETRYING');
      expect(body.handoverError).toBe('Simulated Odoo connection timeout (HTTP 504)');
      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('Odoo handover failed for ops@failingcrm.ae'));
    } finally {
      odoo.simulateNetworkFailure = false;
      errorLog.mockRestore();
    }
  });

  it('POST /internal/simulate-reply runs simulator and returns classification and handover pack', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/simulate-reply',
      payload: {
        companyName: 'Sharjah Transport Co',
        country: 'AE',
        contactEmail: 'fleet@sharjahtransport.ae',
        teamSize: 50,
        replyText: 'Can you give us a quote and pricing for 50 handhelds?'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.replyClassification.replyType).toBe(5); // Pricing
    expect(body.replyClassification.guardrailKeywordHit).toBe(true);
    expect(body.handoverDescription).toContain('AI OUTBOUND SALES HANDOVER PACK');
  });

  it('POST /campaigns/queue-leads queues eligible leads and blocks non-compliant leads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/queue-leads',
      payload: {
        campaignName: 'Q4 Regional Dispatch Fleet Outbound',
        leads: [
          {
            contactEmail: 'rashid@emiratesdispatch.ae',
            companyName: 'Emirates Dispatch LLC',
            complianceAllowed: true
          },
          {
            contactEmail: 'klaus@berlin-spedition.de',
            companyName: 'Berlin Spedition GmbH',
            complianceAllowed: false,
            complianceReason: 'CHANNEL_EMAIL_NOT_PERMITTED_IN_DE'
          }
        ]
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.queuedCount).toBe(1);
    expect(body.blockedCount).toBe(1);
    expect(body.queued[0].email).toBe('rashid@emiratesdispatch.ae');
    expect(body.blocked[0].email).toBe('klaus@berlin-spedition.de');
  });
});
