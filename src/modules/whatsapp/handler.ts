/**
 * WhatsApp Inbound Message Handler
 *
 * Processes prospect-initiated WhatsApp messages forwarded from Odoo's
 * native WhatsApp integration (discuss.channel). Applies the same 7 guardrails
 * and 9-type classification engine used for email replies.
 *
 * Key Rules:
 *  1. Incoming ONLY — we never cold-initiate WhatsApp outreach
 *  2. Same 7 guardrail keywords apply (price, quote, contract, legal, gdpr, complaint, lawyer)
 *  3. If a WhatsApp reply arrives, pause that contact's email dispatch sequence
 *  4. 24-hour Meta conversation window is tracked; flag urgency if nearing expiry
 *  5. Handover triggers (types 4-9) create/update an Odoo CRM lead (6-item pack)
 */

import { ReplyClassifier } from '../replies/classifier.js';
import { ReplyGuardrailsEngine } from '../replies/guardrails.js';
import { ILLMAdapter } from '../../integrations/llm/adapter.js';
import { IOdooWhatsAppAdapter, OdooWhatsAppMessage } from '../../integrations/odoo/whatsapp-adapter.js';
import { IOdooAdapter } from '../../integrations/odoo/adapter.js';
import { ReplyType, ReplyClassification } from '../../core/types/index.js';
import { APPROVED_HOLDING_REPLY, odooTagsFor } from '../../config/policy.js';

/** Reply types that require a warm human handover */
const HANDOVER_REPLY_TYPES = new Set<ReplyType>([
  ReplyType.DEMO_OR_MEETING_REQUEST,
  ReplyType.PRICING_OR_COMMERCIAL_TERMS,
  ReplyType.PARTNER_INQUIRY,
  ReplyType.COMPLAINT_OR_LEGAL_THREAT,
  ReplyType.C_LEVEL_OR_MULTI_THREAD,
  ReplyType.UNCERTAIN_OR_LOW_CONFIDENCE
]);

/** Meta's conversation window duration in milliseconds (24 hours) */
const META_WINDOW_MS = 24 * 60 * 60 * 1000;

/** WhatsApp-specific approved holding reply (shorter, conversational) */
const WHATSAPP_HOLDING_REPLY =
  'Thanks for reaching out! Our team will be with you shortly. 🙏';

export interface WhatsAppHandlerResult {
  /** Phone number of the prospect */
  phone: string;
  /** AI classification result */
  classification: ReplyClassification;
  /** The reply text that was sent back to the prospect (or null if suppressed) */
  replySent: string | null;
  /** Whether a CRM handover was triggered */
  handoverTriggered: boolean;
  /** Whether the contact's email sequence was paused */
  emailSequencePaused: boolean;
  /** Whether this message is within the 24-hour Meta conversation window */
  withinMetaWindow: boolean;
  /** Whether the Meta window is nearing expiry (< 4 hours remaining) */
  metaWindowUrgent: boolean;
  /** Odoo CRM lead ID if handover was created */
  odooLeadId?: number;
  /** Timestamp this handler processed the message */
  processedAt: string;
}

export class WhatsAppHandler {
  private classifier: ReplyClassifier;
  private whatsAppAdapter: IOdooWhatsAppAdapter;
  private odooAdapter: IOdooAdapter;

  /**
   * In-memory set of phone numbers with active WhatsApp conversations.
   * When a phone is in this set, the contact's email dispatch is suppressed.
   */
  public activeWhatsAppPhones: Set<string> = new Set();

  /**
   * In-memory log of processed WhatsApp conversations (this session).
   */
  public conversationLog: Array<WhatsAppHandlerResult & { partnerName: string; messageBody: string }> = [];

  /** Tracks last inbound message time per phone number for Meta window calculation */
  private lastInboundAt: Map<string, Date> = new Map();

  constructor(
    llmAdapter: ILLMAdapter,
    whatsAppAdapter: IOdooWhatsAppAdapter,
    odooAdapter: IOdooAdapter
  ) {
    this.classifier = new ReplyClassifier(
      llmAdapter,
      new ReplyGuardrailsEngine(),
      false // WhatsApp uses auto-approve mode (same as email in production)
    );
    this.whatsAppAdapter = whatsAppAdapter;
    this.odooAdapter = odooAdapter;
  }

  /**
   * Checks whether a phone number is currently in an active WhatsApp conversation.
   * Used by the dispatch queue to suppress email follow-ups.
   */
  public isPhoneActiveOnWhatsApp(phone: string): boolean {
    return this.activeWhatsAppPhones.has(this.normalizePhone(phone));
  }

  /**
   * Main entry point: process an incoming WhatsApp message.
   */
  public async handleIncoming(msg: OdooWhatsAppMessage): Promise<WhatsAppHandlerResult> {
    const phone = this.normalizePhone(msg.phone);
    const now = new Date();

    // ── Meta Window Tracking ────────────────────────────────────────────────
    const lastInbound = this.lastInboundAt.get(phone);
    const withinMetaWindow = lastInbound
      ? now.getTime() - lastInbound.getTime() < META_WINDOW_MS
      : true; // First message is always within window (window opens now)
    const remainingMs = lastInbound
      ? META_WINDOW_MS - (now.getTime() - lastInbound.getTime())
      : META_WINDOW_MS;
    const metaWindowUrgent = remainingMs < 4 * 60 * 60 * 1000; // < 4 hours left
    this.lastInboundAt.set(phone, now);

    // ── Mark phone as actively chatting (suppresses email sequence) ─────────
    this.activeWhatsAppPhones.add(phone);

    // ── AI Classification (same 7 guardrails + 9 reply types as email) ─────
    const classification = await this.classifier.classify(msg.messageBody);

    // ── Choose Reply Text ───────────────────────────────────────────────────
    let replySent: string | null = null;

    if (classification.replyType === ReplyType.UNSUBSCRIBE) {
      // For opt-outs on WhatsApp, remove from active set and send no reply
      this.activeWhatsAppPhones.delete(phone);
      replySent = null;
    } else if (classification.replyType === ReplyType.OUT_OF_OFFICE_OR_REFERRAL) {
      // OOO on WhatsApp is unusual — log but send no reply
      replySent = null;
    } else if (classification.replyType === ReplyType.COMPLAINT_OR_LEGAL_THREAT) {
      // Compliance cases: no AI reply sent; route to compliance team immediately
      replySent = null;
    } else {
      // All other types: send holding reply or classified draft
      const replyText =
        (classification.draftHoldingReply && classification.draftHoldingReply !== APPROVED_HOLDING_REPLY)
          ? classification.draftHoldingReply
          : WHATSAPP_HOLDING_REPLY;

      try {
        const sent = await this.whatsAppAdapter.sendWhatsAppReply(msg.channelId, replyText);
        replySent = sent ? replyText : null;
      } catch (err) {
        // Non-fatal: log failure but continue processing
        replySent = null;
      }
    }

    // ── CRM Handover (types 4–9) ────────────────────────────────────────────
    let handoverTriggered = false;
    let odooLeadId: number | undefined;

    if (HANDOVER_REPLY_TYPES.has(classification.replyType)) {
      handoverTriggered = true;
      try {
        const priorityMap: Record<ReplyType, '0' | '1' | '2' | '3'> = {
          [ReplyType.DEMO_OR_MEETING_REQUEST]: '3',
          [ReplyType.COMPLAINT_OR_LEGAL_THREAT]: '3',
          [ReplyType.C_LEVEL_OR_MULTI_THREAD]: '2',
          [ReplyType.PRICING_OR_COMMERCIAL_TERMS]: '2',
          [ReplyType.PARTNER_INQUIRY]: '1',
          [ReplyType.UNCERTAIN_OR_LOW_CONFIDENCE]: '1',
          [ReplyType.UNSUBSCRIBE]: '0',
          [ReplyType.OUT_OF_OFFICE_OR_REFERRAL]: '0',
          [ReplyType.SIMPLE_FACTUAL_QUESTION]: '0'
        };

        const leadPayload = {
          name: `[WHATSAPP] ${msg.partnerName} – ${classification.intentName}`,
          contact_name: msg.partnerName,
          email_from: msg.partnerEmail, // No email: Odoo matches the contact on phone instead
          phone,
          partner_name: msg.partnerName,
          description: [
            `Channel: WhatsApp`,
            `Phone: ${phone}`,
            `Message: ${msg.messageBody}`,
            `Classification: ${classification.intentName} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`,
            `Recommended Action: ${classification.recommendedAction}`,
            `Meta Window Urgent: ${metaWindowUrgent ? 'YES — reply within 4 hours' : 'No'}`,
            `Processed At: ${now.toISOString()}`
          ].join('\n'),
          priority: priorityMap[classification.replyType] ?? '1',
          tagNames: odooTagsFor(classification.replyType, 'WHATSAPP')
        };

        const result = await this.odooAdapter.createOrUpdateLead(leadPayload);
        odooLeadId = result.odooLeadId;
      } catch {
        // Non-fatal: CRM create failure logged, operation continues
      }
    }

    const handlerResult: WhatsAppHandlerResult = {
      phone,
      classification,
      replySent,
      handoverTriggered,
      emailSequencePaused: true, // Always pause email when WhatsApp is active
      withinMetaWindow,
      metaWindowUrgent,
      odooLeadId,
      processedAt: now.toISOString()
    };

    // Store in session log
    this.conversationLog.push({
      ...handlerResult,
      partnerName: msg.partnerName,
      messageBody: msg.messageBody
    });

    return handlerResult;
  }

  /**
   * Marks a phone number as no longer in an active WhatsApp conversation.
   * Called when a conversation window expires or a contact opts out.
   */
  public clearActivePhone(phone: string): void {
    this.activeWhatsAppPhones.delete(this.normalizePhone(phone));
  }

  private normalizePhone(phone: string): string {
    // Strip whitespace and ensure E.164-like format
    return phone.replace(/\s+/g, '').replace(/^00/, '+');
  }
}
