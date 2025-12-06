require('dotenv').config();

const { generateVisionBoard } = require('./src/pipeline');

// Test with the EXACT configuration that worked in ChatGPT testing
const testWorkbookData = {
  aesthetic: 'feminine-glowup',
  colors: 'soft pink, peach, lavender, warm cream, soft gold',
  symbols: [
    'pastel skincare bottles on a marble tray',
    'a silk pink scrunchie and gold hair clips',
    'an iced coffee drink with a pastel straw',
    'a bowl of fresh strawberries and kiwi slices',
    'a rose gold laptop with soft lighting',
    'pastel highlighters beside an open planner',
    'a delicate gold necklace on a ceramic dish',
    'soft pink sneakers',
    'a cozy cream knit blanket',
    'an airplane window showing sunset clouds',
    'a lit vanilla candle',
    'fresh pink peonies in a clear vase',
    'a stack of aesthetic coffee table books',
    'a silk eye mask',
    'warm golden fairy lights'
  ],
  elementCount: 18,
  boardTitle: 'MY 2025 GLOW UP'
};

async function runTest() {
  console.log('='.repeat(60));
  console.log('VISION BOARD GENERATION TEST');
  console.log('Using EXACT proven prompt from ChatGPT testing');
  console.log('='.repeat(60));

  try {
    const result = await generateVisionBoard(testWorkbookData);

    if (result.success) {
      console.log('\n✅ SUCCESS!');
      console.log('Image saved to:', result.filePath);
    } else {
      console.log('\n❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

runTest();
