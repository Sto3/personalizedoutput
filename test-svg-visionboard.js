require('dotenv').config();

const { generateSVGVisionBoard } = require('./src/lib/svgVisionBoard');

// Test feminine aesthetic
const feminineWorkbook = {
  aesthetic: 'feminine-glowup',
  boardTitle: 'MY 2025 GLOW UP',
  symbols: [
    'pastel skincare bottles',
    'iced coffee drink',
    'fresh strawberries',
    'rose gold laptop',
    'planner',
    'gold necklace',
    'pink sneakers',
    'cozy blanket',
    'airplane travel',
    'vanilla candle',
    'pink peonies',
    'coffee table books',
    'fairy lights',
    'camera'
  ]
};

// Test masculine aesthetic
const masculineWorkbook = {
  aesthetic: 'masculine-editorial',
  boardTitle: 'MY 2025 EMPIRE',
  symbols: [
    'leather journal',
    'luxury watch',
    'cognac briefcase',
    'dress shoes',
    'brass desk lamp',
    'black laptop',
    'vintage compass',
    'cityscape',
    'suit jacket',
    'gold cufflinks',
    'snake plant',
    'business books',
    'black coffee',
    'sunglasses'
  ]
};

async function runTests() {
  console.log('='.repeat(60));
  console.log('SVG VISION BOARD TESTS');
  console.log('No AI generation - pure programmatic SVG');
  console.log('='.repeat(60));

  // Test feminine
  console.log('\n--- FEMININE TEST ---');
  const feminineResult = await generateSVGVisionBoard(feminineWorkbook);
  console.log('Feminine result:', feminineResult.filepath);

  // Test masculine
  console.log('\n--- MASCULINE TEST ---');
  const masculineResult = await generateSVGVisionBoard(masculineWorkbook);
  console.log('Masculine result:', masculineResult.filepath);

  console.log('\n' + '='.repeat(60));
  console.log('TESTS COMPLETE');
  console.log('='.repeat(60));
}

runTests();
