/**
 * Anthropic Provider - Voice Brain
 * =================================
 * Claude Haiku 4.5 for voice-only conversations.
 * Model: claude-haiku-4-5-20251001
 *
 * Converts from OpenAI message format to Anthropic format:
 * - System message extracted separately
 * - Roles mapped (user/assistant only in messages array)
 */

import { LLMRequest, LLMResponse, LLMMessage } from './types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function convertToAnthropicFormat(messages: LLMMessage[]): { system: string; messages: any[] } {
  let system = '';
  const anthropicMessages: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Extract system message(s) into the top-level system param
      system += (typeof msg.content === 'string' ? msg.content : msg.content.map(c => 'text' in c ? c.text : '').join('\n'));
      continue;
    }

    // Map content format
    let content: any;
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else {
      // Convert array format - Anthropic uses 'image' type with base64 source
      content = msg.content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        }
        if (part.type === 'image_url') {
          const url = part.image_url.url;
          // Handle base64 data URLs
          if (url.startsWith('data:')) {
            const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: match[1],
                  data: match[2],
                },
              };
            }
          }
          // Handle regular URLs
          return {
            type: 'image',
            source: { type: 'url', url },
          };
        }
        return part;
      });
    }

    anthropicMessages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }

  return { system, messages: anthropicMessages };
}

export async function anthropicComplete(request: LLMRequest): Promise<LLMResponse> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const startTime = Date.now();
  const { system, messages } = convertToAnthropicFormat(request.messages);

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system: system || undefined,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const latencyMs = Date.now() - startTime;

  // Anthropic response format: { content: [{ type: 'text', text: '...' }], usage: { input_tokens, output_tokens } }
  const text = data.content?.map((c: any) => c.text).join('') || '';

  return {
    text,
    model: ANTHROPIC_MODEL,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
    latencyMs,
  };
}
