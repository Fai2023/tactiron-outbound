import { describe, it, expect } from 'vitest';
import { EnrichmentService } from '../src/modules/enrichment/service.js';
import { MockApolloAdapter } from '../src/integrations/apollo/adapter.js';
import { MockEmailVerificationAdapter } from '../src/integrations/email-verify/adapter.js';
import { Company, Contact } from '../src/core/types/index.js';

describe('EnrichmentService - Waterfall & Gatekeeper Rules', () => {
  const apollo = new MockApolloAdapter();
  const emailVerifier = new MockEmailVerificationAdapter();
  const service = new EnrichmentService(apollo, emailVerifier);

  const createMockCompany = (overrides?: Partial<Company>): Company => ({
    id: 'comp_test_1',
    name: 'Emirates Dispatch LLC',
    domain: 'emiratesdispatch.ae',
    country: 'AE',
    segmentFit: false,
    accountStatus: 'PROSPECT',
    provenance: { source: 'Apollo Search', importedAt: new Date().toISOString() },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  const createMockContact = (overrides?: Partial<Contact>): Contact => ({
    id: 'cont_test_1',
    companyId: 'comp_test_1',
    email: 'rashid@emiratesdispatch.ae',
    roleIsTarget: false,
    country: 'AE',
    verificationStatus: 'UNVERIFIED',
    status: 'NEW',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  it('identifies all missing fields for a sparse lead', () => {
    const company = createMockCompany({ teamSize: undefined, industry: undefined });
    const contact = createMockContact({ jobTitle: undefined, phone: undefined, verificationStatus: 'UNVERIFIED' });

    const missing = service.identifyMissingFields(company, contact);
    expect(missing.companyTeamSize).toBe(true);
    expect(missing.companyIndustry).toBe(true);
    expect(missing.contactJobTitle).toBe(true);
    expect(missing.contactPhone).toBe(true);
    expect(missing.emailVerification).toBe(true);
  });

  it('executes Apollo org enrichment and updates team size, industry, and segment fit', async () => {
    const company = createMockCompany({ teamSize: undefined, industry: undefined });
    const contact = createMockContact({ jobTitle: 'Operations Director', verificationStatus: 'UNVERIFIED' });

    const result = await service.enrich(company, contact);

    expect(result.canProceedToQualification).toBe(true);
    expect(result.company.teamSize).toBe(48); // Enriched from MockApolloAdapter
    expect(result.company.industry).toBe('Logistics and Transportation');
    expect(result.company.segmentFit).toBe(true); // Matched PTT logistics criteria
    expect(result.contact.verificationStatus).toBe('VALID');
    expect(result.contact.roleIsTarget).toBe(true); // 'Operations Director' matches PTT target roles
  });

  it('enriches missing contact job title and phone directly via Apollo person match', async () => {
    const company = createMockCompany({ teamSize: 48, industry: 'Logistics and Transportation' });
    const contact = createMockContact({
      email: 'rashid@emiratesdispatch.ae',
      jobTitle: undefined,
      phone: undefined,
      verificationStatus: 'VALID'
    });

    const result = await service.enrich(company, contact);

    expect(result.contact.jobTitle).toBe('Operations & Fleet Director');
    expect(result.contact.phone).toBe('+971501234567');
    expect(result.contact.roleIsTarget).toBe(true);
    expect(result.company.provenance.enrichmentSource).toBe('Apollo API');
  });

  it('preserves existing verified data without overwriting during enrichment', async () => {
    const company = createMockCompany({ teamSize: 95, industry: 'Custom Freight' });
    const contact = createMockContact({ jobTitle: 'Fleet Specialist', verificationStatus: 'VALID' });

    const result = await service.enrich(company, contact);

    // Existing team size (95) must NOT be overwritten by Apollo's 48
    expect(result.company.teamSize).toBe(95);
    expect(result.company.industry).toBe('Custom Freight');
  });

  it('immediately suppresses contacts with INVALID emails and blocks progression to qualification', async () => {
    const company = createMockCompany();
    const contact = createMockContact({ email: 'bad-email-bounce@test.test' });

    const result = await service.enrich(company, contact);

    expect(result.canProceedToQualification).toBe(false);
    expect(result.emailVerificationStatus).toBe('INVALID');
    expect(result.contact.status).toBe('SUPPRESSED');
    expect(result.operationsPerformed.some(op => op.includes('marked SUPPRESSED'))).toBe(true);
  });

  it('applies Apollo person updates correctly and updates provenance', () => {
    const company = createMockCompany({ teamSize: undefined, industry: undefined });
    const contact = createMockContact({ jobTitle: undefined, phone: undefined });

    service.applyApolloPersonUpdate(company, contact, {
      employeeCount: 65,
      industry: 'Ground Transport & Dispatch',
      title: 'Dispatch Operations Manager',
      phone: '+971509999999'
    });

    expect(company.teamSize).toBe(65);
    expect(company.industry).toBe('Ground Transport & Dispatch');
    expect(company.segmentFit).toBe(true);
    expect(contact.jobTitle).toBe('Dispatch Operations Manager');
    expect(contact.roleIsTarget).toBe(true);
    expect(contact.phone).toBe('+971509999999');
    expect(company.provenance.enrichmentSource).toBe('Apollo API');
  });
});
