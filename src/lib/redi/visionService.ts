/**
 * Redi Vision Service - MAXIMUM RESILIENCE
 *
 * Analyzes images and video frames using Claude Vision.
 * Optimized for real-world conditions: motion, blur, varying lighting.
 *
 * KEY PRINCIPLES:
 * 1. NEVER complain about image quality - work with what you have
 * 2. Focus on what IS visible, not what isn't
 * 3. Provide useful insights even from imperfect images
 * 4. Be resilient to motion blur and camera shake
 */

import Anthropic from '@anthropic-ai/sdk';
import { VisualAnalysis, RediMode, MODE_CONFIGS, MotionClip } from './types';
import { trackCost } from './sessionManager';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Vision pricing (Sonnet is more expensive but MUCH more accurate)
// Haiku was hallucinating objects (saying "Crest toothpaste" when it's Q-tips)
const COST_PER_SNAPSHOT = 0.01;  // Sonnet pricing
const COST_PER_CLIP_FRAME = 0.008;

// Context buffer to maintain visual continuity
const contextBuffers = new Map<string, string[]>();
const MAX_CONTEXT_ENTRIES = 5;

/**
 * CRITICAL: System prompt that ensures resilience AND accuracy
 *
 * Key improvements:
 * 1. IGNORE APP UI - Only describe the real-world scene, not buttons/overlays
 * 2. Grounded analysis - When iOS detections provided, use them as ground truth
 */
const RESILIENT_VISION_PROMPT = `You are Redi's visual analysis system. You MUST follow these rules:

CRITICAL - IGNORE APP UI:
You are analyzing what the CAMERA is pointed at, NOT the app interface.
COMPLETELY IGNORE:
- Any UI elements (buttons, sliders, timestamps, status indicators)
- Error messages or app states
- Anything that looks like an app overlay or interface element
- Recording indicators, zoom controls, camera settings

ONLY DESCRIBE:
- The PHYSICAL SCENE the camera is capturing
- Real-world objects, people, environments
- What would be visible if this were a photo with no UI

If you cannot see a real scene (camera blocked, too dark), say "Can't see the scene clearly" - NEVER describe UI elements.

ACCURACY RULES:
1. NEVER say the image is "blurry", "unclear", or mention quality issues
2. ONLY identify objects you are 90%+ confident about
3. For uncertain objects, use generic terms: "container", "box", "object" - NOT specific guesses
4. NEVER guess at labels, text, or brand names you can't read clearly
5. Be brief and accurate rather than detailed and wrong

CONFIDENCE GUIDELINE:
- High certainty (90%+): State directly - "a laptop", "a mug"
- Medium certainty: Use hedging - "what looks like", "appears to be"
- Low certainty: Use generic - "some object", "something on the desk"
- Can't identify: Skip it entirely - don't mention it

GOOD: "I see a laptop and what looks like a coffee cup"
BAD: "I see a MacBook Pro 16-inch, a Yeti tumbler" (too specific/guessing brands)
BAD: "The image is blurry so I can't tell" (complaining about quality)
BAD: "I see an End button and a recording timer" (describing UI, not scene)

Be helpful but accurate. If unsure, be vague rather than wrong.`;

/**
 * iOS detection hints for grounding cloud vision
 * When provided, the cloud model should ONLY describe objects iOS confirmed exist
 */
interface iOSDetectionHints {
  objects?: string[];      // Objects detected by iOS Core ML
  texts?: string[];        // Text detected by iOS Vision OCR
  poseDetected?: boolean;  // Whether a human pose was detected
}

/**
 * Analyze a single snapshot image with maximum resilience
 */
export async function analyzeSnapshot(
  sessionId: string,
  imageBase64: string,
  mode: RediMode,
  recentTranscript: string = ''
): Promise<VisualAnalysis> {
  const modeConfig = MODE_CONFIGS[mode];

  const modeSpecificPrompt = `
You're helping with: ${modeConfig.systemPromptFocus}

Analyze this image and provide:
1. A brief, confident description of what you see (1-2 sentences)
2. Any text visible in the image (read it if possible)
3. Objects or elements relevant to ${mode} activities
4. One helpful observation or suggestion if appropriate

Be concise, confident, and focused on being helpful.`;

  const userPrompt = recentTranscript
    ? `Context from conversation: "${recentTranscript}"\n\nDescribe what you see:`
    : 'Describe what you see:';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Accurate vision (Haiku was hallucinating)
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
      system: RESILIENT_VISION_PROMPT + modeSpecificPrompt
    });

    // Track cost
    trackCost(sessionId, 'vision', COST_PER_SNAPSHOT);

    const content = response.content[0];
    let analysisText = content.type === 'text' ? content.text : '';

    // Post-process to remove any quality complaints that slipped through
    analysisText = sanitizeVisionResponse(analysisText);

    const analysis: VisualAnalysis = {
      description: analysisText,
      detectedObjects: extractObjects(analysisText),
      textContent: extractText(analysisText),
      suggestions: extractSuggestions(analysisText),
      timestamp: Date.now()
    };

    // Update context buffer
    updateContextBuffer(sessionId, analysis.description);

    console.log(`[Redi Vision] Snapshot analyzed for ${sessionId}: ${analysisText.substring(0, 100)}...`);

    return analysis;

  } catch (error) {
    console.error(`[Redi Vision] Error analyzing snapshot for ${sessionId}:`, error);
    // Return a helpful fallback instead of an error message
    return {
      description: 'Observing your environment',
      detectedObjects: [],
      textContent: [],
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Analyze snapshot WITH iOS detection grounding
 *
 * This is the preferred method - iOS detections serve as GROUND TRUTH
 * to prevent hallucination. The cloud model can only describe objects
 * that iOS has confirmed exist.
 */
export async function analyzeSnapshotWithGrounding(
  sessionId: string,
  imageBase64: string,
  mode: RediMode,
  iosHints: iOSDetectionHints,
  recentTranscript: string = ''
): Promise<VisualAnalysis> {
  const modeConfig = MODE_CONFIGS[mode];

  // Build grounding context from iOS detections
  const groundingContext = buildGroundingContext(iosHints);

  const groundedPrompt = groundingContext
    ? `
GROUNDING FROM ON-DEVICE DETECTION:
${groundingContext}

Based on the image and these CONFIRMED detections from on-device ML:
- Describe what you see, prioritizing the confirmed objects
- You may add details about confirmed objects (color, position, state)
- Only mention NEW objects if you are 95%+ confident they exist
- Do NOT invent objects that aren't in the confirmed list unless absolutely certain

You're helping with: ${modeConfig.systemPromptFocus}
`
    : `
You're helping with: ${modeConfig.systemPromptFocus}

Analyze this image and provide:
1. A brief, confident description of what you see (1-2 sentences)
2. Any text visible in the image (read it if possible)
3. Objects or elements relevant to ${mode} activities
`;

  const userPrompt = recentTranscript
    ? `Context from conversation: "${recentTranscript}"\n\nDescribe what you see:`
    : 'Describe what you see:';

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
      system: RESILIENT_VISION_PROMPT + groundedPrompt
    });

    trackCost(sessionId, 'vision', COST_PER_SNAPSHOT);

    const content = response.content[0];
    let analysisText = content.type === 'text' ? content.text : '';

    // Sanitize and validate against iOS detections
    analysisText = sanitizeVisionResponse(analysisText);

    // If we have iOS hints, validate the response doesn't hallucinate
    if (iosHints.objects && iosHints.objects.length > 0) {
      analysisText = validateAgainstGroundTruth(analysisText, iosHints);
    }

    const analysis: VisualAnalysis = {
      description: analysisText,
      detectedObjects: extractObjects(analysisText),
      textContent: extractText(analysisText),
      suggestions: extractSuggestions(analysisText),
      timestamp: Date.now()
    };

    updateContextBuffer(sessionId, analysis.description);

    console.log(`[Redi Vision] Grounded analysis for ${sessionId}: ${analysisText.substring(0, 100)}...`);

    return analysis;

  } catch (error) {
    console.error(`[Redi Vision] Error in grounded analysis for ${sessionId}:`, error);
    return {
      description: 'Observing your environment',
      detectedObjects: iosHints.objects || [],
      textContent: iosHints.texts || [],
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Build grounding context from iOS detections
 */
function buildGroundingContext(hints: iOSDetectionHints): string {
  const parts: string[] = [];

  if (hints.objects && hints.objects.length > 0) {
    parts.push(`Objects detected by on-device ML: ${hints.objects.join(', ')}`);
  }

  if (hints.texts && hints.texts.length > 0) {
    parts.push(`Text detected by on-device OCR: "${hints.texts.join('", "')}"`);
  }

  if (hints.poseDetected) {
    parts.push('A person/human pose was detected in the frame');
  }

  return parts.join('\n');
}

/**
 * Validate cloud response against iOS ground truth
 * Removes or flags potential hallucinations
 */
function validateAgainstGroundTruth(response: string, hints: iOSDetectionHints): string {
  // For now, just log potential discrepancies
  // In future, could actually filter out hallucinated objects
  const iosObjects = hints.objects || [];

  if (iosObjects.length === 0) {
    return response;
  }

  // Check for brand name hallucinations (common failure mode)
  const suspiciousBrands = [
    'crest', 'oral-b', 'colgate', 'microsoft', 'apple', 'samsung',
    'nike', 'adidas', 'coca-cola', 'pepsi', 'starbucks'
  ];

  const lowerResponse = response.toLowerCase();
  for (const brand of suspiciousBrands) {
    if (lowerResponse.includes(brand)) {
      // Check if iOS detected something that could be this brand
      const couldBeBrand = iosObjects.some(obj =>
        obj.toLowerCase().includes('box') ||
        obj.toLowerCase().includes('bottle') ||
        obj.toLowerCase().includes('container') ||
        obj.toLowerCase().includes('package')
      );

      if (!couldBeBrand) {
        console.warn(`[Redi Vision] Potential hallucination: mentioned "${brand}" but iOS didn't detect relevant container`);
        // Remove the brand mention and use generic term
        const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
        response = response.replace(brandRegex, 'a');
      }
    }
  }

  return response;
}

/**
 * Analyze a motion clip (multiple frames) with resilience
 */
export async function analyzeMotionClip(
  sessionId: string,
  clip: MotionClip,
  mode: RediMode,
  recentTranscript: string = ''
): Promise<VisualAnalysis> {
  const modeConfig = MODE_CONFIGS[mode];

  // Select key frames (max 4 for cost efficiency)
  const keyFrameIndices = selectKeyFrames(clip.frames.length, 4);
  const keyFrames = keyFrameIndices.map(i => clip.frames[i]);

  const systemPrompt = `${RESILIENT_VISION_PROMPT}

You're analyzing ${keyFrames.length} frames from a ${clip.duration}ms movement sequence for ${modeConfig.systemPromptFocus}.

Provide:
1. What movement/action is being performed (be confident even with motion blur)
2. One technique observation - what looks good
3. One specific, actionable suggestion for improvement

Be encouraging and helpful. Focus on what you CAN observe about the movement.`;

  const imageContent = keyFrames.map((frame, i) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: frame.toString('base64')
    }
  }));

  const userPrompt = recentTranscript
    ? `Context: "${recentTranscript}"\n\nAnalyze this movement:`
    : 'Analyze this movement:';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Accurate vision (Haiku was hallucinating)
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
    let analysisText = content.type === 'text' ? content.text : '';

    // Sanitize any quality complaints
    analysisText = sanitizeVisionResponse(analysisText);

    const analysis: VisualAnalysis = {
      description: analysisText,
      detectedObjects: [],
      textContent: [],
      suggestions: extractSuggestions(analysisText),
      timestamp: Date.now()
    };

    updateContextBuffer(sessionId, analysis.description);

    return analysis;

  } catch (error) {
    console.error(`[Redi Vision] Error analyzing motion clip for ${sessionId}:`, error);
    return {
      description: 'Observing your movement',
      detectedObjects: [],
      textContent: [],
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Sanitize vision response to remove quality complaints
 */
function sanitizeVisionResponse(text: string): string {
  // Remove common quality complaint phrases
  const complaintsToRemove = [
    /the image (?:is|appears?|seems?) (?:quite |very |a bit |somewhat )?(?:blurry|unclear|dark|bright|out of focus|motion[- ]blurred)/gi,
    /(?:it'?s?|image is) (?:hard|difficult) to (?:see|tell|make out|distinguish)/gi,
    /(?:I )?can'?t (?:quite |clearly )?(?:see|tell|make out|distinguish)/gi,
    /(?:due to|because of) (?:the )?(?:blur|motion|quality|lighting)/gi,
    /the (?:camera|image) (?:was )?(?:moving|shaking)/gi,
    /(?:unfortunately|I'?m afraid|I apologize),? (?:the image|I can'?t)/gi,
    /if you (?:could )?hold (?:the camera )?(?:steady|still)/gi,
  ];

  let sanitized = text;
  for (const pattern of complaintsToRemove) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Clean up any resulting awkward punctuation or spacing
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*\./g, '.')
    .trim();

  // If we removed too much, provide a generic response
  if (sanitized.length < 20) {
    return 'I can see your environment. Let me know if you need help with anything specific.';
  }

  return sanitized;
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

  // Simple similarity check
  const lastWords = new Set(lastDescription.toLowerCase().split(/\s+/));
  const newWords = newAnalysis.description.toLowerCase().split(/\s+/);

  let overlap = 0;
  for (const word of newWords) {
    if (lastWords.has(word)) overlap++;
  }

  const similarity = overlap / Math.max(lastWords.size, newWords.length);
  return similarity < 0.7;
}
