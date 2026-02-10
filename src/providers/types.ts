/**
 * V9 Shared Types
 * ===============
 * Common interfaces for the Three-Brain architecture.
 */

export type BrainType = 'fast' | 'voice' | 'deep';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
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
