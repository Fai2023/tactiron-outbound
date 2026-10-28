/**
 * Lead Ingestion & Deduplication Service
 * Ingests prospective leads, normalizes records, and avoids duplicate side effects.
 */

import { Company, Contact, EmailVerificationStatus } from '../../core/types/index.js';

export interface RawLeadImport {
  companyName: string;
  domain: string;
  website?: string;
  country: string;
  region?: 'GCC' | 'AFRICA' | 'EUROPE' | 'OTHER';
  industry?: string;
  teamSize?: number;
  segmentFit?: boolean;
  companyPhone?: string;
  contactEmail: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  phone?: string;
  roleIsTarget?: boolean;
  source: string;
  sourceId?: string;
  emailDeliverability?: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
}

export interface IngestionResult {
  company: Company;
  contact: Contact;
  isNewCompany: boolean;
  isNewContact: boolean;
}

export class LeadIngestionService {
  private companiesByDomain: Map<string, Company> = new Map();
  private contactsByEmail: Map<string, Contact> = new Map();

  public normalizeDomain(input: string): string {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^www\./i, '');
    domain = domain.split('/')[0];
    return domain;
  }

  public normalizeEmail(input: string): string {
    return input.toLowerCase().trim();
  }

  public ingest(raw: RawLeadImport): IngestionResult {
    const normalizedDomain = this.normalizeDomain(raw.domain || raw.website || raw.contactEmail.split('@')[1]);
    const normalizedEmail = this.normalizeEmail(raw.contactEmail);
    const now = new Date();

    // 1. Ingest or Merge Company
    let isNewCompany = false;
    let company = this.companiesByDomain.get(normalizedDomain);

    if (!company) {
      isNewCompany = true;
      company = {
        id: crypto.randomUUID(),
        name: raw.companyName.trim(),
        domain: normalizedDomain,
        website: raw.website,
        country: raw.country.toUpperCase().trim(),
        region: raw.region,
        industry: raw.industry,
        segmentFit: raw.segmentFit ?? false,
        teamSize: raw.teamSize,
        companyPhone: raw.companyPhone?.trim(),
        accountStatus: 'PROSPECT',
        provenance: {
          source: raw.source,
          sourceId: raw.sourceId,
          importedAt: now.toISOString()
        },
        createdAt: now,
        updatedAt: now
      };
      this.companiesByDomain.set(normalizedDomain, company);
    } else {
      // Merge updates without destroying existing verified values
      if (!company.teamSize && raw.teamSize) company.teamSize = raw.teamSize;
      if (!company.industry && raw.industry) company.industry = raw.industry;
      if (!company.companyPhone && raw.companyPhone) company.companyPhone = raw.companyPhone.trim();
      if (raw.segmentFit !== undefined) company.segmentFit = raw.segmentFit;
      company.updatedAt = now;
    }

    // 2. Ingest or Merge Contact
    let isNewContact = false;
    let contact = this.contactsByEmail.get(normalizedEmail);

    let verificationStatus: EmailVerificationStatus = 'UNVERIFIED';
    if (raw.emailDeliverability === 'deliverable') verificationStatus = 'VALID';
    else if (raw.emailDeliverability === 'risky') verificationStatus = 'RISKY';
    else if (raw.emailDeliverability === 'undeliverable') verificationStatus = 'INVALID';

    if (!contact) {
      isNewContact = true;
      contact = {
        id: crypto.randomUUID(),
        companyId: company.id,
        email: normalizedEmail,
        firstName: raw.firstName?.trim(),
        lastName: raw.lastName?.trim(),
        jobTitle: raw.jobTitle?.trim(),
        roleIsTarget: raw.roleIsTarget ?? false,
        phone: raw.phone?.trim(),
        country: raw.country.toUpperCase().trim(),
        verificationStatus,
        status: verificationStatus === 'INVALID' ? 'SUPPRESSED' : 'NEW',
        createdAt: now,
        updatedAt: now
      };
      this.contactsByEmail.set(normalizedEmail, contact);
    } else {
      // Retain existing valid data
      if (!contact.jobTitle && raw.jobTitle) contact.jobTitle = raw.jobTitle.trim();
      if (!contact.phone && raw.phone) contact.phone = raw.phone.trim();
      if (raw.roleIsTarget !== undefined) contact.roleIsTarget = raw.roleIsTarget;
      contact.updatedAt = now;
    }

    return {
      company,
      contact,
      isNewCompany,
      isNewContact
    };
  }

  public getCompany(domain: string): Company | undefined {
    return this.companiesByDomain.get(this.normalizeDomain(domain));
  }

  public getContact(email: string): Contact | undefined {
    return this.contactsByEmail.get(this.normalizeEmail(email));
  }

  public getAllContacts(): Contact[] {
    return Array.from(this.contactsByEmail.values());
  }

  public getAllCompanies(): Company[] {
    return Array.from(this.companiesByDomain.values());
  }

  public getExportableRecords(): Array<{ company: Company; contact: Contact }> {
    const records: Array<{ company: Company; contact: Contact }> = [];
    const companiesById = new Map<string, Company>();
    for (const comp of this.companiesByDomain.values()) {
      companiesById.set(comp.id, comp);
    }
    for (const contact of this.contactsByEmail.values()) {
      const company = companiesById.get(contact.companyId);
      if (company) {
        records.push({ company, contact });
      }
    }
    return records;
  }

  public exportToCsv(): string {
    const records = this.getExportableRecords();
    const headers = [
      'Company Name',
      'Domain',
      'Website',
      'Country',
      'Industry',
      'Team Size',
      'Contact Name',
      'Job Title',
      'Contact Email',
      'Phone',
      'Company Phone',
      'Verification Status',
      'Status',
      'Source'
    ];

    const escapeCsv = (val: string | number | boolean | undefined | null): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      escapeCsv(r.company.name),
      escapeCsv(r.company.domain),
      escapeCsv(r.company.website),
      escapeCsv(r.company.country),
      escapeCsv(r.company.industry),
      escapeCsv(r.company.teamSize),
      escapeCsv([r.contact.firstName, r.contact.lastName].filter(Boolean).join(' ') || r.contact.email),
      escapeCsv(r.contact.jobTitle),
      escapeCsv(r.contact.email),
      escapeCsv(r.contact.phone),
      escapeCsv(r.company.companyPhone),
      escapeCsv(r.contact.verificationStatus),
      escapeCsv(r.contact.status),
      escapeCsv(r.company.provenance.source)
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}
