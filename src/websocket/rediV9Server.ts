/**
 * Redi V9 Server - THREE-BRAIN ARCHITECTURE
 * ==========================================
 *
 * Pipeline: Deepgram STT -> [Web Search?] -> Brain Router -> [Cerebras | Claude Haiku | GPT-4o] -> ElevenLabs TTS
 *
 * Endpoint: /ws/redi?v=9
 *
 * Updated: Feb 23, 2026 (v5)
 * - HYBRID speech timing: speechFinal starts 800ms timer, UtteranceEnd fires immediately
 * - TTS always sends audio (removed isResponding guard on onChunk — barge-in was killing audio)
 * - Barge-in only cancels BEFORE TTS starts, not during
 * - Web search via Tavily
 * - WebSocket ping/pong keepalive 30s
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
import { needsWebSearch, searchWeb, formatSearchResultsForLLM } from '../integrations/webSearch';
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

// HYBRID SPEECH TIMING:
// - speechFinal (phrase boundary) starts SPEECH_TIMEOUT_MS timer (800ms)
// - Each new final transcript resets the timer
// - UtteranceEnd (2s silence) fires with only 300ms buffer
// Result: quick exchanges respond in ~1s, multi-phrase sentences accumulate properly
const SPEECH_TIMEOUT_MS = 800;
const MAX_HISTORY_ENTRIES = 20;

// Max tokens — voice responses MUST be ultra-short
const FAST_MAX_TOKENS = 80;    // ~1-2 sentences spoken aloud
const DEEP_MAX_TOKENS = 150;   // Vision/complex can be slightly longer
const VOICE_MAX_TOKENS = 80;

// WebSocket keepalive interval (prevents idle disconnects)
const WS_PING_INTERVAL_MS = 30000;

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
  isTTSActive: boolean;  // NEW: tracks whether TTS is currently sending audio
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
  pingInterval?: NodeJS.Timeout;
  isActive: boolean;
  connectionTime: number;
  responsesCompleted: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  ttsChunkCount: number;
  ttsTotalBytes: number;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Redi (pronounced "ready"), a real-time voice AI assistant. Everything you write is spoken aloud via TTS.

VOICE RULES — FOLLOW STRICTLY:
- 1-2 sentences max. You are being SPOKEN. Every extra word wastes the user's time.
- Greetings: "Hey! What's going on?" — that's it. No introductions, no offers, no monologues.
- Direct answers only. No filler ("That's a great question"), no preamble, no repetition.
- Complex topics: give the short answer. If they want more, they'll ask.

REAL-TIME DATA:
- When web search results are provided, use them to give accurate answers.
- Summarize search results in 1-2 spoken sentences. Don't list URLs.
- Write numbers and units clearly for TTS: "72 degrees" not "72°", "5 dollars" not "$5".
- If no search results are provided and you don't know current data, say so briefly.

IDENTITY: Confident, warm, sharp. Proactive — suggest actions, don't just describe.

DRIVING MODE: If active, 10 words max. No directions.`;

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
  console.log('[V9] THREE-BRAIN ARCHITECTURE + WEB SEARCH');
  console.log('[V9] Fast: Cerebras GPT-OSS 120B | max ' + FAST_MAX_TOKENS + ' tokens');
  console.log('[V9] Voice: Claude Haiku 4.5 | max ' + VOICE_MAX_TOKENS + ' tokens');
  console.log('[V9] Deep: GPT-4o (vision + complex) | max ' + DEEP_MAX_TOKENS + ' tokens');
  console.log('[V9] Search: Tavily API | Audio: MP3 ElevenLabs');
  console.log('[V9] Speech: hybrid (speechFinal 800ms + UtteranceEnd 2s) | Ping: 30s');
  console.log('[V9] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');

  const missing: string[] = [];
  if (!DEEPGRAM_API_KEY) missing.push('DEEPGRAM_API_KEY');
  if (!process.env.CEREBRAS_API_KEY) missing.push('CEREBRAS_API_KEY');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');
  if (!process.env.TAVILY_API_KEY) missing.push('TAVILY_API_KEY');

  if (missing.length > 0) {
    console.error(`[V9] \u26a0\ufe0f Missing env vars: ${missing.join(', ')}`);
  } else {
    console.log('[V9] \u2705 All API keys present (including Tavily)');
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = reqUrl.searchParams.get('token');

    let authUser: { userId: string; email: string; name: string } | null = null;
    if (token) {
      authUser = verifyToken(token);
      if (authUser) {
        console.log(`[V9] \u2705 Authenticated: ${authUser.name} (${authUser.userId.slice(0, 12)})`);
      } else {
        console.log(`[V9] \u26a0\ufe0f Invalid token, falling back to dev user`);
      }
    }

    if (!authUser) {
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
      isTTSActive: false,
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
      ttsChunkCount: 0,
      ttsTotalBytes: 0,
    };

    sessions.set(sessionId, session);

    // WebSocket keepalive — ping every 30s to prevent idle disconnects
    session.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        if (session.pingInterval) clearInterval(session.pingInterval);
      }
    }, WS_PING_INTERVAL_MS);

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
        sendToClient(session, { type: 'error', message: 'Voice service unavailable.' });
        ws.close(1011, 'Deepgram setup failed');
        return;
      });

    ws.on('message', (data: Buffer | string) => {
      try {
        const message = JSON.parse(typeof data === 'string' ? data : data.toString());
        handleClientMessage(session, message);
      } catch {
        if (Buffer.isBuffer(data)) {
          if (session.deepgramConnection) session.deepgramConnection.send(data);
        }
      }
    });

    ws.on('pong', () => {});

    ws.on('close', () => {
      session.isActive = false;
      if (session.creditTimer) clearInterval(session.creditTimer);
      if (session.pingInterval) clearInterval(session.pingInterval);
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
      if (!wss) { socket.destroy(); return; }
      console.log(`[V9] Upgrade request for v=9`);
      wss.handleUpgrade(request, socket, head, (ws) => { wss!.emit('connection', ws, request); });
    }
  });

  console.log('[V9] WebSocket server initialized on /ws/redi?v=9');
}

// =============================================================================
// DEEPGRAM STT — HYBRID SPEECH TIMING
// =============================================================================

async function connectToDeepgram(session: V9Session): Promise<void> {
  if (!DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY not set');

  const deepgram = createClient(DEEPGRAM_API_KEY, {
    global: { headers: { 'X-DG-No-Logging': 'true' } },
  });

  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 2000,
    vad_events: true,
    encoding: 'linear16',
    sample_rate: 24000,
    channels: 1,
    keywords: ['Redi:5', 'Redi Always:3'],
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[V9] Deepgram connected (nova-2, keywords: Redi)`);
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

      // Any new speech resets pending timeout — user is still talking
      if (session.speechEndTimeout) {
        clearTimeout(session.speechEndTimeout);
        session.speechEndTimeout = null;
      }
    }

    // HYBRID: speechFinal starts a SHORT timer (800ms).
    // If user keeps talking, next final transcript resets the timer.
    // If user stops, 800ms passes and we respond.
    // This is faster than waiting for UtteranceEnd (2s) for quick exchanges.
    if (speechFinal && session.currentTranscript.trim() && !session.isResponding) {
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) {
          handleSpeechEnd(session);
        }
      }, SPEECH_TIMEOUT_MS);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    session.isUserSpeaking = true;

    // Barge-in: cancel pending LLM request (but NOT active TTS — let it finish sending)
    if (session.isResponding && !session.isTTSActive) {
      console.log(`[V9] BARGE-IN (pre-TTS)`);
      session.isResponding = false;
    } else if (session.isTTSActive) {
      // TTS is actively sending — tell client to stop playback
      console.log(`[V9] BARGE-IN (during TTS)`);
      sendToClient(session, { type: 'stop_audio' });
      session.isResponding = false;
      session.isTTSActive = false;
    }

    if (session.speechEndTimeout) {
      clearTimeout(session.speechEndTimeout);
      session.speechEndTimeout = null;
    }
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    session.isUserSpeaking = false;
    // UtteranceEnd = 2 seconds of total silence. If we haven't responded yet, do it now.
    if (session.currentTranscript.trim() && !session.isResponding) {
      if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
      // Short buffer to catch trailing transcripts
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) handleSpeechEnd(session);
      }, 300);
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
// SEND BINARY AUDIO TO CLIENT
// =============================================================================

function sendAudioBinary(session: V9Session, audioChunk: Buffer): void {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(audioChunk);
    session.ttsChunkCount++;
    session.ttsTotalBytes += audioChunk.length;
  }
}

// =============================================================================
// WEB SEARCH HELPER
// =============================================================================

async function maybeSearchWeb(transcript: string): Promise<string | null> {
  if (!needsWebSearch(transcript)) return null;

  try {
    console.log(`[V9] \uD83D\uDD0D Web search for: "${transcript.slice(0, 60)}"`);
    const searchStart = Date.now();
    const results = await searchWeb(transcript, 3);
    const formatted = formatSearchResultsForLLM(results);
    console.log(`[V9] \uD83D\uDD0D ${results.length} results in ${Date.now() - searchStart}ms`);
    return formatted;
  } catch (err) {
    console.error(`[V9] \uD83D\uDD0D Search failed:`, err);
    return null;
  }
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
  const hasRecentFrame = !!(session.latestFrame && Date.now() - session.latestFrameTime < 5000);
  session.hasVision = hasRecentFrame;

  const route = routeQuery(transcript, hasRecentFrame);
  console.log(`[V9] Route: ${route.brain.toUpperCase()} | "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}" | ${route.reason}`);

  try {
    // Web search if needed (weather, news, scores, prices)
    const searchResults = await maybeSearchWeb(transcript);

    let systemContent = SYSTEM_PROMPT;
    if (session.memoryContext) systemContent += `\n\nUser context: ${session.memoryContext}`;
    if (searchResults) systemContent += `\n\nWEB SEARCH RESULTS (use these to answer):\n${searchResults}`;
    if (session.isDrivingMode) systemContent += '\n\nDRIVING MODE: 10 words max. No directions.';

    const messages: LLMMessage[] = [{ role: 'system', content: systemContent }];
    const historySlice = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
    for (const entry of historySlice) messages.push({ role: entry.role, content: entry.content });

    if (hasRecentFrame && route.brain === 'deep') {
      messages.push({ role: 'user', content: [{ type: 'text', text: transcript }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }] });
    } else {
      messages.push({ role: 'user', content: transcript });
    }

    let responseText: string;
    let brainUsed: BrainType = route.brain;

    // Check if barge-in happened during LLM call
    if (!session.isResponding) { return; }

    if (route.brain === 'fast') {
      const result = await cerebrasComplete({ messages, max_tokens: FAST_MAX_TOKENS });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] FAST: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    } else if (route.brain === 'deep') {
      const result = await openaiComplete({ messages, max_tokens: DEEP_MAX_TOKENS });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] DEEP: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    } else {
      const result = await anthropicComplete({ messages, max_tokens: VOICE_MAX_TOKENS });
      responseText = result.text;
      session.totalInputTokens += result.usage.inputTokens;
      session.totalOutputTokens += result.usage.outputTokens;
      console.log(`[V9] VOICE: ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
    }

    // Check again after LLM call
    if (!session.isResponding || !responseText) { session.isResponding = false; return; }

    session.conversationHistory.push({ role: 'user', content: transcript });
    session.conversationHistory.push({ role: 'assistant', content: responseText });
    if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);

    sendToClient(session, { type: 'response', text: responseText, brain: brainUsed, latencyMs: Date.now() - startTime });

    // TTS — mark as active so barge-in handles it properly
    const ttsStart = Date.now();
    session.ttsChunkCount = 0;
    session.ttsTotalBytes = 0;
    session.isTTSActive = true;
    sendToClient(session, { type: 'mute_mic', muted: true });

    await elevenLabsStreamTTS(
      responseText,
      (audioChunk: Buffer) => {
        // ALWAYS send audio if WebSocket is open — don't check isResponding here.
        // Barge-in sends stop_audio to client which handles it on their end.
        if (session.clientWs.readyState === WebSocket.OPEN && session.isTTSActive) {
          sendAudioBinary(session, audioChunk);
        }
      },
      () => {
        console.log(`[V9] TTS sent: ${session.ttsChunkCount} chunks, ${Math.round(session.ttsTotalBytes / 1024)}KB`);
        session.isTTSActive = false;
        sendToClient(session, { type: 'mute_mic', muted: false });
        sendToClient(session, { type: 'audio_done' });
      },
      session.voiceId || undefined,
    );

    console.log(`[V9] Total: ${Date.now() - startTime}ms | TTS: ${Date.now() - ttsStart}ms`);
    session.responsesCompleted++;
    session.isResponding = false;
    session.isTTSActive = false;
  } catch (error) {
    console.error(`[V9] Pipeline error:`, error);
    session.isResponding = false;
    session.isTTSActive = false;
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
      if (session.isResponding || session.isTTSActive) {
        console.log(`[V9] Barge-in requested`);
        sendToClient(session, { type: 'stop_audio' });
        session.isResponding = false;
        session.isTTSActive = false;
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
          await elevenLabsStreamTTS(text, (chunk: Buffer) => { sendAudioBinary(session, chunk); }, () => { sendToClient(session, { type: 'audio_done' }); }, observeSession.voiceId || undefined);
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
      const hasRecentFrame = !!(session.latestFrame && Date.now() - session.latestFrameTime < 5000);
      const route = routeQuery(chatText, hasRecentFrame);
      console.log(`[V9] Chat route: ${route.brain.toUpperCase()} | "${chatText.slice(0, 50)}${chatText.length > 50 ? '...' : ''}"`);
      sendToClient(session, { type: 'transcript', text: chatText, role: 'user' });

      (async () => {
        try {
          const searchResults = await maybeSearchWeb(chatText);

          let systemContent = SYSTEM_PROMPT;
          if (session.memoryContext) systemContent += `\n\nUser context: ${session.memoryContext}`;
          if (searchResults) systemContent += `\n\nWEB SEARCH RESULTS (use these to answer):\n${searchResults}`;

          const messages: LLMMessage[] = [{ role: 'system', content: systemContent }];
          const historySlice = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
          for (const entry of historySlice) messages.push({ role: entry.role, content: entry.content });

          if (hasRecentFrame && route.brain === 'deep') {
            messages.push({ role: 'user', content: [{ type: 'text', text: chatText }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }] });
          } else {
            messages.push({ role: 'user', content: chatText });
          }

          let responseText: string;
          let brainUsed: BrainType = route.brain;
          if (route.brain === 'fast') { const r = await cerebrasComplete({ messages, max_tokens: FAST_MAX_TOKENS }); responseText = r.text; session.totalInputTokens += r.usage.inputTokens; session.totalOutputTokens += r.usage.outputTokens; }
          else if (route.brain === 'deep') { const r = await openaiComplete({ messages, max_tokens: DEEP_MAX_TOKENS }); responseText = r.text; session.totalInputTokens += r.usage.inputTokens; session.totalOutputTokens += r.usage.outputTokens; }
          else { const r = await anthropicComplete({ messages, max_tokens: VOICE_MAX_TOKENS }); responseText = r.text; session.totalInputTokens += r.usage.inputTokens; session.totalOutputTokens += r.usage.outputTokens; }

          if (!session.isResponding || !responseText) { session.isResponding = false; return; }

          session.conversationHistory.push({ role: 'user', content: chatText });
          session.conversationHistory.push({ role: 'assistant', content: responseText });
          if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);

          sendToClient(session, { type: 'response', text: responseText, brain: brainUsed, latencyMs: Date.now() - chatStart });

          if (!message.textOnly) {
            session.ttsChunkCount = 0;
            session.ttsTotalBytes = 0;
            session.isTTSActive = true;
            sendToClient(session, { type: 'mute_mic', muted: true });
            await elevenLabsStreamTTS(responseText, (audioChunk: Buffer) => {
              if (session.clientWs.readyState === WebSocket.OPEN && session.isTTSActive) sendAudioBinary(session, audioChunk);
            }, () => {
              session.isTTSActive = false;
              sendToClient(session, { type: 'mute_mic', muted: false });
              sendToClient(session, { type: 'audio_done' });
            }, session.voiceId || undefined);
          }

          console.log(`[V9] Chat total: ${Date.now() - chatStart}ms`);
          session.responsesCompleted++;
          session.isResponding = false;
          session.isTTSActive = false;
        } catch (error) {
          console.error(`[V9] Chat pipeline error:`, error);
          session.isResponding = false;
          session.isTTSActive = false;
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
    if (session.pingInterval) clearInterval(session.pingInterval);
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
  return { activeSessions: sessions.size, architecture: 'Three-Brain + Web Search', fastBrain: 'Cerebras GPT-OSS 120B', voiceBrain: 'Claude Haiku 4.5', deepBrain: 'GPT-4o', search: 'Tavily', totalResponses, totalInputTokens: totalIn, totalOutputTokens: totalOut };
}
