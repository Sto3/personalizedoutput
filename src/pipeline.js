require('dotenv').config();

const fs = require('fs');
const path = require('path');
const https = require('https');
const { generateVariables } = require('./lib/variableGenerator');
const { assemblePrompt } = require('./lib/promptAssembler');
const { generateImage } = require('./api/dalleClient');
const { checkImageSafety, imageUrlToBase64 } = require('./lib/visionSafetyCheck');
const { addBannerAndSave } = require('./lib/bannerCompositor');
const { filterSymbols, isBlockedSymbol } = require('./lib/sanitizeSymbol');
const { OUTPUT_DIR } = require('./config/constants');

// Configuration
const NORMAL_ATTEMPTS = 7;
const FALLBACK_ATTEMPTS = 4;
const TOTAL_MAX_ATTEMPTS = NORMAL_ATTEMPTS + FALLBACK_ATTEMPTS;

/**
 * Main pipeline: workbook data in, final image out.
 *
 * Strategy:
 * 1. Try up to 7 times with minimal sanitization
 * 2. If still failing, switch to fallback mode (safe defaults only)
 * 3. Try up to 4 more times in fallback mode
 * 4. Total max: 11 attempts
 */
async function generateVisionBoard(workbookData) {
  const startTime = Date.now();
  const timestamp = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log('VISION BOARD GENERATION PIPELINE');
  console.log('='.repeat(60));

  // Step 1: Generate variables with minimal sanitization
  console.log('\n[Step 1] Generating variables (minimal sanitization)...');
  const variables = generateVariables(workbookData);

  // Log symbol processing for observability
  console.log('\n[Symbols] Original:');
  variables._originalSymbols.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('\n[Symbols] After processing (blocked items removed):');
  variables._processedSymbols.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  // Step 2: Assemble the prompt
  console.log('\n[Step 2] Assembling prompt...');
  const prompt = assemblePrompt(variables);

  console.log('\n' + '='.repeat(60));
  console.log('FULL PROMPT BEING SENT TO DALL-E:');
  console.log('='.repeat(60));
  console.log(prompt);
  console.log('='.repeat(60));
  console.log('Prompt length:', prompt.length, 'characters');
  console.log('='.repeat(60) + '\n');

  // Step 3: Generate with normal mode
  console.log('[Step 3] Starting image generation (Normal Mode)...');
  let result = await attemptGeneration(prompt, variables, NORMAL_ATTEMPTS, 'Normal', timestamp);

  // Step 4: If failed, try fallback mode with safe defaults
  if (!result.success) {
    console.log('\n[Step 4] Normal mode failed. Switching to FALLBACK MODE...');
    console.log('[Fallback] Using safe default symbols only...');

    // Use completely safe default symbols
    const safeSymbols = [
      'fresh flowers in a vase',
      'a lit candle with soft glow',
      'a cozy knit blanket',
      'a bowl of fresh fruit',
      'soft ambient lighting',
      'decorative ceramic objects',
      'dried flowers',
      'a potted plant',
      'soft fabric textures',
      'natural wood elements'
    ];

    const fallbackWorkbook = {
      ...workbookData,
      symbols: safeSymbols,
      elementCount: 12
    };

    const fallbackVariables = generateVariables(fallbackWorkbook, { skipSanitization: true });
    const fallbackPrompt = assemblePrompt(fallbackVariables);

    console.log('\n[Fallback] New prompt assembled with safe symbols');
    console.log('[Fallback] Starting fallback generation...');

    result = await attemptGeneration(fallbackPrompt, fallbackVariables, FALLBACK_ATTEMPTS, 'Fallback', timestamp);
  }

  // Step 5: Final result
  const elapsedTime = Date.now() - startTime;

  if (!result.success) {
    console.log('\n' + '='.repeat(60));
    console.log('GENERATION FAILED');
    console.log('='.repeat(60));
    console.log(`Total attempts: ${result.totalAttempts}`);
    console.log(`Last failure reason: ${result.lastReason}`);
    console.log(`Elapsed time: ${elapsedTime}ms`);
    console.log('='.repeat(60));

    return {
      success: false,
      error: 'Failed to generate safe image after ' + result.totalAttempts + ' attempts',
      lastReason: result.lastReason,
      attempts: result.totalAttempts,
      elapsedTime
    };
  }

  // Step 6: Save raw image for review
  console.log('\n[Step 6] Saving raw DALL-E image for review...');
  const rawFilename = `vision-board-${timestamp}-raw.png`;
  const rawPath = await saveRawImage(result.imageUrl, rawFilename);
  console.log(`[Raw Image] Saved to: ${rawPath}`);

  // Step 7: Add banner and save final
  console.log('\n[Step 7] Adding grain overlay and banner...');
  const finalFilename = `vision-board-${timestamp}-final.png`;
  const finalPath = await addBannerAndSave(result.imageUrl, variables.BOARD_TITLE, finalFilename, variables.BANNER_COLOR);

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS!');
  console.log('='.repeat(60));
  console.log(`Raw image (before processing): ${rawPath}`);
  console.log(`Final image (after grain + banner): ${finalPath}`);
  console.log(`Attempts: ${result.totalAttempts}`);
  console.log(`Mode: ${result.mode}`);
  console.log(`Elapsed time: ${elapsedTime}ms`);
  console.log('='.repeat(60));

  return {
    success: true,
    rawPath: rawPath,
    filePath: finalPath,
    variables: variables,
    attempts: result.totalAttempts,
    mode: result.mode,
    elapsedTime
  };
}

/**
 * Save raw image from URL without any processing
 */
async function saveRawImage(imageUrl, filename) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, filename);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Attempt to generate and verify an image multiple times
 */
async function attemptGeneration(prompt, variables, maxAttempts, mode, timestamp) {
  let totalAttempts = 0;
  let lastReason = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    totalAttempts++;
    console.log(`\n[${mode}] Attempt ${attempt}/${maxAttempts}...`);

    try {
      // Generate image with DALL-E
      console.log(`[${mode}] Calling DALL-E...`);
      const imageUrl = await generateImage(prompt);
      console.log(`[${mode}] Image generated, running safety check...`);

      // Convert to base64 and check with Claude Vision
      const base64Image = await imageUrlToBase64(imageUrl);
      const safetyResult = await checkImageSafety(base64Image);

      console.log(`[${mode}] Safety check result: ${safetyResult.pass ? 'PASS' : 'FAIL'}`);
      if (!safetyResult.pass) {
        console.log(`[${mode}] Reason: ${safetyResult.reason}`);
        lastReason = safetyResult.reason;
      }

      if (safetyResult.pass) {
        return {
          success: true,
          imageUrl,
          totalAttempts,
          mode
        };
      }

    } catch (error) {
      console.error(`[${mode}] Error on attempt ${attempt}:`, error.message);
      lastReason = error.message;
    }
  }

  return {
    success: false,
    totalAttempts,
    lastReason,
    mode
  };
}

module.exports = { generateVisionBoard };
