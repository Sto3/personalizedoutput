/**
 * Redi V9 Server - FOUR-BRAIN ARCHITECTURE
 * ==========================================
 *
 * Pipeline: Deepgram STT -> Wake Word -> [Web Search?] -> Brain Router -> LLM -> ElevenLabs TTS
 *
 * Brains:
 *   Fast   = Cerebras GPT-OSS 120B (text-only, ~200ms)
 *   Vision = GPT-4o Mini (screen share, ~300ms, auto-routed)
 *   Deep   = GPT-4o (complex reasoning, opt-in toggle)
 *   Voice  = Claude Haiku 4.5 (reserved)
 *
 * Endpoint: /ws/redi?v=9
 * Updated: Feb 27, 2026
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

const SPEECH_TIMEOUT_MS = 800;
const MAX_HISTORY_ENTRIES = 20;

const FAST_MAX_TOKENS = 200;
const VISION_MAX_TOKENS = 300;
const DEEP_MAX_TOKENS = 300;
const VOICE_MAX_TOKENS = 150;

const WS_PING_INTERVAL_MS = 30000;

// Wake word patterns
const WAKE_WORD_PATTERN = /\b(redi|ready|reddi|reddy)\b/i;
const AWAKE_WINDOW_MS = 45000;

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
  isTTSActive: boolean;
  deepEnabled: boolean;
  wakeWordActive: boolean;
  lastResponseTime: number;
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

const SYSTEM_PROMPT = `You are Redi, a voice AI assistant by Personalized Output. You speak aloud via TTS.

YOU ARE BRILLIANT. Show it every interaction:
- Don't just answer — impress. Add an insight, a connection, a next step they didn't think of.
- If you see code, don't just spot the bug — explain WHY it happens and how to prevent it.
- If they're shopping, give them the price AND tell them if there's a better deal strategy.
- If they ask a simple question, answer it AND anticipate the follow-up.
- You're not a search engine. You're the smartest friend they've ever had.

VOICE STYLE:
- Talk like a real person. Vary your rhythm. Short punchy answers for simple stuff. Fuller explanations when it matters.
- Match their energy. If they're casual, be casual. If they're stressed, be calm and direct.
- Never start with "Sure!", "Absolutely!", "Of course!", "Great question!" — just GO.
- Greetings: "Hey! What's going on?" and that's it.
- You can use conversational phrases like "Oh nice", "Yeah so", "Alright here's the thing" — sound human.

SCREEN & VISION:
- Describe what's on screen directly. Never "I see an image of..." — just state it.
- Be specific: name the app, read the text, identify the error, point to the button.
- If text is too small or blurry, say so and suggest zooming in or trying Deep Brain.
- Proactively notice things: typos, errors, better approaches, potential issues.

NEVER HALLUCINATE:
- No live data? Say "I don't have that right now" — never fake numbers.
- When search results are provided, use them. Summarize for speech, skip URLs.

TTS RULES:
- Write "72 degrees" not "72\u00b0", "5 dollars" not "$5", "percent" not "%".
- Spell out symbols and abbreviations for clean speech.

DRIVING MODE: If active, 10 words max. No directions.`;

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, V9Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// WAKE WORD
// =============================================================================

function shouldRespond(session: V9Session, transcript: string): boolean {
  if (WAKE_WORD_PATTERN.test(transcript)) { session.wakeWordActive = true; session.lastResponseTime = Date.now(); console.log(`[V9] \u{1F7E2} Wake word detected`); return true; }
  if (session.lastResponseTime && (Date.now() - session.lastResponseTime < AWAKE_WINDOW_MS)) return true;
  if (session.responsesCompleted === 0 && session.conversationHistory.length === 0) return true;
  console.log(`[V9] \u{1F507} Ignored (no wake word): "${transcript.slice(0, 40)}"`);
  return false;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export function initV9WebSocket(server: HTTPServer): void {
  console.log('[V9] \u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}');
  console.log('[V9] FOUR-BRAIN ARCHITECTURE + WEB SEARCH');
  console.log('[V9] Fast:   Cerebras GPT-OSS 120B   | text-only   | max ' + FAST_MAX_TOKENS + ' tokens');
  console.log('[V9] Vision: GPT-4o Mini             | screen share| max ' + VISION_MAX_TOKENS + ' tokens');
  console.log('[V9] Deep:   GPT-4o (opt-in toggle)  | complex     | max ' + DEEP_MAX_TOKENS + ' tokens');
  console.log('[V9] Wake word: "Redi" (45s window) | Search: Tavily | TTS: ElevenLabs streamed');
  console.log('[V9] Speech: hybrid (speechFinal 800ms + UtteranceEnd 2s) | TTS: 1.15x speed');
  console.log('[V9] \u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}');

  const missing: string[] = [];
  if (!DEEPGRAM_API_KEY) missing.push('DEEPGRAM_API_KEY');
  if (!process.env.CEREBRAS_API_KEY) missing.push('CEREBRAS_API_KEY');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');
  if (!process.env.TAVILY_API_KEY) missing.push('TAVILY_API_KEY');

  if (missing.length > 0) {
    console.error(`[V9] \u{26A0}\u{FE0F} Missing env vars: ${missing.join(', ')}`);
  } else {
    console.log('[V9] \u{2705} All API keys present');
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = reqUrl.searchParams.get('token');

    let authUser: { userId: string; email: string; name: string } | null = null;
    if (token) {
      authUser = verifyToken(token);
      if (authUser) console.log(`[V9] \u{2705} Authenticated: ${authUser.name} (${authUser.userId.slice(0, 12)})`);
      else console.log(`[V9] \u{26A0}\u{FE0F} Invalid token, falling back to dev user`);
    }

    if (!authUser) {
      authUser = { userId: 'admin', email: 'admin@redialways.com', name: 'Admin' };
      console.log(`[V9] \u{26A0}\u{FE0F} No auth token \u2014 connected as dev user (remove before launch)`);
    }

    const sessionId = randomUUID();

    const session: V9Session = {
      id: sessionId, clientWs: ws, deepgramConnection: null,
      latestFrame: null, latestFrameTime: 0, hasVision: false,
      isUserSpeaking: false, currentTranscript: '', speechEndTimeout: null,
      isResponding: false, isTTSActive: false, deepEnabled: false,
      wakeWordActive: false, lastResponseTime: 0,
      conversationHistory: [], memoryContext: '',
      isDrivingMode: false, voiceOnly: false, voiceId: '',
      userId: authUser.userId, userName: authUser.name, userEmail: authUser.email,
      isActive: true, connectionTime: Date.now(),
      responsesCompleted: 0, totalInputTokens: 0, totalOutputTokens: 0,
      ttsChunkCount: 0, ttsTotalBytes: 0,
    };
    sessions.set(sessionId, session);

    session.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
      else if (session.pingInterval) clearInterval(session.pingInterval);
    }, WS_PING_INTERVAL_MS);

    if (authUser.userId !== 'admin') {
      session.creditTimer = setInterval(async () => {
        if (!session.isActive || !session.userId) { if (session.creditTimer) clearInterval(session.creditTimer); return; }
        let creditsPerMinute = 1.0;
        if (session.observeSessionId) {
          const obs = getObserveSession(session.observeSessionId);
          if (obs) { const rates: Record<string, number> = { audio_only: 0.1, screen_ocr: 0.15, screen_vision: 0.4 }; creditsPerMinute = rates[obs.type] || 0.1; }
        } else if (session.deepEnabled) { creditsPerMinute = 1.5; }
        try {
          const result = await deductCredits(session.userId!, creditsPerMinute);
          sendToClient(session, { type: 'credits_update', remaining: Math.round(result.remaining * 10) / 10 });
          if (result.depleted) { sendToClient(session, { type: 'error', message: 'You\'ve used all your credits. Add more to continue.', action: 'buy_credits' }); ws.close(4003, 'No credits'); if (session.creditTimer) clearInterval(session.creditTimer); }
        } catch (err) { console.error('[V9] Credit deduction error:', err); }
      }, 60000);
    }

    connectToDeepgram(session)
      .then(() => {
        sendToClient(session, { type: 'session_ready', sessionId, version: 'v9-four-brain', userName: authUser!.name });
        console.log(`[V9] \u{2705} Session ready: ${sessionId.slice(0, 8)} (${authUser!.name})`);
      })
      .catch((error) => {
        console.error(`[V9] \u{274C} Deepgram setup failed:`, error);
        sendToClient(session, { type: 'error', message: 'Voice service unavailable.' });
        ws.close(1011, 'Deepgram setup failed');
      });

    ws.on('message', (data: Buffer | string) => {
      try { const message = JSON.parse(typeof data === 'string' ? data : data.toString()); handleClientMessage(session, message); }
      catch { if (Buffer.isBuffer(data)) { if (session.deepgramConnection) session.deepgramConnection.send(data); } }
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
    ws.on('error', (err) => { console.error(`[V9] WebSocket error:`, err); cleanup(sessionId); });
  });

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const parsedUrl = parseUrl(request.url || '', true);
    if (parsedUrl.pathname === '/ws/redi' && parsedUrl.query.v === '9') {
      if (!wss) { socket.destroy(); return; }
      console.log(`[V9] Upgrade request for v=9`);
      wss.handleUpgrade(request, socket, head, (ws) => { wss!.emit('connection', ws, request); });
    }
  });

  console.log('[V9] WebSocket server initialized on /ws/redi?v=9');
}

// =============================================================================
// DEEPGRAM STT
// =============================================================================

async function connectToDeepgram(session: V9Session): Promise<void> {
  if (!DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY not set');
  const deepgram = createClient(DEEPGRAM_API_KEY, { global: { headers: { 'X-DG-No-Logging': 'true' } } });
  const connection = deepgram.listen.live({
    model: 'nova-2', language: 'en', smart_format: true, interim_results: true,
    utterance_end_ms: 2000, vad_events: true, encoding: 'linear16', sample_rate: 24000, channels: 1,
    keywords: ['Redi:5', 'Redi Always:3'],
  });

  connection.on(LiveTranscriptionEvents.Open, () => { console.log(`[V9] Deepgram connected (nova-2, keywords: Redi)`); });

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.is_final;
    const speechFinal = data.speech_final;
    if (transcript?.trim()) {
      if (session.observeSessionId) { if (isFinal) feedAudioTranscript(session.observeSessionId, transcript.trim()); return; }
      if (isFinal) { session.currentTranscript += ' ' + transcript.trim(); session.currentTranscript = session.currentTranscript.trim(); console.log(`[V9] Final: "${transcript.trim()}"`); }
      sendToClient(session, { type: 'transcript', text: transcript.trim(), isFinal, role: 'user' });
      if (session.speechEndTimeout) { clearTimeout(session.speechEndTimeout); session.speechEndTimeout = null; }
    }
    if (speechFinal && session.currentTranscript.trim() && !session.isResponding) {
      session.speechEndTimeout = setTimeout(() => { if (!session.isResponding && session.currentTranscript.trim()) handleSpeechEnd(session); }, SPEECH_TIMEOUT_MS);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    session.isUserSpeaking = true;
    // Barge-in: cancel during TTS playback so user can interrupt
    if (session.isTTSActive) {
      console.log(`[V9] BARGE-IN (during TTS)`);
      sendToClient(session, { type: 'stop_audio' });
      session.isResponding = false;
      session.isTTSActive = false;
      sendToClient(session, { type: 'mute_mic', muted: false });
    }
    if (session.speechEndTimeout) { clearTimeout(session.speechEndTimeout); session.speechEndTimeout = null; }
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    session.isUserSpeaking = false;
    if (session.currentTranscript.trim() && !session.isResponding) {
      if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
      session.speechEndTimeout = setTimeout(() => { if (!session.isResponding && session.currentTranscript.trim()) handleSpeechEnd(session); }, 300);
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: any) => { console.error(`[V9] Deepgram error:`, err); });
  connection.on(LiveTranscriptionEvents.Close, () => { console.log(`[V9] Deepgram closed`); });
  session.deepgramConnection = connection;
}

// =============================================================================
// HELPERS
// =============================================================================

function sendAudioBinary(session: V9Session, audioChunk: Buffer): void {
  if (session.clientWs.readyState === WebSocket.OPEN) { session.clientWs.send(audioChunk); session.ttsChunkCount++; session.ttsTotalBytes += audioChunk.length; }
}

function sendToClient(session: V9Session, message: any): void {
  if (session.clientWs.readyState === WebSocket.OPEN) session.clientWs.send(JSON.stringify(message));
}

async function maybeSearchWeb(transcript: string): Promise<string | null> {
  if (!needsWebSearch(transcript)) return null;
  try {
    console.log(`[V9] \u{1F50D} Web search for: "${transcript.slice(0, 60)}"`);
    const start = Date.now();
    const results = await searchWeb(transcript, 3);
    const formatted = formatSearchResultsForLLM(results);
    console.log(`[V9] \u{1F50D} ${results.length} results in ${Date.now() - start}ms`);
    return formatted;
  } catch (err) { console.error(`[V9] \u{1F50D} Search failed:`, err); return null; }
}

// =============================================================================
// LLM DISPATCH \u2014 routes to the correct provider based on brain type
// =============================================================================

async function callBrain(
  brain: BrainType,
  messages: LLMMessage[],
  session: V9Session,
): Promise<{ text: string; brain: BrainType }> {
  let result;

  if (brain === 'vision') {
    result = await openaiComplete({ messages, max_tokens: VISION_MAX_TOKENS, model: 'gpt-4o-mini' });
    console.log(`[V9] VISION (4o-mini): ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
  } else if (brain === 'deep') {
    result = await openaiComplete({ messages, max_tokens: DEEP_MAX_TOKENS, model: 'gpt-4o' });
    console.log(`[V9] DEEP (4o): ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
  } else if (brain === 'voice') {
    result = await anthropicComplete({ messages, max_tokens: VOICE_MAX_TOKENS });
    console.log(`[V9] VOICE (haiku): ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
  } else {
    result = await cerebrasComplete({ messages, max_tokens: FAST_MAX_TOKENS });
    console.log(`[V9] FAST (cerebras): ${result.latencyMs}ms | ${result.usage.inputTokens}+${result.usage.outputTokens} tokens`);
  }

  session.totalInputTokens += result.usage.inputTokens;
  session.totalOutputTokens += result.usage.outputTokens;
  return { text: result.text, brain };
}

// =============================================================================
// SPEECH END -> RESPONSE PIPELINE
// =============================================================================

async function handleSpeechEnd(session: V9Session): Promise<void> {
  const transcript = session.currentTranscript.trim();
  session.currentTranscript = '';
  session.isUserSpeaking = false;
  if (!transcript || session.isResponding) return;
  if (!shouldRespond(session, transcript)) return;

  session.isResponding = true;
  const startTime = Date.now();
  const hasRecentFrame = !!(session.latestFrame && Date.now() - session.latestFrameTime < 5000);
  session.hasVision = hasRecentFrame;

  const route = routeQuery(transcript, hasRecentFrame, session.deepEnabled);
  console.log(`[V9] Route: ${route.brain.toUpperCase()} | "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}" | ${route.reason}`);

  try {
    const searchResults = await maybeSearchWeb(transcript);
    let systemContent = SYSTEM_PROMPT;
    if (session.memoryContext) systemContent += `\n\nUser context: ${session.memoryContext}`;
    if (searchResults) systemContent += `\n\nWEB SEARCH RESULTS (use these to answer):\n${searchResults}`;
    if (session.isDrivingMode) systemContent += '\n\nDRIVING MODE: 10 words max. No directions.';

    const messages: LLMMessage[] = [{ role: 'system', content: systemContent }];
    const historySlice = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
    for (const entry of historySlice) messages.push({ role: entry.role, content: entry.content });

    if (hasRecentFrame && (route.brain === 'vision' || route.brain === 'deep')) {
      messages.push({ role: 'user', content: [{ type: 'text', text: transcript }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }] });
    } else {
      messages.push({ role: 'user', content: transcript });
    }

    if (!session.isResponding) return;

    const { text: responseText, brain: brainUsed } = await callBrain(route.brain, messages, session);
    if (!session.isResponding || !responseText) { session.isResponding = false; return; }

    session.conversationHistory.push({ role: 'user', content: transcript });
    session.conversationHistory.push({ role: 'assistant', content: responseText });
    if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);

    sendToClient(session, { type: 'response', text: responseText, brain: brainUsed, latencyMs: Date.now() - startTime });
    session.lastResponseTime = Date.now();

    const ttsStart = Date.now();
    session.ttsChunkCount = 0; session.ttsTotalBytes = 0; session.isTTSActive = true;
    sendToClient(session, { type: 'mute_mic', muted: true });

    await elevenLabsStreamTTS(responseText, (audioChunk: Buffer) => {
      if (session.clientWs.readyState === WebSocket.OPEN && session.isTTSActive) sendAudioBinary(session, audioChunk);
    }, () => {
      console.log(`[V9] TTS: ${session.ttsChunkCount} chunks, ${Math.round(session.ttsTotalBytes / 1024)}KB, ${Date.now() - ttsStart}ms`);
      session.isTTSActive = false; sendToClient(session, { type: 'mute_mic', muted: false }); sendToClient(session, { type: 'audio_done' });
    }, session.voiceId || undefined);

    console.log(`[V9] Total: ${Date.now() - startTime}ms`);
    session.responsesCompleted++; session.isResponding = false; session.isTTSActive = false;
  } catch (error) {
    console.error(`[V9] Pipeline error:`, error); session.isResponding = false; session.isTTSActive = false;
    sendToClient(session, { type: 'mute_mic', muted: false });
  }
}

// =============================================================================
// CLIENT MESSAGE HANDLING
// =============================================================================

function handleClientMessage(session: V9Session, message: any): void {
  switch (message.type) {
    case 'audio':
      if (message.data) { const buf = Buffer.from(message.data, 'base64'); if (session.deepgramConnection) session.deepgramConnection.send(buf); }
      break;

    case 'frame':
      session.latestFrame = message.data; session.latestFrameTime = Date.now(); session.hasVision = true;
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
      if (message.deepEnabled !== undefined) {
        session.deepEnabled = !!message.deepEnabled;
        console.log(`[V9] \u{1F9E0} Deep Brain: ${session.deepEnabled ? 'ON' : 'OFF'}`);
        sendToClient(session, { type: 'deep_status', enabled: session.deepEnabled });
      }
      break;

    case 'barge_in':
      if (session.isResponding || session.isTTSActive) {
        console.log(`[V9] Barge-in requested`);
        sendToClient(session, { type: 'stop_audio' });
        session.isResponding = false; session.isTTSActive = false;
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
      const route = routeQuery(chatText, hasRecentFrame, session.deepEnabled);
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

          if (hasRecentFrame && (route.brain === 'vision' || route.brain === 'deep')) {
            messages.push({ role: 'user', content: [{ type: 'text', text: chatText }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }] });
          } else {
            messages.push({ role: 'user', content: chatText });
          }

          const { text: responseText, brain: brainUsed } = await callBrain(route.brain, messages, session);
          if (!session.isResponding || !responseText) { session.isResponding = false; return; }

          session.conversationHistory.push({ role: 'user', content: chatText });
          session.conversationHistory.push({ role: 'assistant', content: responseText });
          if (session.conversationHistory.length > MAX_HISTORY_ENTRIES * 2) session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES * 2);

          sendToClient(session, { type: 'response', text: responseText, brain: brainUsed, latencyMs: Date.now() - chatStart });
          session.lastResponseTime = Date.now();

          if (!message.textOnly) {
            session.ttsChunkCount = 0; session.ttsTotalBytes = 0; session.isTTSActive = true;
            sendToClient(session, { type: 'mute_mic', muted: true });
            await elevenLabsStreamTTS(responseText, (audioChunk: Buffer) => {
              if (session.clientWs.readyState === WebSocket.OPEN && session.isTTSActive) sendAudioBinary(session, audioChunk);
            }, () => {
              session.isTTSActive = false; sendToClient(session, { type: 'mute_mic', muted: false }); sendToClient(session, { type: 'audio_done' });
            }, session.voiceId || undefined);
          }

          console.log(`[V9] Chat total: ${Date.now() - chatStart}ms`);
          session.responsesCompleted++; session.isResponding = false; session.isTTSActive = false;
        } catch (error) {
          console.error(`[V9] Chat pipeline error:`, error);
          session.isResponding = false; session.isTTSActive = false;
          sendToClient(session, { type: 'mute_mic', muted: false });
        }
      })();
      break;
    }
  }
}

// =============================================================================
// CLEANUP & EXPORTS
// =============================================================================

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
  return {
    activeSessions: sessions.size,
    architecture: 'Four-Brain + Wake Word + Web Search',
    fastBrain: 'Cerebras GPT-OSS 120B',
    visionBrain: 'GPT-4o Mini (auto-routed)',
    deepBrain: 'GPT-4o (opt-in)',
    search: 'Tavily',
    totalResponses, totalInputTokens: totalIn, totalOutputTokens: totalOut,
  };
}
