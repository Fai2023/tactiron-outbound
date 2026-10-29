/**
 * Unified Reply Classification Service
 * Combines deterministic guardrails with LLM intent parsing
 */

import { ReplyType, ReplyClassification } from '../../core/types/index.js';
import { ReplyGuardrailsEngine } from './guardrails.js';
import { ILLMAdapter } from '../../integrations/llm/adapter.js';
import { SLA_TARGETS, APPROVED_HOLDING_REPLY } from '../../config/policy.js';

export class ReplyClassifier {
  private guardrails: ReplyGuardrailsEngine;
  private llmAdapter: ILLMAdapter;
  private isMonth1ReviewMode: boolean;

  constructor(
    llmAdapter: ILLMAdapter,
    guardrails: ReplyGuardrailsEngine = new ReplyGuardrailsEngine(),
    isMonth1ReviewMode: boolean = false
  ) {
    this.llmAdapter = llmAdapter;
    this.guardrails = guardrails;
    this.isMonth1ReviewMode = isMonth1ReviewMode;
  }

  public async classify(messageText: string): Promise<ReplyClassification> {
    // Step 1: Run deterministic guardrails (Keyword triggers, opt-out, OOO)
    const guardrailResult = this.guardrails.evaluate(messageText, this.isMonth1ReviewMode);
    if (guardrailResult.triggered && guardrailResult.forcedClassification) {
      return guardrailResult.forcedClassification;
    }

    // Step 2: Invoke LLM adapter for nuanced intent understanding
    try {
      const llmResult = await this.llmAdapter.classifyReply(messageText);

      // Deterministic validation of LLM output: Low confidence check
      if (llmResult.confidence < 0.8) {
        return {
          replyType: ReplyType.UNCERTAIN_OR_LOW_CONFIDENCE,
          intentName: 'LOW_CONFIDENCE_FALLBACK',
          confidence: llmResult.confidence,
          extractedFacts: llmResult.extractedFacts,
          guardrailKeywordHit: false,
          matchedKeywords: [],
          recommendedAction: 'Model confidence below threshold (0.80). Hand over to sales human.',
          draftHoldingReply: APPROVED_HOLDING_REPLY,
          isEscalation: true,
          escalationTarget: 'SALES',
          responseTargetHours: SLA_TARGETS.HUMAN_HANDOVER_HOURS,
          requiresHumanReview: true,
          reviewStatus: 'PENDING_HUMAN_REVIEW'
        };
      }

      // Calculate SLA response target
      let responseTargetHours: number = SLA_TARGETS.HUMAN_HANDOVER_HOURS;
      if (llmResult.replyType === ReplyType.DEMO_OR_MEETING_REQUEST) {
        responseTargetHours = SLA_TARGETS.DEMO_OR_MEETING_HOURS;
      } else if (llmResult.replyType === ReplyType.COMPLAINT_OR_LEGAL_THREAT) {
        responseTargetHours = SLA_TARGETS.COMPLIANCE_DAYS * 24;
      }

      const requiresHumanReview = this.isMonth1ReviewMode || llmResult.isEscalation;

      return {
        replyType: llmResult.replyType,
        intentName: llmResult.intentName,
        confidence: llmResult.confidence,
        extractedFacts: llmResult.extractedFacts,
        guardrailKeywordHit: false,
        matchedKeywords: [],
        recommendedAction: llmResult.recommendedAction,
        draftHoldingReply: llmResult.proposedHoldingReply || APPROVED_HOLDING_REPLY,
        isEscalation: llmResult.isEscalation,
        escalationTarget: llmResult.escalationTarget,
        responseTargetHours,
        requiresHumanReview,
        reviewStatus: this.isMonth1ReviewMode ? 'PENDING_HUMAN_REVIEW' : 'AUTO_APPROVED'
      };
    } catch (error) {
      // Step 3: Safe failure recovery - fallback closed on unexpected errors
      console.error('Reply classification failed; escalating to human review:', error instanceof Error ? error.message : error);
      return {
        replyType: ReplyType.UNCERTAIN_OR_LOW_CONFIDENCE,
        intentName: 'PROCESSING_ERROR_FALLBACK',
        confidence: 0,
        extractedFacts: {},
        guardrailKeywordHit: false,
        matchedKeywords: [],
        recommendedAction: 'AI classification error occurred. Escalate to human review immediately.',
        draftHoldingReply: APPROVED_HOLDING_REPLY,
        isEscalation: true,
        escalationTarget: 'SALES',
        responseTargetHours: SLA_TARGETS.HUMAN_HANDOVER_HOURS,
        requiresHumanReview: true,
        reviewStatus: 'PENDING_HUMAN_REVIEW'
      };
    }
  }
}
