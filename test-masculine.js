require('dotenv').config();

const { generateVisionBoard } = require('./src/pipeline');

// Masculine editorial vision board - bold, ambitious, refined
const testWorkbookData = {
  aesthetic: 'masculine-editorial',
  colors: 'charcoal, navy, warm gray, cognac brown, matte black, brushed gold',
  symbols: [
    'a leather-bound journal on a dark wood desk',
    'a matte black luxury watch',
    'a cognac leather briefcase',
    'polished dress shoes on dark concrete',
    'architectural blueprints rolled up',
    'a brass desk lamp with warm light',
    'a sleek black laptop',
    'a crystal whiskey glass (empty, for aesthetic only)',
    'a vintage compass on aged paper',
    'high-rise cityscape through floor-to-ceiling windows',
    'a tailored navy suit jacket on a wooden hanger',
    'brushed gold cufflinks on marble',
    'a potted snake plant in a matte black planter',
    'stacked hardcover books on business strategy',
    'a minimalist black coffee mug'
  ],
  elementCount: 18,
  boardTitle: 'MY 2025 EMPIRE'
};

async function runTest() {
  console.log('='.repeat(60));
  console.log('MASCULINE EDITORIAL VISION BOARD TEST');
  console.log('Testing configurable banner colors');
  console.log('='.repeat(60));

  try {
    const result = await generateVisionBoard(testWorkbookData);

    if (result.success) {
      console.log('\n SUCCESS!');
      console.log('Raw image:', result.rawPath);
      console.log('Final image:', result.filePath);
      console.log('Aesthetic:', result.variables._aesthetic);
      console.log('Banner color:', result.variables.BANNER_COLOR);
    } else {
      console.log('\n FAILED:', result.error);
    }
  } catch (error) {
    console.error('\n ERROR:', error.message);
    console.error(error.stack);
  }
}

runTest();
