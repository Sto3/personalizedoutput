/**
 * Redi Deep Analysis Service - Claude Sonnet 4.5
 *
 * Uses Claude Sonnet 4.5 for edge cases requiring nuanced judgment.
 * Called for ~5% of interactions where GPT-Realtime needs backup.
 *
 * Use cases:
 * - Complex multi-factor situations
 * - Sensitive modes (elder care, clinical)
 * - Low confidence situations (0.4-0.7 range)
 * - Complex user questions
 *
 * Cost: ~$0.0135 per call (~2000 input + 100 output tokens)
 */

import Anthropic from '@anthropic-ai/sdk';
import { RediMode } from './types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface DeepAnalysisResult {
  shouldSpeak: boolean;
  response: string;
  confidence: number;
  reasoning: string;
  processingTimeMs: number;
}

export interface DeepAnalysisContext {
  frameBase64: string | null;
  recentTranscript: string;
  mode: RediMode;
  sessionHistory: string[];
  userQuestion?: string;
}

// Mode-specific prompts for better analysis
const MODE_CONTEXT: Record<RediMode, string> = {
  general: 'The user is doing a general activity. Observe and provide helpful context-aware assistance.',
  cooking: 'The user is cooking. Focus on technique, timing, safety, and ingredient handling.',
  studying: 'The user is studying. Focus on learning support, comprehension, and study technique.',
  meeting: 'The user is in a meeting. Be minimally intrusive, only speak if critical.',
  sports: 'The user is exercising. Focus on form, safety, pace, and encouragement.',
  music: 'The user is practicing music. Focus on technique, timing, and musical expression.',
  assembly: 'The user is building/assembling something. Focus on steps, safety, and component handling.',
  monitoring: 'The user needs monitoring (elder care, baby). Focus on safety and alerting only when necessary.',
};

/**
 * Use Claude Sonnet 4.5 for edge cases requiring nuanced judgment.
 * Only call this when:
 * - Rule engine didn't trigger
 * - GPT-Realtime response seems uncertain
 * - Complex multi-factor situation detected
 * - User asks a complex question
 * - Sensitive mode (monitoring, elder)
 */
export async function analyzeEdgeCase(context: DeepAnalysisContext): Promise<DeepAnalysisResult> {
  const startTime = Date.now();

  // Build message content
  const content: Anthropic.Messages.ContentBlockParam[] = [];

  // Add image if available
  if (context.frameBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: context.frameBase64,
      },
    });
  }

  // Add text context
  const modeContext = MODE_CONTEXT[context.mode];
  const userQuestion = context.userQuestion ? `\nUser asked: "${context.userQuestion}"` : '';

  content.push({
    type: 'text',
    text: `Mode: ${context.mode}
Context: ${modeContext}
Recent conversation:
${context.sessionHistory.slice(-5).join('\n')}
${userQuestion}

Current situation: ${context.recentTranscript}

Analyze this situation carefully. Should Redi speak? If yes, what should Redi say?

CRITICAL RULES:
- Redi speaks in brief phrases only (2-8 words maximum)
- Like a coach: direct, helpful, not chatty
- Only recommend speaking if there's something genuinely useful to say
- When uncertain, recommend silence over speaking

Respond in this exact JSON format:
{
  "shouldSpeak": boolean,
  "response": "brief phrase if shouldSpeak is true, empty string otherwise",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation of your decision"
}`,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content }],
      system: `You are Redi's deep analysis engine. You provide nuanced judgment for edge cases.

KEY PRINCIPLES:
1. Be conservative - only recommend speaking when genuinely helpful
2. Responses must be brief coach-style phrases (2-8 words), not sentences
3. When in doubt, recommend NOT speaking
4. Safety issues always warrant speaking
5. For monitoring mode, only alert for concerning situations

GOOD RESPONSES: "Elbow higher." "Good pace." "Rest 30 seconds." "Check your grip."
BAD RESPONSES: "I notice that..." "You might want to..." "That looks like..."`,
    });

    // Extract text from response
    const textBlock = response.content.find(block => block.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Deep Analysis] Failed to parse JSON from response:', text);
      return {
        shouldSpeak: false,
        response: '',
        confidence: 0,
        reasoning: 'Failed to parse analysis response',
        processingTimeMs: Date.now() - startTime,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const processingTimeMs = Date.now() - startTime;
    console.log(`[Deep Analysis] Completed in ${processingTimeMs}ms: shouldSpeak=${parsed.shouldSpeak}, confidence=${parsed.confidence}`);

    return {
      shouldSpeak: parsed.shouldSpeak ?? false,
      response: parsed.response || '',
      confidence: parsed.confidence ?? 0,
      reasoning: parsed.reasoning || '',
      processingTimeMs,
    };

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error('[Deep Analysis] Error:', error);

    return {
      shouldSpeak: false,
      response: '',
      confidence: 0,
      reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTimeMs,
    };
  }
}

/**
 * Check if deep analysis should be used for this situation
 */
export function shouldUseDeepAnalysis(
  mode: RediMode,
  confidence: number,
  hasComplexQuestion: boolean
): boolean {
  // Always use for sensitive modes
  if (mode === 'monitoring') {
    return true;
  }

  // Use for complex questions
  if (hasComplexQuestion) {
    return true;
  }

  // Use for uncertain confidence range
  if (confidence > 0.4 && confidence < 0.7) {
    return true;
  }

  return false;
}

/**
 * Estimate cost of a deep analysis call
 * ~2000 input tokens + ~100 output tokens
 * Sonnet 4.5: $3/MTok input, $15/MTok output
 * = ~$0.006 input + ~$0.0015 output = ~$0.0075 per call
 *
 * With image: ~$0.0135 per call (image adds ~700 tokens)
 */
export function estimateDeepAnalysisCost(hasImage: boolean): number {
  return hasImage ? 0.0135 : 0.0075;
}

/**
 * Format deep analysis result for logging
 */
export function formatDeepAnalysisResult(result: DeepAnalysisResult): string {
  return `[DeepAnalysis] ${result.shouldSpeak ? '✅ SPEAK' : '🤫 SILENT'}: "${result.response}" (confidence: ${(result.confidence * 100).toFixed(0)}%, ${result.processingTimeMs}ms) - ${result.reasoning}`;
}
