require('dotenv').config();

const { generateHybridVisionBoard } = require('./src/lib/hybridCollageCompositor');

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

async function runTest() {
  console.log('='.repeat(60));
  console.log('HYBRID VISION BOARD TEST');
  console.log('='.repeat(60));

  // First, test layout with placeholders (no API cost)
  console.log('\n--- LAYOUT TEST (No API calls) ---\n');
  const layoutResult = await generateHybridVisionBoard(feminineWorkbook, {
    costLimit: 1.00,
    skipGeneration: true // Use colored placeholders
  });
  console.log('Layout test saved to:', layoutResult.filepath);

  // Ask user if they want to proceed with real generation
  console.log('\n--- READY FOR REAL GENERATION ---');
  console.log('The layout test is complete. Check the output.');
  console.log('To generate with real Ideogram images, run:');
  console.log('  node test-hybrid-board.js --real');
  console.log('Estimated cost: $' + (feminineWorkbook.symbols.length * 0.025).toFixed(2));
}

async function runRealGeneration() {
  console.log('='.repeat(60));
  console.log('HYBRID VISION BOARD - REAL GENERATION');
  console.log('Using Ideogram Turbo API');
  console.log('='.repeat(60));

  const result = await generateHybridVisionBoard(feminineWorkbook, {
    costLimit: 1.00,
    skipGeneration: false // Real API calls
  });

  console.log('\nFinal result:', result.filepath);
  console.log('Total cost: $' + result.cost.toFixed(2));
}

// Check command line args
if (process.argv.includes('--real')) {
  runRealGeneration();
} else {
  runTest();
}
