/**
 * Redi Decision Engine
 *
 * Determines when Redi should autonomously speak based on context,
 * user sensitivity settings, and accumulated insights.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  DecisionContext,
  SpeakDecision,
  RediMode,
  MODE_CONFIGS,
  isContextFresh,
  CONTEXT_MAX_AGE_MS
} from './types';

// Re-export for use by websocket
export { isContextFresh, CONTEXT_MAX_AGE_MS };

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Minimum silence duration before considering interjection (ms)
const MIN_SILENCE_MS = 2000;

// Question detection patterns
const QUESTION_PATTERNS = [
  /\?$/,                          // Ends with question mark
  /^(what|who|where|when|why|how|is|are|can|could|would|should|do|does|did)\s/i,
  /help me|explain|tell me|show me/i,
  /what do you think|any thoughts|your opinion/i
];

// Error/mistake patterns (mode-specific)
const ERROR_PATTERNS: Record<RediMode, RegExp[]> = {
  general: [
    /that's not right|incorrect|wrong|mistake/i,
    /i don't understand|confused|help/i
  ],
  cooking: [
    /burnt|burning|too hot|overcooked|undercooked/i,
    /wrong ingredient|how long|what temperature/i
  ],
  studying: [
    /that's not right|incorrect|wrong|mistake/i,
    /i don't understand|confused|lost/i
  ],
  meeting: [
    /that data is|the numbers|actually|correction/i
  ],
  sports: [
    /my form|technique|doing it wrong/i
  ],
  music: [
    /off key|wrong note|timing|rhythm/i
  ],
  assembly: [
    /wrong piece|doesn't fit|stuck|problem/i
  ],
  monitoring: [
    /fell|crying|help|emergency/i
  ]
};

/**
 * Map a value from one range to another
 */
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Detect if recent transcript contains a question
 */
function detectQuestion(transcriptBuffer: string[]): boolean {
  const recentText = transcriptBuffer.slice(-3).join(' ');
  return QUESTION_PATTERNS.some(pattern => pattern.test(recentText));
}

/**
 * Detect if user mentioned an error or is struggling
 */
function detectError(transcriptBuffer: string[], mode: RediMode): boolean {
  const recentText = transcriptBuffer.slice(-5).join(' ');
  const patterns = ERROR_PATTERNS[mode] || [];
  return patterns.some(pattern => pattern.test(recentText));
}

/**
 * Core decision function: Should Redi speak now?
 */
export function shouldSpeak(ctx: DecisionContext): SpeakDecision {
  // 1. Always respond to direct questions
  if (detectQuestion(ctx.transcriptBuffer)) {
    return {
      shouldSpeak: true,
      reason: 'question',
      confidence: 0.95
    };
  }

  // 2. Don't interrupt - wait for silence
  if (ctx.silenceDuration < MIN_SILENCE_MS) {
    return {
      shouldSpeak: false,
      reason: 'none',
      confidence: 0
    };
  }

  // 3. Check for errors/struggles (higher priority)
  if (detectError(ctx.transcriptBuffer, ctx.mode)) {
    // Error detection is less sensitive to timing
    const minGapForError = mapRange(ctx.sensitivity, 0, 1, 15000, 3000);
    const timeSinceSpoke = Date.now() - ctx.lastSpokeAt;

    if (timeSinceSpoke >= minGapForError) {
      return {
        shouldSpeak: true,
        reason: 'error_detected',
        confidence: 0.85
      };
    }
  }

  // 4. Don't speak too frequently
  // More responsive: Passive=20s, Balanced=10s, Active=5s
  const minGap = mapRange(ctx.sensitivity, 0, 1, 20000, 5000);
  const timeSinceSpoke = Date.now() - ctx.lastSpokeAt;

  if (timeSinceSpoke < minGap) {
    return {
      shouldSpeak: false,
      reason: 'none',
      confidence: 0
    };
  }

  // 5. Must have something valuable to say
  if (!ctx.pendingInsight) {
    return {
      shouldSpeak: false,
      reason: 'none',
      confidence: 0
    };
  }

  // 6. Apply sensitivity threshold to insight confidence
  const threshold = mapRange(ctx.sensitivity, 0, 1, 0.9, 0.3);

  if (ctx.insightConfidence >= threshold) {
    return {
      shouldSpeak: true,
      reason: 'valuable_insight',
      confidence: ctx.insightConfidence
    };
  }

  return {
    shouldSpeak: false,
    reason: 'none',
    confidence: ctx.insightConfidence
  };
}

/**
 * Generate an insight based on current context
 * Returns null if nothing valuable to say
 */
export async function generateInsight(
  mode: RediMode,
  transcriptBuffer: string[],
  visualContext: string,
  sensitivity: number,
  recentResponses?: string[],
  transcriptCountAtLastSpoke?: number,
  visualContextAtLastSpoke?: string,
  isSpeaking?: boolean
): Promise<{ insight: string; confidence: number } | null> {
  // Don't generate if currently speaking
  if (isSpeaking) {
    return null;
  }

  const modeConfig = MODE_CONFIGS[mode];
  const recentTranscript = transcriptBuffer.slice(-10).join('\n');

  if (!recentTranscript && !visualContext) {
    return null;
  }

  // Check if there's new content since last spoke
  const hasNewTranscript = transcriptCountAtLastSpoke === undefined ||
                           transcriptBuffer.length > transcriptCountAtLastSpoke;
  const hasNewVisual = visualContextAtLastSpoke === undefined ||
                       visualContext !== visualContextAtLastSpoke;

  // Don't generate if nothing new to say about
  if (!hasNewTranscript && !hasNewVisual) {
    console.log('[Redi Decision] Skipping insight - no new content since last spoke');
    return null;
  }

  // COACH COURTSIDE PROMPT - Bark, don't explain
  const systemPrompt = `You are Redi. You ONLY speak in fragments — 2-8 words MAX.

NEVER:
- Ask questions
- Use complete sentences
- Explain yourself
- Say "I notice" or "It seems" or "It looks like"
- Describe what you see in detail
- Offer help ("I can help" "Let me know")

ONLY:
- Direct observations: "Elbow dropping"
- Quick corrections: "Wider grip"
- Brief encouragement: "Good, again"
- Simple alerts: "That's upside down"
- Short acknowledgments: "Nice" "Got it" "Tostitos"

You are a coach courtside, not a lecturer. Bark, don't explain.
If nothing worth saying: respond ONLY with NO_INSIGHT

Focus: ${modeConfig.systemPromptFocus}`;

  // Only include visual section if we have visual context
  // NEVER mention "no visual" - just omit the section entirely
  const visualSection = visualContext
    ? `\n\nWhat you see:\n${visualContext}`
    : '';

  const userPrompt = `What the user is saying:
${recentTranscript || '(silence)'}${visualSection}

Should you say something? If yes, what would you say naturally?`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const text = content.text.trim();

    if (text === 'NO_INSIGHT' || text.includes('NO_INSIGHT')) {
      return null;
    }

    // ENFORCE 8-word maximum for UNPROMPTED insights (coach barks, doesn't lecture)
    // Note: Prompted responses (questions) use generateQuestionResponse which has different limits
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 8) {
      console.log(`[Redi Decision] REJECTED unprompted - too long (${wordCount} words): "${text.substring(0, 50)}..."`);
      return null;
    }

    // ENFORCE no questions in unprompted insights
    if (text.includes('?')) {
      console.log(`[Redi Decision] REJECTED - contains question: "${text.substring(0, 50)}..."`);
      return null;
    }

    // ENFORCE no help offers - these sound robotic
    if (/i can help|let me know|i'm here to help|how can i/i.test(text)) {
      console.log(`[Redi Decision] REJECTED - contains help offer: "${text.substring(0, 50)}..."`);
      return null;
    }

    // ENFORCE no wordy phrases in unprompted insights
    if (/i notice|it seems|it looks like|it appears|i can see|i see that/i.test(text)) {
      console.log(`[Redi Decision] REJECTED - wordy phrase: "${text.substring(0, 50)}..."`);
      return null;
    }

    // Calculate confidence based on response characteristics
    let confidence = 0.7;

    // Higher confidence if responding to apparent struggle
    if (transcriptBuffer.some(t => /don't understand|confused|help/i.test(t))) {
      confidence += 0.15;
    }

    // Higher confidence if visual context is rich
    if (visualContext && visualContext.length > 100) {
      confidence += 0.1;
    }

    // Lower confidence for generic responses
    if (/you can|you might|perhaps|maybe/i.test(text)) {
      confidence -= 0.1;
    }

    // Check for similarity with recent responses to prevent repetition
    if (recentResponses && recentResponses.length > 0) {
      const textLower = text.toLowerCase();
      for (const recent of recentResponses) {
        const recentLower = recent.toLowerCase();
        // Simple similarity check - if 60%+ of words match, reject
        const textWords = textLower.split(/\s+/).filter(w => w.length > 3);
        const recentWords = recentLower.split(/\s+/).filter(w => w.length > 3);
        if (textWords.length > 0) {
          const matchCount = textWords.filter(w => recentWords.includes(w)).length;
          const similarity = matchCount / textWords.length;
          if (similarity > 0.6) {
            console.log('[Redi Decision] Rejecting similar insight - too repetitive');
            return null;
          }
        }
      }
    }

    return {
      insight: text,
      confidence: Math.min(1, Math.max(0, confidence))
    };
  } catch (error) {
    console.error('[Redi Decision] Error generating insight:', error);
    return null;
  }
}

/**
 * Generate a response to a direct question (PROMPTED response)
 * Allows up to 30 words since user asked for input
 */
export async function generateQuestionResponse(
  mode: RediMode,
  question: string,
  transcriptBuffer: string[],
  visualContext: string
): Promise<string> {
  const modeConfig = MODE_CONFIGS[mode];
  const context = transcriptBuffer.slice(-5).join('\n');

  // PROMPTED responses - direct answers, NO questions back, NO filler
  const systemPrompt = `You are Redi. Answer the user's question directly.

ABSOLUTE RULES:
- MAX 25 words. Direct and concise.
- NEVER ask a question back. NO question marks allowed.
- NEVER say "How can I help" or "What would you like" - just answer.
- NEVER introduce yourself unless specifically asked "who are you"
- NEVER say "I don't see" or "there's no" - describe what IS visible instead.
- Use contractions naturally (that's, it's, you're).
- If asked about something you can't identify, describe what you CAN see.

FORBIDDEN PHRASES (will be rejected):
- "How can I help you"
- "What would you like"
- "What can I help"
- "I'm here to help"
- "Let me know if"
- "I don't see"
- "no visual input"
- "no image"
- Any question ending with "?"

Just answer. Be direct. Sound human.

Focus: ${modeConfig.systemPromptFocus}`;

  // Only include visual context if we have it - don't mention absence
  const visualLine = visualContext ? `\nVisual: ${visualContext}` : '';

  const userPrompt = `Context: ${context || '(none)'}${visualLine}
User said: ${question}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0];
    let text = content.type === 'text' ? content.text.trim() : "Not sure about that.";

    // ENFORCE: Remove ANY questions - strict no-questions policy
    if (text.includes('?')) {
      // Remove sentences containing ? and rebuild
      const sentences = text.split(/(?<=[.!?])\s*/);
      const cleaned = sentences.filter(s => !s.includes('?'));
      if (cleaned.length > 0) {
        text = cleaned.join(' ').trim();
      } else {
        console.log(`[Redi Decision] REJECTED prompted response - all questions: "${text}"`);
        text = "Got it.";  // Safe fallback
      }
    }

    // ENFORCE: Remove forbidden help-offer phrases (expanded list)
    const helpPhrases = /how can i help|what would you like|what can i help|i'm here to help|let me know if|what do you need|ready to help|whenever you need|here for you|need any help|need help with|what's up|what is up|what can i do for you|anything else|anything you need/gi;
    if (helpPhrases.test(text)) {
      console.log(`[Redi Decision] REJECTED prompted response - help phrase: "${text}"`);
      // Natural fallbacks instead of robotic "Got it"
      const fallbacks = ["I'm here.", "Listening.", "I hear you.", "Ready."];
      text = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // ENFORCE: Remove "I don't see" and similar visual negation phrases
    const visualNegation = /i don't see|i can't see|there's no|there is no|no visual|no image|not visible|can't find|cannot see/gi;
    if (visualNegation.test(text)) {
      console.log(`[Redi Decision] REJECTED prompted response - visual negation: "${text}"`);
      text = "Let me describe what I can see.";  // Redirect rather than negate
    }

    // ENFORCE: Remove intro phrases that sound robotic
    const introPhrases = /^(yep,?\s*|yeah,?\s*|hey,?\s*|hi,?\s*|hello,?\s*)/i;
    text = text.replace(introPhrases, '').trim();
    if (!text) text = "Got it.";

    // ENFORCE 25-word max for prompted responses
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 25) {
      console.log(`[Redi Decision] Truncating prompted response from ${words.length} to 25 words`);
      text = words.slice(0, 25).join(' ');
      const lastPeriod = text.lastIndexOf('.');
      if (lastPeriod > text.length * 0.5) {
        text = text.substring(0, lastPeriod + 1);
      }
    }

    return text;
  } catch (error) {
    console.error('[Redi Decision] Error generating question response:', error);
    return "Couldn't catch that.";
  }
}

/**
 * Create initial context for a new session
 */
export function createInitialContext(sessionId: string, mode: RediMode, sensitivity: number): DecisionContext {
  const now = Date.now();
  return {
    sessionId,
    sensitivity,
    lastSpokeAt: now,
    silenceDuration: 0,
    transcriptBuffer: [],
    visualContext: '',
    pendingInsight: null,
    insightConfidence: 0,
    mode,
    recentResponses: [],
    transcriptCountAtLastSpoke: 0,
    visualContextAtLastSpoke: '',
    isSpeaking: false,
    // Context freshness
    lastTranscriptAt: now,
    lastVisualAt: now,
    // Interruption handling
    ignoreResponsesUntil: 0
  };
}

/**
 * Update context with new transcript
 */
export function updateTranscript(ctx: DecisionContext, text: string): void {
  ctx.transcriptBuffer.push(text);
  // Keep last 20 entries
  if (ctx.transcriptBuffer.length > 20) {
    ctx.transcriptBuffer.shift();
  }
  ctx.silenceDuration = 0;
  ctx.lastTranscriptAt = Date.now(); // Track freshness
}

/**
 * Update context with silence duration
 */
export function updateSilence(ctx: DecisionContext, durationMs: number): void {
  ctx.silenceDuration = durationMs;
}

/**
 * Update context with visual analysis
 */
export function updateVisualContext(ctx: DecisionContext, analysis: string): void {
  ctx.visualContext = analysis;
  ctx.lastVisualAt = Date.now(); // Track freshness
}

/**
 * Update context with pending insight
 */
export function updatePendingInsight(ctx: DecisionContext, insight: string | null, confidence: number): void {
  ctx.pendingInsight = insight;
  ctx.insightConfidence = confidence;
}

/**
 * Mark that Redi is about to speak (acquire lock)
 */
export function markSpeakingStart(ctx: DecisionContext): boolean {
  if (ctx.isSpeaking) {
    return false; // Already speaking, don't interrupt
  }
  ctx.isSpeaking = true;
  ctx.pendingInsight = null; // Clear immediately to prevent re-trigger
  ctx.insightConfidence = 0;
  return true;
}

/**
 * Mark that Redi finished speaking (release lock)
 */
export function markSpoke(ctx: DecisionContext, spokenText?: string): void {
  ctx.lastSpokeAt = Date.now();
  ctx.transcriptCountAtLastSpoke = ctx.transcriptBuffer.length;
  ctx.visualContextAtLastSpoke = ctx.visualContext; // Track visual context too

  // Track recent responses to avoid repetition (keep last 5)
  if (spokenText) {
    ctx.recentResponses.push(spokenText);
    if (ctx.recentResponses.length > 5) {
      ctx.recentResponses.shift();
    }
  }

  ctx.pendingInsight = null;
  ctx.insightConfidence = 0;
  ctx.isSpeaking = false; // Release lock
}

/**
 * Handle user interruption - cancel pending responses
 * Call this when user starts speaking while Redi is speaking or processing
 */
export function onUserInterruption(ctx: DecisionContext): void {
  // Ignore any responses that arrive in the next 500ms
  ctx.ignoreResponsesUntil = Date.now() + 500;
  // Clear pending insight
  ctx.pendingInsight = null;
  ctx.insightConfidence = 0;
  // Reset speaking state
  ctx.isSpeaking = false;
  console.log(`[Redi Decision] User interrupted - ignoring responses until ${ctx.ignoreResponsesUntil}`);
}

/**
 * Check if we should ignore a response (user interrupted)
 */
export function shouldIgnoreResponse(ctx: DecisionContext): boolean {
  return Date.now() < ctx.ignoreResponsesUntil;
}
