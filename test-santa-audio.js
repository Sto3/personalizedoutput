/**
 * Test Santa Audio Generation
 *
 * Quick test to verify ElevenLabs integration works end-to-end.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32
};

async function testSantaAudio() {
  console.log('='.repeat(60));
  console.log('SANTA AUDIO GENERATION TEST');
  console.log('='.repeat(60));
  console.log('');

  // Check environment
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  console.log('Environment Check:');
  console.log(`  ELEVENLABS_API_KEY: ${apiKey ? '✓ Set (' + apiKey.substring(0, 10) + '...)' : '✗ Missing'}`);
  console.log(`  ELEVENLABS_SANTA_VOICE_ID: ${voiceId ? '✓ Set (' + voiceId + ')' : '✗ Missing'}`);
  console.log('');

  if (!apiKey || !voiceId) {
    console.log('ERROR: Missing required environment variables');
    process.exit(1);
  }

  // Test script
  const testScript = `Ho ho ho! Hello there, Maya! This is Santa Claus calling all the way from the North Pole.

I've been watching you this year, and I have to tell you... I am so proud of you! I heard that you've been working really hard in school. That takes real dedication, Maya, and that's exactly what makes my nice list!

Keep being curious, keep asking questions, and never stop trying your best. That's the real magic of Christmas... it's in children like you who work hard and spread kindness.

Have a wonderful holiday, Maya. Merry Christmas!

Your friend,
Santa`;

  console.log('Test Script:');
  console.log('-'.repeat(40));
  console.log(testScript);
  console.log('-'.repeat(40));
  console.log(`Word count: ${testScript.split(/\s+/).length}`);
  console.log(`Character count: ${testScript.length}`);
  console.log('');

  console.log('Voice Settings:');
  console.log(`  stability: ${SANTA_VOICE_SETTINGS.stability}`);
  console.log(`  similarity_boost: ${SANTA_VOICE_SETTINGS.similarity_boost}`);
  console.log(`  style: ${SANTA_VOICE_SETTINGS.style}`);
  console.log('');

  console.log('Generating audio...');
  const startTime = Date.now();

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
    const elapsed = Date.now() - startTime;

    console.log(`✓ Audio generated in ${elapsed}ms`);
    console.log(`  Size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

    // Save to file
    const outputDir = 'outputs/santa';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `santa-test-${Date.now()}.mp3`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, audioBuffer);

    console.log(`  Saved: ${filepath}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! Santa audio generation is working.');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Open the file to listen: ${filepath}`);

  } catch (error) {
    console.log('');
    console.log('ERROR generating audio:');
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data: ${error.response.data}`);
    } else {
      console.log(`  ${error.message}`);
    }
    process.exit(1);
  }
}

testSantaAudio().catch(console.error);
