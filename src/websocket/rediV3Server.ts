/**
 * Redi V3 Server - OpenAI Realtime API Integration
 *
 * WebSocket endpoint that bridges iOS client to OpenAI Realtime API.
 * Path: /ws/redi-v3
 *
 * This provides ~500ms voice-to-voice latency using OpenAI's native
 * speech recognition, reasoning, and voice synthesis.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { randomUUID } from 'crypto';

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
  // Response guards (military-grade)
  lastResponses: string[];
  lastResponseTime: number;
}

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
    /I can see (that )?(you|it)/i,
    /I notice (that )?(you|it)/i,
  ],
  maxWords: 12,  // Hard limit
  minResponseGapMs: 1500,  // Minimum 1.5s between responses
  similarityThreshold: 0.6,  // Reject if 60% similar to recent response
};

// Response quality checks
function checkResponseQuality(text: string, session: V3Session): { pass: boolean; reason?: string } {
  // 1. Banned patterns check
  for (const pattern of RESPONSE_GUARDS.bannedPatterns) {
    if (pattern.test(text)) {
      return { pass: false, reason: `Banned pattern: ${pattern}` };
    }
  }

  // 2. Length check
  const wordCount = text.split(/\s+/).length;
  if (wordCount > RESPONSE_GUARDS.maxWords) {
    return { pass: false, reason: `Too long: ${wordCount} words (max ${RESPONSE_GUARDS.maxWords})` };
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

export function initRediV3(server: HTTPServer): void {
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
      lastResponses: [],
      lastResponseTime: 0
    };

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
      voice: 'verse',  // Deep, distinctive male voice
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
  return `You are Redi. You can see through the user's camera.

SPEAK LIKE A COACH - confident, minimal, direct. Deep authoritative tone.

RULES:
- MAX 8 WORDS per response. Seriously, count them.
- ONE sentence only. Then STOP.
- NEVER say "exactly", "got it", "sure", "great", "happy to help"
- NEVER list multiple things. Pick ONE observation.
- When describing what you see: name it, done. "Keyboard." "Coffee mug." "Q-tips box."

VOICE STYLE:
- Speak slowly, deliberately
- Lower register, grounded
- No excitement, no filler
- Like a wise mentor, not a chatbot

GOOD: "Keyboard. Mechanical, looks like." (5 words)
GOOD: "That's a water bottle." (4 words)
GOOD: "Can't tell from here." (4 words)

BAD: "I can see you have a keyboard there, and it looks like..." (TOO LONG)
BAD: "Sure! That's a great question..." (FILLER)`;
}

function handleClientMessage(session: V3Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // Forward audio to OpenAI
      if (message.data) {
        sendToOpenAI(session, {
          type: 'input_audio_buffer.append',
          audio: message.data
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
        // Inject current frame as visual context before response is generated
        injectVisualContext(session);
        break;

      // === RESPONSE LIFECYCLE ===
      case 'response.created':
        session.responseStartedAt = Date.now();
        const waitTime = session.speechStoppedAt > 0
          ? session.responseStartedAt - session.speechStoppedAt
          : 0;
        console.log(`[Redi V3] ⏱️ Response started (wait: ${waitTime}ms)`);
        break;

      case 'response.done':
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
  if (frameAge > 3000) {
    console.log(`[Redi V3] Frame too old (${frameAge}ms), skipping visual context`);
    return;
  }

  const frameSize = session.currentFrame.length;
  console.log(`[Redi V3] Sending frame directly to Realtime API - size: ${frameSize} bytes, age: ${frameAge}ms`);

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
    const confidenceThreshold = 0.95 - (session.sensitivity * 0.35);

    if (analysis.shouldSpeak && analysis.confidence > confidenceThreshold) {
      console.log(`[Redi V3] Interjecting: "${analysis.message}"`);
      speakProactively(session, analysis.message);
      session.lastInterjectionTime = Date.now();
    }
  } catch (error) {
    console.error(`[Redi V3] Interjection error:`, error);
  }
}

async function analyzeFrameForInterjection(session: V3Session): Promise<{
  shouldSpeak: boolean;
  confidence: number;
  message: string;
}> {
  // Note: OpenAI Realtime API image support is limited
  // For now, skip image analysis to avoid API errors
  // TODO: Implement proper image analysis when API supports it better

  // Return default - no interjection
  return { shouldSpeak: false, confidence: 0, message: '' };
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
