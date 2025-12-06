/**
 * Test Santa Audio - Full Message (within 1000 credits)
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

async function testSantaFull() {
  console.log('SANTA AUDIO - FULL MESSAGE TEST');
  console.log('');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  // ~480 characters = ~960 credits (under 1000 limit)
  const testScript = `Ho ho ho! Hello Maya! This is Santa calling from the North Pole.

I've been watching you this year, and I am so proud of you! I heard you've been working really hard in school. That takes real dedication, and that's exactly what makes my nice list!

Keep being curious and never stop trying your best. That's the real magic of Christmas... it's in children like you who work hard and spread kindness.

Merry Christmas, Maya! Your friend, Santa.`;

  console.log('Script:');
  console.log('-'.repeat(50));
  console.log(testScript);
  console.log('-'.repeat(50));
  console.log(`Characters: ${testScript.length} (~${testScript.length * 2} credits)`);
  console.log(`Words: ${testScript.split(/\s+/).length}`);
  console.log('');
  console.log('Generating audio...');

  try {
    const startTime = Date.now();
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
    const elapsed = Date.now() - startTime;

    console.log(`✓ Audio generated in ${elapsed}ms`);
    console.log(`  Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

    // Save
    const outputDir = 'outputs/santa';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filepath = path.join(outputDir, `santa-full-${Date.now()}.mp3`);
    fs.writeFileSync(filepath, audioBuffer);

    console.log(`  Saved: ${filepath}`);
    console.log('');
    console.log('SUCCESS! Opening audio file...');

    // Try to open the file
    require('child_process').exec(`open "${filepath}"`);

  } catch (error) {
    console.log('ERROR:', error.response?.data || error.message);
  }
}

testSantaFull();
