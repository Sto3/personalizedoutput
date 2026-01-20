/**
 * Redi V5 Server - OpenAI Realtime API Integration
 * ================================================
 * 
 * CLEAN REWRITE - No legacy contamination
 * 
 * Changes from V3:
 * 1. AUDIO FORMAT FIX: Use string 'pcm16' instead of object format
 * 2. Explicit 24kHz sample rate handling
 * 3. Better audio debugging
 * 4. Vision injection WORKING (maintained from V3)
 * 5. DRIVING MODE FIX: Vision enabled + safety-first prompts + no hallucinations
 * 
 * Path: /ws/redi?v=5
 * 
 * ROUTING: V5 handles routing for V5, V6, and V7 connections
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { randomUUID } from 'crypto';

// Military-grade imports
import { initRuleEngine, cleanupRuleEngine, evaluateRules } from '../lib/redi/ruleEngine';
import { calibrateCloudVisionConfidence, shouldTrustDetection } from '../lib/redi/confidenceCalibration';
import { RediMode } from '../lib/redi/types';
import { PerceptionPacket } from '../lib/redi/militaryGradeTypes';
import { analyzeEdgeCase, shouldUseDeepAnalysis, formatDeepAnalysisResult } from '../lib/redi/deepAnalysis';

// V6 upgrade handler - for routing V6 connections
import { handleV6Upgrade } from './rediV6Server';

// V7 upgrade handler - for routing V7 connections (PRODUCTION GRADE)
import { handleV7Upgrade } from './rediV7Server';

// =============================================================================
// CONFIGURATION
// =============================================================================

// OpenAI Realtime API - GA model with native image support
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

// Audio Configuration - MUST match iOS V5Config
const AUDIO_CONFIG = {
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
  format: 'pcm16'
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface V5Session {
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
  
  // Echo suppression
  isRediSpeaking: boolean;
  rediStoppedSpeakingAt: number;
  lastAudioSentToClientAt: number;
  
  // Response guards
  lastResponses: string[];
  lastResponseTime: number;
  
  // Vision context tracking
  visualContextInjected: boolean;
  hasRecentVisual: boolean;
  pendingVisualQuestion: boolean;
  currentResponseId: string | null;
  
  // Mode & transcript
  currentMode: RediMode;
  lastTranscript: string;
  transcriptHistory: string[];
  lastConfidence: number;
  ruleEngineInitialized: boolean;
  
  // Audio debugging
  audioChunksReceived: number;
  audioChunksSent: number;
  lastAudioDebugLog: number;
}

// =============================================================================
// RESPONSE GUARDS - MODE SPECIFIC
// =============================================================================

const RESPONSE_GUARDS = {
  bannedPatterns: [
    /^(exactly|absolutely|definitely|of course)[!,.\s]/i,
    /happy to help/i,
    /let me know if/i,
    /is there anything else/i,
    /great question/i,
    /that's a great/i,
  ],
  // Standard modes
  maxWords: 50,
  maxWordsVision: 100,
  // DRIVING MODE: Ultra-short for safety
  maxWordsDriving: 15,        // Driver can't process long responses
  maxWordsDrivingVision: 25,  // Still brief even with vision
  minResponseGapMs: 1000,
  similarityThreshold: 0.7,
};

// Vision hallucination patterns - EXTRA STRICT FOR DRIVING
const VISION_CLAIM_PATTERNS = [
  /i (can |)see /i,
  /i('m| am) (looking at|seeing|viewing)/i,
  /looks like/i,
  /appears to be/i,
  /there('s| is) a /i,
  /i (can |)spot /i,
  /in (the |this )?(image|picture|photo|frame|view|screen)/i,
  /what i('m| am) seeing/i,
  /from what i (can |)see/i,
  /visible/i,
  /i notice /i,
];

// DRIVING-SPECIFIC: Patterns that indicate dangerous hallucination
const DRIVING_HALLUCINATION_PATTERNS = [
  /turn (left|right) (at|on|onto)/i,      // Fake directions
  /take the (next|first|second)/i,         // Fake navigation
  /in (\d+) (miles?|feet|meters?|yards?)/i, // Fake distances
  /continue (for|straight)/i,              // Fake routing
  /merge (onto|into)/i,                    // Fake lane guidance
  /exit (at|onto|number)/i,                // Fake exit instructions
  /your destination is/i,                  // Fake arrival
  /arriving (at|in)/i,                     // Fake ETA
  /recalculating/i,                        // Pretending to be GPS
  /route (updated|changed|found)/i,        // Fake routing
  /(\d+) minutes? (away|remaining)/i,      // Fake time estimates
  /speed limit is/i,                       // Unless actually visible
];

// Visual question patterns
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

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, V5Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function checkResponseQuality(text: string, session: V5Session): { pass: boolean; reason?: string } {
  const isDriving = session.currentMode === 'driving';
  
  // DRIVING MODE: Extra strict hallucination blocking
  if (isDriving) {
    for (const pattern of DRIVING_HALLUCINATION_PATTERNS) {
      if (pattern.test(text)) {
        return { pass: false, reason: `DRIVING SAFETY: Blocked navigation hallucination - "${pattern}"` };
      }
    }
  }
  
  // Anti-hallucination: Block vision claims without image
  if (!session.visualContextInjected) {
    for (const pattern of VISION_CLAIM_PATTERNS) {
      if (pattern.test(text)) {
        return { pass: false, reason: `HALLUCINATION BLOCKED: Vision claim without image` };
      }
    }
  }

  // Banned patterns
  for (const pattern of RESPONSE_GUARDS.bannedPatterns) {
    if (pattern.test(text)) {
      return { pass: false, reason: `Banned pattern: ${pattern}` };
    }
  }

  // Length check - MODE SPECIFIC
  const wordCount = text.split(/\s+/).length;
  let maxWords: number;
  
  if (isDriving) {
    maxWords = session.visualContextInjected 
      ? RESPONSE_GUARDS.maxWordsDrivingVision 
      : RESPONSE_GUARDS.maxWordsDriving;
  } else {
    maxWords = session.visualContextInjected 
      ? RESPONSE_GUARDS.maxWordsVision 
      : RESPONSE_GUARDS.maxWords;
  }
  
  if (wordCount > maxWords) {
    return { pass: false, reason: `Too long: ${wordCount} words (max ${maxWords} for ${isDriving ? 'driving' : 'standard'} mode)` };
  }

  // Rate limit
  const timeSinceLastResponse = Date.now() - session.lastResponseTime;
  if (session.lastResponseTime > 0 && timeSinceLastResponse < RESPONSE_GUARDS.minResponseGapMs) {
    return { pass: false, reason: `Too fast: ${timeSinceLastResponse}ms` };
  }

  // Deduplication
  for (const prevResponse of session.lastResponses) {
    const similarity = calculateSimilarity(text.toLowerCase(), prevResponse.toLowerCase());
    if (similarity > RESPONSE_GUARDS.similarityThreshold) {
      return { pass: false, reason: `Too similar (${(similarity * 100).toFixed(0)}%)` };
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

function recordResponse(text: string, session: V5Session): void {
  session.lastResponses.push(text);
  if (session.lastResponses.length > 5) {
    session.lastResponses.shift();
  }
  session.lastResponseTime = Date.now();
}

function wantsVisualContext(session: V5Session): boolean {
  if (!session.lastTranscript) return false;
  const transcript = session.lastTranscript.toLowerCase();
  for (const pattern of VISUAL_QUESTION_PATTERNS) {
    if (pattern.test(transcript)) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// SYSTEM PROMPTS - MODE SPECIFIC
// =============================================================================

function getSystemPrompt(mode: RediMode = 'general'): string {
  // DRIVING MODE: Special safety-focused prompt
  if (mode === 'driving') {
    return getDrivingSystemPrompt();
  }
  
  // Standard prompt for all other modes
  return getGeneralSystemPrompt();
}

function getGeneralSystemPrompt(): string {
  return `Speak with energy and enthusiasm! Be upbeat, encouraging, and pump people up.

You are Redi - a confident, no-nonsense AI assistant with a masculine, straightforward personality.

LANGUAGE: ALWAYS respond in English. Never use any other language regardless of what language the user speaks.

YOUR PERSONALITY:
- Direct and efficient - get to the point
- Confident but not arrogant - you know your stuff
- Calm under pressure - never flustered
- Speak like a knowledgeable friend, not a customer service bot
- Use natural, casual language - "Yeah", "Got it", "Here's the deal"
- NEVER use flowery or overly polite language

WHEN INTERRUPTED BY USER:
- Immediately yield with a brief phrase: "Go ahead", "You first", "I'm listening"
- Don't finish your thought - let them speak

CRITICAL VISUAL RULES:
1. You can ONLY describe what you see if an image was JUST provided in this conversation turn
2. If NO image was provided, say something like: "Can't see anything right now - what are you looking at?"
3. NEVER guess or assume what's on screen
4. NEVER claim to see something unless you have an actual image

RESPONSE LENGTH:
- Keep it SHORT - 10-20 words max for most responses
- Greetings: Very brief - "Hey", "What's up", "Yo"
- Visual descriptions: Can be longer (30-50 words) when you have an actual image

EXAMPLES:
User: "Hey Redi" → "Hey. What do you need?"
User: "What do you see?" (with image) → "I see a laptop screen with..."
User: "What do you see?" (no image) → "Can't see anything right now. What are you looking at?"
User: "Hello" → "Hey."
User: "Can you help me?" → "Yeah, what's up?"

AVOID:
- Filler phrases: "Sure!", "Absolutely!", "Great question!", "Happy to help!"
- Over-explaining or rambling
- Sounding like a customer service bot
- Being overly polite or deferential`;
}

function getDrivingSystemPrompt(): string {
  return `You are Redi in DRIVING MODE. The user is operating a vehicle. SAFETY IS PARAMOUNT.

CRITICAL RULES - VIOLATIONS ARE DANGEROUS:

1. NEVER GIVE NAVIGATION DIRECTIONS
   - You are NOT a GPS. You do NOT know where the user is going.
   - NEVER say "turn left", "turn right", "take the exit", "in 500 feet", etc.
   - If asked for directions, say: "I can't give directions. Use your GPS app."
   - If asked "which way", say: "Check your navigation. I can't guide you."

2. ULTRA-SHORT RESPONSES ONLY
   - Driver cannot process long sentences while driving
   - Maximum 10-15 words per response
   - No explanations, just key info

3. ONLY DESCRIBE WHAT YOU ACTUALLY SEE
   - If an image is provided, describe ONLY what's visible
   - Focus on: road conditions, weather, obstacles, signs you can read
   - If you see a sign, read it exactly - don't interpret it
   - If no image: "Can't see the road right now"

4. NEVER HALLUCINATE OR GUESS
   - If you don't know something, say "I don't know"
   - Never make up distances, times, or directions
   - Never pretend to know traffic conditions you can't see
   - Never estimate arrival times

5. SAFETY ALERTS ONLY WHEN CERTAIN
   - Only alert about things you can actually see in the image
   - "I see brake lights ahead" (if visible) ✓
   - "There might be traffic" (guessing) ✗

VALID RESPONSES:
- "I can't give directions. Use your GPS."
- "I don't have navigation. What else can I help with?"
- "Can't see the road right now."
- "I see [exactly what's in the image]."
- "Check your maps app for that."
- "I don't know that. Focus on driving."

LANGUAGE: English only. Brief. No filler words.

REMEMBER: A wrong direction could cause an accident. When in doubt, say you don't know.`;
}

// =============================================================================
// MAIN INITIALIZATION
// =============================================================================

export async function initRediV5(server: HTTPServer): Promise<void> {
  console.log('[Redi V5] ========================================');
  console.log('[Redi V5] Starting Redi V5 Server');
  console.log('[Redi V5] Audio Config:', AUDIO_CONFIG);
  console.log('[Redi V5] Driving Mode: ENABLED with safety guards');
  console.log('[Redi V5] Routing: V5, V6, V7');
  console.log('[Redi V5] ========================================');

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V5] New connection: ${sessionId}`);

    const session: V5Session = {
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
      isRediSpeaking: false,
      rediStoppedSpeakingAt: 0,
      lastAudioSentToClientAt: 0,
      lastResponses: [],
      lastResponseTime: 0,
      visualContextInjected: false,
      hasRecentVisual: false,
      pendingVisualQuestion: false,
      currentResponseId: null,
      currentMode: 'general',
      lastTranscript: '',
      transcriptHistory: [],
      lastConfidence: 0,
      ruleEngineInitialized: false,
      audioChunksReceived: 0,
      audioChunksSent: 0,
      lastAudioDebugLog: 0,
    };

    // Initialize rule engine
    initRuleEngine(sessionId);
    session.ruleEngineInitialized = true;
    console.log(`[Redi V5] Rule engine initialized for session ${sessionId}`);

    sessions.set(sessionId, session);

    // Connect to OpenAI
    try {
      await connectToOpenAI(session);
    } catch (error) {
      console.error(`[Redi V5] OpenAI connection failed:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    // Handle messages from iOS client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        console.error(`[Redi V5] Message parse error:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[Redi V5] Client disconnected: ${sessionId}`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V5] Client error:`, error);
      cleanup(sessionId);
    });
  });

  // Handle upgrade requests for /ws/redi?v=5, v=6, and v=7
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathname = parsedUrl.pathname;
    const version = parsedUrl.query.v;

    if (pathname === '/ws/redi') {
      if (version === '5') {
        console.log(`[Redi V5] Handling upgrade for V5 connection`);
        wss!.handleUpgrade(request, socket, head, (ws) => {
          wss!.emit('connection', ws, request);
        });
      } else if (version === '6') {
        // Route V6 connections to V6 server
        console.log(`[Redi V5] Routing to V6 server`);
        handleV6Upgrade(request, socket, head);
      } else if (version === '7') {
        // Route V7 connections to V7 server (PRODUCTION GRADE)
        console.log(`[Redi V5] Routing to V7 server (PRODUCTION GRADE)`);
        handleV7Upgrade(request, socket, head);
      }
    }
  });

  console.log('[Redi V5] WebSocket server initialized on /ws/redi?v=5');
  console.log('[Redi V5] Also routing: v=6 → V6, v=7 → V7');
}

// =============================================================================
// OPENAI CONNECTION
// =============================================================================

async function connectToOpenAI(session: V5Session): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log(`[Redi V5] API key: ${apiKey.substring(0, 10)}...`);

  return new Promise((resolve, reject) => {
    console.log(`[Redi V5] Connecting to: ${OPENAI_REALTIME_URL}`);

    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V5] ✅ Connected to OpenAI Realtime API`);
      session.openaiWs = ws;

      // Configure session with CORRECT format
      configureOpenAISession(session);

      // Start interjection loop
      startInterjectionLoop(session);

      // Notify client
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
      console.error(`[Redi V5] OpenAI error:`, error.message || error);
      reject(new Error(`OpenAI connection error: ${error.message || 'Unknown'}`));
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[Redi V5] OpenAI closed: code=${code}, reason=${reason.toString()}`);
    });

    ws.on('unexpected-response', (request: any, response: any) => {
      console.error(`[Redi V5] OpenAI unexpected: ${response.statusCode} ${response.statusMessage}`);
      let body = '';
      response.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      response.on('end', () => {
        console.error(`[Redi V5] Response body: ${body}`);
        reject(new Error(`OpenAI returned ${response.statusCode}: ${body}`));
      });
    });
  });
}

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

function configureOpenAISession(session: V5Session): void {
  const sessionConfig = {
    type: 'session.update',
    session: {
      type: 'realtime',
      modalities: ['text', 'audio'],
      instructions: getSystemPrompt(session.currentMode),
      voice: 'echo',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
        create_response: false
      }
    }
  };

  console.log('[Redi V5] 🔧 Configuring session:');
  console.log('[Redi V5]    - Mode:', session.currentMode);
  console.log('[Redi V5]    - input_audio_format: pcm16');
  console.log('[Redi V5]    - output_audio_format: pcm16');
  console.log('[Redi V5]    - voice: echo');
  
  sendToOpenAI(session, sessionConfig);
}

/**
 * Update OpenAI session when mode changes
 * This is critical for driving mode to get the safety-focused prompt
 */
function updateSessionForMode(session: V5Session): void {
  console.log(`[Redi V5] 🔄 Updating session for mode: ${session.currentMode}`);
  
  const sessionUpdate = {
    type: 'session.update',
    session: {
      instructions: getSystemPrompt(session.currentMode)
    }
  };
  
  sendToOpenAI(session, sessionUpdate);
  
  if (session.currentMode === 'driving') {
    console.log('[Redi V5] ⚠️ DRIVING MODE ACTIVE - Safety guards enabled');
  }
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: V5Session, message: any): void {
  switch (message.type) {
    case 'audio':
      handleAudioFromClient(session, message);
      break;

    case 'frame':
      console.log('[Redi V5] 📷 Frame received:', message.data?.length || 0, 'chars');
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      session.hasRecentVisual = true;
      console.log('[Redi V5] 📷 Frame stored, hasRecentVisual:', session.hasRecentVisual);

      if (session.pendingVisualQuestion) {
        console.log(`[Redi V5] 📷 Fresh frame for pending question`);
        injectVisualContext(session);
        sendToOpenAI(session, { type: 'response.create' });
        session.pendingVisualQuestion = false;
      }
      break;

    case 'sensitivity':
      session.sensitivity = Math.max(0, Math.min(1, message.value || 0.5));
      console.log(`[Redi V5] Sensitivity: ${session.sensitivity}`);
      break;

    case 'mode':
      if (message.mode && isValidMode(message.mode)) {
        const previousMode = session.currentMode;
        session.currentMode = message.mode;
        console.log(`[Redi V5] Mode changed: ${previousMode} → ${session.currentMode}`);
        
        // Update OpenAI session with new mode-specific prompt
        updateSessionForMode(session);
      }
      break;

    case 'perception':
      if (message.packet) {
        handlePerceptionPacket(session, message.packet);
      }
      break;

    default:
      console.log(`[Redi V5] Unknown message type: ${message.type}`);
  }
}

function handleAudioFromClient(session: V5Session, message: any): void {
  if (!message.data) return;

  session.audioChunksReceived++;

  // Echo suppression
  const ECHO_GRACE_PERIOD_MS = 2000;
  const now = Date.now();
  const timeSinceLastAudioSent = now - session.lastAudioSentToClientAt;
  const timeSinceRediStopped = now - session.rediStoppedSpeakingAt;

  if (session.isRediSpeaking) {
    if (Math.random() < 0.02) {
      console.log(`[Redi V5] 🔇 Audio discarded (Redi speaking)`);
    }
    return;
  }

  if (session.lastAudioSentToClientAt > 0 && timeSinceLastAudioSent < ECHO_GRACE_PERIOD_MS) {
    if (Math.random() < 0.02) {
      console.log(`[Redi V5] 🔇 Audio discarded (${timeSinceLastAudioSent}ms since output)`);
    }
    return;
  }

  if (session.rediStoppedSpeakingAt > 0 && timeSinceRediStopped < ECHO_GRACE_PERIOD_MS) {
    if (Math.random() < 0.02) {
      console.log(`[Redi V5] 🔇 Audio discarded (${timeSinceRediStopped}ms since response)`);
    }
    return;
  }

  // Debug audio stats periodically
  if (now - session.lastAudioDebugLog > 5000) {
    const audioBytes = Buffer.from(message.data, 'base64').length;
    console.log(`[Redi V5] 🎤 Audio stats: received=${session.audioChunksReceived}, sent=${session.audioChunksSent}, chunk=${audioBytes}B`);
    session.lastAudioDebugLog = now;
  }

  // Forward to OpenAI
  sendToOpenAI(session, {
    type: 'input_audio_buffer.append',
    audio: message.data
  });
}

function handlePerceptionPacket(session: V5Session, packet: PerceptionPacket): void {
  const ruleResult = evaluateRules(session.id, packet, session.currentMode);

  if (ruleResult.triggered && ruleResult.skipAI && ruleResult.response) {
    console.log(`[Redi V5] 🎯 Rule: "${ruleResult.response}"`);
    speakProactively(session, ruleResult.response);
    return;
  }

  if (packet.transcript && packet.transcriptIsFinal) {
    session.lastTranscript = packet.transcript;
    session.transcriptHistory.push(packet.transcript);
    if (session.transcriptHistory.length > 10) {
      session.transcriptHistory.shift();
    }
  }

  if (packet.overallConfidence !== undefined) {
    session.lastConfidence = packet.overallConfidence;
  }
}

function isValidMode(mode: string): mode is RediMode {
  return ['general', 'cooking', 'studying', 'meeting', 'sports', 'music', 'assembly', 'monitoring', 'driving'].includes(mode);
}

// =============================================================================
// OPENAI MESSAGE HANDLING
// =============================================================================

function handleOpenAIMessage(session: V5Session, data: Buffer): void {
  try {
    const event = JSON.parse(data.toString());

    switch (event.type) {
      // === AUDIO OUTPUT ===
      case 'response.audio.delta':
      case 'response.output_audio.delta':
        if (event.delta) {
          session.audioChunksSent++;
          sendToClient(session, {
            type: 'audio',
            data: event.delta
          });
          session.lastAudioSentToClientAt = Date.now();
        }
        break;

      // === TRANSCRIPTS ===
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        if (event.transcript) {
          const latency = session.responseStartedAt > 0
            ? session.responseStartedAt - session.speechStoppedAt
            : 0;

          const qualityCheck = checkResponseQuality(event.transcript, session);
          if (!qualityCheck.pass) {
            console.log(`[Redi V5] 🚫 BLOCKED: "${event.transcript}" - ${qualityCheck.reason}`);
            break;
          }

          console.log(`[Redi V5] 🤖 REDI: "${event.transcript}" (latency: ${latency}ms, mode: ${session.currentMode})`);
          recordResponse(event.transcript, session);

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
      case 'conversation.item.audio_transcription.completed':
        if (event.transcript) {
          console.log(`[Redi V5] 👤 USER: "${event.transcript}" (mode: ${session.currentMode})`);

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

          // Inject visual context (ALSO for driving mode now!)
          maybeInjectVisualContext(session);
          
          console.log(`[Redi V5] 📤 Triggering response (image: ${session.visualContextInjected ? 'YES' : 'NO'}, mode: ${session.currentMode})`);
          sendToOpenAI(session, { type: 'response.create' });
        }
        break;

      // === SPEECH DETECTION ===
      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        console.log(`[Redi V5] 🎤 User started speaking`);

        // Barge-in handling
        if (session.isRediSpeaking && session.currentResponseId) {
          console.log(`[Redi V5] 🛑 User interrupted - yielding`);
          sendToOpenAI(session, { type: 'response.cancel' });
          sendToClient(session, { type: 'stop_audio' });
          session.isRediSpeaking = false;
          session.currentResponseId = null;

          const yieldPhrases = ['Go ahead.', 'You first.', "I'm listening."];
          const yieldPhrase = yieldPhrases[Math.floor(Math.random() * yieldPhrases.length)];
          speakProactively(session, yieldPhrase);
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        session.speechStoppedAt = Date.now();
        console.log(`[Redi V5] 🎤 User stopped speaking`);
        break;

      // === RESPONSE LIFECYCLE ===
      case 'response.created':
        session.responseStartedAt = Date.now();
        session.isRediSpeaking = true;
        session.currentResponseId = event.response?.id || null;

        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        sendToClient(session, { type: 'mute_mic', muted: true });

        const waitTime = session.speechStoppedAt > 0
          ? session.responseStartedAt - session.speechStoppedAt
          : 0;
        console.log(`[Redi V5] ⏱️ Response started (wait: ${waitTime}ms)`);
        break;

      case 'response.done':
        session.isRediSpeaking = false;
        session.rediStoppedSpeakingAt = Date.now();
        session.visualContextInjected = false;
        session.currentResponseId = null;

        setTimeout(() => {
          sendToClient(session, { type: 'mute_mic', muted: false });
        }, 500);

        console.log(`[Redi V5] ✅ Response complete`);
        break;

      // === ERRORS ===
      case 'error':
        console.error(`[Redi V5] ❌ ERROR:`, event.error?.message || JSON.stringify(event.error));
        sendToClient(session, {
          type: 'error',
          message: event.error?.message || 'Unknown OpenAI error'
        });
        break;

      // === SESSION ===
      case 'session.created':
        console.log(`[Redi V5] Session created`);
        break;

      case 'session.updated':
        console.log(`[Redi V5] ✅ Session configured (mode: ${session.currentMode})`);
        break;

      // === CONVERSATION ===
      case 'conversation.item.created':
        const contentTypes = event.item?.content?.map((c: any) => c.type) || [];
        console.log(`[Redi V5] 📥 Item created: [${contentTypes.join(', ')}]`);
        if (contentTypes.includes('input_image')) {
          console.log(`[Redi V5] ✅ IMAGE ACCEPTED BY OPENAI`);
        }
        break;

      // === IGNORED ===
      case 'response.audio.done':
      case 'response.output_audio.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':
      case 'conversation.item.input_audio_transcription.delta':
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
      case 'conversation.item.added':
      case 'conversation.item.done':
        break;

      default:
        console.log(`[Redi V5] Unknown event: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Redi V5] Parse error:`, error);
  }
}

// =============================================================================
// VISION HANDLING - NOW WORKS FOR ALL MODES INCLUDING DRIVING
// =============================================================================

function maybeInjectVisualContext(session: V5Session): void {
  // REMOVED: Skip for driving mode - driving mode NOW gets vision too!
  // The driving prompt is strict about what to say based on vision

  if (!session.currentFrame) {
    console.log(`[Redi V5] ❌ No frame available`);
    return;
  }

  const frameAge = Date.now() - session.frameTimestamp;

  if (frameAge > 3000) {
    console.log(`[Redi V5] 📷 Frame is ${frameAge}ms old - requesting fresh`);
    sendToClient(session, { type: 'request_frame' });
  }

  console.log(`[Redi V5] 👁️ Injecting visual context (age: ${frameAge}ms, mode: ${session.currentMode})`);
  injectVisualContext(session);
}

function injectVisualContext(session: V5Session): void {
  if (!session.currentFrame) {
    console.log('[Redi V5] ❌ No frame for visual context');
    session.hasRecentVisual = false;
    return;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > 3000) {
    console.log(`[Redi V5] ❌ Frame too old (${frameAge}ms)`);
    session.hasRecentVisual = false;
    return;
  }

  const cleanBase64 = session.currentFrame.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi V5] 📸 Sending image: ${sizeKB}KB, age ${frameAge}ms, mode ${session.currentMode}`);

  session.visualContextInjected = true;
  session.hasRecentVisual = true;

  // Mode-specific image context text
  let contextText = '[Current camera view attached - describe what you see and respond to my question]';
  
  if (session.currentMode === 'driving') {
    contextText = '[Camera view while driving - ONLY describe what you can actually see. Do NOT give directions or navigation. If asked about directions, say you cannot provide navigation.]';
  }

  const imageItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: contextText
        },
        {
          type: 'input_image',
          image_url: `data:image/jpeg;base64,${cleanBase64}`
        }
      ]
    }
  };

  console.log(`[Redi V5] 🖼️ SENDING IMAGE TO OPENAI`);
  sendToOpenAI(session, imageItem);
}

// =============================================================================
// INTERJECTION LOOP
// =============================================================================

function startInterjectionLoop(session: V5Session): void {
  session.interjectionInterval = setInterval(async () => {
    await maybeInterject(session);
  }, 3000);
}

async function maybeInterject(session: V5Session): Promise<void> {
  // No proactive interjections in driving mode - too dangerous
  if (session.currentMode === 'driving') return;
  
  if (session.isUserSpeaking) return;
  if (session.sensitivity < 0.1) return;
  if (!session.currentFrame) return;

  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > 5000) return;

  const timeSinceLastInterjection = Date.now() - session.lastInterjectionTime;
  const minInterval = 30000 - (session.sensitivity * 27000);

  if (timeSinceLastInterjection < minInterval) return;

  // Interjection analysis disabled for now
}

// =============================================================================
// PROACTIVE SPEECH
// =============================================================================

function speakProactively(session: V5Session, message: string): void {
  sendToOpenAI(session, {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: message }]
    }
  });

  sendToOpenAI(session, { type: 'response.create' });
}

// =============================================================================
// WEBSOCKET HELPERS
// =============================================================================

function sendToOpenAI(session: V5Session, message: any): void {
  if (session.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify(message));
  }
}

function sendToClient(session: V5Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(JSON.stringify(message));
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

function cleanup(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.interjectionInterval) {
      clearInterval(session.interjectionInterval);
    }
    session.openaiWs?.close();

    if (session.ruleEngineInitialized) {
      cleanupRuleEngine(sessionId);
    }

    sessions.delete(sessionId);
    console.log(`[Redi V5] Session cleaned up: ${sessionId}`);
  }
}

export function closeRediV5(): void {
  sessions.forEach((session, id) => cleanup(id));
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi V5] Server closed');
  }
}

export function getV5ConnectionStats(): {
  activeSessions: number;
  totalEver: number;
  uptime: number;
} {
  return {
    activeSessions: sessions.size,
    totalEver: sessions.size,
    uptime: process.uptime()
  };
}
