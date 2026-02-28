/**
 * Brain Router — Four-Brain Architecture
 * =======================================
 *
 * Routing logic:
 * 1. User asks about screen but no frame → 'no_frame' (server gives helpful message)
 * 2. Vision frame present → 'vision' brain (GPT-4o Mini) — automatic, no toggle needed
 * 3. Deep Brain toggled ON + complex patterns → 'deep' brain (GPT-4o)
 * 4. Everything else → 'fast' brain (Cerebras) — 90%+ of queries
 *
 * Updated: Feb 28, 2026
 * - Added screen intent detection to prevent Cerebras from answering vision questions
 * - Vision auto-routes to GPT-4o Mini (cheap, fast, vision-capable)
 * - Deep Brain stays opt-in for complex reasoning (GPT-4o)
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

// Patterns that indicate the user is asking about what's on their screen
const SCREEN_INTENT_PATTERNS: RegExp[] = [
  /\b(see|look at|looking at)\s+(my\s+)?screen\b/i,
  /\b(what('s| is))\s+on\s+(my\s+)?screen\b/i,
  /\bscreen\s+share\b/i,
  /\bcan you see\b/i,
  /\bwhat do you see\b/i,
  /\bwhat am i (looking at|showing)\b/i,
  /\bread (this|that|my screen|what's on)\b/i,
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

  // 2. User asking about screen but no frame → special 'no_frame' indicator
  //    This prevents Cerebras from hallucinating about screen content
  if (!hasVision) {
    for (const pattern of SCREEN_INTENT_PATTERNS) {
      if (pattern.test(userText)) {
        return { brain: 'fast', reason: 'no_frame' };
      }
    }
  }

  // 3. Vision frame present → GPT-4o Mini (auto-routed, no toggle needed)
  //    If deep is also ON, use full GPT-4o for vision instead
  if (hasVision) {
    if (deepEnabled) {
      return { brain: 'deep', reason: 'Deep ON + vision — GPT-4o (full)' };
    }
    return { brain: 'vision', reason: 'Screen share — GPT-4o Mini (auto)' };
  }

  // 4. Everything else → Cerebras (fastest)
  return { brain: 'fast', reason: 'Text-only — Cerebras (fastest)' };
}
