require('dotenv').config();
const { generatePremiumBoardV3 } = require('./src/lib/premiumScrapbookV3');

// EDGE CASE 1: MASCULINE with challenging symbols
// Testing: dark theme, no stickers, Bodoni font, potentially difficult prompts
const masculineExtreme = {
  aesthetic: 'masculine-dark',
  boardTitle: "2025 Empire Building",  // Test apostrophe and mixed case
  themes: ['WEALTH', 'DISCIPLINE', 'LEGACY', 'POWER'],
  symbols: [
    'a luxury leather briefcase on marble',
    'vintage whiskey decanter with crystal glass',
    'high-rise city skyline at night',
    'classic mechanical wristwatch close-up',
    'sports car interior dashboard',
    'chess pieces on wooden board',
    'private jet interior cabin',
    'mountain summit at sunrise',
    'oak library with leather chairs',
    'gold bars stacked neatly',
    'vintage typewriter on desk',
    'cigar and leather journal'
  ]
};

// EDGE CASE 2: RELATIONSHIP with emotional/abstract concepts
// Testing: romantic theme - OBJECTS ONLY, no people prompts
const relationshipExtreme = {
  aesthetic: 'relationship-love',
  boardTitle: "Our Forever Story",
  themes: ['TRUST', 'GROWTH', 'ADVENTURE', 'HOME'],
  symbols: [
    'two coffee cups side by side morning light',
    'two wedding rings on velvet cushion',
    'cozy living room with fireplace and blankets',
    'sunset beach with two pairs of sandals in sand',
    'two wine glasses by crackling fireplace',
    'two hiking backpacks at scenic mountain overlook',
    'romantic dinner table with two place settings candlelight',
    'new home keys with house keychain on doormat',
    'two passports with boarding passes',
    'matching heart pillows on cozy bed',
    'kitchen counter with fresh ingredients and recipe book',
    'picnic blanket with telescope under starry sky'
  ]
};

// EDGE CASE 3: 30 IMAGES stress test
// Testing: max layout capacity, performance, memory, overlapping
const thirtyImageStress = {
  aesthetic: 'feminine-glowup',
  boardTitle: "My Ultimate 2025 Vision",
  themes: ['EVERYTHING', 'ALL AT ONCE', 'MAXIMUM DREAMS'],
  symbols: [
    'sunrise yoga mat', 'green smoothie bowl', 'meditation crystals', 
    'journal with pen', 'fresh flowers vase', 'cozy reading nook',
    'beach vacation view', 'mountain hiking trail', 'city lights night',
    'spa day candles', 'healthy meal prep', 'fitness workout',
    'career laptop desk', 'creative art supplies', 'music headphones',
    'friendship brunch table', 'family photo frames', 'pet cuddles',
    'garden plants growing', 'home decor pillows', 'fashion outfit flat lay',
    'skincare routine products', 'morning coffee ritual', 'evening wine relaxing',
    'bookshelf aesthetic', 'travel suitcase packing', 'sunset golden hour',
    'rainy day window', 'autumn leaves cozy', 'winter snow peaceful'
  ]
};

async function runStressTests() {
  const mode = process.argv[2] || 'layout';
  const skipGen = mode !== '--real';

  console.log('='.repeat(70));
  console.log('STRESS TEST SUITE - ' + (skipGen ? 'LAYOUT ONLY' : 'REAL GENERATION'));
  console.log('='.repeat(70));

  // Test 1: Masculine
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 1: MASCULINE EXTREME');
  console.log('Edge cases: dark theme, no stickers, Bodoni font, apostrophe in title');
  console.log('═'.repeat(70));
  try {
    const r1 = await generatePremiumBoardV3(masculineExtreme, { 
      skipGeneration: skipGen, 
      maxImages: 12,
      costLimit: 1.00 
    });
    console.log('✅ MASCULINE PASSED:', r1.filepath);
  } catch (e) {
    console.log('❌ MASCULINE FAILED:', e.message);
  }

  // Test 2: Relationship
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 2: RELATIONSHIP EXTREME');
  console.log('Edge cases: romantic theme, couple concepts, abstract emotions');
  console.log('═'.repeat(70));
  try {
    const r2 = await generatePremiumBoardV3(relationshipExtreme, { 
      skipGeneration: skipGen, 
      maxImages: 12,
      costLimit: 1.00 
    });
    console.log('✅ RELATIONSHIP PASSED:', r2.filepath);
  } catch (e) {
    console.log('❌ RELATIONSHIP FAILED:', e.message);
  }

  // Test 3: 30 Images
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 3: 30 IMAGE STRESS TEST');
  console.log('Edge cases: max images, layout capacity, memory, overlapping');
  console.log('═'.repeat(70));
  try {
    const r3 = await generatePremiumBoardV3(thirtyImageStress, { 
      skipGeneration: skipGen, 
      maxImages: 30,
      costLimit: 2.00 
    });
    console.log('✅ 30 IMAGES PASSED:', r3.filepath);
  } catch (e) {
    console.log('❌ 30 IMAGES FAILED:', e.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('STRESS TEST COMPLETE');
  console.log('To run with REAL images: node test-stress.js --real');
  console.log('='.repeat(70));
}

runStressTests();
