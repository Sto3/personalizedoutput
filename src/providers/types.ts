/**
 * V9 Shared Types
 * ===============
 * Common interfaces for the Four-Brain architecture.
 *
 * fast   = Cerebras GPT-OSS 120B (text-only, ~200ms)
 * vision = GPT-4o Mini (screen share, ~300ms, auto-routed)
 * deep   = GPT-4o (complex reasoning, opt-in toggle)
 * voice  = Claude Haiku 4.5 (reserved for future)
 */

export type BrainType = 'fast' | 'vision' | 'deep' | 'voice';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  latencyMs: number;
}

export interface STTResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface TTSChunk {
  audio: Buffer;
  isFinal: boolean;
}

export interface RouteDecision {
  brain: BrainType;
  reason: string;
}
