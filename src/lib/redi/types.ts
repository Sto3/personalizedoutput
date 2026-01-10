/**
 * Redi Types
 *
 * Core type definitions for the Redi real-time AI presence system.
 */

// Session types
export type RediMode =
  | 'studying'      // Studying & Learning
  | 'meeting'       // Meeting & Presentation
  | 'sports'        // Sports & Movement
  | 'music'         // Music & Instrument
  | 'assembly'      // Building & Assembly
  | 'monitoring';   // Watching Over

export type VoiceGender = 'male' | 'female';

export interface RediSession {
  id: string;
  joinCode: string;             // 6-digit alphanumeric code for joining
  hostDeviceId: string;         // Device ID of the session host
  userId?: string;
  mode: RediMode;
  sensitivity: number;          // 0.0 (passive) to 1.0 (active)
  voiceGender: VoiceGender;
  durationMinutes: 30 | 60;
  startedAt: Date;
  expiresAt: Date;
  status: 'active' | 'paused' | 'expired' | 'ended';
  stripePaymentId?: string;
  // Multi-phone settings
  audioOutputMode: 'host_only' | 'all_devices';
  maxParticipants: number;      // Default: 5
}

// Participant tracking for multi-phone sessions
export interface SessionParticipant {
  deviceId: string;
  isHost: boolean;
  joinedAt: Date;
  lastActiveAt: Date;
  deviceName?: string;
}

export interface SessionConfig {
  mode: RediMode;
  sensitivity: number;
  voiceGender: VoiceGender;
  durationMinutes: 30 | 60;
}

// Decision engine types
export interface DecisionContext {
  sessionId: string;
  sensitivity: number;
  lastSpokeAt: number;
  silenceDuration: number;
  transcriptBuffer: string[];
  visualContext: string;
  pendingInsight: string | null;
  insightConfidence: number;
  mode: RediMode;
}

export interface SpeakDecision {
  shouldSpeak: boolean;
  reason: 'question' | 'silence' | 'error_detected' | 'valuable_insight' | 'none';
  confidence: number;
}

// Transcription types
export interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

// Vision types
export interface VisualAnalysis {
  description: string;
  detectedObjects: string[];
  textContent: string[];
  suggestions: string[];
  timestamp: number;
}

export interface MotionClip {
  frames: Buffer[];      // JPEG frames
  duration: number;      // milliseconds
  capturedAt: number;
}

// Voice types
export interface VoiceConfig {
  gender: VoiceGender;
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

// WebSocket message types
export type WSMessageType =
  | 'session_start'
  | 'session_end'
  | 'audio_chunk'
  | 'transcript'
  | 'snapshot'
  | 'motion_clip'
  | 'visual_analysis'
  | 'ai_response'
  | 'voice_audio'
  | 'sensitivity_update'
  | 'error'
  | 'ping'
  | 'pong'
  // Multi-phone session messages
  | 'participant_joined'
  | 'participant_left'
  | 'participant_list'
  | 'audio_output_mode_changed';

export interface WSMessage {
  type: WSMessageType;
  sessionId: string;
  timestamp: number;
  payload: any;
}

export interface WSAudioChunk extends WSMessage {
  type: 'audio_chunk';
  payload: {
    audio: string;        // Base64 encoded audio
    format: 'pcm' | 'webm';
    sampleRate: number;
  };
}

export interface WSTranscript extends WSMessage {
  type: 'transcript';
  payload: TranscriptChunk;
}

export interface WSSnapshot extends WSMessage {
  type: 'snapshot';
  payload: {
    image: string;        // Base64 encoded JPEG
    width: number;
    height: number;
  };
}

export interface WSMotionClip extends WSMessage {
  type: 'motion_clip';
  payload: {
    frames: string[];     // Base64 encoded JPEG frames
    duration: number;
  };
}

export interface WSAIResponse extends WSMessage {
  type: 'ai_response';
  payload: {
    text: string;
    isStreaming: boolean;
    isFinal: boolean;
  };
}

export interface WSVoiceAudio extends WSMessage {
  type: 'voice_audio';
  payload: {
    audio: string;        // Base64 encoded audio
    format: 'mp3' | 'pcm';
    isStreaming: boolean;
    isFinal: boolean;
  };
}

// Cost tracking
export interface SessionCosts {
  transcription: number;
  vision: number;
  ai: number;
  voice: number;
  total: number;
}

// Mode-specific configurations
export const MODE_CONFIGS: Record<RediMode, {
  snapshotIntervalMs: number;
  useMotionDetection: boolean;
  defaultSensitivity: number;
  systemPromptFocus: string;
}> = {
  studying: {
    snapshotIntervalMs: 8000,
    useMotionDetection: false,
    defaultSensitivity: 0.5,
    systemPromptFocus: 'educational content, explanations, quizzes, and learning support'
  },
  meeting: {
    snapshotIntervalMs: 10000,
    useMotionDetection: false,
    defaultSensitivity: 0.3,
    systemPromptFocus: 'meeting context, presentation feedback, data insights, and professional contributions'
  },
  sports: {
    snapshotIntervalMs: 0,  // Motion-triggered only
    useMotionDetection: true,
    defaultSensitivity: 0.7,
    systemPromptFocus: 'movement technique, form correction, timing, and athletic performance feedback'
  },
  music: {
    snapshotIntervalMs: 0,  // Motion-triggered only
    useMotionDetection: true,
    defaultSensitivity: 0.6,
    systemPromptFocus: 'technique, hand positioning, rhythm, tempo, and musical expression'
  },
  assembly: {
    snapshotIntervalMs: 5000,
    useMotionDetection: true,
    defaultSensitivity: 0.6,
    systemPromptFocus: 'assembly steps, potential mistakes, component identification, and construction guidance'
  },
  monitoring: {
    snapshotIntervalMs: 15000,
    useMotionDetection: true,
    defaultSensitivity: 0.2,
    systemPromptFocus: 'safety, alerting to concerning situations, and status updates when asked'
  }
};
