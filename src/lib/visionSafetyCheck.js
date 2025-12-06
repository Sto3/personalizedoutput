/**
 * Claude Vision Safety Check
 *
 * Uses Claude Vision to verify generated images meet safety requirements.
 *
 * MVP POLICY:
 * - STRICT on people/faces/hands/unsafe content (HARD FAIL)
 * - LENIENT on micro-text/generic logos (acceptable - will be softened in post-processing)
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SAFETY_PROMPT = `You are an image safety inspector for a commercial vision board product.

Your job is to check ONLY for serious safety violations.

HARD FAILURES - Reject the image if ANY of these are present:
- Any visible people, faces, or partial faces
- Any hands, arms, legs, or body parts
- Any silhouettes of humans
- Any reflections showing people
- Nudity, sexual, or adult content
- Violence, weapons, self-harm imagery
- Explicit drug imagery (syringes, pills, etc.)
- Big, clear, profane text (swear words, slurs)
- Extremely obvious branded logos (perfect Nike swoosh, Apple logo, etc.)

DO NOT FAIL the image for these acceptable elements:
- Tiny label text on products
- Generic or blurry logos
- Small unreadable marks
- Book spines with abstract shapes
- Cosmetic bottles with tiny generic text
- Light decorative elements
- Numbers on clocks or calculators
- Any text that is not profane or offensive
- Brand-like shapes that are not clearly recognizable

The goal is to catch SERIOUS violations only. Minor text and generic marks are expected and acceptable.

If the image contains people, faces, hands, body parts, adult content, violence, or explicit material, respond:
FAIL: <brief reason>

If the image has none of those serious violations, respond:
PASS`;

/**
 * Check image safety using Claude Vision
 * Only fails for people/unsafe content, NOT for minor text or generic logos
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<{pass: boolean, reason: string}>}
 */
async function checkImageSafety(base64Image) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: SAFETY_PROMPT
          }
        ]
      }]
    });

    const resultText = response.content[0].text.trim();

    if (resultText.startsWith('PASS')) {
      return { pass: true, reason: 'No serious safety violations detected' };
    } else if (resultText.startsWith('FAIL:')) {
      const reason = resultText.substring(5).trim();
      return { pass: false, reason: reason };
    } else {
      // Unexpected response - check if it mentions people/serious issues
      const lowerResult = resultText.toLowerCase();
      if (lowerResult.includes('people') || lowerResult.includes('face') ||
          lowerResult.includes('hand') || lowerResult.includes('person') ||
          lowerResult.includes('human') || lowerResult.includes('body') ||
          lowerResult.includes('nude') || lowerResult.includes('violence') ||
          lowerResult.includes('weapon')) {
        return { pass: false, reason: 'Safety issue detected: ' + resultText.substring(0, 100) };
      }
      // If no mention of serious issues, assume pass
      console.log('Safety check response (assuming pass):', resultText);
      return { pass: true, reason: 'No serious violations detected' };
    }

  } catch (error) {
    console.error('Vision safety check error:', error.message);
    // On error, fail safe
    return { pass: false, reason: 'Safety check error: ' + error.message };
  }
}

/**
 * Fetch image from URL and convert to base64
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string>} - Base64 encoded image data
 */
async function imageUrlToBase64(imageUrl) {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

module.exports = { checkImageSafety, imageUrlToBase64 };
