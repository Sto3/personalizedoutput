/**
 * Redi V7 Server - PRODUCTION-GRADE RELIABILITY
 * =============================================
 * 
 * Complete rewrite for military-grade reliability.
 * Every edge case handled. Every state tracked.
 * 
 * KEY IMPROVEMENTS OVER V6:
 * 1. Response state machine (pending → active → complete)
 * 2. Barge-in handling with response.cancel
 * 3. Fresh frame requests at optimal moment
 * 4. Response queuing to prevent collisions
 * 5. Audio stop signal on interruption
 * 6. Higher image quality (768px, 85% JPEG)
 * 7. Stricter frame freshness (2 sec max)
 * 8. Enhanced system prompt for accuracy
 * 9. Graceful error recovery
 * 10. gpt-realtime GA model with VISION SUPPORT
 * 11. GA API nested audio format (fixed Jan 20)
 * 12. WAIT FOR FRESH FRAME before responding (Option C fix)
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

// CRITICAL: Use gpt-realtime (GA) instead of gpt-4o-realtime-preview
// The preview model does NOT support vision! Only gpt-realtime does.
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

// Frame quality settings
const MAX_FRAME_AGE_MS = 2000;  // Max 2 seconds old
const FRAME_WAIT_TIMEOUT_MS = 500;  // Wait up to 500ms for fresh frame
const FRAME_CHECK_INTERVAL_MS = 50;  // Check every 50ms if frame arrived

// =============================================================================
// TYPES
// =============================================================================

type ResponseState = 'idle' | 'pending' | 'waiting_for_frame' | 'active' | 'cancelling';

interface PendingResponse {
  transcript: string;
  timestamp: number;
}

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  
  // Frame management
  currentFrame: string | null;
  frameTimestamp: number;
  pendingFrameRequest: boolean;
  frameWaitTimer: NodeJS.Timeout | null;
  
  // Response state machine
  responseState: ResponseState;
  currentResponseId: string | null;
  pendingResponses: PendingResponse[];
  currentPendingTranscript: string | null;
  
  // Speaking states
  isUserSpeaking: boolean;
  lastTranscript: string;
  
  // Stats
  connectionTime: number;
  responsesCompleted: number;
  responsesCancelled: number;
  imagesInjected: number;
  framesWaitedFor: number;
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
1. ONLY describe what you can ACTUALLY SEE in the image. Never guess or assume.
2. If you cannot clearly read text, say "I can see text but can't read it clearly"
3. If asked about something not visible, say "I don't see that in the current view"
4. Be SPECIFIC: "I see 5 items" not "I see several items"
5. For screens/UIs: describe layout, colors, icons, and any readable text
6. Express uncertainty: "I think that's..." or "It looks like..." when not 100% sure
7. NEVER make up details. If the image is blurry or unclear, say so.

WHEN NO IMAGE IS PROVIDED:
- Say "I don't have a camera view right now" 
- Never pretend to see something you can't

RESPONSE STYLE:
- Be concise (under 40 words unless detail is needed)
- Natural, conversational tone
- No filler phrases like "Great question!"
- Speak like a helpful friend

LANGUAGE: Always respond in English.

ACCURACY IS MORE IMPORTANT THAN SPEED. Take your time to describe correctly.`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 Starting V7 Server - PRODUCTION GRADE');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Model: gpt-realtime (GA with VISION)');
  console.log('[Redi V7] Version: Jan 20 2026 - WAIT FOR FRAME FIX');
  console.log('[Redi V7] Features:');
  console.log('[Redi V7]   ✓ Response state machine');
  console.log('[Redi V7]   ✓ Barge-in with response.cancel');
  console.log('[Redi V7]   ✓ WAIT FOR FRESH FRAME (up to 500ms)');
  console.log('[Redi V7]   ✓ 2-second max frame age');
  console.log('[Redi V7]   ✓ IMAGE INPUT SUPPORTED (gpt-realtime GA)');
  console.log('[Redi V7]   ✓ GA NESTED AUDIO FORMAT');
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
      frameWaitTimer: null,
      responseState: 'idle',
      currentResponseId: null,
      pendingResponses: [],
      currentPendingTranscript: null,
      isUserSpeaking: false,
      lastTranscript: '',
      connectionTime: Date.now(),
      responsesCompleted: 0,
      responsesCancelled: 0,
      imagesInjected: 0,
      framesWaitedFor: 0,
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
      console.log(`[Redi V7] 🔌 Disconnected: ${sessionId} (${duration}s, ${session.responsesCompleted} responses, ${session.imagesInjected} images, ${session.framesWaitedFor} waits)`);
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
    console.log(`[Redi V7] 🔗 Connecting to OpenAI (gpt-realtime GA)...`);

    // NOTE: For GA API, we do NOT include OpenAI-Beta header
    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    ws.on('open', () => {
      console.log(`[Redi V7] ✅ Connected to OpenAI (gpt-realtime)`);
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
// SESSION CONFIGURATION - GA API NESTED AUDIO FORMAT
// =============================================================================

function configureSession(session: Session): void {
  // CRITICAL: GA API uses NESTED audio object, not flat properties
  const config = {
    type: 'session.update',
    session: {
      type: 'realtime',
      model: 'gpt-realtime',
      instructions: SYSTEM_PROMPT,
      output_modalities: ['audio'],
      audio: {
        input: {
          format: {
            type: 'audio/pcm',
            rate: 24000
          },
          transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        },
        output: {
          format: {
            type: 'audio/pcm',
            rate: 24000
          },
          voice: 'alloy'
        }
      }
    }
  };

  console.log('[Redi V7] 🔧 Configuring session (GA nested audio format)...');
  console.log('[Redi V7] 📋 Config: type=realtime, model=gpt-realtime, voice=alloy');
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
      session.pendingFrameRequest = false;
      
      console.log(`[Redi V7] 📷 Frame received: ${frameSizeKB}KB`);
      
      // If we're waiting for a frame, process the response now!
      if (session.responseState === 'waiting_for_frame' && session.currentPendingTranscript) {
        console.log('[Redi V7] 📷 Frame arrived while waiting - processing now!');
        clearFrameWaitTimer(session);
        triggerResponseWithImage(session, session.currentPendingTranscript);
      }
      break;

    case 'mode':
    case 'sensitivity':
      // Acknowledged
      break;

    default:
      console.log(`[Redi V7] Unknown message: ${message.type}`);
  }
}

// =============================================================================
// OPENAI MESSAGE HANDLING - STATE MACHINE
// =============================================================================

function handleOpenAIMessage(session: Session, data: Buffer): void {
  try {
    const event = JSON.parse(data.toString());
    
    switch (event.type) {
      case 'session.created':
        console.log('[Redi V7] Session created');
        break;

      case 'session.updated':
        console.log('[Redi V7] ✅ Session configured successfully');
        if (event.session) {
          const voice = event.session.audio?.output?.voice || event.session.voice || 'unknown';
          const model = event.session.model || 'unknown';
          console.log(`[Redi V7] 📋 Effective config: model=${model}, voice=${voice}`);
        }
        break;

      case 'error':
        handleOpenAIError(session, event.error);
        break;

      case 'input_audio_buffer.speech_started':
        handleUserStartedSpeaking(session);
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        console.log('[Redi V7] 🎤 User stopped speaking');
        // Request fresh frame NOW - this is the key timing!
        requestFreshFrame(session);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          handleTranscriptCompleted(session, event.transcript);
        }
        break;

      case 'response.created':
        session.responseState = 'active';
        session.currentResponseId = event.response?.id || null;
        sendToClient(session, { type: 'mute_mic', muted: true });
        break;

      case 'response.audio.delta':
      case 'response.output_audio.delta':
        const audioData = event.delta || event.data;
        if (audioData) {
          sendToClient(session, { type: 'audio', data: audioData });
        }
        break;

      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        if (event.transcript) {
          console.log(`[Redi V7] 🤖 Redi: "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        handleResponseDone(session, event);
        break;

      case 'response.cancelled':
        console.log('[Redi V7] 🛑 Response cancelled');
        session.responseState = 'idle';
        session.currentResponseId = null;
        session.responsesCancelled++;
        processNextPendingResponse(session);
        break;

      case 'conversation.item.created':
      case 'conversation.item.added':
        logConversationItem(event);
        break;

      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':
        break;

      default:
        if (!event.type.includes('delta')) {
          // Log other events for debugging
        }
    }
  } catch (error) {
    console.error(`[Redi V7] Parse error:`, error);
    session.errors++;
  }
}

// =============================================================================
// STATE MACHINE HANDLERS
// =============================================================================

function handleUserStartedSpeaking(session: Session): void {
  session.isUserSpeaking = true;
  console.log('[Redi V7] 🎤 User speaking...');
  
  // BARGE-IN: If Redi is currently responding, cancel it
  if (session.responseState === 'active' && session.currentResponseId) {
    console.log('[Redi V7] 🛑 BARGE-IN: Cancelling current response');
    session.responseState = 'cancelling';
    
    sendToClient(session, { type: 'stop_audio' });
    sendToOpenAI(session, { type: 'response.cancel' });
  }
  
  // Also cancel if we're waiting for a frame
  if (session.responseState === 'waiting_for_frame') {
    console.log('[Redi V7] 🛑 BARGE-IN: Cancelling frame wait');
    clearFrameWaitTimer(session);
    session.responseState = 'idle';
    session.currentPendingTranscript = null;
  }
}

function handleTranscriptCompleted(session: Session, transcript: string): void {
  session.lastTranscript = transcript;
  console.log(`[Redi V7] 👤 User: "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  const pendingResponse: PendingResponse = {
    transcript,
    timestamp: Date.now()
  };
  
  if (session.responseState === 'idle') {
    processResponse(session, pendingResponse);
  } else {
    console.log(`[Redi V7] 📋 Queued response (state: ${session.responseState})`);
    session.pendingResponses.push(pendingResponse);
  }
}

function handleResponseDone(session: Session, event: any): void {
  session.responseState = 'idle';
  session.currentResponseId = null;
  session.currentPendingTranscript = null;
  session.responsesCompleted++;
  
  sendToClient(session, { type: 'mute_mic', muted: false });
  console.log('[Redi V7] ✅ Response complete');
  
  processNextPendingResponse(session);
}

function handleOpenAIError(session: Session, error: any): void {
  const errorCode = error?.code || 'unknown';
  const errorMsg = error?.message || 'Unknown error';
  
  console.error(`[Redi V7] ❌ OpenAI Error [${errorCode}]: ${errorMsg}`);
  session.errors++;
  
  if (errorCode === 'conversation_already_has_active_response') {
    console.log('[Redi V7] ⚠️ Response collision - waiting for current to complete');
  } else if (errorCode === 'image_input_not_supported') {
    console.error('[Redi V7] ❌ CRITICAL: Model does not support images! Check OPENAI_REALTIME_URL');
    sendToClient(session, { type: 'error', message: 'Vision not available - wrong model' });
  } else if (errorCode === 'invalid_session_update') {
    console.error('[Redi V7] ❌ Invalid session config:', JSON.stringify(error, null, 2));
  } else {
    sendToClient(session, { type: 'error', message: errorMsg });
  }
}

// =============================================================================
// RESPONSE PROCESSING - OPTION C: WAIT FOR FRESH FRAME
// =============================================================================

function processNextPendingResponse(session: Session): void {
  if (session.pendingResponses.length === 0) return;
  if (session.responseState !== 'idle') return;
  
  const next = session.pendingResponses.shift()!;
  const age = Date.now() - next.timestamp;
  
  if (age > 10000) {
    console.log(`[Redi V7] ⏭️ Skipping stale queued response (${age}ms old)`);
    processNextPendingResponse(session);
    return;
  }
  
  processResponse(session, next);
}

function processResponse(session: Session, pending: PendingResponse): void {
  // Check if we already have a fresh frame
  const frameAge = Date.now() - session.frameTimestamp;
  const haveFreshFrame = session.currentFrame && frameAge <= MAX_FRAME_AGE_MS;
  
  if (haveFreshFrame) {
    // Great! We have a fresh frame, respond immediately
    console.log(`[Redi V7] 📷 Fresh frame available (${frameAge}ms old), responding immediately`);
    triggerResponseWithImage(session, pending.transcript);
  } else {
    // No fresh frame - request one and wait
    console.log(`[Redi V7] ⏳ No fresh frame, requesting and waiting up to ${FRAME_WAIT_TIMEOUT_MS}ms...`);
    session.responseState = 'waiting_for_frame';
    session.currentPendingTranscript = pending.transcript;
    session.framesWaitedFor++;
    
    // Request fresh frame
    requestFreshFrame(session);
    
    // Set timeout - if no frame arrives, respond anyway
    session.frameWaitTimer = setTimeout(() => {
      if (session.responseState === 'waiting_for_frame') {
        console.log('[Redi V7] ⏰ Frame wait timeout - responding without fresh image');
        triggerResponseWithImage(session, session.currentPendingTranscript || pending.transcript);
      }
    }, FRAME_WAIT_TIMEOUT_MS);
  }
}

function triggerResponseWithImage(session: Session, transcript: string): void {
  session.responseState = 'pending';
  session.currentPendingTranscript = null;
  
  // Try to inject image
  const injected = maybeInjectImage(session, transcript);
  
  console.log(`[Redi V7] 📤 Triggering response (image: ${injected})`);
  sendToOpenAI(session, { type: 'response.create' });
}

function clearFrameWaitTimer(session: Session): void {
  if (session.frameWaitTimer) {
    clearTimeout(session.frameWaitTimer);
    session.frameWaitTimer = null;
  }
}

// =============================================================================
// IMAGE INJECTION
// =============================================================================

function requestFreshFrame(session: Session): void {
  if (!session.pendingFrameRequest) {
    session.pendingFrameRequest = true;
    console.log('[Redi V7] 📷 Requesting fresh frame from iOS...');
    sendToClient(session, { type: 'request_frame' });
  }
}

function maybeInjectImage(session: Session, transcript: string): boolean {
  if (!session.currentFrame) {
    console.log('[Redi V7] 📷 No frame available');
    return false;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > MAX_FRAME_AGE_MS) {
    console.log(`[Redi V7] 📷 Frame too old (${frameAge}ms > ${MAX_FRAME_AGE_MS}ms)`);
    return false;
  }

  const cleanBase64 = session.currentFrame.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi V7] 📷 Injecting image: ${sizeKB}KB, age ${frameAge}ms`);

  const imageItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `[Camera view attached - user said: "${transcript}"]`
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

function logConversationItem(event: any): void {
  const contentTypes = event.item?.content?.map((c: any) => c.type) || [];
  if (contentTypes.length > 0) {
    console.log(`[Redi V7] 📥 Item created: [${contentTypes.join(', ')}]`);
    if (contentTypes.includes('input_image')) {
      console.log(`[Redi V7] ✅ IMAGE ACCEPTED BY MODEL`);
    }
  }
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
    clearFrameWaitTimer(session);
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
    cancelled: s.responsesCancelled,
    images: s.imagesInjected,
    framesWaited: s.framesWaitedFor,
    errors: s.errors,
    state: s.responseState
  }));
  
  return {
    activeSessions: sessions.size,
    sessions: sessionStats
  };
}
