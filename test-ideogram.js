require('dotenv').config();

const fs = require('fs');
const path = require('path');
const https = require('https');
const { generateImage } = require('./src/api/ideogramClient');
const { generateVariables } = require('./src/lib/variableGenerator');
const { assemblePrompt } = require('./src/lib/promptAssembler');
const { OUTPUT_DIR } = require('./src/config/constants');

// Test both aesthetics
const feminineWorkbook = {
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

const masculineWorkbook = {
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

async function downloadImage(url, filepath) {
  // Ideogram returns HTTPS URLs
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function testIdeogram(workbook, name) {
  console.log('\n' + '='.repeat(60));
  console.log(`IDEOGRAM TEST: ${name.toUpperCase()}`);
  console.log('='.repeat(60));

  const variables = generateVariables(workbook);
  const prompt = assemblePrompt(variables);

  console.log('\nPrompt length:', prompt.length, 'characters');
  console.log('\nGenerating with Ideogram...');

  try {
    const startTime = Date.now();
    const imageUrl = await generateImage(prompt);
    const elapsed = Date.now() - startTime;

    console.log(`Generated in ${elapsed}ms`);

    // Save the image
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `ideogram-${name}-${timestamp}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await downloadImage(imageUrl, filepath);
    console.log(`Saved to: ${filepath}`);

    return { success: true, filepath };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('IDEOGRAM API TEST');
  console.log('Comparing with DALL-E outputs');
  console.log('='.repeat(60));

  // Test feminine first
  const feminineResult = await testIdeogram(feminineWorkbook, 'feminine');

  // Test masculine
  const masculineResult = await testIdeogram(masculineWorkbook, 'masculine');

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log('Feminine:', feminineResult.success ? feminineResult.filepath : feminineResult.error);
  console.log('Masculine:', masculineResult.success ? masculineResult.filepath : masculineResult.error);
}

main();
