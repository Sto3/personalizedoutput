/**
 * Generate 5 Vision Boards for Social Campaign
 *
 * Creates boards with specific constraints:
 * - NO people or body parts
 * - NO alcoholic beverages
 * - Personalized names in titles
 * - Correct fonts per category
 * - Distinct visual styles
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import the vision board engine
const { generateVisionBoard } = require('../src/lib/visionBoardEngineV12');

const OUTPUT_DIR = path.join(__dirname, '../outputs/social-campaign-v2/vision-boards/boards');

const SOCIAL_BOARDS = [
  {
    id: 'built_different',
    title: "MARCUS: BUILT DIFFERENT",
    subtitle: "FOCUS • DISCIPLINE • EXECUTE",
    outputFile: 'marcus_built_different.png',
    colors: {
      background: '#000000',     // BLACK background
      banner: '#000000',         // BLACK banner
      bannerText: '#c9a962',     // Gold text
      bannerSubtext: 'rgba(201,169,98,0.7)',
      accents: ['#c9a962', '#3a5a8a', '#2a4a7a', '#4a6a9a']
    },
    style: { mood: 'masculine dark discipline executive' },
    photos: [
      "rows of dumbbells in gym, dramatic lighting, fitness equipment",
      "luxury watch collection in display case, dramatic lighting",
      "sleek black luxury sports car front view, dramatic lighting",
      "mountain peak at golden hour, epic landscape photography",
      "leather executive chair in home office, masculine decor",
      "golf clubs on pristine green course at sunset",
      "espresso machine brewing coffee, morning routine",
      "modern city skyline at dusk, architectural photography",
      "chess pieces on board, dramatic lighting, strategy concept",
      "stock market charts on multiple screens, green numbers",
      "vintage world map with compass and airplane model, travel",
      "fireworks display over city skyline at night"
    ]
  },
  {
    id: 'glow_up',
    title: "SOFIA'S GLOW UP",
    subtitle: "SHINE • GROW • BLOOM",
    outputFile: 'sofia_glow_up.png',
    colors: {
      background: '#fff5f7',     // Soft blush pink
      banner: '#e8b4b8',         // Rose pink
      bannerText: '#6b4045',     // Dark rose
      bannerSubtext: 'rgba(107,64,69,0.7)',
      accents: ['#FFB6C1', '#FFDAB9', '#E8D4F0', '#FFE4E1']
    },
    style: { mood: 'feminine dreamy self-care glow' },
    photos: [
      "skincare products on marble vanity, luxury beauty aesthetic",
      "fresh roses in crystal vase, soft morning light",
      "silk robe draped over velvet chair, luxury self-care",
      "bubble bath with rose petals and candles, spa aesthetic",
      "designer makeup palette, beauty flatlay",
      "cozy journal and gold pen on soft blanket",
      "fresh fruit smoothie bowl with flowers, healthy lifestyle",
      "yoga mat with candles, peaceful meditation space",
      "perfume bottles on mirrored tray, luxury fragrance",
      "silk pillowcase and eye mask, beauty sleep",
      "flower market bouquets, fresh blooms aesthetic",
      "cozy reading corner with fairy lights"
    ]
  },
  {
    id: 'relationship_reset',
    title: "EMMA & NOAH'S 3-MONTH RESET",
    subtitle: "GROW • CONNECT • THRIVE",
    outputFile: 'emma_noah_relationship_reset.png',
    colors: {
      background: '#faf6f1',     // Warm cream
      banner: '#9c7c5c',         // Warm caramel
      bannerText: '#FFFFFF',
      bannerSubtext: 'rgba(255,255,255,0.85)',
      accents: ['#D4A574', '#B8956E', '#E8D4C4', '#C9A962']
    },
    style: { mood: 'warm romantic cozy intimate couple relationship together partner' },
    photos: [
      "two coffee cups on wooden table, morning together",
      "two bicycles parked by lakeside at sunset",
      "picnic blanket with basket and flowers in park",
      "two sparkling water glasses over dinner table, elegant",
      "matching pair of hiking boots on mountain trail",
      "cozy living room with two armchairs by fireplace",
      "two plane tickets and passports on world map",
      "romantic dinner table set for two with candles",
      "two books and tea cups on rainy window ledge",
      "beach blanket with two pairs of sunglasses",
      "garden path with wooden bench, peaceful retreat",
      "starry night sky over cozy cabin"
    ]
  },
  {
    id: 'new_year_2026',
    title: "SARAH'S 2026 VISION",
    subtitle: "DREAM • BELIEVE • ACHIEVE",
    outputFile: 'sarah_new_year_2026.png',
    colors: {
      background: '#fdf8f0',     // Champagne cream
      banner: '#b8860b',         // Dark gold
      bannerText: '#FFFFFF',
      bannerSubtext: 'rgba(255,255,255,0.85)',
      accents: ['#FFD700', '#DAA520', '#F5DEB3', '#FFFACD']
    },
    style: { mood: 'feminine elegant celebration new year fresh' },
    photos: [
      "elegant calendar showing year 2026 on desk with gold accents, new year 2026",
      "fireworks over city skyline at midnight, new year 2026 celebration",
      "gold confetti and sparklers with 2026 balloons, festive new year celebration",
      "leather planner with 2026 goal pages, fresh start new year",
      "sunrise over mountains, new beginnings 2026",
      "crystal champagne flutes empty on gold tray, elegant celebration",
      "vision board supplies, scissors, magazines, inspiration for 2026",
      "cozy goal-setting workspace with candles and 2026 planner",
      "world map with gold pins, travel goals for 2026",
      "fresh white flowers in gold vase, new start 2026",
      "meditation cushion in peaceful room, mindfulness new year",
      "running shoes by door with sunrise light, fitness goals 2026"
    ]
  },
  {
    id: 'fitness',
    title: "MAYA'S FITNESS JOURNEY",
    subtitle: "STRONG • CONSISTENT • UNSTOPPABLE",
    outputFile: 'maya_fitness.png',
    colors: {
      background: '#f0f5f5',     // Light teal/mint
      banner: '#2d8c8c',         // Teal
      bannerText: '#FFFFFF',
      bannerSubtext: 'rgba(255,255,255,0.85)',
      accents: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    },
    style: { mood: 'feminine energetic athletic fitness strong' },
    photos: [
      "pink dumbbells and yoga mat, home workout",
      "colorful smoothie bowl with berries, healthy eating",
      "running shoes on track at sunrise, morning run",
      "water bottle and towel at gym, workout essentials",
      "meal prep containers with healthy food, nutrition",
      "fitness journal with progress notes, tracking goals",
      "resistance bands and workout gloves, strength training",
      "peaceful yoga studio with plants, zen fitness",
      "fresh fruit and protein shake, post-workout",
      "hiking trail through forest, outdoor fitness",
      "athletic wear laid out, workout motivation",
      "sunrise over ocean, morning exercise inspiration"
    ]
  }
];

async function generateSocialBoards() {
  console.log('\n======================================================================');
  console.log('   SOCIAL CAMPAIGN VISION BOARD GENERATOR');
  console.log('   Creating 5 boards for TikTok/Reels videos');
  console.log('======================================================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = [];
  let totalCost = 0;

  for (const board of SOCIAL_BOARDS) {
    console.log(`\n============================================================`);
    console.log(`Generating: ${board.id} - "${board.title}"`);
    console.log(`Subtitle: ${board.subtitle}`);
    console.log(`============================================================\n`);

    try {
      const result = await generateVisionBoard({
        title: board.title,
        subtitle: board.subtitle,
        colors: board.colors,
        style: board.style,
        photos: board.photos
      });

      if (result && result.filepath) {
        // Copy to social campaign folder
        const destPath = path.join(OUTPUT_DIR, board.outputFile);
        fs.copyFileSync(result.filepath, destPath);

        console.log(`✅ Saved to: ${destPath}`);
        console.log(`   Cost: $${result.cost || 0.30}`);

        totalCost += result.cost || 0.30;
        results.push({ id: board.id, success: true, path: destPath });
      }
    } catch (error) {
      console.error(`❌ Failed to generate ${board.id}:`, error.message);
      results.push({ id: board.id, success: false, error: error.message });
    }
  }

  console.log('\n======================================================================');
  console.log('   GENERATION COMPLETE');
  console.log('======================================================================');
  console.log(`Total boards: ${SOCIAL_BOARDS.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log('\nOutput files:');
  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.id}: ${r.path || r.error}`);
  });
  console.log('');
}

// Run the generator
generateSocialBoards().catch(console.error);
