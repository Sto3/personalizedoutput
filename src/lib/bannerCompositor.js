const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { OUTPUT_DIR } = require('../config/constants');

/**
 * Downloads image, applies grain overlay to soften text, and adds title banner.
 *
 * CRITICAL: No resizing, padding, or canvas expansion.
 * The output dimensions must match the input dimensions exactly.
 *
 * Post-processing pipeline:
 * 1. Download image from URL (no modifications)
 * 2. Apply soft grain overlay (suppresses micro-text)
 * 3. Add title banner at TOP EDGE (flush, no padding)
 * 4. Save final image (same dimensions as input)
 *
 * Banner specifications:
 * - Sits flush at the very top edge
 * - Max 10-12% of height
 * - Does NOT push content downward
 * - One line, uppercase, centered
 * - White serif text on semi-transparent charcoal bar
 */

async function addBannerAndSave(imageUrl, title, outputFilename, bannerColor = 'rgba(20, 20, 20, 0.7)') {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Download image
  const tempPath = path.join(OUTPUT_DIR, 'temp_' + Date.now() + '.png');
  await downloadImage(imageUrl, tempPath);

  // Get image dimensions - these will be preserved exactly
  const metadata = await sharp(tempPath).metadata();
  const { width, height } = metadata;

  console.log(`[PostProcess] Input dimensions: ${width}x${height}`);

  // Step 1: Apply grain overlay to soften micro-text
  console.log('[PostProcess] Applying grain overlay to soften text...');

  const grainSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <filter id="grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="mono"/>
          <feComponentTransfer in="mono" result="adjusted">
            <feFuncA type="linear" slope="0.15"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#grain)" fill="white"/>
    </svg>
  `;

  // Apply grain as overlay - NO resizing
  const grainedImage = await sharp(tempPath)
    .composite([{
      input: Buffer.from(grainSvg),
      blend: 'overlay'
    }])
    .toBuffer();

  console.log('[PostProcess] Grain overlay applied');

  // Step 2: Create banner - flush at top edge, 10% height
  const bannerHeight = Math.round(height * 0.10);
  const fontSize = Math.round(bannerHeight * 0.45);

  // Banner SVG - sits AT TOP, overlays the image (does not expand canvas)
  const bannerSvg = `
    <svg width="${width}" height="${bannerHeight}">
      <rect width="100%" height="100%" fill="${bannerColor}"/>
      <text
        x="50%"
        y="55%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}px"
        font-weight="400"
        fill="white"
        letter-spacing="0.2em"
      >${escapeXml(title.toUpperCase())}</text>
    </svg>
  `;

  // Step 3: Composite banner onto grained image at TOP (position 0,0)
  // This overlays on top of existing content - does NOT add padding
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  await sharp(grainedImage)
    .composite([{
      input: Buffer.from(bannerSvg),
      top: 0,
      left: 0
    }])
    .toFile(outputPath);

  // Verify output dimensions match input
  const outputMetadata = await sharp(outputPath).metadata();
  console.log(`[PostProcess] Output dimensions: ${outputMetadata.width}x${outputMetadata.height}`);

  if (outputMetadata.width !== width || outputMetadata.height !== height) {
    console.error('[PostProcess] WARNING: Dimensions changed! This should not happen.');
  }

  // Clean up temp file
  fs.unlinkSync(tempPath);

  console.log('[PostProcess] Banner added at top edge, saved to:', outputPath);
  return outputPath;
}

function downloadImage(url, filepath) {
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

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { addBannerAndSave };
