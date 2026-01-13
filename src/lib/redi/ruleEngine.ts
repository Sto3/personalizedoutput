/**
 * Redi Rule Engine - LAYER 1
 *
 * Pure logic, no AI. Evaluates perception data against predefined rules
 * for instant feedback (<10ms).
 *
 * This layer handles:
 * - Form corrections (spine angle, knee position, etc.)
 * - Safety alerts (dangerous positions)
 * - Encouragement (good reps, milestones)
 * - Mode-specific thresholds
 *
 * If a rule triggers, we skip AI entirely and respond immediately.
 */

import {
  PerceptionPacket,
  FormRule,
  RuleEngineState,
  RuleEngineResult,
  getRulesForMode
} from './militaryGradeTypes';
import { RediMode } from './types';

// Session states
const sessionStates = new Map<string, RuleEngineState>();

/**
 * Initialize rule engine for a session
 */
export function initRuleEngine(sessionId: string): void {
  sessionStates.set(sessionId, {
    sessionId,
    lastTriggered: new Map(),
    repCounter: 0,
    setCounter: 0,
    lastFormCheck: Date.now()
  });
  console.log(`[Rule Engine] Initialized for session ${sessionId}`);
}

/**
 * Clean up rule engine for a session
 */
export function cleanupRuleEngine(sessionId: string): void {
  sessionStates.delete(sessionId);
  console.log(`[Rule Engine] Cleaned up session ${sessionId}`);
}

/**
 * Evaluate perception packet against all rules
 * Returns immediately if a rule triggers
 */
export function evaluateRules(
  sessionId: string,
  packet: PerceptionPacket,
  mode: RediMode
): RuleEngineResult {
  const startTime = Date.now();
  const state = sessionStates.get(sessionId);

  if (!state) {
    console.warn(`[Rule Engine] No state for session ${sessionId}`);
    return { triggered: false, skipAI: false };
  }

  // Get rules for this mode
  const rules = getRulesForMode(mode);

  // Sort by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  // Evaluate each rule
  for (const rule of sortedRules) {
    // Check cooldown
    const lastTrigger = state.lastTriggered.get(rule.id) || 0;
    if (Date.now() - lastTrigger < rule.cooldownMs) {
      continue; // Still in cooldown
    }

    try {
      // Evaluate condition
      if (rule.condition(packet)) {
        // Rule triggered!
        state.lastTriggered.set(rule.id, Date.now());

        const processingTime = Date.now() - startTime;
        console.log(`[Rule Engine] Rule "${rule.name}" triggered in ${processingTime}ms`);

        return {
          triggered: true,
          rule,
          response: rule.response,
          skipAI: true  // Don't need AI for this
        };
      }
    } catch (error) {
      console.error(`[Rule Engine] Error evaluating rule "${rule.id}":`, error);
      // Continue to next rule
    }
  }

  // No rules triggered
  const processingTime = Date.now() - startTime;
  console.log(`[Rule Engine] No rules triggered (${processingTime}ms)`);

  return {
    triggered: false,
    skipAI: false  // Proceed to AI layers
  };
}

/**
 * Update rep counter based on movement
 */
export function updateRepCounter(
  sessionId: string,
  packet: PerceptionPacket
): { repCount: number; isNewRep: boolean } {
  const state = sessionStates.get(sessionId);
  if (!state) {
    return { repCount: 0, isNewRep: false };
  }

  const movement = packet.movement;
  if (!movement?.isRepetitive) {
    return { repCount: state.repCounter, isNewRep: false };
  }

  // Check if rep count increased
  if (movement.repCount && movement.repCount > state.repCounter) {
    state.repCounter = movement.repCount;
    return { repCount: state.repCounter, isNewRep: true };
  }

  return { repCount: state.repCounter, isNewRep: false };
}

/**
 * Get current rep count for a session
 */
export function getRepCount(sessionId: string): number {
  return sessionStates.get(sessionId)?.repCounter || 0;
}

/**
 * Reset rep counter (new set)
 */
export function resetRepCounter(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.setCounter++;
    state.repCounter = 0;
    console.log(`[Rule Engine] Reset rep counter for session ${sessionId}, set ${state.setCounter}`);
  }
}

/**
 * Add a custom rule at runtime
 */
export function addCustomRule(rule: FormRule): void {
  // This could be used for user-defined rules
  // For now, just log it
  console.log(`[Rule Engine] Custom rule "${rule.name}" added`);
}

// ============================================================================
// FORM ANALYSIS HELPERS
// ============================================================================

/**
 * Calculate angle between three points
 */
export function calculateAngle(
  point1: { x: number; y: number },
  vertex: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  const v1 = { x: point1.x - vertex.x, y: point1.y - vertex.y };
  const v2 = { x: point2.x - vertex.x, y: point2.y - vertex.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;

  const angle = Math.atan2(cross, dot);
  return Math.abs(angle * (180 / Math.PI));
}

/**
 * Check if pose data is complete enough for form analysis
 */
export function isPoseComplete(packet: PerceptionPacket, requiredJoints: string[]): boolean {
  const pose = packet.pose;
  if (!pose || pose.confidence < 0.5) {
    return false;
  }

  for (const joint of requiredJoints) {
    if (!(pose as any)[joint]) {
      return false;
    }
  }

  return true;
}

/**
 * Detect squat depth
 */
export function detectSquatDepth(packet: PerceptionPacket): 'parallel' | 'above' | 'below' | 'unknown' {
  const pose = packet.pose;
  if (!pose?.hips || !pose?.leftKnee || !pose?.rightKnee) {
    return 'unknown';
  }

  const hipY = pose.hips.y;
  const avgKneeY = (pose.leftKnee.y + pose.rightKnee.y) / 2;

  // In normalized coords, higher Y = lower position
  const diff = hipY - avgKneeY;

  if (diff > 0.05) return 'below';    // Hips below knees
  if (diff < -0.05) return 'above';   // Hips above knees
  return 'parallel';                   // At parallel
}

/**
 * Detect lockout (fully extended position)
 */
export function detectLockout(packet: PerceptionPacket): boolean {
  const pose = packet.pose;
  const angles = pose?.angles;

  if (!angles) return false;

  // Check if knees are nearly straight (170+ degrees)
  const leftKneeStraight = (angles.leftKnee ?? 0) > 170;
  const rightKneeStraight = (angles.rightKnee ?? 0) > 170;

  return leftKneeStraight && rightKneeStraight;
}

// ============================================================================
// SPECIALIZED RULE EVALUATORS
// ============================================================================

/**
 * Evaluate deadlift form
 */
export function evaluateDeadliftForm(packet: PerceptionPacket): {
  issue: string | null;
  severity: 'warning' | 'critical' | null;
} {
  const pose = packet.pose;
  if (!pose) return { issue: null, severity: null };

  const spineAngle = pose.angles.spineAngle ?? 0;

  // Critical: Spine rounding
  if (spineAngle > 25) {
    return {
      issue: 'Back rounding - reset',
      severity: 'critical'
    };
  }

  // Warning: Slight rounding
  if (spineAngle > 15) {
    return {
      issue: 'Tighten core',
      severity: 'warning'
    };
  }

  return { issue: null, severity: null };
}

/**
 * Evaluate squat form
 */
export function evaluateSquatForm(packet: PerceptionPacket): {
  issue: string | null;
  severity: 'warning' | 'critical' | null;
} {
  const pose = packet.pose;
  if (!pose) return { issue: null, severity: null };

  // Check knee cave
  if (pose.leftKnee && pose.rightKnee && pose.leftAnkle && pose.rightAnkle) {
    const leftKneeX = pose.leftKnee.x;
    const leftAnkleX = pose.leftAnkle.x;
    const rightKneeX = pose.rightKnee.x;
    const rightAnkleX = pose.rightAnkle.x;

    const leftCaving = leftKneeX > leftAnkleX + 0.03;
    const rightCaving = rightKneeX < rightAnkleX - 0.03;

    if (leftCaving || rightCaving) {
      return {
        issue: 'Knees out',
        severity: 'warning'
      };
    }
  }

  // Check depth
  const depth = detectSquatDepth(packet);
  if (depth === 'above' && packet.movement?.phase === 'transition') {
    return {
      issue: 'Deeper',
      severity: 'warning'
    };
  }

  return { issue: null, severity: null };
}

/**
 * Evaluate bench press form
 */
export function evaluateBenchForm(packet: PerceptionPacket): {
  issue: string | null;
  severity: 'warning' | 'critical' | null;
} {
  const pose = packet.pose;
  if (!pose) return { issue: null, severity: null };

  // Check elbow flare (elbows should stay ~45 degrees from body)
  // This would require shoulder-elbow-wrist angle analysis
  // Simplified: check if elbows are too wide

  if (pose.leftElbow && pose.rightElbow && pose.leftShoulder && pose.rightShoulder) {
    const shoulderWidth = Math.abs(pose.rightShoulder.x - pose.leftShoulder.x);
    const elbowWidth = Math.abs(pose.rightElbow.x - pose.leftElbow.x);

    if (elbowWidth > shoulderWidth * 1.5) {
      return {
        issue: 'Tuck elbows',
        severity: 'warning'
      };
    }
  }

  return { issue: null, severity: null };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  initRuleEngine,
  cleanupRuleEngine,
  evaluateRules,
  updateRepCounter,
  getRepCount,
  resetRepCounter,
  calculateAngle,
  isPoseComplete,
  detectSquatDepth,
  detectLockout,
  evaluateDeadliftForm,
  evaluateSquatForm,
  evaluateBenchForm
};
