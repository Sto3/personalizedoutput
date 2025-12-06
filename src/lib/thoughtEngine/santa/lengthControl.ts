/**
 * Santa Message Length Control
 *
 * Ensures scripts are exactly 45-60 seconds (120-160 words).
 * Provides automatic trimming and expansion logic.
 */

// ============================================================
// CONSTANTS
// ============================================================

export const LENGTH_TARGETS = {
  minWords: 120,
  maxWords: 160,
  targetWords: 140,  // Ideal middle ground
  minSeconds: 45,
  maxSeconds: 60,
  targetSeconds: 52,
  wordsPerSecond: 2.5  // Average speaking rate for Santa voice
};

// ============================================================
// TYPES
// ============================================================

export interface LengthAnalysis {
  wordCount: number;
  estimatedSeconds: number;
  status: 'too_short' | 'too_long' | 'optimal';
  recommendation: string;
}

export interface LengthAdjustmentResult {
  originalWordCount: number;
  adjustedWordCount: number;
  adjustedScript: string;
  action: 'trimmed' | 'expanded' | 'unchanged';
  changes: string[];
}

// ============================================================
// ANALYSIS
// ============================================================

export function analyzeLength(script: string): LengthAnalysis {
  const wordCount = countWords(script);
  const estimatedSeconds = wordCount / LENGTH_TARGETS.wordsPerSecond;

  let status: LengthAnalysis['status'];
  let recommendation: string;

  if (wordCount < LENGTH_TARGETS.minWords) {
    status = 'too_short';
    const wordsNeeded = LENGTH_TARGETS.targetWords - wordCount;
    recommendation = `Add approximately ${wordsNeeded} more words. Consider expanding the character affirmation section or adding another specific detail.`;
  } else if (wordCount > LENGTH_TARGETS.maxWords) {
    status = 'too_long';
    const wordsToRemove = wordCount - LENGTH_TARGETS.targetWords;
    recommendation = `Remove approximately ${wordsToRemove} words. Consider tightening transitions or removing redundant phrases.`;
  } else {
    status = 'optimal';
    recommendation = `Length is good (${wordCount} words, ~${Math.round(estimatedSeconds)} seconds).`;
  }

  return {
    wordCount,
    estimatedSeconds,
    status,
    recommendation
  };
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export function estimateDuration(text: string): number {
  return countWords(text) / LENGTH_TARGETS.wordsPerSecond;
}

// ============================================================
// PROMPT INSTRUCTIONS FOR LENGTH
// ============================================================

export function getLengthInstructions(): string {
  return `
LENGTH REQUIREMENTS - CRITICAL:

Target: ${LENGTH_TARGETS.minWords}-${LENGTH_TARGETS.maxWords} words (${LENGTH_TARGETS.minSeconds}-${LENGTH_TARGETS.maxSeconds} seconds when spoken)
Ideal: ${LENGTH_TARGETS.targetWords} words (~${LENGTH_TARGETS.targetSeconds} seconds)

STRUCTURE BREAKDOWN:
1. GREETING (15-20 words)
   - "Ho ho ho! Hello [Name]!"
   - Brief warm opener establishing connection

2. RECOGNITION - THE HEART (80-100 words)
   - Reference SPECIFIC details from proud moments
   - Use their exact words/quotes when provided
   - Show you really KNOW this child
   - This is the emotional core

3. CHARACTER AFFIRMATION (30-40 words)
   - Connect specific actions to character traits
   - Weave in parent's desired message
   - Brief but meaningful

4. WARM CLOSE (15-20 words)
   - Encouragement without pressure
   - "Merry Christmas, [Name]!"

PACING TIPS:
- Use "..." for natural pauses (counts as pause time, not words)
- Short sentences feel warmer than long ones
- End sections with the child's name for personal touch
`;
}

// ============================================================
// AUTO-TRIMMING STRATEGIES
// ============================================================

const TRIMMING_STRATEGIES = [
  {
    name: 'Remove filler words',
    priority: 1,
    patterns: [
      { find: /\breally, really\b/gi, replace: 'really' },
      { find: /\bvery, very\b/gi, replace: 'very' },
      { find: /\bjust so\b/gi, replace: 'so' },
      { find: /\band also\b/gi, replace: 'and' },
      { find: /\bvery much\b/gi, replace: '' },
      { find: /\bactually\b/gi, replace: '' },
      { find: /\breally\b/gi, replace: '' }  // Last resort
    ]
  },
  {
    name: 'Simplify transitions',
    priority: 2,
    patterns: [
      { find: /And you know what\?/gi, replace: 'And' },
      { find: /You know what I love\?/gi, replace: 'I love' },
      { find: /I have to tell you,/gi, replace: '' },
      { find: /Let me tell you,/gi, replace: '' },
      { find: /Here's the thing,/gi, replace: '' }
    ]
  },
  {
    name: 'Tighten phrases',
    priority: 3,
    patterns: [
      { find: /at this time of year/gi, replace: 'this season' },
      { find: /right here at the North Pole/gi, replace: 'at the North Pole' },
      { find: /each and every/gi, replace: 'every' },
      { find: /all of the/gi, replace: 'all the' },
      { find: /a lot of/gi, replace: 'lots of' }
    ]
  }
];

export function autoTrim(script: string): LengthAdjustmentResult {
  const originalWordCount = countWords(script);
  let adjusted = script;
  const changes: string[] = [];

  // Only trim if too long
  if (originalWordCount <= LENGTH_TARGETS.maxWords) {
    return {
      originalWordCount,
      adjustedWordCount: originalWordCount,
      adjustedScript: script,
      action: 'unchanged',
      changes: []
    };
  }

  // Apply trimming strategies in order of priority
  for (const strategy of TRIMMING_STRATEGIES) {
    if (countWords(adjusted) <= LENGTH_TARGETS.targetWords) break;

    for (const { find, replace } of strategy.patterns) {
      const before = adjusted;
      adjusted = adjusted.replace(find, replace);
      if (before !== adjusted) {
        changes.push(`${strategy.name}: removed/simplified pattern`);
      }
      if (countWords(adjusted) <= LENGTH_TARGETS.targetWords) break;
    }
  }

  // Clean up double spaces
  adjusted = adjusted.replace(/\s+/g, ' ').trim();

  return {
    originalWordCount,
    adjustedWordCount: countWords(adjusted),
    adjustedScript: adjusted,
    action: 'trimmed',
    changes
  };
}

// ============================================================
// VALIDATION FOR GENERATION
// ============================================================

export function validateAndAdjust(script: string): {
  script: string;
  wordCount: number;
  seconds: number;
  valid: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  let processed = script;

  // First pass: analyze
  const initial = analyzeLength(processed);
  notes.push(`Initial: ${initial.wordCount} words (~${Math.round(initial.estimatedSeconds)}s)`);

  // If too long, auto-trim
  if (initial.status === 'too_long') {
    const trimResult = autoTrim(processed);
    processed = trimResult.adjustedScript;
    notes.push(`Trimmed: ${trimResult.originalWordCount} -> ${trimResult.adjustedWordCount} words`);
    notes.push(...trimResult.changes);
  }

  // Final analysis
  const final = analyzeLength(processed);
  const valid = final.status === 'optimal';

  if (!valid) {
    notes.push(`WARNING: ${final.recommendation}`);
  }

  return {
    script: processed,
    wordCount: final.wordCount,
    seconds: Math.round(final.estimatedSeconds),
    valid,
    notes
  };
}

// ============================================================
// SECTION WORD BUDGETS
// ============================================================

export const SECTION_BUDGETS = {
  greeting: { min: 12, max: 20, target: 15 },
  recognition: { min: 70, max: 100, target: 85 },
  affirmation: { min: 25, max: 40, target: 30 },
  closing: { min: 12, max: 20, target: 15 }
};

export function getSectionBudgetPrompt(): string {
  return `
WORD BUDGETS PER SECTION:

1. GREETING: ${SECTION_BUDGETS.greeting.min}-${SECTION_BUDGETS.greeting.max} words (target: ${SECTION_BUDGETS.greeting.target})
2. RECOGNITION: ${SECTION_BUDGETS.recognition.min}-${SECTION_BUDGETS.recognition.max} words (target: ${SECTION_BUDGETS.recognition.target})
3. AFFIRMATION: ${SECTION_BUDGETS.affirmation.min}-${SECTION_BUDGETS.affirmation.max} words (target: ${SECTION_BUDGETS.affirmation.target})
4. CLOSING: ${SECTION_BUDGETS.closing.min}-${SECTION_BUDGETS.closing.max} words (target: ${SECTION_BUDGETS.closing.target})

TOTAL: ${LENGTH_TARGETS.minWords}-${LENGTH_TARGETS.maxWords} words
`;
}
