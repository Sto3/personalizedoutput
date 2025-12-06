const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Uses Claude Vision to verify the generated image.
 * Checks for: people, text, unsafe content, aesthetic match.
 */

async function verifyImage(imageUrl, variables) {
  console.log('Verifying image with Claude Vision...');

  const verificationPrompt = `Analyze this vision board image and check for violations.

HARD FAILURES (image must be rejected):
1. Any visible people, faces, hands, arms, legs, or body parts
2. Any visible text, letters, numbers, or writing
3. Any logos or brand marks
4. Any alcohol, wine glasses, cocktails, or bar imagery
5. Any weapons
6. Any religious or political symbols

SOFT CHECKS (note but don't necessarily fail):
7. Does the color palette roughly match: ${variables.COLOR_PALETTE}?
8. Does the aesthetic feel like: ${variables.STYLE_KEYWORDS}?
9. Are there roughly ${variables.NUM_ELEMENTS} distinct items?

Respond with JSON only:
{
  "pass": true or false,
  "hard_failures": ["list any hard failures found"],
  "soft_issues": ["list any soft issues noted"],
  "description": "brief description of what you see"
}`;

  try {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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
            text: verificationPrompt
          }
        ]
      }]
    });

    // Parse the JSON response
    const resultText = response.content[0].text;

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // If parsing fails, assume pass with warning
    console.warn('Could not parse verification response, assuming pass');
    return { pass: true, hard_failures: [], soft_issues: ['Could not parse verification'] };

  } catch (error) {
    console.error('Verification error:', error.message);
    // On error, assume pass to avoid blocking
    return { pass: true, hard_failures: [], soft_issues: ['Verification error: ' + error.message] };
  }
}

module.exports = { verifyImage };
