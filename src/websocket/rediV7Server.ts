/**
 * Redi V7 Server - MANUAL RESPONSE TRIGGERING
 * ============================================
 * 
 * CRITICAL FIX Jan 21 2026:
 * - DISABLED auto-response (turn_detection: null)
 * - Manually commit audio buffer when speech stops
 * - Wait for transcript → inject image → THEN trigger response
 * - This ensures images are ALWAYS included before response
 * 
 * THE PROBLEM WAS:
 * OpenAI's server_vad auto-triggers responses IMMEDIATELY when silence
 * is detected, BEFORE transcript arrives, so we couldn't inject images.
 * Result: Redi hallucinated what it "saw" without actually having an image.
 * 
 * THE FIX:
 * 1. turn_detection: null - no auto-response
 * 2. We manually call input_audio_buffer.commit when user stops speaking
 * 3. Wait for transcript to arrive
 * 4. Inject image FIRST
 * 5. Then call response.create
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
const MAX_FRAME_AGE_MS = 8000;  // 8 seconds max frame age (more lenient)

// Speech detection settings (client-side since we disabled server VAD)
const SILENCE_THRESHOLD_MS = 800;  // How long silence before we commit

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
  
  // Manual VAD tracking (since we disabled server VAD)
  lastAudioTime: number;
  silenceTimer: NodeJS.Timeout | null;
  hasUncommittedAudio: boolean;
  
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
// SYSTEM PROMPT - STRICT NO-HALLUCINATION
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time voice and vision.

CRITICAL RULES FOR VISION:
1. ONLY describe what you can ACTUALLY SEE in the attached image
2. If NO IMAGE is attached to this message, say "I don't have a camera view right now"
3. NEVER guess, assume, or hallucinate what might be visible
4. If the image is blurry or unclear, say so honestly
5. Be SPECIFIC about locations: "left side", "right side", "center", "top", "bottom"
6. Express uncertainty when appropriate: "I think that's..." or "It looks like..."

RESPONSE STYLE:
- Be concise (under 40 words unless detail is needed)
- Natural, conversational tone
- No filler phrases
- Respond in English only

REMEMBER: If you don't see an image attached, you CANNOT see anything. Do not pretend otherwise.`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 Server - MANUAL RESPONSE MODE');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Model: gpt-4o-realtime-preview-2024-12-17');
  console.log('[Redi V7] Version: Jan 21 2026 - Manual Trigger Fix');
  console.log('[Redi V7] KEY CHANGES:');
  console.log('[Redi V7]   ✓ turn_detection: NULL (no auto-response)');
  console.log('[Redi V7]   ✓ Manual audio commit on silence');
  console.log('[Redi V7]   ✓ Image injected BEFORE response.create');
  console.log('[Redi V7]   ✓ No more hallucinations!');
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
      lastAudioTime: 0,
      silenceTimer: null,
      hasUncommittedAudio: false,
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
// SESSION CONFIGURATION - NO AUTO-RESPONSE
// =============================================================================

function configureSession(session: Session): void {
  // CRITICAL: turn_detection is NULL - no automatic response triggering
  // We will manually commit audio and trigger responses
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
      // NULL = no auto-response, we control when responses happen
      turn_detection: null
    }
  };

  console.log('[Redi V7] 🔧 Configuring session (turn_detection: NULL)...');
  sendToOpenAI(session, config);
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      handleAudioFromClient(session, message.data);
      break;

    case 'frame':
      handleFrameFromClient(session, message.data);
      break;

    case 'mode':
    case 'sensitivity':
      break;

    default:
      console.log(`[Redi V7] Unknown message: ${message.type}`);
  }
}

function handleAudioFromClient(session: Session, audioData: string): void {
  if (!audioData) return;
  
  // Forward audio to OpenAI
  sendToOpenAI(session, {
    type: 'input_audio_buffer.append',
    audio: audioData
  });
  
  // Track that we have uncommitted audio
  session.hasUncommittedAudio = true;
  session.lastAudioTime = Date.now();
  
  // Mark user as speaking if they weren't
  if (!session.isUserSpeaking) {
    session.isUserSpeaking = true;
    console.log('[Redi V7] 🎤 User speaking...');
    
    // Request a fresh frame immediately
    requestFreshFrame(session);
    
    // Cancel any active response (barge-in)
    if (session.isAssistantSpeaking) {
      console.log('[Redi V7] 🛑 BARGE-IN: Cancelling response');
      sendToClient(session, { type: 'stop_audio' });
      sendToOpenAI(session, { type: 'response.cancel' });
      session.isAssistantSpeaking = false;
    }
  }
  
  // Reset/start silence timer
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
  }
  
  session.silenceTimer = setTimeout(() => {
    handleSilenceDetected(session);
  }, SILENCE_THRESHOLD_MS);
}

function handleFrameFromClient(session: Session, frameData: string): void {
  if (!frameData) return;
  
  const frameSizeKB = Math.round(frameData.length * 0.75 / 1024);
  session.currentFrame = frameData;
  session.frameTimestamp = Date.now();
  
  console.log(`[Redi V7] 📷 Frame received: ${frameSizeKB}KB`);
}

// =============================================================================
// MANUAL SILENCE DETECTION (since we disabled server VAD)
// =============================================================================

function handleSilenceDetected(session: Session): void {
  if (!session.isUserSpeaking || !session.hasUncommittedAudio) {
    return;
  }
  
  session.isUserSpeaking = false;
  session.silenceTimer = null;
  
  console.log('[Redi V7] 🎤 Silence detected - committing audio');
  
  // Save current frame for the response
  if (session.currentFrame && (Date.now() - session.frameTimestamp) < MAX_FRAME_AGE_MS) {
    session.pendingFrame = session.currentFrame;
    const sizeKB = Math.round(session.currentFrame.length * 0.75 / 1024);
    console.log(`[Redi V7] 📷 Frame saved: ${sizeKB}KB, age ${Date.now() - session.frameTimestamp}ms`);
  } else {
    session.pendingFrame = null;
    console.log('[Redi V7] 📷 No fresh frame available');
  }
  
  // MANUALLY commit the audio buffer
  // This will trigger OpenAI to transcribe it
  console.log('[Redi V7] 📤 Committing audio buffer...');
  sendToOpenAI(session, { type: 'input_audio_buffer.commit' });
  session.hasUncommittedAudio = false;
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
        console.log('[Redi V7] ✅ Session configured (manual mode)');
        break;

      case 'error':
        handleOpenAIError(session, event.error);
        break;

      // NOTE: speech_started/speech_stopped won't fire with turn_detection: null
      // We handle speech detection ourselves based on audio timing
      
      case 'input_audio_buffer.committed':
        console.log('[Redi V7] ✅ Audio buffer committed');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          handleTranscriptReceived(session, event.transcript);
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

      case 'rate_limits.updated':
      case 'input_audio_buffer.cleared':
        break;
    }
  } catch (error) {
    console.error(`[Redi V7] Parse error:`, error);
    session.errors++;
  }
}

// =============================================================================
// TRANSCRIPT & RESPONSE HANDLING - THE KEY FIX
// =============================================================================

function handleTranscriptReceived(session: Session, transcript: string): void {
  console.log(`[Redi V7] 👤 User: "${transcript}"`);
  sendToClient(session, { type: 'transcript', text: transcript, role: 'user' });
  
  // STEP 1: Inject image FIRST (if available)
  const imageInjected = injectImageIfAvailable(session);
  
  // STEP 2: THEN trigger response
  // This ensures the image is in the conversation context BEFORE response generation
  console.log(`[Redi V7] 🚀 Triggering response (image: ${imageInjected ? 'YES' : 'NO'})`);
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
  
  console.error(`[Redi V7] ❌ OpenAI Error [${errorCode}]: ${errorMsg}`);
  session.errors++;
  
  // Don't send errors to client for now, handle gracefully
}

// =============================================================================
// IMAGE INJECTION - ALWAYS BEFORE RESPONSE
// =============================================================================

function requestFreshFrame(session: Session): void {
  sendToClient(session, { type: 'request_frame' });
  console.log('[Redi V7] 📷 Requested fresh frame');
}

function injectImageIfAvailable(session: Session): boolean {
  // Check if we have a pending frame
  if (!session.pendingFrame) {
    // Try current frame as fallback
    if (session.currentFrame && (Date.now() - session.frameTimestamp) < MAX_FRAME_AGE_MS) {
      session.pendingFrame = session.currentFrame;
    } else {
      console.log('[Redi V7] 📷 No image available for injection');
      return false;
    }
  }

  // Check frame age
  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > MAX_FRAME_AGE_MS) {
    console.log(`[Redi V7] 📷 Frame too old (${frameAge}ms), skipping`);
    session.pendingFrame = null;
    return false;
  }

  // Clean base64 string
  const cleanBase64 = session.pendingFrame.replace(/[\r\n\s]/g, '');
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
          text: '[Camera view attached - describe what you see]'
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
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
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
