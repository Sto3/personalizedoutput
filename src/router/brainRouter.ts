/**
 * Brain Router
 * ============
 * Decides which LLM handles each query.
 *
 * Routing logic:
 * 1. Deep Brain patterns (LSAT, MCAT, medical, legal, etc.) -> 'deep' (GPT-4o)
 * 2. Has vision frame -> 'fast' (Cerebras Llama 3.3 70B)
 * 3. Default -> 'voice' (Claude Haiku 4.5)
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

  // Vision queries go to fast brain (Cerebras with vision support)
  if (hasVision) {
    return {
      brain: 'fast',
      reason: 'Vision frame present',
    };
  }

  // Default: voice brain (Claude Haiku - optimized for conversational)
  return {
    brain: 'voice',
    reason: 'Default conversational',
  };
}
