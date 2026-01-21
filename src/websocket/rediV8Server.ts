/**
 * Redi V8 Server - TWO-BRAIN ARCHITECTURE
 * =======================================
 * 
 * FAST BRAIN: Llama 4 via Together AI (~500ms)
 * - Quick observations, form corrections, hazard alerts
 * - Driving directions, cooking timing, sports coaching
 * 
 * DEEP BRAIN: GPT-4o (~1.5-2s)  
 * - Complex reasoning, nuanced analysis, strategic thinking
 * - Medical/legal caution, studying complex subjects
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
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Models
const TOGETHER_VISION_MODEL = 'meta-llama/Llama-Vision-Free';
const TOGETHER_LLM_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
const GPT4O_MODEL = 'gpt-4o';
const ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

// Timing
const SPEECH_TIMEOUT_MS = 600;
const MAX_FRAME_AGE_MS = 2000;
const AUTONOMOUS_CHECK_INTERVAL_MS = 3000;

// =============================================================================
// TYPES
// =============================================================================

type RediMode = 'general' | 'driving' | 'sports' | 'cooking' | 'studying' | 'meeting' | 'assembly' | 'monitoring';
type BrainType = 'fast' | 'deep';

interface Session {
  id: string;
  clientWs: WebSocket;
  deepgramConnection: any | null;
  latestFrame: string | null;
  latestFrameTime: number;
  isUserSpeaking: boolean;
  currentTranscript: string;
  speechEndTimeout: NodeJS.Timeout | null;
  isResponding: boolean;
  lastResponseTime: number;
  mode: RediMode;
  sensitivity: number;
  autonomousInterval: NodeJS.Timeout | null;
  lastAutonomousCheck: number;
  consecutiveSilentFrames: number;
  recentTranscripts: string[];
  recentResponses: string[];
  connectionTime: number;
  responsesCompleted: number;
  fastBrainUsed: number;
  deepBrainUsed: number;
}

// =============================================================================
// STATE
// =============================================================================

const sessions = new Map<string, Session>();
let wss: WebSocketServer | null = null;

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const FAST_BRAIN_PROMPT = `You are Redi, a real-time AI assistant with vision.

RULES:
- Be CONCISE: 1-2 sentences max
- Be IMMEDIATE: React quickly
- Be NATURAL: Talk like a friend
- NEVER say "I can see" - just describe or advise directly
- For form corrections: Be specific ("lift your elbow higher")
- For hazards: Be urgent but calm ("brake now, car ahead stopping")

Current mode: {MODE}`;

const DEEP_BRAIN_PROMPT = `You are Redi, an intelligent AI assistant with vision.

RULES:
- Be THOROUGH but not verbose: 2-4 sentences typically
- EXPLAIN reasoning when helpful
- Be CAREFUL with medical, legal, safety topics - recommend professionals
- For studying: Help understand concepts, not just answers

Current mode: {MODE}`;

const MODE_ADDITIONS: Record<RediMode, string> = {
  driving: `\nDRIVING MODE - SAFETY CRITICAL:\n- Give landmark-based directions: "Right after the red building"\n- Alert hazards IMMEDIATELY\n- ULTRA SHORT responses while moving\n- You replace GPS - natural directions only`,
  sports: `\nSPORTS MODE: Watch form, correct in real-time, be encouraging but accurate`,
  cooking: `\nCOOKING MODE: Watch timing cues, alert BEFORE burning, specific heat advice`,
  studying: `\nSTUDYING MODE: Help understand, use Socratic method, encourage`,
  meeting: `\nMEETING MODE: Be strategic, professional, note key points`,
  assembly: `\nASSEMBLY MODE: Guide step-by-step, note part orientation`,
  monitoring: `\nMONITORING MODE: Alert to changes, be concise`,
  general: ''
};

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initRediV8(server: HTTPServer): Promise<void> {
  console.log('[Redi V8] ═══════════════════════════════════════════');
  console.log('[Redi V8] 🧠 TWO-BRAIN ARCHITECTURE');
  console.log('[Redi V8] Fast: Llama 4 (Together) | Deep: GPT-4o');
  console.log('[Redi V8] ═══════════════════════════════════════════');

  const missing: string[] = [];
  if (!DEEPGRAM_API_KEY) missing.push('DEEPGRAM_API_KEY');
  if (!TOGETHER_API_KEY) missing.push('TOGETHER_API_KEY');
  if (!OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');
  
  if (missing.length > 0) {
    console.error(`[Redi V8] ❌ Missing: ${missing.join(', ')}`);
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = randomUUID();
    console.log(`[Redi V8] 🔌 Connected: ${sessionId.slice(0,8)}`);

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
      lastResponseTime: 0,
      mode: 'general',
      sensitivity: 0.5,
      autonomousInterval: null,
      lastAutonomousCheck: Date.now(),
      consecutiveSilentFrames: 0,
      recentTranscripts: [],
      recentResponses: [],
      connectionTime: Date.now(),
      responsesCompleted: 0,
      fastBrainUsed: 0,
      deepBrainUsed: 0,
    };

    sessions.set(sessionId, session);

    try {
      await connectToDeepgram(session);
      startAutonomousMonitoring(session);
      sendToClient(session, { type: 'session_ready', sessionId, version: 'v8-two-brain' });
      console.log(`[Redi V8] ✅ Session ready`);
    } catch (error) {
      console.error(`[Redi V8] ❌ Setup failed:`, error);
      ws.close(1011, 'Setup failed');
      return;
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch {
        if (Buffer.isBuffer(data)) handleAudioData(session, data);
      }
    });

    ws.on('close', () => {
      const duration = Math.round((Date.now() - session.connectionTime) / 1000);
      console.log(`[Redi V8] 🔌 Closed: ${sessionId.slice(0,8)} (${duration}s, fast:${session.fastBrainUsed} deep:${session.deepBrainUsed})`);
      cleanup(sessionId);
    });

    ws.on('error', (err) => {
      console.error(`[Redi V8] Error:`, err);
      cleanup(sessionId);
    });
  });

  console.log('[Redi V8] WebSocket ready on /ws/redi?v=8');
}

export function handleV8Upgrade(request: IncomingMessage, socket: any, head: Buffer): boolean {
  if (!wss) return false;
  wss.handleUpgrade(request, socket, head, (ws) => wss!.emit('connection', ws, request));
  return true;
}

// =============================================================================
// DEEPGRAM STT
// =============================================================================

async function connectToDeepgram(session: Session): Promise<void> {
  const deepgram = createClient(DEEPGRAM_API_KEY!);
  
  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    interim_results: true,
    endpointing: 300,
    vad_events: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => console.log(`[Redi V8] ✅ Deepgram connected`));

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.is_final;
    const speechFinal = data.speech_final;

    if (transcript?.trim()) {
      if (isFinal) {
        session.currentTranscript += ' ' + transcript.trim();
        session.currentTranscript = session.currentTranscript.trim();
        console.log(`[Redi V8] 📝 "${transcript.trim()}"`);
      } else {
        session.isUserSpeaking = true;
        if (session.speechEndTimeout) {
          clearTimeout(session.speechEndTimeout);
          session.speechEndTimeout = null;
        }
      }
      sendToClient(session, { type: 'transcript', text: transcript.trim(), isFinal, role: 'user' });
    }

    if (speechFinal && session.currentTranscript.trim()) {
      session.speechEndTimeout = setTimeout(() => {
        if (!session.isResponding && session.currentTranscript.trim()) {
          triggerResponse(session, session.currentTranscript.trim(), false);
          session.currentTranscript = '';
        }
      }, SPEECH_TIMEOUT_MS);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    session.isUserSpeaking = true;
    session.consecutiveSilentFrames = 0;
    sendToClient(session, { type: 'request_frame' });
    if (session.speechEndTimeout) {
      clearTimeout(session.speechEndTimeout);
      session.speechEndTimeout = null;
    }
    if (session.isResponding) {
      console.log(`[Redi V8] 🛑 BARGE-IN`);
      sendToClient(session, { type: 'stop_audio' });
      session.isResponding = false;
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: any) => console.error(`[Redi V8] Deepgram error:`, err));
  connection.on(LiveTranscriptionEvents.Close, () => console.log(`[Redi V8] Deepgram closed`));

  session.deepgramConnection = connection;
}

// =============================================================================
// AUTONOMOUS MONITORING
// =============================================================================

function startAutonomousMonitoring(session: Session): void {
  session.autonomousInterval = setInterval(() => checkForAutonomousInterjection(session), AUTONOMOUS_CHECK_INTERVAL_MS);
}

async function checkForAutonomousInterjection(session: Session): Promise<void> {
  if (session.isUserSpeaking || session.isResponding || !session.latestFrame) return;
  if (session.sensitivity < 0.3) return;
  
  const timeSinceResponse = Date.now() - session.lastResponseTime;
  const minGap = Math.max(5000, (1 - session.sensitivity) * 15000);
  if (timeSinceResponse < minGap) return;
  
  if (Date.now() - session.latestFrameTime > MAX_FRAME_AGE_MS) return;
  
  session.consecutiveSilentFrames++;
  const checkThreshold = Math.floor(3 / session.sensitivity);
  if (session.consecutiveSilentFrames < checkThreshold) return;
  
  session.consecutiveSilentFrames = 0;
  
  const shouldInterject = await analyzeForInterjection(session);
  if (shouldInterject) {
    console.log(`[Redi V8] 🎯 AUTONOMOUS`);
    triggerResponse(session, '[AUTONOMOUS]', true);
  }
}

async function analyzeForInterjection(session: Session): Promise<boolean> {
  if (!session.latestFrame) return false;
  
  const prompts: Record<RediMode, string> = {
    driving: 'Is there an immediate hazard or important turn? YES or NO only.',
    sports: 'Is there a form mistake to correct now? YES or NO only.',
    cooking: 'Is something about to burn or need attention? YES or NO only.',
    studying: 'Does the person appear stuck? YES or NO only.',
    meeting: 'Is there an important point to add? YES or NO only.',
    assembly: 'Is there a mistake being made? YES or NO only.',
    monitoring: 'Is there notable activity? YES or NO only.',
    general: 'Is there something helpful to point out? YES or NO only.',
  };

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TOGETHER_VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompts[session.mode] },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }
          ]
        }],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });
    if (!response.ok) return false;
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content?.toLowerCase().includes('yes');
  } catch { return false; }
}

// =============================================================================
// BRAIN ROUTER
// =============================================================================

function routeToBrain(session: Session, transcript: string, isAutonomous: boolean): BrainType {
  if (isAutonomous) return 'fast';
  
  const deepTriggers = ['explain', 'why', 'analyze', 'compare', 'strategy', 'should i', 'what do you think', 
    'help me understand', 'is this right', 'advice', 'opinion', 'pros and cons', 'recommend', 'complex', 'confused'];
  
  if (deepTriggers.some(t => transcript.toLowerCase().includes(t))) {
    console.log(`[Redi V8] 🧠 → DEEP (trigger word)`);
    return 'deep';
  }
  
  if (['driving', 'sports', 'cooking'].includes(session.mode)) return 'fast';
  if (['studying', 'meeting'].includes(session.mode)) return 'deep';
  
  return 'fast';
}

// =============================================================================
// RESPONSE PIPELINE
// =============================================================================

async function triggerResponse(session: Session, transcript: string, isAutonomous: boolean): Promise<void> {
  if (session.isResponding) return;
  session.isResponding = true;
  const startTime = Date.now();
  
  const brain = routeToBrain(session, transcript, isAutonomous);
  console.log(`[Redi V8] 🚀 ${brain.toUpperCase()}: "${transcript.slice(0, 40)}..."`);

  try {
    // Vision analysis
    let imageContext = '';
    if (session.latestFrame && Date.now() - session.latestFrameTime < MAX_FRAME_AGE_MS) {
      const vStart = Date.now();
      imageContext = await analyzeImageWithTogether(session);
      console.log(`[Redi V8] 👁️ Vision: ${Date.now() - vStart}ms`);
    }

    if (!session.isResponding) return;

    // Generate response
    const llmStart = Date.now();
    let responseText: string;
    
    if (brain === 'fast') {
      responseText = await generateWithFastBrain(session, transcript, imageContext, isAutonomous);
      session.fastBrainUsed++;
    } else {
      responseText = await generateWithDeepBrain(session, transcript, imageContext);
      session.deepBrainUsed++;
    }
    
    console.log(`[Redi V8] 💬 ${brain}: ${Date.now() - llmStart}ms`);

    if (!session.isResponding || !responseText) return;

    // Update context
    if (!isAutonomous) {
      session.recentTranscripts.push(transcript);
      if (session.recentTranscripts.length > 5) session.recentTranscripts.shift();
    }
    session.recentResponses.push(responseText);
    if (session.recentResponses.length > 5) session.recentResponses.shift();

    sendToClient(session, { type: 'transcript', text: responseText, role: 'assistant' });

    // TTS
    const ttsStart = Date.now();
    await streamTTSToClient(session, responseText);
    console.log(`[Redi V8] 🔊 TTS: ${Date.now() - ttsStart}ms`);

    console.log(`[Redi V8] ✅ Total: ${Date.now() - startTime}ms`);
    session.responsesCompleted++;
    session.lastResponseTime = Date.now();
    session.isResponding = false;

  } catch (error) {
    console.error(`[Redi V8] ❌ Error:`, error);
    session.isResponding = false;
  }
}

// =============================================================================
// TOGETHER AI (Fast Brain)
// =============================================================================

async function analyzeImageWithTogether(session: Session): Promise<string> {
  const prompts: Record<RediMode, string> = {
    driving: 'Describe road: lanes, cars, signs, hazards. Brief.',
    sports: 'Describe body position and form. Note issues.',
    cooking: 'Describe food state: color, texture, doneness.',
    studying: 'Describe visible materials/problems.',
    meeting: 'Describe meeting setting and presentations.',
    assembly: 'Describe parts and assembly state.',
    monitoring: 'Describe any notable activity.',
    general: 'Briefly describe this scene.',
  };

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TOGETHER_VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompts[session.mode] },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${session.latestFrame}` } }
          ]
        }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });
    if (!response.ok) return 'Unable to analyze image';
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || 'Unable to analyze image';
  } catch { return 'Unable to analyze image'; }
}

async function generateWithFastBrain(session: Session, transcript: string, imageContext: string, isAutonomous: boolean): Promise<string> {
  const systemPrompt = FAST_BRAIN_PROMPT.replace('{MODE}', session.mode) + (MODE_ADDITIONS[session.mode] || '');
  
  const userMessage = isAutonomous
    ? `[AUTONOMOUS - User didn't ask]\n\nWhat I see: ${imageContext}\n\nIf important, say it briefly. If not, respond with [SKIP].`
    : `What I see: ${imageContext}\n\nUser: ${transcript}`;

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TOGETHER_LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });
    if (!response.ok) return "I'm having trouble responding.";
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    if (isAutonomous && content.includes('[SKIP]')) {
      session.isResponding = false;
      return '';
    }
    return content;
  } catch { return "I'm having trouble responding."; }
}

// =============================================================================
// GPT-4o (Deep Brain)
// =============================================================================

async function generateWithDeepBrain(session: Session, transcript: string, imageContext: string): Promise<string> {
  const systemPrompt = DEEP_BRAIN_PROMPT.replace('{MODE}', session.mode) + (MODE_ADDITIONS[session.mode] || '');
  
  const context = session.recentTranscripts.slice(-3).map((t, i) => 
    `User: ${t}\nYou: ${session.recentResponses[i] || '...'}`
  ).join('\n');

  const userMessage = `${context ? `Recent:\n${context}\n\n` : ''}What I see: ${imageContext}\n\nUser: ${transcript}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GPT4O_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!response.ok) return "I'm having trouble with that.";
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || "I need to think more.";
  } catch { return "I'm having trouble responding."; }
}

// =============================================================================
// CLIENT MESSAGES
// =============================================================================

function handleClientMessage(session: Session, message: any): void {
  switch (message.type) {
    case 'audio':
      if (message.data) handleAudioData(session, Buffer.from(message.data, 'base64'));
      break;
    case 'frame':
      session.latestFrame = message.data;
      session.latestFrameTime = Date.now();
      break;
    case 'set_mode':
      if (isValidMode(message.mode)) {
        session.mode = message.mode;
        console.log(`[Redi V8] Mode: ${session.mode}`);
        sendToClient(session, { type: 'mode_changed', mode: session.mode });
      }
      break;
    case 'set_sensitivity':
      const s = parseFloat(message.sensitivity);
      if (!isNaN(s) && s >= 0 && s <= 1) {
        session.sensitivity = s;
        console.log(`[Redi V8] Sensitivity: ${s}`);
      }
      break;
  }
}

function handleAudioData(session: Session, audioBuffer: Buffer): void {
  session.deepgramConnection?.send(audioBuffer);
}

function isValidMode(mode: string): mode is RediMode {
  return ['general', 'driving', 'sports', 'cooking', 'studying', 'meeting', 'assembly', 'monitoring'].includes(mode);
}

// =============================================================================
// ELEVENLABS TTS
// =============================================================================

async function streamTTSToClient(session: Session, text: string): Promise<void> {
  if (!text) return;
  sendToClient(session, { type: 'mute_mic', muted: true });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY!, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        output_format: 'mp3_44100_128',
      }),
    });

    if (!response.ok) {
      sendToClient(session, { type: 'mute_mic', muted: false });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      sendToClient(session, { type: 'mute_mic', muted: false });
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done || !session.isResponding) break;
      sendToClient(session, { type: 'audio', data: Buffer.from(value).toString('base64'), format: 'mp3' });
    }
    reader.releaseLock();
  } catch (err) {
    console.error(`[Redi V8] TTS error:`, err);
  } finally {
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
    if (session.speechEndTimeout) clearTimeout(session.speechEndTimeout);
    if (session.autonomousInterval) clearInterval(session.autonomousInterval);
    session.deepgramConnection?.finish();
    sessions.delete(sessionId);
  }
}

export function closeRediV8(): void {
  sessions.forEach((_, id) => cleanup(id));
  wss?.close();
  wss = null;
}

export function getV8Stats(): object {
  let totalFast = 0, totalDeep = 0;
  sessions.forEach(s => { totalFast += s.fastBrainUsed; totalDeep += s.deepBrainUsed; });
  return { activeSessions: sessions.size, architecture: 'Two-Brain', fastBrain: totalFast, deepBrain: totalDeep };
}
