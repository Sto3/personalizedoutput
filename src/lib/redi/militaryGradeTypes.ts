/**
 * Military-Grade Redi Architecture Types
 *
 * This architecture transforms Redi from raw-frame processing to structured
 * perception data, enabling:
 * - 200-500ms latency (down from 2-4 seconds)
 * - No hallucinations (Core ML vs Claude guessing)
 * - Precise feedback (math vs AI approximation)
 * - Minimal bandwidth (structured data vs full frames)
 *
 * ARCHITECTURE LAYERS:
 * 1. iOS On-Device Processing → Structured perception data
 * 2. Backend Rule Engine → Instant threshold-based responses
 * 3. Backend Haiku Triage → Fast AI decisions (90% of responses)
 * 4. Backend Sonnet Deep Reasoning → Complex questions only (10%)
 * 5. Response Pipeline → Guards and filters
 */

import { RediMode } from './types';

// ============================================================================
// LAYER 0: ON-DEVICE PERCEPTION (iOS → Backend)
// ============================================================================

/**
 * Pose data from Apple Vision framework
 * Joint positions normalized to 0-1 range
 */
export interface PoseData {
  // Upper body
  leftShoulder: Point3D | null;
  rightShoulder: Point3D | null;
  leftElbow: Point3D | null;
  rightElbow: Point3D | null;
  leftWrist: Point3D | null;
  rightWrist: Point3D | null;

  // Core
  neck: Point3D | null;
  spine: Point3D | null;
  hips: Point3D | null;

  // Lower body
  leftKnee: Point3D | null;
  rightKnee: Point3D | null;
  leftAnkle: Point3D | null;
  rightAnkle: Point3D | null;

  // Derived angles (calculated on device)
  angles: {
    leftElbow?: number;      // degrees
    rightElbow?: number;
    leftKnee?: number;
    rightKnee?: number;
    spineAngle?: number;     // forward lean
    shoulderTilt?: number;   // left-right imbalance
  };

  // Confidence scores
  confidence: number;        // 0-1, overall pose confidence
  timestamp: number;
}

export interface Point3D {
  x: number;  // 0-1 normalized
  y: number;  // 0-1 normalized
  z: number;  // depth, 0-1 normalized (if available)
}

/**
 * Object detection from Core ML
 */
export interface DetectedObject {
  label: string;              // e.g., "barbell", "book", "laptop"
  confidence: number;         // 0-1
  boundingBox: BoundingBox;
  category: ObjectCategory;
}

export interface BoundingBox {
  x: number;      // 0-1 normalized, top-left
  y: number;
  width: number;  // 0-1 normalized
  height: number;
}

export type ObjectCategory =
  | 'exercise_equipment'    // barbell, dumbbell, bench, mat
  | 'musical_instrument'    // guitar, piano, drum
  | 'study_material'        // book, notebook, laptop, pen
  | 'assembly_tool'         // screwdriver, wrench, parts
  | 'person'
  | 'furniture'
  | 'electronics'
  | 'other';

/**
 * Text detected via Apple Vision OCR
 */
export interface DetectedText {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

/**
 * Movement analysis from device
 */
export interface MovementData {
  phase: MovementPhase;
  velocity: number;           // relative, 0-1
  direction: 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward' | 'stationary';
  isRepetitive: boolean;      // detected repetitive motion
  repCount?: number;          // if counting reps
  tempo?: number;             // beats per minute if rhythmic
}

export type MovementPhase =
  | 'concentric'      // lifting/contracting
  | 'eccentric'       // lowering/extending
  | 'isometric'       // holding
  | 'transition'      // between phases
  | 'rest'            // not moving
  | 'unknown';

/**
 * Complete structured perception packet from iOS
 * This replaces raw frame data
 */
export interface PerceptionPacket {
  sessionId: string;
  deviceId: string;
  timestamp: number;

  // Pose tracking (Apple Vision)
  pose: PoseData | null;

  // Object detection (Core ML)
  objects: DetectedObject[];

  // Text detection (Apple Vision OCR)
  texts: DetectedText[];

  // Movement analysis
  movement: MovementData | null;

  // Audio transcript (from Deepgram, relayed)
  transcript: string | null;
  transcriptIsFinal: boolean;

  // Device context
  deviceOrientation: 'portrait' | 'landscape';
  lightLevel: 'dark' | 'normal' | 'bright';

  // Optional: raw frame for fallback (low-res, JPEG compressed)
  fallbackFrame?: string;     // Base64, only if ML fails
}

// ============================================================================
// LAYER 1: RULE ENGINE (No AI, pure logic)
// ============================================================================

/**
 * A rule that triggers instant feedback without AI
 */
export interface FormRule {
  id: string;
  name: string;
  modes: RediMode[];                    // Which modes this applies to
  condition: (packet: PerceptionPacket) => boolean;
  response: string;                      // Fixed response text
  priority: number;                      // Higher = more important
  cooldownMs: number;                    // Don't repeat within this time
  category: 'form' | 'safety' | 'encouragement' | 'alert';
}

/**
 * Rule engine state per session
 */
export interface RuleEngineState {
  sessionId: string;
  lastTriggered: Map<string, number>;   // ruleId -> timestamp
  repCounter: number;
  setCounter: number;
  lastFormCheck: number;
}

/**
 * Result from rule engine evaluation
 */
export interface RuleEngineResult {
  triggered: boolean;
  rule?: FormRule;
  response?: string;
  skipAI: boolean;                       // If true, don't call any AI
}

// ============================================================================
// LAYER 2: HAIKU TRIAGE (Fast AI decisions)
// ============================================================================

/**
 * Haiku triage decision types
 */
export type TriageDecision =
  | 'SILENT'                // Say nothing
  | 'QUICK_RESPONSE'        // Haiku generates response directly
  | 'NEEDS_REASONING';      // Pass to Sonnet for complex analysis

/**
 * Input to Haiku triage
 */
export interface TriageInput {
  packet: PerceptionPacket;
  recentContext: string[];              // Last 3-5 transcript entries
  ruleEngineResult: RuleEngineResult;   // What rules already triggered
  timeSinceLastSpoke: number;           // ms
  sensitivity: number;                  // 0-1
  mode: RediMode;
}

/**
 * Output from Haiku triage
 */
export interface TriageOutput {
  decision: TriageDecision;
  response?: string;                    // If QUICK_RESPONSE
  reasoningPrompt?: string;             // If NEEDS_REASONING, context for Sonnet
  confidence: number;
  processingTimeMs: number;
}

// ============================================================================
// LAYER 3: SONNET DEEP REASONING (Complex questions only)
// ============================================================================

/**
 * Input to Sonnet reasoning
 */
export interface ReasoningInput {
  packet: PerceptionPacket;
  triageOutput: TriageOutput;
  fullContext: string[];                // Full transcript buffer
  visualHistory: string[];              // Recent visual summaries
  mode: RediMode;
  userQuestion: string;                 // The question to answer
}

/**
 * Output from Sonnet reasoning
 */
export interface ReasoningOutput {
  response: string;
  confidence: number;
  processingTimeMs: number;
  tokensUsed: number;
}

// ============================================================================
// LAYER 4: RESPONSE PIPELINE (Guards and Filters)
// ============================================================================

/**
 * All the guards a response must pass
 */
export interface ResponseGuards {
  staleness: StalenessGuard;
  interruption: InterruptionGuard;
  length: LengthGuard;
  content: ContentGuard;
  deduplication: DeduplicationGuard;
  rateLimit: RateLimitGuard;
}

export interface StalenessGuard {
  maxAgeMs: number;                     // Default: 2000ms
  check: (responseTimestamp: number, contextTimestamp: number) => boolean;
}

export interface InterruptionGuard {
  check: (isSpeaking: boolean, userSpeaking: boolean) => boolean;
}

export interface LengthGuard {
  maxWordsUnprompted: number;           // Default: 8
  maxWordsPrompted: number;             // Default: 25
  enforce: (text: string, isPrompted: boolean) => string | null;
}

export interface ContentGuard {
  bannedPatterns: RegExp[];
  check: (text: string) => { pass: boolean; reason?: string };
}

export interface DeduplicationGuard {
  recentResponses: string[];
  similarityThreshold: number;          // 0-1, default 0.6
  check: (text: string) => boolean;
}

export interface RateLimitGuard {
  minGapMs: number;                     // Minimum time between responses
  lastResponseAt: number;
  check: () => boolean;
}

/**
 * Final response after all guards
 */
export interface PipelineOutput {
  approved: boolean;
  response?: string;
  rejectedBy?: string;                  // Which guard rejected it
  processingTimeMs: number;
  source: 'rule_engine' | 'haiku' | 'sonnet';
}

// ============================================================================
// WEBSOCKET PROTOCOL V2 (Structured data)
// ============================================================================

/**
 * New message types for structured data
 */
export type WSMessageTypeV2 =
  // From iOS
  | 'perception'              // PerceptionPacket
  | 'pose_update'             // Pose only (high frequency)
  | 'movement_event'          // Movement phase change
  | 'object_detected'         // New object in frame
  | 'text_detected'           // OCR result
  | 'user_speaking'           // User started speaking
  | 'user_stopped'            // User stopped speaking

  // To iOS
  | 'response'                // Redi's response
  | 'response_audio'          // TTS audio
  | 'rep_count'               // Rep counter update
  | 'form_alert'              // Urgent form correction

  // Bidirectional
  | 'ping' | 'pong'
  | 'session_end';

export interface WSPerceptionMessage {
  type: 'perception';
  sessionId: string;
  timestamp: number;
  payload: PerceptionPacket;
}

export interface WSResponseMessage {
  type: 'response';
  sessionId: string;
  timestamp: number;
  payload: {
    text: string;
    source: 'rule_engine' | 'haiku' | 'sonnet';
    latencyMs: number;
  };
}

// ============================================================================
// METRICS AND MONITORING
// ============================================================================

/**
 * Track performance metrics for optimization
 */
export interface PerformanceMetrics {
  sessionId: string;

  // Latency tracking
  avgRuleEngineLatencyMs: number;
  avgHaikuLatencyMs: number;
  avgSonnetLatencyMs: number;
  avgTotalLatencyMs: number;

  // Response distribution
  ruleEngineResponses: number;
  haikuResponses: number;
  sonnetResponses: number;
  silentDecisions: number;

  // Guard rejections
  rejectedStale: number;
  rejectedInterrupted: number;
  rejectedLength: number;
  rejectedContent: number;
  rejectedDuplicate: number;
  rejectedRateLimit: number;

  // Quality
  avgConfidence: number;
}

// ============================================================================
// MODE-SPECIFIC RULES
// ============================================================================

/**
 * Pre-defined rules for sports mode (example)
 */
export const SPORTS_RULES: FormRule[] = [
  {
    id: 'spine_rounding',
    name: 'Spine Rounding Alert',
    modes: ['sports'],
    condition: (p) => (p.pose?.angles.spineAngle ?? 0) > 20,
    response: 'Back rounding',
    priority: 10,
    cooldownMs: 5000,
    category: 'form'
  },
  {
    id: 'knee_cave',
    name: 'Knee Cave Alert',
    modes: ['sports'],
    condition: (p) => {
      // Detect if knees are caving inward during squat
      const pose = p.pose;
      if (!pose?.leftKnee || !pose?.rightKnee || !pose?.leftAnkle || !pose?.rightAnkle) {
        return false;
      }
      const leftKneeX = pose.leftKnee.x;
      const leftAnkleX = pose.leftAnkle.x;
      const rightKneeX = pose.rightKnee.x;
      const rightAnkleX = pose.rightAnkle.x;

      // Knees should be at least as wide as ankles
      const leftCaving = leftKneeX > leftAnkleX + 0.02;
      const rightCaving = rightKneeX < rightAnkleX - 0.02;
      return leftCaving || rightCaving;
    },
    response: 'Knees out',
    priority: 9,
    cooldownMs: 3000,
    category: 'form'
  },
  {
    id: 'good_rep',
    name: 'Good Rep Encouragement',
    modes: ['sports'],
    condition: (p) => {
      // Full range of motion completed
      return p.movement?.phase === 'transition' &&
             p.movement.isRepetitive &&
             (p.pose?.angles.spineAngle ?? 100) < 15;
    },
    response: 'Good',
    priority: 3,
    cooldownMs: 10000,
    category: 'encouragement'
  }
];

/**
 * Pre-defined rules for studying mode
 */
export const STUDYING_RULES: FormRule[] = [
  {
    id: 'posture_slump',
    name: 'Posture Slump Alert',
    modes: ['studying'],
    condition: (p) => (p.pose?.angles.spineAngle ?? 0) > 30,
    response: 'Sit up straight',
    priority: 5,
    cooldownMs: 60000,  // Once per minute max
    category: 'form'
  }
];

/**
 * Pre-defined rules for music mode
 */
export const MUSIC_RULES: FormRule[] = [
  {
    id: 'wrist_tension',
    name: 'Wrist Tension Alert',
    modes: ['music'],
    condition: (p) => {
      // High wrist angle indicates tension
      const pose = p.pose;
      if (!pose?.leftWrist || !pose?.leftElbow) return false;
      // Simplified: wrist significantly above or below elbow
      const wristHeight = pose.leftWrist.y;
      const elbowHeight = pose.leftElbow.y;
      return Math.abs(wristHeight - elbowHeight) > 0.15;
    },
    response: 'Relax wrists',
    priority: 6,
    cooldownMs: 15000,
    category: 'form'
  }
];

/**
 * Get all rules for a mode
 */
export function getRulesForMode(mode: RediMode): FormRule[] {
  const allRules = [...SPORTS_RULES, ...STUDYING_RULES, ...MUSIC_RULES];
  return allRules.filter(r => r.modes.includes(mode));
}
