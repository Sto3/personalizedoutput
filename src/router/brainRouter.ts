/**
 * Brain Router
 * ============
 * Decides which LLM handles each query.
 *
 * Routing logic:
 * 1. Deep Brain ONLY when user has explicitly enabled it via toggle
 * 2. When deep is enabled: vision frames sent to GPT-4o, complex patterns to GPT-4o
 * 3. When deep is disabled (default): everything goes to Fast Brain (Cerebras)
 *
 * Deep Brain is opt-in because:
 * - GPT-4o is 2+ seconds vs Cerebras 200ms
 * - Uses 10x more credits
 * - Most queries don't need it
 *
 * Updated: Feb 24, 2026
 * - Deep Brain is now opt-in only (user toggle)
 * - No more auto-routing based on vision trigger patterns
 * - deepEnabled parameter controls access
 */

import { RouteDecision } from '../providers/types';

const DEEP_BRAIN_PATTERNS: RegExp[] = [
  /\b(LSAT|MCAT|GMAT|GRE)\b/i,
  /\bbar\s+(exam|prep)\b/i,
  /\b(clinical|diagnosis|differential|pathology|pharmacology)\b/i,
  /\b(constitutional\s+law|tort|contract\s+law|civil\s+procedure)\b/i,
  /\b(organic\s+chemistry|quantum|thermodynamics)\b/i,
  /\b(advanced\s+physics|calculus|differential\s+equations)\b/i,
  /\b(board\s+exam|USMLE|COMLEX)\b/i,
  /\b(case\s+study|legal\s+analysis|medical\s+reasoning)\b/i,
];

export function routeQuery(
  userText: string,
  hasVision: boolean,
  deepEnabled: boolean = false,
  conversationContext?: string,
): RouteDecision {
  // Deep Brain is OPT-IN only
  if (!deepEnabled) {
    return {
      brain: 'fast',
      reason: 'Text-only — using Cerebras (fastest)',
    };
  }

  // Deep is enabled — check for complex patterns
  const textToCheck = `${userText} ${conversationContext || ''}`;
  for (const pattern of DEEP_BRAIN_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return {
        brain: 'deep',
        reason: `Deep pattern: ${pattern.source}`,
      };
    }
  }

  // Deep is enabled + vision frame available → use GPT-4o for all queries
  // (user explicitly opted into deep mode, so give them the best)
  if (hasVision) {
    return {
      brain: 'deep',
      reason: 'Deep mode ON + vision — using GPT-4o',
    };
  }

  // Deep enabled but no vision and no complex pattern → still use fast for speed
  return {
    brain: 'fast',
    reason: 'Deep mode ON but text-only — using Cerebras',
  };
}
