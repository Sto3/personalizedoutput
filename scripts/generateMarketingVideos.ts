#!/usr/bin/env npx ts-node
/**
 * Marketing Video Generation CLI
 *
 * Usage:
 *   npx ts-node scripts/generateMarketingVideos.ts [product] [count] [--no-voice]
 *
 * Examples:
 *   npx ts-node scripts/generateMarketingVideos.ts santa 5         # 5 Santa videos with voiceover
 *   npx ts-node scripts/generateMarketingVideos.ts vision_board 10 # 10 Vision Board videos
 *   npx ts-node scripts/generateMarketingVideos.ts all             # Generate full library
 *   npx ts-node scripts/generateMarketingVideos.ts santa 3 --no-voice # Silent videos
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import {
  generateMarketingVideo,
  generateVideoBatch,
  generateFullVideoLibrary,
  MARKETING_HOOKS
} from '../src/video/videoGenerator';
import { getHooksByProduct, MarketingHook } from '../src/video/marketingHooks';
import { NARRATOR_VOICES } from '../src/video/voiceConfig';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const product = args[0] || 'all';
  const count = parseInt(args[1]) || 10;
  const includeVoiceover = !args.includes('--no-voice');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PERSONALIZED OUTPUT - MARKETING VIDEO GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Configuration:`);
  console.log(`  Product: ${product}`);
  console.log(`  Count: ${product === 'all' ? 'All hooks' : count}`);
  console.log(`  Voiceover: ${includeVoiceover ? 'Yes (ElevenLabs)' : 'No (Silent)'}`);
  console.log(`  Output Format: 1080x1920 (TikTok/Reels/Shorts)`);
  console.log();

  // Check ElevenLabs API key if using voiceover
  if (includeVoiceover && !process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    console.log('Run with --no-voice to generate silent videos');
    process.exit(1);
  }

  console.log('Available Voices:');
  NARRATOR_VOICES.forEach(v => {
    console.log(`  - ${v.name}: ${v.description}`);
  });
  console.log();

  console.log('Hook Library Statistics:');
  const products = ['santa', 'vision_board', 'flash_cards', 'clarity_planner', 'general'] as const;
  products.forEach(p => {
    const hooks = getHooksByProduct(p);
    console.log(`  - ${p}: ${hooks.length} hooks`);
  });
  console.log(`  TOTAL: ${MARKETING_HOOKS.length} hooks`);
  console.log();

  // Generate videos
  const startTime = Date.now();

  try {
    if (product === 'all') {
      // Generate full library
      await generateFullVideoLibrary(includeVoiceover);
    } else {
      // Generate specific product
      const validProducts = [...products];
      if (!validProducts.includes(product as any)) {
        console.error(`Invalid product: ${product}`);
        console.log(`Valid products: ${validProducts.join(', ')}, all`);
        process.exit(1);
      }

      await generateVideoBatch(product as MarketingHook['product'], count, includeVoiceover);
    }

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✓ Generation complete in ${elapsed} minutes`);
    console.log('Videos saved to: outputs/videos/');
    console.log('Audio saved to: outputs/audio/');

  } catch (error) {
    console.error('Generation failed:', error);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Marketing Video Generation CLI

Usage:
  npx ts-node scripts/generateMarketingVideos.ts [product] [count] [--no-voice]

Products:
  santa           - Santa message promotional videos
  vision_board    - Vision board promotional videos
  flash_cards     - Flash cards promotional videos
  clarity_planner - Clarity planner promotional videos
  general         - Brand/general promotional videos
  all             - Generate all products

Options:
  --no-voice      Generate silent videos (no voiceover)
  --help, -h      Show this help message

Examples:
  npx ts-node scripts/generateMarketingVideos.ts santa 5
  npx ts-node scripts/generateMarketingVideos.ts vision_board 10 --no-voice
  npx ts-node scripts/generateMarketingVideos.ts all
`);
  process.exit(0);
}

main().catch(console.error);
