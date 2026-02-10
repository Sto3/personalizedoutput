/**
 * Call Handler — WebSocket handler for Twilio Media Streams
 * =========================================================
 * Pipes Twilio call audio through the Redi pipeline:
 * Twilio Audio -> Deepgram STT -> Brain Router -> LLM -> ElevenLabs TTS -> Twilio Audio
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { anthropicComplete } from '../providers/anthropicProvider';
import { elevenLabsStreamTTS } from '../providers/elevenlabsTTS';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

interface CallSession {
  streamSid: string | null;
  callSid: string | null;
  twilioWs: WebSocket;
  deepgramConnection: any | null;
  currentTranscript: string;
  speechEndTimeout: NodeJS.Timeout | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  memoryContext: string;
  purpose: string;
  userName: string;
  isResponding: boolean;
}

const callSessions = new Map<string, CallSession>();
let callWss: WebSocketServer | null = null;

export function initCallHandler(server: HTTPServer): void {
  callWss = new WebSocketServer({ noServer: true });

  callWss.on('connection', (ws: WebSocket) => {
    let session: CallSession | null = null;

    ws.on('message', async (data: string) => {
      try {
        const msg = JSON.parse(data);

        switch (msg.event) {
          case 'connected':
            console.log('[CallHandler] Twilio connected');
            break;

          case 'start':
            session = {
              streamSid: msg.start.streamSid,
              callSid: msg.start.callSid,
              twilioWs: ws,
              deepgramConnection: null,
              currentTranscript: '',
              speechEndTimeout: null,
              conversationHistory: [],
              memoryContext: '',
              purpose: '',
              userName: '',
              isResponding: false,
            };
            callSessions.set(msg.start.streamSid, session);
            await connectCallToDeepgram(session);
            console.log(`[CallHandler] Stream started: ${msg.start.streamSid}`);
            break;

          case 'media':
            if (session?.deepgramConnection) {
              const audio = Buffer.from(msg.media.payload, 'base64');
              session.deepgramConnection.send(audio);
            }
            break;

          case 'stop':
            if (session) {
              console.log(`[CallHandler] Stream stopped: ${session.streamSid}`);
              cleanupCallSession(session.streamSid!);
            }
            break;
        }
      } catch (err) {
        console.error('[CallHandler] Message error:', err);
      }
    });

    ws.on('close', () => {
      if (session?.streamSid) {
        cleanupCallSession(session.streamSid);
      }
    });
  });

  // Handle upgrade for /ws/redi-call
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const parsedUrl = parseUrl(request.url || '', true);
    if (parsedUrl.pathname === '/ws/redi-call') {
      if (!callWss) { socket.destroy(); return; }
      callWss.handleUpgrade(request, socket, head, (ws) => {
        callWss!.emit('connection', ws, request);
      });
    }
  });

  console.log('[CallHandler] WebSocket ready on /ws/redi-call');
}

async function connectCallToDeepgram(session: CallSession): Promise<void> {
  if (!DEEPGRAM_API_KEY) return;

  const deepgram = createClient(DEEPGRAM_API_KEY);
  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.is_final;

    if (transcript?.trim() && isFinal) {
      session.currentTranscript += ' ' + transcript.trim();
      session.currentTranscript = session.currentTranscript.trim();

      if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) {
          handleCallSpeechEnd(session);
        }
      }, 800);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    // Barge-in
    if (session.isResponding) {
      session.isResponding = false;
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: any) => {
    console.error('[CallHandler] Deepgram error:', err);
  });

  session.deepgramConnection = connection;
}

async function handleCallSpeechEnd(session: CallSession): Promise<void> {
  const transcript = session.currentTranscript.trim();
  session.currentTranscript = '';
  if (!transcript || session.isResponding) return;
  session.isResponding = true;

  try {
    const systemPrompt = `You are Redi, an AI assistant making a phone call on behalf of ${session.userName || 'the user'}. Purpose: ${session.purpose || 'general assistance'}. Be natural, conversational, and efficient. Identify yourself as an AI assistant when appropriate. Keep responses concise for phone conversation.${session.memoryContext ? `\n\nUser context: ${session.memoryContext}` : ''}`;

    const messages: any[] = [
      { role: 'system' as const, content: systemPrompt },
      ...session.conversationHistory.slice(-10),
      { role: 'user' as const, content: transcript },
    ];

    const result = await anthropicComplete({ messages, max_tokens: 512 });

    session.conversationHistory.push({ role: 'user', content: transcript });
    session.conversationHistory.push({ role: 'assistant', content: result.text });

    // Stream TTS back through Twilio
    await elevenLabsStreamTTS(
      result.text,
      (audioChunk: Buffer) => {
        if (session.twilioWs.readyState === WebSocket.OPEN && session.streamSid) {
          const payload = audioChunk.toString('base64');
          session.twilioWs.send(JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: { payload },
          }));
        }
      },
      () => { /* done */ },
    );

    session.isResponding = false;
  } catch (err) {
    console.error('[CallHandler] Response error:', err);
    session.isResponding = false;
  }
}

function cleanupCallSession(streamSid: string): void {
  const session = callSessions.get(streamSid);
  if (session) {
    if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
    session.deepgramConnection?.finish();
    callSessions.delete(streamSid);
  }
}

export function closeCallHandler(): void {
  callSessions.forEach((_, sid) => cleanupCallSession(sid));
  callWss?.close();
  callWss = null;
}
