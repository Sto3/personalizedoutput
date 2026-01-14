/**
 * Backchannel Service
 *
 * Generates subtle acknowledgment sounds during user speech.
 * "mhm", "right", "okay" - shows Redi is listening.
 *
 * IMPACT: Minor UX polish. Makes long user monologues feel more
 * like a conversation. Not critical but adds to presence.
 */

import { speak } from './voiceService';

// Short backchannel phrases
const BACKCHANNELS = [
  'mhm',
  'mm',
  'right',
  'okay',
  'got it',
  'I see',
  'yeah'
];

// Track backchannel state per session
interface BackchannelState {
  lastBackchannelTime: number;
  userSpeechStartTime: number;
  backchannelCount: number;
}

const sessionStates = new Map<string, BackchannelState>();

/**
 * Initialize backchannel tracking for a session
 */
export function initBackchannelTracking(sessionId: string): void {
  sessionStates.set(sessionId, {
    lastBackchannelTime: 0,
    userSpeechStartTime: 0,
    backchannelCount: 0
  });
}

/**
 * Clean up backchannel tracking for a session
 */
export function cleanupBackchannelTracking(sessionId: string): void {
  sessionStates.delete(sessionId);
}

/**
 * Called when user starts speaking
 */
export function onUserSpeechStart(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.userSpeechStartTime = Date.now();
  }
}

/**
 * Called when user stops speaking
 */
export function onUserSpeechEnd(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.userSpeechStartTime = 0;
  }
}

/**
 * Check if we should emit a backchannel sound
 *
 * @param sessionId - Session ID
 * @param currentTranscript - What user has said so far
 * @returns Backchannel phrase or null
 */
export function shouldBackchannel(
  sessionId: string,
  currentTranscript: string
): string | null {
  const state = sessionStates.get(sessionId);
  if (!state || !state.userSpeechStartTime) {
    return null;
  }

  const now = Date.now();
  const speechDuration = now - state.userSpeechStartTime;
  const timeSinceLastBackchannel = now - state.lastBackchannelTime;

  // Only backchannel during extended speech (>8 seconds)
  if (speechDuration < 8000) {
    return null;
  }

  // Don't backchannel too frequently (at least 8 seconds apart)
  if (timeSinceLastBackchannel < 8000) {
    return null;
  }

  // Max 3 backchannels per speech segment
  if (state.backchannelCount >= 3) {
    return null;
  }

  // 40% chance to backchannel (don't overdo it)
  if (Math.random() > 0.4) {
    return null;
  }

  // Look for natural pause points in transcript
  // (end of sentence, comma, etc.)
  const hasNaturalPause = /[.,;:!?]\s*$/.test(currentTranscript) ||
                          currentTranscript.endsWith('and') ||
                          currentTranscript.endsWith('but') ||
                          currentTranscript.endsWith('so');

  if (!hasNaturalPause) {
    return null;
  }

  // Pick a random backchannel
  const backchannel = BACKCHANNELS[Math.floor(Math.random() * BACKCHANNELS.length)];

  // Update state
  state.lastBackchannelTime = now;
  state.backchannelCount++;

  return backchannel;
}

/**
 * Generate and speak a backchannel sound
 * Uses shorter, quicker TTS generation
 */
export async function emitBackchannel(
  sessionId: string,
  backchannel: string
): Promise<Buffer | null> {
  try {
    // Use speak() but the backchannel will be very short
    const audio = await speak(sessionId, backchannel);
    console.log(`[Backchannel] Emitted "${backchannel}" for session ${sessionId}`);
    return audio as Buffer;
  } catch (error) {
    console.error('[Backchannel] Failed to generate:', error);
    return null;
  }
}

/**
 * Reset backchannel count (call when user stops speaking)
 */
export function resetBackchannelCount(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.backchannelCount = 0;
  }
}
