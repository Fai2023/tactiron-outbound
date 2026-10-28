import { describe, it, expect } from 'vitest';
import { ApolloDiscoveryService } from '../src/modules/leads/apollo-discovery.js';
import { ApolloCsvImporter } from '../src/modules/leads/apollo-csv.js';
import { MockApolloAdapter } from '../src/integrations/apollo/adapter.js';
import { buildApp } from '../src/app.js';
import { VerticalSliceOrchestrator } from '../src/vertical-slice.js';

describe('Apollo Lead Generation & Discovery', () => {
  it('discovers target PTT leads via Apollo search criteria and evaluates compliance', async () => {
    const adapter = new MockApolloAdapter();
    const service = new ApolloDiscoveryService(adapter);

    const report = await service.discoverLeads({
      countries: ['United Arab Emirates', 'Kenya'],
      titles: ['Operations & Fleet Director', 'Head of Logistics & Security']
    });

    expect(report.totalDiscovered).toBe(2);
    expect(report.newCompaniesCount).toBe(2);
    expect(report.newContactsCount).toBe(2);
    expect(report.eligibleForOutreachCount).toBe(2);
    expect(report.blockedByComplianceCount).toBe(0);

    const uaeLead = report.leads.find(l => l.ingestion.contact.country === 'AE');
    expect(uaeLead).toBeDefined();
    expect(uaeLead?.ingestion.contact.email).toBe('rashid@emiratesdispatch.ae');
    expect(uaeLead?.ingestion.company.teamSize).toBe(48);
    expect(uaeLead?.compliance.allowed).toBe(true);
    expect(uaeLead?.ingestion.company.provenance.source).toBe('Apollo');
  });

  it('correctly flags compliance blocks when Apollo leads are in strict opt-in markets (e.g. Germany cold email)', async () => {
    const adapter = new MockApolloAdapter();
    const service = new ApolloDiscoveryService(adapter);

    const report = await service.discoverLeads({
      countries: ['Germany']
    });

    expect(report.totalDiscovered).toBe(1);
    const germanLead = report.leads[0];
    expect(germanLead.ingestion.contact.country).toBe('DE');
    expect(germanLead.compliance.allowed).toBe(false);
    expect(germanLead.compliance.reasonCode).toBe('CHANNEL_EMAIL_NOT_PERMITTED_IN_DE');
    expect(report.blockedByComplianceCount).toBe(1);
  });

  it('does NOT push cold Apollo leads to Odoo CRM, and formats leads as exportable CSV', async () => {
    const adapter = new MockApolloAdapter();
    const service = new ApolloDiscoveryService(adapter);

    const report = await service.discoverLeads({
      countries: ['United Arab Emirates']
    });

    // Verify leads are in the local report
    expect(report.leads.length).toBeGreaterThan(0);
    // Discovered leads must NOT have an odooLeadId set
    for (const lead of report.leads) {
      expect(lead.odooLeadId).toBeUndefined();
    }

    // Verify CSV export functionality
    const csv = service.exportToCsv(report.leads);
    expect(csv).toContain('Company,Job Title,Contact Name,Contact Email');
    expect(csv).toContain('Emirates Dispatch LLC');
    expect(csv).toContain('rashid@emiratesdispatch.ae');
  });
});

describe('Apollo CSV Batch Importer', () => {
  const importer = new ApolloCsvImporter();

  it('parses standard Apollo CSV exports and normalizes fields', () => {
    const sampleCsv = `First Name,Last Name,Title,Company,Email,Email Status,# Employees,Country,Website
Zayd,Mansoor,Fleet Operations Manager,Dubai Courier LLC,zayd@dubaicourier.ae,verified,65,United Arab Emirates,dubaicourier.ae
Klaus,Weber,Head of Logistics,Bavaria Transport,klaus@bavaria.de,verified,110,Germany,bavaria.de
Invalid,Record,No Email Co,,notanemail,unavailable,10,UAE,`;

    const result = importer.importCsvText(sampleCsv);

    expect(result.totalRows).toBe(3);
    expect(result.importedContacts).toBe(2);
    expect(result.skippedCount).toBe(1); // Skipped row with empty email/website
    expect(result.importedCompanies).toBe(2);
    expect(result.eligibleCount).toBe(1); // UAE email allowed
    expect(result.blockedCount).toBe(1);  // Germany email blocked
  });
});

describe('Apollo API Endpoints in Fastify', () => {
  const orchestrator = new VerticalSliceOrchestrator();
  const app = buildApp(orchestrator);

  it('POST /leads/discover/apollo discovers and returns compliance-checked leads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/leads/discover/apollo',
      payload: {
        countries: ['United Arab Emirates', 'Kenya'],
        minEmployees: 20
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.report.totalDiscovered).toBeGreaterThan(0);
    const lead = body.report.leads[0];
    expect(lead.contactEmail).toBeDefined();
    expect(lead.companyName).toBeDefined();
    expect(lead.jobTitle).toBeDefined();
    expect(lead.contactName).toBeDefined();
    expect(lead.country).toBeDefined();
    expect(lead.industry).toBeDefined();
    expect(lead.complianceAllowed).toBeDefined();
    expect(lead.qualificationOutcome).toBeDefined();
  });

  it('POST /leads/discover/apollo supports industry filtering and returns phone numbers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/leads/discover/apollo',
      payload: {
        countries: ['United Arab Emirates'],
        industries: ['Logistics and Transportation'],
        minEmployees: 20
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.report.leads.length).toBeGreaterThan(0);
    const uaeLead = body.report.leads[0];
    expect(uaeLead.companyName).toBe('Emirates Dispatch LLC');
    expect(uaeLead.contactPhone).toBe('+971501234567');
    expect(uaeLead.companyPhone).toBe('+97142345678');
    expect(uaeLead.industry).toContain('Logistics');
  });

  it('POST /leads/import/apollo-csv imports CSV text directly into the system', async () => {
    const sampleCsv = `First Name,Last Name,Title,Company,Email,Email Status,# Employees,Country,Website
Fatima,Zahra,Dispatch Manager,Abu Dhabi Freight,fatima@adfreight.ae,verified,35,UAE,adfreight.ae`;

    const res = await app.inject({
      method: 'POST',
      url: '/leads/import/apollo-csv',
      payload: {
        csvContent: sampleCsv
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.importedContacts).toBe(1);
    expect(body.result.eligibleCount).toBe(1);
  });

  it('ensures Apollo leads do not end up in Odoo CRM, but are exportable via GET /leads/export', async () => {
    // Check that Odoo has not received any cold leads from Apollo discovery or CSV imports
    const odooLeads = orchestrator.odooAdapter.getAllLeads();
    expect(odooLeads.length).toBe(0);

    // Test GET /leads/export (CSV)
    const csvRes = await app.inject({
      method: 'GET',
      url: '/leads/export'
    });

    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.headers['content-disposition']).toContain('attachment; filename="leads_export_');
    expect(csvRes.body).toContain('Company Name,Domain,Website,Country,Industry,Team Size');
    expect(csvRes.body).toContain('Abu Dhabi Freight');

    // Test GET /leads/export?format=json
    const jsonRes = await app.inject({
      method: 'GET',
      url: '/leads/export?format=json'
    });

    expect(jsonRes.statusCode).toBe(200);
    const jsonBody = jsonRes.json();
    expect(jsonBody.total).toBeGreaterThan(0);
    expect(jsonBody.leads).toBeDefined();
    expect(jsonBody.leads[0].company).toBeDefined();
    expect(jsonBody.leads[0].contact).toBeDefined();
  });
});
