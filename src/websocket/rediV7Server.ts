/**
 * Redi V7 Server - AGGRESSIVE SPEED OPTIMIZATIONS
 * ================================================
 * 
 * OPTIMIZATIONS APPLIED (Jan 22, 2026):
 * 1. Semantic VAD with HIGH eagerness (faster turn detection)
 * 2. Instant response at speech stop (skip Whisper wait)
 * 3. Fresh frame injection at speech stop
 * 
 * SPEED OPTIMIZATIONS (Jan 24, 2026):
 * 4. speed: 1.2 - Faster TTS output
 * 5. input_audio_noise_reduction - Better VAD accuracy
 * 6. max_response_output_tokens: 150 - Shorter = faster
 * 
 * AGGRESSIVE SPEED OPTIMIZATIONS (Jan 24, 2026 - v2):
 * 7. gpt-realtime-mini - FASTER MODEL (was gpt-realtime)
 * 8. speed: 1.5 - MAX TTS speed (was 1.2)
 * 9. max_tokens: 80 - Ultra short responses (was 150)
 * 10. NO transcription - Skip Whisper entirely
 * 11. Frame delay: 10ms (was 30ms)
 * 12. Ultra-minimal system prompt
 * 
 * ECHO FIX (Jan 24, 2026):
 * - Clear input audio buffer when assistant starts speaking
 * - This prevents Redi from hearing itself through the mic
 * 
 * STABLE BACKUP: Branch v7-stable-jan22-2026
 * If this breaks, restore with:
 *   git checkout v7-stable-jan22-2026 -- src/websocket/rediV7Server.ts
 * 
 * Endpoint: /ws/redi?v=7
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

// =============================================================================
// CONFIGURATION - OPTIMIZED FOR MINIMUM LATENCY
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// SPEED: Use gpt-realtime-mini for lower latency (was gpt-realtime)
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini';

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
  
  // Latency tracking
  lastResponseTriggerTime: number;
}

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// SYSTEM PROMPT - ULTRA MINIMAL FOR SPEED
// =============================================================================

// Shorter prompt = fewer tokens = faster processing
const SYSTEM_PROMPT = `You are Redi. Describe what's in the image in 10-15 words. Be direct, no filler.`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 AGGRESSIVE SPEED - Jan 24 2026 v2');
  console.log('[Redi V7] ═══════════════════════════════════════════════════');
  console.log('[Redi V7] SPEED OPTIMIZATIONS:');
  console.log('[Redi V7]   • Model: gpt-realtime-mini (FASTER)');
  console.log('[Redi V7]   • TTS speed: 1.5x (MAX)');
  console.log('[Redi V7]   • Max tokens: 80 (ultra-short)');
  console.log('[Redi V7]   • Transcription: DISABLED');
  console.log('[Redi V7]   • Frame delay: 10ms');
  console.log('[Redi V7]   • Semantic VAD: HIGH eagerness');
  console.log('[Redi V7]   • Noise reduction: ON');
  console.log('[Redi V7] Target: Sub-1.5s response times');
  console.log('[Redi V7] Backup: v7-stable-jan22-2026');
  console.log('[Redi V7] ═══════════════════════════════════════════════════');

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
      lastResponseTriggerTime: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId });
      console.log(`[Redi V7] ✅ Session ready (mini model)`);
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
      console.log(`[Redi V7] ✅ OpenAI connected (gpt-realtime-mini)`);
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
  // ═══════════════════════════════════════════════════════════════════════════
  // AGGRESSIVE SPEED OPTIMIZATIONS - Jan 24, 2026 v2
  // ═══════════════════════════════════════════════════════════════════════════
  // Goal: Get from 2.2s → sub-1.5s response times
  // 
  // Changes from v1:
  // - Model: gpt-realtime-mini (faster than gpt-realtime)
  // - speed: 1.5 (max, was 1.2)
  // - max_tokens: 80 (was 150)
  // - NO transcription (was whisper-1)
  // ═══════════════════════════════════════════════════════════════════════════
  
  sendToOpenAI(session, {
    type: 'session.update',
    session: {
      instructions: SYSTEM_PROMPT,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      
      // SPEED: Disable transcription - we don't wait for it anyway
      // This may free up processing resources
      input_audio_transcription: null,
      
      // SPEED: MAX TTS speed (1.5 is maximum)
      speed: 1.5,
      
      // SPEED: Ultra-short responses (80 tokens ≈ 60 words ≈ 15-20 seconds audio)
      // But with our prompt asking for 10-15 words, we'll use much less
      max_response_output_tokens: 80,
      
      // SPEED: Noise reduction for better VAD accuracy
      input_audio_noise_reduction: {
        type: 'near_field'
      },
      
      turn_detection: {
        type: 'semantic_vad',
        eagerness: 'high',
        create_response: true,
        interrupt_response: true
      }
    }
  });
  
  console.log('[Redi V7] ⚡ Configured: mini model + speed=1.5x + max_tokens=80 + no_transcription');
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // ECHO FIX: Don't send audio to OpenAI while assistant is speaking
      if (message.data && !session.isAssistantSpeaking) {
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
        if (event.error?.code !== 'conversation_already_has_active_response') {
          console.error(`[Redi V7] ❌ ${event.error?.message}`);
        }
        break;

      case 'input_audio_buffer.speech_started':
        session.isUserSpeaking = true;
        session.responseTriggeredForTurn = false;
        session.speechStartTime = Date.now();
        console.log('[Redi V7] 🎤 Speaking...');
        
        // Request fresh frame immediately
        sendToClient(session, { type: 'request_frame' });
        
        // Barge-in: stop assistant if speaking
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
        // OPTIMIZATION: Instant response with vision at speech stop
        // SPEED: Reduced delay from 30ms to 10ms
        // ═══════════════════════════════════════════════════════════
        if (!session.responseTriggeredForTurn) {
          session.responseTriggeredForTurn = true;
          session.lastResponseTriggerTime = Date.now();
          
          // Request fresh frame
          sendToClient(session, { type: 'request_frame' });
          
          // SPEED: Reduced delay 30ms → 10ms
          setTimeout(() => {
            injectVisionAndTriggerResponse(session);
          }, 10);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Transcription is now DISABLED, but handle in case it comes through
        if (event.transcript) {
          console.log(`[Redi V7] 📝 "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        
        // ECHO FIX: Clear the input audio buffer
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        console.log('[Redi V7] 🔇 Cleared input buffer');
        
        sendToClient(session, { type: 'mute_mic', muted: true });
        break;

      case 'response.audio.delta':
        if (event.delta) {
          sendToClient(session, { type: 'audio', data: event.delta });
        }
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          const totalLatency = session.lastResponseTriggerTime > 0
            ? Date.now() - session.lastResponseTriggerTime
            : 0;
          console.log(`[Redi V7] 🤖 "${event.transcript}" (${totalLatency}ms total)`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'assistant' });
        }
        break;

      case 'response.done':
        session.isAssistantSpeaking = false;
        session.responsesCompleted++;
        sendToClient(session, { type: 'mute_mic', muted: false });
        
        const responseLatency = session.lastResponseTriggerTime > 0
          ? Date.now() - session.lastResponseTriggerTime
          : 0;
        console.log(`[Redi V7] ✅ Response #${session.responsesCompleted} complete (${responseLatency}ms)`);
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
// VISION INJECTION + RESPONSE TRIGGER
// =============================================================================

function injectVisionAndTriggerResponse(session: Session): void {
  const frameAge = session.latestFrame ? Date.now() - session.latestFrameTime : Infinity;
  
  if (session.latestFrame && frameAge < 1000) {
    const cleanBase64 = session.latestFrame.replace(/[\r\n\s]/g, '');
    const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);
    
    console.log(`[Redi V7] 📷 Injecting ${sizeKB}KB frame (${frameAge}ms old)`);
    
    // Inject image with minimal context
    sendToOpenAI(session, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'What do you see?'  // Minimal prompt
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${cleanBase64}`
          }
        ]
      }
    });
    
    console.log(`[Redi V7] 🚀 INSTANT RESPONSE TRIGGERED`);
  } else {
    console.log(`[Redi V7] ⚠️ No fresh frame (${frameAge}ms old)`);
  }
  
  // Trigger response
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
