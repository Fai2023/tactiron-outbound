import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApolloDiscoveryService } from '../src/modules/leads/apollo-discovery.js';
import { ApolloCsvImporter } from '../src/modules/leads/apollo-csv.js';
import { MockApolloAdapter, ApolloApiAdapter, IApolloAdapter, ApolloRawPerson, decodeHtmlEntities } from '../src/integrations/apollo/adapter.js';
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

describe('ApolloApiAdapter (live API contract)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('searches with the X-Api-Key header and reveals emails via bulk_match', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const body = url.endsWith('/mixed_people/api_search')
        ? {
            people: [
              { id: 'p1', first_name: 'Amina', title: 'Fleet Manager', has_email: true, organization: { name: 'Swift Haulage' } },
              { id: 'p2', first_name: 'Omar', title: 'Dispatch Manager', has_email: false }
            ],
            total_entries: 2
          }
        : {
            matches: [
              {
                id: 'p1',
                last_name: 'Otieno',
                email: 'amina@swifthaulage.co.ke',
                email_status: 'verified',
                organization: { primary_domain: 'swifthaulage.co.ke', estimated_num_employees: 140 }
              }
            ]
          };
      return new Response(JSON.stringify(body), { status: 200 });
    }));

    const adapter = new ApolloApiAdapter('test-key');
    const result = await adapter.searchPeople({ personTitles: ['Fleet Manager'], organizationIndustries: ['logistics'] });

    expect(calls[0].url).toBe('https://api.apollo.io/api/v1/mixed_people/api_search');
    expect((calls[0].init.headers as Record<string, string>)['X-Api-Key']).toBe('test-key');
    const searchBody = JSON.parse(calls[0].init.body as string);
    expect(searchBody.api_key).toBeUndefined();
    expect(searchBody.q_organization_keyword_tags).toEqual(['logistics']);

    // Only the person Apollo has an email for is revealed
    expect(calls[1].url).toBe('https://api.apollo.io/api/v1/people/bulk_match');
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ details: [{ id: 'p1' }] });

    const amina = result.people.find(p => p.id === 'p1');
    expect(amina?.email).toBe('amina@swifthaulage.co.ke');
    expect(amina?.organization).toMatchObject({ name: 'Swift Haulage', primary_domain: 'swifthaulage.co.ke', estimated_num_employees: 140 });
    expect(result.people.find(p => p.id === 'p2')?.email).toBeUndefined();
  });
});

describe('Apollo discovery with incomplete records', () => {
  const stubAdapter = (people: ApolloRawPerson[]): IApolloAdapter => ({
    searchPeople: async () => ({ people, pagination: { page: 1, per_page: 25, total_entries: people.length, total_pages: 1 } }),
    enrichOrganization: async () => null
  });

  it('counts people skipped for having no email', async () => {
    const service = new ApolloDiscoveryService(stubAdapter([
      { id: 'a', title: 'Fleet Manager' },
      { id: 'b', title: 'Dispatch Manager', email: 'b@haulco.co.ke', country: 'Kenya', organization: { name: 'HaulCo', estimated_num_employees: 80 } }
    ]));
    const report = await service.discoverLeads({ countries: ['Kenya'] });

    expect(report.totalDiscovered).toBe(2);
    expect(report.skippedNoEmailCount).toBe(1);
    expect(report.leads).toHaveLength(1);
  });

  it('keeps an unknown country as UNKNOWN so compliance fails closed', async () => {
    const service = new ApolloDiscoveryService(stubAdapter([
      { id: 'a', title: 'Fleet Manager', email: 'a@nowhere.example', organization: { name: 'Nowhere Ltd', estimated_num_employees: 80 } }
    ]));
    const report = await service.discoverLeads({ countries: ['Kenya'] });

    expect(report.unknownCountryCount).toBe(1);
    expect(report.leads[0].ingestion.contact.country).toBe('UNKNOWN');
    expect(report.leads[0].compliance.allowed).toBe(false);
    expect(report.leads[0].compliance.reasonCode).toBe('COUNTRY_NOT_CONFIGURED_FOR_OUTREACH');
  });

  it('resolves country names outside the alias list instead of defaulting to the UAE', async () => {
    const service = new ApolloDiscoveryService(stubAdapter([
      { id: 'a', title: 'Fleet Manager', email: 'a@atlas.ma', country: 'Morocco', organization: { name: 'Atlas', estimated_num_employees: 80 } }
    ]));
    const report = await service.discoverLeads({ countries: ['Morocco'] });

    expect(report.leads[0].ingestion.contact.country).toBe('MA');
  });

  it('leaves team size unset when Apollo has no headcount', async () => {
    const service = new ApolloDiscoveryService(stubAdapter([
      { id: 'a', title: 'Fleet Manager', email: 'a@smallfleet.co.ke', country: 'Kenya', organization: { name: 'Small Fleet' } }
    ]));
    const report = await service.discoverLeads({ countries: ['Kenya'] });

    expect(report.unknownTeamSizeCount).toBe(1);
    expect(report.leads[0].ingestion.company.teamSize).toBeUndefined();
    expect(report.leads[0].qualification.teamSizeFit).toBe(false);
  });

  it('decodes HTML entities in Apollo text', () => {
    expect(decodeHtmlEntities({ industry: 'logistics &amp; supply chain', name: 'O&#39;Neill &#x26; Sons', tags: ['a &lt; b'] }))
      .toEqual({ industry: 'logistics & supply chain', name: "O'Neill & Sons", tags: ['a < b'] });
    expect(decodeHtmlEntities('AT&T &unknown;')).toBe('AT&T &unknown;');
  });
});
