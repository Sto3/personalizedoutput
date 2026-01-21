/**
 * Redi V8 Server - SPLIT PIPELINE FOR MAXIMUM SPEED
 * ==================================================
 * 
 * TARGET: Sub-1-second response latency
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  iOS Audio    →   Deepgram STT (streaming)  →  ~150ms      │
 * │  iOS Frame    →   Groq Llama 4 Vision       →  ~200ms      │
 * │  Combined     →   Groq Llama 3.1 8B         →  ~100ms      │
 * │  Response     →   ElevenLabs Flash TTS      →  ~75ms       │
 * └─────────────────────────────────────────────────────────────┘
 *                    TOTAL: ~500-700ms
 * 
 * vs V7 (OpenAI Realtime): ~2800ms
 * 
 * KEY INSIGHT: Each component is best-in-class for speed.
 * We parallelize where possible and stream everything.
 * 
 * Endpoint: /ws/redi?v=8
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Models
const GROQ_VISION_MODEL = 'llama-4-scout-17b-16e-instruct'; // Fast vision model
const GROQ_LLM_MODEL = 'llama-3.1-8b-instant'; // Ultra-fast text model
const ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George - natural male voice

// Timing
const SPEECH_TIMEOUT_MS = 800; // How long to wait after speech stops before responding
const MAX_FRAME_AGE_MS = 2000; // Maximum age of frame to use

// =============================================================================
// TYPES
// =============================================================================

interface Session {
  id: string;
  clientWs: WebSocket;
  deepgramConnection: any | null;
  
  // Frame management
  latestFrame: string | null;
  latestFrameTime: number;
  
  // Speech state
  isUserSpeaking: boolean;
  currentTranscript: string;
  speechEndTimeout: NodeJS.Timeout | null;
  
  // Response state
  isResponding: boolean;
  
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

const SYSTEM_PROMPT = `You are Redi, a helpful AI assistant with real-time vision.
You can see through the user's phone camera.

RULES:
- Be concise: 1-2 sentences max
- Describe what you ACTUALLY see in the image
- Be conversational and friendly
- Never say "I can see" - just describe directly
- If asked "what do you see", describe the main objects/scene`;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV8(server: HTTPServer): Promise<void> {
  console.log('[Redi V8] ═══════════════════════════════════════════');
  console.log('[Redi V8] 🚀 V8 - SPLIT PIPELINE (Sub-1s Target)');
  console.log('[Redi V8] ═══════════════════════════════════════════');
  console.log('[Redi V8] Deepgram STT → Groq Vision → Groq LLM → ElevenLabs TTS');
  console.log('[Redi V8] ═══════════════════════════════════════════');

  // Check API keys
  const missing: string[] = [];
  if (!DEEPGRAM_API_KEY) missing.push('DEEPGRAM_API_KEY');
  if (!GROQ_API_KEY) missing.push('GROQ_API_KEY');
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');
  
  if (missing.length > 0) {
    console.error(`[Redi V8] ❌ Missing API keys: ${missing.join(', ')}`);
    console.error('[Redi V8] V8 will not be available');
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V8] 🔌 New connection: ${sessionId.slice(0,8)}`);

    const session: Session = {
      id: sessionId,
      clientWs: ws,
      deepgramConnection: null,
      latestFrame: null,
      latestFrameTime: 0,
      isUserSpeaking: false,
      currentTranscript: '',
      speechEndTimeout: null,
      isResponding: false,
      connectionTime: Date.now(),
      responsesCompleted: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToDeepgram(session);
      sendToClient(session, { type: 'session_ready', sessionId, version: 'v8' });
      console.log(`[Redi V8] ✅ Session ready (Deepgram connected)`);
    } catch (error) {
      console.error(`[Redi V8] ❌ Deepgram connection failed:`, error);
      ws.close(1011, 'Deepgram connection failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        // Might be binary audio data
        if (Buffer.isBuffer(data)) {
          handleAudioData(session, data);
        }
      }
    });

    ws.on('close', () => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi V8] 🔌 Disconnected: ${sessionId.slice(0,8)} (${duration}s, ${session.responsesCompleted} responses)`);
      cleanup(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Redi V8] Client error:`, error);
      cleanup(sessionId);
    });
  });

  console.log('[Redi V8] WebSocket server initialized on /ws/redi?v=8');
}

export function handleV8Upgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) {
    console.error('[Redi V8] ❌ WSS not initialized (missing API keys?)');
    return false;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss!.emit('connection', ws, request);
  });
  return true;
}

// =============================================================================
// DEEPGRAM CONNECTION (Streaming STT)
// =============================================================================

async function connectToDeepgram(session: Session): Promise<void> {
  const deepgram = createClient(DEEPGRAM_API_KEY!);
  
  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    interim_results: true,
    endpointing: 300, // Fast end-of-speech detection
    vad_events: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[Redi V8] ✅ Deepgram connected`);
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.is_final;
    const speechFinal = data.speech_final;

    if (transcript && transcript.trim()) {
      if (isFinal) {
        session.currentTranscript += ' ' + transcript.trim();
        session.currentTranscript = session.currentTranscript.trim();
        console.log(`[Redi V8] 📝 Final: "${transcript.trim()}"`);
      } else {
        // Interim result - user is still speaking
        session.isUserSpeaking = true;
        
        // Clear any pending response timeout
        if (session.speechEndTimeout) {
          clearTimeout(session.speechEndTimeout);
          session.speechEndTimeout = null;
        }
      }

      // Send transcript to client for display
      sendToClient(session, { 
        type: 'transcript', 
        text: transcript.trim(), 
        isFinal,
        role: 'user' 
      });
    }

    // Speech final means Deepgram detected end of utterance
    if (speechFinal && session.currentTranscript.trim()) {
      console.log(`[Redi V8] 🎤 Speech ended, waiting ${SPEECH_TIMEOUT_MS}ms...`);
      
      // Wait a bit to make sure user is really done
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) {
          triggerResponse(session);
        }
      }, SPEECH_TIMEOUT_MS);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    session.isUserSpeaking = true;
    console.log(`[Redi V8] 🎤 Speaking...`);
    
    // Request fresh frame
    sendToClient(session, { type: 'request_frame' });
    
    // Clear any pending response
    if (session.speechEndTimeout) {
      clearTimeout(session.speechEndTimeout);
      session.speechEndTimeout = null;
    }
    
    // Barge-in: stop current response if any
    if (session.isResponding) {
      console.log(`[Redi V8] 🛑 BARGE-IN`);
      sendToClient(session, { type: 'stop_audio' });
      session.isResponding = false;
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (error: any) => {
    console.error(`[Redi V8] ❌ Deepgram error:`, error);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[Redi V8] Deepgram closed`);
  });

  session.deepgramConnection = connection;
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // Base64 encoded audio from iOS
      if (message.data) {
        const audioBuffer = Buffer.from(message.data, 'base64');
        handleAudioData(session, audioBuffer);
      }
      break;

    case 'frame':
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      
      const sizeKB = Math.round((message.data?.length || 0) * 0.75 / 1024);
      // Only log occasionally to reduce noise
      if (Math.random() < 0.1) {
        console.log(`[Redi V8] 📷 ${sizeKB}KB`);
      }
      break;
  }
}

function handleAudioData(session: Session, audioBuffer: Buffer): void {
  if (session.deepgramConnection) {
    session.deepgramConnection.send(audioBuffer);
  }
}

// =============================================================================
// RESPONSE PIPELINE
// =============================================================================

async function triggerResponse(session: Session): Promise<void> {
  const transcript = session.currentTranscript.trim();
  session.currentTranscript = ''; // Reset for next turn
  
  if (!transcript) {
    console.log(`[Redi V8] ⚠️ Empty transcript, skipping response`);
    return;
  }

  session.isResponding = true;
  const startTime = Date.now();
  
  console.log(`[Redi V8] 🚀 PIPELINE START: "${transcript}"`);

  try {
    // Step 1: Analyze image with Groq Vision (if we have a recent frame)
    let imageDescription = '';
    const frameAge = session.latestFrame ? Date.now() - session.latestFrameTime : Infinity;
    
    if (session.latestFrame && frameAge < MAX_FRAME_AGE_MS) {
      const visionStart = Date.now();
      imageDescription = await analyzeImageWithGroq(session.latestFrame);
      console.log(`[Redi V8] 👁️ Vision: ${Date.now() - visionStart}ms - "${imageDescription.slice(0, 50)}..."`);
    } else {
      console.log(`[Redi V8] ⚠️ No recent frame (age: ${frameAge}ms)`);
      imageDescription = 'No image available';
    }

    // Check for barge-in
    if (!session.isResponding) {
      console.log(`[Redi V8] 🛑 Cancelled (barge-in during vision)`);
      return;
    }

    // Step 2: Generate response with Groq LLM
    const llmStart = Date.now();
    const responseText = await generateResponseWithGroq(transcript, imageDescription);
    console.log(`[Redi V8] 💬 LLM: ${Date.now() - llmStart}ms - "${responseText.slice(0, 50)}..."`);

    // Check for barge-in
    if (!session.isResponding) {
      console.log(`[Redi V8] 🛑 Cancelled (barge-in during LLM)`);
      return;
    }

    // Send transcript to client
    sendToClient(session, { type: 'transcript', text: responseText, role: 'assistant' });

    // Step 3: Convert to speech with ElevenLabs
    const ttsStart = Date.now();
    await streamTTSToClient(session, responseText);
    console.log(`[Redi V8] 🔊 TTS: ${Date.now() - ttsStart}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`[Redi V8] ✅ PIPELINE COMPLETE: ${totalTime}ms total`);
    
    session.responsesCompleted++;
    session.isResponding = false;

  } catch (error) {
    console.error(`[Redi V8] ❌ Pipeline error:`, error);
    session.isResponding = false;
  }
}

// =============================================================================
// GROQ VISION API
// =============================================================================

async function analyzeImageWithGroq(base64Image: string): Promise<string> {
  const cleanBase64 = base64Image.replace(/[\r\n\s]/g, '');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Briefly describe what you see in this image in 1-2 sentences. Focus on the main objects and scene.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Redi V8] Groq Vision error: ${response.status} - ${error}`);
    return 'Unable to analyze image';
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Unable to analyze image';
}

// =============================================================================
// GROQ LLM API
// =============================================================================

async function generateResponseWithGroq(userMessage: string, imageDescription: string): Promise<string> {
  const contextMessage = imageDescription !== 'No image available' 
    ? `[What I see: ${imageDescription}]` 
    : '';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `${contextMessage}\n\nUser: ${userMessage}`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Redi V8] Groq LLM error: ${response.status} - ${error}`);
    return "I'm having trouble responding right now.";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";
}

// =============================================================================
// ELEVENLABS TTS (Streaming)
// =============================================================================

async function streamTTSToClient(session: Session, text: string): Promise<void> {
  // Mute mic while speaking
  sendToClient(session, { type: 'mute_mic', muted: true });

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5', // Fastest model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
      output_format: 'mp3_44100_128', // Good quality, reasonable size
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Redi V8] ElevenLabs error: ${response.status} - ${error}`);
    sendToClient(session, { type: 'mute_mic', muted: false });
    return;
  }

  // Stream audio chunks to client
  const reader = response.body?.getReader();
  if (!reader) {
    console.error(`[Redi V8] No response body from ElevenLabs`);
    sendToClient(session, { type: 'mute_mic', muted: false });
    return;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Check for barge-in
      if (!session.isResponding) {
        console.log(`[Redi V8] 🛑 TTS cancelled (barge-in)`);
        break;
      }

      // Send chunk as base64
      const base64Chunk = Buffer.from(value).toString('base64');
      sendToClient(session, { 
        type: 'audio', 
        data: base64Chunk,
        format: 'mp3' // Tell iOS this is MP3
      });
    }
  } finally {
    reader.releaseLock();
    sendToClient(session, { type: 'mute_mic', muted: false });
    sendToClient(session, { type: 'audio_done' });
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function sendToClient(session: Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(JSON.stringify(message));
  }
}

function cleanup(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.speechEndTimeout) {
      clearTimeout(session.speechEndTimeout);
    }
    if (session.deepgramConnection) {
      session.deepgramConnection.finish();
    }
    sessions.delete(sessionId);
  }
}

export function closeRediV8(): void {
  sessions.forEach((_, id) => cleanup(id));
  wss?.close();
  wss = null;
}

export function getV8Stats(): object {
  return { 
    activeSessions: sessions.size,
    pipeline: 'Deepgram → Groq Vision → Groq LLM → ElevenLabs'
  };
}
