/**
 * Generate Demo Vision Boards for Website
 *
 * Uses visionBoardEngineV12.js directly to generate 3 sample boards:
 * - Male-themed (christmas_for_him -> "HIS 2025 VISION")
 * - Female-themed (christmas_for_her -> "HER BEST YEAR 2025")
 * - New Year-themed (new_year_2025_vision -> "2025 VISION")
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const { generateVisionBoard } = require('../src/lib/visionBoardEngineV12');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'demos');

// Vision board configurations
const BOARDS = {
  male: {
    title: 'HIS 2025 VISION',
    subtitle: 'GOALS • GROWTH • GREATNESS',
    colors: {
      background: '#1A1A2E',
      accents: ['#C4A35A', '#2B4A2B', '#8B4513', '#1E3D59'],
      banner: '#C4A35A',
      bannerText: '#1A1A2E'
    },
    photos: [
      'black dumbbells arranged neatly',
      'luxury leather watch on stand',
      'sports car front view',
      'mountain peak at sunrise',
      'executive leather office chair',
      'golf clubs on green grass',
      'premium whiskey glass amber liquid',
      'running track lanes empty',
      'chess pieces king and queen',
      'stock chart on monitor screen',
      'luxury villa pool view',
      'sunrise over mountain range'
    ],
    style: { mood: 'dark masculine luxury', bokeh: false }
  },

  female: {
    title: 'HER BEST YEAR 2025',
    subtitle: 'LOVE • DREAM • SHINE',
    colors: {
      background: '#FDF5F3',
      accents: ['#D4A5A5', '#E8B4B8', '#A8C5DB', '#F5E6CC'],
      banner: '#D4A5A5',
      bannerText: '#FFFFFF'
    },
    photos: [
      'pink peonies bouquet',
      'spa candles and bath bombs',
      'designer handbag on marble',
      'cozy cashmere blanket',
      'champagne and macarons',
      'beach sunset golden hour',
      'yoga mat with candles',
      'fresh flowers in ceramic vase',
      'luxury skincare products arranged',
      'travel passport and world map',
      'cozy reading corner with books',
      'golden jewelry on velvet display'
    ],
    style: { mood: 'soft feminine luxury', bokeh: true }
  },

  newyear: {
    title: '2025 VISION',
    subtitle: 'My Best Year Yet',
    colors: {
      background: '#F0E6D3',
      accents: ['#C9A66B', '#8B7355', '#D4A574', '#E8C547'],
      banner: '#3A3530',
      bannerText: '#FFFFFF'
    },
    photos: [
      'champagne glasses and confetti',
      'goal planner notebook',
      'fresh fruit and smoothie bowl',
      'vintage suitcase with map',
      'dumbbells and water bottle',
      'dining table set for feast',
      'desk with awards',
      'cozy living room interior',
      'lush garden abundance',
      'gratitude journal with pen',
      'sunrise through window',
      'sparklers in night'
    ],
    style: { mood: 'celebratory hopeful ambitious', bokeh: true }
  }
};

async function generateBoard(key, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generating: ${key} - "${config.title}"`);
  console.log(`${'='.repeat(60)}`);

  const input = {
    title: config.title,
    subtitle: config.subtitle,
    colors: config.colors,
    photos: config.photos,
    quotes: [],
    textBlocks: [],
    style: config.style
  };

  try {
    const result = await generateVisionBoard(input, {
      skipGeneration: false,
      costLimit: 0.50
    });

    if (result && result.filepath) {
      // Copy to public/demos with appropriate name
      const destPath = path.join(OUTPUT_DIR, `sample-vision-board-${key}.png`);
      fs.copyFileSync(result.filepath, destPath);
      console.log(`\n✅ Saved to: ${destPath}`);
      console.log(`   Cost: $${result.cost.toFixed(2)}`);
      return { key, success: true, path: destPath, cost: result.cost };
    }
  } catch (error) {
    console.error(`\n❌ Error generating ${key}:`, error.message);
    return { key, success: false, error: error.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('   VISION BOARD DEMO GENERATOR');
  console.log('   Generating 3 boards: Male, Female, New Year');
  console.log('='.repeat(70));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get which boards to generate from command line args
  const args = process.argv.slice(2);
  const boardsToGenerate = args.length > 0
    ? args.filter(a => BOARDS[a])
    : Object.keys(BOARDS);

  console.log(`\nBoards to generate: ${boardsToGenerate.join(', ')}`);

  const results = [];
  let totalCost = 0;

  for (const key of boardsToGenerate) {
    const result = await generateBoard(key, BOARDS[key]);
    results.push(result);
    if (result.cost) totalCost += result.cost;

    // Small delay between boards
    if (boardsToGenerate.indexOf(key) < boardsToGenerate.length - 1) {
      console.log('\nWaiting 2 seconds before next board...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('   GENERATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total boards: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log('\nOutput files:');
  results.forEach(r => {
    if (r.success) {
      console.log(`  ✅ ${r.path}`);
    } else {
      console.log(`  ❌ ${r.key}: ${r.error}`);
    }
  });
}

main().catch(console.error);
