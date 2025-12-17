/**
 * Test Multiple Female Voices for Mom Narrator
 *
 * Goal: Find a voice that sounds like a REAL mom sharing something emotional
 * Using the same settings that made Santa sound human
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Santa's proven settings - made him sound genuinely human
const HUMAN_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true
};

// Female voices to test
const VOICES_TO_TEST = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Mature, Reassuring, Confident' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', desc: 'Playful, Bright, Warm' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', desc: 'Knowledgable, Professional' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Velvety Actress' },
];

// Test line - the emotional reaction moment
const TEST_LINE = "Okay... I have to pause it there... this is just... too good.";

// Alternative test with more emotion
const TEST_LINE_EMOTIONAL = "Oh my goodness... I wasn't ready for that. This is just... this is exactly what I wanted him to hear.";

const OUTPUT_DIR = 'outputs/social-videos/voice-tests';

async function generateVoiceTest(voiceId, voiceName, text, suffix = '') {
  const filename = `mom_test_${voiceName.toLowerCase()}${suffix}.mp3`;
  const filepath = path.join(OUTPUT_DIR, filename);

  console.log(`Testing ${voiceName}: "${text.substring(0, 40)}..."`);

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    data: {
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: HUMAN_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);
  fs.writeFileSync(filepath, audioBuffer);
  console.log(`  ✓ Saved: ${filename} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

  return filepath;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MOM VOICE TESTING - Finding the Most Human Voice');
  console.log('='.repeat(60));
  console.log('');
  console.log('Settings (same as Santa):');
  console.log(`  stability: ${HUMAN_VOICE_SETTINGS.stability}`);
  console.log(`  similarity_boost: ${HUMAN_VOICE_SETTINGS.similarity_boost}`);
  console.log(`  style: ${HUMAN_VOICE_SETTINGS.style}`);
  console.log('');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Test each voice with both lines
  console.log('--- Testing Standard Reaction Line ---');
  for (const voice of VOICES_TO_TEST) {
    await generateVoiceTest(voice.id, voice.name, TEST_LINE, '_standard');
  }

  console.log('');
  console.log('--- Testing Emotional Line ---');
  for (const voice of VOICES_TO_TEST) {
    await generateVoiceTest(voice.id, voice.name, TEST_LINE_EMOTIONAL, '_emotional');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Voice tests complete! Opening folder...');
  console.log('');
  console.log('Listen to each file and pick the most HUMAN-sounding one.');
  console.log('Look for: natural pauses, genuine emotion, not robotic.');
  console.log('='.repeat(60));

  // Open the folder
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
