/**
 * Generate Etsy Preview Sample
 *
 * Creates a generic but compelling preview audio for the Etsy listing.
 * This shows potential customers what the personalized message sounds like
 * WITHOUT being specific to any child (so they can imagine their own).
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

// ============================================================
// PREVIEW SCRIPTS
// ============================================================

// Script 1: General kindness theme (most universal)
const PREVIEW_SCRIPT_KINDNESS = `
Ho ho ho! Well hello there!

This is Santa Claus calling from the North Pole, and I just had to reach out to you personally.

You see, I've been watching all year long, and I noticed something very special about you. I saw how you've shown kindness to others... how you've helped when you didn't have to... and how your heart shines bright even on tough days.

I heard about the times you made someone feel included. The moments you chose to be brave and do what was right. Those aren't small things... those are the things that make the world better.

The people who love you are so proud of who you're becoming. And so am I.

Keep that wonderful heart of yours. Keep being kind, keep being brave, and keep being exactly who you are.

Merry Christmas!
`.trim();

// Script 2: Overcoming challenges theme
const PREVIEW_SCRIPT_BRAVE = `
Ho ho ho! Merry Christmas!

This is Santa, and I wanted to call you because something very important has come to my attention.

I know this year hasn't always been easy. There were times when things felt hard, when you weren't sure you could do it... but you kept going anyway.

And that, my friend, is what courage looks like. Being brave doesn't mean you're never scared. It means you do hard things even when they're scary. And you've done that.

I see how much you've grown. I see the strength you've found. And I am so, so proud of you.

Remember: you are stronger than you know. And I believe in you.

Have a wonderful, peaceful Christmas.
`.trim();

// Script 3: Short teaser (15 seconds)
const PREVIEW_SCRIPT_TEASER = `
Ho ho ho! This is Santa calling!

I've been watching you all year, and I have to say... I am so proud of who you're becoming. Your kindness, your courage, your heart... it doesn't go unnoticed.

Merry Christmas!
`.trim();

// ============================================================
// GENERATION FUNCTION
// ============================================================

async function generatePreviewAudio(script, filename) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  if (!apiKey || !voiceId) {
    throw new Error('Missing ELEVENLABS_API_KEY or ELEVENLABS_SANTA_VOICE_ID');
  }

  console.log(`Generating: ${filename}...`);
  console.log(`Script length: ${script.split(/\s+/).length} words`);

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    data: {
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: SANTA_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);

  // Save to outputs
  const outputDir = 'outputs/etsy-previews';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, audioBuffer);

  console.log(`✓ Saved: ${filepath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

  return filepath;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('GENERATING ETSY PREVIEW SAMPLES');
  console.log('='.repeat(60));
  console.log('');

  const previews = [
    { script: PREVIEW_SCRIPT_KINDNESS, filename: 'santa-preview-kindness.mp3' },
    { script: PREVIEW_SCRIPT_BRAVE, filename: 'santa-preview-brave.mp3' },
    { script: PREVIEW_SCRIPT_TEASER, filename: 'santa-preview-teaser-15sec.mp3' }
  ];

  const generated = [];

  for (const { script, filename } of previews) {
    try {
      const filepath = await generatePreviewAudio(script, filename);
      generated.push(filepath);
      console.log('');
    } catch (error) {
      console.error(`Failed to generate ${filename}:`, error.message);
    }
  }

  console.log('='.repeat(60));
  console.log('PREVIEW GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Generated files:');
  generated.forEach(f => console.log(`  - ${f}`));
  console.log('');
  console.log('Recommended for Etsy listing:');
  console.log('  1. santa-preview-kindness.mp3 - Main listing preview (~50 sec)');
  console.log('  2. santa-preview-teaser-15sec.mp3 - Short attention grabber');
  console.log('');
}

main().catch(console.error);
