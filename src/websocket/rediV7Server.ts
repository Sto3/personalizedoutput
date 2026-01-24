/**
 * Redi V7 Server - STABLE WITH AGGRESSIVE ECHO FIX
 * =================================================
 * 
 * BASE: Restored from v7-stable-jan22-2026 (full capability)
 * 
 * ECHO FIX (aggressive):
 * 1. Stop sending audio IMMEDIATELY when response triggers (not when OpenAI confirms)
 * 2. Clear input buffer when response starts
 * 3. Add 500ms cooldown after response ends before accepting new audio
 * 4. Don't respond to speech detected during cooldown period
 * 
 * PRESERVED (full capability):
 * - Model: gpt-realtime (FULL, not mini)
 * - TTS Speed: Default (natural voice)
 * - Max Tokens: Default (full responses)
 * - Transcription: Whisper-1 enabled
 * - System Prompt: Full RULES
 * - Server VAD: Working configuration
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

// Echo prevention: cooldown period after response ends (ms)
const ECHO_COOLDOWN_MS = 500;

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
  
  // Echo prevention
  lastResponseEndTime: number;  // When the last response finished
  
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
  console.log('[Redi V7] 🚀 V7 STABLE + AGGRESSIVE ECHO FIX');
  console.log('[Redi V7] ═══════════════════════════════════════════');
  console.log('[Redi V7] Model: gpt-realtime (FULL capability)');
  console.log('[Redi V7] VAD: server_vad (stable)');
  console.log('[Redi V7] Echo Fix: Early mute + cooldown + buffer clear');
  console.log(`[Redi V7] Cooldown: ${ECHO_COOLDOWN_MS}ms after response`);
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
      lastResponseEndTime: 0,
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
        silence_duration_ms: 400
      }
    }
  });
  
  console.log('[Redi V7] ⚡ Configured with server_vad + aggressive echo fix');
}

// =============================================================================
// ECHO PREVENTION HELPERS
// =============================================================================

function isInCooldown(session: Session): boolean {
  if (session.lastResponseEndTime === 0) return false;
  const timeSinceResponse = Date.now() - session.lastResponseEndTime;
  return timeSinceResponse < ECHO_COOLDOWN_MS;
}

function shouldBlockAudio(session: Session): boolean {
  // Block audio if:
  // 1. Assistant is currently speaking
  // 2. We're in the cooldown period after a response
  return session.isAssistantSpeaking || isInCooldown(session);
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // AGGRESSIVE ECHO FIX: Block audio during speaking AND cooldown
      if (message.data && !shouldBlockAudio(session)) {
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
        console.log('[Redi V7] ✅ Session configured');
        break;

      case 'error':
        console.error(`[Redi V7] ❌ OpenAI error: ${event.error?.message || JSON.stringify(event.error)}`);
        break;

      case 'input_audio_buffer.speech_started':
        // Check if this is likely echo (speech detected during cooldown)
        if (isInCooldown(session)) {
          const cooldownRemaining = ECHO_COOLDOWN_MS - (Date.now() - session.lastResponseEndTime);
          console.log(`[Redi V7] 🔇 Ignoring speech during cooldown (${cooldownRemaining}ms left)`);
          // Clear buffer to discard the echo
          sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
          return;
        }
        
        session.isUserSpeaking = true;
        session.responseTriggeredForTurn = false;
        session.speechStartTime = Date.now();
        console.log('[Redi V7] 🎤 Speaking...');
        
        // Request fresh frame
        sendToClient(session, { type: 'request_frame' });
        
        // Barge-in: interrupt assistant if user starts speaking
        if (session.isAssistantSpeaking) {
          console.log('[Redi V7] 🛑 BARGE-IN');
          sendToClient(session, { type: 'stop_audio' });
          sendToOpenAI(session, { type: 'response.cancel' });
          session.isAssistantSpeaking = false;
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        // Ignore if we were in cooldown (this was echo)
        if (!session.isUserSpeaking) {
          console.log('[Redi V7] 🔇 Ignoring speech_stopped (was in cooldown)');
          return;
        }
        
        session.isUserSpeaking = false;
        const speechDuration = Date.now() - session.speechStartTime;
        console.log(`[Redi V7] 🎤 Stopped (${speechDuration}ms)`);
        
        // Respond NOW, don't wait for transcript
        if (!session.responseTriggeredForTurn) {
          session.responseTriggeredForTurn = true;
          
          // IMMEDIATELY mark as speaking to block further audio
          session.isAssistantSpeaking = true;
          sendToClient(session, { type: 'mute_mic', muted: true });
          
          // Clear any audio that snuck in
          sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
          console.log('[Redi V7] 🔇 Pre-cleared buffer before response');
          
          // Request fresh frame and trigger response
          sendToClient(session, { type: 'request_frame' });
          
          setTimeout(() => {
            triggerResponseWithLatestFrame(session);
          }, 50);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log(`[Redi V7] 📝 "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
        }
        break;

      case 'response.created':
        // Already set isAssistantSpeaking = true earlier, but ensure it's set
        session.isAssistantSpeaking = true;
        // Clear buffer again just in case
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
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
        
        // Start cooldown period
        session.lastResponseEndTime = Date.now();
        console.log(`[Redi V7] ✅ Done (cooldown ${ECHO_COOLDOWN_MS}ms)`);
        
        // Clear buffer to remove any echo that was captured
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        
        // Unmute after cooldown
        setTimeout(() => {
          sendToClient(session, { type: 'mute_mic', muted: false });
          console.log('[Redi V7] 🎤 Cooldown ended, mic unmuted');
        }, ECHO_COOLDOWN_MS);
        break;

      case 'response.cancelled':
        session.isAssistantSpeaking = false;
        session.lastResponseEndTime = Date.now();
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
    
    console.log(`[Redi V7] 📷 Injecting ${sizeKB}KB (${frameAge}ms old)`);
    
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
    
    console.log(`[Redi V7] 🚀 Response triggered with vision`);
  } else {
    console.log(`[Redi V7] ⚠️ No fresh frame (${frameAge}ms old)`);
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
