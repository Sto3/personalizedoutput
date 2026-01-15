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
// UNCERTAINTY COMMUNICATION
// ============================================================================

/**
 * Add hedging language based on scene confidence
 * Low confidence = more hedging ("It looks like...", "I think...")
 * High confidence = direct statements
 */
function addUncertaintyHedge(response: string, confidence: number): string {
  // High confidence (>0.7) - direct statement
  if (confidence > 0.7) {
    return response;
  }

  // Medium confidence (0.4-0.7) - light hedging
  if (confidence > 0.4) {
    const hedges = [
      'It looks like ',
      'I think ',
      'Seems like ',
    ];
    const hedge = hedges[Math.floor(Math.random() * hedges.length)];

    // Only hedge statements, not questions or commands
    if (!response.endsWith('?') && !response.endsWith('!')) {
      // Make first letter lowercase if hedging
      const lowerResponse = response.charAt(0).toLowerCase() + response.slice(1);
      return hedge + lowerResponse;
    }
    return response;
  }

  // Low confidence (<0.4) - stronger hedging
  const strongHedges = [
    "I'm not sure, but it looks like ",
    "Hard to tell, but I think ",
    "From what I can see, ",
  ];
  const hedge = strongHedges[Math.floor(Math.random() * strongHedges.length)];

  if (!response.endsWith('?') && !response.endsWith('!')) {
    const lowerResponse = response.charAt(0).toLowerCase() + response.slice(1);
    return hedge + lowerResponse;
  }
  return response;
}

/**
 * Check if confidence is too low to speak (prevents hallucination)
 */
function shouldSupressLowConfidence(confidence: number, isPrompted: boolean): boolean {
  // Never suppress prompted responses (user asked a question)
  if (isPrompted) return false;

  // Suppress unprompted visual observations when confidence is very low
  return confidence < 0.25;
}

// ============================================================================
// HELPER: Build visual context from perception packet
// ============================================================================

/**
 * Build a concise visual context string from perception packet
 * This is passed to Sonnet so it knows what Redi can see
 */
function buildVisualContext(packet: PerceptionPacket): string {
  const parts: string[] = [];
  const extPacket = packet as any;  // For new optional fields

  // Objects detected
  if (packet.objects && packet.objects.length > 0) {
    const objects = packet.objects
      .filter(o => o.confidence > 0.6)
      .slice(0, 5)
      .map(o => o.label);
    if (objects.length > 0) {
      parts.push(`Objects: ${objects.join(', ')}`);
    }
  }

  // Text detected (OCR)
  if (packet.texts && packet.texts.length > 0) {
    const texts = packet.texts
      .filter(t => t.confidence > 0.7)
      .slice(0, 3)
      .map(t => t.text.substring(0, 50));
    if (texts.length > 0) {
      parts.push(`Text visible: ${texts.join('; ')}`);
    }
  }

  // Pose information
  if (packet.pose && packet.pose.confidence > 0.5) {
    const pose = packet.pose;
    const poseParts: string[] = [];
    if (pose.bodyPosition) poseParts.push(pose.bodyPosition);
    if (pose.angles.spineAngle !== undefined) {
      poseParts.push(`spine ${Math.round(pose.angles.spineAngle)}°`);
    }
    if (poseParts.length > 0) {
      parts.push(`Person: ${poseParts.join(', ')}`);
    }
  }

  // Movement
  if (packet.movement && packet.movement.phase !== 'rest' && packet.movement.phase !== 'unknown') {
    parts.push(`Movement: ${packet.movement.phase}`);
  }

  // NEW: Audio context (environmental sounds)
  if (extPacket.dominantSound) {
    parts.push(`Sounds: ${extPacket.dominantSound}`);
  } else if (extPacket.audioEvents && extPacket.audioEvents.length > 0) {
    const sounds = extPacket.audioEvents
      .filter((e: any) => e.confidence > 0.6)
      .slice(0, 3)
      .map((e: any) => e.label);
    if (sounds.length > 0) {
      parts.push(`Sounds: ${sounds.join(', ')}`);
    }
  }

  // NEW: Motion state (user activity)
  if (extPacket.motionState) {
    const ms = extPacket.motionState;
    if (ms.isExercising) {
      parts.push('User activity: exercising');
    } else if (ms.isWalking) {
      parts.push('User activity: walking');
    }
    // Don't add stationary - that's the default
  }

  // Device context - light level
  if (packet.lightLevel && packet.lightLevel !== 'normal') {
    parts.push(`Light: ${packet.lightLevel}`);
    // Add warning for low-light if confidence is affected
    if (extPacket.lightConfidenceModifier && extPacket.lightConfidenceModifier < 0.7) {
      parts.push('(vision limited)');
    }
  }

  // NEW: Overall confidence (helps AI know how reliable its data is)
  if (extPacket.overallConfidence !== undefined && extPacket.overallConfidence < 0.5) {
    parts.push(`(low visual confidence: ${Math.round(extPacket.overallConfidence * 100)}%)`);
  }

  return parts.join('. ') || '';
}

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

// Server-side visual context fallback (from Claude Vision analysis)
// Used when iOS Vision doesn't detect anything but server analysis has results
interface ServerVisualContext {
  description: string;
  timestamp: number;
}
const serverVisualContexts = new Map<string, ServerVisualContext>();

/**
 * Update server-side visual context (called from rediSocket after vision analysis)
 * This is used as fallback when iOS Vision doesn't detect objects/text
 */
export function updateServerVisualContext(sessionId: string, description: string): void {
  serverVisualContexts.set(sessionId, {
    description,
    timestamp: Date.now()
  });
}

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
  serverVisualContexts.delete(sessionId);  // CRITICAL: Prevent memory leak

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

  // CRITICAL: Get server visual context (Claude Vision analysis)
  // This is what Claude Vision actually SAW - Haiku MUST use this for accurate responses!
  let serverVisualCtx: string | undefined;
  const serverCtx = serverVisualContexts.get(sessionId);
  if (serverCtx) {
    const contextAge = Date.now() - serverCtx.timestamp;
    if (contextAge < 10000) {
      serverVisualCtx = serverCtx.description;
      console.log(`[Orchestrator] Passing vision context to Haiku (age=${contextAge}ms): ${serverCtx.description.substring(0, 80)}...`);
    } else {
      console.log(`[Orchestrator] Vision context too old (${contextAge}ms), not passing to Haiku`);
    }
  } else {
    console.log(`[Orchestrator] No vision context available for session ${sessionId}`);
  }

  const triageInput = {
    packet,
    recentContext: state.recentContext,
    ruleEngineResult: ruleResult,
    timeSinceLastSpoke: Date.now() - state.lastSpokeAt,
    sensitivity: state.sensitivity,
    mode: state.mode,
    serverVisualContext: serverVisualCtx  // CRITICAL: Pass Claude Vision analysis to Haiku!
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
    // Check scene confidence from packet (ensemble grounding result)
    const extPacket = packet as any;
    const sceneConfidence = extPacket.overallConfidence ?? 0.8;  // Default high if not provided

    // Suppress low-confidence unprompted visual observations
    if (shouldSupressLowConfidence(sceneConfidence, false)) {
      console.log(`[Orchestrator] Suppressing low-confidence response (${Math.round(sceneConfidence * 100)}%)`);
      state.metrics.silentDecisions++;
      return {
        response: null,
        source: 'silent',
        latencyMs: Date.now() - startTime,
        repCount: repUpdate.isNewRep ? repUpdate.repCount : undefined
      };
    }

    // Apply uncertainty hedging based on confidence
    const hedgedResponse = addUncertaintyHedge(triageResult.response, sceneConfidence);

    // Process through pipeline
    const pipelineResult = processResponse(
      sessionId,
      hedgedResponse,
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
      // Build visual context from what Redi can see
      // Priority: iOS Vision data (fresh) → Server Claude Vision (fallback)
      let visualContext = buildVisualContext(packet);

      // If iOS didn't detect anything, try server-side visual context
      if (!visualContext) {
        const serverCtx = serverVisualContexts.get(sessionId);
        if (serverCtx && (Date.now() - serverCtx.timestamp) < 5000) {
          visualContext = serverCtx.description;
          console.log(`[Orchestrator] Using server visual context as fallback (${Math.round((Date.now() - serverCtx.timestamp)/1000)}s old)`);
        } else {
          console.log(`[Orchestrator] No visual context available for NEEDS_REASONING`);
        }
      }

      const sonnetResponse = await generateQuestionResponse(
        state.mode,
        question,
        state.recentContext,
        visualContext
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
// THINKING ACKNOWLEDGMENTS (for slow responses > 2 seconds)
// ============================================================================

/**
 * Varied phrases Redi uses when she needs time to think
 * These sound natural and human - not robotic
 */
const THINKING_PHRASES = [
  "Let me think about that.",
  "Hmm, give me a moment.",
  "Let me look carefully.",
  "One sec, thinking.",
  "Let me consider that.",
  "Hmm, good question.",
  "Let me see here.",
  "Give me a second.",
  "Thinking about that.",
  "Let me take a closer look."
];

// Track recent thinking phrases per session to avoid repetition
const recentThinkingPhrases = new Map<string, string[]>();

/**
 * Get a varied thinking phrase (avoids recent repetition)
 */
function getThinkingPhrase(sessionId: string): string {
  const recent = recentThinkingPhrases.get(sessionId) || [];

  // Filter out recently used phrases
  const available = THINKING_PHRASES.filter(p => !recent.includes(p));
  const phrases = available.length > 0 ? available : THINKING_PHRASES;

  // Pick random phrase
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];

  // Track it (keep last 5)
  recent.push(phrase);
  if (recent.length > 5) recent.shift();
  recentThinkingPhrases.set(sessionId, recent);

  return phrase;
}

// ============================================================================
// DIRECT QUESTION HANDLING
// ============================================================================

/**
 * Handle a direct question from user
 * Routes to Haiku (fast) for simple questions, Sonnet for complex ones
 *
 * @param onThinkingNeeded - Optional callback fired if response takes > 2 seconds
 *                           Allows caller to speak a "thinking" acknowledgment
 */
export async function handleDirectQuestion(
  sessionId: string,
  question: string,
  visualContext: string = '',
  onThinkingNeeded?: (phrase: string) => void
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

  // Set up thinking acknowledgment timer (fires if response takes > 2 seconds)
  let thinkingTimer: NodeJS.Timeout | null = null;
  let thinkingFired = false;

  if (onThinkingNeeded) {
    thinkingTimer = setTimeout(() => {
      thinkingFired = true;
      const phrase = getThinkingPhrase(sessionId);
      console.log(`[Orchestrator] Response taking > 2s, sending thinking: "${phrase}"`);
      onThinkingNeeded(phrase);
    }, 2000);
  }

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

    // Clear thinking timer if we got response in time
    if (thinkingTimer) {
      clearTimeout(thinkingTimer);
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
    // Clear thinking timer on error
    if (thinkingTimer) {
      clearTimeout(thinkingTimer);
    }

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
