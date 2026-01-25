/**
 * Redi V7 Server - BULLETPROOF ECHO-FREE Architecture
 * ====================================================
 * 
 * CRITICAL FIX: Block audio from the moment we trigger a response,
 * NOT just when response.created fires. This prevents the race condition
 * where echo audio reaches OpenAI before we can block it.
 * 
 * FOUR LAYERS OF ECHO PROTECTION:
 * 1. Block audio when we trigger response (immediate)
 * 2. Block audio while assistant is speaking
 * 3. Clear OpenAI's input buffer on response.created
 * 4. Echo text detection as final fallback
 * 
 * Endpoint: /ws/redi?v=7
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

interface Session {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  
  latestFrame: string | null;
  latestFrameTime: number;
  lastFrameRequestTime: number;
  
  isUserSpeaking: boolean;
  
  // CRITICAL: Two flags for audio blocking
  isWaitingForResponse: boolean;  // Set TRUE when we trigger response.create
  isAssistantSpeaking: boolean;   // Set TRUE when response.created arrives
  
  speechStartTime: number;
  responseTriggeredForTurn: boolean;
  
  lastAssistantText: string;
  
  connectionTime: number;
  responsesCompleted: number;
  audioBlockedCount: number;
}

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time camera vision.

RULES:
- Respond naturally to what the user asks
- If they ask what you see, describe the image briefly (10-20 words)
- Be conversational and helpful
- Don't say "I see" - describe directly
- Keep responses SHORT - under 30 words unless asked for more`;

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] Starting - BULLETPROOF ECHO-FREE');
  console.log('[Redi V7] • Block audio immediately when response triggered');
  console.log('[Redi V7] • Clear OpenAI buffer on response.created');
  console.log('[Redi V7] • Echo text detection as fallback');

  if (!OPENAI_API_KEY) {
    console.error('[Redi V7] ❌ OPENAI_API_KEY not set!');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V7] 🔌 Connected: ${sessionId.slice(0,8)}`);

    const session: Session = {
      id: sessionId,
      clientWs: ws,
      openaiWs: null,
      latestFrame: null,
      latestFrameTime: 0,
      lastFrameRequestTime: 0,
      isUserSpeaking: false,
      isWaitingForResponse: false,
      isAssistantSpeaking: false,
      speechStartTime: 0,
      responseTriggeredForTurn: false,
      lastAssistantText: '',
      connectionTime: Date.now(),
      responsesCompleted: 0,
      audioBlockedCount: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToOpenAI(session);
      sendToClient(session, { type: 'session_ready', sessionId, version: 'V7-Bulletproof' });
    } catch (error) {
      console.error(`[Redi V7] ❌ OpenAI failed:`, error);
      ws.close(1011, 'OpenAI connection failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        // Ignore parse errors
      }
    });

    ws.on('close', () => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi V7] 🔌 Disconnected: ${sessionId.slice(0,8)} (${duration}s, ${session.responsesCompleted} responses, ${session.audioBlockedCount} audio blocked)`);
      cleanup(sessionId);
    });

    ws.on('error', () => cleanup(sessionId));
  });
}

export function handleV7Upgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) return false;
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss!.emit('connection', ws, request);
  });
  return true;
}

async function connectToOpenAI(session: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    ws.on('open', () => {
      session.openaiWs = ws;
      configureSession(session);
      resolve();
    });

    ws.on('message', (data: Buffer) => handleOpenAIMessage(session, data));
    ws.on('error', reject);
    ws.on('close', (code) => console.log(`[Redi V7] OpenAI closed: ${code}`));
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
        threshold: 0.7,           // Even higher threshold
        prefix_padding_ms: 400,   // More padding
        silence_duration_ms: 800  // Longer silence required
      }
    }
  });
}

/**
 * Check if we should block audio
 * Block when: waiting for response OR assistant is speaking
 */
function shouldBlockAudio(session: Session): boolean {
  return session.isWaitingForResponse || session.isAssistantSpeaking;
}

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // ═══════════════════════════════════════════════════════════════
      // BULLETPROOF ECHO PREVENTION: Block audio during ENTIRE response cycle
      // ═══════════════════════════════════════════════════════════════
      if (shouldBlockAudio(session)) {
        session.audioBlockedCount++;
        // Log periodically so we know it's working
        if (session.audioBlockedCount % 100 === 0) {
          console.log(`[Redi V7] 🔇 Blocked ${session.audioBlockedCount} audio chunks`);
        }
        return;
      }
      
      if (message.data) {
        sendToOpenAI(session, {
          type: 'input_audio_buffer.append',
          audio: message.data
        });
      }
      break;

    case 'interrupt':
      if (session.isAssistantSpeaking || session.isWaitingForResponse) {
        console.log('[Redi V7] 🛑 BARGE-IN from iOS');
        
        sendToOpenAI(session, { type: 'response.cancel' });
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        sendToClient(session, { type: 'stop_audio' });
        
        // Reset all blocking flags
        session.isAssistantSpeaking = false;
        session.isWaitingForResponse = false;
        session.responseTriggeredForTurn = false;
        
        console.log('[Redi V7] ✅ Barge-in complete');
      }
      break;

    case 'frame':
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      break;
  }
}

function handleOpenAIMessage(session: Session, data: Buffer): void {
  try {
    const event = JSON.parse(data.toString());
    
    switch (event.type) {
      case 'error':
        console.error(`[Redi V7] ❌ ${event.error?.message}`);
        break;

      case 'input_audio_buffer.speech_started':
        // Only process if NOT blocking (real user speech)
        if (!shouldBlockAudio(session)) {
          session.isUserSpeaking = true;
          session.speechStartTime = Date.now();
          session.responseTriggeredForTurn = false;
          console.log('[Redi V7] 🎤 Speaking...');
        }
        // If blocking, this is echo - ignore silently
        break;

      case 'input_audio_buffer.speech_stopped':
        // Only process if NOT blocking (real user speech)
        if (!shouldBlockAudio(session)) {
          session.isUserSpeaking = false;
          const duration = Date.now() - session.speechStartTime;
          console.log(`[Redi V7] 🎤 Stopped (${duration}ms)`);
          
          if (!session.responseTriggeredForTurn) {
            session.responseTriggeredForTurn = true;
            
            // Request frame (throttled)
            const now = Date.now();
            if (now - session.lastFrameRequestTime > 1000) {
              session.lastFrameRequestTime = now;
              sendToClient(session, { type: 'request_frame' });
            }
            
            // Trigger response after small delay for frame
            setTimeout(() => triggerResponse(session), 100);
          }
        }
        // If blocking, this is echo - ignore silently
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          const text = event.transcript.trim();
          
          // Echo detection as final fallback
          if (session.lastAssistantText && isEcho(text, session.lastAssistantText)) {
            console.log(`[Redi V7] 🔇 Echo text ignored: "${text.substring(0, 30)}..."`);
            return;
          }
          
          console.log(`[Redi V7] 📝 "${text}"`);
          sendToClient(session, { type: 'transcript', text, role: 'user' });
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        // isWaitingForResponse stays true until response ends
        
        // Clear any buffered audio that might contain echo
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        
        sendToClient(session, { type: 'playback_started' });
        break;

      case 'response.audio.delta':
        if (event.delta) {
          sendToClient(session, { type: 'audio', data: event.delta });
        }
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          const text = event.transcript;
          session.lastAssistantText = text;
          console.log(`[Redi V7] 🤖 "${text}"`);
          sendToClient(session, { type: 'transcript', text, role: 'assistant' });
        }
        break;

      case 'response.done':
        session.isAssistantSpeaking = false;
        session.isWaitingForResponse = false;  // NOW we can accept audio again
        session.responsesCompleted++;
        sendToClient(session, { type: 'playback_ended' });
        console.log('[Redi V7] ✅ Done');
        break;

      case 'response.cancelled':
        session.isAssistantSpeaking = false;
        session.isWaitingForResponse = false;
        console.log('[Redi V7] ⚡ Cancelled');
        break;
    }
  } catch (error) {
    // Ignore parse errors
  }
}

function isEcho(userText: string, assistantText: string): boolean {
  const user = userText.toLowerCase().trim();
  const assistant = assistantText.toLowerCase().trim();
  
  if (assistant.includes(user) || user.includes(assistant)) {
    return true;
  }
  
  const userWords = user.split(/\s+/).filter(w => w.length > 2);
  const assistantWords = assistant.split(/\s+/).filter(w => w.length > 2);
  
  if (userWords.length === 0) return false;
  
  const matchingWords = userWords.filter(word => assistantWords.includes(word));
  const overlapRatio = matchingWords.length / userWords.length;
  
  return overlapRatio > 0.5;  // 50% match is echo
}

function triggerResponse(session: Session): void {
  // ═══════════════════════════════════════════════════════════════
  // CRITICAL: Set isWaitingForResponse BEFORE sending response.create
  // This blocks any incoming audio immediately
  // ═══════════════════════════════════════════════════════════════
  session.isWaitingForResponse = true;
  
  // Tell iOS to start blocking audio NOW (don't wait for playback_started)
  sendToClient(session, { type: 'playback_started' });
  
  // Clear any audio that might have been buffered
  sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
  
  const frameAge = session.latestFrame ? Date.now() - session.latestFrameTime : Infinity;
  
  if (session.latestFrame && frameAge < 2000) {
    const cleanBase64 = session.latestFrame.replace(/[\r\n\s]/g, '');
    
    sendToOpenAI(session, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: '[Describe briefly if relevant:]' },
          { type: 'input_image', image_url: `data:image/jpeg;base64,${cleanBase64}` }
        ]
      }
    });
  }
  
  sendToOpenAI(session, { type: 'response.create' });
  console.log('[Redi V7] 🚀 Response triggered (audio blocked)');
}

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
