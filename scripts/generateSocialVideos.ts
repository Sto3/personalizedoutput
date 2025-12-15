/**
 * Social Campaign Video Generator
 * Generates 50+ marketing videos for social media campaigns
 *
 * Usage: npx ts-node scripts/generateSocialVideos.ts [mode]
 * Modes:
 *   - all: Generate all 80 hooks (160 videos if both formats)
 *   - priority: Generate 50 priority videos (voiceover only)
 *   - silent: Generate all 80 silent videos (no API calls)
 *   - test: Generate 3 test videos
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  generateFullVideoLibrary,
  generateVideoBatchAdvanced,
  generateMarketingVideo,
  MARKETING_HOOKS,
  VISUAL_STYLES
} from '../src/video/videoGenerator';
import { getHooksByProduct, MarketingHook } from '../src/video/marketingHooks';

// Priority hooks for first batch - most impactful hooks
const PRIORITY_HOOK_IDS = [
  // Santa - emotional and urgency for holiday season
  'santa_emotional_01', 'santa_emotional_02', 'santa_emotional_04',
  'santa_urgency_01', 'santa_urgency_02', 'santa_transform_01',
  'santa_social_01', 'santa_curiosity_01',
  // Vision Board - new year timing
  'vision_urgency_01', 'vision_urgency_02', 'vision_emotional_01',
  'vision_transform_01', 'vision_curiosity_01', 'vision_social_01',
  // Flash Cards - education
  'flash_emotional_01', 'flash_transform_01', 'flash_problem_01',
  'flash_curiosity_01', 'flash_social_01',
  // Clarity Planner - new year
  'clarity_emotional_01', 'clarity_transform_01', 'clarity_urgency_01',
  'clarity_problem_01', 'clarity_curiosity_01',
  // General brand
  'general_brand_01', 'general_brand_02', 'general_holiday_01'
];

async function generatePriorityVideos(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║              PRIORITY VIDEO GENERATION - 50 BEST HOOKS               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const priorityHooks = MARKETING_HOOKS.filter(h => PRIORITY_HOOK_IDS.includes(h.id));
  console.log(`Found ${priorityHooks.length} priority hooks`);

  let completed = 0;
  const results: any[] = [];

  for (const hook of priorityHooks) {
    completed++;
    console.log(`\n[${completed}/${priorityHooks.length}] Generating: ${hook.id}`);

    try {
      // Generate voiceover version
      const video = await generateMarketingVideo({
        hook,
        includeVoiceover: true,
        backgroundStyle: 'gradient',
        outputFormat: 'mp4',
        resolution: '1080x1920', // Portrait for TikTok/Reels
        includeCaptions: true,
        includeMusic: true,
        musicVolume: 0.25
      });
      results.push(video);

      // Rate limiting for ElevenLabs API
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Error generating ${hook.id}:`, error);
    }
  }

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log(`║  COMPLETE: ${results.length} priority videos generated                           ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
}

async function generateSilentVideos(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║            SILENT VIDEO GENERATION - NO API CALLS                    ║');
  console.log('║            Perfect for scroll-without-sound viewing                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const products: MarketingHook['product'][] = ['santa', 'vision_board', 'flash_cards', 'clarity_planner', 'general'];

  for (const product of products) {
    console.log(`\n▶ Generating ${product.toUpperCase()} silent videos...`);

    await generateVideoBatchAdvanced({
      product,
      count: 100, // Get all hooks for this product
      includeVoiceover: false, // Silent only - no API calls
      includeMusic: true, // Background music for silent scroll
      generateBothFormats: false
    });
  }
}

async function generateTestVideos(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST MODE - 3 SAMPLE VIDEOS                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const testHooks = MARKETING_HOOKS.slice(0, 3);

  for (const hook of testHooks) {
    console.log(`\nGenerating test video: ${hook.id}`);

    // Generate silent version first (no API needed)
    await generateMarketingVideo({
      hook,
      includeVoiceover: false,
      backgroundStyle: 'gradient',
      outputFormat: 'mp4',
      resolution: '1080x1920',
      includeCaptions: true,
      includeMusic: true
    });
  }

  console.log('\n✓ Test videos generated successfully!');
  console.log('Check outputs/videos/ for the generated files.\n');
}

async function generateAllVideos(): Promise<void> {
  await generateFullVideoLibrary({
    generateBothFormats: true, // Both voiceover AND silent
    includeMusic: true,
    productsToGenerate: ['santa', 'vision_board', 'flash_cards', 'clarity_planner', 'general'],
    hooksPerProduct: 100
  });
}

// Main execution
async function main(): Promise<void> {
  const mode = process.argv[2] || 'priority';

  console.log(`\nVideo Generation Mode: ${mode.toUpperCase()}\n`);

  switch (mode) {
    case 'all':
      await generateAllVideos();
      break;
    case 'priority':
      await generatePriorityVideos();
      break;
    case 'silent':
      await generateSilentVideos();
      break;
    case 'test':
      await generateTestVideos();
      break;
    default:
      console.log('Unknown mode. Available modes: all, priority, silent, test');
      process.exit(1);
  }
}

main().catch(console.error);
