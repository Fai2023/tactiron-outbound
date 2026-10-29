/**
 * Apollo CSV Batch Importer
 * Parses standard Apollo CSV export files into verified, compliance-checked leads.
 */

import { LeadIngestionService, RawLeadImport, IngestionResult } from './ingestion.js';
import { ComplianceRouter } from '../compliance/router.js';
import { toCountryCode } from './apollo-discovery.js';
import { QualificationEngine } from '../qualification/engine.js';
import { ComplianceDecision, QualificationResult } from '../../core/types/index.js';

export interface ApolloCsvRow {
  'First Name'?: string;
  'Last Name'?: string;
  'Title'?: string;
  'Company'?: string;
  'Email'?: string;
  'Email Status'?: string;
  'Seniority'?: string;
  'Departments'?: string;
  'Work Direct Phone'?: string;
  'Corporate Phone'?: string;
  'Website'?: string;
  '# Employees'?: string;
  'Industry'?: string;
  'Country'?: string;
  'Apollo Contact Id'?: string;
  [key: string]: string | undefined;
}

export interface CsvImportResult {
  totalRows: number;
  importedContacts: number;
  importedCompanies: number;
  eligibleCount: number;
  blockedCount: number;
  skippedCount: number;
}

const COUNTRY_LOOKUP: Record<string, string> = {
  'united arab emirates': 'AE',
  'uae': 'AE',
  'saudi arabia': 'SA',
  'kenya': 'KE',
  'nigeria': 'NG',
  'south africa': 'ZA',
  'egypt': 'EG',
  'germany': 'DE',
  'united kingdom': 'GB',
  'france': 'FR'
};

export class ApolloCsvImporter {
  private ingestionService: LeadIngestionService;
  private complianceRouter: ComplianceRouter;
  private qualificationEngine: QualificationEngine;

  constructor(
    ingestionService: LeadIngestionService = new LeadIngestionService(),
    complianceRouter: ComplianceRouter = new ComplianceRouter(),
    qualificationEngine: QualificationEngine = new QualificationEngine(20)
  ) {
    this.ingestionService = ingestionService;
    this.complianceRouter = complianceRouter;
    this.qualificationEngine = qualificationEngine;
  }

  /**
   * Parses simple comma-separated CSV text into key-value records
   */
  public parseCsv(csvText: string): ApolloCsvRow[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse header
    const headers = this.parseCsvLine(lines[0]);
    const records: ApolloCsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const record: ApolloCsvRow = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx];
      });
      records.push(record);
    }
    return records;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  /**
   * Imports an Apollo CSV string and processes all leads
   */
  public importCsvText(csvText: string): CsvImportResult {
    const rows = this.parseCsv(csvText);
    let importedContacts = 0;
    let eligibleCount = 0;
    let blockedCount = 0;
    let skippedCount = 0;
    const companyDomains = new Set<string>();

    for (const row of rows) {
      const email = row['Email']?.trim();
      const companyName = row['Company']?.trim();
      const rawDomain = row['Website']?.trim() || (email ? email.split('@')[1] : undefined);

      if (!email || !companyName || !rawDomain) {
        skippedCount++;
        continue;
      }

      const rawCountry = row['Country']?.toLowerCase().trim();
      // Unknown country stays UNKNOWN so the compliance router fails closed
      const countryCode = (rawCountry && COUNTRY_LOOKUP[rawCountry]) || toCountryCode(rawCountry) || 'UNKNOWN';
      const teamSizeStr = row['# Employees']?.replace(/[^0-9]/g, '');
      const teamSize = teamSizeStr ? parseInt(teamSizeStr, 10) : undefined;

      const rawLead: RawLeadImport = {
        companyName,
        domain: rawDomain,
        website: row['Website'],
        country: countryCode,
        industry: row['Industry'] || 'Logistics & Transportation',
        teamSize,
        segmentFit: true,
        contactEmail: email,
        firstName: row['First Name'],
        lastName: row['Last Name'],
        jobTitle: row['Title'],
        phone: row['Work Direct Phone'] || row['Corporate Phone'],
        roleIsTarget: true,
        source: 'Apollo CSV',
        sourceId: row['Apollo Contact Id'],
        emailDeliverability: row['Email Status']?.toLowerCase() === 'verified' ? 'deliverable' : 'unknown'
      };

      const ingestion = this.ingestionService.ingest(rawLead);
      importedContacts++;
      companyDomains.add(ingestion.company.domain);

      const compliance = this.complianceRouter.evaluate({
        contactEmail: email,
        domain: ingestion.company.domain,
        countryCode,
        channel: 'EMAIL',
        consentRecords: [],
        suppressionRecords: [],
        isKillSwitchActive: false
      });

      if (compliance.allowed) {
        eligibleCount++;
      } else {
        blockedCount++;
      }
    }

    return {
      totalRows: rows.length,
      importedContacts,
      importedCompanies: companyDomains.size,
      eligibleCount,
      blockedCount,
      skippedCount
    };
  }
}
