/**
 * Redi Transcription Service
 *
 * Real-time speech-to-text using Deepgram's streaming API.
 * Provides low-latency transcription with voice activity detection.
 */

import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { EventEmitter } from 'events';
import { TranscriptChunk } from './types';
import { trackCost } from './sessionManager';

// Deepgram pricing: $0.0043 per minute (Nova-2)
const COST_PER_MINUTE = 0.0043;

interface TranscriptionSession {
  sessionId: string;
  connection: LiveClient | null;
  emitter: EventEmitter;
  audioMinutes: number;
  lastActivityAt: number;
  silenceStartAt: number | null;
}

const activeSessions = new Map<string, TranscriptionSession>();

/**
 * Initialize Deepgram client
 */
function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY not configured');
  }
  return createClient(apiKey);
}

/**
 * Start a transcription session
 */
export async function startTranscription(sessionId: string): Promise<EventEmitter> {
  const emitter = new EventEmitter();

  const session: TranscriptionSession = {
    sessionId,
    connection: null,
    emitter,
    audioMinutes: 0,
    lastActivityAt: Date.now(),
    silenceStartAt: null
  };

  try {
    const deepgram = getDeepgramClient();

    // Create live transcription connection
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1500,
      vad_events: true,
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1
    });

    session.connection = connection;

    // Handle transcription events
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log(`[Redi Transcription] Session ${sessionId} connected to Deepgram`);
      emitter.emit('open');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0];
      if (!transcript) return;

      const chunk: TranscriptChunk = {
        text: transcript.transcript || '',
        isFinal: data.is_final || false,
        confidence: transcript.confidence || 0,
        timestamp: Date.now()
      };

      // Only emit non-empty transcripts
      if (chunk.text.trim()) {
        session.lastActivityAt = Date.now();
        session.silenceStartAt = null;
        emitter.emit('transcript', chunk);
      }

      // Track audio duration for cost calculation
      if (data.duration) {
        session.audioMinutes += data.duration / 60;
        const cost = session.audioMinutes * COST_PER_MINUTE;
        trackCost(sessionId, 'transcription', cost - (session.audioMinutes - data.duration / 60) * COST_PER_MINUTE);
      }
    });

    connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      // User stopped speaking
      if (!session.silenceStartAt) {
        session.silenceStartAt = Date.now();
      }
      emitter.emit('utterance_end');
    });

    connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      // User started speaking
      session.silenceStartAt = null;
      emitter.emit('speech_started');
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`[Redi Transcription] Session ${sessionId} error:`, error);
      emitter.emit('error', error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log(`[Redi Transcription] Session ${sessionId} closed`);
      emitter.emit('close');
    });

    activeSessions.set(sessionId, session);
    return emitter;

  } catch (error) {
    console.error(`[Redi Transcription] Failed to start session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Send audio chunk to transcription
 */
export function sendAudio(sessionId: string, audioBuffer: Buffer): void {
  const session = activeSessions.get(sessionId);
  if (!session?.connection) {
    console.warn(`[Redi Transcription] No active session for ${sessionId}`);
    return;
  }

  try {
    // Send audio buffer - cast to any for WebSocket compatibility
    (session.connection as any).send(audioBuffer);
  } catch (error) {
    console.error(`[Redi Transcription] Error sending audio for ${sessionId}:`, error);
  }
}

/**
 * Get current silence duration for a session
 */
export function getSilenceDuration(sessionId: string): number {
  const session = activeSessions.get(sessionId);
  if (!session || !session.silenceStartAt) {
    return 0;
  }
  return Date.now() - session.silenceStartAt;
}

/**
 * Get transcription stats for a session
 */
export function getTranscriptionStats(sessionId: string): {
  audioMinutes: number;
  estimatedCost: number;
  lastActivityAt: number;
} | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  return {
    audioMinutes: session.audioMinutes,
    estimatedCost: session.audioMinutes * COST_PER_MINUTE,
    lastActivityAt: session.lastActivityAt
  };
}

/**
 * Stop transcription for a session
 */
export function stopTranscription(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  try {
    if (session.connection) {
      session.connection.finish();
    }
    session.emitter.removeAllListeners();
    activeSessions.delete(sessionId);
    console.log(`[Redi Transcription] Session ${sessionId} stopped`);
  } catch (error) {
    console.error(`[Redi Transcription] Error stopping session ${sessionId}:`, error);
  }
}

/**
 * Check if Deepgram is configured
 */
export function isDeepgramConfigured(): boolean {
  return !!process.env.DEEPGRAM_API_KEY;
}
