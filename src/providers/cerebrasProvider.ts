/**
 * Cerebras Provider - Fast Brain
 * ==============================
 * Llama 3.3 70B via Cerebras for fast vision queries.
 * Model: llama-3.3-70b
 */

import { LLMRequest, LLMResponse } from './types';

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_MODEL = 'llama-3.3-70b';
const CEREBRAS_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';

export async function cerebrasComplete(request: LLMRequest): Promise<LLMResponse> {
  if (!CEREBRAS_API_KEY) {
    throw new Error('CEREBRAS_API_KEY not set');
  }

  const startTime = Date.now();

  const response = await fetch(CEREBRAS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cerebras API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const latencyMs = Date.now() - startTime;

  return {
    text: data.choices?.[0]?.message?.content || '',
    model: CEREBRAS_MODEL,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
    latencyMs,
  };
}
