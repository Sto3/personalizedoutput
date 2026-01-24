/**
 * Redi V7 Server - OPTIMIZED FOR SPEED
 * =====================================
 * 
 * OPTIMIZATIONS APPLIED (Jan 22, 2026):
 * 1. Semantic VAD with HIGH eagerness (faster turn detection)
 * 2. Instant response at speech stop (skip Whisper wait)
 * 3. Fresh frame injection at speech stop
 * 
 * SPEED OPTIMIZATIONS (Jan 24, 2026):
 * 4. speed: 1.2 - Faster TTS output (1.5 max, but 1.2 is more natural)
 * 5. input_audio_noise_reduction - Better VAD accuracy, fewer false triggers
 * 6. max_response_output_tokens: 150 - Shorter = faster
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
  
  // Latency tracking
  lastResponseTriggerTime: number;
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
- The image shows what the user is looking at RIGHT NOW
- NEVER start your response with "Yes", "Exactly", "That's right" or similar confirmations
- NEVER repeat or paraphrase what the user just said
- Give NEW information, not confirmation of existing statements`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] ═══════════════════════════════════════════════════');
  console.log('[Redi V7] 🚀 V7 SPEED OPTIMIZED - Jan 24 2026');
  console.log('[Redi V7] ═══════════════════════════════════════════════════');
  console.log('[Redi V7] Optimizations:');
  console.log('[Redi V7]   • Semantic VAD with HIGH eagerness');
  console.log('[Redi V7]   • Instant response at speech stop');
  console.log('[Redi V7]   • Skip Whisper transcription wait');
  console.log('[Redi V7]   • Echo prevention (clear buffer on response)');
  console.log('[Redi V7]   • TTS speed: 1.2x (faster output)');
  console.log('[Redi V7]   • Noise reduction: ON (better VAD)');
  console.log('[Redi V7]   • Max tokens: 150 (shorter = faster)');
  console.log('[Redi V7] Model: gpt-realtime (GA with VISION)');
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
  // ═══════════════════════════════════════════════════════════════════════════
  // SPEED OPTIMIZATIONS - Jan 24, 2026
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. semantic_vad with HIGH eagerness - responds faster
  // 2. speed: 1.2 - TTS speaks 20% faster (max is 1.5)
  // 3. input_audio_noise_reduction - reduces false VAD triggers
  // 4. max_response_output_tokens: 150 - shorter responses = less generation time
  // ═══════════════════════════════════════════════════════════════════════════
  
  sendToOpenAI(session, {
    type: 'session.update',
    session: {
      instructions: SYSTEM_PROMPT,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      
      // SPEED: Faster TTS output (1.0 default, 1.5 max)
      speed: 1.2,
      
      // SPEED: Limit response length for faster generation
      max_response_output_tokens: 150,
      
      // SPEED: Noise reduction for better VAD accuracy
      input_audio_noise_reduction: {
        type: 'near_field'  // Optimized for close-mic (phone)
      },
      
      turn_detection: {
        type: 'semantic_vad',      // AI-powered turn detection
        eagerness: 'high',         // Respond quickly
        create_response: true,     // Auto-create response
        interrupt_response: true   // Allow barge-in
      }
    }
  });
  
  console.log('[Redi V7] ⚡ Configured: semantic_vad + eagerness=high + speed=1.2x + noise_reduction');
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // ECHO FIX: Don't send audio to OpenAI while assistant is speaking
      // This prevents the mic from picking up Redi's voice and creating feedback
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
        session.responseTriggeredForTurn = false;  // New turn
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
        // OPTIMIZATION #2: Instant response with vision at speech stop
        // Don't wait for Whisper transcription - inject frame NOW!
        // ═══════════════════════════════════════════════════════════
        if (!session.responseTriggeredForTurn) {
          session.responseTriggeredForTurn = true;
          session.lastResponseTriggerTime = Date.now();
          
          // Request fresh frame
          sendToClient(session, { type: 'request_frame' });
          
          // Inject vision immediately (30ms delay for frame to arrive)
          setTimeout(() => {
            injectVisionAndTriggerResponse(session);
          }, 30);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Transcript arrives AFTER we've already triggered response
        // Just log for debugging
        if (event.transcript) {
          const latency = session.lastResponseTriggerTime > 0 
            ? Date.now() - session.lastResponseTriggerTime 
            : 0;
          console.log(`[Redi V7] 📝 "${event.transcript}" (${latency}ms after trigger)`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        
        // ═══════════════════════════════════════════════════════════
        // ECHO FIX: Clear the input audio buffer when we start responding
        // This prevents any echo/feedback from being processed
        // ═══════════════════════════════════════════════════════════
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        console.log('[Redi V7] 🔇 Cleared input buffer (echo prevention)');
        
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
    
    console.log(`[Redi V7] 🚀 INSTANT RESPONSE TRIGGERED`);
  } else {
    console.log(`[Redi V7] ⚠️ No fresh frame (${frameAge}ms old) - responding without vision`);
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
