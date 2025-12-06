require('dotenv').config();

const { generateFlatLayV5 } = require('./src/lib/premiumFlatLayV5');

// Sophisticated workbook data matching the reference aesthetic
const darkEditorialWorkbook = {
  aesthetic: 'dark-editorial',
  boardTitle: 'MY 2025 ARTIST ERA',
  themes: ['COLOR', 'IDENTITY', 'CONFIDENCE'],
  symbols: [
    'airplane wing view through window at golden hour sunset',
    'vintage leather keychain with brass keys on dark slate',
    'modern abstract sculpture in matte black ceramic',
    'luxury wristwatch with mesh band on dark surface',
    'leather bound journal with gold pen',
    'sleek laptop on dark wood desk',
    'skyline cityscape at dusk with warm lights',
    'black ceramic coffee mug with steam',
    'succulent plant in dark concrete pot',
    'stacked zen stones in matte black',
    'brass compass on aged leather',
    'lit candle with warm glow on dark background'
  ]
};

const warmNoirWorkbook = {
  aesthetic: 'warm-noir',
  boardTitle: 'THE JOURNEY AHEAD',
  themes: ['ADVENTURE', 'GROWTH', 'PURPOSE'],
  symbols: [
    'vintage camera with leather strap',
    'old world map with compass',
    'leather travel journal with stamps',
    'antique pocket watch on wood',
    'worn hiking boots on stone',
    'hot coffee in ceramic mug',
    'mountain peak at sunrise',
    'vintage binoculars on leather',
    'brass telescope on dark wood',
    'weathered leather satchel',
    'old photographs scattered artistically',
    'candle lantern with warm glow'
  ]
};

const coolSlateWorkbook = {
  aesthetic: 'cool-slate',
  boardTitle: 'FOCUS & FLOW',
  themes: ['CLARITY', 'PRECISION', 'EXCELLENCE'],
  symbols: [
    'minimalist desk setup with monitor',
    'sleek wireless headphones on marble',
    'modern fountain pen on paper',
    'geometric paperweight on desk',
    'clean white notebook open',
    'simple desk plant in white pot',
    'modern desk lamp illuminated',
    'neat stack of design books',
    'minimalist clock on wall',
    'clean workspace with keyboard',
    'simple water glass on coaster',
    'modern sculpture in white ceramic'
  ]
};

async function runTest() {
  console.log('='.repeat(60));
  console.log('FLAT-LAY V5 TEST - Sophisticated Editorial Style');
  console.log('='.repeat(60));
  console.log('');
  console.log('Design principles:');
  console.log('- Dark, moody base (not pastel)');
  console.log('- Mix of polaroids + loose objects');
  console.log('- Subtle torn paper background only');
  console.log('- Small bronze/gold square accents');
  console.log('- Clean serif typography (no script)');
  console.log('- Professional editorial aesthetic');
  console.log('');

  // Test with placeholders (no API cost)
  console.log('--- LAYOUT TEST (No API calls) ---\n');

  console.log('Testing dark-editorial aesthetic...');
  const darkResult = await generateFlatLayV5(darkEditorialWorkbook, {
    costLimit: 1.00,
    skipGeneration: true
  });
  console.log('✓ Dark editorial saved to:', darkResult.filepath);

  console.log('\nTesting warm-noir aesthetic...');
  const warmResult = await generateFlatLayV5(warmNoirWorkbook, {
    costLimit: 1.00,
    skipGeneration: true
  });
  console.log('✓ Warm noir saved to:', warmResult.filepath);

  console.log('\nTesting cool-slate aesthetic...');
  const coolResult = await generateFlatLayV5(coolSlateWorkbook, {
    costLimit: 1.00,
    skipGeneration: true
  });
  console.log('✓ Cool slate saved to:', coolResult.filepath);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('LAYOUT TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nCompare these to the previous V4 outputs:');
  console.log('- Darker, more sophisticated base');
  console.log('- Mix of framed polaroids and loose items');
  console.log('- Clean title typography');
  console.log('- Subtle gold accents');
  console.log('\nTo generate with real Ideogram images:');
  console.log('  node test-flatlay-v5.js --real');
  console.log('\nEstimated cost per board: $' + (darkEditorialWorkbook.symbols.length * 0.025).toFixed(2));
}

async function runRealGeneration() {
  console.log('='.repeat(60));
  console.log('FLAT-LAY V5 - REAL GENERATION');
  console.log('Using Ideogram Turbo API');
  console.log('='.repeat(60));

  const workbooks = [
    { name: 'Dark Editorial', data: darkEditorialWorkbook },
    { name: 'Warm Noir', data: warmNoirWorkbook },
    { name: 'Cool Slate', data: coolSlateWorkbook }
  ];

  for (const wb of workbooks) {
    console.log(`\n--- Generating ${wb.name} Board ---`);
    const result = await generateFlatLayV5(wb.data, {
      costLimit: 1.00,
      skipGeneration: false
    });
    console.log(`✓ ${wb.name} saved to:`, result.filepath);
    console.log(`  Cost: $${result.cost.toFixed(2)}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('ALL BOARDS GENERATED');
  console.log('='.repeat(60));
}

// Check command line args
if (process.argv.includes('--real')) {
  runRealGeneration().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  runTest().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
