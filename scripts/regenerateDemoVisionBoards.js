/**
 * Regenerate Demo Vision Boards with Personalized Titles
 *
 * Creates 3 sample boards for the demo-lessons page:
 * 1. James's Best Year Yet (male-focused, navy/gold theme)
 * 2. Sarah's Dream Year (female-focused, pink theme)
 * 3. Alex's 2025 Vision (neutral New Year theme)
 */

require('dotenv').config();
const path = require('path');

// Import the vision board engine
const { generateVisionBoard } = require('../src/lib/visionBoardEngineV12');

const DEMO_BOARDS = [
  {
    id: 'male',
    title: "JAMES' BEST YEAR YET",
    subtitle: "GOALS • GROWTH • GREATNESS",
    outputFile: 'sample-vision-board-male.png',
    colors: {
      background: '#1a1a3a',  // Dark navy
      banner: '#c9a962',       // Gold
      bannerText: '#ffffff',
      bannerSubtext: 'rgba(255,255,255,0.7)',
      accents: ['#c9a962', '#3a5a8a', '#2a4a7a', '#4a6a9a']
    },
    style: { mood: 'masculine dark discipline' },
    photos: [
      "rows of dumbbells in gym, dramatic lighting, fitness equipment",
      "luxury watch in wooden box on dark silk fabric",
      "sleek black luxury sports car front view, dramatic lighting",
      "mountain peak at golden hour, epic landscape photography",
      "leather executive chair in home office, masculine decor",
      "golf clubs on pristine green course at sunset",
      "whiskey being poured into crystal glass, amber liquid, dramatic lighting",
      "modern city skyline at dusk, architectural photography",
      "chess pieces on board, dramatic lighting, strategy concept",
      "stock market charts on multiple screens, green numbers",
      "passport with airplane tickets on wooden desk, travel concept",
      "fireworks display over city skyline at night"
    ]
  },
  {
    id: 'female',
    title: "SARAH'S DREAM YEAR",
    subtitle: "LOVE • DREAM • SHINE",
    outputFile: 'sample-vision-board-female.png',
    colors: {
      background: '#fdf2f4',  // Light pink
      banner: '#d4a5a5',       // Dusty rose
      bannerText: '#8b5a5a',
      bannerSubtext: 'rgba(139,90,90,0.7)',
      accents: ['#FFB6C1', '#E8D4F0', '#FFEAA7', '#B4E4FF']
    },
    style: { mood: 'feminine dreamy romantic' },
    photos: [
      "bouquet of pink peonies in soft natural light, romantic",
      "rose-shaped bath bombs and candles, spa aesthetic",
      "designer handbag on marble surface, luxury fashion",
      "cozy pink blanket with tea cup, hygge aesthetic",
      "delicate lace fabric texture, soft feminine aesthetic",
      "champagne and macarons, celebration concept",
      "ocean sunset with pink and purple sky",
      "vintage passport on world map, travel planning",
      "fresh flowers in vase by window, home decor",
      "candles lit for meditation, peaceful spa setting",
      "cozy reading nook with books and blankets",
      "gold jewelry and earrings on marble surface"
    ]
  },
  {
    id: 'newyear',
    title: "ALEX'S 2025 VISION",
    subtitle: "MY YEAR • MY GOALS • MY LIFE",
    outputFile: 'sample-vision-board-newyear.png',
    colors: {
      background: '#f5f0e8',  // Warm cream
      banner: '#b8956e',       // Warm gold
      bannerText: '#4a4a4a',
      bannerSubtext: 'rgba(74,74,74,0.7)',
      accents: ['#FFE4B5', '#B4E4FF', '#E8D4F0', '#98D8C8']
    },
    style: { mood: 'warm inspiring hopeful' },
    photos: [
      "champagne glasses clinking with confetti, New Year celebration",
      "open planner notebook with goals written, fresh start",
      "fresh fruit smoothie bowl, healthy lifestyle",
      "vintage suitcase with globe, adventure travel concept",
      "yoga mat and water bottle, fitness wellness",
      "family dinner table set beautifully, togetherness",
      "graduation cap and diploma, achievement success",
      "cozy living room with fireplace, home comfort",
      "garden with blooming flowers, growth abundance",
      "gratitude journal with pen, mindfulness",
      "sunrise through window, new beginnings",
      "sparklers celebration at night, joy happiness"
    ]
  }
];

async function generateDemoBoards() {
  console.log('\n======================================================================');
  console.log('   DEMO VISION BOARD GENERATOR');
  console.log('   Regenerating boards with personalized titles');
  console.log('======================================================================\n');

  const results = [];
  let totalCost = 0;

  for (const board of DEMO_BOARDS) {
    console.log(`\n============================================================`);
    console.log(`Generating: ${board.id} - "${board.title}"`);
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
        // Copy to public/demos folder
        const fs = require('fs');
        const destPath = path.join(__dirname, '../public/demos', board.outputFile);
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
  console.log(`Total boards: ${DEMO_BOARDS.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log('\nOutput files:');
  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.path || r.error}`);
  });
  console.log('');
}

// Run the generator
generateDemoBoards().catch(console.error);
