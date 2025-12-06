const OpenAI = require('openai');
const { DALLE_MODEL, DALLE_SIZE, DALLE_QUALITY } = require('../config/constants');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Calls DALL-E with the assembled prompt.
 * Returns the image URL.
 */

async function generateImage(prompt) {
  console.log('Calling DALL-E...');
  console.log('Prompt length:', prompt.length, 'characters');

  try {
    const response = await openai.images.generate({
      model: DALLE_MODEL,
      prompt: prompt,
      size: DALLE_SIZE,
      quality: DALLE_QUALITY,
      n: 1
    });

    const imageUrl = response.data[0].url;
    console.log('Image generated successfully');
    return imageUrl;

  } catch (error) {
    console.error('DALL-E error:', error.message);
    throw error;
  }
}

module.exports = { generateImage };
