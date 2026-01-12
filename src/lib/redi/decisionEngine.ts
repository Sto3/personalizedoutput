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
  MODE_CONFIGS
} from './types';

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
  const minGap = mapRange(ctx.sensitivity, 0, 1, 30000, 5000); // 30s → 5s based on sensitivity
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
  sensitivity: number
): Promise<{ insight: string; confidence: number } | null> {
  const modeConfig = MODE_CONFIGS[mode];
  const recentTranscript = transcriptBuffer.slice(-10).join('\n');

  if (!recentTranscript && !visualContext) {
    return null;
  }

  const systemPrompt = `You are Redi, an AI presence that's always with the user. You're focused on ${modeConfig.systemPromptFocus}.

Your personality:
- Present but not intrusive
- Helpful without being overbearing
- Natural, conversational tone
- Concise (1-2 sentences max)

Current sensitivity level: ${sensitivity.toFixed(1)} (0=passive, 1=active)
At this sensitivity, you should ${sensitivity < 0.3 ? 'only speak when asked or when there\'s a clear error' : sensitivity < 0.7 ? 'offer helpful insights during natural pauses' : 'be more proactive with suggestions and observations'}.

Based on what you're hearing and seeing, determine if you have something valuable to contribute.
If you do, provide a BRIEF, natural response (1-2 sentences).
If not, respond with exactly: NO_INSIGHT

Important:
- Don't repeat what the user just said
- Don't ask questions unless clarification is truly needed
- Be specific, not generic
- Sound natural, like a knowledgeable friend`;

  const userPrompt = `What the user is saying:
${recentTranscript || '(silence)'}

What you see:
${visualContext || '(no visual context)'}

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
 * Generate a response to a direct question
 */
export async function generateQuestionResponse(
  mode: RediMode,
  question: string,
  transcriptBuffer: string[],
  visualContext: string
): Promise<string> {
  const modeConfig = MODE_CONFIGS[mode];
  const context = transcriptBuffer.slice(-5).join('\n');

  const systemPrompt = `You are Redi, an AI presence helping with ${modeConfig.systemPromptFocus}.

The user just asked you a direct question. Answer it helpfully and concisely.
Keep your response natural and conversational (2-4 sentences max).
If you can see something relevant in the visual context, reference it specifically.`;

  const userPrompt = `Recent context:
${context}

Visual context:
${visualContext || '(no visual)'}

User's question: ${question}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text.trim() : "I'm not sure about that.";
  } catch (error) {
    console.error('[Redi Decision] Error generating question response:', error);
    return "Sorry, I had trouble processing that. Could you ask again?";
  }
}

/**
 * Create initial context for a new session
 */
export function createInitialContext(sessionId: string, mode: RediMode, sensitivity: number): DecisionContext {
  return {
    sessionId,
    sensitivity,
    lastSpokeAt: Date.now(),
    silenceDuration: 0,
    transcriptBuffer: [],
    visualContext: '',
    pendingInsight: null,
    insightConfidence: 0,
    mode
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
}

/**
 * Update context with pending insight
 */
export function updatePendingInsight(ctx: DecisionContext, insight: string | null, confidence: number): void {
  ctx.pendingInsight = insight;
  ctx.insightConfidence = confidence;
}

/**
 * Mark that Redi just spoke
 */
export function markSpoke(ctx: DecisionContext): void {
  ctx.lastSpokeAt = Date.now();
  ctx.pendingInsight = null;
  ctx.insightConfidence = 0;
}
