/**
 * Redi V6 Server - COMPLETE CLEAN IMPLEMENTATION
 * ==============================================
 * 
 * Fresh start. Correct OpenAI Realtime API format.
 * Voice + Vision working properly.
 * 
 * FIXES FROM JAN 20, 2026 DEBUGGING SESSION:
 * 1. Changed model from gpt-4o-realtime-preview-2024-12-17 to gpt-realtime (GA model)
 * 2. Fixed image format: use image_url with data URI, not raw base64
 * 3. Added input_text context with image (matching V3/V5 working format)
 * 4. Enhanced logging to trace connection and image injection issues
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
// FIXED: Use GA model (same as V3/V5) instead of preview model
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

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
  // Added for better tracking
  connectionTime: number;
  messagesReceived: number;
  messagesSent: number;
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

LANGUAGE: ALWAYS respond in English. Never use any other language regardless of what language the user speaks.

VISION CAPABILITY:
- You can see images when they are sent to you in the conversation.
- When you receive an image, describe what you ACTUALLY see in detail.
- Focus on: people, objects, text, colors, actions, environment.
- For sports: describe positions, movements, form, technique.
- Be specific and accurate - the user is relying on your vision.

WHEN NO IMAGE PROVIDED:
- If asked "what do you see?" but no image was sent, say: "I don't have a camera view right now."
- Never guess or make up what might be visible.
- NEVER claim to see something unless you have an actual image.

RESPONSE STYLE:
- Concise and direct (under 50 words usually)
- Casual, friendly tone
- No filler phrases like "Great question!" or "Happy to help!"
- Speak like a helpful coach or friend
- Use natural language: "Yeah", "Got it", "Here's the deal"

EXAMPLES:
User: "Hey Redi" → "Hey. What do you need?"
User: "What do you see?" (with image) → "I see [describe actual image content]"
User: "What do you see?" (no image) → "Can't see anything right now. What are you looking at?"`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV6(server: HTTPServer): Promise<void> {
  console.log('[Redi V6] ========================================');
  console.log('[Redi V6] Starting V6 Server (FIXED Jan 20 2026)');
  console.log('[Redi V6] Model: gpt-realtime (GA)');
  console.log('[Redi V6] Image format: data URI with image_url');
  console.log('[Redi V6] ========================================');

  if (!OPENAI_API_KEY) {
    console.error('[Redi V6] ❌ OPENAI_API_KEY not set!');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`[Redi V6] 🔌 New connection: ${sessionId} from ${clientIP}`);

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
      connectionTime: Date.now(),
      messagesReceived: 0,
      messagesSent: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
      console.log(`[Redi V6] ✅ Session ${sessionId} ready`);
    } catch (error) {
      console.error(`[Redi V6] ❌ Failed to connect to OpenAI for ${sessionId}:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      session.messagesReceived++;
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        console.error(`[Redi V6] Parse error:`, error);
      }
    });

    ws.on('close', (code, reason) => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi V6] 🔌 Client disconnected: ${sessionId} (code=${code}, duration=${duration}s, msgs=${session.messagesReceived})`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V6] Client error for ${sessionId}:`, error);
      cleanup(sessionId);
    });
  });

  console.log('[Redi V6] WebSocket server initialized on /ws/redi?v=6');
}

// Export function to handle V6 upgrades (called from V5 router)
export function handleV6Upgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) {
    console.error('[Redi V6] ❌ WSS not initialized - cannot handle upgrade');
    return false;
  }

  console.log(`[Redi V6] 🔄 Handling upgrade for V6 connection`);
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss!.emit('connection', ws, request);
  });
  return true;
}

// =============================================================================
// OPENAI CONNECTION
// =============================================================================

async function connectToOpenAI(session: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Redi V6] 🔗 Connecting to OpenAI for session ${session.id}...`);
    console.log(`[Redi V6]    URL: ${OPENAI_REALTIME_URL}`);

    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V6] ✅ Connected to OpenAI for session ${session.id}`);
      session.openaiWs = ws;
      configureSession(session);
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      handleOpenAIMessage(session, data);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V6] ❌ OpenAI WebSocket error:`, error);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`[Redi V6] OpenAI connection closed for ${session.id}: code=${code}`);
    });
  });
}

// =============================================================================
// SESSION CONFIGURATION - CORRECT FORMAT (NO modalities!)
// =============================================================================

function configureSession(session: Session): void {
  // CORRECT session.update format for OpenAI Realtime API
  // NOTE: NO 'modalities' field - this was causing "Unknown parameter" errors
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

  console.log('[Redi V6] 🔧 Configuring session (no modalities param)...');
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
      const frameSize = message.data?.length || 0;
      const frameSizeKB = Math.round(frameSize * 0.75 / 1024);
      console.log(`[Redi V6] 📷 Frame received: ${frameSizeKB}KB`);
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      break;

    case 'mode':
      console.log(`[Redi V6] Mode changed to: ${message.mode}`);
      break;

    case 'sensitivity':
      console.log(`[Redi V6] Sensitivity: ${message.value}`);
      break;

    default:
      console.log(`[Redi V6] Unknown client message type: ${message.type}`);
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
        console.log('[Redi V6] Session created by OpenAI');
        break;

      case 'session.updated':
        console.log('[Redi V6] ✅ Session configured successfully');
        break;

      case 'error':
        console.error(`[Redi V6] ❌ OpenAI Error:`, JSON.stringify(event.error));
        sendToClient(session, { type: 'error', message: event.error?.message || 'OpenAI error' });
        break;

      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        console.log('[Redi V6] 🎤 User speaking...');
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        console.log('[Redi V6] 🎤 User stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          session.lastTranscript = event.transcript;
          console.log(`[Redi V6] 👤 User: "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
          
          // IMPORTANT: Inject image AFTER we have the transcript, then trigger response
          maybeInjectImage(session);
          console.log(`[Redi V6] 📤 Triggering response (image injected: ${session.imageWasInjected})`);
          sendToOpenAI(session, { type: 'response.create' });
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        sendToClient(session, { type: 'mute_mic', muted: true });
        break;

      case 'response.audio.delta':
        if (event.delta) {
          sendToClient(session, { type: 'audio', data: event.delta });
          session.messagesSent++;
        }
        break;

      case 'response.audio_transcript.delta':
        // Streaming transcript - ignore to reduce noise
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          console.log(`[Redi V6] 🤖 Redi: "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        session.isAssistantSpeaking = false;
        session.imageWasInjected = false; // Reset for next turn
        sendToClient(session, { type: 'mute_mic', muted: false });
        console.log('[Redi V6] ✅ Response complete');
        break;

      case 'conversation.item.created':
        // Log when items are created to verify image injection
        const contentTypes = event.item?.content?.map((c: any) => c.type) || [];
        if (contentTypes.length > 0) {
          console.log(`[Redi V6] 📥 Conversation item created: [${contentTypes.join(', ')}]`);
          if (contentTypes.includes('input_image')) {
            console.log(`[Redi V6] ✅ IMAGE ACCEPTED BY OPENAI`);
          }
        }
        break;

      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':
        // Ignore these noisy events
        break;

      default:
        // Log unknown events (but not deltas) for debugging
        if (!event.type.includes('delta')) {
          console.log(`[Redi V6] Event: ${event.type}`);
        }
    }
  } catch (error) {
    console.error(`[Redi V6] Parse error:`, error);
  }
}

// =============================================================================
// IMAGE INJECTION - FIXED FORMAT
// =============================================================================

function maybeInjectImage(session: Session): void {
  // Reset flag at start
  session.imageWasInjected = false;

  // Check if we have a frame
  if (!session.currentFrame) {
    console.log('[Redi V6] 📷 No frame available for injection');
    return;
  }

  // Check frame age (max 5 seconds)
  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > 5000) {
    console.log(`[Redi V6] 📷 Frame too old (${frameAge}ms), skipping injection`);
    return;
  }

  // Clean base64 string (remove any whitespace/newlines)
  const cleanBase64 = session.currentFrame.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi V6] 📷 Injecting image: ${sizeKB}KB, age ${frameAge}ms`);

  // FIXED: Use the SAME format as V3/V5 which works
  // Include both input_text context AND input_image with data URI format
  const imageItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '[Current camera view attached - describe what you see and respond to my question]'
        },
        {
          type: 'input_image',
          image_url: `data:image/jpeg;base64,${cleanBase64}`  // FIXED: Use image_url with data URI
        }
      ]
    }
  };

  console.log(`[Redi V6] 🖼️ SENDING IMAGE TO OPENAI (format: image_url with data URI)`);
  sendToOpenAI(session, imageItem);
  session.imageWasInjected = true;
}

// =============================================================================
// WEBSOCKET HELPERS
// =============================================================================

function sendToOpenAI(session: Session, message: any): void {
  if (session.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify(message));
  } else {
    console.warn(`[Redi V6] Cannot send to OpenAI - connection not open (state: ${session.openaiWs?.readyState})`);
  }
}

function sendToClient(session: Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(JSON.stringify(message));
    session.messagesSent++;
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
    console.log(`[Redi V6] Cleaned up session: ${sessionId}`);
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

// =============================================================================
// STATS (for debugging)
// =============================================================================

export function getV6Stats(): { activeSessions: number; uptime: number } {
  return {
    activeSessions: sessions.size,
    uptime: process.uptime()
  };
}
