/**
 * GPT-4o Video Analysis Service
 *
 * Uses GPT-4o's vision capabilities to analyze motion clips.
 * GPT-4o understands temporal sequences when given multiple frames,
 * providing richer movement analysis than single-frame analysis.
 */

import OpenAI from 'openai';
import { RediMode } from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface VideoAnalysisResult {
  source: 'gpt4o';
  description: string;
  movementAnalysis?: string;
  techniqueFeedback?: string;
  suggestions?: string[];
  confidence: number;
}

export interface CombinedAnalysisResult {
  gpt4o: VideoAnalysisResult | null;
  claude: {
    source: 'claude';
    description: string;
  } | null;
  combined: string;  // Synthesized feedback from both
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Analyze a motion clip using GPT-4o
 *
 * @param frames - Array of base64-encoded JPEG frames
 * @param mode - The Redi mode (sports, music, etc.)
 * @param context - Additional context about what user is doing
 * @param clipDurationMs - Duration of the clip in milliseconds
 */
export async function analyzeMotionClip(
  frames: string[],
  mode: RediMode,
  context?: string,
  clipDurationMs: number = 3000
): Promise<VideoAnalysisResult> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  if (frames.length === 0) {
    throw new Error('No frames provided for analysis');
  }

  // Build the prompt based on mode
  const systemPrompt = getSystemPrompt(mode);
  const userPrompt = buildUserPrompt(mode, frames.length, clipDurationMs, context);

  // Build the message content with all frames
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: 'text', text: userPrompt }
  ];

  // Add frames with temporal markers
  frames.forEach((frame, index) => {
    const timeMs = Math.round((index / (frames.length - 1)) * clipDurationMs);
    content.push({
      type: 'text',
      text: `[Frame ${index + 1}/${frames.length} at ${timeMs}ms]`
    });
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${frame}`,
        detail: 'high'
      }
    });
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const text = response.choices[0]?.message?.content || '';

    // Parse the response
    return parseAnalysisResponse(text);

  } catch (error) {
    console.error('[GPT-4o Video] Analysis error:', error);
    throw error;
  }
}

/**
 * Analyze with both GPT-4o and Claude, then combine insights
 */
export async function analyzeWithBothModels(
  frames: string[],
  mode: RediMode,
  context?: string,
  clipDurationMs: number = 3000,
  claudeAnalysis?: string
): Promise<CombinedAnalysisResult> {
  // Get GPT-4o analysis
  let gpt4oResult: VideoAnalysisResult | null = null;
  try {
    gpt4oResult = await analyzeMotionClip(frames, mode, context, clipDurationMs);
  } catch (error) {
    console.error('[GPT-4o Video] Failed:', error);
  }

  // Prepare Claude result if provided
  const claudeResult = claudeAnalysis ? {
    source: 'claude' as const,
    description: claudeAnalysis
  } : null;

  // Combine insights if we have both
  let combined = '';
  if (gpt4oResult && claudeResult) {
    combined = await synthesizeInsights(gpt4oResult, claudeResult, mode);
  } else if (gpt4oResult) {
    combined = gpt4oResult.description;
    if (gpt4oResult.techniqueFeedback) {
      combined += ' ' + gpt4oResult.techniqueFeedback;
    }
  } else if (claudeResult) {
    combined = claudeResult.description;
  }

  return {
    gpt4o: gpt4oResult,
    claude: claudeResult,
    combined
  };
}

/**
 * Get system prompt based on mode
 */
function getSystemPrompt(mode: RediMode): string {
  const basePrompt = `You are Redi, an AI assistant analyzing a sequence of video frames showing movement over time.
The frames are shown in chronological order with timestamps. Analyze the MOTION and CHANGES between frames, not just static poses.

Focus on:
1. Movement quality and flow
2. Technique and form
3. Timing and rhythm
4. Specific improvements that would help

Be concise but specific. Give actionable feedback.`;

  const modePrompts: Record<RediMode, string> = {
    sports: `${basePrompt}

You're analyzing athletic movement. Look for:
- Body mechanics and alignment
- Power generation and transfer
- Balance and stability
- Common form mistakes
- Timing of key moments (backswing, contact, follow-through)`,

    music: `${basePrompt}

You're analyzing musical performance. Look for:
- Hand/finger positioning and movement
- Posture and body alignment
- Rhythm and timing
- Tension vs. relaxation
- Technique efficiency`,

    assembly: `${basePrompt}

You're analyzing hands-on work. Look for:
- Tool handling technique
- Safety concerns
- Efficiency of movements
- Proper sequence of steps
- Grip and control`,

    studying: `${basePrompt}

You're analyzing study or work activity. Look for:
- Posture and ergonomics
- Focus and engagement
- Note-taking technique
- Resource organization`,

    meeting: `${basePrompt}

You're analyzing presentation or communication. Look for:
- Body language and gestures
- Eye contact and engagement
- Posture and presence
- Speaking rhythm`,

    monitoring: `${basePrompt}

You're monitoring an activity or person. Look for:
- Safety concerns
- Activity changes
- Attention and engagement
- Any issues that need addressing`
  };

  return modePrompts[mode] || basePrompt;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(
  mode: RediMode,
  frameCount: number,
  durationMs: number,
  context?: string
): string {
  let prompt = `Analyze this ${durationMs}ms movement sequence (${frameCount} frames). `;

  if (context) {
    prompt += `Context: ${context}. `;
  }

  prompt += `
Provide:
1. Brief description of the movement (1 sentence)
2. Technique analysis (what's good, what needs work)
3. One specific actionable suggestion

Keep your response concise and natural, as it will be spoken aloud.`;

  return prompt;
}

/**
 * Parse GPT-4o response into structured result
 */
function parseAnalysisResponse(text: string): VideoAnalysisResult {
  // Extract sections if structured, otherwise use full text
  const lines = text.split('\n').filter(l => l.trim());

  let description = text;
  let movementAnalysis: string | undefined;
  let techniqueFeedback: string | undefined;
  const suggestions: string[] = [];

  // Try to parse structured response
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('description') || lower.includes('movement:')) {
      description = line.replace(/^[^:]+:\s*/, '');
    } else if (lower.includes('technique') || lower.includes('analysis')) {
      movementAnalysis = line.replace(/^[^:]+:\s*/, '');
    } else if (lower.includes('suggestion') || lower.includes('improve') || lower.includes('try')) {
      const suggestion = line.replace(/^[^:]+:\s*/, '').replace(/^[-•*]\s*/, '');
      if (suggestion.length > 10) {
        suggestions.push(suggestion);
      }
    } else if (lower.includes('feedback')) {
      techniqueFeedback = line.replace(/^[^:]+:\s*/, '');
    }
  }

  // If we couldn't parse structure, use the first sentence as description
  if (description === text && text.includes('.')) {
    const firstSentence = text.split('.')[0] + '.';
    description = firstSentence;
    techniqueFeedback = text.substring(firstSentence.length).trim();
  }

  return {
    source: 'gpt4o',
    description,
    movementAnalysis,
    techniqueFeedback,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence: 0.85  // GPT-4o is generally confident
  };
}

/**
 * Synthesize insights from both models
 */
async function synthesizeInsights(
  gpt4o: VideoAnalysisResult,
  claude: { description: string },
  mode: RediMode
): Promise<string> {
  // Simple combination - take the best of both
  // GPT-4o often has better temporal understanding
  // Claude often has more nuanced language

  const combinedPrompt = `Combine these two AI analyses into one concise, spoken feedback (2-3 sentences max):

GPT-4o analysis: ${gpt4o.description} ${gpt4o.techniqueFeedback || ''}
Claude analysis: ${claude.description}

Mode: ${mode}

Synthesize the key insights, avoiding redundancy. Make it sound natural for voice output.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Use mini for synthesis to save cost
      messages: [
        { role: 'user', content: combinedPrompt }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || gpt4o.description;
  } catch (error) {
    // Fallback to GPT-4o result
    return gpt4o.description + (gpt4o.techniqueFeedback ? ' ' + gpt4o.techniqueFeedback : '');
  }
}

/**
 * Quick analysis for single frame (less detailed)
 */
export async function analyzeSnapshot(
  frameBase64: string,
  mode: RediMode,
  context?: string
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // Use mini for snapshots to save cost
    messages: [
      {
        role: 'system',
        content: `You are Redi, briefly describing what you see. Mode: ${mode}. Be concise (1-2 sentences).`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: context || 'What do you see?'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${frameBase64}`,
              detail: 'low'
            }
          }
        ]
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  });

  return response.choices[0]?.message?.content || 'Unable to analyze image.';
}
