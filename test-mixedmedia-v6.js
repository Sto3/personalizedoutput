require('dotenv').config();

const { generateMixedMediaBoard, THEMES } = require('./src/lib/mixedMediaBoardV6');

// ============================================================
// WORKBOOK DATA FOR EACH THEME
// ============================================================

const feminineSoftWorkbook = {
  theme: 'feminine-soft',
  boardTitle: 'My Big 2025 Glow-Up Vision',
  themes: ['SELF-LOVE', 'FRIENDSHIPS', 'TRAVEL', 'CREATIVITY', 'WELLNESS'],
  symbols: [
    'airplane window view with pink sunset clouds',
    'two iced coffee drinks with cream swirls on cozy table',
    'pink laptop on aesthetic desk with plants',
    'colorful acai bowl with fresh berries and flowers',
    'charming european street with string lights at dusk',
    'pink skincare bottles arranged on marble surface',
    'colorful beaded friendship bracelets on soft fabric',
    'lavender sneakers in a flower meadow',
    'aesthetic planner with sticky notes and roses',
    'golden hour sunset with pink and purple clouds',
    'cozy rolled blanket with fairy lights',
    'luxury perfume bottles on elegant display'
  ]
};

const masculineDarkWorkbook = {
  theme: 'masculine-dark',
  boardTitle: 'My 2025 Artist Era',
  themes: ['COLOR', 'IDENTITY', 'CONFIDENCE'],
  symbols: [
    'airplane wing at golden hour through window',
    'vintage leather keychain with brass keys on dark slate',
    'abstract black ceramic sculpture on dark surface',
    'luxury watch with leather band on dark wood',
    'leather journal with gold pen on desk',
    'sleek laptop on dark minimalist desk',
    'city skyline silhouette at dusk',
    'matte black coffee mug with steam',
    'succulent in concrete pot on dark surface',
    'stacked zen stones matte black finish',
    'brass compass on aged leather',
    'candle with warm glow in dark room'
  ]
};

const masculineMinimalWorkbook = {
  theme: 'masculine-minimal',
  boardTitle: 'Focus and Flow',
  themes: ['CLARITY', 'PRECISION', 'EXCELLENCE'],
  symbols: [
    'minimalist desk setup with single monitor',
    'sleek wireless headphones on white marble',
    'modern fountain pen on blank paper',
    'geometric brass paperweight',
    'clean white notebook opened',
    'single green plant in white ceramic pot',
    'modern desk lamp with warm light',
    'stack of design books spine view',
    'minimalist wall clock',
    'clean keyboard on white desk',
    'glass of water on stone coaster',
    'white ceramic sculpture modern art'
  ]
};

const romanticWarmWorkbook = {
  theme: 'romantic-warm',
  boardTitle: 'Our Forever Story',
  themes: ['LOVE', 'ADVENTURE', 'DREAMS', 'TOGETHER'],
  symbols: [
    'two coffee cups touching on cafe table',
    'sunset beach with footprints in sand',
    'polaroid photos scattered showing happy moments',
    'couple bicycles leaning together in park',
    'romantic dinner candles and flowers',
    'shared journal with pressed flowers',
    'matching bracelets on wrists',
    'picnic blanket in golden meadow',
    'two wine glasses clinking at sunset',
    'love letters tied with ribbon',
    'cozy blanket by fireplace',
    'hot air balloon at sunrise'
  ]
};

const natureEarthWorkbook = {
  theme: 'nature-earth',
  boardTitle: 'Rooted in Growth',
  themes: ['NATURE', 'BALANCE', 'WELLNESS', 'PEACE'],
  symbols: [
    'morning dew on green leaves closeup',
    'hiking trail through forest',
    'ceramic tea cup with steam in garden',
    'fresh herbs in terracotta pots',
    'yoga mat in sunlit room with plants',
    'wooden bowl with fresh fruit',
    'mountain lake reflection at dawn',
    'journal on wooden table with coffee',
    'succulent garden arrangement',
    'rain drops on window with green view',
    'handmade ceramic pottery on shelf',
    'wildflowers in mason jar'
  ]
};

const oceanCalmWorkbook = {
  theme: 'ocean-calm',
  boardTitle: 'Tides of Change',
  themes: ['SERENITY', 'FLOW', 'FREEDOM', 'DEPTH'],
  symbols: [
    'calm ocean waves at sunrise',
    'seashells arranged on sandy beach',
    'sailboat on peaceful blue water',
    'beach towel with sunglasses and book',
    'lighthouse at golden hour',
    'coastal cliff with wildflowers',
    'surfboard leaning on beach fence',
    'tide pool with colorful sea life',
    'hammock between palm trees',
    'pier extending into calm water',
    'beach bonfire at dusk',
    'sea glass collection on driftwood'
  ]
};

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function runLayoutTest() {
  console.log('='.repeat(70));
  console.log('MIXED MEDIA BOARD V6 - LAYOUT TEST');
  console.log('='.repeat(70));
  console.log('');
  console.log('KEY IMPROVEMENTS:');
  console.log('✓ Clean serif typography (Didot/Bodoni) - NO script fonts');
  console.log('✓ Mixed image styles (photo, illustration, 3D, flat-lay)');
  console.log('✓ Theme-appropriate decorations (none for masculine)');
  console.log('✓ Organic polaroid layout with realistic shadows');
  console.log('✓ Subtle colored accent rectangles');
  console.log('✓ Soft bokeh effects (intensity varies by theme)');
  console.log('');
  console.log('THEMES AVAILABLE:');
  Object.keys(THEMES).forEach(key => {
    console.log(`  - ${key}: ${THEMES[key].name}`);
  });
  console.log('');

  const workbooks = [
    { name: 'Feminine Soft', data: feminineSoftWorkbook },
    { name: 'Masculine Dark', data: masculineDarkWorkbook },
    { name: 'Masculine Minimal', data: masculineMinimalWorkbook },
    { name: 'Romantic Warm', data: romanticWarmWorkbook },
    { name: 'Nature Earth', data: natureEarthWorkbook },
    { name: 'Ocean Calm', data: oceanCalmWorkbook },
  ];

  const results = [];

  for (const wb of workbooks) {
    console.log(`\n--- Testing: ${wb.name} ---`);
    const result = await generateMixedMediaBoard(wb.data, {
      costLimit: 1.00,
      skipGeneration: true
    });
    results.push({ name: wb.name, filepath: result.filepath });
    console.log(`✓ Saved: ${result.filepath}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL LAYOUT TESTS COMPLETE');
  console.log('='.repeat(70));
  console.log('\nGenerated files:');
  results.forEach(r => console.log(`  ${r.name}: ${r.filepath}`));
  console.log('\nTo generate with real Ideogram images:');
  console.log('  node test-mixedmedia-v6.js --real');
  console.log('\nTo generate a specific theme:');
  console.log('  node test-mixedmedia-v6.js --real --theme=masculine-dark');
}

async function runRealGeneration(specificTheme = null) {
  console.log('='.repeat(70));
  console.log('MIXED MEDIA BOARD V6 - REAL GENERATION');
  console.log('Using Ideogram Turbo API');
  console.log('='.repeat(70));

  const allWorkbooks = [
    { name: 'Feminine Soft', data: feminineSoftWorkbook },
    { name: 'Masculine Dark', data: masculineDarkWorkbook },
    { name: 'Masculine Minimal', data: masculineMinimalWorkbook },
    { name: 'Romantic Warm', data: romanticWarmWorkbook },
    { name: 'Nature Earth', data: natureEarthWorkbook },
    { name: 'Ocean Calm', data: oceanCalmWorkbook },
  ];

  const workbooks = specificTheme
    ? allWorkbooks.filter(wb => wb.data.theme === specificTheme)
    : allWorkbooks;

  if (workbooks.length === 0) {
    console.log(`Theme "${specificTheme}" not found.`);
    console.log('Available themes:', Object.keys(THEMES).join(', '));
    return;
  }

  for (const wb of workbooks) {
    console.log(`\n--- Generating: ${wb.name} ---`);
    const result = await generateMixedMediaBoard(wb.data, {
      costLimit: 1.00,
      skipGeneration: false
    });
    console.log(`✓ ${wb.name} saved: ${result.filepath}`);
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
const themeArg = args.find(a => a.startsWith('--theme='));
const specificTheme = themeArg ? themeArg.split('=')[1] : null;

if (isReal) {
  runRealGeneration(specificTheme).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  runLayoutTest().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
