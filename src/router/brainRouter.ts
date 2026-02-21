/**
 * Brain Router
 * ============
 * Decides which LLM handles each query.
 *
 * Routing logic:
 * 1. Deep Brain patterns (LSAT, MCAT, medical, legal, etc.) -> 'deep' (GPT-4o)
 * 2. Has vision frame -> 'deep' (GPT-4o - multimodal, supports image_url)
 * 3. Default text -> 'fast' (Cerebras GPT-OSS 120B - fastest text completion)
 * 4. Conversational fallback -> 'voice' (Claude Haiku 4.5)
 *
 * Updated: Feb 21, 2026
 * - Vision routes to Deep (GPT-4o) since Cerebras doesn't support image_url
 * - Fast brain now handles general text queries (was defaulting to voice)
 */

import { RouteDecision } from '../providers/types';

const DEEP_BRAIN_PATTERNS: RegExp[] = [
  // Standardized tests
  /\b(LSAT|MCAT|GMAT|GRE)\b/i,
  /\bbar\s+(exam|prep)\b/i,
  // Medical
  /\b(clinical|diagnosis|differential|pathology|pharmacology)\b/i,
  // Legal
  /\b(constitutional\s+law|tort|contract\s+law|civil\s+procedure)\b/i,
  // Sciences
  /\b(organic\s+chemistry|quantum|thermodynamics)\b/i,
  /\b(advanced\s+physics|calculus|differential\s+equations)\b/i,
  // Board exams
  /\b(board\s+exam|USMLE|COMLEX)\b/i,
  // Complex analysis
  /\b(case\s+study|legal\s+analysis|medical\s+reasoning)\b/i,
];

export function routeQuery(
  userText: string,
  hasVision: boolean,
  conversationContext?: string,
): RouteDecision {
  // Check for deep brain patterns first
  const textToCheck = `${userText} ${conversationContext || ''}`;
  for (const pattern of DEEP_BRAIN_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return {
        brain: 'deep',
        reason: `Deep pattern matched: ${pattern.source}`,
      };
    }
  }

  // Vision queries go to deep brain (GPT-4o supports multimodal image_url)
  if (hasVision) {
    return {
      brain: 'deep',
      reason: 'Vision frame present — using GPT-4o (multimodal)',
    };
  }

  // General text queries -> fast brain (Cerebras GPT-OSS 120B, ~3000 t/s)
  // This handles 90%+ of voice-only queries at maximum speed
  return {
    brain: 'fast',
    reason: 'Text-only — using Cerebras (fastest)',
  };
}
