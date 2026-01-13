/**
 * Redi Haiku Triage - LAYER 2
 *
 * Fast AI decision layer using Claude Haiku (~300ms).
 * Handles 90% of responses - simple observations, quick corrections,
 * acknowledgments.
 *
 * Only passes to Sonnet (Layer 3) when:
 * - User asked a complex question
 * - Situation requires nuanced analysis
 * - Multi-step reasoning needed
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  PerceptionPacket,
  TriageInput,
  TriageOutput,
  TriageDecision,
  RuleEngineResult
} from './militaryGradeTypes';
import { RediMode, MODE_CONFIGS } from './types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Haiku model for fast responses
const HAIKU_MODEL = 'claude-3-5-haiku-20241022';

// Track performance
interface TriageMetrics {
  totalCalls: number;
  silentDecisions: number;
  quickResponses: number;
  needsReasoning: number;
  avgLatencyMs: number;
}

const metricsPerSession = new Map<string, TriageMetrics>();

/**
 * Initialize triage for a session
 */
export function initTriage(sessionId: string): void {
  metricsPerSession.set(sessionId, {
    totalCalls: 0,
    silentDecisions: 0,
    quickResponses: 0,
    needsReasoning: 0,
    avgLatencyMs: 0
  });
}

/**
 * Clean up triage for a session
 */
export function cleanupTriage(sessionId: string): void {
  const metrics = metricsPerSession.get(sessionId);
  if (metrics) {
    console.log(`[Haiku Triage] Session ${sessionId} metrics:`, {
      totalCalls: metrics.totalCalls,
      silentDecisions: metrics.silentDecisions,
      quickResponses: metrics.quickResponses,
      needsReasoning: metrics.needsReasoning,
      avgLatencyMs: Math.round(metrics.avgLatencyMs)
    });
  }
  metricsPerSession.delete(sessionId);
}

/**
 * Main triage function - decide what to do with this perception
 */
export async function triage(input: TriageInput): Promise<TriageOutput> {
  const startTime = Date.now();

  // If rule engine already handled it, stay silent
  if (input.ruleEngineResult.triggered) {
    return {
      decision: 'SILENT',
      confidence: 1.0,
      processingTimeMs: Date.now() - startTime
    };
  }

  // Check if we should stay silent (timing, context)
  const silenceCheck = checkSilenceConditions(input);
  if (silenceCheck.shouldBeSilent) {
    updateMetrics(input.packet.sessionId, 'SILENT', Date.now() - startTime);
    return {
      decision: 'SILENT',
      confidence: silenceCheck.confidence,
      processingTimeMs: Date.now() - startTime
    };
  }

  // Check if this needs deep reasoning
  const complexityCheck = assessComplexity(input);
  if (complexityCheck.needsReasoning) {
    updateMetrics(input.packet.sessionId, 'NEEDS_REASONING', Date.now() - startTime);
    return {
      decision: 'NEEDS_REASONING',
      reasoningPrompt: complexityCheck.reasoningPrompt,
      confidence: complexityCheck.confidence,
      processingTimeMs: Date.now() - startTime
    };
  }

  // Call Haiku for quick response
  try {
    const response = await generateQuickResponse(input);

    if (!response) {
      updateMetrics(input.packet.sessionId, 'SILENT', Date.now() - startTime);
      return {
        decision: 'SILENT',
        confidence: 0.8,
        processingTimeMs: Date.now() - startTime
      };
    }

    updateMetrics(input.packet.sessionId, 'QUICK_RESPONSE', Date.now() - startTime);
    return {
      decision: 'QUICK_RESPONSE',
      response,
      confidence: 0.85,
      processingTimeMs: Date.now() - startTime
    };

  } catch (error) {
    console.error('[Haiku Triage] Error:', error);
    updateMetrics(input.packet.sessionId, 'SILENT', Date.now() - startTime);
    return {
      decision: 'SILENT',
      confidence: 0.5,
      processingTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Check if we should stay silent based on timing and context
 */
function checkSilenceConditions(input: TriageInput): {
  shouldBeSilent: boolean;
  confidence: number;
  reason?: string;
} {
  // Haven't spoken in a while AND nothing happening = stay silent
  const minGap = mapSensitivityToGap(input.sensitivity);

  if (input.timeSinceLastSpoke < minGap) {
    return {
      shouldBeSilent: true,
      confidence: 0.9,
      reason: 'too_soon'
    };
  }

  // No meaningful context to respond to
  const hasTranscript = input.packet.transcript && input.packet.transcript.trim().length > 0;
  const hasPose = input.packet.pose && input.packet.pose.confidence > 0.5;
  const hasObjects = input.packet.objects.length > 0;

  if (!hasTranscript && !hasPose && !hasObjects) {
    return {
      shouldBeSilent: true,
      confidence: 0.8,
      reason: 'no_context'
    };
  }

  return {
    shouldBeSilent: false,
    confidence: 0
  };
}

/**
 * Assess if the situation needs deep reasoning (Sonnet)
 */
function assessComplexity(input: TriageInput): {
  needsReasoning: boolean;
  reasoningPrompt?: string;
  confidence: number;
} {
  const transcript = input.packet.transcript || '';

  // Check for complex question patterns
  const complexPatterns = [
    /why\s+(is|are|do|does|did|should|would|can|could)/i,
    /how\s+(does|do|can|should|would)\s+.+\s+work/i,
    /explain\s+(how|why|what)/i,
    /what('s| is)\s+the\s+(difference|best|right|correct)/i,
    /compare|versus|vs\.|better\s+than/i,
    /should\s+i\s+.+\s+or\s+/i,
    /help\s+me\s+understand/i
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(transcript)) {
      return {
        needsReasoning: true,
        reasoningPrompt: `User asked complex question: "${transcript}"`,
        confidence: 0.9
      };
    }
  }

  // Check for multi-part questions
  const questionMarks = (transcript.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    return {
      needsReasoning: true,
      reasoningPrompt: `User asked multiple questions: "${transcript}"`,
      confidence: 0.85
    };
  }

  // Long questions often need more thought
  const wordCount = transcript.split(/\s+/).length;
  if (wordCount > 20 && transcript.includes('?')) {
    return {
      needsReasoning: true,
      reasoningPrompt: `Long/detailed question: "${transcript}"`,
      confidence: 0.75
    };
  }

  return {
    needsReasoning: false,
    confidence: 0.8
  };
}

/**
 * Generate quick response using Haiku
 */
async function generateQuickResponse(input: TriageInput): Promise<string | null> {
  const modeConfig = MODE_CONFIGS[input.mode];

  // Build compact context
  const context = buildCompactContext(input);

  const systemPrompt = `You are Redi, a real-time AI assistant. Respond in 2-8 words MAX.

RULES:
- Be brief like a coach: "Good form" "Watch your back" "Nice"
- NO questions - statements only
- NO "I see" "I notice" - just say it
- If nothing worth saying: respond with SILENT

Mode: ${input.mode} (${modeConfig.systemPromptFocus})`;

  const userPrompt = context;

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 50,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const text = content.text.trim();

    // Check for SILENT response
    if (text === 'SILENT' || text.includes('SILENT')) {
      return null;
    }

    // Validate response
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 8) {
      console.log(`[Haiku Triage] Response too long (${wordCount} words), rejecting`);
      return null;
    }

    if (text.includes('?')) {
      console.log('[Haiku Triage] Response contains question, rejecting');
      return null;
    }

    return text;

  } catch (error) {
    console.error('[Haiku Triage] API error:', error);
    return null;
  }
}

/**
 * Build compact context string for Haiku
 */
function buildCompactContext(input: TriageInput): string {
  const parts: string[] = [];

  // Transcript
  if (input.packet.transcript) {
    parts.push(`User: "${input.packet.transcript}"`);
  }

  // Pose summary
  if (input.packet.pose && input.packet.pose.confidence > 0.5) {
    const pose = input.packet.pose;
    const poseParts: string[] = [];

    if (pose.angles.spineAngle !== undefined) {
      poseParts.push(`spine ${Math.round(pose.angles.spineAngle)}°`);
    }
    if (pose.angles.leftKnee !== undefined) {
      poseParts.push(`knee ${Math.round(pose.angles.leftKnee)}°`);
    }

    if (poseParts.length > 0) {
      parts.push(`Pose: ${poseParts.join(', ')}`);
    }
  }

  // Movement
  if (input.packet.movement) {
    const m = input.packet.movement;
    if (m.phase !== 'rest' && m.phase !== 'unknown') {
      let movePart = `Movement: ${m.phase}`;
      if (m.repCount) movePart += ` (rep ${m.repCount})`;
      parts.push(movePart);
    }
  }

  // Objects (top 3)
  if (input.packet.objects.length > 0) {
    const topObjects = input.packet.objects
      .filter(o => o.confidence > 0.7)
      .slice(0, 3)
      .map(o => o.label);

    if (topObjects.length > 0) {
      parts.push(`Objects: ${topObjects.join(', ')}`);
    }
  }

  // Recent context
  if (input.recentContext.length > 0) {
    parts.push(`Recent: ${input.recentContext.slice(-2).join(' | ')}`);
  }

  return parts.join('\n') || '(No context)';
}

/**
 * Map sensitivity to minimum gap between responses
 */
function mapSensitivityToGap(sensitivity: number): number {
  // sensitivity 0 (passive) = 20 seconds
  // sensitivity 1 (active) = 5 seconds
  return Math.round(20000 - (sensitivity * 15000));
}

/**
 * Update metrics
 */
function updateMetrics(sessionId: string, decision: TriageDecision, latencyMs: number): void {
  const metrics = metricsPerSession.get(sessionId);
  if (!metrics) return;

  metrics.totalCalls++;

  switch (decision) {
    case 'SILENT':
      metrics.silentDecisions++;
      break;
    case 'QUICK_RESPONSE':
      metrics.quickResponses++;
      break;
    case 'NEEDS_REASONING':
      metrics.needsReasoning++;
      break;
  }

  // Running average of latency
  metrics.avgLatencyMs = (metrics.avgLatencyMs * (metrics.totalCalls - 1) + latencyMs) / metrics.totalCalls;
}

/**
 * Get metrics for a session
 */
export function getTriageMetrics(sessionId: string): TriageMetrics | undefined {
  return metricsPerSession.get(sessionId);
}

export default {
  initTriage,
  cleanupTriage,
  triage,
  getTriageMetrics
};
