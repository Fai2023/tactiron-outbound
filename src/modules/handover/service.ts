/**
 * Handover Service
 * Implements Sheet 'Handover and after' rules:
 * - Assembles the 6-part Handover Pack
 * - Sets SLA deadlines and priorities
 * - Pauses all sequences for the entire account
 * - Coordinates Odoo CRM lead creation/updating with retry safety
 */

import {
  Company,
  Contact,
  MessageEvent,
  QualificationResult,
  ConsentRecord,
  ComplianceDecision,
  HandoverPack,
  HandoverEvent,
  HandoverPriority,
  ReplyClassification,
  ReplyType
} from '../../core/types/index.js';
import { IOdooAdapter, OdooLeadPayload } from '../../integrations/odoo/adapter.js';
import { odooTagsFor } from '../../config/policy.js';

export interface AssembleHandoverRequest {
  company: Company;
  contact: Contact;
  conversation: MessageEvent[];
  qualificationResult: QualificationResult;
  consentRecord?: ConsentRecord;
  complianceDecision: ComplianceDecision;
  replyClassification: ReplyClassification;
}

export class HandoverService {
  private odooAdapter: IOdooAdapter;

  constructor(odooAdapter: IOdooAdapter) {
    this.odooAdapter = odooAdapter;
  }

  /**
   * Evaluates priority and SLA deadline
   */
  public calculatePriorityAndSLA(replyClassification: ReplyClassification): { priority: HandoverPriority; slaDeadline: Date } {
    const now = new Date();

    if (replyClassification.replyType === ReplyType.DEMO_OR_MEETING_REQUEST) {
      const deadline = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour
      return { priority: 'URGENT_1H', slaDeadline: deadline };
    }

    if (replyClassification.replyType === ReplyType.COMPLAINT_OR_LEGAL_THREAT) {
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 business day
      return { priority: 'COMPLIANCE_1D', slaDeadline: deadline };
    }

    // Default standard handover (Pricing, Partner, C-level, Uncertainty) -> 4 hours
    const deadline = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    return { priority: 'STANDARD_4H', slaDeadline: deadline };
  }

  /**
   * Assembles the 6 mandatory items for the Handover Pack
   */
  public assemblePack(request: AssembleHandoverRequest): HandoverPack {
    const {
      company,
      contact,
      conversation,
      qualificationResult,
      consentRecord,
      complianceDecision,
      replyClassification
    } = request;

    // Compile risk flags
    const riskFlags: string[] = [];
    if (replyClassification.guardrailKeywordHit) {
      riskFlags.push(`Guardrail keywords detected: ${replyClassification.matchedKeywords.join(', ')}`);
    }
    if (replyClassification.extractedFacts.pricingMentioned) {
      riskFlags.push('Pricing inquiry detected. AI is strictly barred from quoting prices.');
    }
    if (replyClassification.extractedFacts.competitorsMentioned?.length) {
      riskFlags.push(`Competitors mentioned: ${replyClassification.extractedFacts.competitorsMentioned.join(', ')}`);
    }
    if (contact.country.toUpperCase() === 'DE') {
      riskFlags.push('Jurisdiction Germany (DE): Strict double opt-in rules apply under UWG §7.');
    }
    if (company.accountStatus === 'PAUSED_FOR_HANDOVER') {
      riskFlags.push('Account outreach sequences paused for all colleagues at this company.');
    }

    // Suggested next step
    let suggestedNextStep = 'Review conversation history and initiate human follow-up.';
    if (replyClassification.replyType === ReplyType.DEMO_OR_MEETING_REQUEST) {
      suggestedNextStep = 'High-priority demo request. Contact immediately within 1 hour to schedule a product walkthrough.';
    } else if (replyClassification.replyType === ReplyType.PRICING_OR_COMMERCIAL_TERMS) {
      suggestedNextStep = 'Review requirements, fleet size, and team count to prepare tailored commercial quotation.';
    } else if (replyClassification.replyType === ReplyType.COMPLAINT_OR_LEGAL_THREAT) {
      suggestedNextStep = 'Direct to Compliance Officer. Do not send standard commercial replies.';
    }

    return {
      fullThread: conversation,
      companyAndRoleDetails: {
        companyName: company.name,
        domain: company.domain,
        country: company.country,
        teamSize: company.teamSize,
        industry: company.industry,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Key Decision Maker',
        contactEmail: contact.email,
        jobTitle: contact.jobTitle
      },
      channelPermissionsAndConsentRecord: {
        channel: complianceDecision.channel,
        countryPermitted: complianceDecision.allowed,
        lawfulBasis: consentRecord?.lawfulBasis || complianceDecision.lawfulBasis || 'LEGITIMATE_INTEREST',
        evidenceReference: consentRecord?.evidenceReference || 'B2B Public Registry / Outbound Evaluation',
        recordedAt: consentRecord?.recordedAt.toISOString() || new Date().toISOString()
      },
      qualificationScoreAndWhy: {
        outcome: qualificationResult.outcome,
        rationale: qualificationResult.rationale,
        segmentFit: qualificationResult.segmentFit,
        countryPermitted: qualificationResult.countryPermitted,
        teamSizeFit: qualificationResult.teamSizeFit,
        roleTargetFit: qualificationResult.roleTargetFit,
        intentSignal: qualificationResult.intentSignal
      },
      suggestedNextStep,
      riskFlags
    };
  }

  /**
   * Formats the Handover Pack into an auditable markdown description for Odoo CRM
   */
  public formatOdooDescription(pack: HandoverPack, priority: HandoverPriority, slaDeadline: Date): string {
    const threadFormatted = pack.fullThread
      .map(m => `[${m.receivedAt.toISOString()}] ${m.direction} (${m.channel}): ${m.body}`)
      .join('\n\n');

    return `=== AI OUTBOUND SALES HANDOVER PACK ===
Priority: ${priority} | SLA Deadline: ${slaDeadline.toISOString()}

1. COMPANY & CONTACT DETAILS:
- Company: ${pack.companyAndRoleDetails.companyName} (${pack.companyAndRoleDetails.domain})
- Country: ${pack.companyAndRoleDetails.country} | Team Size: ${pack.companyAndRoleDetails.teamSize || 'Unknown'}
- Contact: ${pack.companyAndRoleDetails.contactName} (${pack.companyAndRoleDetails.contactEmail})
- Title: ${pack.companyAndRoleDetails.jobTitle || 'Not specified'}

2. QUALIFICATION SCORE & WHY:
- Outcome: ${pack.qualificationScoreAndWhy.outcome}
- Rationale: ${pack.qualificationScoreAndWhy.rationale}
- Segment Fit: ${pack.qualificationScoreAndWhy.segmentFit ? 'YES' : 'NO'}
- Country Permitted: ${pack.qualificationScoreAndWhy.countryPermitted ? 'YES' : 'NO'}
- Team Size Fit: ${pack.qualificationScoreAndWhy.teamSizeFit ? 'YES' : 'NO'}
- Role Target Fit: ${pack.qualificationScoreAndWhy.roleTargetFit ? 'YES' : 'NO'}

3. CHANNEL PERMISSIONS & COMPLIANCE:
- Channel: ${pack.channelPermissionsAndConsentRecord.channel}
- Lawful Basis: ${pack.channelPermissionsAndConsentRecord.lawfulBasis}
- Evidence Ref: ${pack.channelPermissionsAndConsentRecord.evidenceReference}

4. SUGGESTED NEXT STEP:
${pack.suggestedNextStep}

5. RISK FLAGS:
${pack.riskFlags.length > 0 ? pack.riskFlags.map(f => `- ${f}`).join('\n') : '- None flagged.'}

6. COMPLETE MESSAGE THREAD:
${threadFormatted}
`;
  }

  /**
   * Executes handover to Odoo CRM and freezes sequences
   */
  public async executeHandover(request: AssembleHandoverRequest): Promise<HandoverEvent> {
    const { company, contact, replyClassification } = request;

    // 1. Calculate Priority and SLA Deadline
    const { priority, slaDeadline } = this.calculatePriorityAndSLA(replyClassification);

    // 2. Assemble 6-point Handover Pack
    const handoverPack = this.assemblePack(request);

    // 3. Format Odoo payload
    const odooPriorityMap: Record<HandoverPriority, '0' | '1' | '2' | '3'> = {
      'URGENT_1H': '3',
      'STANDARD_4H': '2',
      'COMPLIANCE_1D': '1'
    };

    const odooPayload: OdooLeadPayload = {
      name: `[AI Handover] ${company.name} - ${contact.firstName || contact.email}`,
      contact_name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
      email_from: contact.email,
      phone: contact.phone,
      partner_name: company.name,
      description: this.formatOdooDescription(handoverPack, priority, slaDeadline),
      priority: odooPriorityMap[priority],
      tagNames: odooTagsFor(replyClassification.replyType, 'EMAIL')
    };

    const handoverId = crypto.randomUUID();
    const event: HandoverEvent = {
      id: handoverId,
      contactId: contact.id,
      companyId: company.id,
      conversationId: crypto.randomUUID(),
      priority,
      slaDeadline,
      status: 'PENDING',
      handoverPack,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 4. Send to Odoo CRM
    try {
      const odooResult = await this.odooAdapter.createOrUpdateLead(odooPayload);
      event.odooLeadId = odooResult.odooLeadId;
      event.status = 'SYNCHRONIZED_ODOO';
    } catch (err) {
      event.status = 'FAILED_RETRYING';
      event.errorLog = err instanceof Error ? err.message : String(err);
      event.retryCount = 1;
    }

    // 5. Freeze sequences for the entire account
    company.accountStatus = 'PAUSED_FOR_HANDOVER';
    contact.status = 'HANDED_OVER';

    return event;
  }
}
