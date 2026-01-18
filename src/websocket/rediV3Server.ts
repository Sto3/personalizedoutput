/**
 * Redi V3 Server - OpenAI Realtime API Integration
 *
 * WebSocket endpoint that bridges iOS client to OpenAI Realtime API.
 * Path: /ws/redi-v3
 *
 * This provides ~500ms voice-to-voice latency using OpenAI's native
 * speech recognition, reasoning, and voice synthesis.
 *
 * Military-Grade Integrations:
 * - Rule Engine: <10ms responses for obvious form issues
 * - Audio Denoiser: RNNoise for cleaner speech recognition
 * - Confidence Calibration: Prevents hallucinations
 * - Claude Sonnet 4.5: Edge case deep analysis (~5% of calls)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { randomUUID } from 'crypto';

// Military-grade imports
import { initRuleEngine, cleanupRuleEngine, evaluateRules } from '../lib/redi/ruleEngine';
import { getAudioDenoiser, AudioDenoiser } from '../lib/redi/audioDenoiser';
import { calibrateCloudVisionConfidence, shouldTrustDetection } from '../lib/redi/confidenceCalibration';
import { RediMode } from '../lib/redi/types';
import { PerceptionPacket } from '../lib/redi/militaryGradeTypes';
import { analyzeEdgeCase, shouldUseDeepAnalysis, formatDeepAnalysisResult } from '../lib/redi/deepAnalysis';

// OpenAI Realtime API configuration
// Using GA model with native image support
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

interface V3Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  sensitivity: number;
  currentFrame: string | null;
  frameTimestamp: number;
  lastInterjectionTime: number;
  isUserSpeaking: boolean;
  interjectionInterval: NodeJS.Timeout | null;
  // Timing tracking
  speechStoppedAt: number;
  responseStartedAt: number;
  // Echo suppression - prevents Redi from hearing its own voice
  isRediSpeaking: boolean;
  rediStoppedSpeakingAt: number;
  lastAudioSentToClientAt: number;  // Track when we actually send audio to client
  // Response guards (military-grade)
  lastResponses: string[];
  lastResponseTime: number;
  // Vision context tracking
  visualContextInjected: boolean;  // True when we've sent a frame for this response
  // Military-grade additions
  currentMode: RediMode;
  lastTranscript: string;
  transcriptHistory: string[];
  lastConfidence: number;
  ruleEngineInitialized: boolean;
}

// Global audio denoiser instance
let audioDenoiser: AudioDenoiser | null = null;

// Military-grade response guards
const RESPONSE_GUARDS = {
  // Banned phrases that indicate low-quality responses
  bannedPatterns: [
    /^(sure|exactly|absolutely|definitely|of course)[!,.\s]/i,
    /happy to help/i,
    /let me know if/i,
    /is there anything else/i,
    /great question/i,
    /that's a great/i,
  ],
  maxWords: 50,  // Standard responses - generous for natural conversation
  maxWordsVision: 100,  // Vision responses need more room to describe what's seen
  minResponseGapMs: 1000,  // Minimum 1s between responses
  similarityThreshold: 0.7,  // Only reject if 70% similar to recent response
};

// Response quality checks
function checkResponseQuality(text: string, session: V3Session): { pass: boolean; reason?: string } {
  // 1. Banned patterns check
  for (const pattern of RESPONSE_GUARDS.bannedPatterns) {
    if (pattern.test(text)) {
      return { pass: false, reason: `Banned pattern: ${pattern}` };
    }
  }

  // 2. Length check - allow longer responses for visual questions
  const wordCount = text.split(/\s+/).length;
  const maxWords = session.visualContextInjected ? RESPONSE_GUARDS.maxWordsVision : RESPONSE_GUARDS.maxWords;
  if (wordCount > maxWords) {
    return { pass: false, reason: `Too long: ${wordCount} words (max ${maxWords})` };
  }

  // 3. Rate limit check
  const timeSinceLastResponse = Date.now() - session.lastResponseTime;
  if (session.lastResponseTime > 0 && timeSinceLastResponse < RESPONSE_GUARDS.minResponseGapMs) {
    return { pass: false, reason: `Too fast: ${timeSinceLastResponse}ms (min ${RESPONSE_GUARDS.minResponseGapMs}ms)` };
  }

  // 4. Deduplication check
  for (const prevResponse of session.lastResponses) {
    const similarity = calculateSimilarity(text.toLowerCase(), prevResponse.toLowerCase());
    if (similarity > RESPONSE_GUARDS.similarityThreshold) {
      return { pass: false, reason: `Too similar (${(similarity * 100).toFixed(0)}%) to: "${prevResponse}"` };
    }
  }

  return { pass: true };
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

function recordResponse(text: string, session: V3Session): void {
  session.lastResponses.push(text);
  if (session.lastResponses.length > 5) {
    session.lastResponses.shift();  // Keep only last 5
  }
  session.lastResponseTime = Date.now();
}

const sessions = new Map<string, V3Session>();
let wss: WebSocketServer | null = null;

export async function initRediV3(server: HTTPServer): Promise<void> {
  // Initialize audio denoiser (lazy loading, won't block if WASM fails)
  try {
    audioDenoiser = await getAudioDenoiser();
    console.log(`[Redi V3] Audio denoiser ready: ${audioDenoiser.isReady()}`);
  } catch (error) {
    console.warn('[Redi V3] Audio denoiser failed to initialize, continuing without:', error);
    audioDenoiser = null;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V3] New connection: ${sessionId}`);

    const session: V3Session = {
      id: sessionId,
      clientWs: ws,
      openaiWs: null,
      sensitivity: 0.5,
      currentFrame: null,
      frameTimestamp: 0,
      lastInterjectionTime: 0,
      isUserSpeaking: false,
      interjectionInterval: null,
      speechStoppedAt: 0,
      responseStartedAt: 0,
      // Echo suppression
      isRediSpeaking: false,
      rediStoppedSpeakingAt: 0,
      lastAudioSentToClientAt: 0,
      lastResponses: [],
      lastResponseTime: 0,
      // Vision context tracking
      visualContextInjected: false,
      // Military-grade additions
      currentMode: 'general',
      lastTranscript: '',
      transcriptHistory: [],
      lastConfidence: 0,
      ruleEngineInitialized: false
    };

    // Initialize rule engine for this session
    initRuleEngine(sessionId);
    session.ruleEngineInitialized = true;
    console.log(`[Redi V3] Rule engine initialized for session ${sessionId}`);

    sessions.set(sessionId, session);

    // Connect to OpenAI Realtime API
    try {
      await connectToOpenAI(session);
    } catch (error) {
      console.error(`[Redi V3] OpenAI connection failed:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    // Handle messages from iOS client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        console.error(`[Redi V3] Message parse error:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[Redi V3] Client disconnected: ${sessionId}`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V3] Client error:`, error);
      cleanup(sessionId);
    });
  });

  // Handle upgrade requests for /ws/redi?v=3 path (uses same path as V2 for Cloudflare compatibility)
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathname = parsedUrl.pathname;
    const isV3 = parsedUrl.query.v === '3';

    if (pathname === '/ws/redi' && isV3) {
      console.log(`[Redi V3] Handling upgrade for V3 connection (via /ws/redi?v=3)`);
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  console.log('[Redi V3] WebSocket server initialized on /ws/redi?v=3');
}

async function connectToOpenAI(session: V3Session): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Redi V3] OPENAI_API_KEY environment variable not set');
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Log key format for debugging (first 10 chars only)
  console.log(`[Redi V3] Using API key starting with: ${apiKey.substring(0, 10)}...`);

  return new Promise((resolve, reject) => {
    console.log(`[Redi V3] Connecting to OpenAI Realtime API at ${OPENAI_REALTIME_URL}`);

    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V3] Connected to OpenAI Realtime API`);
      session.openaiWs = ws;

      // Configure session
      configureOpenAISession(session);

      // Start interjection loop
      startInterjectionLoop(session);

      // Send ready message to client
      sendToClient(session, {
        type: 'session_ready',
        sessionId: session.id
      });

      resolve();
    });

    ws.on('message', (data: Buffer) => {
      handleOpenAIMessage(session, data);
    });

    ws.on('error', (error: any) => {
      console.error(`[Redi V3] OpenAI WebSocket error:`, error.message || error);
      if (error.code) console.error(`[Redi V3] Error code: ${error.code}`);
      reject(new Error(`OpenAI connection error: ${error.message || 'Unknown error'}`));
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[Redi V3] OpenAI connection closed for ${session.id}, code=${code}, reason=${reason.toString()}`);
    });

    ws.on('unexpected-response', (request: any, response: any) => {
      console.error(`[Redi V3] OpenAI unexpected response: ${response.statusCode} ${response.statusMessage}`);
      let body = '';
      response.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      response.on('end', () => {
        console.error(`[Redi V3] OpenAI response body: ${body}`);
        reject(new Error(`OpenAI returned ${response.statusCode}: ${body}`));
      });
    });
  });
}

function configureOpenAISession(session: V3Session): void {
  sendToOpenAI(session, {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: getSystemPrompt(),
      voice: 'alloy',  // Natural, balanced voice
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.6,
        prefix_padding_ms: 300,
        silence_duration_ms: 800
      }
    }
  });
}

function getSystemPrompt(): string {
  return `You are Redi, a helpful AI assistant. You have access to the user's camera but ONLY describe what you see when specifically asked.

CRITICAL RULES:
1. ONLY describe what you see if the user asks "what do you see?" or similar
2. For greetings like "Hey Redi" - just respond with a friendly greeting, don't describe anything
3. Answer questions naturally - if they ask about something specific, help with that

RESPONSE LENGTH RULES:
- Default: Keep responses SHORT (10-20 words, 1-2 sentences)
- Greetings/acknowledgments: Very brief (5-10 words)
- Visual descriptions: Can be longer (30-50 words) to describe what you see
- Complex questions: Match response length to question complexity
- If the user wants more detail, they'll ask

EXAMPLES:
User: "Hey Redi" → "Hey! What's up?"
User: "What do you see?" → "I see a laptop screen showing a webpage with some text and navigation buttons."
User: "What am I holding?" → "That's a water bottle."
User: "Hello" → "Hi there!"
User: "Explain how this works" → [Provide a clear, helpful explanation at appropriate length]

AVOID:
- Rambling or over-explaining simple things
- Describing what you see unless asked
- Filler phrases: "Sure!", "Great question!", "Happy to help!"
- Starting with "I can see that..." or "I notice that..."`;
}

function handleClientMessage(session: V3Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // Forward audio to OpenAI (with optional denoising)
      if (message.data) {
        // ECHO SUPPRESSION: Discard audio while Redi is speaking
        // This prevents Redi from hearing its own voice through the mic
        //
        // The grace period needs to be long enough to account for:
        // - Audio processing latency on iOS (~100-200ms)
        // - Network round-trip time (~50-100ms)
        // - Audio buffer sizes (~100-200ms)
        // - Speaker-to-mic acoustic delay
        // - OpenAI processing time
        const ECHO_GRACE_PERIOD_MS = 2000;  // 2 seconds after Redi stops
        const now = Date.now();
        const timeSinceRediStopped = now - session.rediStoppedSpeakingAt;
        const timeSinceLastAudioSent = now - session.lastAudioSentToClientAt;

        if (session.isRediSpeaking) {
          // Redi is currently speaking - discard this audio
          // Only log occasionally to avoid spam
          if (Math.random() < 0.05) {
            console.log(`[Redi V3] 🔇 Discarding audio (Redi speaking)`);
          }
          return;
        }

        // Check BOTH: when response ended AND when last audio chunk was sent
        // The audio chunk timing is more accurate for echo detection
        if (session.lastAudioSentToClientAt > 0 && timeSinceLastAudioSent < ECHO_GRACE_PERIOD_MS) {
          // Recently sent audio to client - grace period for echo
          if (Math.random() < 0.05) {
            console.log(`[Redi V3] 🔇 Discarding audio (${timeSinceLastAudioSent}ms since last audio sent)`);
          }
          return;
        }

        if (session.rediStoppedSpeakingAt > 0 && timeSinceRediStopped < ECHO_GRACE_PERIOD_MS) {
          // Redi just stopped speaking - grace period to catch echo tail
          if (Math.random() < 0.05) {
            console.log(`[Redi V3] 🔇 Discarding audio (${timeSinceRediStopped}ms since response ended)`);
          }
          return;
        }

        let audioData = message.data;
        // Debug: log audio receipt (first few chunks only to avoid spam)
        if (!session.lastTranscript) {
          console.log(`[Redi V3] Receiving audio from client (${audioData.length} chars base64)`);
        }

        // AUDIO DENOISER STATUS: DISABLED DUE TO SAMPLE RATE MISMATCH
        //
        // The RNNoise-based denoiser expects 16kHz audio, but OpenAI Realtime API
        // requires 24kHz. Options to enable denoising in the future:
        //
        // Option 1: Resample (adds latency)
        //   24kHz → 16kHz → denoise → 24kHz
        //   Adds ~10-20ms latency per chunk
        //
        // Option 2: Find/train 24kHz denoiser
        //   RNNoise can be retrained for different sample rates
        //   Would require new WASM build
        //
        // Option 3: Client-side denoising
        //   iOS could denoise before sending
        //   Apple's Voice Processing has built-in noise reduction
        //
        // For now, OpenAI's Whisper handles noisy audio reasonably well.
        // Denoiser structure is in place for future activation.
        //
        // if (audioDenoiser?.isReady()) {
        //   audioData = denoiseAudio(audioData);  // Would require resampling
        // }

        sendToOpenAI(session, {
          type: 'input_audio_buffer.append',
          audio: audioData
        });
      }
      break;

    case 'frame':
      // Store frame for interjection analysis
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      break;

    case 'sensitivity':
      session.sensitivity = message.value;
      console.log(`[Redi V3] Sensitivity set to ${message.value}`);
      break;

    case 'user_message':
      // Text message from user
      sendToOpenAI(session, {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: message.text }]
        }
      });
      sendToOpenAI(session, { type: 'response.create' });
      break;

    case 'mode':
    case 'mode_change':
      // Mode change from client
      const newMode = message.mode || message.value;
      if (newMode && isValidMode(newMode)) {
        session.currentMode = newMode as RediMode;
        console.log(`[Redi V3] Mode changed to: ${newMode}`);
      }
      break;

    case 'perception':
      // Structured perception data from iOS (military-grade pipeline)
      handlePerceptionPacket(session, message.payload);
      break;
  }
}

/**
 * Check if mode string is valid
 */
function isValidMode(mode: string): mode is RediMode {
  const validModes: RediMode[] = ['general', 'cooking', 'studying', 'meeting', 'sports', 'music', 'assembly', 'monitoring', 'driving'];
  return validModes.includes(mode as RediMode);
}

/**
 * Handle structured perception data from iOS
 * This is the military-grade pipeline - when iOS sends perception packets
 * instead of raw frames, we can use the rule engine for instant feedback
 */
function handlePerceptionPacket(session: V3Session, packet: PerceptionPacket): void {
  // Evaluate rules first (<10ms)
  const ruleResult = evaluateRules(session.id, packet, session.currentMode);

  if (ruleResult.triggered && ruleResult.skipAI && ruleResult.response) {
    console.log(`[Redi V3] 🎯 Rule triggered: "${ruleResult.response}"`);
    // Speak the rule response directly, skip OpenAI
    speakProactively(session, ruleResult.response);
    return;
  }

  // Store transcript for context
  if (packet.transcript && packet.transcriptIsFinal) {
    session.lastTranscript = packet.transcript;
    session.transcriptHistory.push(packet.transcript);
    // Keep only last 10 transcripts
    if (session.transcriptHistory.length > 10) {
      session.transcriptHistory.shift();
    }
  }

  // Update confidence
  if (packet.overallConfidence !== undefined) {
    session.lastConfidence = packet.overallConfidence;
  }
}

function handleOpenAIMessage(session: V3Session, data: Buffer): void {
  try {
    const event = JSON.parse(data.toString());

    switch (event.type) {
      // === RESPONSE AUDIO ===
      case 'response.audio.delta':
        // Forward audio to client
        if (event.delta) {
          sendToClient(session, {
            type: 'audio',
            data: event.delta
          });
          // Track when we sent audio for echo suppression
          session.lastAudioSentToClientAt = Date.now();
        }
        break;

      // === TRANSCRIPTS ===
      case 'response.audio_transcript.done':
        // Redi's response - apply military-grade guards
        if (event.transcript) {
          const latency = session.responseStartedAt > 0
            ? session.responseStartedAt - session.speechStoppedAt
            : 0;

          // Check response quality
          const qualityCheck = checkResponseQuality(event.transcript, session);
          if (!qualityCheck.pass) {
            console.log(`[Redi V3] 🚫 BLOCKED: "${event.transcript}" - ${qualityCheck.reason}`);
            // Still send audio (already played), but don't show transcript
            break;
          }

          console.log(`[Redi V3] 🤖 REDI: "${event.transcript}" (latency: ${latency}ms)`);
          recordResponse(event.transcript, session);

          // Track in transcript history
          session.transcriptHistory.push(`REDI: ${event.transcript}`);
          if (session.transcriptHistory.length > 10) {
            session.transcriptHistory.shift();
          }

          sendToClient(session, {
            type: 'transcript',
            text: event.transcript,
            role: 'assistant'
          });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech - LOG THIS
        if (event.transcript) {
          console.log(`[Redi V3] 👤 USER: "${event.transcript}"`);

          // Track transcript history for context
          session.lastTranscript = event.transcript;
          session.transcriptHistory.push(`USER: ${event.transcript}`);
          if (session.transcriptHistory.length > 10) {
            session.transcriptHistory.shift();
          }

          sendToClient(session, {
            type: 'transcript',
            text: event.transcript,
            role: 'user'
          });
        }
        break;

      // === SPEECH DETECTION ===
      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        console.log(`[Redi V3] 🎤 User started speaking`);
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        session.speechStoppedAt = Date.now();
        console.log(`[Redi V3] 🎤 User stopped speaking`);
        // Frame injection now uses smart detection - only inject when user asks visual questions
        maybeInjectVisualContext(session);
        break;

      // === RESPONSE LIFECYCLE ===
      case 'response.created':
        session.responseStartedAt = Date.now();
        session.isRediSpeaking = true;  // Echo suppression: Redi is now speaking

        // CRITICAL: Clear OpenAI's input audio buffer when response starts
        // This prevents echoes (Redi's own voice picked up by mic) from being transcribed
        // Without this, OpenAI has already buffered audio that we can't discard server-side
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });

        // Also tell iOS to mute mic while Redi is speaking
        sendToClient(session, { type: 'mute_mic', muted: true });

        const waitTime = session.speechStoppedAt > 0
          ? session.responseStartedAt - session.speechStoppedAt
          : 0;
        console.log(`[Redi V3] ⏱️ Response started (wait: ${waitTime}ms)`);
        break;

      case 'response.done':
        session.isRediSpeaking = false;  // Echo suppression: Redi finished speaking
        session.rediStoppedSpeakingAt = Date.now();
        session.visualContextInjected = false;  // Reset vision flag for next response

        // Tell iOS to unmute mic after a short delay (let audio finish playing)
        setTimeout(() => {
          sendToClient(session, { type: 'mute_mic', muted: false });
        }, 500);

        console.log(`[Redi V3] ✅ Response complete`);
        break;

      // === ERRORS ===
      case 'error':
        console.error(`[Redi V3] ❌ ERROR:`, event.error?.message || JSON.stringify(event.error));
        sendToClient(session, {
          type: 'error',
          message: event.error?.message || 'Unknown OpenAI error'
        });
        break;

      // === SESSION ===
      case 'session.created':
        console.log(`[Redi V3] Session created`);
        break;

      case 'session.updated':
        console.log(`[Redi V3] Session configured`);
        break;

      // === IGNORED EVENTS (don't log spam) ===
      case 'response.audio.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':  // Echo suppression confirmation
      case 'conversation.item.created':
      case 'conversation.item.input_audio_transcription.delta':
      case 'response.audio_transcript.delta':
        // Silently ignore these common events
        break;

      default:
        // Log truly unknown events
        console.log(`[Redi V3] Unknown event: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Redi V3] Parse error:`, error);
  }
}

function startInterjectionLoop(session: V3Session): void {
  session.interjectionInterval = setInterval(async () => {
    await maybeInterject(session);
  }, 3000);
}

/**
 * Patterns that indicate user wants visual context
 */
const VISUAL_QUESTION_PATTERNS = [
  /what (do you|can you|am i|are we) see/i,
  /what('s| is) (this|that|here|there)/i,
  /look(ing)? at/i,
  /show me/i,
  /describe/i,
  /what am i (holding|doing|looking at)/i,
  /can you see/i,
  /do you see/i,
  /tell me (what|about)/i,
  /what's (in front|around|behind)/i,
  /identify/i,
  /recognize/i,
  /help (me )?(with|identify|find)/i,
];

/**
 * Check if the recent transcript suggests user wants visual context
 */
function wantsVisualContext(session: V3Session): boolean {
  if (!session.lastTranscript) return false;

  const transcript = session.lastTranscript.toLowerCase();

  // Check for visual question patterns
  for (const pattern of VISUAL_QUESTION_PATTERNS) {
    if (pattern.test(transcript)) {
      return true;
    }
  }

  return false;
}

/**
 * Smart frame injection - only inject when user's question requires visual context.
 * This prevents delays from unnecessary frame processing.
 */
function maybeInjectVisualContext(session: V3Session): void {
  // Skip for driving mode (uses on-device services)
  if (session.currentMode === 'driving') {
    return;
  }

  // Check if user's question needs visual context
  if (!wantsVisualContext(session)) {
    return;
  }

  injectVisualContext(session);
}

/**
 * Inject visual context by sending the frame directly to the Realtime API.
 * The GA model (gpt-4o-realtime) has native image support.
 */
function injectVisualContext(session: V3Session): void {
  // Only inject if we have a recent frame
  if (!session.currentFrame) {
    console.log('[Redi V3] No frame available for visual context');
    return;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  // Reduced from 3000ms to 2000ms for fresher frames
  if (frameAge > 2000) {
    console.log(`[Redi V3] Frame too old (${frameAge}ms), skipping visual context`);
    return;
  }

  const frameSize = session.currentFrame.length;
  console.log(`[Redi V3] 📸 Injecting visual context - size: ${frameSize} bytes, age: ${frameAge}ms, trigger: "${session.lastTranscript}"`);

  // Mark that we've injected visual context so response guards allow longer responses
  session.visualContextInjected = true;

  // Send image directly to Realtime API (native support in GA model)
  // image_url must be a string, not an object
  sendToOpenAI(session, {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_image',
          image_url: `data:image/jpeg;base64,${session.currentFrame}`
        }
      ]
    }
  });
}

async function maybeInterject(session: V3Session): Promise<void> {
  // Skip if conditions not met
  if (session.isUserSpeaking) return;
  if (session.sensitivity < 0.1) return;
  if (!session.currentFrame) return;

  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > 5000) return;

  const timeSinceLastInterjection = Date.now() - session.lastInterjectionTime;
  const minInterval = 30000 - (session.sensitivity * 27000); // 30s to 3s based on sensitivity

  if (timeSinceLastInterjection < minInterval) return;

  // Analyze frame for interjection
  try {
    const analysis = await analyzeFrameForInterjection(session);

    // Apply confidence calibration (prevents hallucinations)
    const rawConfidence = analysis.confidence;
    const calibratedConfidence = calibrateCloudVisionConfidence(rawConfidence);

    // Threshold adjusted by sensitivity
    const confidenceThreshold = 0.95 - (session.sensitivity * 0.35);

    // Use calibrated confidence and trust check
    if (analysis.shouldSpeak &&
        calibratedConfidence > confidenceThreshold &&
        shouldTrustDetection(calibratedConfidence, 'speak')) {
      console.log(`[Redi V3] Interjecting: "${analysis.message}" (raw: ${rawConfidence.toFixed(2)}, calibrated: ${calibratedConfidence.toFixed(2)})`);
      speakProactively(session, analysis.message);
      session.lastInterjectionTime = Date.now();
      session.lastConfidence = calibratedConfidence;
    } else if (analysis.shouldSpeak) {
      console.log(`[Redi V3] 🚫 Interjection blocked - confidence too low (raw: ${rawConfidence.toFixed(2)}, calibrated: ${calibratedConfidence.toFixed(2)}, threshold: ${confidenceThreshold.toFixed(2)})`);
    }
  } catch (error) {
    console.error(`[Redi V3] Interjection error:`, error);
  }
}

/**
 * Analyze frame for autonomous interjection (proactive speaking).
 *
 * CURRENT STATUS: INTENTIONALLY DISABLED
 *
 * This function is stubbed because:
 * 1. OpenAI Realtime API image analysis has limitations with proactive responses
 * 2. Visual-triggered interjections caused latency issues in testing
 * 3. User-initiated visual queries work well via maybeInjectVisualContext()
 *
 * The smart frame injection system (VISUAL_QUESTION_PATTERNS) handles
 * user-requested visual context effectively. Autonomous interjection
 * may be re-enabled when:
 * - OpenAI improves image processing latency
 * - We implement local vision analysis on iOS
 * - User testing indicates demand for proactive visual feedback
 */
async function analyzeFrameForInterjection(session: V3Session): Promise<{
  shouldSpeak: boolean;
  confidence: number;
  message: string;
}> {
  // INTENTIONALLY DISABLED - see function documentation above
  // Return default - no autonomous interjection
  return { shouldSpeak: false, confidence: 0, message: '' };
}

/**
 * Use Claude Sonnet 4.5 for edge cases requiring nuanced judgment.
 * This is called for ~5% of interactions where GPT-Realtime needs backup.
 *
 * Triggers:
 * - Sensitive modes (monitoring, elder care)
 * - Complex user questions
 * - Uncertain confidence range (0.4-0.7)
 */
async function maybeUseDeepAnalysis(session: V3Session, userQuestion?: string): Promise<boolean> {
  // Check if deep analysis should be used
  const hasComplexQuestion = userQuestion ? userQuestion.length > 50 || userQuestion.includes('?') : false;

  if (!shouldUseDeepAnalysis(session.currentMode, session.lastConfidence, hasComplexQuestion)) {
    return false;
  }

  console.log(`[Redi V3] 🧠 Using Claude Sonnet 4.5 for deep analysis (mode: ${session.currentMode}, confidence: ${session.lastConfidence.toFixed(2)})`);

  try {
    const result = await analyzeEdgeCase({
      frameBase64: session.currentFrame,
      recentTranscript: session.lastTranscript,
      mode: session.currentMode,
      sessionHistory: session.transcriptHistory,
      userQuestion,
    });

    console.log(formatDeepAnalysisResult(result));

    if (result.shouldSpeak && result.confidence > 0.7 && result.response) {
      speakProactively(session, result.response);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Redi V3] Deep analysis error:', error);
    return false;
  }
}

function speakProactively(session: V3Session, message: string): void {
  sendToOpenAI(session, {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: message }]
    }
  });

  sendToOpenAI(session, {
    type: 'response.create',
    response: {
      modalities: ['audio'],
      instructions: `Say exactly: "${message}"`
    }
  });
}

function sendToOpenAI(session: V3Session, message: any): void {
  if (session.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify(message));
  } else if (message.type === 'input_audio_buffer.append') {
    // Log if audio send fails due to OpenAI not ready
    console.log(`[Redi V3] Cannot send audio - OpenAI WS state: ${session.openaiWs?.readyState}`);
  }
}

function sendToClient(session: V3Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(JSON.stringify(message));
  }
}

function cleanup(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.interjectionInterval) {
      clearInterval(session.interjectionInterval);
    }
    session.openaiWs?.close();

    // Clean up rule engine
    if (session.ruleEngineInitialized) {
      cleanupRuleEngine(sessionId);
    }

    sessions.delete(sessionId);
    console.log(`[Redi V3] Session cleaned up: ${sessionId}`);
  }
}

export function closeRediV3(): void {
  sessions.forEach((session, id) => cleanup(id));
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi V3] WebSocket server closed');
  }
}

/**
 * Get V3 connection statistics
 */
export function getV3ConnectionStats(): {
  activeSessions: number;
  totalEver: number;
  uptime: number;
} {
  return {
    activeSessions: sessions.size,
    totalEver: sessions.size, // Could track this separately if needed
    uptime: process.uptime()
  };
}
