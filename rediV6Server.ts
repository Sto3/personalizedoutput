/**
 * Redi V6 Server - COMPLETE CLEAN IMPLEMENTATION
 * ==============================================
 * 
 * Fresh start. Correct OpenAI Realtime API format.
 * Voice + Vision working properly.
 * 
 * Endpoint: /ws/redi?v=6
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { randomUUID } from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Use the correct model endpoint
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

// =============================================================================
// TYPES
// =============================================================================

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  currentFrame: string | null;
  frameTimestamp: number;
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  lastTranscript: string;
  imageWasInjected: boolean;
}

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, a helpful AI assistant with real-time voice and vision capabilities.

VISION CAPABILITY:
- You can see images when they are sent to you in the conversation.
- When you receive an image, describe what you ACTUALLY see in detail.
- Focus on: people, objects, text, colors, actions, environment.
- For sports: describe positions, movements, form, technique.
- Be specific and accurate - the user is relying on your vision.

WHEN NO IMAGE PROVIDED:
- If asked "what do you see?" but no image was sent, say: "I don't have a camera view right now."
- Never guess or make up what might be visible.

RESPONSE STYLE:
- Concise and direct (under 50 words usually)
- Casual, friendly tone
- No filler phrases like "Great question!" 
- Speak like a helpful coach or friend

LANGUAGE:
- Always respond in English.`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV6(server: HTTPServer): Promise<void> {
  console.log('[Redi V6] ========================================');
  console.log('[Redi V6] Starting V6 Server');
  console.log('[Redi V6] Model: gpt-4o-realtime-preview-2024-12-17');
  console.log('[Redi V6] ========================================');

  if (!OPENAI_API_KEY) {
    console.error('[Redi V6] ❌ OPENAI_API_KEY not set!');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V6] New connection: ${sessionId}`);

    const session: Session = {
      id: sessionId,
      clientWs: ws,
      openaiWs: null,
      currentFrame: null,
      frameTimestamp: 0,
      isUserSpeaking: false,
      isAssistantSpeaking: false,
      lastTranscript: '',
      imageWasInjected: false,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
    } catch (error) {
      console.error(`[Redi V6] Failed to connect to OpenAI:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        console.error(`[Redi V6] Parse error:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[Redi V6] Client disconnected: ${sessionId}`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V6] Client error:`, error);
      cleanup(sessionId);
    });
  });

  // Handle upgrade for V6
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathname = parsedUrl.pathname;
    const version = parsedUrl.query.v;

    if (pathname === '/ws/redi' && version === '6') {
      console.log(`[Redi V6] Handling upgrade for V6 connection`);
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  console.log('[Redi V6] WebSocket server initialized on /ws/redi?v=6');
}

// =============================================================================
// OPENAI CONNECTION
// =============================================================================

async function connectToOpenAI(session: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Redi V6] Connecting to OpenAI...`);

    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V6] ✅ Connected to OpenAI`);
      session.openaiWs = ws;
      configureSession(session);
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      handleOpenAIMessage(session, data);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V6] OpenAI error:`, error);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`[Redi V6] OpenAI closed: ${code}`);
    });
  });
}

// =============================================================================
// SESSION CONFIGURATION - CORRECT FORMAT
// =============================================================================

function configureSession(session: Session): void {
  // Use the correct session.update format for OpenAI Realtime API
  const config = {
    type: 'session.update',
    session: {
      instructions: SYSTEM_PROMPT,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 700
      }
    }
  };

  console.log('[Redi V6] Configuring session...');
  sendToOpenAI(session, config);
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      if (message.data && !session.isAssistantSpeaking) {
        sendToOpenAI(session, {
          type: 'input_audio_buffer.append',
          audio: message.data
        });
      }
      break;

    case 'frame':
      console.log(`[Redi V6] 📷 Frame received: ${message.data?.length || 0} chars`);
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      break;

    case 'mode':
      console.log(`[Redi V6] Mode: ${message.mode}`);
      break;

    case 'sensitivity':
      console.log(`[Redi V6] Sensitivity: ${message.value}`);
      break;
  }
}

// =============================================================================
// OPENAI MESSAGE HANDLING
// =============================================================================

function handleOpenAIMessage(session: Session, data: Buffer): void {
  try {
    const event = JSON.parse(data.toString());
    
    switch (event.type) {
      case 'session.created':
        console.log('[Redi V6] Session created');
        break;

      case 'session.updated':
        console.log('[Redi V6] ✅ Session configured');
        break;

      case 'error':
        console.error(`[Redi V6] ❌ OpenAI Error:`, event.error);
        break;

      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        console.log('[Redi V6] 🎤 User speaking...');
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        console.log('[Redi V6] 🎤 User stopped');
        // When user stops speaking, inject image if we have one
        maybeInjectImage(session);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          session.lastTranscript = event.transcript;
          console.log(`[Redi V6] 👤 User: "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        session.imageWasInjected = false; // Reset for next turn
        sendToClient(session, { type: 'mute_mic', muted: true });
        break;

      case 'response.audio.delta':
        if (event.delta) {
          sendToClient(session, { type: 'audio', data: event.delta });
        }
        break;

      case 'response.audio_transcript.delta':
        // Streaming transcript, ignore
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          console.log(`[Redi V6] 🤖 Redi: "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        session.isAssistantSpeaking = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
        console.log('[Redi V6] ✅ Response complete');
        break;

      case 'rate_limits.updated':
        // Ignore
        break;

      default:
        // Log unknown events for debugging
        if (!event.type.includes('delta')) {
          console.log(`[Redi V6] Event: ${event.type}`);
        }
    }
  } catch (error) {
    console.error(`[Redi V6] Parse error:`, error);
  }
}

// =============================================================================
// IMAGE INJECTION - THE KEY PART
// =============================================================================

function maybeInjectImage(session: Session): void {
  // Only inject if we have a recent frame (less than 5 seconds old)
  if (!session.currentFrame) {
    console.log('[Redi V6] 📷 No frame available');
    return;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > 5000) {
    console.log(`[Redi V6] 📷 Frame too old (${frameAge}ms)`);
    return;
  }

  console.log(`[Redi V6] 📷 Injecting image (${session.currentFrame.length} chars, ${frameAge}ms old)`);

  // Create a conversation item with the image
  const imageMessage = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_image',
          image: session.currentFrame  // Base64 encoded image
        }
      ]
    }
  };

  sendToOpenAI(session, imageMessage);
  session.imageWasInjected = true;
  console.log('[Redi V6] 📷 Image sent to OpenAI');

  // Trigger a response
  sendToOpenAI(session, { type: 'response.create' });
}

// =============================================================================
// WEBSOCKET HELPERS
// =============================================================================

function sendToOpenAI(session: Session, message: any): void {
  if (session.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify(message));
  }
}

function sendToClient(session: Session, message: any): void {
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
    session.openaiWs?.close();
    sessions.delete(sessionId);
    console.log(`[Redi V6] Cleaned up: ${sessionId}`);
  }
}

export function closeRediV6(): void {
  sessions.forEach((_, id) => cleanup(id));
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi V6] Server closed');
  }
}
