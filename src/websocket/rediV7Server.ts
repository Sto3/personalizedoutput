/**
 * Redi V7 Server - Echo Prevention + Barge-In
 * ============================================
 * 
 * iOS blocks audio during playback to prevent echo.
 * iOS can send "interrupt" for barge-in when user speaks loudly.
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
  lastFrameRequestTime: number;  // Throttle frame requests
  
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  speechStartTime: number;
  responseTriggeredForTurn: boolean;
  
  connectionTime: number;
  responsesCompleted: number;
}

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time camera vision.

RULES:
- Respond naturally to what the user asks
- If they ask what you see, describe the image briefly (10-20 words)
- Be conversational and helpful
- Don't say "I see" - describe directly`;

export async function initRediV7(server: HTTPServer): Promise<void> {
  console.log('[Redi V7] Starting - Audio blocked during playback');

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
      console.log(`[Redi V7] 🔌 Disconnected: ${sessionId.slice(0,8)} (${duration}s, ${session.responsesCompleted} responses)`);
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
        threshold: 0.5,
        prefix_padding_ms: 200,
        silence_duration_ms: 500  // Slightly longer to reduce false triggers
      }
    }
  });
}

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

    case 'interrupt':
      if (session.isAssistantSpeaking) {
        console.log('[Redi V7] 🛑 BARGE-IN');
        sendToOpenAI(session, { type: 'response.cancel' });
        sendToOpenAI(session, { type: 'input_audio_buffer.clear' });
        sendToClient(session, { type: 'stop_audio' });
        session.isAssistantSpeaking = false;
        session.responseTriggeredForTurn = false;
      }
      break;

    case 'frame':
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      // Don't log every frame - too noisy
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
        session.isUserSpeaking = true;
        session.speechStartTime = Date.now();
        session.responseTriggeredForTurn = false;
        console.log('[Redi V7] 🎤 Speaking...');
        // Don't request frame here - wait for speech_stopped
        break;

      case 'input_audio_buffer.speech_stopped':
        session.isUserSpeaking = false;
        const duration = Date.now() - session.speechStartTime;
        console.log(`[Redi V7] 🎤 Stopped (${duration}ms)`);
        
        if (!session.responseTriggeredForTurn && !session.isAssistantSpeaking) {
          session.responseTriggeredForTurn = true;
          
          // Request frame only if we haven't recently (throttle to 1 per second)
          const now = Date.now();
          if (now - session.lastFrameRequestTime > 1000) {
            session.lastFrameRequestTime = now;
            sendToClient(session, { type: 'request_frame' });
          }
          
          // Trigger response after brief delay for frame
          setTimeout(() => triggerResponse(session), 100);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log(`[Redi V7] 📝 "${event.transcript}"`);
          sendToClient(session, { type: 'transcript', text: event.transcript, role: 'user' });
        }
        break;

      case 'response.created':
        session.isAssistantSpeaking = true;
        sendToClient(session, { type: 'playback_started' });
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
        sendToClient(session, { type: 'playback_ended' });
        console.log('[Redi V7] ✅ Done');
        break;

      case 'response.cancelled':
        session.isAssistantSpeaking = false;
        break;
    }
  } catch (error) {
    // Ignore parse errors
  }
}

function triggerResponse(session: Session): void {
  if (session.isAssistantSpeaking) {
    console.log('[Redi V7] ⚠️ Skipping - already speaking');
    return;
  }
  
  const frameAge = session.latestFrame ? Date.now() - session.latestFrameTime : Infinity;
  
  if (session.latestFrame && frameAge < 2000) {
    const cleanBase64 = session.latestFrame.replace(/[\r\n\s]/g, '');
    
    sendToOpenAI(session, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: '[Describe what you see if relevant to the conversation:]' },
          { type: 'input_image', image_url: `data:image/jpeg;base64,${cleanBase64}` }
        ]
      }
    });
  }
  
  sendToOpenAI(session, { type: 'response.create' });
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
