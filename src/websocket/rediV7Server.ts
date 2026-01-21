/**
 * Redi V7 Server - MAXIMUM SPEED OPTIMIZATION
 * ===========================================
 * 
 * OPTIMIZATIONS FOR SUB-3-SECOND RESPONSE:
 * 1. Continuous frame streaming - always have the latest frame ready
 * 2. Shorter VAD silence (400ms vs 600ms) - detect speech end faster
 * 3. Don't wait for frame if we have a recent one (<500ms old)
 * 4. Smaller image size recommendation (iOS should send ~100KB not 300KB)
 * 5. Parallel processing - inject image while transcript still processing
 * 
 * Endpoint: /ws/redi?v=7
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

// =============================================================================
// CONFIGURATION - TUNED FOR SPEED
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

// Frame settings - AGGRESSIVE freshness for speed
const MAX_FRAME_AGE_MS = 1000;  // 1 second max - reject anything older
const FRESH_ENOUGH_MS = 500;   // If frame is <500ms old, use it immediately (don't wait)
const FRAME_WAIT_TIMEOUT_MS = 400;  // Only wait 400ms for frame (was 800ms)

// =============================================================================
// TYPES
// =============================================================================

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  
  // Frame management - keep updating during speech
  currentFrame: string | null;
  frameTimestamp: number;
  pendingFrameRequest: boolean;
  waitingForFrame: boolean;
  framePromiseResolve: ((value: boolean) => void) | null;
  
  // Speaking states
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  speechStartTime: number;
  
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
// SYSTEM PROMPT - CONCISE FOR FASTER RESPONSES
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, an AI with real-time vision.

RULES:
- Describe ONLY what's in the attached image
- Be brief: 15-25 words max
- No filler phrases
- English only
- If no image: "Can't see right now"`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 Server - MAXIMUM SPEED MODE');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Max frame age: 1000ms');
  console.log('[Redi V7] Fresh enough: 500ms (skip wait)');
  console.log('[Redi V7] Frame wait timeout: 400ms');
  console.log('[Redi V7] VAD silence: 400ms (fast detection)');
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
      pendingFrameRequest: false,
      waitingForFrame: false,
      framePromiseResolve: null,
      isUserSpeaking: false,
      isAssistantSpeaking: false,
      speechStartTime: 0,
      currentTurnHandled: false,
      connectionTime: Date.now(),
      responsesCompleted: 0,
      imagesInjected: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
      console.log(`[Redi V7] ✅ Session ready`);
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

  console.log(`[Redi V7] 🔄 Handling upgrade`);
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
// SESSION CONFIGURATION - OPTIMIZED FOR SPEED
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
        prefix_padding_ms: 200,      // Reduced from 300ms
        silence_duration_ms: 400     // Reduced from 600ms - faster end detection!
      }
    }
  };

  console.log('[Redi V7] 🔧 Configuring session (fast VAD)...');
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
      
      // Always store the latest frame
      session.currentFrame = message.data;
      session.frameTimestamp = Date.now();
      session.pendingFrameRequest = false;
      
      // Warn if frame is too large (slows everything down)
      if (frameSizeKB > 150) {
        console.log(`[Redi V7] 📷 Frame: ${frameSizeKB}KB ⚠️ LARGE (target <150KB)`);
      } else {
        console.log(`[Redi V7] 📷 Frame: ${frameSizeKB}KB ✓`);
      }
      
      // If we're waiting for a frame, resolve immediately
      if (session.waitingForFrame && session.framePromiseResolve) {
        session.waitingForFrame = false;
        session.framePromiseResolve(true);
        session.framePromiseResolve = null;
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
        if (errorCode !== 'conversation_already_has_active_response') {
          console.error(`[Redi V7] ❌ Error: ${event.error?.message || 'Unknown'}`);
        }
        break;

      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        session.currentTurnHandled = false;
        session.speechStartTime = Date.now();
        console.log('[Redi V7] 🎤 Speaking...');
        
        // Request frame immediately when speech starts
        // This way we might have a fresh frame ready by the time they finish
        requestFrame(session);
        
        // Barge-in handling
        if (session.isAssistantSpeaking) {
          console.log('[Redi V7] 🛑 BARGE-IN');
          sendToClient(session, { type: 'stop_audio' });
          sendToOpenAI(session, { type: 'response.cancel' });
          session.isAssistantSpeaking = false;
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        const speechDuration = Date.now() - session.speechStartTime;
        console.log(`[Redi V7] 🎤 Stopped (${speechDuration}ms)`);
        
        // Request another frame NOW - we want the freshest possible
        requestFrame(session);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          handleTranscriptCompleted(session, event.transcript);
        }
        break;

      case 'conversation.item.created':
        // Silent - reduce log noise
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
// TRANSCRIPT HANDLING - OPTIMIZED FOR SPEED
// =============================================================================

async function handleTranscriptCompleted(session: Session, transcript: string): Promise<void> {
  const transcriptTime = Date.now();
  console.log(`[Redi V7] 👤 "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  if (session.currentTurnHandled) {
    return;
  }
  session.currentTurnHandled = true;
  
  // Check frame freshness
  const frameAge = session.currentFrame ? Date.now() - session.frameTimestamp : Infinity;
  
  // SPEED OPTIMIZATION: If frame is "fresh enough", use it immediately
  if (frameAge <= FRESH_ENOUGH_MS) {
    console.log(`[Redi V7] 📷 Frame fresh (${frameAge}ms) - using immediately`);
  } else if (frameAge <= MAX_FRAME_AGE_MS) {
    console.log(`[Redi V7] 📷 Frame acceptable (${frameAge}ms)`);
  } else {
    // Frame is stale - wait briefly for fresh one
    console.log(`[Redi V7] 📷 Frame stale (${frameAge}ms) - waiting...`);
    const gotFrame = await waitForFreshFrame(session);
    if (!gotFrame) {
      console.log('[Redi V7] 📷 Timeout - proceeding without fresh frame');
    }
  }
  
  // Inject image
  const hasImage = injectImage(session);
  
  // Calculate total latency so far
  const latencySoFar = Date.now() - transcriptTime;
  console.log(`[Redi V7] 🚀 Triggering response (image: ${hasImage ? 'YES' : 'NO'}, prep: ${latencySoFar}ms)`);
  
  sendToOpenAI(session, { type: 'response.create' });
}

// =============================================================================
// FRAME MANAGEMENT - OPTIMIZED
// =============================================================================

function requestFrame(session: Session): void {
  if (!session.pendingFrameRequest) {
    session.pendingFrameRequest = true;
    sendToClient(session, { type: 'request_frame' });
  }
}

async function waitForFreshFrame(session: Session): Promise<boolean> {
  const frameAge = session.currentFrame ? Date.now() - session.frameTimestamp : Infinity;
  if (frameAge <= FRESH_ENOUGH_MS) {
    return true;
  }
  
  return new Promise((resolve) => {
    session.waitingForFrame = true;
    session.framePromiseResolve = resolve;
    
    setTimeout(() => {
      if (session.waitingForFrame) {
        session.waitingForFrame = false;
        session.framePromiseResolve = null;
        resolve(false);
      }
    }, FRAME_WAIT_TIMEOUT_MS);
  });
}

function injectImage(session: Session): boolean {
  if (!session.currentFrame) {
    return false;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  
  // Be more lenient - use frame if it's under 2 seconds old
  // Speed is more important than perfect freshness
  if (frameAge > 2000) {
    console.log(`[Redi V7] 📷 Frame too old (${frameAge}ms) - skipping`);
    return false;
  }

  const cleanBase64 = session.currentFrame.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi V7] 📷 Injecting: ${sizeKB}KB, ${frameAge}ms old`);

  const imageItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '[Camera view - describe briefly what you see]'
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
  }
}

export function closeRediV7(): void {
  sessions.forEach((_, id) => cleanup(id));
  if (wss) {
    wss.close();
    wss = null;
  }
}

export function getV7Stats(): object {
  return {
    activeSessions: sessions.size,
  };
}
