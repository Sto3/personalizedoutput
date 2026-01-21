/**
 * Redi V7 Server - FIXED HYBRID APPROACH
 * =======================================
 * 
 * PROBLEM: Previous attempt disabled VAD completely, breaking speech detection.
 * 
 * SOLUTION: Keep server VAD but intercept the response flow:
 * 1. Server VAD detects speech (we get speech_started/stopped events)
 * 2. On speech_stopped → save frame, OpenAI commits audio automatically
 * 3. On transcript → inject image → manually trigger response
 * 4. Key: Cancel any auto-response and trigger our own WITH the image
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
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

// Frame settings
const MAX_FRAME_AGE_MS = 10000;  // 10 seconds max frame age

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
  pendingFrame: string | null;
  
  // Speaking states
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  
  // Track if we've handled this turn (prevent double response)
  currentTurnHandled: boolean;
  
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
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time voice and vision.

CRITICAL VISION RULES:
1. ONLY describe what you can ACTUALLY SEE in the current image
2. If NO IMAGE is attached to this message, say "I don't have a camera view right now"
3. NEVER guess or hallucinate - only describe what's visible
4. Be specific about positions: left, right, center, top, bottom
5. If image is blurry, say so

RESPONSE STYLE:
- Concise (under 40 words unless detail needed)
- Natural, conversational
- No filler phrases
- English only`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 Server - HYBRID VAD + MANUAL RESPONSE');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Model: gpt-4o-realtime-preview-2024-12-17');
  console.log('[Redi V7] Strategy:');
  console.log('[Redi V7]   ✓ Server VAD for speech detection');
  console.log('[Redi V7]   ✓ Intercept auto-response');
  console.log('[Redi V7]   ✓ Inject image before triggering response');
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
      currentTurnHandled: false,
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
      session.errors++;
      reject(error);
    });

    ws.on('close', (code) => {
      console.log(`[Redi V7] OpenAI closed: code=${code}`);
    });
  });
}

// =============================================================================
// SESSION CONFIGURATION - Server VAD enabled
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
      // Keep server VAD for speech detection
      // Higher threshold to reduce false triggers from background noise
      turn_detection: {
        type: 'server_vad',
        threshold: 0.7,  // Higher = less sensitive to noise
        prefix_padding_ms: 300,
        silence_duration_ms: 700  // Slightly longer silence needed
      }
    }
  };

  console.log('[Redi V7] 🔧 Configuring session with server VAD...');
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
        handleOpenAIError(session, event.error);
        break;

      case 'input_audio_buffer.speech_started':
        handleSpeechStarted(session);
        break;

      case 'input_audio_buffer.speech_stopped':
        handleSpeechStopped(session);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          handleTranscriptCompleted(session, event.transcript, event.item_id);
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
        handleResponseDone(session);
        break;

      case 'response.cancelled':
        console.log('[Redi V7] 🛑 Response cancelled');
        session.isAssistantSpeaking = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
        break;

      // Ignore these
      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':
        break;
    }
  } catch (error) {
    console.error(`[Redi V7] Parse error:`, error);
    session.errors++;
  }
}

// =============================================================================
// SPEECH HANDLING
// =============================================================================

function handleSpeechStarted(session: Session): void {
  session.isUserSpeaking = true;
  session.currentTurnHandled = false;  // New turn starting
  console.log('[Redi V7] 🎤 User speaking...');
  
  // Request fresh frame immediately
  requestFreshFrame(session);
  
  // Barge-in: cancel any active response
  if (session.isAssistantSpeaking) {
    console.log('[Redi V7] 🛑 BARGE-IN: Cancelling response');
    sendToClient(session, { type: 'stop_audio' });
    sendToOpenAI(session, { type: 'response.cancel' });
    session.isAssistantSpeaking = false;
  }
}

function handleSpeechStopped(session: Session): void {
  session.isUserSpeaking = false;
  console.log('[Redi V7] 🎤 User stopped speaking');
  
  // Save current frame for the upcoming response
  if (session.currentFrame && (Date.now() - session.frameTimestamp) < MAX_FRAME_AGE_MS) {
    session.pendingFrame = session.currentFrame;
    const sizeKB = Math.round(session.currentFrame.length * 0.75 / 1024);
    console.log(`[Redi V7] 📷 Frame saved: ${sizeKB}KB`);
  } else {
    session.pendingFrame = null;
    console.log('[Redi V7] 📷 No fresh frame available');
  }
}

function handleTranscriptCompleted(session: Session, transcript: string, itemId: string): void {
  console.log(`[Redi V7] 👤 User: "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  // Prevent handling the same turn twice
  if (session.currentTurnHandled) {
    console.log('[Redi V7] ⚠️ Turn already handled, skipping');
    return;
  }
  session.currentTurnHandled = true;
  
  // CRITICAL: Inject image FIRST, then trigger response
  const hasImage = injectImageIfAvailable(session);
  
  // Now trigger the response manually
  console.log(`[Redi V7] 🚀 Triggering response (image: ${hasImage ? 'YES' : 'NO'})`);
  sendToOpenAI(session, { type: 'response.create' });
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
  
  // Don't log "active response" errors - they're expected when we race
  if (errorCode === 'conversation_already_has_active_response') {
    console.log('[Redi V7] ⚠️ Response already active (expected race condition)');
    return;
  }
  
  console.error(`[Redi V7] ❌ OpenAI Error [${errorCode}]: ${errorMsg}`);
  session.errors++;
}

// =============================================================================
// IMAGE INJECTION
// =============================================================================

function requestFreshFrame(session: Session): void {
  sendToClient(session, { type: 'request_frame' });
  console.log('[Redi V7] 📷 Requested fresh frame');
}

function injectImageIfAvailable(session: Session): boolean {
  // Try pending frame first, then current frame
  let frameToUse = session.pendingFrame;
  if (!frameToUse && session.currentFrame && (Date.now() - session.frameTimestamp) < MAX_FRAME_AGE_MS) {
    frameToUse = session.currentFrame;
  }
  
  if (!frameToUse) {
    console.log('[Redi V7] 📷 No image available');
    return false;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  const cleanBase64 = frameToUse.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi V7] 📷 Injecting image: ${sizeKB}KB, age ${frameAge}ms`);

  // Create conversation item with image
  const imageItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '[Camera view attached]'
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
  session.pendingFrame = null;
  
  console.log(`[Redi V7] ✅ Image injected (total: ${session.imagesInjected})`);
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
