require('dotenv').config();

const { generatePremiumBoardV3 } = require('./src/lib/premiumScrapbookV3');

const feminineWorkbook = {
  aesthetic: 'feminine-glowup',
  boardTitle: 'My Big 2025 Glow-Up Vision',  // Natural case for elegant script
  themes: ['SELF-LOVE', 'FRIENDSHIPS', 'TRAVEL', 'CREATIVITY', 'WELLNESS'],
  symbols: [
    'two iced coffee drinks with straws',
    'a pink laptop with sunset wallpaper',
    'an airplane window view at sunset',
    'a colorful acai bowl with fresh fruit',
    'a cozy city street with string lights',
    'pastel pink skincare bottles',
    'colorful friendship bracelets',
    'a spiral notebook with sticky notes',
    'lavender purple sneakers',
    'colorful markers and pens',
    'a pink and purple sunset sky',
    'a cozy blanket with fairy lights'
  ]
};

async function runTest() {
  console.log('='.repeat(60));
  console.log('PREMIUM VISION BOARD V3 TEST');
  console.log('='.repeat(60));

  // Test layout first with placeholders
  console.log('\n--- LAYOUT TEST (No API calls) ---\n');
  const layoutResult = await generatePremiumBoardV3(feminineWorkbook, {
    costLimit: 1.00,
    skipGeneration: true
  });
  console.log('\nLayout saved to:', layoutResult.filepath);

  console.log('\n--- READY FOR REAL GENERATION ---');
  console.log('To generate with real images, run:');
  console.log('  node test-premium-v3.js --real');
  console.log('Est. cost: $' + (feminineWorkbook.symbols.length * 0.025).toFixed(2));
}

async function runReal() {
  console.log('='.repeat(60));
  console.log('PREMIUM VISION BOARD V3 - REAL GENERATION');
  console.log('='.repeat(60));

  const result = await generatePremiumBoardV3(feminineWorkbook, {
    costLimit: 1.00,
    skipGeneration: false
  });

  console.log('\nFinal result:', result.filepath);
  console.log('Total cost: $' + result.cost.toFixed(2));
}

if (process.argv.includes('--real')) {
  runReal();
} else {
  runTest();
}
