require('dotenv').config();

const { generateVisionBoard } = require('./src/lib/visionBoardEngineV7');

// ============================================================
// SAMPLE THOUGHT ORGANIZER OUTPUTS
// These simulate what the Thought Organizer would extract from users
// ============================================================

/**
 * Example 1: Post-Graduation Career Vision Board
 * User went through thought organizer about their career dreams
 */
const postGradCareerInput = {
  title: "Becoming Who I'm Meant To Be",
  subtitle: "GROWTH • COURAGE • PURPOSE",

  colors: {
    background: '#F5EDE8',
    accents: ['#D4A574', '#8FAA7E', '#E8C4A8', '#7A9BBF', '#C9B896'],
    banner: '#3A3530',
    bannerText: '#F8F4F0',
    bannerSubtext: 'rgba(255,255,255,0.65)'
  },

  // Their symbol descriptions (become photos)
  photos: [
    'modern city skyline at golden hour sunrise',
    'sleek laptop on minimalist desk with coffee',
    'airplane window view above the clouds',
    'professional workspace with plants and natural light',
    'cozy coffee shop corner with journal',
    'mountain peak at sunrise representing achievement',
    'open planner with goals written on clean pages',
    'inspiring bookshelf with design and business books'
  ],

  // Their own words, elevated (quote cards)
  quotes: [
    "I choose courage over comfort",
    "My story is just beginning",
    "Success looks like freedom to me"
  ],

  // Single power words (text blocks)
  textBlocks: [
    "BECOMING",
    "FEARLESS"
  ],

  style: {
    decorations: false,  // More professional, no hearts/flowers
    bokeh: true,
    mood: 'warm professional aspirational clean modern'
  }
};

/**
 * Example 2: Feminine Self-Love/Glow-Up Vision Board
 * User exploring their personal growth and self-care journey
 */
const selfLoveGlowUpInput = {
  title: "My Big 2025 Glow-Up Vision",
  subtitle: "SELF-LOVE • FRIENDSHIPS • TRAVEL • CREATIVITY",

  colors: {
    background: '#F5E8ED',
    accents: ['#FFB6C1', '#B4E4FF', '#E8D4F0', '#FFEAA7', '#B8F0D4', '#FFD4E5'],
    banner: '#4A3F45',
    bannerText: '#F8F4F6',
    bannerSubtext: 'rgba(255,255,255,0.7)'
  },

  photos: [
    'airplane window view with pink sunset clouds',
    'two iced coffee drinks on cozy cafe table',
    'pink laptop on aesthetic desk with plants',
    'colorful acai bowl with fresh berries',
    'charming european street with string lights at dusk',
    'pink skincare bottles on marble surface',
    'colorful beaded friendship bracelets',
    'lavender sneakers in flower meadow'
  ],

  quotes: [
    "I am worthy of beautiful things",
    "This is my season of blooming",
    "Choosing myself, always"
  ],

  textBlocks: [
    "GLOW",
    "MAGIC"
  ],

  style: {
    decorations: true,  // Hearts, stars, flowers
    bokeh: true,
    mood: 'soft pastel dreamy bokeh feminine aesthetic warm golden lighting'
  }
};

/**
 * Example 3: Masculine Focus & Discipline Vision Board
 * User focused on discipline, fitness, and mental strength
 */
const masculineFocusInput = {
  title: "Built Different",
  subtitle: "DISCIPLINE • STRENGTH • LEGACY",

  colors: {
    background: '#1E1E1E',
    accents: ['#8B7355', '#5A5A5A', '#4A6741', '#6B5B4F', '#7A7A7A'],
    banner: '#0F0F0F',
    bannerText: '#E8E4E0',
    bannerSubtext: 'rgba(255,255,255,0.5)'
  },

  photos: [
    'gym weights on dark floor dramatic lighting',
    'morning sunrise over mountain range',
    'leather journal with fountain pen on dark wood',
    'black coffee in ceramic mug steam rising',
    'running shoes on wet pavement early morning',
    'minimalist desk setup with single monitor',
    'chess pieces on board strategic thinking',
    'watch collection on dark velvet display'
  ],

  quotes: [
    "Discipline is choosing between what you want now and what you want most",
    "The man who moves mountains begins by carrying small stones"
  ],

  textBlocks: [
    "GRIND",
    "LEGACY",
    "FOCUS"
  ],

  style: {
    decorations: false,  // No cute stuff
    bokeh: false,        // Clean, not dreamy
    mood: 'moody dark dramatic editorial masculine sophisticated'
  }
};

/**
 * Example 4: Relationship/Couples Vision Board
 * Couple creating their shared future vision
 */
const relationshipInput = {
  title: "Our Forever Story",
  subtitle: "LOVE • ADVENTURE • HOME • TOGETHER",

  colors: {
    background: '#FDF5F3',
    accents: ['#E8A598', '#D4978A', '#C4867A', '#F0B8A8', '#DDA090'],
    banner: '#5C3D3D',
    bannerText: '#FFF8F5',
    bannerSubtext: 'rgba(255,255,255,0.65)'
  },

  photos: [
    'two coffee cups touching on sunny cafe table',
    'sunset beach with footprints in sand',
    'cozy living room with fireplace and blankets',
    'couple bicycles leaning together in park',
    'romantic dinner table with candles',
    'travel map with pins marking adventures',
    'cozy breakfast in bed tray with flowers',
    'matching rings on soft fabric'
  ],

  quotes: [
    "Home is wherever I'm with you",
    "Our love story is my favorite",
    "Building forever, one day at a time"
  ],

  textBlocks: [
    "US",
    "ALWAYS"
  ],

  style: {
    decorations: true,  // Hearts only would be ideal
    bokeh: true,
    mood: 'warm romantic golden hour intimate cozy lifestyle'
  }
};

/**
 * Example 5: Nature/Wellness Vision Board
 * User seeking balance, peace, and connection to nature
 */
const wellnessNatureInput = {
  title: "Rooted in Peace",
  subtitle: "BALANCE • NATURE • WELLNESS • STILLNESS",

  colors: {
    background: '#E8E4D8',
    accents: ['#7D8B6A', '#A8B89A', '#9AAA8A', '#6B7A5A', '#B8C8A8'],
    banner: '#3A4030',
    bannerText: '#F4F2EC',
    bannerSubtext: 'rgba(255,255,255,0.6)'
  },

  photos: [
    'morning dew on green leaves closeup',
    'yoga mat in sunlit room with plants',
    'herbal tea in ceramic cup on wooden table',
    'forest trail with sunlight filtering through',
    'meditation corner with cushions and candles',
    'fresh vegetables in woven basket',
    'calm lake at sunrise with mist',
    'journal open in garden setting'
  ],

  quotes: [
    "I am exactly where I need to be",
    "Breathe in peace, breathe out worry",
    "Growth happens in stillness"
  ],

  textBlocks: [
    "BREATHE",
    "BLOOM"
  ],

  style: {
    decorations: true,
    bokeh: true,
    mood: 'natural earthy organic soft sunlight peaceful botanical'
  }
};

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function runLayoutTest() {
  console.log('='.repeat(70));
  console.log('VISION BOARD ENGINE V7 - LAYOUT TEST');
  console.log('='.repeat(70));
  console.log('');
  console.log('This version accepts Thought Organizer output with:');
  console.log('');
  console.log('CONTENT TYPES:');
  console.log('  📷 Photos     - AI-generated from user symbol descriptions');
  console.log('  💬 Quotes     - User\'s words in elegant decorative cards');
  console.log('  🔤 Text Blocks - Bold motivational words, impactful style');
  console.log('  🎨 Color Blocks - Solid colors for visual breathing room');
  console.log('');
  console.log('USER-DEFINED:');
  console.log('  • All colors from their choices');
  console.log('  • Title & subtitle from their words');
  console.log('  • Decorations on/off based on mood');
  console.log('  • Everything personalized to their input');
  console.log('');

  const testInputs = [
    { name: 'Post-Grad Career', data: postGradCareerInput },
    { name: 'Self-Love Glow-Up', data: selfLoveGlowUpInput },
    { name: 'Masculine Focus', data: masculineFocusInput },
    { name: 'Relationship', data: relationshipInput },
    { name: 'Wellness Nature', data: wellnessNatureInput },
  ];

  const results = [];

  for (const test of testInputs) {
    console.log(`\n--- Testing: ${test.name} ---`);
    const result = await generateVisionBoard(test.data, {
      skipGeneration: true,
      costLimit: 1.00
    });
    results.push({ name: test.name, filepath: result.filepath });
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL LAYOUT TESTS COMPLETE');
  console.log('='.repeat(70));
  console.log('\nGenerated files:');
  results.forEach(r => console.log(`  ${r.name}: ${r.filepath}`));
  console.log('\nTo generate with real Ideogram images:');
  console.log('  node test-visionboard-v7.js --real');
  console.log('\nTo generate a specific board:');
  console.log('  node test-visionboard-v7.js --real --board=career');
  console.log('  node test-visionboard-v7.js --real --board=glowup');
  console.log('  node test-visionboard-v7.js --real --board=masculine');
  console.log('  node test-visionboard-v7.js --real --board=relationship');
  console.log('  node test-visionboard-v7.js --real --board=wellness');
}

async function runRealGeneration(specificBoard = null) {
  console.log('='.repeat(70));
  console.log('VISION BOARD ENGINE V7 - REAL GENERATION');
  console.log('Using Ideogram Turbo API');
  console.log('='.repeat(70));

  const allBoards = {
    'career': { name: 'Post-Grad Career', data: postGradCareerInput },
    'glowup': { name: 'Self-Love Glow-Up', data: selfLoveGlowUpInput },
    'masculine': { name: 'Masculine Focus', data: masculineFocusInput },
    'relationship': { name: 'Relationship', data: relationshipInput },
    'wellness': { name: 'Wellness Nature', data: wellnessNatureInput },
  };

  const boards = specificBoard && allBoards[specificBoard]
    ? [allBoards[specificBoard]]
    : Object.values(allBoards);

  if (specificBoard && !allBoards[specificBoard]) {
    console.log(`Board "${specificBoard}" not found.`);
    console.log('Available: career, glowup, masculine, relationship, wellness');
    return;
  }

  for (const board of boards) {
    console.log(`\n--- Generating: ${board.name} ---`);
    const result = await generateVisionBoard(board.data, {
      skipGeneration: false,
      costLimit: 1.00
    });
    console.log(`✓ Saved: ${result.filepath}`);
    console.log(`  Cost: $${result.cost.toFixed(2)}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('GENERATION COMPLETE');
  console.log('='.repeat(70));
}

// ============================================================
// CLI HANDLING
// ============================================================

const args = process.argv.slice(2);
const isReal = args.includes('--real');
const boardArg = args.find(a => a.startsWith('--board='));
const specificBoard = boardArg ? boardArg.split('=')[1] : null;

if (isReal) {
  runRealGeneration(specificBoard).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  runLayoutTest().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
