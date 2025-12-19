/**
 * Regenerate Demo Vision Boards with Personalized Titles
 *
 * Creates 3 sample boards for the demo-lessons page:
 * 1. James's Best Year Yet (male-focused, BLACK background, gold accents)
 * 2. Sarah's Dream Year (female-focused, pink theme)
 * 3. Jon & Jane's 3-Month Reset (relationship board, couple-focused)
 */

require('dotenv').config();
const path = require('path');

// Import the vision board engine
const { generateVisionBoard } = require('../src/lib/visionBoardEngineV12');

const DEMO_BOARDS = [
  {
    id: 'male',
    title: "BUILT DIFFERENT",
    subtitle: "FOCUS • DISCIPLINE • EXECUTE",
    outputFile: 'sample-vision-board-male.png',
    colors: {
      background: '#0a0a0f',   // FULLY BLACK background (engine will force this for masculine mood anyway)
      banner: '#000000',       // BLACK banner background
      bannerText: '#c9a962',   // Gold text
      bannerSubtext: 'rgba(201,169,98,0.7)',
      accents: ['#c9a962', '#3a5a8a', '#2a4a7a', '#4a6a9a']
    },
    style: { mood: 'masculine dark discipline executive' },
    photos: [
      "rows of dumbbells in gym, dramatic lighting, fitness equipment",
      "luxury watch in wooden box on dark silk fabric",
      "sleek black luxury sports car front view, dramatic lighting",
      "mountain peak at golden hour, epic landscape photography",
      "leather executive chair in home office, masculine decor",
      "golf clubs on pristine green course at sunset",
      "espresso machine brewing coffee, morning routine, dramatic lighting",  // Replaced whiskey
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
      "macarons and sparkling water on marble table, celebration concept",  // Replaced champagne
      "ocean sunset with pink and purple sky",
      "vintage passport on world map, travel planning",
      "fresh flowers in vase by window, home decor",
      "candles lit for meditation, peaceful spa setting",
      "cozy reading nook with books and blankets",
      "gold jewelry and earrings on marble surface"
    ]
  },
  {
    // RELATIONSHIP BOARD - Uses couple names format
    // Imagery focuses on relationship themes WITHOUT any humans or body parts
    id: 'relationship',
    title: "JANE & JON'S 3-MONTH RESET",
    subtitle: "GROW • CONNECT • THRIVE",
    outputFile: 'sample-vision-board-relationship.png',
    colors: {
      background: '#f8f5f0',  // Warm cream/neutral
      banner: '#8B7355',       // Warm brown
      bannerText: '#FFFFFF',
      bannerSubtext: 'rgba(255,255,255,0.8)',
      accents: ['#D4A574', '#B8956E', '#E8D4C4', '#C9A962']
    },
    style: { mood: 'warm romantic cozy intimate' },
    photos: [
      // Relationship-focused imagery WITHOUT humans/body parts:
      "two coffee cups on wooden table, morning together, cozy aesthetic",
      "two bicycles parked by lakeside at sunset, adventure together",
      "picnic blanket with basket and flowers in park, romantic date",
      "two wine glasses clinking over dinner table, elegant setting",
      "matching pair of hiking boots on mountain trail, adventure",
      "cozy living room with two armchairs by fireplace, home together",
      "two plane tickets and passports on map, travel goals",
      "romantic dinner table set for two with candles, date night",
      "two books and tea cups on rainy window ledge, cozy reading",
      "beach blanket with two pairs of sunglasses, vacation vibes",
      "garden path with bench for two, peaceful retreat",
      "starry night sky over cozy cabin, romantic getaway"
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
