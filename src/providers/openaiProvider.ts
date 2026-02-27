/**
 * OpenAI Provider
 * ===============
 * Supports multiple models via optional model parameter:
 * - gpt-4o-mini  → Vision Brain (screen share, cheap, fast)
 * - gpt-4o       → Deep Brain (complex reasoning, opt-in)
 *
 * Default: gpt-4o (backward compatible)
 */

import { LLMRequest, LLMResponse } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_DEFAULT_MODEL = 'gpt-4o';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export async function openaiComplete(request: LLMRequest): Promise<LLMResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const model = request.model || OPENAI_DEFAULT_MODEL;
  const startTime = Date.now();

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const latencyMs = Date.now() - startTime;

  return {
    text: data.choices?.[0]?.message?.content || '',
    model,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
    latencyMs,
  };
}
