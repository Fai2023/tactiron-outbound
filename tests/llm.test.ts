import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicClaudeAdapter, MockLLMAdapter, createLLMAdapter } from '../src/integrations/llm/adapter.js';
import { ReplyClassifier } from '../src/modules/replies/classifier.js';
import { ReplyType } from '../src/core/types/index.js';

// A Claude client whose HTTP layer is replaced, so no request leaves the machine
function fakeClaude(reply: { text?: string; stop_reason?: string; stop_details?: unknown }) {
  const requests: Record<string, any>[] = [];
  const client = new Anthropic({
    apiKey: 'test-key',
    maxRetries: 0,
    fetch: async (_url, init) => {
      requests.push(JSON.parse(String(init!.body)));
      const message = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: reply.text === undefined ? [] : [{ type: 'text', text: reply.text }],
        stop_reason: reply.stop_reason ?? 'end_turn',
        stop_details: reply.stop_details ?? null,
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 }
      };
      return new Response(JSON.stringify(message), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  return { client, requests };
}

const demoRequest = {
  replyType: 4,
  intentName: 'DEMO_OR_MEETING_REQUEST',
  confidence: 0.93,
  extractedFacts: { requestedDemo: true, teamSizeMentioned: 120 },
  recommendedAction: 'Book a demo with the fleet manager this week.',
  isEscalation: true,
  escalationTarget: 'SALES',
  proposedHoldingReply: 'Thanks for your interest. A colleague will be in touch today to arrange a demo.'
};

describe('AnthropicClaudeAdapter', () => {
  it('sends a structured-output request with refusal fallback and returns the parsed classification', async () => {
    const { client, requests } = fakeClaude({ text: JSON.stringify(demoRequest) });
    const result = await new AnthropicClaudeAdapter({ client }).classifyReply('Can we see a demo next week? We run 120 trucks.');

    expect(result.replyType).toBe(ReplyType.DEMO_OR_MEETING_REQUEST);
    expect(result.extractedFacts.teamSizeMentioned).toBe(120);

    const body = requests[0];
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.fallbacks).toBe('default');
    expect(body.output_config.effort).toBe('low');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.output_config.format.schema.required).toEqual(
      expect.arrayContaining(['replyType', 'confidence', 'escalationTarget'])
    );
    // The prospect's text is fenced off as data, not mixed into the instructions
    expect(body.messages[0].content).toContain('<prospect_reply>');
    expect(body.system).not.toContain('120 trucks');
  });

  it('throws on a refusal so the classifier escalates to a human', async () => {
    const { client } = fakeClaude({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: null } });
    await expect(new AnthropicClaudeAdapter({ client }).classifyReply('...')).rejects.toThrow(/declined/);
  });

  it('rejects an out-of-range reply type', async () => {
    const { client } = fakeClaude({ text: JSON.stringify({ ...demoRequest, replyType: 12 }) });
    await expect(new AnthropicClaudeAdapter({ client }).classifyReply('...')).rejects.toThrow();
  });

  it('falls back to type 9 human review when Claude fails', async () => {
    const { client } = fakeClaude({ stop_reason: 'refusal' });
    const classifier = new ReplyClassifier(new AnthropicClaudeAdapter({ client }));
    const result = await classifier.classify('We would like to understand your roadmap.');

    expect(result.replyType).toBe(ReplyType.UNCERTAIN_OR_LOW_CONFIDENCE);
    expect(result.requiresHumanReview).toBe(true);
  });

  it('uses the mock adapter when no API key is configured', () => {
    expect(createLLMAdapter(undefined)).toBeInstanceOf(MockLLMAdapter);
    expect(createLLMAdapter('sk-ant-test')).toBeInstanceOf(AnthropicClaudeAdapter);
  });
});
