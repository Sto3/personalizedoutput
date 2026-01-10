/**
 * Redi Vision Service
 *
 * Analyzes images and video frames using Claude Vision and GPT-4o.
 * Claude Vision for snapshots, GPT-4o for motion clips (better temporal understanding).
 * Supports both periodic snapshots and motion-triggered clip analysis.
 */

import Anthropic from '@anthropic-ai/sdk';
import { VisualAnalysis, RediMode, MODE_CONFIGS, MotionClip } from './types';
import { trackCost } from './sessionManager';
import {
  analyzeMotionClip as gpt4oAnalyzeMotionClip,
  isOpenAIConfigured,
  VideoAnalysisResult
} from './gpt4oVideoService';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Vision pricing (approximate): $0.0025 per image analysis
const COST_PER_SNAPSHOT = 0.0025;
const COST_PER_CLIP_FRAME = 0.002;

// Context buffer to maintain visual continuity
const contextBuffers = new Map<string, string[]>();
const MAX_CONTEXT_ENTRIES = 5;

/**
 * Analyze a single snapshot image
 */
export async function analyzeSnapshot(
  sessionId: string,
  imageBase64: string,
  mode: RediMode,
  recentTranscript: string = ''
): Promise<VisualAnalysis> {
  const modeConfig = MODE_CONFIGS[mode];

  const systemPrompt = `You are Redi's visual analysis system. You're helping with ${modeConfig.systemPromptFocus}.

Analyze the image and provide:
1. A brief description of what you see (1-2 sentences)
2. Any text visible in the image
3. Objects or elements relevant to the current activity
4. Any suggestions or observations that might be helpful

Be concise and focused on what's relevant to helping the user.`;

  const userPrompt = recentTranscript
    ? `The user recently said: "${recentTranscript}"\n\nAnalyze what you see:`
    : 'Analyze what you see:';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }],
      system: systemPrompt
    });

    // Track cost
    trackCost(sessionId, 'vision', COST_PER_SNAPSHOT);

    const content = response.content[0];
    const analysisText = content.type === 'text' ? content.text : '';

    const analysis: VisualAnalysis = {
      description: analysisText,
      detectedObjects: extractObjects(analysisText),
      textContent: extractText(analysisText),
      suggestions: extractSuggestions(analysisText),
      timestamp: Date.now()
    };

    // Update context buffer
    updateContextBuffer(sessionId, analysis.description);

    return analysis;

  } catch (error) {
    console.error(`[Redi Vision] Error analyzing snapshot for ${sessionId}:`, error);
    return {
      description: 'Unable to analyze image',
      detectedObjects: [],
      textContent: [],
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Analyze a motion clip (multiple frames)
 * Uses GPT-4o when available for better temporal understanding,
 * falls back to Claude Vision otherwise.
 */
export async function analyzeMotionClip(
  sessionId: string,
  clip: MotionClip,
  mode: RediMode,
  recentTranscript: string = ''
): Promise<VisualAnalysis> {
  // Try GPT-4o first for better temporal/motion understanding
  if (isOpenAIConfigured()) {
    try {
      const gpt4oResult = await analyzeWithGPT4o(sessionId, clip, mode, recentTranscript);
      if (gpt4oResult) {
        return gpt4oResult;
      }
    } catch (error) {
      console.log(`[Redi Vision] GPT-4o failed, falling back to Claude:`, error);
    }
  }

  // Fall back to Claude Vision
  return analyzeWithClaude(sessionId, clip, mode, recentTranscript);
}

/**
 * Analyze motion clip with GPT-4o (better temporal understanding)
 */
async function analyzeWithGPT4o(
  sessionId: string,
  clip: MotionClip,
  mode: RediMode,
  recentTranscript: string
): Promise<VisualAnalysis | null> {
  // Convert Buffer frames to base64 strings
  const framesBase64 = clip.frames.map(frame => frame.toString('base64'));

  // Select key frames (max 6 for GPT-4o)
  const keyFrameIndices = selectKeyFrames(framesBase64.length, 6);
  const keyFrames = keyFrameIndices.map(i => framesBase64[i]);

  try {
    const result = await gpt4oAnalyzeMotionClip(
      keyFrames,
      mode,
      recentTranscript || undefined,
      clip.duration
    );

    // Track cost (GPT-4o is slightly more expensive)
    trackCost(sessionId, 'vision', 0.003 * keyFrames.length);

    // Convert GPT-4o result to VisualAnalysis format
    const analysis: VisualAnalysis = {
      description: result.description,
      detectedObjects: [],
      textContent: [],
      suggestions: result.suggestions || [result.techniqueFeedback].filter(Boolean) as string[],
      timestamp: Date.now(),
      source: 'gpt4o'
    };

    updateContextBuffer(sessionId, analysis.description);
    console.log(`[Redi Vision] GPT-4o analysis complete for ${sessionId}`);

    return analysis;
  } catch (error) {
    console.error(`[Redi Vision] GPT-4o analysis failed for ${sessionId}:`, error);
    return null;
  }
}

/**
 * Analyze motion clip with Claude Vision (fallback)
 */
async function analyzeWithClaude(
  sessionId: string,
  clip: MotionClip,
  mode: RediMode,
  recentTranscript: string
): Promise<VisualAnalysis> {
  const modeConfig = MODE_CONFIGS[mode];

  // Select key frames (max 4 for cost efficiency)
  const keyFrameIndices = selectKeyFrames(clip.frames.length, 4);
  const keyFrames = keyFrameIndices.map(i => clip.frames[i]);

  const systemPrompt = `You are Redi's movement analysis system for ${modeConfig.systemPromptFocus}.

You're seeing ${keyFrames.length} frames from a ${clip.duration}ms movement sequence.
Analyze the movement and provide:
1. What movement/action is being performed
2. Technique observations (what's good, what could improve)
3. Specific, actionable feedback

Be encouraging but honest. Focus on ONE key improvement at a time.`;

  const imageContent = keyFrames.map((frame, i) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: frame.toString('base64')
    }
  }));

  const userPrompt = recentTranscript
    ? `Context: "${recentTranscript}"\n\nAnalyze this movement sequence:`
    : 'Analyze this movement sequence:';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: userPrompt }
        ]
      }],
      system: systemPrompt
    });

    // Track cost
    trackCost(sessionId, 'vision', COST_PER_CLIP_FRAME * keyFrames.length);

    const content = response.content[0];
    const analysisText = content.type === 'text' ? content.text : '';

    const analysis: VisualAnalysis = {
      description: analysisText,
      detectedObjects: [],
      textContent: [],
      suggestions: extractSuggestions(analysisText),
      timestamp: Date.now(),
      source: 'claude'
    };

    updateContextBuffer(sessionId, analysis.description);

    return analysis;

  } catch (error) {
    console.error(`[Redi Vision] Error analyzing motion clip for ${sessionId}:`, error);
    return {
      description: 'Unable to analyze movement',
      detectedObjects: [],
      textContent: [],
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Get accumulated visual context for a session
 */
export function getVisualContext(sessionId: string): string {
  const buffer = contextBuffers.get(sessionId) || [];
  if (buffer.length === 0) return '';

  return `Recent visual observations:\n${buffer.map((b, i) => `${i + 1}. ${b}`).join('\n')}`;
}

/**
 * Clear visual context for a session
 */
export function clearVisualContext(sessionId: string): void {
  contextBuffers.delete(sessionId);
}

/**
 * Update context buffer with new analysis
 */
function updateContextBuffer(sessionId: string, description: string): void {
  let buffer = contextBuffers.get(sessionId) || [];

  // Summarize to keep entries short
  const summary = description.split('.')[0] + '.';
  buffer.push(summary);

  // Keep only recent entries
  if (buffer.length > MAX_CONTEXT_ENTRIES) {
    buffer = buffer.slice(-MAX_CONTEXT_ENTRIES);
  }

  contextBuffers.set(sessionId, buffer);
}

/**
 * Select evenly distributed key frames from a sequence
 */
function selectKeyFrames(totalFrames: number, maxFrames: number): number[] {
  if (totalFrames <= maxFrames) {
    return Array.from({ length: totalFrames }, (_, i) => i);
  }

  const indices: number[] = [];
  const step = (totalFrames - 1) / (maxFrames - 1);

  for (let i = 0; i < maxFrames; i++) {
    indices.push(Math.round(i * step));
  }

  return indices;
}

/**
 * Extract mentioned objects from analysis text
 */
function extractObjects(text: string): string[] {
  // Simple extraction - in production, could use NER
  const objectPatterns = /(?:see|notice|showing|displays?|contains?)\s+(?:a\s+)?([a-zA-Z\s]+?)(?:\.|,|$)/gi;
  const matches: string[] = [];
  let match;

  while ((match = objectPatterns.exec(text)) !== null) {
    const obj = match[1].trim().toLowerCase();
    if (obj && obj.length < 30) {
      matches.push(obj);
    }
  }

  return [...new Set(matches)].slice(0, 5);
}

/**
 * Extract visible text from analysis
 */
function extractText(text: string): string[] {
  // Look for quoted text or explicit text mentions
  const textPatterns = /"([^"]+)"|'([^']+)'|text\s+(?:reads?|says?)\s+["']?([^"'.]+)/gi;
  const matches: string[] = [];
  let match;

  while ((match = textPatterns.exec(text)) !== null) {
    const extractedText = match[1] || match[2] || match[3];
    if (extractedText?.trim()) {
      matches.push(extractedText.trim());
    }
  }

  return matches.slice(0, 5);
}

/**
 * Extract suggestions from analysis
 */
function extractSuggestions(text: string): string[] {
  const suggestionPatterns = /(?:suggest|recommend|could|should|try|consider|might want to)\s+([^.!?]+[.!?])/gi;
  const matches: string[] = [];
  let match;

  while ((match = suggestionPatterns.exec(text)) !== null) {
    matches.push(match[1].trim());
  }

  return matches.slice(0, 3);
}

/**
 * Determine if visual context has changed significantly
 */
export function hasSignificantChange(
  sessionId: string,
  newAnalysis: VisualAnalysis
): boolean {
  const buffer = contextBuffers.get(sessionId) || [];
  if (buffer.length === 0) return true;

  const lastDescription = buffer[buffer.length - 1];

  // Simple similarity check - could use embeddings for better accuracy
  const lastWords = new Set(lastDescription.toLowerCase().split(/\s+/));
  const newWords = newAnalysis.description.toLowerCase().split(/\s+/);

  let overlap = 0;
  for (const word of newWords) {
    if (lastWords.has(word)) overlap++;
  }

  const similarity = overlap / Math.max(lastWords.size, newWords.length);
  return similarity < 0.7; // Significant change if less than 70% similar
}
