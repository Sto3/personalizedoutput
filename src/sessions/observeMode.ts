/**
 * Observation Mode — Lightweight Passive Pipeline
 * =================================================
 * Redi runs in the background, listening and/or watching,
 * only interjecting when it has something genuinely useful.
 *
 * This is the feature that makes Redi ambient intelligence.
 */

import { anthropicComplete } from '../providers/anthropicProvider';
import { LLMMessage } from '../providers/types';
import { sanitizeObserveContent } from '../auth/privacyMiddleware';

// =====================================================
// OBSERVATION MODE TYPES
// =====================================================

type ObserveType = 'audio_only' | 'screen_ocr' | 'screen_vision';

interface ObserveSession {
  id: string;
  userId: string;
  type: ObserveType;
  isActive: boolean;
  startedAt: Date;

  // Buffered context — Redi accumulates before deciding to speak
  transcriptBuffer: string[];       // Rolling window of recent speech/audio
  screenContextBuffer: string[];    // Rolling window of OCR text or vision descriptions
  lastInterjectionAt: Date | null;  // When Redi last spoke up

  // Settings
  sensitivityLevel: 'low' | 'medium' | 'high';  // How often Redi interjects
  evaluationIntervalMs: number;   // How often to evaluate whether to speak
  memoryContext: string;           // User's memory for personalized interjections
  voiceId: string;

  // Cost tracking
  audioMinutes: number;
  visionFrames: number;
  interjectionCount: number;
}

// Sensitivity controls how often Redi evaluates and how high the bar is to speak
const SENSITIVITY_CONFIG = {
  low: {
    evaluationIntervalMs: 60000,   // Evaluate every 60 seconds
    bufferSize: 20,                // Keep last 20 transcript chunks
    threshold: 'very_useful',      // Only speak if VERY useful
    cooldownMs: 300000,            // Wait 5 min between interjections
  },
  medium: {
    evaluationIntervalMs: 30000,   // Every 30 seconds
    bufferSize: 15,
    threshold: 'useful',
    cooldownMs: 120000,            // 2 min cooldown
  },
  high: {
    evaluationIntervalMs: 15000,   // Every 15 seconds
    bufferSize: 10,
    threshold: 'somewhat_useful',
    cooldownMs: 60000,             // 1 min cooldown
  },
};

// =====================================================
// INTERJECTION EVALUATION
// =====================================================

// This is the core intelligence — Redi decides whether to speak up.
// It runs periodically based on sensitivity level.
// The goal: ONLY interject when genuinely helpful. Never annoying.

const EVALUATION_PROMPT = `You are Redi, an AI assistant passively observing a user's activity. You are in OBSERVATION MODE — you are listening and/or watching, but you should ONLY speak up if you have something genuinely useful to contribute.

USER'S MEMORY (what you know about them):
{memoryContext}

RECENT AUDIO TRANSCRIPT (what they've been saying/hearing):
{transcriptBuffer}

RECENT SCREEN CONTEXT (what's on their screen, if available):
{screenContext}

SENSITIVITY LEVEL: {sensitivity}
- low: Only speak for critical/time-sensitive things (errors, reminders, safety)
- medium: Speak for useful suggestions, relevant info, spotted opportunities
- high: Speak for anything that might help, even small observations

DECISION: Should you interject right now? Consider:
1. Is there something you can DO for them right now? (Not just comment — offer action)
2. Is this time-sensitive? Would waiting make the info less useful?
3. Have you already mentioned something similar recently?
4. Would this interruption be WELCOME or annoying given what they're doing?
5. Can you reference something from their memory to make this more personal?

Examples of GOOD interjections:
- They're on a flight booking page and you know from memory they have a meeting that week: "Heads up — you have the Johnson meeting on Thursday. That flight lands at 3pm, cutting it close."
- They're coding and you see an error they haven't noticed: "Quick note — there's a null reference on line 47 that'll throw at runtime."
- They mentioned needing groceries and you hear them wrapping up work: "Before you head out — want me to pull up your grocery list?"
- You hear them struggling to remember a name in conversation: "I think you're thinking of Sarah Chen — she was at the Q3 review."
- They've been working for 3 hours straight: "You've been going strong for a while. Quick stretch break?"

Examples of BAD interjections (do NOT do these):
- Narrating what they're doing: "I see you're writing an email."
- Trivial observations: "That's an interesting article."
- Things that can wait: Non-urgent suggestions during focused work
- Repeating something you already said

RESPOND WITH EXACTLY ONE OF:
1. SILENT — if you have nothing useful to add right now
2. INTERJECT: [your message] — if you have something genuinely helpful

Keep interjections SHORT (1-2 sentences for voice). Be specific. Offer actions when possible.`;

async function evaluateInterjection(session: ObserveSession): Promise<string | null> {
  const config = SENSITIVITY_CONFIG[session.sensitivityLevel];

  // Check cooldown
  if (session.lastInterjectionAt) {
    const timeSinceLastMs = Date.now() - session.lastInterjectionAt.getTime();
    if (timeSinceLastMs < config.cooldownMs) return null;
  }

  // Don't evaluate if buffer is empty
  if (session.transcriptBuffer.length === 0 && session.screenContextBuffer.length === 0) {
    return null;
  }

  // Sanitize buffers — strip PII (passwords, API keys, SSNs, etc.) before sending to LLM
  const sanitizedTranscript = session.transcriptBuffer
    .slice(-config.bufferSize)
    .map(t => sanitizeObserveContent(t));
  const sanitizedScreen = session.screenContextBuffer
    .slice(-5)
    .map(s => sanitizeObserveContent(s));

  // Build prompt with sanitized content
  const prompt = EVALUATION_PROMPT
    .replace('{memoryContext}', session.memoryContext || '(no memory loaded)')
    .replace('{transcriptBuffer}', sanitizedTranscript.join('\n') || '(silence)')
    .replace('{screenContext}', sanitizedScreen.join('\n') || '(no screen data)')
    .replace('{sensitivity}', session.sensitivityLevel);

  try {
    const messages: LLMMessage[] = [
      { role: 'user', content: prompt },
    ];

    const response = await anthropicComplete({
      messages,
      max_tokens: 256,
      model: 'claude-haiku-4-5-20251001',
    });

    const text = response.text.trim();

    if (text.startsWith('SILENT')) {
      return null;
    }

    if (text.startsWith('INTERJECT:')) {
      const message = text.replace('INTERJECT:', '').trim();
      session.lastInterjectionAt = new Date();
      session.interjectionCount++;
      console.log(`[Observe ${session.id}] Interjecting: "${message.substring(0, 50)}..."`);
      return message;
    }

    return null;
  } catch (error) {
    console.error(`[Observe ${session.id}] Evaluation error:`, error);
    return null;
  }
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================

const activeSessions = new Map<string, ObserveSession>();
const evaluationTimers = new Map<string, NodeJS.Timeout>();

export function createObserveSession(config: {
  userId: string;
  type: ObserveType;
  sensitivity?: 'low' | 'medium' | 'high';
  memoryContext?: string;
  voiceId?: string;
}): ObserveSession {
  const sessionId = `obs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const session: ObserveSession = {
    id: sessionId,
    userId: config.userId,
    type: config.type,
    isActive: true,
    startedAt: new Date(),
    transcriptBuffer: [],
    screenContextBuffer: [],
    lastInterjectionAt: null,
    sensitivityLevel: config.sensitivity || 'medium',
    evaluationIntervalMs: SENSITIVITY_CONFIG[config.sensitivity || 'medium'].evaluationIntervalMs,
    memoryContext: config.memoryContext || '',
    voiceId: config.voiceId || '',
    audioMinutes: 0,
    visionFrames: 0,
    interjectionCount: 0,
  };

  activeSessions.set(sessionId, session);
  return session;
}

export function startEvaluationLoop(
  session: ObserveSession,
  onInterject: (text: string) => void
): void {
  const timer = setInterval(async () => {
    if (!session.isActive) {
      clearInterval(timer);
      return;
    }

    const interjection = await evaluateInterjection(session);
    if (interjection) {
      onInterject(interjection);
    }
  }, session.evaluationIntervalMs);

  evaluationTimers.set(session.id, timer);
}

export function feedAudioTranscript(sessionId: string, text: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.transcriptBuffer.push(`[${new Date().toLocaleTimeString()}] ${text}`);

  // Keep buffer bounded
  const maxBuffer = SENSITIVITY_CONFIG[session.sensitivityLevel].bufferSize * 2;
  if (session.transcriptBuffer.length > maxBuffer) {
    session.transcriptBuffer = session.transcriptBuffer.slice(-maxBuffer);
  }
}

export function feedScreenContext(sessionId: string, context: string, isOCR: boolean): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const prefix = isOCR ? '[Screen Text]' : '[Screen Visual]';
  session.screenContextBuffer.push(`${prefix} ${context}`);

  if (isOCR) {
    session.visionFrames++;  // Track for billing even though OCR is free — the processing isn't
  }

  // Keep buffer bounded
  if (session.screenContextBuffer.length > 10) {
    session.screenContextBuffer = session.screenContextBuffer.slice(-10);
  }
}

export function endObserveSession(sessionId: string): ObserveSession | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  session.isActive = false;

  const timer = evaluationTimers.get(sessionId);
  if (timer) clearInterval(timer);
  evaluationTimers.delete(sessionId);

  activeSessions.delete(sessionId);

  console.log(`[Observe ${sessionId}] Session ended. Duration: ${Math.round((Date.now() - session.startedAt.getTime()) / 60000)}min, Interjections: ${session.interjectionCount}`);

  return session;
}

export function getObserveSession(sessionId: string): ObserveSession | undefined {
  return activeSessions.get(sessionId);
}

// =====================================================
// COST RATES FOR OBSERVATION MODES
// =====================================================

export const OBSERVE_COST_RATES: Record<string, number> = {
  // Credits per minute
  audio_only: 0.1,      // ~$0.006/min — Deepgram STT only, occasional Haiku eval
  screen_ocr: 0.15,     // ~$0.009/min — Deepgram STT + on-device OCR + text to Haiku
  screen_vision: 0.4,   // ~$0.025/min — Deepgram STT + vision frames to LLM

  // For comparison: active voice session = 0.4 cr/min, active vision = 1.0 cr/min
};
