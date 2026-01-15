/**
 * Redi Clean Implementation - V2
 *
 * RULES FOR THIS FILE:
 * 1. NO imports from ../lib/redi/* - NONE. EVER.
 * 2. ONE state store (sessions Map)
 * 3. ONE decision point (shouldSpeak function)
 * 4. ONE vision path (analyzeFrame function)
 * 5. Keep it simple
 *
 * If you need to add something, ask: "Does this NEED to be here?"
 * If not, don't add it.
 */

import { WebSocket } from 'ws';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

// =============================================================================
// CONFIGURATION - All settings in one place
// =============================================================================

const CONFIG = {
  // Rate limiting
  minGapBetweenUnpromptedMs: 30000,  // 30 seconds between unprompted responses

  // Models
  visionModel: 'claude-3-5-haiku-20241022' as const,
  responseModel: 'claude-3-5-haiku-20241022' as const,

  // ElevenLabs
  elevenLabsVoiceId: process.env.ELEVENLABS_REDI_FEMALE_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',  // Bella
  elevenLabsModel: 'eleven_multilingual_v2',

  // Response limits
  maxResponseWords: 15,
};

// =============================================================================
// TYPES - Minimal, clear types
// =============================================================================

interface Session {
  id: string;
  ws: WebSocket;
  deviceId: string;
  lastSpokeAt: number;
  isSpeaking: boolean;
  visualContext: string;
  visualContextTimestamp: number;
}

// =============================================================================
// STATE - ONE Map. That's it.
// =============================================================================

const sessions = new Map<string, Session>();
const anthropic = new Anthropic();

// =============================================================================
// MAIN HANDLER - Entry point for connections
// =============================================================================

export function handleConnection(ws: WebSocket, sessionId: string, deviceId: string): void {
  console.log(`[Redi V2] handleConnection called for ${sessionId}`);

  try {
    // Initialize session immediately
    sessions.set(sessionId, {
      id: sessionId,
      ws,
      deviceId,
      lastSpokeAt: 0,
      isSpeaking: false,
      visualContext: '',
      visualContextTimestamp: 0,
    });

    console.log(`[Redi V2] Session started: ${sessionId}`);

    // Send session_start confirmation to iOS
    const startMessage = JSON.stringify({
      type: 'session_start',
      sessionId,
      timestamp: Date.now(),
      payload: {
        remainingSeconds: 900  // 15 minutes
      }
    });
    console.log(`[Redi V2] Sending session_start to iOS`);
    ws.send(startMessage);
    console.log(`[Redi V2] session_start sent successfully`);

    // Simple greeting after 1 second
    setTimeout(() => {
      console.log(`[Redi V2] Sending greeting...`);
      speak(sessionId, "I'm ready.");
    }, 1000);
  } catch (error) {
    console.error(`[Redi V2] Error in handleConnection:`, error);
  }

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Log all incoming messages (except ping which is noisy)
      if (message.type !== 'ping') {
        console.log(`[Redi V2] Received message type: ${message.type}`);
      }

      if (message.type === 'perception') {
        await handlePerception(sessionId, message);
        return;
      }

      if (message.type === 'session_end') {
        cleanup(sessionId);
        return;
      }

      // Ignore ping/pong and other messages silently
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

    } catch (error) {
      console.error('[Redi V2] Error handling message:', error);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[Redi V2] WebSocket closed for ${sessionId}: code=${code}, reason=${reason || 'none'}`);
    cleanup(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`[Redi V2] WebSocket error for ${sessionId}:`, error);
  });
}

function cleanup(sessionId: string): void {
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    console.log(`[Redi V2] Session cleaned up: ${sessionId}`);
  }
}

// =============================================================================
// PERCEPTION HANDLER - Process incoming perception data
// =============================================================================

async function handlePerception(sessionId: string, message: any): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  const payload = message.payload || {};
  const transcript = payload.transcript;
  const transcriptIsFinal = payload.transcriptIsFinal;
  const frame = payload.fallbackFrame || payload.frame;  // iOS sends as fallbackFrame

  // Log perception details
  console.log(`[Redi V2] Perception: transcript="${transcript || 'none'}", hasFrame=${!!frame}, isFinal=${transcriptIsFinal}`);

  // Step 1: Update vision if we have a frame (but don't block on it)
  if (frame) {
    // Run vision in background - don't wait
    analyzeFrame(frame).then(vision => {
      if (vision) {
        session.visualContext = vision;
        session.visualContextTimestamp = Date.now();
        console.log(`[Redi V2] Vision: "${vision}"`);
      }
    }).catch(err => console.error('[Redi V2] Vision error:', err));
  }

  // Step 2: Is this a user question? (prompted)
  const isPrompted = !!(transcript && transcriptIsFinal && transcript.trim().length > 0);

  if (isPrompted) {
    console.log(`[Redi V2] User said: "${transcript}"`);

    // User asked something - respond (bypass rate limit)
    const response = await generateResponse(session, transcript, true);
    if (response) {
      await speak(sessionId, response);
    }
    return;
  }

  // Step 3: Unprompted - should we say something?
  if (!shouldSpeak(session)) {
    return; // Stay silent
  }

  // Step 4: Generate unprompted observation
  const response = await generateResponse(session, '', false);
  if (response) {
    await speak(sessionId, response);
  }
}

// =============================================================================
// DECISION - ONE place that decides if we should speak
// =============================================================================

function shouldSpeak(session: Session): boolean {
  // Already speaking?
  if (session.isSpeaking) {
    return false;
  }

  // Rate limit for unprompted
  const timeSinceLastSpoke = Date.now() - session.lastSpokeAt;
  if (timeSinceLastSpoke < CONFIG.minGapBetweenUnpromptedMs) {
    return false;
  }

  // Do we have something to talk about?
  const hasVision = session.visualContext.length > 0;
  const visionFresh = (Date.now() - session.visualContextTimestamp) < 10000;

  if (!hasVision || !visionFresh) {
    return false;
  }

  return true;
}

// =============================================================================
// VISION - ONE function to analyze frames
// =============================================================================

async function analyzeFrame(frameBase64: string): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: CONFIG.visionModel,
      max_tokens: 50,
      system: `Describe what you see in 5-15 words. English only.
Rules:
- Just describe, never say "I see"
- Read any visible text/labels exactly
- If nothing notable: respond "NOTHING"
- Never ask questions
- Never offer help`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 } },
          { type: 'text', text: 'What is the main thing visible?' }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    if (!text || text === 'NOTHING' || text.toLowerCase().includes('nothing')) {
      return null;
    }

    // Reject AI-speak
    if (/i see|i can|ready|help|assist|appears to/i.test(text)) {
      return null;
    }

    return text;
  } catch (error) {
    console.error('[Redi V2] Vision error:', error);
    return null;
  }
}

// =============================================================================
// RESPONSE GENERATION - ONE function to generate responses
// =============================================================================

async function generateResponse(
  session: Session,
  userQuestion: string,
  isPrompted: boolean
): Promise<string | null> {
  try {
    const visualLine = session.visualContext ? `I see: ${session.visualContext}` : '';

    const prompt = isPrompted
      ? `${visualLine}\nUser asked: "${userQuestion}"\nAnswer in max 15 words. English only. Never ask questions back.`
      : `${visualLine}\nMake a brief observation (5-10 words). English only. Never ask questions. If nothing notable, say SILENT.`;

    const response = await anthropic.messages.create({
      model: CONFIG.responseModel,
      max_tokens: 60,
      system: `You are a confident observer. Brief, direct, no fluff.
Rules:
- English only
- Max 15 words
- Never ask questions (no "?" ever)
- Never say "I can help", "ready", "assist"
- Never explain yourself
- If nothing to say: respond "SILENT"`,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    // Reject empty, silent, or question responses
    if (!text || text === 'SILENT' || text.includes('?')) {
      return null;
    }

    // Reject AI-speak
    if (/i can help|ready to|assist|how can i|what would you/i.test(text)) {
      return null;
    }

    return text;
  } catch (error) {
    console.error('[Redi V2] Response error:', error);
    return null;
  }
}

// =============================================================================
// SPEAKING - ONE function to output speech (with ElevenLabs TTS)
// =============================================================================

async function speak(sessionId: string, text: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Mark as speaking
  session.isSpeaking = true;

  try {
    console.log(`[Redi V2] Speaking: "${text}"`);

    // Generate audio with ElevenLabs
    const audioBuffer = await generateSpeech(text);

    if (audioBuffer) {
      // Send audio to client
      session.ws.send(JSON.stringify({
        type: 'voice_audio',
        sessionId,
        timestamp: Date.now(),
        payload: {
          audio: audioBuffer.toString('base64'),
          format: 'mp3',
          isStreaming: false,
          isFinal: true
        }
      }));
    }

    // Also send text for display
    session.ws.send(JSON.stringify({
      type: 'ai_response',
      sessionId,
      timestamp: Date.now(),
      payload: {
        text,
        source: 'haiku',
        isStreaming: false,
        isFinal: true
      }
    }));

    session.lastSpokeAt = Date.now();
  } catch (error) {
    console.error('[Redi V2] Speak error:', error);
  } finally {
    session.isSpeaking = false;
  }
}

// =============================================================================
// ELEVENLABS TTS - Simple, direct implementation
// =============================================================================

async function generateSpeech(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('[Redi V2] ELEVENLABS_API_KEY not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.elevenLabsVoiceId}`,
      {
        text,
        model_id: CONFIG.elevenLabsModel,
        voice_settings: {
          stability: 0.25,           // Low = warm, natural flow
          similarity_boost: 0.50,    // Low = human imperfection
          style: 0.50,               // High = expressive
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer',
        timeout: 10000  // 10 second timeout
      }
    );

    console.log(`[Redi V2] TTS generated: ${text.length} chars`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error('[Redi V2] ElevenLabs error:', error);
    return null;
  }
}

// =============================================================================
// EXPORTS - Only what's needed
// =============================================================================

export default { handleConnection };
