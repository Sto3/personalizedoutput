/**
 * Brain Router
 * ============
 * Decides which LLM handles each query.
 *
 * Routing logic:
 * 1. Deep Brain patterns (LSAT, MCAT, medical, legal, etc.) -> 'deep' (GPT-4o)
 * 2. Vision keywords + has frame -> 'deep' (user is asking about what they see)
 * 3. Default text (even with screen share on) -> 'fast' (Cerebras - fastest)
 *
 * CRITICAL: Screen share being ON does NOT mean every query needs vision.
 * "Hey what's up" during screen share should still be Cerebras at 200ms,
 * not GPT-4o at 2000ms. Only route to deep when the user is ASKING about
 * what's on screen.
 *
 * Updated: Feb 23, 2026
 * - Smart vision routing: only Deep Brain when user references screen content
 * - Screen share no longer forces all queries to GPT-4o
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

// Patterns that suggest the user is asking about what they SEE on screen
const VISION_TRIGGER_PATTERNS: RegExp[] = [
  // Direct screen references
  /\b(see|look|screen|display|showing|shown|page|window|tab)\b/i,
  /\bwhat('s| is) (this|that|on|here)\b/i,
  /\bcan you (see|read|look)\b/i,
  /\b(read|analyze|check|review|look at) (this|that|the|my)\b/i,
  // Visual questions
  /\bwhat (do you|does it|am i|is this)\b.*\b(see|show|display|look)\b/i,
  /\b(this|that) (code|text|image|photo|document|email|message|error|bug|page)\b/i,
  /\bhelp (me )?(with|fix|debug|understand) (this|that|what)\b/i,
  // Pointing/referencing
  /\b(right here|over here|this part|that part|this section)\b/i,
  /\b(error|bug|issue|problem) (on|in|with) (the |my )?(screen|page|code)\b/i,
];

export function routeQuery(
  userText: string,
  hasVision: boolean,
  conversationContext?: string,
): RouteDecision {
  // Check for deep brain patterns first (academic/professional complexity)
  const textToCheck = `${userText} ${conversationContext || ''}`;
  for (const pattern of DEEP_BRAIN_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return {
        brain: 'deep',
        reason: `Deep pattern matched: ${pattern.source}`,
      };
    }
  }

  // Vision queries: only route to deep if user is ASKING about screen content
  if (hasVision) {
    for (const pattern of VISION_TRIGGER_PATTERNS) {
      if (pattern.test(userText)) {
        return {
          brain: 'deep',
          reason: `Vision trigger: "${userText.slice(0, 30)}..." — using GPT-4o`,
        };
      }
    }
    // Screen is on but user isn't asking about it → fast brain
  }

  // General text queries -> fast brain (Cerebras GPT-OSS 120B, ~3000 t/s)
  return {
    brain: 'fast',
    reason: 'Text-only — using Cerebras (fastest)',
  };
}
