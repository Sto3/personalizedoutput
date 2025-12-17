/**
 * Find the Most Human-Sounding Mom Voice
 *
 * Experiments with different voice + settings combinations
 * to achieve the same human quality we got with Santa.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const OUTPUT_DIR = 'outputs/social-videos/voice-experiments';

// Voices to test
const VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'sarah' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'jessica' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'lily' },
];

// Settings combinations to test
// Santa's settings: stability 0.68, similarity 0.82, style 0.32
const SETTINGS_COMBOS = [
  // Original Santa settings
  { stability: 0.68, similarity_boost: 0.82, style: 0.32, name: 'santa_original' },

  // More expressive (higher style)
  { stability: 0.68, similarity_boost: 0.82, style: 0.45, name: 'more_expressive' },
  { stability: 0.68, similarity_boost: 0.82, style: 0.55, name: 'very_expressive' },

  // More natural variation (lower stability)
  { stability: 0.55, similarity_boost: 0.82, style: 0.40, name: 'natural_variation' },
  { stability: 0.50, similarity_boost: 0.82, style: 0.45, name: 'very_natural' },

  // Balanced human feel
  { stability: 0.60, similarity_boost: 0.80, style: 0.42, name: 'balanced_human' },
];

// Test line - emotional reaction
const TEST_LINE = "Oh my goodness... I have to pause it there... this is just... too good.";

async function generateVoice(voiceId, voiceName, settings, settingsName) {
  const filename = `${voiceName}_${settingsName}.mp3`;
  const filepath = path.join(OUTPUT_DIR, filename);

  console.log(`  Testing ${voiceName} + ${settingsName}...`);
  console.log(`    stability: ${settings.stability}, style: ${settings.style}`);

  try {
    const response = await axios({
      method: 'POST',
      url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      data: {
        text: TEST_LINE,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity_boost,
          style: settings.style,
          use_speaker_boost: true
        }
      },
      responseType: 'arraybuffer'
    });

    const audioBuffer = Buffer.from(response.data);
    fs.writeFileSync(filepath, audioBuffer);
    console.log(`    ✓ Saved: ${filename}`);
    return true;
  } catch (error) {
    console.log(`    ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('FINDING THE MOST HUMAN-SOUNDING MOM VOICE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Testing multiple voice + settings combinations...');
  console.log(`Test line: "${TEST_LINE}"`);
  console.log('');

  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  const total = VOICES.length * SETTINGS_COMBOS.length;

  for (const voice of VOICES) {
    console.log(`\n--- ${voice.name.toUpperCase()} ---`);

    for (const settings of SETTINGS_COMBOS) {
      count++;
      process.stdout.write(`[${count}/${total}] `);
      await generateVoice(voice.id, voice.name, settings, settings.name);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('VOICE EXPERIMENTS COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Files generated:');
  console.log(`  ${OUTPUT_DIR}/`);
  console.log('');
  console.log('LISTEN TO EACH FILE and find the one that sounds:');
  console.log('  - Most naturally human (not robotic)');
  console.log('  - Genuinely emotional (not acted)');
  console.log('  - Like a real mom recording a reaction');
  console.log('');
  console.log('Best candidates to try first:');
  console.log('  - sarah_balanced_human.mp3');
  console.log('  - jessica_natural_variation.mp3');
  console.log('  - lily_very_expressive.mp3');
  console.log('');

  // Open the folder
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
