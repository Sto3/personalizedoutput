#!/usr/bin/env npx ts-node
/**
 * Marketing Video Generation CLI
 * AUTOMATED VIDEO PIPELINE - Single command generates 80+ unique marketing videos
 *
 * Usage:
 *   npx ts-node scripts/generateMarketingVideos.ts [product] [count] [options]
 *
 * Options:
 *   --no-voice      Generate silent demo videos only (no ElevenLabs)
 *   --no-music      No background music
 *   --both          Generate BOTH voiceover AND silent versions (doubles output)
 *   --silent-only   Only generate silent demo videos
 *   --help, -h      Show help
 *
 * Examples:
 *   npx ts-node scripts/generateMarketingVideos.ts all --both      # Full library (160+ videos)
 *   npx ts-node scripts/generateMarketingVideos.ts santa 5          # 5 Santa voiceover videos
 *   npx ts-node scripts/generateMarketingVideos.ts vision_board 10 --both # 20 videos (10 each)
 *   npx ts-node scripts/generateMarketingVideos.ts all --silent-only # All silent demos
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import {
  generateMarketingVideo,
  generateVideoBatch,
  generateVideoBatchAdvanced,
  generateFullVideoLibrary,
  MARKETING_HOOKS,
  VISUAL_STYLES,
  BACKGROUND_MUSIC
} from '../src/video/videoGenerator';
import { getHooksByProduct, MarketingHook } from '../src/video/marketingHooks';
import { NARRATOR_VOICES } from '../src/video/voiceConfig';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const product = args.find(a => !a.startsWith('--')) || 'all';
  const count = parseInt(args.find(a => !isNaN(parseInt(a)) && !a.startsWith('--')) || '10') || 10;

  // Parse flags
  const includeVoiceover = !args.includes('--no-voice') && !args.includes('--silent-only');
  const includeMusic = !args.includes('--no-music');
  const generateBothFormats = args.includes('--both');
  const silentOnly = args.includes('--silent-only');

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║      PERSONALIZED OUTPUT - AUTOMATED VIDEO GENERATION PIPELINE       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('Configuration:');
  console.log(`  Product:         ${product}`);
  console.log(`  Count per type:  ${product === 'all' ? 'All hooks' : count}`);
  console.log(`  Voiceover:       ${silentOnly ? 'No (Silent Only Mode)' : includeVoiceover ? 'Yes (ElevenLabs)' : 'No'}`);
  console.log(`  Background music: ${includeMusic ? 'Yes' : 'No'}`);
  console.log(`  Both formats:    ${generateBothFormats ? 'Yes (voiceover + silent)' : 'No'}`);
  console.log(`  Output Format:   1080x1920 (TikTok/Reels/Shorts)`);
  console.log();

  // Check ElevenLabs API key if using voiceover
  if (includeVoiceover && !silentOnly && !process.env.ELEVENLABS_API_KEY) {
    console.error('⚠️  WARNING: ELEVENLABS_API_KEY not found in .env');
    console.log('   Running with --silent-only mode instead\n');
  }

  // Show visual styles available
  console.log('Visual Styles (random per video for variety):');
  Object.entries(VISUAL_STYLES).forEach(([key, style]) => {
    console.log(`  • ${style.name}`);
  });
  console.log();

  // Show voices if using voiceover
  if (includeVoiceover && !silentOnly) {
    console.log('Narrator Voices:');
    NARRATOR_VOICES.forEach(v => {
      console.log(`  • ${v.name}: ${v.description.substring(0, 50)}...`);
    });
    console.log();
  }

  // Show music options
  if (includeMusic) {
    console.log('Background Music Moods:');
    Object.entries(BACKGROUND_MUSIC).forEach(([key, music]) => {
      console.log(`  • ${music.name} (${music.mood})`);
    });
    console.log();
  }

  // Hook Library Statistics
  console.log('Hook Library:');
  const products = ['santa', 'vision_board', 'flash_cards', 'clarity_planner', 'general'] as const;
  let totalHooks = 0;
  products.forEach(p => {
    const hooks = getHooksByProduct(p);
    console.log(`  • ${p}: ${hooks.length} hooks`);
    totalHooks += hooks.length;
  });
  console.log(`  TOTAL: ${totalHooks} unique hooks`);

  if (generateBothFormats) {
    console.log(`\n  With --both flag: ${totalHooks * 2} videos will be generated`);
  }
  console.log();

  // Generate videos
  const startTime = Date.now();

  try {
    if (product === 'all') {
      // Generate full library with variety
      await generateFullVideoLibrary({
        generateBothFormats: generateBothFormats || silentOnly ? false : true,
        includeMusic,
        productsToGenerate: [...products],
        hooksPerProduct: 100
      });
    } else {
      // Generate specific product
      const validProducts = [...products];
      if (!validProducts.includes(product as any)) {
        console.error(`Invalid product: ${product}`);
        console.log(`Valid products: ${validProducts.join(', ')}, all`);
        process.exit(1);
      }

      await generateVideoBatchAdvanced({
        product: product as MarketingHook['product'],
        count,
        includeVoiceover: silentOnly ? false : includeVoiceover,
        includeMusic,
        generateBothFormats
      });
    }

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                       GENERATION COMPLETE                             ║');
    console.log('╠═══════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Duration: ${elapsed} minutes`.padEnd(71) + '║');
    console.log(`║  Videos saved to: outputs/videos/`.padEnd(71) + '║');
    console.log(`║  Audio saved to: outputs/audio/`.padEnd(71) + '║');
    console.log(`║  Manifest: outputs/videos/video_manifest.json`.padEnd(71) + '║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('Generation failed:', error);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║              MARKETING VIDEO GENERATION CLI - HELP                    ║
╚═══════════════════════════════════════════════════════════════════════╝

Usage:
  npx ts-node scripts/generateMarketingVideos.ts [product] [count] [options]

Products:
  santa           - Santa message promotional videos
  vision_board    - Vision board promotional videos
  flash_cards     - Flash cards promotional videos
  clarity_planner - Clarity planner promotional videos
  general         - Brand/general promotional videos
  all             - Generate ALL products (recommended)

Options:
  --no-voice      Generate without voiceover (text + music only)
  --no-music      No background music
  --both          Generate BOTH voiceover AND silent versions
  --silent-only   Only generate silent demo videos (no API calls)
  --help, -h      Show this help message

Examples:
  # Full automation - generates 160+ unique videos
  npx ts-node scripts/generateMarketingVideos.ts all --both

  # Just Santa videos (20 hooks × 2 formats = 40 videos)
  npx ts-node scripts/generateMarketingVideos.ts santa --both

  # Quick test - 5 vision board videos with voiceover
  npx ts-node scripts/generateMarketingVideos.ts vision_board 5

  # Silent demos only (no ElevenLabs API needed)
  npx ts-node scripts/generateMarketingVideos.ts all --silent-only

Output:
  Videos: outputs/videos/
  Audio:  outputs/audio/
  Manifest: outputs/videos/video_manifest.json

Video Variety (built-in for unique content):
  • 8 visual gradient styles (randomly selected)
  • 4 text positioning styles (randomly selected)
  • 6 narrator voices (randomly selected by product)
  • 6 music moods (selected by hook tone)
  • 4 animation patterns (randomly selected)

`);
  process.exit(0);
}

main().catch(console.error);
