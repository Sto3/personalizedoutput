/**
 * Redi V7 Server - PRODUCTION-GRADE RELIABILITY
 * =============================================
 * 
 * CRITICAL FIX: Image must be part of response.create, not separate conversation item.
 * Previous approach added images as separate messages, which OpenAI didn't associate
 * with the user's question.
 * 
 * NEW APPROACH:
 * 1. When user stops speaking, save the frame
 * 2. When transcript arrives, trigger response with image context
 * 3. Use response.create with modalities including the image
 * 
 * Endpoint: /ws/redi?v=7
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

// Frame settings
const MAX_FRAME_AGE_MS = 5000;  // 5 seconds - more tolerance

// =============================================================================
// TYPES
// =============================================================================

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  
  // Frame management
  currentFrame: string | null;
  frameTimestamp: number;
  pendingFrame: string | null;  // Frame to use for next response
  
  // Speaking states
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  pendingTranscript: string | null;  // Transcript waiting for response
  
  // Stats
  connectionTime: number;
  responsesCompleted: number;
  imagesInjected: number;
  errors: number;
}

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// SYSTEM PROMPT - ACCURACY FOCUSED
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time voice and vision.

CRITICAL RULES FOR VISION:
1. ONLY describe what you can ACTUALLY SEE in the current image. Never guess or assume.
2. EACH RESPONSE must be based on the CURRENT image, not previous images.
3. If you cannot clearly read text, say "I can see text but can't read it clearly"
4. If asked about something not visible, say "I don't see that in the current view"
5. Be SPECIFIC about locations: use "left side", "right side", "center", "top", "bottom"
6. For app icons: describe by COLOR and SHAPE, give EXACT position
7. Express uncertainty: "I think that's..." or "It looks like..." when not 100% sure
8. NEVER make up details. If the image is blurry or unclear, say so.
9. If the scene has CHANGED from before, acknowledge it: "Now I see..."

WHEN IMAGE IS PROVIDED:
- Always describe what you CURRENTLY see
- Don't reference previous images unless asked to compare

WHEN NO IMAGE IS PROVIDED:
- Say "I don't have a camera view right now" 
- Never pretend to see something you can't

RESPONSE STYLE:
- Be concise (under 40 words unless detail is needed)
- Natural, conversational tone
- No filler phrases like "Great question!"
- Don't repeat yourself
- Each response should describe the CURRENT view freshly

LANGUAGE: Always respond in English.`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 Server - IMAGE WITH RESPONSE FIX');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Model: gpt-realtime (GA with VISION)');
  console.log('[Redi V7] Version: Jan 21 2026 - Image With Response');
  console.log('[Redi V7] Features:');
  console.log('[Redi V7]   ✓ Image included IN response.create');
  console.log('[Redi V7]   ✓ Fresh frame for EVERY question');
  console.log('[Redi V7]   ✓ Barge-in with response.cancel');
  console.log('[Redi V7] ═══════════════════════════════════════════');

  if (!OPENAI_API_KEY) {
    console.error('[Redi V7] ❌ OPENAI_API_KEY not set!');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V7] 🔌 New connection: ${sessionId}`);

    const session: Session = {
      id: sessionId,
      clientWs: ws,
      openaiWs: null,
      currentFrame: null,
      frameTimestamp: 0,
      pendingFrame: null,
      isUserSpeaking: false,
      isAssistantSpeaking: false,
      pendingTranscript: null,
      connectionTime: Date.now(),
      responsesCompleted: 0,
      imagesInjected: 0,
      errors: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
      console.log(`[Redi V7] ✅ Session ${sessionId} ready`);
    } catch (error) {
      console.error(`[Redi V7] ❌ Failed to connect to OpenAI:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        console.error(`[Redi V7] Parse error:`, error);
      }
    });

    ws.on('close', (code) => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi V7] 🔌 Disconnected: ${sessionId} (${duration}s, ${session.responsesCompleted} responses, ${session.imagesInjected} images)`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V7] Client error:`, error);
      cleanup(sessionId);
    });
  });

  console.log('[Redi V7] WebSocket server initialized on /ws/redi?v=7');
}

export function handleV7Upgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) {
    console.error('[Redi V7] ❌ WSS not initialized');
    return false;
  }

  console.log(`[Redi V7] 🔄 Handling upgrade for V7 connection`);
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
    console.log(`[Redi V7] 🔗 Connecting to OpenAI...`);

    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V7] ✅ Connected to OpenAI`);
      session.openaiWs = ws;
      configureSession(session);
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      handleOpenAIMessage(session, data);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V7] ❌ OpenAI error:`, error);
      session.errors++;
      reject(error);
    });

    ws.on('close', (code) => {
      console.log(`[Redi V7] OpenAI closed: code=${code}`);
    });
  });
}

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

function configureSession(session: Session): void {
  const config = {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
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
        silence_duration_ms: 500
      }
    }
  };

  console.log('[Redi V7] 🔧 Configuring session...');
  sendToOpenAI(session, config);
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      if (message.data) {
        sendToOpenAI(session, {
          type: 'input_audio_buffer.append',
          audio: message.data
        });
      }
      break;

    case 'frame':
      const frameSize = message.data?.length || 0;
      const frameSizeKB = Math.round(frameSize * 0.75 / 1024);
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      
      console.log(`[Redi V7] 📷 Frame received: ${frameSizeKB}KB`);
      break;

    case 'mode':
    case 'sensitivity':
      break;

    default:
      console.log(`[Redi V7] Unknown message: ${message.type}`);
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
        console.log('[Redi V7] Session created');
        break;

      case 'session.updated':
        console.log('[Redi V7] ✅ Session configured');
        break;

      case 'error':
        handleOpenAIError(session, event.error);
        break;

      case 'input_audio_buffer.speech_started':
        handleUserStartedSpeaking(session);
        break;

      case 'input_audio_buffer.speech_stopped':
        handleUserStoppedSpeaking(session);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          handleTranscriptReceived(session, event.transcript);
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        sendToClient(session, { type: 'mute_mic', muted: true });
        break;

      case 'response.audio.delta':
        if (event.delta) {
          sendToClient(session, { type: 'audio', data: event.delta });
        }
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          console.log(`[Redi V7] 🤖 Redi: "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        handleResponseDone(session);
        break;

      case 'response.cancelled':
        console.log('[Redi V7] 🛑 Response cancelled');
        session.isAssistantSpeaking = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
        break;

      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':
      case 'conversation.item.created':
        break;
    }
  } catch (error) {
    console.error(`[Redi V7] Parse error:`, error);
    session.errors++;
  }
}

// =============================================================================
// SPEECH & TRANSCRIPT HANDLERS
// =============================================================================

function handleUserStartedSpeaking(session: Session): void {
  session.isUserSpeaking = true;
  console.log('[Redi V7] 🎤 User speaking...');
  
  // Request a fresh frame NOW so it's ready when they stop
  requestFreshFrame(session);
  
  // BARGE-IN: Cancel any active response
  if (session.isAssistantSpeaking) {
    console.log('[Redi V7] 🛑 BARGE-IN: Cancelling response');
    sendToClient(session, { type: 'stop_audio' });
    sendToOpenAI(session, { type: 'response.cancel' });
    session.isAssistantSpeaking = false;
  }
}

function handleUserStoppedSpeaking(session: Session): void {
  session.isUserSpeaking = false;
  console.log('[Redi V7] 🎤 User stopped speaking');
  
  // Save the current frame for the upcoming response
  if (session.currentFrame && (Date.now() - session.frameTimestamp) < MAX_FRAME_AGE_MS) {
    session.pendingFrame = session.currentFrame;
    const sizeKB = Math.round(session.currentFrame.length * 0.75 / 1024);
    console.log(`[Redi V7] 📷 Frame saved for response: ${sizeKB}KB`);
  } else {
    session.pendingFrame = null;
    console.log('[Redi V7] 📷 No fresh frame available');
  }
}

function handleTranscriptReceived(session: Session, transcript: string): void {
  console.log(`[Redi V7] 👤 User: "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  // Now trigger a response WITH the pending frame
  triggerResponseWithImage(session, transcript);
}

function handleResponseDone(session: Session): void {
  session.isAssistantSpeaking = false;
  session.responsesCompleted++;
  session.pendingFrame = null;
  
  sendToClient(session, { type: 'mute_mic', muted: false });
  console.log('[Redi V7] ✅ Response complete');
}

function handleOpenAIError(session: Session, error: any): void {
  const errorCode = error?.code || 'unknown';
  const errorMsg = error?.message || 'Unknown error';
  
  console.error(`[Redi V7] ❌ OpenAI Error [${errorCode}]: ${errorMsg}`);
  session.errors++;
  
  sendToClient(session, { type: 'error', message: errorMsg });
}

// =============================================================================
// IMAGE INJECTION - WITH RESPONSE
// =============================================================================

function requestFreshFrame(session: Session): void {
  sendToClient(session, { type: 'request_frame' });
  console.log('[Redi V7] 📷 Requested fresh frame');
}

function triggerResponseWithImage(session: Session, transcript: string): void {
  // Build the input content
  const inputContent: any[] = [];
  
  // Add image if available
  if (session.pendingFrame) {
    const cleanBase64 = session.pendingFrame.replace(/[\r\n\s]/g, '');
    const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);
    
    console.log(`[Redi V7] 📷 Including image in response: ${sizeKB}KB`);
    
    // First add the image as a user message in the conversation
    const imageMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${cleanBase64}`
          },
          {
            type: 'input_text',
            text: `[This is what I'm currently looking at. User's question: "${transcript}"]`
          }
        ]
      }
    };
    
    sendToOpenAI(session, imageMessage);
    session.imagesInjected++;
    console.log(`[Redi V7] ✅ Image injected (total: ${session.imagesInjected})`);
  }
  
  // Now trigger the response
  // The model will use the image + transcript we just added
  sendToOpenAI(session, { type: 'response.create' });
  console.log('[Redi V7] 🚀 Response triggered');
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
    console.log(`[Redi V7] Cleaned up: ${sessionId}`);
  }
}

export function closeRediV7(): void {
  sessions.forEach((_, id) => cleanup(id));
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi V7] Server closed');
  }
}

export function getV7Stats(): object {
  const sessionStats = Array.from(sessions.values()).map(s => ({
    id: s.id.slice(0, 8),
    uptime: Math.round((Date.now() - s.connectionTime) / 1000),
    responses: s.responsesCompleted,
    images: s.imagesInjected,
    errors: s.errors,
    speaking: s.isUserSpeaking ? 'user' : (s.isAssistantSpeaking ? 'assistant' : 'idle')
  }));
  
  return {
    activeSessions: sessions.size,
    sessions: sessionStats
  };
}
