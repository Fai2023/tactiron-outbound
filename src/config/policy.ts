/**
 * Policy Configuration & Business Rules
 * Source: AI - to human Handover_Rules.xlsx & Outbound_Sales_Pipeline (1).pdf
 */

import { Channel, ReplyType } from '../core/types/index.js';

export const POLICY_VERSION = 'v1.0.0-2026';

/**
 * 7 Keyword triggers from Sheet 'AI guardrails' (R18-R24)
 * Case-insensitive substring search anywhere in the message.
 */
export const ESCALATION_KEYWORDS: readonly string[] = [
  'price',
  'pricing',
  'quote',
  'contract',
  'legal',
  'gdpr',
  'complaint',
  'lawyer'
] as const;

/**
 * Hard limits defined in Sheet 'AI guardrails':
 * The AI must NEVER:
 * 1. Quote prices or discounts
 * 2. Promise delivery dates
 * 3. Make legal, regulatory or security claims
 * 4. Discuss competitors beyond approved lines
 * 5. Agree partner terms
 */
export const AI_HARD_LIMITS = [
  'NO_PRICE_QUOTES',
  'NO_DELIVERY_PROMISES',
  'NO_LEGAL_SECURITY_CLAIMS',
  'NO_UNAPPROVED_COMPETITOR_CLAIMS',
  'NO_PARTNER_AGREEMENTS'
] as const;

/**
 * SLA Response Targets from Sheet 'Handover rules' (R5-R7)
 */
export const SLA_TARGETS = {
  DEMO_OR_MEETING_HOURS: 1,      // 1 hour (Highest-priority handover)
  HUMAN_HANDOVER_HOURS: 4,       // 4 business hours (Pricing, partners, C-level, uncertainty)
  COMPLIANCE_DAYS: 1             // 1 business day (Complaint, legal, data-access/GDPR)
} as const;

/**
 * Country Channel Permissions
 * Cross-referencing PDF pipeline ("GCC, Africa and selected European sectors")
 * and legal notes ("Country consent rules need local legal confirmation before launch").
 */
export interface CountryPolicy {
  code: string;
  name: string;
  region: 'GCC' | 'AFRICA' | 'EUROPE' | 'OTHER';
  permittedChannels: Channel[];
  requiresPriorOptIn: boolean; // E.g., Germany (DE) strict opt-in vs UK B2B legitimate interest
  notes: string;
}

export const COUNTRY_POLICIES: Record<string, CountryPolicy> = {
  // GCC Markets
  'AE': {
    code: 'AE',
    name: 'United Arab Emirates',
    region: 'GCC',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'B2B outreach permitted with clear opt-out. WhatsApp requires explicit prior opt-in.'
  },
  'SA': {
    code: 'SA',
    name: 'Saudi Arabia',
    region: 'GCC',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'PDPL compliance: explicit business purpose and immediate opt-out mechanism required.'
  },
  'QA': {
    code: 'QA',
    name: 'Qatar',
    region: 'GCC',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'B2B corporate outreach permitted.'
  },
  'KW': {
    code: 'KW',
    name: 'Kuwait',
    region: 'GCC',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'B2B email and manual LinkedIn permitted.'
  },
  'OM': {
    code: 'OM',
    name: 'Oman',
    region: 'GCC',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'B2B email permitted.'
  },
  'BH': {
    code: 'BH',
    name: 'Bahrain',
    region: 'GCC',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'B2B email permitted.'
  },

  // African Markets
  'KE': {
    code: 'KE',
    name: 'Kenya',
    region: 'AFRICA',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'Kenya Data Protection Act: direct marketing permitted with opt-out.'
  },
  'NG': {
    code: 'NG',
    name: 'Nigeria',
    region: 'AFRICA',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'NDPR compliance: lawful basis B2B legitimate interest.'
  },
  'ZA': {
    code: 'ZA',
    name: 'South Africa',
    region: 'AFRICA',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'POPIA compliance: direct electronic marketing requires care; B2B email with opt-out.'
  },
  'EG': {
    code: 'EG',
    name: 'Egypt',
    region: 'AFRICA',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'Data Protection Law No. 151/2020: opt-out required.'
  },

  // European Markets (Selected)
  'GB': {
    code: 'GB',
    name: 'United Kingdom',
    region: 'EUROPE',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'PECR corporate subscriber exemption: B2B cold email permitted under Legitimate Interest.'
  },
  'DE': {
    code: 'DE',
    name: 'Germany',
    region: 'EUROPE',
    permittedChannels: ['LINKEDIN'], // Cold B2B email strictly requires double opt-in (UWG §7)
    requiresPriorOptIn: true,
    notes: 'Strict UWG §7: unsolicited B2B cold email is prohibited without prior express consent. Manual LinkedIn connection permitted.'
  },
  'FR': {
    code: 'FR',
    name: 'France',
    region: 'EUROPE',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'CNIL B2B guidelines: cold email permitted if message is directly relevant to recipient position.'
  },
  'NL': {
    code: 'NL',
    name: 'Netherlands',
    region: 'EUROPE',
    permittedChannels: ['EMAIL', 'LINKEDIN'],
    requiresPriorOptIn: false,
    notes: 'Telecommunications Act: B2B email permitted under specific corporate conditions.'
  }
};

/**
 * Pre-approved Standard Holding Reply (Sheet 'Handover rules' R20)
 * "The AI may send one holding reply ('a colleague will respond today') and nothing more."
 */
export const APPROVED_HOLDING_REPLY = 
  "Thank you for getting back to us. I have shared your details with our regional specialist, and a colleague will respond to you today.";

/**
 * Odoo CRM tags applied to new handovers, by name (Fleet sales pipeline, set up by Tactiron's CRM admin).
 * Tags that do not exist in Odoo are skipped, never created.
 */
export const ODOO_HANDOVER_TAGS = {
  always: 'AI_HANDOVER',
  whatsapp: 'WHATSAPP',
  byReplyType: {
    [ReplyType.DEMO_OR_MEETING_REQUEST]: 'DEMO_REQUEST',
    [ReplyType.PRICING_OR_COMMERCIAL_TERMS]: 'PRICING_QUOTE',
    [ReplyType.COMPLAINT_OR_LEGAL_THREAT]: 'COMPLIANCE_REVIEW'
  } as Partial<Record<ReplyType, string>>
};

export function odooTagsFor(replyType: ReplyType, channel: 'EMAIL' | 'WHATSAPP'): string[] {
  const tags = [ODOO_HANDOVER_TAGS.always];
  if (channel === 'WHATSAPP') tags.push(ODOO_HANDOVER_TAGS.whatsapp);
  const typeTag = ODOO_HANDOVER_TAGS.byReplyType[replyType];
  if (typeTag) tags.push(typeTag);
  return tags;
}
