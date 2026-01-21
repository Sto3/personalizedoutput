/**
 * Redi Production Server - UNIFIED PRODUCTION-GRADE RELIABILITY
 * ==============================================================
 *
 * Complete rewrite for military-grade reliability.
 * Every edge case handled. Every state tracked.
 *
 * This is the canonical production server for Redi.
 * NO VERSION NUMBERS - this is the single source of truth.
 *
 * KEY FEATURES:
 * 1. Response state machine (pending → active → complete)
 * 2. Barge-in handling with response.cancel
 * 3. Wait for fresh frame before responding
 * 4. NO RESPONSE QUEUING - prevents duplicate responses
 * 5. Audio stop signal on interruption
 * 6. gpt-realtime GA model with VISION SUPPORT
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
const MAX_FRAME_AGE_MS = 2000;
const FRAME_WAIT_TIMEOUT_MS = 500;

// =============================================================================
// TYPES
// =============================================================================

type ResponseState = 'idle' | 'waiting_for_frame' | 'active' | 'cancelling';

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
  currentPendingTranscript: string | null;

  // Speaking states
  isUserSpeaking: boolean;
  lastTranscript: string;

  // Stats
  connectionTime: number;
  responsesCompleted: number;
  responsesCancelled: number;
  responsesDropped: number;
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
1. ONLY describe what you can ACTUALLY SEE in the image. Never guess or assume.
2. If you cannot clearly read text, say "I can see text but can't read it clearly"
3. If asked about something not visible, say "I don't see that in the current view"
4. Be SPECIFIC about locations: use "left side", "right side", "center", "top", "bottom"
5. For app icons: describe by COLOR and SHAPE, give EXACT position (e.g., "5th icon from left")
6. Express uncertainty: "I think that's..." or "It looks like..." when not 100% sure
7. NEVER make up details. If the image is blurry or unclear, say so.
8. For horizontal docks: count icons from LEFT to RIGHT, not top to bottom

WHEN NO IMAGE IS PROVIDED:
- Say "I don't have a camera view right now"
- Never pretend to see something you can't

RESPONSE STYLE:
- Be concise (under 40 words unless detail is needed)
- Natural, conversational tone
- No filler phrases like "Great question!"
- Don't repeat yourself

LANGUAGE: Always respond in English.`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediServer(server: HTTPServer): Promise<void> {
  console.log('[Redi] ═══════════════════════════════════════════');
  console.log('[Redi] 🚀 Starting Production Server');
  console.log('[Redi] ═══════════════════════════════════════════');
  console.log('[Redi] Model: gpt-realtime (GA with VISION)');
  console.log('[Redi] Version: Production - No Queue');
  console.log('[Redi] Features:');
  console.log('[Redi]   ✓ Wait for fresh frame (up to 500ms)');
  console.log('[Redi]   ✓ NO RESPONSE QUEUING (prevents duplicates)');
  console.log('[Redi]   ✓ Barge-in with response.cancel');
  console.log('[Redi]   ✓ IMAGE INPUT SUPPORTED');
  console.log('[Redi] ═══════════════════════════════════════════');

  if (!OPENAI_API_KEY) {
    console.error('[Redi] ❌ OPENAI_API_KEY not set!');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi] 🔌 New connection: ${sessionId}`);

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
      currentPendingTranscript: null,
      isUserSpeaking: false,
      lastTranscript: '',
      connectionTime: Date.now(),
      responsesCompleted: 0,
      responsesCancelled: 0,
      responsesDropped: 0,
      imagesInjected: 0,
      errors: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
      console.log(`[Redi] ✅ Session ${sessionId} ready`);
    } catch (error) {
      console.error(`[Redi] ❌ Failed to connect to OpenAI:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        console.error(`[Redi] Parse error:`, error);
      }
    });

    ws.on('close', (code) => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi] 🔌 Disconnected: ${sessionId} (${duration}s, ${session.responsesCompleted} responses, ${session.imagesInjected} images, ${session.responsesDropped} dropped)`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi] Client error:`, error);
      cleanup(sessionId);
    });
  });

  console.log('[Redi] WebSocket server initialized on /ws/redi?v=7');
}

export function handleRediUpgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) {
    console.error('[Redi] ❌ WSS not initialized');
    return false;
  }

  console.log(`[Redi] 🔄 Handling upgrade for connection`);
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
    console.log(`[Redi] 🔗 Connecting to OpenAI...`);

    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    ws.on('open', () => {
      console.log(`[Redi] ✅ Connected to OpenAI`);
      session.openaiWs = ws;
      configureSession(session);
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      handleOpenAIMessage(session, data);
    });

    ws.on('error', (error) => {
      console.error(`[Redi] ❌ OpenAI error:`, error);
      session.errors++;
      reject(error);
    });

    ws.on('close', (code) => {
      console.log(`[Redi] OpenAI closed: code=${code}`);
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

  console.log('[Redi] 🔧 Configuring session...');
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

      console.log(`[Redi] 📷 Frame: ${frameSizeKB}KB`);

      // If we're waiting for a frame, process now!
      if (session.responseState === 'waiting_for_frame' && session.currentPendingTranscript) {
        console.log('[Redi] 📷 Frame arrived - processing response!');
        clearFrameWaitTimer(session);
        triggerResponseWithImage(session, session.currentPendingTranscript);
      }
      break;

    case 'mode':
    case 'sensitivity':
      break;

    default:
      console.log(`[Redi] Unknown message: ${message.type}`);
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
        console.log('[Redi] Session created');
        break;

      case 'session.updated':
        console.log('[Redi] ✅ Session configured');
        break;

      case 'error':
        handleOpenAIError(session, event.error);
        break;

      case 'input_audio_buffer.speech_started':
        handleUserStartedSpeaking(session);
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        console.log('[Redi] 🎤 User stopped');
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
          console.log(`[Redi] 🤖 Redi: "${event.transcript)}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        handleResponseDone(session);
        break;

      case 'response.cancelled':
        console.log('[Redi] 🛑 Response cancelled');
        session.responseState = 'idle';
        session.currentResponseId = null;
        session.responsesCancelled++;
        break;

      case 'conversation.item.created':
      case 'conversation.item.added':
        logConversationItem(event);
        break;

      case 'rate_limits.updated':
      case 'input_audio_buffer.committed':
      case 'input_audio_buffer.cleared':
        break;
    }
  } catch (error) {
    console.error(`[Redi] Parse error:`, error);
    session.errors++;
  }
}

// =============================================================================
// STATE MACHINE HANDLERS
// =============================================================================

function handleUserStartedSpeaking(session: Session): void {
  session.isUserSpeaking = true;
  console.log('[Redi] 🎤 User speaking...');

  // BARGE-IN: Cancel any active response
  if (session.responseState === 'active' && session.currentResponseId) {
    console.log('[Redi] 🛑 BARGE-IN: Cancelling response');
    session.responseState = 'cancelling';
    sendToClient(session, { type: 'stop_audio' });
    sendToOpenAI(session, { type: 'response.cancel' });
  }

  // Cancel frame wait
  if (session.responseState === 'waiting_for_frame') {
    console.log('[Redi] 🛑 BARGE-IN: Cancelling frame wait');
    clearFrameWaitTimer(session);
    session.responseState = 'idle';
    session.currentPendingTranscript = null;
  }
}

function handleTranscriptCompleted(session: Session, transcript: string): void {
  session.lastTranscript = transcript;
  console.log(`[Redi] 👤 User: "${transcript)}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });

  // CRITICAL: Don't queue - if we're busy, just drop it
  // The transcript is already in OpenAI's conversation, so it won't be lost
  if (session.responseState !== 'idle') {
    console.log(`[Redi] ⏭️ Dropping response trigger (state: ${session.responseState}) - transcript already in conversation`);
    session.responsesDropped++;
    return;
  }

  processResponse(session, transcript);
}

function handleResponseDone(session: Session): void {
  session.responseState = 'idle';
  session.currentResponseId = null;
  session.currentPendingTranscript = null;
  session.responsesCompleted++;

  sendToClient(session, { type: 'mute_mic', muted: false });
  console.log('[Redi] ✅ Response complete');
}

function handleOpenAIError(session: Session, error: any): void {
  const errorCode = error?.code || 'unknown';
  const errorMsg = error?.message || 'Unknown error';

  console.error(`[Redi] ❌ OpenAI Error [${errorCode}]: ${errorMsg}`);
  session.errors++;

  if (errorCode === 'image_input_not_supported') {
    console.error('[Redi] ❌ CRITICAL: Model does not support images!');
  }

  sendToClient(session, { type: 'error', message: errorMsg });
}

// =============================================================================
// RESPONSE PROCESSING
// =============================================================================

function processResponse(session: Session, transcript: string): void {
  const frameAge = Date.now() - session.frameTimestamp;
  const haveFreshFrame = session.currentFrame && frameAge <= MAX_FRAME_AGE_MS;

  if (haveFreshFrame) {
    console.log(`[Redi] 📷 Fresh frame (${frameAge}ms old)`);
    triggerResponseWithImage(session, transcript);
  } else {
    console.log(`[Redi] ⏳ Waiting for fresh frame...`);
    session.responseState = 'waiting_for_frame';
    session.currentPendingTranscript = transcript;

    requestFreshFrame(session);

    session.frameWaitTimer = setTimeout(() => {
      if (session.responseState === 'waiting_for_frame') {
        console.log('[Redi] ⏰ Frame timeout - responding anyway');
        triggerResponseWithImage(session, session.currentPendingTranscript || transcript);
      }
    }, FRAME_WAIT_TIMEOUT_MS);
  }
}

function triggerResponseWithImage(session: Session, transcript: string): void {
  session.responseState = 'active';
  session.currentPendingTranscript = null;

  const injected = maybeInjectImage(session, transcript);

  console.log(`[Redi] 📤 Triggering response (image: ${injected})`);
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
    sendToClient(session, { type: 'request_frame' });
  }
}

function maybeInjectImage(session: Session, transcript: string): boolean {
  if (!session.currentFrame) {
    console.log('[Redi] 📷 No frame available');
    return false;
  }

  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > MAX_FRAME_AGE_MS) {
    console.log(`[Redi] 📷 Frame too old (${frameAge}ms)`);
    return false;
  }

  const cleanBase64 = session.currentFrame.replace(/[\r\n\s]/g, '');
  const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

  console.log(`[Redi] 📷 Injecting: ${sizeKB}KB, ${frameAge}ms old`);

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
  if (contentTypes.includes('input_image')) {
    console.log(`[Redi] ✅ IMAGE ACCEPTED`);
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
    console.log(`[Redi] Cleaned up: ${sessionId}`);
  }
}

export function closeRediServer(): void {
  sessions.forEach((_, id) => cleanup(id));
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi] Server closed');
  }
}

export function getRediStats(): object {
  const sessionStats = Array.from(sessions.values()).map(s => ({
    id: s.id.slice(0, 8),
    uptime: Math.round((Date.now() - s.connectionTime) / 1000),
    responses: s.responsesCompleted,
    cancelled: s.responsesCancelled,
    dropped: s.responsesDropped,
    images: s.imagesInjected,
    errors: s.errors,
    state: s.responseState
  }));

  return {
    activeSessions: sessions.size,
    sessions: sessionStats
  };
}

// =============================================================================
// LEGACY ALIASES (for backward compatibility)
// =============================================================================

/** @deprecated Use initRediServer instead */
export const initRediV7 = initRediServer;

/** @deprecated Use handleRediUpgrade instead */
export const handleV7Upgrade = handleRediUpgrade;

/** @deprecated Use closeRediServer instead */
export const closeRediV7 = closeRediServer;

/** @deprecated Use getRediStats instead */
export const getV7Stats = getRediStats;
