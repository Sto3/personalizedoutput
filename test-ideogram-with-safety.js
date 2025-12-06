require('dotenv').config();

const fs = require('fs');
const path = require('path');
const https = require('https');
const { generateImage } = require('./src/api/ideogramClient');
const { generateVariables } = require('./src/lib/variableGenerator');
const { assemblePrompt } = require('./src/lib/promptAssembler');
const { checkImageSafety } = require('./src/lib/visionSafetyCheck');
const { OUTPUT_DIR } = require('./src/config/constants');

const MAX_ATTEMPTS = 5;

// Test workbook
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

async function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function saveImage(url, filepath) {
  const buffer = await downloadToBuffer(url);
  fs.writeFileSync(filepath, buffer);
  return buffer;
}

async function testWithSafety() {
  console.log('='.repeat(60));
  console.log('IDEOGRAM + CLAUDE VISION SAFETY TEST');
  console.log('='.repeat(60));

  const variables = generateVariables(feminineWorkbook);
  const prompt = assemblePrompt(variables);

  console.log('\nPrompt length:', prompt.length, 'characters');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n[Attempt ${attempt}/${MAX_ATTEMPTS}]`);
    console.log('Generating with Ideogram...');

    try {
      const startTime = Date.now();
      const imageUrl = await generateImage(prompt);
      const genTime = Date.now() - startTime;
      console.log(`Generated in ${genTime}ms`);

      // Download and convert to base64 for safety check
      console.log('Running Claude Vision safety check...');
      const buffer = await downloadToBuffer(imageUrl);
      const base64Image = buffer.toString('base64');

      const safetyResult = await checkImageSafety(base64Image);
      console.log(`Safety check: ${safetyResult.pass ? 'PASS' : 'FAIL'}`);

      if (!safetyResult.pass) {
        console.log(`Reason: ${safetyResult.reason}`);

        // Save failed image for review
        const failedPath = path.join(OUTPUT_DIR, `ideogram-failed-${attempt}-${Date.now()}.png`);
        fs.writeFileSync(failedPath, buffer);
        console.log(`Failed image saved to: ${failedPath}`);
        continue;
      }

      // Safety passed - save final image
      const timestamp = Date.now();
      const filepath = path.join(OUTPUT_DIR, `ideogram-safe-${timestamp}.png`);
      fs.writeFileSync(filepath, buffer);

      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS!');
      console.log('='.repeat(60));
      console.log(`Attempts: ${attempt}`);
      console.log(`Final image: ${filepath}`);
      return { success: true, filepath, attempts: attempt };

    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('FAILED - Max attempts reached');
  console.log('='.repeat(60));
  return { success: false, attempts: MAX_ATTEMPTS };
}

testWithSafety();
