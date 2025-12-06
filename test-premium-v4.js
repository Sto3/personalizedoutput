require('dotenv').config();

const { generatePremiumBoardV4 } = require('./src/lib/premiumScrapbookV4');

// Test workbook data matching the reference image style
const feminineWorkbook = {
  aesthetic: 'feminine-glowup',
  boardTitle: 'MY BIG 2025 GLOW-UP VISION',
  themes: ['SELF-LOVE', 'FRIENDSHIPS', 'TRAVEL', 'CREATIVITY', 'ACADEMICS'],
  symbols: [
    'two iced coffee drinks with straws on a cafe table',
    'a pink laptop on a desk with sunset sky wallpaper',
    'an airplane window view showing wing and clouds at sunset',
    'a colorful acai bowl with fresh fruit and berries',
    'a cozy city street with warm string lights at night',
    'pastel pink skincare bottles on a fluffy white towel',
    'colorful friendship bracelets scattered on pink background',
    'a spiral notebook with pastel sticky notes',
    'lavender purple sneakers on pink background',
    'colorful felt tip markers and pens scattered artistically',
    'a dreamy pink and purple sunset sky with clouds',
    'a cozy knit blanket with fairy lights'
  ]
};

const masculineWorkbook = {
  aesthetic: 'masculine-dark',
  boardTitle: 'MY 2025 ARTIST ERA',
  themes: ['COLOR', 'IDENTITY', 'CONFIDENCE'],
  symbols: [
    'abstract colorful paint splatter on black canvas',
    'professional DSLR camera with lens on dark wood table',
    'modern minimalist workspace with black desk and plants',
    'vintage vinyl records stacked artistically',
    'sleek black sneakers on concrete background',
    'artistic black and white portrait photography',
    'modern abstract sculpture in dark gallery',
    'professional graphic design workspace with multiple monitors',
    'urban street art graffiti wall',
    'minimalist black leather journal with gold pen',
    'modern architecture with bold geometric shapes',
    'professional studio lighting equipment'
  ]
};

const relationshipWorkbook = {
  aesthetic: 'relationship-love',
  boardTitle: 'OUR FOREVER STORY',
  themes: ['LOVE', 'ADVENTURE', 'DREAMS', 'TOGETHER'],
  symbols: [
    'two hands holding with intertwined fingers',
    'sunset beach with footprints in sand',
    'cozy coffee date with two mugs steaming',
    'polaroid photos scattered showing happy moments',
    'couple watching sunset from mountain overlook',
    'romantic dinner table with candles and flowers',
    'two bicycles leaning together in a park',
    'shared journal with pressed flowers inside',
    'matching couple bracelets on wrists',
    'romantic city skyline at twilight',
    'couple dancing under string lights',
    'handwritten love letters tied with ribbon'
  ]
};

async function runTest() {
  console.log('='.repeat(60));
  console.log('PREMIUM SCRAPBOOK V4 TEST');
  console.log('Enhanced with 15% improvements:');
  console.log('- 40% more torn paper layers (36 total)');
  console.log('- Increased rotation variance (±12° instead of ±8°)');
  console.log('- 3 decorative washi tape strips across canvas');
  console.log('- 5 crinkled paper texture overlays');
  console.log('- Enhanced shadow depths');
  console.log('- More chaotic placement and overlapping');
  console.log('='.repeat(60));

  // First, test layout with placeholders (no API cost)
  console.log('\n--- LAYOUT TEST (No API calls) ---\n');

  console.log('Testing feminine aesthetic...');
  const feminineLayout = await generatePremiumBoardV4(feminineWorkbook, {
    costLimit: 1.00,
    skipGeneration: true // Use colored placeholders
  });
  console.log('✓ Feminine layout saved to:', feminineLayout.filepath);

  console.log('\nTesting masculine aesthetic...');
  const masculineLayout = await generatePremiumBoardV4(masculineWorkbook, {
    costLimit: 1.00,
    skipGeneration: true
  });
  console.log('✓ Masculine layout saved to:', masculineLayout.filepath);

  console.log('\nTesting relationship aesthetic...');
  const relationshipLayout = await generatePremiumBoardV4(relationshipWorkbook, {
    costLimit: 1.00,
    skipGeneration: true
  });
  console.log('✓ Relationship layout saved to:', relationshipLayout.filepath);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('LAYOUT TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nCheck the outputs folder to compare V4 improvements:');
  console.log('- More chaotic, less grid-like layout');
  console.log('- More paper texture layers visible');
  console.log('- Enhanced washi tape decoration');
  console.log('- Better depth and overlapping');
  console.log('\nTo generate with real Ideogram images, run:');
  console.log('  node test-premium-v4.js --real');
  console.log('\nEstimated cost per board: $' + (feminineWorkbook.symbols.length * 0.025).toFixed(2));
}

async function runRealGeneration() {
  console.log('='.repeat(60));
  console.log('PREMIUM SCRAPBOOK V4 - REAL GENERATION');
  console.log('Using Ideogram Turbo API');
  console.log('='.repeat(60));

  const workbooks = [
    { name: 'Feminine', data: feminineWorkbook },
    { name: 'Masculine', data: masculineWorkbook },
    { name: 'Relationship', data: relationshipWorkbook }
  ];

  for (const wb of workbooks) {
    console.log(`\n--- Generating ${wb.name} Board ---`);
    const result = await generatePremiumBoardV4(wb.data, {
      costLimit: 1.00,
      skipGeneration: false // Real API calls
    });
    console.log(`✓ ${wb.name} board saved to:`, result.filepath);
    console.log(`  Cost: $${result.cost.toFixed(2)}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('ALL BOARDS GENERATED SUCCESSFULLY');
  console.log('='.repeat(60));
}

// Check command line args
if (process.argv.includes('--real')) {
  runRealGeneration().catch(err => {
    console.error('Error during real generation:', err);
    process.exit(1);
  });
} else {
  runTest().catch(err => {
    console.error('Error during layout test:', err);
    process.exit(1);
  });
}
