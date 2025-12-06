require('dotenv').config();

const { generateVisionBoard } = require('./src/lib/visionBoardEngineV8');

// ============================================================
// SAMPLE THOUGHT ORGANIZER OUTPUTS - 10-12 photos each
// ============================================================

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

  // 12 photos for dense layout
  photos: [
    'airplane window view with pink sunset clouds',
    'two iced coffee drinks on cozy cafe table with fairy lights',
    'pink laptop on aesthetic desk with plants and candles',
    'colorful acai bowl with fresh berries and flowers',
    'charming european street with string lights at dusk',
    'pink skincare bottles on marble surface with soft lighting',
    'colorful beaded friendship bracelets on soft pink fabric',
    'lavender sneakers in flower meadow with bokeh',
    'aesthetic planner with sticky notes and roses',
    'golden hour pink purple sunset clouds',
    'cozy rolled blanket with fairy lights twinkling',
    'luxury perfume bottles on elegant vanity display'
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
    decorations: true,
    bokeh: true,
    mood: 'soft pastel dreamy bokeh feminine aesthetic warm golden lighting'
  }
};

const masculineFocusInput = {
  title: "Built Different",
  subtitle: "DISCIPLINE • STRENGTH • LEGACY",

  colors: {
    background: '#1E1E1E',
    accents: ['#8B7355', '#5A5A5A', '#4A6741', '#6B5B4F', '#7A7A7A', '#5A4A3A'],
    banner: '#0F0F0F',
    bannerText: '#E8E4E0',
    bannerSubtext: 'rgba(255,255,255,0.5)'
  },

  photos: [
    'gym weights on dark floor dramatic lighting',
    'morning sunrise over mountain range silhouette',
    'leather journal with fountain pen on dark wood desk',
    'black coffee in ceramic mug steam rising dramatically',
    'running shoes on wet pavement early morning rain',
    'minimalist desk setup with single monitor dark room',
    'chess pieces on board strategic thinking moody light',
    'luxury watch collection on dark velvet display',
    'mountain climber reaching summit at dawn',
    'boxing gloves hanging in dark gym',
    'meditation corner with single candle flame',
    'sports car dashboard at night city lights'
  ],

  quotes: [
    "Discipline is choosing what you want most",
    "The grind never stops"
  ],

  textBlocks: [
    "GRIND",
    "LEGACY",
    "FOCUS"
  ],

  style: {
    decorations: false,
    bokeh: false,
    mood: 'moody dark dramatic editorial masculine sophisticated discipline'
  }
};

const postGradCareerInput = {
  title: "Becoming Who I'm Meant To Be",
  subtitle: "GROWTH • COURAGE • PURPOSE",

  colors: {
    background: '#F5EDE8',
    accents: ['#D4A574', '#8FAA7E', '#E8C4A8', '#7A9BBF', '#C9B896', '#A8C4D4'],
    banner: '#3A3530',
    bannerText: '#F8F4F0',
    bannerSubtext: 'rgba(255,255,255,0.65)'
  },

  photos: [
    'modern city skyline at golden hour sunrise',
    'sleek laptop on minimalist desk with coffee plant',
    'airplane window view above the clouds sunrise',
    'professional workspace with plants natural light',
    'cozy coffee shop corner with open journal',
    'mountain peak at sunrise achievement feeling',
    'open planner with goals written neatly',
    'inspiring bookshelf with design business books',
    'woman hands typing on keyboard workspace',
    'vision board on clean white wall',
    'morning routine aesthetic flat lay',
    'graduation cap with diploma elegant'
  ],

  quotes: [
    "I choose courage over comfort",
    "My story is just beginning",
    "Success looks like freedom"
  ],

  textBlocks: [
    "BECOMING",
    "FEARLESS"
  ],

  style: {
    decorations: false,
    bokeh: true,
    mood: 'warm professional aspirational clean modern sophisticated'
  }
};

const relationshipInput = {
  title: "Our Forever Story",
  subtitle: "LOVE • ADVENTURE • HOME • TOGETHER",

  colors: {
    background: '#FDF5F3',
    accents: ['#E8A598', '#D4978A', '#C4867A', '#F0B8A8', '#DDA090', '#ECBEB0'],
    banner: '#5C3D3D',
    bannerText: '#FFF8F5',
    bannerSubtext: 'rgba(255,255,255,0.65)'
  },

  photos: [
    'two coffee cups touching on sunny cafe table morning',
    'sunset beach with footprints in sand golden hour',
    'cozy living room with fireplace blankets candles',
    'couple bicycles leaning together in autumn park',
    'romantic dinner table with candles flowers wine',
    'travel map with pins marking adventures taken',
    'cozy breakfast in bed tray with flowers croissants',
    'matching rings on soft linen fabric close up',
    'picnic blanket in golden meadow wildflowers',
    'hot air balloons at sunrise romantic',
    'couple hands holding walking path',
    'cozy cabin window with snow outside'
  ],

  quotes: [
    "Home is wherever I'm with you",
    "Our love story is my favorite",
    "Building forever together"
  ],

  textBlocks: [
    "US",
    "ALWAYS"
  ],

  style: {
    decorations: true,
    bokeh: true,
    mood: 'warm romantic golden hour intimate cozy lifestyle love'
  }
};

const wellnessNatureInput = {
  title: "Rooted in Peace",
  subtitle: "BALANCE • NATURE • WELLNESS • STILLNESS",

  colors: {
    background: '#E8E4D8',
    accents: ['#7D8B6A', '#A8B89A', '#9AAA8A', '#6B7A5A', '#B8C8A8', '#8A9A7A'],
    banner: '#3A4030',
    bannerText: '#F4F2EC',
    bannerSubtext: 'rgba(255,255,255,0.6)'
  },

  photos: [
    'morning dew on green leaves closeup sunlight',
    'yoga mat in sunlit room with plants peaceful',
    'herbal tea in ceramic cup wooden table steam',
    'forest trail with sunlight filtering through trees',
    'meditation corner with cushions candles plants',
    'fresh vegetables in woven basket farmers market',
    'calm lake at sunrise with morning mist',
    'journal open in garden setting with pen',
    'succulent garden arrangement in terracotta',
    'rain drops on window with green garden view',
    'handmade ceramic pottery on wooden shelf',
    'wildflowers in mason jar on rustic table'
  ],

  quotes: [
    "I am exactly where I need to be",
    "Growth happens in stillness",
    "Breathe in peace"
  ],

  textBlocks: [
    "BREATHE",
    "BLOOM"
  ],

  style: {
    decorations: true,
    bokeh: true,
    mood: 'natural earthy organic soft sunlight peaceful botanical zen'
  }
};

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function runLayoutTest() {
  console.log('='.repeat(70));
  console.log('VISION BOARD ENGINE V8 - DENSE LAYOUT TEST');
  console.log('='.repeat(70));
  console.log('');
  console.log('V8 IMPROVEMENTS:');
  console.log('  ✓ Dense layout with 10-12 photos (not 8)');
  console.log('  ✓ Quote/text blocks ON TOP of photos (not replacing)');
  console.log('  ✓ Less spacing, more overlap like reference');
  console.log('  ✓ Sophisticated typography:');
  console.log('    - Feminine: Snell Roundhand script');
  console.log('    - Masculine: Bodoni 72 Small Caps');
  console.log('    - Quotes: Cormorant Garamond italic');
  console.log('  ✓ Font selection based on mood');
  console.log('');

  const testInputs = [
    { name: 'Self-Love Glow-Up (Feminine)', data: selfLoveGlowUpInput },
    { name: 'Masculine Focus (Dark)', data: masculineFocusInput },
    { name: 'Post-Grad Career (Professional)', data: postGradCareerInput },
    { name: 'Relationship (Romantic)', data: relationshipInput },
    { name: 'Wellness Nature (Earthy)', data: wellnessNatureInput },
  ];

  const results = [];

  for (const test of testInputs) {
    console.log(`\n--- ${test.name} ---`);
    const result = await generateVisionBoard(test.data, {
      skipGeneration: true,
      costLimit: 1.00
    });
    results.push({ name: test.name, filepath: result.filepath });
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL TESTS COMPLETE');
  console.log('='.repeat(70));
  console.log('\nGenerated:');
  results.forEach(r => console.log(`  ${r.name}: ${r.filepath}`));
  console.log('\nWith real images: node test-visionboard-v8.js --real');
  console.log('Specific board: node test-visionboard-v8.js --real --board=glowup');
}

async function runRealGeneration(specificBoard = null) {
  console.log('='.repeat(70));
  console.log('VISION BOARD V8 - REAL GENERATION');
  console.log('='.repeat(70));

  const allBoards = {
    'glowup': { name: 'Self-Love Glow-Up', data: selfLoveGlowUpInput },
    'masculine': { name: 'Masculine Focus', data: masculineFocusInput },
    'career': { name: 'Post-Grad Career', data: postGradCareerInput },
    'relationship': { name: 'Relationship', data: relationshipInput },
    'wellness': { name: 'Wellness Nature', data: wellnessNatureInput },
  };

  const boards = specificBoard && allBoards[specificBoard]
    ? [allBoards[specificBoard]]
    : Object.values(allBoards);

  for (const board of boards) {
    console.log(`\n--- Generating: ${board.name} ---`);
    const result = await generateVisionBoard(board.data, {
      skipGeneration: false,
      costLimit: 0.50
    });
    console.log(`✓ Saved: ${result.filepath} (Cost: $${result.cost.toFixed(2)})`);
  }
}

// CLI
const args = process.argv.slice(2);
const isReal = args.includes('--real');
const boardArg = args.find(a => a.startsWith('--board='));
const specificBoard = boardArg ? boardArg.split('=')[1] : null;

if (isReal) {
  runRealGeneration(specificBoard).catch(console.error);
} else {
  runLayoutTest().catch(console.error);
}
