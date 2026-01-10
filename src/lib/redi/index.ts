/**
 * Redi Module Index
 *
 * Export all Redi services and types for easy importing.
 */

// Types
export * from './types';

// Services
export * as sessionManager from './sessionManager';
export * as decisionEngine from './decisionEngine';
export * as transcriptionService from './transcriptionService';
export * as visionService from './visionService';
export * as voiceService from './voiceService';

// Re-export commonly used functions
export {
  createSession,
  getSession,
  validateSession,
  updateSensitivity,
  endSession,
  getRemainingTime,
  getSessionCosts,
  getActiveSessions,
  getSessionStats
} from './sessionManager';

export {
  shouldSpeak,
  generateInsight,
  generateQuestionResponse,
  createInitialContext
} from './decisionEngine';

export {
  startTranscription,
  sendAudio,
  stopTranscription,
  isDeepgramConfigured
} from './transcriptionService';

export {
  analyzeSnapshot,
  analyzeMotionClip,
  getVisualContext,
  clearVisualContext
} from './visionService';

export {
  initVoiceService,
  speak,
  closeVoiceService,
  isElevenLabsConfigured,
  getAvailableVoices
} from './voiceService';
