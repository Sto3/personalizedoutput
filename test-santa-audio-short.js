/**
 * Test Santa Audio - Short Version
 * Uses minimal text to stay within quota
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32
};

async function testSantaAudioShort() {
  console.log('SANTA AUDIO TEST (Short Version)');
  console.log('');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  // Very short test - only ~200 characters to stay well under 500 credit limit
  const testScript = `Ho ho ho! Hello Maya! This is Santa. I'm so proud of you for working hard in school. Keep being amazing! Merry Christmas!`;

  console.log(`Script: "${testScript}"`);
  console.log(`Characters: ${testScript.length} (should need ~${testScript.length * 2} credits)`);
  console.log('');
  console.log('Generating audio...');

  try {
    const response = await axios({
      method: 'POST',
      url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      data: {
        text: testScript,
        model_id: 'eleven_monolingual_v1',
        voice_settings: SANTA_VOICE_SETTINGS
      },
      responseType: 'arraybuffer'
    });

    const audioBuffer = Buffer.from(response.data);
    console.log(`✓ Audio generated! Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

    // Save
    const outputDir = 'outputs/santa';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filepath = path.join(outputDir, `santa-test-short-${Date.now()}.mp3`);
    fs.writeFileSync(filepath, audioBuffer);

    console.log(`✓ Saved: ${filepath}`);
    console.log('');
    console.log('SUCCESS! Open the file to hear Santa.');

  } catch (error) {
    console.log('ERROR:', error.response?.data || error.message);
  }
}

testSantaAudioShort();
