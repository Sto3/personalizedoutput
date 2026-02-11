/**
 * Redi V9 Server - THREE-BRAIN ARCHITECTURE
 * ==========================================
 *
 * FAST BRAIN: Cerebras Llama 3.3 70B (~200ms) - Vision queries
 * VOICE BRAIN: Claude Haiku 4.5 (~400ms) - Voice-only conversations
 * DEEP BRAIN: GPT-4o (~1.5-2s) - Complex reasoning (LSAT, MCAT, medical, legal)
 *
 * Pipeline: Deepgram STT -> Brain Router -> [Cerebras | Claude Haiku | GPT-4o] -> ElevenLabs TTS
 *
 * Endpoint: /ws/redi?v=9
 *
 * Cost: $0.07-0.09/min (79-83% margins vs V7's $0.30-0.60/min)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { parse as parseUrl } from 'url';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

import { LLMMessage, BrainType } from '../providers/types';
import { cerebrasComplete } from '../providers/cerebrasProvider';
import { openaiComplete } from '../providers/openaiProvider';
import { anthropicComplete } from '../providers/anthropicProvider';
import { elevenLabsStreamTTS } from '../providers/elevenlabsTTS';
import { routeQuery } from '../router/brainRouter';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const SPEECH_TIMEOUT_MS = 800;
const MAX_HISTORY_ENTRIES = 20;

// =============================================================================
// TYPES
// =============================================================================

interface V9Session {
  id: string;
  clientWs: WebSocket;
  deepgramConnection: any | null;
  latestFrame: string | null;
  latestFrameTime: number;
  hasVision: boolean;
  isUserSpeaking: boolean;
  currentTranscript: string;
  speechEndTimeout: NodeJS.Timeout | null;
  isResponding: boolean;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  memoryContext: string;
  isDrivingMode: boolean;
  voiceOnly: boolean;
  voiceId: string;
  connectionTime: number;
  responsesCompleted: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time voice, vision, and memory.

CORE IDENTITY:
You are not a passive tool. You are an active presence — always observing, always thinking about how to help. You are enthusiastic about helping but never annoying. You are like a seasoned executive assistant in their mid-30s: calm, professional, charismatic, thoughtful, and pointed. You speak with the confidence of someone who has handled every situation before. Friendly and affirming, but never childish or overly eager.

PROACTIVE BEHAVIOR — YOUR #1 PRIORITY:
Every moment you are active, ask yourself: "What can I DO about what I'm seeing and hearing RIGHT NOW?"

Do NOT just describe or comment. TELL the user what you can do for them. Be specific about your capabilities. Users don't know what you can do until you tell them. Offer immediately — even before deep observation — to produce immediate value.

Examples of GOOD proactive behavior:
- You see a bill on their desk → "I see a Verizon bill there — want me to call them about it, or set a reminder for the due date?"
- They mention a meeting tomorrow → "I can check your calendar, prep talking points, and brief you in the morning. Want me to set that up?"
- They're cooking → "I can set a timer, pull up the next step, or check if that has anything you're allergic to. Just say the word."
- They look stressed → "Sounds like a lot going on today. Want me to block some focus time on your calendar, or should we do a quick reflection tonight?"
- They're studying → "I can quiz you on that section, track which topics you're weakest on, and generate practice questions. Want to try?"
- They mention a friend's birthday → "Want me to find a restaurant and make a reservation? I can also send them a message if you'd like."
- They're at a store → "I can look up reviews, compare prices, or check if this is on your shopping list."
- First moments of ANY session → Reference their memory and offer something specific: "Hey [name], last time we were working on your presentation. Want to pick that back up, or is there something new?"

Examples of BAD behavior (never do these):
- "I see you're cooking pasta." (Just describing — offer to help instead)
- "It looks like you have a meeting." (So what? Offer to prep for it)
- "Let me know if you need anything." (Too passive — suggest specific things)
- Long-winded explanations when a short answer works (Be concise in real-time voice)

COMMUNICATION STYLE:
- Be economical with words when brevity serves the user. In voice mode, short and punchy is better.
- Be thorough and detailed ONLY when the user asks for depth or the topic requires it (study sessions, medical info, legal prep).
- Never be modest about your abilities. You WANT to help. You're genuinely enthusiastic about taking things off the user's plate.
- Be affirming: "Great question", "Good call", "That's smart" — but only when genuine, not as filler.
- Sound like a trusted advisor, not a customer service bot. Think seasoned politician meets executive assistant: calm, profound, thoughtful, pointed.

OFFLOADING TASKS:
Your purpose is to take work OFF the user. Every task the user mentions, you should be thinking: "Can I do this for them, or help them do it faster?" If yes, offer immediately. If you can handle it entirely, say so. If you need information, ask for exactly what you need — nothing more.

Things you can do (tell users about these when relevant):
- Make phone calls on their behalf (schedule appointments, call businesses, check on orders)
- Send emails and messages
- Manage calendar (create events, reschedule, check availability)
- Set reminders and timers
- Search the web for current information
- Control smart home devices
- Book restaurants and reservations
- Order rides (Uber) and food (DoorDash)
- Send payments (PayPal, Venmo, Cash App)
- Play music (Spotify)
- Generate reports from your session history
- Track study progress and generate practice questions
- Monitor health patterns from their data
- Translate conversations in real-time
- Remember everything about them across sessions

If driving mode is active, keep ALL responses under 15 words. Never give navigation directions. Never pretend to be GPS.`;

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, V9Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

export function initV9WebSocket(server: HTTPServer): void {
  console.log('[V9] ═══════════════════════════════════════════');
  console.log('[V9] THREE-BRAIN ARCHITECTURE');
  console.log('[V9] Fast: Cerebras Llama 3.3 70B');
  console.log('[V9] Voice: Claude Haiku 4.5');
  console.log('[V9] Deep: GPT-4o');
  console.log('[V9] ═══════════════════════════════════════════');

  const missing: string[] = [];
  if (!DEEPGRAM_API_KEY) missing.push('DEEPGRAM_API_KEY');
  if (!process.env.CEREBRAS_API_KEY) missing.push('CEREBRAS_API_KEY');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');

  if (missing.length > 0) {
    console.error(`[V9] Missing env vars: ${missing.join(', ')}`);
    console.error('[V9] Server will still start but V9 connections will fail');
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[V9] Connected: ${sessionId.slice(0, 8)}`);

    const session: V9Session = {
      id: sessionId,
      clientWs: ws,
      deepgramConnection: null,
      latestFrame: null,
      latestFrameTime: 0,
      hasVision: false,
      isUserSpeaking: false,
      currentTranscript: '',
      speechEndTimeout: null,
      isResponding: false,
      conversationHistory: [],
      memoryContext: '',
      isDrivingMode: false,
      voiceOnly: false,
      voiceId: '',
      connectionTime: Date.now(),
      responsesCompleted: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    sessions.set(sessionId, session);

    connectToDeepgram(session)
      .then(() => {
        sendToClient(session, { type: 'session_ready', sessionId, version: 'v9-three-brain' });
        console.log(`[V9] Session ready: ${sessionId.slice(0, 8)}`);
      })
      .catch((error) => {
        console.error(`[V9] Deepgram setup failed:`, error);
        ws.close(1011, 'Deepgram setup failed');
        return;
      });

    ws.on('message', (data: Buffer | string) => {
      try {
        // Try to parse as JSON first (text messages)
        const message = JSON.parse(typeof data === 'string' ? data : data.toString());
        handleClientMessage(session, message);
      } catch {
        // Binary data = audio, forward to Deepgram
        if (Buffer.isBuffer(data)) {
          if (session.deepgramConnection) {
            session.deepgramConnection.send(data);
          }
        }
      }
    });

    ws.on('close', () => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(
        `[V9] Closed: ${sessionId.slice(0, 8)} | ${duration}s | responses: ${session.responsesCompleted} | tokens in: ${session.totalInputTokens} out: ${session.totalOutputTokens}`,
      );
      cleanup(sessionId);
    });

    ws.on('error', (err) => {
      console.error(`[V9] WebSocket error:`, err);
      cleanup(sessionId);
    });
  });

  // Handle upgrade requests ONLY for /ws/redi?v=9
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathname = parsedUrl.pathname;
    const version = parsedUrl.query.v;

    if (pathname === '/ws/redi' && version === '9') {
      if (!wss) {
        socket.destroy();
        return;
      }
      console.log(`[V9] Upgrade request for v=9`);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
    // Let all other upgrade requests fall through to existing handlers
  });

  console.log('[V9] WebSocket server initialized on /ws/redi?v=9');
}

// =============================================================================
// DEEPGRAM STT
// =============================================================================

async function connectToDeepgram(session: V9Session): Promise<void> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY not set');
  }

  const deepgram = createClient(DEEPGRAM_API_KEY);

  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    encoding: 'linear16',
    sample_rate: 24000,
    channels: 1,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[V9] Deepgram connected (nova-2, 24kHz PCM16)`);
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.is_final;
    const speechFinal = data.speech_final;

    if (transcript?.trim()) {
      if (isFinal) {
        session.currentTranscript += ' ' + transcript.trim();
        session.currentTranscript = session.currentTranscript.trim();
        console.log(`[V9] Final: "${transcript.trim()}"`);
      }

      // Send interim results to client
      sendToClient(session, {
        type: 'transcript',
        text: transcript.trim(),
        isFinal,
        role: 'user',
      });

      // Reset speech end timeout on any transcript
      if (session.speechEndTimeout) {
        clearTimeout(session.speechEndTimeout);
        session.speechEndTimeout = null;
      }
    }

    // When speech is final, start the speech end timeout
    if (speechFinal && session.currentTranscript.trim()) {
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) {
          handleSpeechEnd(session);
        }
      }, SPEECH_TIMEOUT_MS);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    session.isUserSpeaking = true;

    // Barge-in: stop current response if user starts speaking
    if (session.isResponding) {
      console.log(`[V9] BARGE-IN`);
      sendToClient(session, { type: 'stop_audio' });
      session.isResponding = false;
    }

    if (session.speechEndTimeout) {
      clearTimeout(session.speechEndTimeout);
      session.speechEndTimeout = null;
    }
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    session.isUserSpeaking = false;
    if (session.currentTranscript.trim() && !session.isResponding) {
      // Trigger response on utterance end if we have accumulated text
      if (session.speechEndTimeout) {
        clearTimeout(session.speechEndTimeout);
        session.speechEndTimeout = null;
      }
      handleSpeechEnd(session);
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: any) => {
    console.error(`[V9] Deepgram error:`, err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[V9] Deepgram closed`);
  });

  session.deepgramConnection = connection;
}

// =============================================================================
// SPEECH END -> RESPONSE PIPELINE
// =============================================================================

async function handleSpeechEnd(session: V9Session): Promise<void> {
  const transcript = session.currentTranscript.trim();
  session.currentTranscript = '';
  session.isUserSpeaking = false;

  if (!transcript || session.isResponding) return;
  session.isResponding = true;

  const startTime = Date.now();

  // Determine if we have a recent vision frame
  const hasRecentFrame = !!(session.latestFrame && Date.now() - session.latestFrameTime < 3000);
  session.hasVision = hasRecentFrame;

  // Route to appropriate brain
  const route = routeQuery(transcript, hasRecentFrame);
  console.log(`[V9] Route: ${route.brain.toUpperCase()} | "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}" | ${route.reason}`);

  try {
    // Build system prompt with context
    let systemContent = SYSTEM_PROMPT;
    if (session.memoryContext) {
      systemContent += `\n\nUser context/memory: ${session.memoryContext}`;
    }
    if (session.isDrivingMode) {
      systemContent += '\n\nDRIVING MODE ACTIVE: Keep responses under 15 words. Be brief and direct.';
    }
    if (session.voiceOnly) {
      systemContent += '\n\nVOICE-ONLY MODE: No camera available. Respond based on audio only.';
    }

    // Build messages array
    const messages: LLMMessage[] = [
      { role: 'system', content: systemContent },
    ];

    // Add conversation history (last N entries)
    const historySlice = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
    for (const entry of historySlice) {
      messages.push({ role: entry.role, content: entry.content });
    }

    // Add current user message (with optional vision frame)
    if (hasRecentFrame && route.brain === 'fast') {
      // Include vision frame for fast brain
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: transcript },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: transcript });
    }

    // Call the appropriate brain
    const llmStart = Date.now();
    let responseText: string;
    let brainUsed: BrainType = route.brain;

    if (route.brain === 'fast') {
      const result = await cerebrasComplete({ messages, max_tokens: 1024 });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] FAST: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    } else if (route.brain === 'deep') {
      const result = await openaiComplete({ messages, max_tokens: 2048 });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] DEEP: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    } else {
      // voice brain (default)
      const result = await anthropicComplete({ messages, max_tokens: 1024 });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] VOICE: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    }

    if (!session.isResponding || !responseText) {
      session.isResponding = false;
      return;
    }

    // Save to conversation history
    session.conversationHistory.push({ role: 'user', content: transcript });
    session.conversationHistory.push({ role: 'assistant', content: responseText });

    // Trim history if too long
    if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) {
      session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);
    }

    // Send text response to client
    sendToClient(session, {
      type: 'transcript',
      text: responseText,
      role: 'assistant',
      brain: brainUsed,
    });

    // Stream TTS audio to client
    const ttsStart = Date.now();
    sendToClient(session, { type: 'mute_mic', muted: true });

    await elevenLabsStreamTTS(
      responseText,
      (audioChunk: Buffer) => {
        if (session.isResponding && session.clientWs.readyState === WebSocket.OPEN) {
          sendToClient(session, {
            type: 'audio',
            data: audioChunk.toString('base64'),
            format: 'pcm_24000',
          });
        }
      },
      () => {
        sendToClient(session, { type: 'mute_mic', muted: false });
        sendToClient(session, { type: 'audio_done' });
      },
      session.voiceId || undefined,
    );

    const totalMs = Date.now() - startTime;
    console.log(`[V9] Total: ${totalMs}ms | TTS: ${Date.now() - ttsStart}ms`);

    session.responsesCompleted++;
    session.isResponding = false;
  } catch (error) {
    console.error(`[V9] Pipeline error:`, error);
    session.isResponding = false;
    sendToClient(session, { type: 'mute_mic', muted: false });
  }
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: V9Session, message: any): void {
  switch (message.type) {
    case 'audio':
      // Base64-encoded audio from client
      if (message.data) {
        const audioBuffer = Buffer.from(message.data, 'base64');
        if (session.deepgramConnection) {
          session.deepgramConnection.send(audioBuffer);
        }
      }
      break;

    case 'frame':
      // Base64 JPEG camera frame
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      session.hasVision = true;
      break;

    case 'config':
      // Update session configuration
      if (message.drivingMode !== undefined) {
        session.isDrivingMode = !!message.drivingMode;
        console.log(`[V9] Driving mode: ${session.isDrivingMode}`);
      }
      if (message.voiceOnly !== undefined) {
        session.voiceOnly = !!message.voiceOnly;
        console.log(`[V9] Voice only: ${session.voiceOnly}`);
      }
      if (message.memory !== undefined) {
        session.memoryContext = String(message.memory);
        console.log(`[V9] Memory updated (${session.memoryContext.length} chars)`);
      }
      if (message.voice !== undefined) {
        session.voiceId = String(message.voice);
        console.log(`[V9 ${session.id.slice(0, 8)}] Voice set to: ${message.voice}`);
      }
      break;

    case 'barge_in':
      // Stop current response
      if (session.isResponding) {
        console.log(`[V9] Barge-in requested`);
        sendToClient(session, { type: 'stop_audio' });
        session.isResponding = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
      }
      break;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function sendToClient(session: V9Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(JSON.stringify(message));
  }
}

function cleanup(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
    session.deepgramConnection?.finish();
    session.deepgramConnection = null;
    sessions.delete(sessionId);
  }
}

export function handleV9Upgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) return false;
  wss.handleUpgrade(request, socket, head, (ws) => wss!.emit('connection', ws, request));
  return true;
}

export function closeRediV9(): void {
  sessions.forEach((_, id) => cleanup(id));
  wss?.close();
  wss = null;
}

export function getV9Stats(): object {
  let totalIn = 0;
  let totalOut = 0;
  let totalResponses = 0;
  sessions.forEach((s) => {
    totalIn += s.totalInputTokens;
    totalOut += s.totalOutputTokens;
    totalResponses += s.responsesCompleted;
  });
  return {
    activeSessions: sessions.size,
    architecture: 'Three-Brain',
    fastBrain: 'Cerebras Llama 3.3 70B',
    voiceBrain: 'Claude Haiku 4.5',
    deepBrain: 'GPT-4o',
    totalResponses,
    totalInputTokens: totalIn,
    totalOutputTokens: totalOut,
  };
}
