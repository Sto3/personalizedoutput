/**
 * Redi Voice Service
 *
 * Text-to-speech using ElevenLabs streaming API.
 * Provides low-latency voice output with male/female voice selection.
 */

import axios from 'axios';
import { EventEmitter } from 'events';
import { VoiceConfig, VoiceGender } from './types';
import { trackCost } from './sessionManager';

// ElevenLabs pricing: ~$0.30 per 1000 characters
const COST_PER_1000_CHARS = 0.30;

// Voice IDs for Redi
const VOICE_IDS: Record<VoiceGender, string> = {
  male: process.env.ELEVENLABS_REDI_MALE_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',      // Adam
  female: process.env.ELEVENLABS_REDI_FEMALE_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'   // Sarah
};

/**
 * Voice configurations for MAXIMUM human-like quality
 *
 * CRITICAL: These settings EXACTLY match the Santa/Emma voice that was
 * indistinguishable from a human. DO NOT CHANGE unless testing proves better.
 *
 * Santa voice settings that worked perfectly:
 * - stability: 0.92 (very high = slow, deliberate, natural pacing)
 * - similarity_boost: 0.95 (very high = deep, consistent voice)
 * - style: 0.08 (very LOW = calm, NO animation, most human-like)
 * - use_speaker_boost: true
 * - model: eleven_monolingual_v1 (NOT multilingual)
 */
const VOICE_CONFIGS: Record<VoiceGender, Omit<VoiceConfig, 'voiceId'>> = {
  male: {
    gender: 'male',
    stability: 0.92,         // EXACT Santa setting - natural pacing
    similarityBoost: 0.95,   // EXACT Santa setting - voice clarity
    style: 0.08              // EXACT Santa setting - calm, human delivery
  },
  female: {
    gender: 'female',
    stability: 0.92,         // EXACT Santa setting - natural pacing
    similarityBoost: 0.95,   // EXACT Santa setting - voice clarity
    style: 0.08              // EXACT Santa setting - calm, human delivery
  }
};

// Use monolingual model for best English quality (like Santa voice)
const VOICE_MODEL = 'eleven_monolingual_v1';

interface SpeechSession {
  sessionId: string;
  voiceGender: VoiceGender;
  totalCharacters: number;
  emitter: EventEmitter;
}

const activeSpeechSessions = new Map<string, SpeechSession>();

/**
 * Initialize voice service for a session
 */
export function initVoiceService(sessionId: string, voiceGender: VoiceGender): EventEmitter {
  const emitter = new EventEmitter();

  const session: SpeechSession = {
    sessionId,
    voiceGender,
    totalCharacters: 0,
    emitter
  };

  activeSpeechSessions.set(sessionId, session);
  console.log(`[Redi Voice] Session ${sessionId} initialized with ${voiceGender} voice`);

  return emitter;
}

/**
 * Generate and stream speech from text
 */
export async function speak(
  sessionId: string,
  text: string,
  options?: { stream?: boolean }
): Promise<Buffer | void> {
  const session = activeSpeechSessions.get(sessionId);
  if (!session) {
    console.error(`[Redi Voice] No session found: ${sessionId}`);
    return;
  }

  const voiceId = VOICE_IDS[session.voiceGender];
  const config = VOICE_CONFIGS[session.voiceGender];

  // Track characters for cost calculation
  session.totalCharacters += text.length;
  const cost = (text.length / 1000) * COST_PER_1000_CHARS;
  trackCost(sessionId, 'voice', cost);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('[Redi Voice] ELEVENLABS_API_KEY not configured');
    return;
  }

  try {
    if (options?.stream) {
      // Streaming mode - emit chunks as they arrive
      await streamSpeech(sessionId, text, voiceId, config, apiKey);
    } else {
      // Non-streaming mode - return full audio buffer
      return await generateSpeech(text, voiceId, config, apiKey);
    }
  } catch (error) {
    console.error(`[Redi Voice] Error generating speech for ${sessionId}:`, error);
    session.emitter.emit('error', error);
  }
}

/**
 * Generate speech (non-streaming)
 */
async function generateSpeech(
  text: string,
  voiceId: string,
  config: Omit<VoiceConfig, 'voiceId'>,
  apiKey: string
): Promise<Buffer> {
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: VOICE_MODEL,  // Monolingual v1 = most human-like for English
      voice_settings: {
        stability: config.stability,
        similarity_boost: config.similarityBoost,
        style: config.style,
        use_speaker_boost: true  // Clarity and presence like Santa voice
      }
    },
    {
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      responseType: 'arraybuffer'
    }
  );

  return Buffer.from(response.data);
}

/**
 * Stream speech generation
 */
async function streamSpeech(
  sessionId: string,
  text: string,
  voiceId: string,
  config: Omit<VoiceConfig, 'voiceId'>,
  apiKey: string
): Promise<void> {
  const session = activeSpeechSessions.get(sessionId);
  if (!session) return;

  try {
    // Use streaming endpoint with latency optimization for fastest response
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4`,
      {
        text,
        model_id: VOICE_MODEL,  // Monolingual v1 = most human-like for English
        voice_settings: {
          stability: config.stability,
          similarity_boost: config.similarityBoost,
          style: config.style,
          use_speaker_boost: true  // Clarity and presence like Santa voice
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'stream'
      }
    );

    // Emit audio chunks as they arrive
    response.data.on('data', (chunk: Buffer) => {
      session.emitter.emit('audio_chunk', {
        audio: chunk.toString('base64'),
        format: 'mp3',
        isStreaming: true,
        isFinal: false
      });
    });

    response.data.on('end', () => {
      session.emitter.emit('audio_chunk', {
        audio: '',
        format: 'mp3',
        isStreaming: true,
        isFinal: true
      });
      session.emitter.emit('speech_complete');
    });

    response.data.on('error', (error: Error) => {
      console.error(`[Redi Voice] Stream error for ${sessionId}:`, error);
      session.emitter.emit('error', error);
    });

  } catch (error) {
    console.error(`[Redi Voice] Failed to start stream for ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get voice statistics for a session
 */
export function getVoiceStats(sessionId: string): {
  totalCharacters: number;
  estimatedCost: number;
} | null {
  const session = activeSpeechSessions.get(sessionId);
  if (!session) return null;

  return {
    totalCharacters: session.totalCharacters,
    estimatedCost: (session.totalCharacters / 1000) * COST_PER_1000_CHARS
  };
}

/**
 * Update voice gender for a session
 */
export function updateVoiceGender(sessionId: string, voiceGender: VoiceGender): boolean {
  const session = activeSpeechSessions.get(sessionId);
  if (!session) return false;

  session.voiceGender = voiceGender;
  console.log(`[Redi Voice] Session ${sessionId} voice changed to ${voiceGender}`);
  return true;
}

/**
 * Close voice service for a session
 */
export function closeVoiceService(sessionId: string): void {
  const session = activeSpeechSessions.get(sessionId);
  if (!session) return;

  session.emitter.removeAllListeners();
  activeSpeechSessions.delete(sessionId);
  console.log(`[Redi Voice] Session ${sessionId} closed`);
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * Get available voices
 */
export function getAvailableVoices(): { id: string; name: string; gender: VoiceGender }[] {
  return [
    { id: VOICE_IDS.male, name: 'Adam', gender: 'male' },
    { id: VOICE_IDS.female, name: 'Sarah', gender: 'female' }
  ];
}

/**
 * Generate voice audio directly (for video production, etc.)
 * Uses the same human-like settings as session-based voice
 */
export async function generateVoiceAudio(
  text: string,
  voiceGender: VoiceGender = 'female'
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const voiceId = VOICE_IDS[voiceGender];
  const config = VOICE_CONFIGS[voiceGender];

  return generateSpeech(text, voiceId, config, apiKey);
}
