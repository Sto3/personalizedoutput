/**
 * Ideogram API Client
 *
 * Uses Ideogram 2.0 for image generation.
 * API docs: https://docs.ideogram.ai/
 */

const API_URL = 'https://api.ideogram.ai/generate';

/**
 * Generate an image using Ideogram API
 * @param {string} prompt - The image generation prompt
 * @param {object} options - Optional configuration
 * @returns {Promise<string>} - URL of the generated image
 */
async function generateImage(prompt, options = {}) {
  const {
    model = 'V_2',  // Ideogram 2.0
    aspectRatio = 'ASPECT_9_16',  // Portrait for vision boards (closest to 1024x1792)
    magicPromptOption = 'AUTO',  // Let Ideogram enhance the prompt
    negativePrompt = null  // Optional negative prompt
  } = options;

  const apiKey = process.env.IDEOGRAM_API_KEY;

  if (!apiKey) {
    throw new Error('IDEOGRAM_API_KEY not found in environment variables');
  }

  console.log('Calling Ideogram...');
  console.log('Prompt length:', prompt.length, 'characters');

  // Build the image request
  const imageRequest = {
    prompt: prompt,
    model: model,
    aspect_ratio: aspectRatio,
    magic_prompt_option: magicPromptOption
  };

  // Add negative prompt if provided
  if (negativePrompt) {
    imageRequest.negative_prompt = negativePrompt;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image_request: imageRequest
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ideogram API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error('No images returned from Ideogram API');
  }

  const imageUrl = data.data[0].url;
  console.log('Image generated successfully');

  return imageUrl;
}

module.exports = { generateImage };
