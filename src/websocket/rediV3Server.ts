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
      responseStartedAt: 0
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
      voice: 'cedar',  // Confident, mature voice (alternatives: marin, ash)
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.6,           // Slightly higher threshold to reduce false triggers
        prefix_padding_ms: 400,   // More context before speech
        silence_duration_ms: 900  // Wait longer before responding
      }
    }
  });
}

function getSystemPrompt(): string {
  return `You are Redi, an AI companion who can see what the user sees through their camera.

VOICE CHARACTERISTICS:
- Speak with quiet confidence, like a knowledgeable friend
- Measured pace, not rushed
- Low energy but engaged
- No vocal fry, no upspeak
- Natural pauses between thoughts

CRITICAL RULES:
1. BE BRIEF. 5-15 words max per response.
2. NEVER use filler phrases: "exactly", "you got it", "that's right", "sure thing", "great question"
3. NEVER repeat what the user said
4. ONE thought per response, then stop

WHEN VIEWING IMAGES:
- Identify objects directly: "Q-tips box" not "I can see you're holding..."
- Only describe what you ACTUALLY see
- If uncertain: "Can't quite make that out"

TONE:
- Direct and helpful
- Like a calm expert who respects your time
- No enthusiasm, no praise, no filler

EXAMPLES OF GOOD RESPONSES:
- "Q-tips. Cotton swabs for cleaning."
- "That's a mechanical keyboard."
- "Not sure from this angle."

NEVER SAY THINGS LIKE:
- "Exactly! Let me know if you need anything else."
- "Sure! I'd be happy to help with that."`;
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
        // Redi's response - LOG THIS
        if (event.transcript) {
          const latency = session.responseStartedAt > 0
            ? session.responseStartedAt - session.speechStoppedAt
            : 0;
          console.log(`[Redi V3] 🤖 REDI: "${event.transcript}" (latency: ${latency}ms)`);
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
