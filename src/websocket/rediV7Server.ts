/**
 * Redi V7 Server - ALWAYS-FRESH FRAME INJECTION
 * ==============================================
 * 
 * RADICAL NEW APPROACH:
 * 
 * The problem with all previous attempts:
 * - We try to pick "the right frame" at various moments
 * - But there's 2-3 seconds of inherent latency in the pipeline
 * - User keeps moving camera during this time
 * 
 * NEW STRATEGY:
 * 1. iOS sends frames continuously (every 500ms)
 * 2. We inject the frame into OpenAI RIGHT BEFORE triggering response
 * 3. We use response.create with a fresh image injection in the SAME call
 * 4. No waiting, no caching - just grab whatever frame we have NOW
 * 
 * The key insight: Don't try to be clever about timing.
 * Just always use the most recent frame available at response trigger time.
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

// =============================================================================
// TYPES
// =============================================================================

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  
  // Frame management - just keep the latest
  latestFrame: string | null;
  latestFrameTime: number;
  
  // Speaking states
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  speechStartTime: number;
  
  // Prevent double responses
  currentTurnHandled: boolean;
  
  // Stats
  connectionTime: number;
  responsesCompleted: number;
}

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// SYSTEM PROMPT - Extremely concise for speed
// =============================================================================

const SYSTEM_PROMPT = `You are Redi. You see through a phone camera in real-time.

CRITICAL RULES:
- Describe ONLY what's in the image attached to THIS message
- Be brief: 10-20 words
- Never say "I see" - just describe directly
- If asked "what about now" - describe the NEW image, ignore previous context`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 - ALWAYS-FRESH FRAME INJECTION');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Strategy: Use latest frame at response time');
  console.log('[Redi V7] No waiting, no caching tricks');
  console.log('[Redi V7] VAD: 400ms silence detection');
  console.log('[Redi V7] ═══════════════════════════════════════════');

  if (!OPENAI_API_KEY) {
    console.error('[Redi V7] ❌ OPENAI_API_KEY not set!');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V7] 🔌 New connection: ${sessionId.slice(0,8)}`);

    const session: Session = {
      id: sessionId,
      clientWs: ws,
      openaiWs: null,
      latestFrame: null,
      latestFrameTime: 0,
      isUserSpeaking: false,
      isAssistantSpeaking: false,
      speechStartTime: 0,
      currentTurnHandled: false,
      connectionTime: Date.now(),
      responsesCompleted: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
      
      // Tell iOS to send frames frequently
      sendToClient(session, { type: 'config', frameInterval: 500 });
      
      console.log(`[Redi V7] ✅ Session ready`);
    } catch (error) {
      console.error(`[Redi V7] ❌ OpenAI connection failed:`, error);
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

    ws.on('close', () => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi V7] 🔌 Disconnected: ${sessionId.slice(0,8)} (${duration}s, ${session.responsesCompleted} responses)`);
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
    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V7] ✅ OpenAI connected`);
      session.openaiWs = ws;
      configureSession(session);
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      handleOpenAIMessage(session, data);
    });

    ws.on('error', reject);

    ws.on('close', (code) => {
      console.log(`[Redi V7] OpenAI closed: ${code}`);
    });
  });
}

function configureSession(session: Session): void {
  sendToOpenAI(session, {
    type: 'session.update',
    session: {
      instructions: SYSTEM_PROMPT,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 200,
        silence_duration_ms: 400
      }
    }
  });
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
      // Just store the latest frame - no complex logic
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      
      const sizeKB = Math.round((message.data?.length || 0) * 0.75 / 1024);
      console.log(`[Redi V7] 📷 ${sizeKB}KB`);
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
      case 'session.updated':
        console.log('[Redi V7] ✅ Configured');
        break;

      case 'error':
        if (event.error?.code !== 'conversation_already_has_active_response') {
          console.error(`[Redi V7] ❌ ${event.error?.message}`);
        }
        break;

      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        session.currentTurnHandled = false;
        session.speechStartTime = Date.now();
        console.log('[Redi V7] 🎤 Speaking...');
        
        // Request fresh frame
        sendToClient(session, { type: 'request_frame' });
        
        if (session.isAssistantSpeaking) {
          console.log('[Redi V7] 🛑 BARGE-IN');
          sendToClient(session, { type: 'stop_audio' });
          sendToOpenAI(session, { type: 'response.cancel' });
          session.isAssistantSpeaking = false;
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        console.log(`[Redi V7] 🎤 Stopped (${Date.now() - session.speechStartTime}ms)`);
        
        // Request another frame - we want the freshest possible
        sendToClient(session, { type: 'request_frame' });
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && !session.currentTurnHandled) {
          session.currentTurnHandled = true;
          handleUserMessage(session, event.transcript);
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
          console.log(`[Redi V7] 🤖 "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        session.isAssistantSpeaking = false;
        session.responsesCompleted++;
        sendToClient(session, { type: 'mute_mic', muted: false });
        console.log('[Redi V7] ✅ Done');
        break;

      case 'response.cancelled':
        session.isAssistantSpeaking = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
        break;
    }
  } catch (error) {
    console.error(`[Redi V7] Parse error:`, error);
  }
}

// =============================================================================
// USER MESSAGE HANDLING - THE KEY CHANGE
// =============================================================================

function handleUserMessage(session: Session, transcript: string): void {
  console.log(`[Redi V7] 👤 "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  // Request one more frame RIGHT NOW
  sendToClient(session, { type: 'request_frame' });
  
  // Small delay to let the frame arrive, then inject and respond
  setTimeout(() => {
    triggerResponseWithLatestFrame(session, transcript);
  }, 100);  // Just 100ms - enough for frame to arrive
}

function triggerResponseWithLatestFrame(session: Session, transcript: string): void {
  const frameAge = session.latestFrame ? Date.now() - session.latestFrameTime : Infinity;
  
  if (session.latestFrame && frameAge < 2000) {
    // Inject the frame RIGHT BEFORE triggering response
    const cleanBase64 = session.latestFrame.replace(/[\r\n\s]/g, '');
    const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);
    
    console.log(`[Redi V7] 📷 Injecting ${sizeKB}KB (${frameAge}ms old)`);
    
    // Create a message with BOTH the user's text AND the image
    sendToOpenAI(session, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `[User said: "${transcript}" - Here's what the camera shows RIGHT NOW:]`
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${cleanBase64}`
          }
        ]
      }
    });
    
    console.log(`[Redi V7] 🚀 Triggering response with fresh frame`);
  } else {
    console.log(`[Redi V7] ⚠️ No fresh frame (${frameAge}ms old) - responding without image`);
  }
  
  sendToOpenAI(session, { type: 'response.create' });
}

// =============================================================================
// HELPERS
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

function cleanup(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.openaiWs?.close();
    sessions.delete(sessionId);
  }
}

export function closeRediV7(): void {
  sessions.forEach((_, id) => cleanup(id));
  wss?.close();
  wss = null;
}

export function getV7Stats(): object {
  return { activeSessions: sessions.size };
}
