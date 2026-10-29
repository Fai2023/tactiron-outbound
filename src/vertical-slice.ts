/**
 * Smallest Useful Vertical Slice Orchestrator
 * Demonstrates the end-to-end flow:
 * 1. Import a lead and deduplicate
 * 2. Evaluate qualification and outreach eligibility
 * 3. Process an inbound prospect reply through guardrails and AI
 * 4. Freeze account outreach sequences
 * 5. Assemble Handover Pack and hand over to Odoo CRM
 */

import { LeadIngestionService, RawLeadImport } from './modules/leads/ingestion.js';
import { QualificationEngine } from './modules/qualification/engine.js';
import { ComplianceRouter } from './modules/compliance/router.js';
import { ReplyClassifier } from './modules/replies/classifier.js';
import { HandoverService } from './modules/handover/service.js';
import { createLLMAdapter } from './integrations/llm/adapter.js';
import { config } from './config/env.js';
import { MockOdooAdapter } from './integrations/odoo/adapter.js';
import {
  Channel,
  ConsentRecord,
  SuppressionRecord,
  MessageEvent,
  HandoverEvent,
  QualificationResult,
  ComplianceDecision,
  ReplyClassification
} from './core/types/index.js';

export interface VerticalSliceExecutionInput {
  lead: RawLeadImport;
  channel: Channel;
  consentRecords?: ConsentRecord[];
  suppressionRecords?: SuppressionRecord[];
  isKillSwitchActive?: boolean;
  simulatedOutboundMessage: string;
  simulatedInboundReply: string;
}

export interface VerticalSliceExecutionResult {
  ingestion: {
    companyId: string;
    contactId: string;
    isNewCompany: boolean;
    isNewContact: boolean;
  };
  qualification: QualificationResult;
  compliance: ComplianceDecision;
  replyClassification: ReplyClassification;
  handoverEvent?: HandoverEvent;
  accountSequenceStatus: string;
  auditTrail: string[];
}

export class VerticalSliceOrchestrator {
  public ingestionService: LeadIngestionService;
  public qualificationEngine: QualificationEngine;
  public complianceRouter: ComplianceRouter;
  public replyClassifier: ReplyClassifier;
  public handoverService: HandoverService;
  public odooAdapter: MockOdooAdapter;

  constructor(options?: {
    minTeamSize?: number;
    isMonth1ReviewMode?: boolean;
  }) {
    this.ingestionService = new LeadIngestionService();
    this.qualificationEngine = new QualificationEngine(options?.minTeamSize ?? 20);
    this.complianceRouter = new ComplianceRouter();
    this.replyClassifier = new ReplyClassifier(
      createLLMAdapter(config.ANTHROPIC_API_KEY, config.CLAUDE_MODEL),
      undefined,
      options?.isMonth1ReviewMode ?? false
    );
    this.odooAdapter = new MockOdooAdapter();
    this.handoverService = new HandoverService(this.odooAdapter);
  }

  public async run(input: VerticalSliceExecutionInput): Promise<VerticalSliceExecutionResult> {
    const auditTrail: string[] = [];

    // Step 1: Ingest and Deduplicate Lead
    const ingestion = this.ingestionService.ingest(input.lead);
    auditTrail.push(`Lead ingested: Company "${ingestion.company.name}" (${ingestion.company.domain}), Contact "${ingestion.contact.email}"`);

    // Step 2: Evaluate Initial Outreach Compliance
    const compliance = this.complianceRouter.evaluate({
      contactEmail: ingestion.contact.email,
      domain: ingestion.company.domain,
      countryCode: ingestion.contact.country,
      channel: input.channel,
      consentRecords: input.consentRecords || [],
      suppressionRecords: input.suppressionRecords || [],
      isKillSwitchActive: input.isKillSwitchActive ?? false
    });
    auditTrail.push(`Compliance evaluated for ${input.channel}: allowed=${compliance.allowed}, reason=${compliance.reasonCode}`);

    // If initial outreach is blocked by compliance, halt workflow safely
    if (!compliance.allowed) {
      const qualification = this.qualificationEngine.evaluate({
        leadId: ingestion.contact.id,
        companyId: ingestion.company.id,
        contactId: ingestion.contact.id,
        companyName: ingestion.company.name,
        country: ingestion.contact.country,
        segmentFit: ingestion.company.segmentFit,
        countryPermitted: false,
        teamSize: ingestion.company.teamSize,
        roleIsTarget: ingestion.contact.roleIsTarget,
        intentSignal: false,
        isSuppressed: compliance.suppressionHit
      });

      return {
        ingestion: {
          companyId: ingestion.company.id,
          contactId: ingestion.contact.id,
          isNewCompany: ingestion.isNewCompany,
          isNewContact: ingestion.isNewContact
        },
        qualification,
        compliance,
        replyClassification: {
          replyType: 9,
          intentName: 'BLOCKED_BY_COMPLIANCE',
          confidence: 1,
          extractedFacts: {},
          guardrailKeywordHit: false,
          matchedKeywords: [],
          recommendedAction: 'Action blocked by compliance router.',
          isEscalation: false,
          escalationTarget: 'NONE',
          responseTargetHours: 0,
          requiresHumanReview: false,
          reviewStatus: 'AUTO_APPROVED'
        },
        accountSequenceStatus: ingestion.company.accountStatus,
        auditTrail
      };
    }

    // Step 3: Simulate Outbound Dispatch & Inbound Reply
    const conversation: MessageEvent[] = [
      {
        id: crypto.randomUUID(),
        conversationId: crypto.randomUUID(),
        direction: 'OUTBOUND',
        channel: input.channel,
        from: 'sales@tactiron.com',
        to: ingestion.contact.email,
        subject: 'Push-to-Talk Fleet Communication for Operations',
        body: input.simulatedOutboundMessage,
        receivedAt: new Date(Date.now() - 3600000)
      },
      {
        id: crypto.randomUUID(),
        conversationId: crypto.randomUUID(),
        direction: 'INBOUND',
        channel: input.channel,
        from: ingestion.contact.email,
        to: 'sales@tactiron.com',
        body: input.simulatedInboundReply,
        receivedAt: new Date()
      }
    ];
    auditTrail.push(`Inbound reply received from ${ingestion.contact.email}: "${input.simulatedInboundReply}"`);

    // Step 4: Classify Reply through Guardrails & LLM
    const replyClassification = await this.replyClassifier.classify(input.simulatedInboundReply);
    auditTrail.push(`Reply classified: Type ${replyClassification.replyType} (${replyClassification.intentName}), confidence=${replyClassification.confidence}`);

    // If Unsubscribe / Opt-Out, handle automatically and suppress
    if (replyClassification.replyType === 1) { // UNSUBSCRIBE
      ingestion.company.accountStatus = 'SUPPRESSED';
      ingestion.contact.status = 'SUPPRESSED';
      auditTrail.push(`Contact ${ingestion.contact.email} suppressed across all systems. No human handover required.`);

      const qualification = this.qualificationEngine.evaluate({
        leadId: ingestion.contact.id,
        companyId: ingestion.company.id,
        contactId: ingestion.contact.id,
        companyName: ingestion.company.name,
        country: ingestion.contact.country,
        segmentFit: ingestion.company.segmentFit,
        countryPermitted: true,
        teamSize: ingestion.company.teamSize,
        roleIsTarget: ingestion.contact.roleIsTarget,
        intentSignal: false,
        isSuppressed: true
      });

      return {
        ingestion: {
          companyId: ingestion.company.id,
          contactId: ingestion.contact.id,
          isNewCompany: ingestion.isNewCompany,
          isNewContact: ingestion.isNewContact
        },
        qualification,
        compliance,
        replyClassification,
        accountSequenceStatus: 'SUPPRESSED',
        auditTrail
      };
    }

    // Step 5: Evaluate Post-Reply Lead Qualification
    const intentSignal = [4, 5, 6, 8].includes(replyClassification.replyType); // Demo, pricing, partner, C-level indicate buying intent
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
      intentSignal
    });
    auditTrail.push(`Post-reply qualification outcome: ${qualification.outcome} ("${qualification.rationale}")`);

    // Step 6: If Lead is Warm Qualified or requires Escalation, execute Odoo Handover
    let handoverEvent: HandoverEvent | undefined;
    if (qualification.outcome === 'WARM_QUALIFIED_HAND_TO_HUMAN' || replyClassification.isEscalation) {
      handoverEvent = await this.handoverService.executeHandover({
        company: ingestion.company,
        contact: ingestion.contact,
        conversation,
        qualificationResult: qualification,
        consentRecord: input.consentRecords?.[0],
        complianceDecision: compliance,
        replyClassification
      });
      auditTrail.push(`Handover executed to Odoo: OdooLeadID=${handoverEvent.odooLeadId}, Priority=${handoverEvent.priority}, Account sequences PAUSED.`);
    }

    return {
      ingestion: {
        companyId: ingestion.company.id,
        contactId: ingestion.contact.id,
        isNewCompany: ingestion.isNewCompany,
        isNewContact: ingestion.isNewContact
      },
      qualification,
      compliance,
      replyClassification,
      handoverEvent,
      accountSequenceStatus: ingestion.company.accountStatus,
      auditTrail
    };
  }
}
