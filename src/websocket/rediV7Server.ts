/**
 * Redi V7 Server - FRESH FRAME ON SPEECH END
 * ==========================================
 * 
 * CRITICAL FIX: Request frame when user STOPS speaking, not when they START.
 * This ensures we capture what the camera sees at the moment of the question,
 * not what it saw 2-3 seconds earlier when the user started talking.
 * 
 * Flow:
 * 1. User starts speaking → just listen
 * 2. User stops speaking → REQUEST FRESH FRAME NOW
 * 3. Wait for frame to arrive (up to 500ms)
 * 4. Transcript arrives → inject the FRESH frame → respond
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

// Frame settings - STRICT freshness requirements
const MAX_FRAME_AGE_MS = 1500;  // 1.5 seconds max - frames older than this are STALE
const FRAME_WAIT_TIMEOUT_MS = 800;  // Wait up to 800ms for fresh frame

// =============================================================================
// TYPES
// =============================================================================

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  
  // Frame management - CRITICAL for fresh vision
  currentFrame: string | null;
  frameTimestamp: number;
  waitingForFrame: boolean;
  framePromiseResolve: ((value: boolean) => void) | null;
  
  // Speaking states
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  
  // Prevent double responses
  currentTurnHandled: boolean;
  
  // Stats
  connectionTime: number;
  responsesCompleted: number;
  imagesInjected: number;
}

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time voice and vision.

CRITICAL VISION RULES:
1. ONLY describe what you can ACTUALLY SEE in the attached image
2. Each image is a FRESH capture - describe THIS image, not previous ones
3. If NO IMAGE is attached, say "I don't have a camera view right now"
4. Be specific: positions (left/right/center), colors, text you can read
5. If blurry, say so. Never guess or assume.

RESPONSE STYLE:
- Concise (under 30 words unless detail needed)
- Natural, conversational
- No filler phrases
- English only`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 Server - FRESH FRAME ON SPEECH END');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Max frame age: 1.5 seconds (STRICT)');
  console.log('[Redi V7] Frame wait timeout: 800ms');
  console.log('[Redi V7] Strategy:');
  console.log('[Redi V7]   ✓ Request frame when user STOPS speaking');
  console.log('[Redi V7]   ✓ Wait for fresh frame before responding');
  console.log('[Redi V7]   ✓ Reject stale frames');
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
      waitingForFrame: false,
      framePromiseResolve: null,
      isUserSpeaking: false,
      isAssistantSpeaking: false,
      currentTurnHandled: false,
      connectionTime: Date.now(),
      responsesCompleted: 0,
      imagesInjected: 0,
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
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
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
        silence_duration_ms: 600  // Slightly shorter for faster response
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
      
      // Store frame with fresh timestamp
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      
      console.log(`[Redi V7] 📷 Frame received: ${frameSizeKB}KB (fresh)`);
      
      // If we're waiting for a frame, resolve the promise
      if (session.waitingForFrame && session.framePromiseResolve) {
        session.waitingForFrame = false;
        session.framePromiseResolve(true);
        session.framePromiseResolve = null;
        console.log(`[Redi V7] 📷 Frame arrived while waiting - resolved!`);
      }
      break;

    default:
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
        console.log('[Redi V7] Session created');
        break;

      case 'session.updated':
        console.log('[Redi V7] ✅ Session configured');
        break;

      case 'error':
        const errorCode = event.error?.code || 'unknown';
        if (errorCode === 'conversation_already_has_active_response') {
          console.log('[Redi V7] ⚠️ Response already active');
        } else {
          console.error(`[Redi V7] ❌ OpenAI Error: ${event.error?.message || 'Unknown'}`);
        }
        break;

      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        session.currentTurnHandled = false;
        console.log('[Redi V7] 🎤 User speaking...');
        // DON'T request frame here - wait until speech ends
        
        // Barge-in
        if (session.isAssistantSpeaking) {
          console.log('[Redi V7] 🛑 BARGE-IN - cancelling response');
          sendToClient(session, { type: 'stop_audio' });
          sendToOpenAI(session, { type: 'response.cancel' });
          session.isAssistantSpeaking = false;
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        console.log('[Redi V7] 🎤 User stopped speaking');
        
        // REQUEST FRESH FRAME NOW - this is the key change!
        console.log('[Redi V7] 📷 Requesting fresh frame NOW (speech just ended)');
        requestFreshFrame(session);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          handleTranscriptCompleted(session, event.transcript);
        }
        break;

      case 'conversation.item.created':
        const contentTypes = event.item?.content?.map((c: any) => c.type) || [];
        if (contentTypes.length > 0) {
          console.log(`[Redi V7] 📥 Item created: [${contentTypes.join(', ')}]`);
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
        session.isAssistantSpeaking = false;
        session.responsesCompleted++;
        sendToClient(session, { type: 'mute_mic', muted: false });
        console.log('[Redi V7] ✅ Response complete');
        break;

      case 'response.cancelled':
        console.log('[Redi V7] 🛑 Response cancelled');
        session.isAssistantSpeaking = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
        break;
    }
  } catch (error) {
    console.error(`[Redi V7] Parse error:`, error);
  }
}

// =============================================================================
// TRANSCRIPT HANDLING - Wait for fresh frame
// =============================================================================

async function handleTranscriptCompleted(session: Session, transcript: string): Promise<void> {
  console.log(`[Redi V7] 👤 User: "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  if (session.currentTurnHandled) {
    console.log('[Redi V7] ⚠️ Turn already handled');
    return;
  }
  session.currentTurnHandled = true;
  
  // Check if we have a fresh frame
  const frameAge = session.currentFrame ? Date.now() - session.frameTimestamp : Infinity;
  
  if (frameAge > MAX_FRAME_AGE_MS) {
    // Frame is stale - wait for the fresh one we requested
    console.log(`[Redi V7] 📷 Frame stale (${frameAge}ms) - waiting for fresh frame...`);
    
    const gotFreshFrame = await waitForFreshFrame(session);
    
    if (!gotFreshFrame) {
      console.log('[Redi V7] 📷 No fresh frame arrived - responding without image');
    }
  } else {
    console.log(`[Redi V7] 📷 Frame is fresh (${frameAge}ms)`);
  }
  
  // Inject image if we have a fresh one
  const hasImage = injectImageIfFresh(session);
  
  // Trigger response
  console.log(`[Redi V7] 🚀 Triggering response (image: ${hasImage ? 'YES' : 'NO'})`);
  sendToOpenAI(session, { type: 'response.create' });
}

// =============================================================================
// FRAME MANAGEMENT
// =============================================================================

function requestFreshFrame(session: Session): void {
  sendToClient(session, { type: 'request_frame' });
}

async function waitForFreshFrame(session: Session): Promise<boolean> {
  // Check if frame is already fresh
  const frameAge = session.currentFrame ? Date.now() - session.frameTimestamp : Infinity;
  if (frameAge <= MAX_FRAME_AGE_MS) {
    return true;
  }
  
  // Wait for frame with timeout
  return new Promise((resolve) => {
    session.waitingForFrame = true;
    session.framePromiseResolve = resolve;
    
    // Timeout after FRAME_WAIT_TIMEOUT_MS
    setTimeout(() => {
      if (session.waitingForFrame) {
        session.waitingForFrame = false;
        session.framePromiseResolve = null;
        console.log(`[Redi V7] 📷 Frame wait timeout (${FRAME_WAIT_TIMEOUT_MS}ms)`);
        resolve(false);
      }
    }, FRAME_WAIT_TIMEOUT_MS);
  });
}

function injectImageIfFresh(session: Session): boolean {
  if (!session.currentFrame) {
    console.log('[Redi V7] 📷 No frame available');
    return false;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  
  if (frameAge > MAX_FRAME_AGE_MS) {
    console.log(`[Redi V7] 📷 Frame too old (${frameAge}ms > ${MAX_FRAME_AGE_MS}ms) - skipping`);
    return false;
  }

  const cleanBase64 = session.currentFrame.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi V7] 📷 Injecting FRESH image: ${sizeKB}KB, age ${frameAge}ms`);

  const imageItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '[FRESH camera capture - describe exactly what you see in THIS image]'
        },
        {
          type: 'input_image',
          image_url: `data:image/jpeg;base64,${cleanBase64}`
        }
      ]
    }
  };

  sendToOpenAI(session, imageItem);
  session.imagesInjected++;
  
  console.log(`[Redi V7] ✅ Fresh image injected (total: ${session.imagesInjected})`);
  return true;
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
    if (session.framePromiseResolve) {
      session.framePromiseResolve(false);
    }
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
  return {
    activeSessions: sessions.size,
    sessions: Array.from(sessions.values()).map(s => ({
      id: s.id.slice(0, 8),
      uptime: Math.round((Date.now() - s.connectionTime) / 1000),
      responses: s.responsesCompleted,
      images: s.imagesInjected,
    }))
  };
}
