/**
 * Redi Response Pipeline - LAYER 4
 *
 * Final layer that ALL responses must pass through before being spoken.
 * Implements strict guards:
 *
 * 1. Staleness Guard - Reject responses to stale context
 * 2. Interruption Guard - Stop if user is speaking
 * 3. Length Guard - Enforce word limits
 * 4. Content Guard - Ban forbidden phrases
 * 5. Deduplication Guard - No repetition
 * 6. Rate Limit Guard - Don't spam
 *
 * ANY guard failure = stay silent
 */

import { PipelineOutput } from './militaryGradeTypes';

// ============================================================================
// GUARD CONFIGURATIONS
// ============================================================================

const CONFIG = {
  // Staleness: how old context can be
  maxContextAgeMsUnprompted: 2000,  // Unprompted interjections: 2s
  maxContextAgeMsPrompted: 5000,    // User questions: 5s (they're waiting)

  // Length limits
  maxWordsUnprompted: 8,
  maxWordsPrompted: 25,

  // Rate limiting - ONLY for unprompted interjections
  // User questions bypass rate limit (conversation flow)
  minGapMsUnprompted: 3000,  // Minimum time between unprompted responses

  // Deduplication
  similarityThreshold: 0.6,  // 60% word overlap = duplicate
  recentResponsesCount: 5
};

// ============================================================================
// BANNED PATTERNS (Content Guard)
// ============================================================================

const BANNED_PATTERNS = [
  // Questions
  /\?$/,

  // Help offers
  /how can i help/i,
  /what would you like/i,
  /what can i help/i,
  /i'm here to help/i,
  /let me know if/i,
  /what do you need/i,
  /ready to help/i,
  /whenever you need/i,
  /here for you/i,
  /need any help/i,
  /what's up/i,
  /what can i do for you/i,
  /anything else/i,
  /anything you need/i,

  // Visual negation - COMPREHENSIVE (model keeps finding new ways to say this)
  /i don't see/i,
  /i can't see/i,
  /i do not.*see/i,           // "I do not actually see"
  /i'm not seeing/i,          // "I'm not seeing any screen"
  /not seeing any/i,          // "not seeing any screen content"
  /there's no/i,
  /there is no/i,
  /no visual/i,
  /no image/i,
  /not visible/i,
  /can't find/i,
  /cannot see/i,
  /i apologize.*see/i,        // "I apologize, but I don't see"
  /can only respond/i,        // "I can only respond to messages"
  /no screen content/i,       // "no screen content"
  /not.*to work with/i,       // "nothing to work with"

  // Wordy phrases
  /i notice that/i,
  /it seems like/i,
  /it looks like/i,
  /it appears that/i,
  /i can see that/i,
  /i see that/i,
  /i would suggest/i,
  /you might want to/i,

  // Robotic intros
  /^(yep|yeah|hey|hi|hello),?\s/i,

  // Self-references
  /as an ai/i,
  /as a language model/i,
  /i'm redi/i,
  /my name is/i,

  // Quality complaints
  /blurry|unclear|hard to see|can't tell/i
];

// ============================================================================
// PIPELINE STATE (per session)
// ============================================================================

interface PipelineState {
  sessionId: string;
  lastResponseAt: number;
  recentResponses: string[];
  isSpeaking: boolean;
  userSpeaking: boolean;
  lastContextTimestamp: number;
}

const sessionStates = new Map<string, PipelineState>();

/**
 * Initialize pipeline for a session
 */
export function initPipeline(sessionId: string): void {
  sessionStates.set(sessionId, {
    sessionId,
    lastResponseAt: 0,
    recentResponses: [],
    isSpeaking: false,
    userSpeaking: false,
    lastContextTimestamp: Date.now()
  });
  console.log(`[Pipeline] Initialized for session ${sessionId}`);
}

/**
 * Clean up pipeline for a session
 */
export function cleanupPipeline(sessionId: string): void {
  sessionStates.delete(sessionId);
  console.log(`[Pipeline] Cleaned up session ${sessionId}`);
}

/**
 * Update context timestamp when new data arrives
 */
export function updateContextTimestamp(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.lastContextTimestamp = Date.now();
  }
}

/**
 * Mark that user started speaking
 */
export function setUserSpeaking(sessionId: string, speaking: boolean): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.userSpeaking = speaking;
  }
}

/**
 * Mark that Redi is speaking
 */
export function setRediSpeaking(sessionId: string, speaking: boolean): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.isSpeaking = speaking;
  }
}

// ============================================================================
// MAIN PIPELINE FUNCTION
// ============================================================================

/**
 * Process response through all guards
 * Returns approved response or rejection reason
 */
export function processResponse(
  sessionId: string,
  response: string,
  source: 'rule_engine' | 'haiku' | 'sonnet',
  isPrompted: boolean = false
): PipelineOutput {
  const startTime = Date.now();
  const state = sessionStates.get(sessionId);

  if (!state) {
    return {
      approved: false,
      rejectedBy: 'no_state',
      processingTimeMs: Date.now() - startTime,
      source
    };
  }

  // GUARD 1: Staleness (more lenient for prompted responses - user is waiting)
  const stalenessResult = checkStaleness(state, isPrompted);
  if (!stalenessResult.pass) {
    console.log(`[Pipeline] Rejected by staleness guard: context ${stalenessResult.ageMs}ms old (max: ${stalenessResult.maxAge}ms)`);
    return {
      approved: false,
      rejectedBy: 'staleness',
      processingTimeMs: Date.now() - startTime,
      source
    };
  }

  // GUARD 2: Interruption
  const interruptionResult = checkInterruption(state);
  if (!interruptionResult.pass) {
    console.log(`[Pipeline] Rejected by interruption guard: ${interruptionResult.reason}`);
    return {
      approved: false,
      rejectedBy: 'interruption',
      processingTimeMs: Date.now() - startTime,
      source
    };
  }

  // GUARD 3: Rate Limit - ONLY for unprompted interjections
  // User questions (prompted) bypass rate limit to allow conversation flow
  if (!isPrompted) {
    const rateLimitResult = checkRateLimit(state);
    if (!rateLimitResult.pass) {
      console.log(`[Pipeline] Rejected by rate limit: ${rateLimitResult.gapMs}ms since last (unprompted)`);
      return {
        approved: false,
        rejectedBy: 'rate_limit',
        processingTimeMs: Date.now() - startTime,
        source
      };
    }
  }

  // GUARD 4: Content
  let processedResponse = response;
  const contentResult = checkContent(processedResponse);
  if (!contentResult.pass) {
    console.log(`[Pipeline] Rejected by content guard: ${contentResult.reason}`);
    return {
      approved: false,
      rejectedBy: 'content',
      processingTimeMs: Date.now() - startTime,
      source
    };
  }

  // GUARD 5: Length (may truncate)
  const lengthResult = enforceLength(processedResponse, isPrompted);
  if (!lengthResult.pass) {
    console.log(`[Pipeline] Rejected by length guard: ${lengthResult.reason}`);
    return {
      approved: false,
      rejectedBy: 'length',
      processingTimeMs: Date.now() - startTime,
      source
    };
  }
  processedResponse = lengthResult.response!;

  // GUARD 6: Deduplication
  const dedupResult = checkDeduplication(state, processedResponse);
  if (!dedupResult.pass) {
    console.log(`[Pipeline] Rejected by dedup guard: ${dedupResult.similarity}% similar`);
    return {
      approved: false,
      rejectedBy: 'deduplication',
      processingTimeMs: Date.now() - startTime,
      source
    };
  }

  // ALL GUARDS PASSED!
  state.recentResponses.push(processedResponse);
  if (state.recentResponses.length > CONFIG.recentResponsesCount) {
    state.recentResponses.shift();
  }
  state.lastResponseAt = Date.now();

  console.log(`[Pipeline] APPROVED (${source}): "${processedResponse}"`);

  return {
    approved: true,
    response: processedResponse,
    processingTimeMs: Date.now() - startTime,
    source
  };
}

// ============================================================================
// INDIVIDUAL GUARD IMPLEMENTATIONS
// ============================================================================

function checkStaleness(state: PipelineState, isPrompted: boolean): { pass: boolean; ageMs: number; maxAge: number } {
  const ageMs = Date.now() - state.lastContextTimestamp;
  const maxAge = isPrompted ? CONFIG.maxContextAgeMsPrompted : CONFIG.maxContextAgeMsUnprompted;
  return {
    pass: ageMs <= maxAge,
    ageMs,
    maxAge
  };
}

function checkInterruption(state: PipelineState): { pass: boolean; reason?: string } {
  if (state.userSpeaking) {
    return { pass: false, reason: 'user_speaking' };
  }
  if (state.isSpeaking) {
    return { pass: false, reason: 'already_speaking' };
  }
  return { pass: true };
}

function checkRateLimit(state: PipelineState): { pass: boolean; gapMs: number } {
  const gapMs = Date.now() - state.lastResponseAt;
  return {
    pass: gapMs >= CONFIG.minGapMsUnprompted,
    gapMs
  };
}

function checkContent(text: string): { pass: boolean; reason?: string } {
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        pass: false,
        reason: `Matched banned pattern: ${pattern.toString()}`
      };
    }
  }
  return { pass: true };
}

function enforceLength(text: string, isPrompted: boolean): {
  pass: boolean;
  response?: string;
  reason?: string;
} {
  const maxWords = isPrompted ? CONFIG.maxWordsPrompted : CONFIG.maxWordsUnprompted;
  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (words.length <= maxWords) {
    return { pass: true, response: text };
  }

  // For unprompted, if way over limit, reject entirely
  if (!isPrompted && words.length > maxWords * 2) {
    return {
      pass: false,
      reason: `Too long: ${words.length} words (max ${maxWords})`
    };
  }

  // Truncate
  let truncated = words.slice(0, maxWords).join(' ');

  // Clean up truncation
  if (!truncated.endsWith('.') && !truncated.endsWith('!')) {
    // Try to end at last complete sentence
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > truncated.length * 0.5) {
      truncated = truncated.substring(0, lastPeriod + 1);
    } else {
      truncated += '.';
    }
  }

  return { pass: true, response: truncated };
}

function checkDeduplication(state: PipelineState, text: string): {
  pass: boolean;
  similarity: number;
} {
  if (state.recentResponses.length === 0) {
    return { pass: true, similarity: 0 };
  }

  const textLower = text.toLowerCase();
  const textWords = new Set(textLower.split(/\s+/).filter(w => w.length > 3));

  let maxSimilarity = 0;

  for (const recent of state.recentResponses) {
    const recentLower = recent.toLowerCase();
    const recentWords = new Set(recentLower.split(/\s+/).filter(w => w.length > 3));

    if (textWords.size === 0 || recentWords.size === 0) continue;

    let overlap = 0;
    for (const word of textWords) {
      if (recentWords.has(word)) overlap++;
    }

    const similarity = overlap / Math.max(textWords.size, recentWords.size);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  return {
    pass: maxSimilarity < CONFIG.similarityThreshold,
    similarity: Math.round(maxSimilarity * 100)
  };
}

// ============================================================================
// FORCE OVERRIDE (for testing/debugging)
// ============================================================================

/**
 * Force a response through without guards (for testing only)
 */
export function forceResponse(sessionId: string, response: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.recentResponses.push(response);
    if (state.recentResponses.length > CONFIG.recentResponsesCount) {
      state.recentResponses.shift();
    }
    state.lastResponseAt = Date.now();
  }
  console.warn(`[Pipeline] FORCED response (bypassed guards): "${response}"`);
}

/**
 * Get pipeline stats for debugging
 */
export function getPipelineStats(sessionId: string): {
  recentResponses: string[];
  lastResponseAt: number;
  timeSinceLastResponse: number;
} | null {
  const state = sessionStates.get(sessionId);
  if (!state) return null;

  return {
    recentResponses: [...state.recentResponses],
    lastResponseAt: state.lastResponseAt,
    timeSinceLastResponse: Date.now() - state.lastResponseAt
  };
}

export default {
  initPipeline,
  cleanupPipeline,
  updateContextTimestamp,
  setUserSpeaking,
  setRediSpeaking,
  processResponse,
  forceResponse,
  getPipelineStats
};
