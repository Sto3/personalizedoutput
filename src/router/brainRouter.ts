/**
 * Brain Router — Four-Brain Architecture
 * =======================================
 *
 * Routing logic:
 * 1. Vision frame present → 'vision' brain (GPT-4o Mini) — automatic, no toggle needed
 * 2. Deep Brain toggled ON + complex patterns → 'deep' brain (GPT-4o)
 * 3. Everything else → 'fast' brain (Cerebras) — 90%+ of queries
 *
 * Screen share works automatically now — users don't need to toggle Deep Brain
 * just to see their screen. Deep Brain is reserved for genuinely complex reasoning.
 *
 * Updated: Feb 27, 2026
 * - Vision auto-routes to GPT-4o Mini (cheap, fast, vision-capable)
 * - Deep Brain stays opt-in for complex reasoning (GPT-4o)
 * - No more requiring Deep toggle for screen share
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
  const textToCheck = `${userText} ${conversationContext || ''}`;

  // 1. Deep Brain enabled + complex pattern → GPT-4o (full power)
  if (deepEnabled) {
    for (const pattern of DEEP_BRAIN_PATTERNS) {
      if (pattern.test(textToCheck)) {
        return { brain: 'deep', reason: `Deep pattern: ${pattern.source}` };
      }
    }
  }

  // 2. Vision frame present → GPT-4o Mini (auto-routed, no toggle needed)
  //    If deep is also ON, use full GPT-4o for vision instead
  if (hasVision) {
    if (deepEnabled) {
      return { brain: 'deep', reason: 'Deep ON + vision — GPT-4o (full)' };
    }
    return { brain: 'vision', reason: 'Screen share — GPT-4o Mini (auto)' };
  }

  // 3. Everything else → Cerebras (fastest)
  return { brain: 'fast', reason: 'Text-only — Cerebras (fastest)' };
}
