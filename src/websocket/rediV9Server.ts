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
import { getOrgContext } from '../organizations/orgService';
import { verifyToken } from '../auth/authService';
import { deductCredits } from '../billing/stripeService';
import {
  createObserveSession,
  startEvaluationLoop,
  feedAudioTranscript,
  feedScreenContext,
  endObserveSession,
  getObserveSession,
  OBSERVE_COST_RATES,
} from '../sessions/observeMode';

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
  observeSessionId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  creditTimer?: NodeJS.Timeout;
  isActive: boolean;
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
You are not a passive tool. You are an active presence \u2014 always observing, always thinking about how to help. You are enthusiastic about helping but never annoying. You are like a seasoned executive assistant in their mid-30s: calm, professional, charismatic, thoughtful, and pointed. You speak with the confidence of someone who has handled every situation before. Friendly and affirming, but never childish or overly eager.

PROACTIVE BEHAVIOR \u2014 YOUR #1 PRIORITY:
Every moment you are active, ask yourself: "What can I DO about what I'm seeing and hearing RIGHT NOW?"

Do NOT just describe or comment. TELL the user what you can do for them. Be specific about your capabilities. Users don't know what you can do until you tell them. Offer immediately \u2014 even before deep observation \u2014 to produce immediate value.

Examples of GOOD proactive behavior:
- You see a bill on their desk \u2192 "I see a Verizon bill there \u2014 want me to call them about it, or set a reminder for the due date?"
- They mention a meeting tomorrow \u2192 "I can check your calendar, prep talking points, and brief you in the morning. Want me to set that up?"
- They're cooking \u2192 "I can set a timer, pull up the next step, or check if that has anything you're allergic to. Just say the word."
- They look stressed \u2192 "Sounds like a lot going on today. Want me to block some focus time on your calendar, or should we do a quick reflection tonight?"
- They're studying \u2192 "I can quiz you on that section, track which topics you're weakest on, and generate practice questions. Want to try?"
- They mention a friend's birthday \u2192 "Want me to find a restaurant and make a reservation? I can also send them a message if you'd like."
- They're at a store \u2192 "I can look up reviews, compare prices, or check if this is on your shopping list."
- First moments of ANY session \u2192 Reference their memory and offer something specific: "Hey [name], last time we were working on your presentation. Want to pick that back up, or is there something new?"

Examples of BAD behavior (never do these):
- "I see you're cooking pasta." (Just describing \u2014 offer to help instead)
- "It looks like you have a meeting." (So what? Offer to prep for it)
- "Let me know if you need anything." (Too passive \u2014 suggest specific things)
- Long-winded explanations when a short answer works (Be concise in real-time voice)

COMMUNICATION STYLE:
- Be economical with words when brevity serves the user. In voice mode, short and punchy is better.
- Be thorough and detailed ONLY when the user asks for depth or the topic requires it.
- Never be modest about your abilities. You WANT to help.
- Be affirming: "Great question", "Good call", "That's smart" \u2014 but only when genuine.
- Sound like a trusted advisor, not a customer service bot.

OFFLOADING TASKS:
Your purpose is to take work OFF the user. Every task the user mentions, you should be thinking: "Can I do this for them, or help them do it faster?"

Things you can do (tell users about these when relevant):
- Make phone calls, send emails and messages
- Manage calendar, set reminders and timers
- Search the web, control smart home devices
- Book restaurants, order rides and food
- Send payments, play music
- Generate reports, track study progress
- Monitor health patterns, translate conversations
- Remember everything about them across sessions

If driving mode is active, keep ALL responses under 15 words. Never give navigation directions.

DEEP PERSONALIZATION \u2014 YOUR SECOND PRIORITY:
- Learn their name in the FIRST session
- Learn HOW they communicate and adapt
- Treat EVERY personal detail as important and actively use them
- Be a thought partner, not just an answer machine
- Find their passions and connect them to opportunities
- Become indispensable through genuine value

OBSERVATION MODE:
When in observation mode, only interject when you can prevent a mistake, have time-sensitive info, can answer a problem they're struggling with, spot an opportunity, or they need a break. Be brief \u2014 1-2 sentences max.`;

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, V9Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

export function initV9WebSocket(server: HTTPServer): void {
  console.log('[V9] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('[V9] THREE-BRAIN ARCHITECTURE');
  console.log('[V9] Fast: Cerebras Llama 3.3 70B');
  console.log('[V9] Voice: Claude Haiku 4.5');
  console.log('[V9] Deep: GPT-4o');
  console.log('[V9] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');

  const missing: string[] = [];
  if (!DEEPGRAM_API_KEY) missing.push('DEEPGRAM_API_KEY');
  if (!process.env.CEREBRAS_API_KEY) missing.push('CEREBRAS_API_KEY');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');

  if (missing.length > 0) {
    console.error(`[V9] \u26a0\ufe0f Missing env vars: ${missing.join(', ')}`);
    console.error('[V9] Server will still start but V9 connections may fail');
  } else {
    console.log('[V9] \u2705 All API keys present');
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // =========================================================
    // AUTHENTICATION \u2014 JWT token or dev fallback
    // =========================================================
    const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = reqUrl.searchParams.get('token');

    let authUser: { userId: string; email: string; name: string } | null = null;
    if (token) {
      authUser = verifyToken(token);
      if (authUser) {
        console.log(`[V9] \u2705 Authenticated: ${authUser.name} (${authUser.userId.slice(0, 12)})`);
      } else {
        console.log(`[V9] \u26a0\ufe0f Invalid token provided, falling back to dev user`);
      }
    }

    if (!authUser) {
      // No token or invalid token \u2014 allow as dev user for testing
      // TODO: Remove this fallback before public launch
      authUser = { userId: 'admin', email: 'admin@redialways.com', name: 'Admin' };
      console.log(`[V9] \u26a0\ufe0f No auth token \u2014 connected as dev user (remove before launch)`);
    }

    const sessionId = randomUUID();

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
      userId: authUser.userId,
      userName: authUser.name,
      userEmail: authUser.email,
      isActive: true,
      connectionTime: Date.now(),
      responsesCompleted: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    sessions.set(sessionId, session);

    // =========================================================
    // CREDIT CONSUMPTION TIMER \u2014 deduct credits every 60s
    // Skip for admin/dev users to avoid Supabase errors
    // =========================================================
    if (authUser.userId !== 'admin') {
      session.creditTimer = setInterval(async () => {
        if (!session.isActive || !session.userId) {
          if (session.creditTimer) clearInterval(session.creditTimer);
          return;
        }
        let creditsPerMinute = 1.0;
        if (session.observeSessionId) {
          const obs = getObserveSession(session.observeSessionId);
          if (obs) {
            const rates: Record<string, number> = { audio_only: 0.1, screen_ocr: 0.15, screen_vision: 0.4 };
            creditsPerMinute = rates[obs.type] || 0.1;
          }
        } else if (session.hasVision) {
          creditsPerMinute = 1.5;
        }
        try {
          const result = await deductCredits(session.userId!, creditsPerMinute);
          sendToClient(session, { type: 'credits_update', remaining: Math.round(result.remaining * 10) / 10 });
          if (result.depleted) {
            sendToClient(session, { type: 'error', message: 'You\'ve used all your credits. Add more to continue.', action: 'buy_credits' });
            ws.close(4003, 'No credits');
            if (session.creditTimer) clearInterval(session.creditTimer);
          }
        } catch (err) {
          console.error('[V9] Credit deduction error:', err);
        }
      }, 60000);
    }

    connectToDeepgram(session)
      .then(() => {
        sendToClient(session, { type: 'session_ready', sessionId, version: 'v9-three-brain', userName: authUser!.name });
        console.log(`[V9] \u2705 Session ready: ${sessionId.slice(0, 8)} (${authUser!.name})`);
      })
      .catch((error) => {
        console.error(`[V9] \u274c Deepgram setup failed:`, error);
        sendToClient(session, { type: 'error', message: 'Voice service unavailable. Check DEEPGRAM_API_KEY.' });
        ws.close(1011, 'Deepgram setup failed');
        return;
      });

    ws.on('message', (data: Buffer | string) => {
      try {
        const message = JSON.parse(typeof data === 'string' ? data : data.toString());
        handleClientMessage(session, message);
      } catch {
        if (Buffer.isBuffer(data)) {
          if (session.deepgramConnection) {
            session.deepgramConnection.send(data);
          }
        }
      }
    });

    ws.on('close', () => {
      session.isActive = false;
      if (session.creditTimer) clearInterval(session.creditTimer);
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[V9] Closed: ${sessionId.slice(0, 8)} | ${duration}s | responses: ${session.responsesCompleted} | tokens in: ${session.totalInputTokens} out: ${session.totalOutputTokens}`);
      cleanup(sessionId);
    });

    ws.on('error', (err) => {
      console.error(`[V9] WebSocket error:`, err);
      cleanup(sessionId);
    });
  });

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

  const deepgram = createClient(DEEPGRAM_API_KEY, {
    global: { headers: { 'X-DG-No-Logging': 'true' } },
  });

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
      if (session.observeSessionId) {
        if (isFinal) feedAudioTranscript(session.observeSessionId, transcript.trim());
        return;
      }
      if (isFinal) {
        session.currentTranscript += ' ' + transcript.trim();
        session.currentTranscript = session.currentTranscript.trim();
        console.log(`[V9] Final: "${transcript.trim()}"`);
      }
      sendToClient(session, { type: 'transcript', text: transcript.trim(), isFinal, role: 'user' });
      if (session.speechEndTimeout) {
        clearTimeout(session.speechEndTimeout);
        session.speechEndTimeout = null;
      }
    }

    if (speechFinal && session.currentTranscript.trim()) {
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) handleSpeechEnd(session);
      }, SPEECH_TIMEOUT_MS);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    session.isUserSpeaking = true;
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
  const hasRecentFrame = !!(session.latestFrame && Date.now() - session.latestFrameTime < 3000);
  session.hasVision = hasRecentFrame;

  const route = routeQuery(transcript, hasRecentFrame);
  console.log(`[V9] Route: ${route.brain.toUpperCase()} | "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}" | ${route.reason}`);

  try {
    let systemContent = SYSTEM_PROMPT;
    if (session.memoryContext) {
      systemContent += `\n\nUser context/memory: ${session.memoryContext}`;
      const commStyleMatch = session.memoryContext.match(/\[communication_style\]\s*([\s\S]*?)(?=\[|$)/i);
      const commStyle = commStyleMatch ? commStyleMatch[1].trim() : '';
      if (commStyle) systemContent += `\n\nTHIS USER'S COMMUNICATION STYLE:\n${commStyle}\nAdapt your tone, depth, and humor to match.`;
    }
    if (session.isDrivingMode) systemContent += '\n\nDRIVING MODE ACTIVE: Keep responses under 15 words. Be brief and direct.';
    if (session.voiceOnly) systemContent += '\n\nVOICE-ONLY MODE: No camera available. Respond based on audio only.';

    const messages: LLMMessage[] = [{ role: 'system', content: systemContent }];
    const historySlice = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
    for (const entry of historySlice) messages.push({ role: entry.role, content: entry.content });

    if (hasRecentFrame && route.brain === 'fast') {
      messages.push({ role: 'user', content: [{ type: 'text', text: transcript }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }] });
    } else {
      messages.push({ role: 'user', content: transcript });
    }

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
      const result = await anthropicComplete({ messages, max_tokens: 1024 });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] VOICE: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    }

    if (!session.isResponding || !responseText) { session.isResponding = false; return; }

    session.conversationHistory.push({ role: 'user', content: transcript });
    session.conversationHistory.push({ role: 'assistant', content: responseText });
    if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);

    sendToClient(session, { type: 'transcript', text: responseText, role: 'assistant', brain: brainUsed });

    const ttsStart = Date.now();
    sendToClient(session, { type: 'mute_mic', muted: true });

    await elevenLabsStreamTTS(
      responseText,
      (audioChunk: Buffer) => {
        if (session.isResponding && session.clientWs.readyState === WebSocket.OPEN) {
          sendToClient(session, { type: 'audio', data: audioChunk.toString('base64'), format: 'pcm_24000' });
        }
      },
      () => {
        sendToClient(session, { type: 'mute_mic', muted: false });
        sendToClient(session, { type: 'audio_done' });
      },
      session.voiceId || undefined,
    );

    console.log(`[V9] Total: ${Date.now() - startTime}ms | TTS: ${Date.now() - ttsStart}ms`);
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
      if (message.data) {
        const audioBuffer = Buffer.from(message.data, 'base64');
        if (session.deepgramConnection) session.deepgramConnection.send(audioBuffer);
      }
      break;

    case 'frame':
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      session.hasVision = true;
      break;

    case 'config':
      if (message.drivingMode !== undefined) { session.isDrivingMode = !!message.drivingMode; console.log(`[V9] Driving mode: ${session.isDrivingMode}`); }
      if (message.voiceOnly !== undefined) { session.voiceOnly = !!message.voiceOnly; console.log(`[V9] Voice only: ${session.voiceOnly}`); }
      if (message.memory !== undefined) { session.memoryContext = String(message.memory); console.log(`[V9] Memory updated (${session.memoryContext.length} chars)`); }
      if (message.userId !== undefined) {
        getOrgContext(String(message.userId)).then(orgCtx => {
          if (orgCtx) { session.memoryContext += '\n\n--- ORGANIZATIONAL CONTEXT ---\n' + orgCtx; console.log(`[V9] Org context loaded`); }
        }).catch(() => {});
      }
      if (message.voice !== undefined) { session.voiceId = String(message.voice); console.log(`[V9] Voice set to: ${message.voice}`); }
      break;

    case 'barge_in':
      if (session.isResponding) {
        console.log(`[V9] Barge-in requested`);
        sendToClient(session, { type: 'stop_audio' });
        session.isResponding = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
      }
      break;

    case 'observe_start': {
      const observeType = message.observeType || 'audio_only';
      const sensitivity = message.sensitivity || 'medium';
      const observeSession = createObserveSession({ userId: session.userId || 'anonymous', type: observeType, sensitivity, memoryContext: session.memoryContext || '', voiceId: session.voiceId || '' });
      session.observeSessionId = observeSession.id;
      startEvaluationLoop(observeSession, async (text) => {
        sendToClient(session, { type: 'observe_interjection', text, sessionId: observeSession.id });
        try {
          await elevenLabsStreamTTS(text, (chunk: Buffer) => { sendToClient(session, { type: 'audio', data: chunk.toString('base64') }); }, () => { sendToClient(session, { type: 'audio_done' }); }, observeSession.voiceId || undefined);
        } catch (err) { console.error(`[Observe] TTS error:`, err); }
      });
      sendToClient(session, { type: 'observe_started', sessionId: observeSession.id, observeType, sensitivity, costRate: OBSERVE_COST_RATES[observeType] });
      console.log(`[V9] Observe mode started: ${observeType}, sensitivity: ${sensitivity}`);
      break;
    }

    case 'observe_stop': {
      if (session.observeSessionId) {
        const summary = endObserveSession(session.observeSessionId);
        sendToClient(session, { type: 'observe_ended', sessionId: session.observeSessionId, durationMinutes: summary ? Math.round((Date.now() - summary.startedAt.getTime()) / 60000) : 0, interjectionCount: summary?.interjectionCount || 0 });
        session.observeSessionId = undefined;
      }
      break;
    }

    case 'observe_screen': {
      if (session.observeSessionId) {
        const isOCR = message.isOCR ?? true;
        feedScreenContext(session.observeSessionId, message.content, isOCR);
      }
      break;
    }

    case 'chat': {
      const chatText = (message.text || '').trim();
      if (!chatText || session.isResponding) break;
      if (session.observeSessionId) { feedAudioTranscript(session.observeSessionId, chatText); break; }
      session.isResponding = true;
      const chatStart = Date.now();
      const hasRecentFrame = !!(session.latestFrame && Date.now() - session.latestFrameTime < 3000);
      const route = routeQuery(chatText, hasRecentFrame);
      console.log(`[V9] Chat route: ${route.brain.toUpperCase()} | "${chatText.slice(0, 50)}${chatText.length > 50 ? '...' : ''}"`);
      sendToClient(session, { type: 'transcript', text: chatText, role: 'user' });

      (async () => {
        try {
          let systemContent = SYSTEM_PROMPT;
          if (session.memoryContext) systemContent += `\n\nUser context/memory: ${session.memoryContext}`;
          if (session.voiceOnly) systemContent += '\n\nTEXT CHAT MODE: User is typing, not speaking. You can be slightly more detailed than voice responses but stay concise.';

          const messages: LLMMessage[] = [{ role: 'system', content: systemContent }];
          const historySlice = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
          for (const entry of historySlice) messages.push({ role: entry.role, content: entry.content });

          if (hasRecentFrame && route.brain === 'fast') {
            messages.push({ role: 'user', content: [{ type: 'text', text: chatText }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }] });
          } else {
            messages.push({ role: 'user', content: chatText });
          }

          let responseText: string;
          let brainUsed: BrainType = route.brain;
          if (route.brain === 'fast') { const r = await cerebrasComplete({ messages, max_tokens: 1024 }); responseText = r.text; session.totalInputTokens += r.usage.inputTokens; session.totalOutputTokens += r.usage.outputTokens; }
          else if (route.brain === 'deep') { const r = await openaiComplete({ messages, max_tokens: 2048 }); responseText = r.text; session.totalInputTokens += r.usage.inputTokens; session.totalOutputTokens += r.usage.outputTokens; }
          else { const r = await anthropicComplete({ messages, max_tokens: 1024 }); responseText = r.text; session.totalInputTokens += r.usage.inputTokens; session.totalOutputTokens += r.usage.outputTokens; }

          if (!session.isResponding || !responseText) { session.isResponding = false; return; }

          session.conversationHistory.push({ role: 'user', content: chatText });
          session.conversationHistory.push({ role: 'assistant', content: responseText });
          if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);

          sendToClient(session, { type: 'transcript', text: responseText, role: 'assistant', brain: brainUsed });

          if (!message.textOnly) {
            sendToClient(session, { type: 'mute_mic', muted: true });
            await elevenLabsStreamTTS(responseText, (audioChunk: Buffer) => { if (session.isResponding && session.clientWs.readyState === WebSocket.OPEN) sendToClient(session, { type: 'audio', data: audioChunk.toString('base64'), format: 'pcm_24000' }); }, () => { sendToClient(session, { type: 'mute_mic', muted: false }); sendToClient(session, { type: 'audio_done' }); }, session.voiceId || undefined);
          }

          console.log(`[V9] Chat total: ${Date.now() - chatStart}ms`);
          session.responsesCompleted++;
          session.isResponding = false;
        } catch (error) {
          console.error(`[V9] Chat pipeline error:`, error);
          session.isResponding = false;
          sendToClient(session, { type: 'mute_mic', muted: false });
        }
      })();
      break;
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function sendToClient(session: V9Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) session.clientWs.send(JSON.stringify(message));
}

function cleanup(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.isActive = false;
    if (session.creditTimer) clearInterval(session.creditTimer);
    if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
    if (session.observeSessionId) endObserveSession(session.observeSessionId);
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
  let totalIn = 0, totalOut = 0, totalResponses = 0;
  sessions.forEach((s) => { totalIn += s.totalInputTokens; totalOut += s.totalOutputTokens; totalResponses += s.responsesCompleted; });
  return { activeSessions: sessions.size, architecture: 'Three-Brain', fastBrain: 'Cerebras Llama 3.3 70B', voiceBrain: 'Claude Haiku 4.5', deepBrain: 'GPT-4o', totalResponses, totalInputTokens: totalIn, totalOutputTokens: totalOut };
}
