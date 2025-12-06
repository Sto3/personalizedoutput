/**
 * Generate Santa Preview Audio for Etsy Listing
 *
 * Creates short (6-9 second) emotionally powerful preview clips
 * to showcase the Santa voice on Etsy.
 *
 * Generates TWO voice variants for comparison:
 * - Warm Santa: Deep American (more resonance, emotional)
 * - Gentle Santa: Soft Grandfatherly American (smooth, subtle)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { synthesizeSantaMessage, type SantaVoiceVariant } from '../src/lib/thoughtEngine/santa/elevenLabsClient';
import { getVoiceSettingsSummary } from '../src/lib/thoughtEngine/santa/voiceSettings';

// ============================================================
// PREVIEW SCRIPTS
// ============================================================

// Short preview script
const SHORT_SCRIPT = `Ella, Santa heard about how brave you were this year, even on the days that felt a little hard.`;

// Full-length script for quality testing
const FULL_LENGTH_SCRIPT = `Ella, this is Santa. I wanted to take a moment to speak directly to you, because I've been watching over you this whole year. I know there were days that felt a little hard, days when things didn't go the way you hoped. But here's what I saw, Ella. I saw you try again. I saw you be kind to others, even when no one was watching. And that, my dear, is what makes my heart so full. You are on my very special list, and I am so proud of the person you're becoming. Remember, the magic of Christmas isn't just about presents under the tree. It's about the love you carry in your heart. Merry Christmas, Ella. Santa believes in you.`;

// =================================================================
// ETSY LISTING PREVIEW - 12 seconds, high-conversion
// =================================================================
// Key differentiators to showcase:
// 1. Uses child's REAL NAME (not generic "boys and girls")
// 2. References SPECIFIC details only parents would know
// 3. Emotionally powerful - not just "you've been good"
// 4. Feels like Santa TRULY knows this child
// =================================================================
const ETSY_PREVIEW_SCRIPT = `Emma, Santa knows about that time you shared your favorite toy with your little brother, even when it was hard. That's the kind of heart that makes Christmas so special.`;

// Main script to generate
const PRIMARY_SCRIPT = ETSY_PREVIEW_SCRIPT;

// Alternative scripts for testing
const ALTERNATIVE_SCRIPTS = [
  `Mason, Santa knows about that time you helped your friend when no one else did. That meant more than you know.`,
  `Lily, Santa has been watching you try your best this year, even when things felt scary. That takes real courage.`,
  `Noah, Santa noticed how kind you've been to others, especially on the days when it wasn't easy to be kind.`
];

// ============================================================
// MAIN
// ============================================================

async function generateBothVariants() {
  console.log('='.repeat(60));
  console.log('SANTA PREVIEW AUDIO GENERATOR - DUAL VARIANT');
  console.log('='.repeat(60));
  console.log();
  console.log('Generating TWO voice variants for comparison:');
  console.log('  1. Warm Santa (deep American)');
  console.log('  2. Gentle Santa (soft grandfatherly American)');
  console.log();

  // Check environment
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set in environment');
    process.exit(1);
  }

  if (!process.env.ELEVENLABS_SANTA_VOICE_ID) {
    console.error('ERROR: ELEVENLABS_SANTA_VOICE_ID not set in environment');
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'outputs', 'santa', 'previews');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Generate timestamp
  const timestamp = Date.now();

  console.log('PRIMARY SCRIPT:');
  console.log(`"${PRIMARY_SCRIPT}"`);
  console.log();
  console.log(`Character count: ${PRIMARY_SCRIPT.length}`);
  console.log();

  const results: any[] = [];

  // Generate just warm variant for this test (smoother settings)
  const variants: SantaVoiceVariant[] = ['warm'];

  for (const variant of variants) {
    const variantName = variant === 'warm' ? 'Warm Santa' : 'Gentle Santa';
    const filename = `santa-preview-${variant}-${timestamp}.mp3`;
    const filepath = path.join(outputDir, filename);

    console.log('='.repeat(60));
    console.log(`GENERATING: ${variantName}`);
    console.log('='.repeat(60));
    console.log();
    console.log(getVoiceSettingsSummary(variant));
    console.log();

    try {
      const audioBuffer = await synthesizeSantaMessage(PRIMARY_SCRIPT, variant);

      // Save to file
      fs.writeFileSync(filepath, audioBuffer);

      const result = {
        variant: variant,
        variantName: variantName,
        previewText: PRIMARY_SCRIPT,
        previewAudioPath: `/outputs/santa/previews/${filename}`,
        localPath: filepath,
        fileSize: `${(audioBuffer.length / 1024).toFixed(1)} KB`
      };

      results.push(result);
      console.log(`SUCCESS! Saved: ${filename}`);
      console.log();

    } catch (error: any) {
      console.error(`ERROR generating ${variantName}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('GENERATION COMPLETE - BOTH VARIANTS');
  console.log('='.repeat(60));
  console.log();
  console.log('RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log();

  console.log('='.repeat(60));
  console.log('VOICE SETTINGS COMPARISON:');
  console.log('='.repeat(60));
  console.log();
  console.log(getVoiceSettingsSummary('warm'));
  console.log();
  console.log(getVoiceSettingsSummary('gentle'));
  console.log();

  console.log('='.repeat(60));
  console.log('ALTERNATIVE SCRIPTS (for future testing):');
  console.log('='.repeat(60));
  console.log();

  ALTERNATIVE_SCRIPTS.forEach((script, i) => {
    console.log(`OPTION ${i + 2}:`);
    console.log(`"${script}"`);
    console.log(`(${script.length} characters)`);
    console.log();
  });

  console.log('='.repeat(60));
  console.log('Listen to both previews and choose the one that feels magical!');
  console.log('='.repeat(60));

  return results;
}

// Run
generateBothVariants();
