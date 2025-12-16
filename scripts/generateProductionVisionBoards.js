/**
 * Generate Production Vision Board Examples
 *
 * Creates two production-quality vision boards for marketing:
 * 1. Marcus's 2025 Career Level-Up (masculine/professional)
 * 2. Jasmine's 2025 Glow-Up (feminine/wellness)
 *
 * Run: node scripts/generateProductionVisionBoards.js
 *
 * Requires IDEOGRAM_API_KEY in .env
 */

require('dotenv').config();
const { generateVisionBoard } = require('../src/lib/visionBoardEngineV12');
const fs = require('fs');
const path = require('path');

async function generateProductionExamples() {
  console.log('='.repeat(60));
  console.log('GENERATING PRODUCTION VISION BOARD EXAMPLES');
  console.log('='.repeat(60));

  // Example 1: Marcus's Career Level-Up (Masculine)
  const marcusBoard = {
    title: "Marcus's 2025 Career Level-Up",
    subtitle: "Lead. Grow. Succeed.",
    photos: [
      "professional success achievement celebration",
      "modern office workspace productivity",
      "confident business leader mentoring",
      "networking event professional connections",
      "career growth upward trajectory chart",
      "luxury watch success symbol",
      "executive meeting leadership",
      "modern city skyline ambition",
      "graduation diploma achievement",
      "teamwork collaboration success",
      "public speaking presentation confidence",
      "financial prosperity abundance"
    ],
    quotes: [
      "Leaders are made, not born",
      "Success is a journey"
    ],
    textBlocks: [
      "LEVEL UP",
      "LEAD",
      "SUCCEED"
    ],
    colors: {
      background: '#1a1a2e',
      accents: ['#4a5568', '#2d3748', '#718096', '#a0aec0'],
      banner: '#1a1a2e',
      bannerText: '#FFFFFF',
      bannerSubtext: 'rgba(255,255,255,0.7)'
    },
    style: {
      mood: 'masculine dark discipline professional',
      decorations: false,
      bokeh: false
    }
  };

  console.log('\n[1/2] Generating Marcus\'s Career Level-Up...');
  try {
    const result1 = await generateVisionBoard(marcusBoard, { costLimit: 0.50 });
    console.log('Marcus board saved to:', result1.filepath);

    // Copy to public folder for social videos
    const publicPath1 = path.join(__dirname, '../public/social-videos/production_marcus_career_levelup.png');
    fs.copyFileSync(result1.filepath, publicPath1);
    console.log('Copied to:', publicPath1);
  } catch (e) {
    console.error('Error generating Marcus board:', e.message);
  }

  // Wait a moment between generations
  await new Promise(r => setTimeout(r, 2000));

  // Example 2: Jasmine's Glow-Up (Feminine)
  const jasmineBoard = {
    title: "Jasmine's 2025 Glow-Up",
    subtitle: "Grow. Glow. Thrive.",
    photos: [
      "wellness self-care morning routine",
      "yoga meditation peaceful practice",
      "healthy lifestyle fresh nutrition",
      "confident woman empowerment",
      "skincare beauty routine self-love",
      "fitness workout strength training",
      "journal writing self-reflection",
      "nature walk peaceful mindfulness",
      "spa relaxation self-care day",
      "sunrise morning inspiration new beginning",
      "flowers blooming growth transformation",
      "positive affirmations mirror self-love"
    ],
    quotes: [
      "Glow from within",
      "She believed she could"
    ],
    textBlocks: [
      "GLOW UP",
      "THRIVE",
      "RADIATE"
    ],
    colors: {
      background: '#F5E8ED',
      accents: ['#FFB6C1', '#E8D4F0', '#B4E4FF', '#FFEAA7'],
      banner: '#4A3F45',
      bannerText: '#FFFFFF',
      bannerSubtext: 'rgba(255,255,255,0.7)'
    },
    style: {
      mood: 'feminine soft warm dreamy aesthetic',
      decorations: false,
      bokeh: true
    }
  };

  console.log('\n[2/2] Generating Jasmine\'s Glow-Up...');
  try {
    const result2 = await generateVisionBoard(jasmineBoard, { costLimit: 0.50 });
    console.log('Jasmine board saved to:', result2.filepath);

    // Copy to public folder for social videos
    const publicPath2 = path.join(__dirname, '../public/social-videos/production_jasmine_glow_up.png');
    fs.copyFileSync(result2.filepath, publicPath2);
    console.log('Copied to:', publicPath2);
  } catch (e) {
    console.error('Error generating Jasmine board:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('PRODUCTION EXAMPLES COMPLETE');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Review the generated boards in /outputs/');
  console.log('2. Use them in social video content');
  console.log('3. Update /social page if needed');
}

generateProductionExamples().catch(console.error);
