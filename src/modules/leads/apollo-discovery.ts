/**
 * Apollo Lead Discovery & Generation Service
 * Queries Apollo.io by target ICP, normalizes records, pipelines them into ingestion & compliance.
 * Discovered leads remain in the local outbound sales engine and are exportable (e.g. to CSV/JSON)
 * without sending cold prospects to Odoo CRM. Only warm qualified handovers are synced to Odoo.
 */

import { IApolloAdapter, ApolloSearchParams, ApolloRawPerson } from '../../integrations/apollo/adapter.js';
import { LeadIngestionService, RawLeadImport, IngestionResult } from './ingestion.js';
import { ComplianceRouter } from '../compliance/router.js';
import { QualificationEngine } from '../qualification/engine.js';
import { Channel, ComplianceDecision, QualificationResult } from '../../core/types/index.js';

export interface PttDiscoveryCriteria {
  countries: string[]; // e.g. ['United Arab Emirates', 'Saudi Arabia', 'Kenya']
  titles?: string[];    // e.g. ['Operations Director', 'Fleet Manager', 'Dispatch Manager']
  industries?: string[]; // e.g. ['logistics', 'transportation', 'security']
  minEmployees?: number; // e.g. 20
  page?: number;
  perPage?: number;
}

export interface DiscoveredLeadResult {
  ingestion: IngestionResult;
  compliance: ComplianceDecision;
  qualification: QualificationResult;
  /** Odoo CRM lead ID if sync succeeded, undefined if not attempted or failed */
  odooLeadId?: number;
  /** Error message if Odoo sync failed */
  odooSyncError?: string;
}

export interface ApolloDiscoveryReport {
  totalDiscovered: number;
  newCompaniesCount: number;
  newContactsCount: number;
  eligibleForOutreachCount: number;
  blockedByComplianceCount: number;
  /** How many leads were synced to Odoo CRM (deprecated; cold leads are no longer sent to Odoo) */
  odooSyncedCount?: number;
  /** How many leads failed to sync to Odoo */
  odooFailedCount?: number;
  leads: DiscoveredLeadResult[];
}

// Country string to ISO-2 code mapping
const COUNTRY_MAP: Record<string, string> = {
  'united arab emirates': 'AE',
  'uae': 'AE',
  'saudi arabia': 'SA',
  'ksa': 'SA',
  'kenya': 'KE',
  'qatar': 'QA',
  'oman': 'OM',
  'kuwait': 'KW',
  'bahrain': 'BH',
  'nigeria': 'NG',
  'south africa': 'ZA',
  'egypt': 'EG',
  'ghana': 'GH',
  'tanzania': 'TZ',
  'uganda': 'UG',
  'rwanda': 'RW',
  'germany': 'DE',
  'united kingdom': 'GB',
  'uk': 'GB',
  'france': 'FR',
  'netherlands': 'NL',
  'spain': 'ES',
  'italy': 'IT',
  'united states': 'US',
  'usa': 'US'
};

export class ApolloDiscoveryService {
  private apolloAdapter: IApolloAdapter;
  private ingestionService: LeadIngestionService;
  private complianceRouter: ComplianceRouter;
  private qualificationEngine: QualificationEngine;

  constructor(
    apolloAdapter: IApolloAdapter,
    ingestionService: LeadIngestionService = new LeadIngestionService(),
    complianceRouter: ComplianceRouter = new ComplianceRouter(),
    qualificationEngine: QualificationEngine = new QualificationEngine(20),
    _odooAdapter: unknown = null // Maintained for optional constructor signature backward compatibility
  ) {
    this.apolloAdapter = apolloAdapter;
    this.ingestionService = ingestionService;
    this.complianceRouter = complianceRouter;
    this.qualificationEngine = qualificationEngine;
  }

  /**
   * Discovers prospective PTT leads from Apollo based on fleet/dispatch ICP.
   * Leads are ingested, compliance-checked, and qualified, and made available
   * for local campaign queuing and CSV export without flooding Odoo CRM.
   */
  public async discoverLeads(criteria: PttDiscoveryCriteria): Promise<ApolloDiscoveryReport> {
    const titles = criteria.titles || [
      'Operations Director',
      'Head of Operations',
      'Fleet Manager',
      'Dispatch Manager',
      'Logistics Manager',
      'Head of Logistics',
      'Transport Manager',
      'Security Operations Manager'
    ];

    const searchParams: ApolloSearchParams = {
      personLocations: criteria.countries,
      personTitles: titles,
      organizationIndustries: criteria.industries,
      organizationNumEmployeesRanges: ['20,50', '51,200', '201,500', '501,1000', '1001,5000'],
      page: criteria.page || 1,
      perPage: criteria.perPage || 25
    };

    const apolloResponse = await this.apolloAdapter.searchPeople(searchParams);
    const results: DiscoveredLeadResult[] = [];

    for (const person of apolloResponse.people) {
      if (!person.email) {
        // Skip records with unavailable or unrevealed email
        continue;
      }

      const domain = person.organization?.primary_domain || person.email.split('@')[1];
      const rawCountry = person.country || person.organization?.country || 'AE';
      const countryCode = COUNTRY_MAP[rawCountry.toLowerCase()] || (rawCountry.trim().length === 2 ? rawCountry.trim().toUpperCase() : 'AE');

      const leadImport: RawLeadImport = {
        companyName: person.organization?.name || domain,
        domain,
        website: person.organization?.website_url,
        country: countryCode,
        industry: person.organization?.industry || 'Transportation/Logistics',
        teamSize: person.organization?.estimated_num_employees || 25,
        segmentFit: true, // Matched PTT logistics/fleet criteria
        companyPhone: person.organization?.phone,
        contactEmail: person.email,
        firstName: person.first_name,
        lastName: person.last_name,
        jobTitle: person.title,
        phone: person.sanitized_phone,
        roleIsTarget: true, // Matched target fleet/operations title
        source: 'Apollo',
        sourceId: person.id,
        emailDeliverability: person.email_status === 'verified' ? 'deliverable' : 'unknown'
      };

      // 1. Ingest and deduplicate in local store
      const ingestion = this.ingestionService.ingest(leadImport);

      // 2. Evaluate compliance for initial outreach (EMAIL)
      const compliance = this.complianceRouter.evaluate({
        contactEmail: ingestion.contact.email,
        domain: ingestion.company.domain,
        countryCode: ingestion.contact.country,
        channel: 'EMAIL',
        consentRecords: [],
        suppressionRecords: [],
        isKillSwitchActive: false
      });

      // 3. Evaluate qualification (pre-outreach fit & role test)
      const qualification = this.qualificationEngine.evaluate({
        leadId: ingestion.contact.id,
        companyId: ingestion.company.id,
        contactId: ingestion.contact.id,
        companyName: ingestion.company.name,
        country: ingestion.contact.country,
        segmentFit: ingestion.company.segmentFit,
        countryPermitted: compliance.allowed,
        teamSize: ingestion.company.teamSize,
        roleIsTarget: ingestion.contact.roleIsTarget,
        intentSignal: false // Cold prospect: no reply received yet
      });

      // Discovered leads stay in local pipeline (do not send to Odoo CRM until warm handover)
      results.push({
        ingestion,
        compliance,
        qualification
      });
    }

    const newCompaniesCount = new Set(results.filter(r => r.ingestion.isNewCompany).map(r => r.ingestion.company.domain)).size;
    const newContactsCount = results.filter(r => r.ingestion.isNewContact).length;
    const eligibleForOutreachCount = results.filter(r => r.compliance.allowed).length;
    const blockedByComplianceCount = results.filter(r => !r.compliance.allowed).length;

    return {
      totalDiscovered: apolloResponse.people.length,
      newCompaniesCount,
      newContactsCount,
      eligibleForOutreachCount,
      blockedByComplianceCount,
      odooSyncedCount: 0,
      odooFailedCount: 0,
      leads: results
    };
  }

  /**
   * Formats discovered leads into standard CSV text for easy export.
   */
  public exportToCsv(leads: DiscoveredLeadResult[]): string {
    const headers = [
      'Company',
      'Job Title',
      'Contact Name',
      'Contact Email',
      'Phone',
      'Company Phone',
      'Country',
      'Industry',
      'Compliance Status',
      'Compliance Reason',
      'Qualification Outcome'
    ];

    const escapeCsv = (val: string | number | boolean | undefined | null): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map(l => [
      escapeCsv(l.ingestion.company.name),
      escapeCsv(l.ingestion.contact.jobTitle),
      escapeCsv([l.ingestion.contact.firstName, l.ingestion.contact.lastName].filter(Boolean).join(' ') || l.ingestion.contact.email),
      escapeCsv(l.ingestion.contact.email),
      escapeCsv(l.ingestion.contact.phone),
      escapeCsv(l.ingestion.company.companyPhone),
      escapeCsv(l.ingestion.contact.country),
      escapeCsv(l.ingestion.company.industry),
      escapeCsv(l.compliance.allowed ? 'ALLOWED' : 'BLOCKED'),
      escapeCsv(l.compliance.reasonCode || ''),
      escapeCsv(l.qualification.outcome)
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}
