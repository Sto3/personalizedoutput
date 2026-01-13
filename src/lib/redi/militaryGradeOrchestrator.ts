/**
 * Military-Grade Redi Orchestrator
 *
 * Main entry point that coordinates all layers:
 * 1. Rule Engine (instant, no AI)
 * 2. Haiku Triage (fast AI, 90% of responses)
 * 3. Sonnet Deep Reasoning (complex only, 10%)
 * 4. Response Pipeline (guards and filters)
 *
 * Architecture:
 * PerceptionPacket → Rule Engine → (if no rule) → Haiku Triage
 *                                  ↓                    ↓
 *                              Response          Quick Response
 *                                  ↓                    ↓
 *                      Response Pipeline ← (if needs reasoning) → Sonnet
 *                              ↓
 *                        TTS → Speaker
 */

import {
  PerceptionPacket,
  RuleEngineResult,
  TriageOutput,
  PipelineOutput,
  PerformanceMetrics
} from './militaryGradeTypes';
import { RediMode, MODE_CONFIGS } from './types';

// Import all layers
import { initRuleEngine, cleanupRuleEngine, evaluateRules, updateRepCounter } from './ruleEngine';
import { initTriage, cleanupTriage, triage, getTriageMetrics } from './haikuTriage';
import {
  initPipeline,
  cleanupPipeline,
  updateContextTimestamp,
  setUserSpeaking,
  setRediSpeaking,
  processResponse
} from './responsePipeline';

// For Sonnet deep reasoning (reuse existing)
import { generateQuestionResponse } from './decisionEngine';

// ============================================================================
// SESSION STATE
// ============================================================================

interface OrchestratorState {
  sessionId: string;
  mode: RediMode;
  sensitivity: number;
  isInitialized: boolean;
  lastSpokeAt: number;
  recentContext: string[];
  metrics: PerformanceMetrics;
}

const sessionStates = new Map<string, OrchestratorState>();

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize military-grade architecture for a session
 */
export function initMilitaryGrade(
  sessionId: string,
  mode: RediMode,
  sensitivity: number
): void {
  console.log(`[Orchestrator] Initializing military-grade for session ${sessionId}`);

  // Initialize all layers
  initRuleEngine(sessionId);
  initTriage(sessionId);
  initPipeline(sessionId);

  // Initialize orchestrator state
  sessionStates.set(sessionId, {
    sessionId,
    mode,
    sensitivity,
    isInitialized: true,
    lastSpokeAt: Date.now(),
    recentContext: [],
    metrics: {
      sessionId,
      avgRuleEngineLatencyMs: 0,
      avgHaikuLatencyMs: 0,
      avgSonnetLatencyMs: 0,
      avgTotalLatencyMs: 0,
      ruleEngineResponses: 0,
      haikuResponses: 0,
      sonnetResponses: 0,
      silentDecisions: 0,
      rejectedStale: 0,
      rejectedInterrupted: 0,
      rejectedLength: 0,
      rejectedContent: 0,
      rejectedDuplicate: 0,
      rejectedRateLimit: 0,
      avgConfidence: 0
    }
  });

  console.log(`[Orchestrator] Military-grade initialized for ${sessionId}`);
}

/**
 * Clean up military-grade architecture for a session
 */
export function cleanupMilitaryGrade(sessionId: string): void {
  const state = sessionStates.get(sessionId);

  if (state) {
    console.log(`[Orchestrator] Session ${sessionId} final metrics:`, state.metrics);
  }

  cleanupRuleEngine(sessionId);
  cleanupTriage(sessionId);
  cleanupPipeline(sessionId);
  sessionStates.delete(sessionId);

  console.log(`[Orchestrator] Military-grade cleaned up for ${sessionId}`);
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process a perception packet through all layers
 * Returns the final response (or null if silent)
 */
export async function processPerception(
  sessionId: string,
  packet: PerceptionPacket
): Promise<{
  response: string | null;
  source: 'rule_engine' | 'haiku' | 'sonnet' | 'silent';
  latencyMs: number;
  repCount?: number;
}> {
  const startTime = Date.now();
  const state = sessionStates.get(sessionId);

  if (!state || !state.isInitialized) {
    console.warn(`[Orchestrator] Session ${sessionId} not initialized`);
    return { response: null, source: 'silent', latencyMs: Date.now() - startTime };
  }

  // Update context timestamp for staleness tracking
  updateContextTimestamp(sessionId);

  // Update recent context
  if (packet.transcript) {
    state.recentContext.push(packet.transcript);
    if (state.recentContext.length > 5) {
      state.recentContext.shift();
    }
  }

  // Update rep counter
  const repUpdate = updateRepCounter(sessionId, packet);

  // ========================================
  // LAYER 1: Rule Engine
  // ========================================
  const ruleStartTime = Date.now();
  const ruleResult = evaluateRules(sessionId, packet, state.mode);
  const ruleLatency = Date.now() - ruleStartTime;

  updateMetric(state.metrics, 'avgRuleEngineLatencyMs', ruleLatency);

  if (ruleResult.triggered && ruleResult.response) {
    // Rule fired! Process through pipeline
    const pipelineResult = processResponse(
      sessionId,
      ruleResult.response,
      'rule_engine',
      false  // Rules are unprompted
    );

    if (pipelineResult.approved) {
      state.metrics.ruleEngineResponses++;
      state.lastSpokeAt = Date.now();

      return {
        response: pipelineResult.response!,
        source: 'rule_engine',
        latencyMs: Date.now() - startTime,
        repCount: repUpdate.isNewRep ? repUpdate.repCount : undefined
      };
    } else {
      updateRejectionMetric(state.metrics, pipelineResult.rejectedBy);
    }
  }

  // ========================================
  // LAYER 2: Haiku Triage
  // ========================================
  const triageStartTime = Date.now();
  const triageInput = {
    packet,
    recentContext: state.recentContext,
    ruleEngineResult: ruleResult,
    timeSinceLastSpoke: Date.now() - state.lastSpokeAt,
    sensitivity: state.sensitivity,
    mode: state.mode
  };

  const triageResult = await triage(triageInput);
  const triageLatency = Date.now() - triageStartTime;

  updateMetric(state.metrics, 'avgHaikuLatencyMs', triageLatency);

  if (triageResult.decision === 'SILENT') {
    state.metrics.silentDecisions++;
    return {
      response: null,
      source: 'silent',
      latencyMs: Date.now() - startTime,
      repCount: repUpdate.isNewRep ? repUpdate.repCount : undefined
    };
  }

  if (triageResult.decision === 'QUICK_RESPONSE' && triageResult.response) {
    // Process through pipeline
    const pipelineResult = processResponse(
      sessionId,
      triageResult.response,
      'haiku',
      false  // Haiku responses are unprompted quick observations
    );

    if (pipelineResult.approved) {
      state.metrics.haikuResponses++;
      state.lastSpokeAt = Date.now();

      return {
        response: pipelineResult.response!,
        source: 'haiku',
        latencyMs: Date.now() - startTime,
        repCount: repUpdate.isNewRep ? repUpdate.repCount : undefined
      };
    } else {
      updateRejectionMetric(state.metrics, pipelineResult.rejectedBy);
      return {
        response: null,
        source: 'silent',
        latencyMs: Date.now() - startTime
      };
    }
  }

  // ========================================
  // LAYER 3: Sonnet Deep Reasoning
  // ========================================
  if (triageResult.decision === 'NEEDS_REASONING') {
    const sonnetStartTime = Date.now();

    // Use existing generateQuestionResponse for now
    // This is the complex question handler
    const question = packet.transcript || triageResult.reasoningPrompt || '';

    try {
      const sonnetResponse = await generateQuestionResponse(
        state.mode,
        question,
        state.recentContext,
        '' // Visual context would come from packet
      );

      const sonnetLatency = Date.now() - sonnetStartTime;
      updateMetric(state.metrics, 'avgSonnetLatencyMs', sonnetLatency);

      // Process through pipeline
      const pipelineResult = processResponse(
        sessionId,
        sonnetResponse,
        'sonnet',
        true  // Sonnet responses are prompted (answering questions)
      );

      if (pipelineResult.approved) {
        state.metrics.sonnetResponses++;
        state.lastSpokeAt = Date.now();

        return {
          response: pipelineResult.response!,
          source: 'sonnet',
          latencyMs: Date.now() - startTime,
          repCount: repUpdate.isNewRep ? repUpdate.repCount : undefined
        };
      } else {
        updateRejectionMetric(state.metrics, pipelineResult.rejectedBy);
      }
    } catch (error) {
      console.error('[Orchestrator] Sonnet error:', error);
    }
  }

  // No response
  return {
    response: null,
    source: 'silent',
    latencyMs: Date.now() - startTime,
    repCount: repUpdate.isNewRep ? repUpdate.repCount : undefined
  };
}

// ============================================================================
// DIRECT QUESTION HANDLING
// ============================================================================

/**
 * Handle a direct question from user (bypasses triage, goes straight to Sonnet)
 */
export async function handleDirectQuestion(
  sessionId: string,
  question: string,
  visualContext: string = ''
): Promise<{
  response: string;
  latencyMs: number;
}> {
  const startTime = Date.now();
  const state = sessionStates.get(sessionId);

  if (!state) {
    return {
      response: "I'm here.",
      latencyMs: Date.now() - startTime
    };
  }

  // Update context timestamp
  updateContextTimestamp(sessionId);

  // Go directly to Sonnet for questions
  try {
    const response = await generateQuestionResponse(
      state.mode,
      question,
      state.recentContext,
      visualContext
    );

    // Process through pipeline
    const pipelineResult = processResponse(
      sessionId,
      response,
      'sonnet',
      true  // Questions are prompted
    );

    if (pipelineResult.approved) {
      state.metrics.sonnetResponses++;
      state.lastSpokeAt = Date.now();

      return {
        response: pipelineResult.response!,
        latencyMs: Date.now() - startTime
      };
    } else {
      // If pipeline rejected, use safe fallback
      return {
        response: "Got it.",
        latencyMs: Date.now() - startTime
      };
    }
  } catch (error) {
    console.error('[Orchestrator] Question handling error:', error);
    return {
      response: "Got it.",
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// STATE UPDATES
// ============================================================================

/**
 * Update sensitivity for a session
 */
export function updateSensitivity(sessionId: string, sensitivity: number): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.sensitivity = Math.max(0, Math.min(1, sensitivity));
    console.log(`[Orchestrator] Updated sensitivity to ${state.sensitivity} for ${sessionId}`);
  }
}

/**
 * Notify that user started speaking (for interruption handling)
 */
export function onUserSpeaking(sessionId: string): void {
  setUserSpeaking(sessionId, true);
}

/**
 * Notify that user stopped speaking
 */
export function onUserStopped(sessionId: string): void {
  setUserSpeaking(sessionId, false);
}

/**
 * Notify that Redi started speaking
 */
export function onRediSpeaking(sessionId: string): void {
  setRediSpeaking(sessionId, true);
}

/**
 * Notify that Redi finished speaking
 */
export function onRediFinished(sessionId: string): void {
  setRediSpeaking(sessionId, false);
}

// ============================================================================
// METRICS
// ============================================================================

/**
 * Get performance metrics for a session
 */
export function getMetrics(sessionId: string): PerformanceMetrics | null {
  const state = sessionStates.get(sessionId);
  return state?.metrics || null;
}

/**
 * Update running average metric
 */
function updateMetric(
  metrics: PerformanceMetrics,
  key: keyof PerformanceMetrics,
  value: number
): void {
  const currentAvg = metrics[key] as number;
  // Simple exponential moving average (0.2 weight for new value)
  (metrics as any)[key] = currentAvg * 0.8 + value * 0.2;
}

/**
 * Update rejection metric
 */
function updateRejectionMetric(
  metrics: PerformanceMetrics,
  rejectedBy: string | undefined
): void {
  switch (rejectedBy) {
    case 'staleness':
      metrics.rejectedStale++;
      break;
    case 'interruption':
      metrics.rejectedInterrupted++;
      break;
    case 'length':
      metrics.rejectedLength++;
      break;
    case 'content':
      metrics.rejectedContent++;
      break;
    case 'deduplication':
      metrics.rejectedDuplicate++;
      break;
    case 'rate_limit':
      metrics.rejectedRateLimit++;
      break;
  }
}

// ============================================================================
// CHECK IF MILITARY GRADE IS ENABLED
// ============================================================================

/**
 * Check if a session is using military-grade architecture
 */
export function isMilitaryGradeEnabled(sessionId: string): boolean {
  const state = sessionStates.get(sessionId);
  return state?.isInitialized || false;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initMilitaryGrade,
  cleanupMilitaryGrade,
  processPerception,
  handleDirectQuestion,
  updateSensitivity,
  onUserSpeaking,
  onUserStopped,
  onRediSpeaking,
  onRediFinished,
  getMetrics,
  isMilitaryGradeEnabled
};
