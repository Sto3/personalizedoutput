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
 * Handle a direct question from user
 * Routes to Haiku (fast) for simple questions, Sonnet for complex ones
 */
export async function handleDirectQuestion(
  sessionId: string,
  question: string,
  visualContext: string = ''
): Promise<{
  response: string;
  latencyMs: number;
  source: 'haiku' | 'sonnet';
}> {
  const startTime = Date.now();
  const state = sessionStates.get(sessionId);

  if (!state) {
    return {
      response: "I'm here.",
      latencyMs: Date.now() - startTime,
      source: 'haiku'
    };
  }

  // Update context timestamp
  updateContextTimestamp(sessionId);

  // Determine if question needs Sonnet (complex) or Haiku (simple)
  const needsSonnet = isComplexQuestion(question);
  const model = needsSonnet ? 'sonnet' : 'haiku';

  console.log(`[Orchestrator] Question routing: ${model} (complex: ${needsSonnet})`);

  try {
    let response: string;

    if (needsSonnet) {
      // Complex question → Sonnet for deep reasoning
      response = await generateQuestionResponse(
        state.mode,
        question,
        state.recentContext,
        visualContext
      );
      state.metrics.sonnetResponses++;
    } else {
      // Simple question → Haiku for fast response
      response = await generateQuickQuestionResponse(
        state.mode,
        question,
        state.recentContext,
        visualContext
      );
      state.metrics.haikuResponses++;
    }

    // Process through pipeline
    const pipelineResult = processResponse(
      sessionId,
      response,
      model,
      true  // Questions are prompted
    );

    if (pipelineResult.approved) {
      state.lastSpokeAt = Date.now();

      return {
        response: pipelineResult.response!,
        latencyMs: Date.now() - startTime,
        source: model
      };
    } else {
      // If pipeline rejected, use safe fallback
      const fallbacks = ["I'm here.", "Listening.", "I hear you."];
      return {
        response: fallbacks[Math.floor(Math.random() * fallbacks.length)],
        latencyMs: Date.now() - startTime,
        source: model
      };
    }
  } catch (error) {
    console.error('[Orchestrator] Question handling error:', error);
    return {
      response: "I'm here.",
      latencyMs: Date.now() - startTime,
      source: 'haiku'
    };
  }
}

/**
 * Determine if a question needs Sonnet (complex) or can use Haiku (simple)
 */
function isComplexQuestion(question: string): boolean {
  const q = question.toLowerCase();

  // Complex patterns that need Sonnet's reasoning
  const complexPatterns = [
    /explain/i,
    /why (is|are|do|does|did|would|should)/i,
    /how (do|does|can|could|would|should) (i|you|we)/i,
    /what('s| is) (the|my) (problem|issue|mistake)/i,
    /tell me (about|more|everything)/i,
    /describe (in detail|everything|all)/i,
    /analyze/i,
    /compare/i,
    /what (should|could|would) (i|we)/i,
    /help me understand/i,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(q)) return true;
  }

  // Long questions (>10 words) likely need more reasoning
  const wordCount = q.split(/\s+/).length;
  if (wordCount > 10) return true;

  // Default to Haiku (fast) for simple questions
  return false;
}

/**
 * Generate quick response using Haiku (for simple questions)
 */
async function generateQuickQuestionResponse(
  mode: RediMode,
  question: string,
  recentContext: string[],
  visualContext: string
): Promise<string> {
  const modeConfig = MODE_CONFIGS[mode];
  const context = recentContext.slice(-3).join('\n');

  const systemPrompt = `You are Redi, a helpful AI assistant. Answer briefly and directly.

RULES:
- MAX 15 words. Be concise.
- NO questions back. NO "how can I help".
- Just answer what was asked.
- Use contractions naturally.

Focus: ${modeConfig.systemPromptFocus}`;

  const visualLine = visualContext ? `\nI see: ${visualContext}` : '';
  const userPrompt = `${context}${visualLine}\nUser: ${question}`;

  const anthropic = new (await import('@anthropic-ai/sdk')).default();

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 60,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text.trim() : "I'm here.";
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
 * Update mode for a session (for autonomous mode detection)
 */
export function updateMode(sessionId: string, newMode: RediMode): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    const oldMode = state.mode;
    state.mode = newMode;

    // Also update sensitivity to mode default
    const modeConfig = MODE_CONFIGS[newMode];
    state.sensitivity = modeConfig.defaultSensitivity;

    // CRITICAL: Reset rule engine state when mode changes
    // Old mode's rules (e.g., sports rep counting) shouldn't fire for new mode (e.g., cooking)
    cleanupRuleEngine(sessionId);
    initRuleEngine(sessionId);

    // Clear recent context - old mode's context isn't relevant to new mode
    state.recentContext = [];

    console.log(`[Orchestrator] Mode changed from ${oldMode} to ${newMode} for ${sessionId}`);
    console.log(`[Orchestrator] Sensitivity adjusted to ${state.sensitivity} (mode default)`);
    console.log(`[Orchestrator] Rule engine reset for new mode`);
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
  updateMode,
  onUserSpeaking,
  onUserStopped,
  onRediSpeaking,
  onRediFinished,
  getMetrics,
  isMilitaryGradeEnabled
};
