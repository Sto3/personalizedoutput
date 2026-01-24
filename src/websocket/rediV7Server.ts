/**
 * Redi V7 Server - INSTANT RESPONSE AT SPEECH STOP
 * =================================================
 * 
 * THE BREAKTHROUGH:
 * OpenAI's Whisper transcription takes ~1000ms.
 * We CANNOT speed this up.
 * But we CAN respond BEFORE the transcript arrives!
 * 
 * HOW IT WORKS:
 * 1. User speaks "What do you see?"
 * 2. VAD detects speech stopped
 * 3. IMMEDIATELY inject latest frame + trigger response
 * 4. Don't wait for Whisper transcription!
 * 
 * The transcript will arrive ~1000ms later, but we've already
 * sent the image. OpenAI will use the audio + image together.
 * 
 * This saves the ENTIRE Whisper latency (~1000ms)!
 * 
 * RESTORED: 2026-01-24 from v7-stable-jan22-2026 branch
 * This is the FULL CAPABILITY version with:
 * - gpt-realtime (full model, NOT mini)
 * - Full system prompt with RULES
 * - Whisper transcription enabled
 * - Default TTS speed
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
  
  // Frame management
  latestFrame: string | null;
  latestFrameTime: number;
  
  // Speaking states
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  speechStartTime: number;
  
  // Prevent double responses
  responseTriggeredForTurn: boolean;
  
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
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Redi. You see through a phone camera in real-time.

RULES:
- Describe ONLY what's in the attached image
- Be brief: 10-20 words max
- Never say "I see" - just describe directly
- The image shows what the user is looking at RIGHT NOW`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 STABLE - FULL CAPABILITY VERSION');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Restored from: v7-stable-jan22-2026');
  console.log('[Redi V7] Model: gpt-realtime (FULL, not mini)');
  console.log('[Redi V7] Transcription: Whisper-1 ENABLED');
  console.log('[Redi V7] TTS Speed: Default (natural)');
  console.log('[Redi V7] System Prompt: Full RULES included');
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
      responseTriggeredForTurn: false,
      connectionTime: Date.now(),
      responsesCompleted: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
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
        silence_duration_ms: 400  // Fast detection
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
        session.responseTriggeredForTurn = false;  // New turn
        session.speechStartTime = Date.now();
        console.log('[Redi V7] 🎤 Speaking...');
        
        // Request fresh frame
        sendToClient(session, { type: 'request_frame' });
        
        // Barge-in
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
        
        // ═══════════════════════════════════════════════════════════
        // THE KEY CHANGE: Respond NOW, don't wait for transcript!
        // ═══════════════════════════════════════════════════════════
        if (!session.responseTriggeredForTurn) {
          session.responseTriggeredForTurn = true;
          
          // Request fresh frame and trigger response immediately
          sendToClient(session, { type: 'request_frame' });
          
          // Small delay to let fresh frame arrive
          setTimeout(() => {
            triggerResponseWithLatestFrame(session);
          }, 50);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // We still receive this, but we've already triggered the response!
        // Just log it for debugging
        if (event.transcript) {
          console.log(`[Redi V7] 📝 (Transcript arrived late): "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
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
// RESPONSE TRIGGERING
// =============================================================================

function triggerResponseWithLatestFrame(session: Session): void {
  const frameAge = session.latestFrame ? Date.now() - session.latestFrameTime : Infinity;
  
  if (session.latestFrame && frameAge < 1000) {
    const cleanBase64 = session.latestFrame.replace(/[\r\n\s]/g, '');
    const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);
    
    console.log(`[Redi V7] 📷 Injecting ${sizeKB}KB (${frameAge}ms old) at SPEECH STOP`);
    
    // Inject image with context
    sendToOpenAI(session, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: '[User just asked about this - describe what you see:]'
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${cleanBase64}`
          }
        ]
      }
    });
    
    console.log(`[Redi V7] 🚀 INSTANT RESPONSE (skipped Whisper wait!)`);
  } else {
    console.log(`[Redi V7] ⚠️ No fresh frame - responding without image`);
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
