/**
 * Hybrid Collage Compositor
 *
 * Creates Pinterest-style vision board collages by:
 * 1. Generating individual polaroid photos via Ideogram API
 * 2. Compositing them with Sharp.js into a layered collage
 * 3. Adding decorative elements (torn edges, washi tape, stickers, confetti)
 *
 * Target: Match the quality of premium Pinterest mood boards
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { generateImage } = require('../api/ideogramClient');
const { OUTPUT_DIR } = require('../config/constants');

// Canvas dimensions (portrait, like reference image)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1440;

// Cost tracking
const COST_PER_IMAGE = 0.025; // Ideogram Turbo

/**
 * Color palettes for different aesthetics
 */
const PALETTES = {
  'feminine-glowup': {
    background: '#FFE4EC',
    accents: ['#FFB6C1', '#DDA0DD', '#87CEEB', '#FFD700', '#98FB98', '#FFA07A'],
    washiTape: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFDAB9', '#98FB98'],
    confetti: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFD700', '#98FB98', '#FFA07A', '#F0E68C'],
    bannerBg: 'rgba(40, 35, 38, 0.85)',
    bannerText: '#FFFFFF'
  },
  'masculine-editorial': {
    background: '#2C3E50',
    accents: ['#D4A574', '#708090', '#B8860B', '#4A5568', '#C0C0C0'],
    washiTape: ['#D4A574', '#708090', '#4A5568', '#8B7355'],
    confetti: ['#D4A574', '#B8860B', '#708090', '#C0C0C0', '#8B7355'],
    bannerBg: 'rgba(25, 30, 35, 0.9)',
    bannerText: '#FFFFFF'
  },
  'neutral-minimal': {
    background: '#FAF9F6',
    accents: ['#D2B48C', '#DEB887', '#C4A484', '#A0522D', '#8B7355'],
    washiTape: ['#D2B48C', '#DEB887', '#E8DCC4', '#C4A484'],
    confetti: ['#D2B48C', '#DEB887', '#C4A484', '#F5DEB3', '#E8DCC4'],
    bannerBg: 'rgba(60, 55, 50, 0.8)',
    bannerText: '#FFFFFF'
  }
};

/**
 * Prompts for generating individual polaroid images
 * Each prompt creates a single cohesive photo that fits in a polaroid frame
 */
function buildPolaroidPrompt(symbol, aesthetic) {
  const styleGuide = {
    'feminine-glowup': 'soft pastel colors, dreamy lighting, gentle bokeh, warm tones, aesthetic lifestyle photography',
    'masculine-editorial': 'moody lighting, rich textures, dark tones, sophisticated, editorial photography',
    'neutral-minimal': 'soft natural light, beige and cream tones, minimal aesthetic, cozy warm feeling'
  };

  const style = styleGuide[aesthetic] || styleGuide['feminine-glowup'];

  return `A single aesthetic polaroid-style photograph of ${symbol}. ${style}. Centered composition, no people, no faces, no hands, no text, no logos, no watermarks. Clean simple background that complements the subject. High quality lifestyle photography.`;
}

/**
 * Generate a single polaroid image using Ideogram
 */
async function generatePolaroidImage(symbol, aesthetic, index) {
  const prompt = buildPolaroidPrompt(symbol, aesthetic);

  console.log(`[Polaroid ${index + 1}] Generating: "${symbol.substring(0, 40)}..."`);

  try {
    const imageUrl = await generateImage(prompt, {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1' // Square for polaroid
    });

    // Download the image
    const buffer = await downloadImageToBuffer(imageUrl);
    console.log(`[Polaroid ${index + 1}] Generated successfully`);

    return buffer;
  } catch (error) {
    console.error(`[Polaroid ${index + 1}] Error:`, error.message);
    return null;
  }
}

/**
 * Download image URL to buffer
 */
function downloadImageToBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Create polaroid frame effect around an image
 */
async function createPolaroidFrame(imageBuffer, size = 280) {
  const frameWidth = size;
  const frameHeight = size + 40; // Extra space at bottom for polaroid look
  const imageSize = size - 20; // Image slightly smaller than frame
  const padding = 10;

  // Resize the image
  const resizedImage = await sharp(imageBuffer)
    .resize(imageSize, imageSize, { fit: 'cover' })
    .toBuffer();

  // Create white frame with shadow
  const frameSvg = `
    <svg width="${frameWidth + 20}" height="${frameHeight + 20}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="4" stdDeviation="5" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="10" y="10" width="${frameWidth}" height="${frameHeight}"
            fill="white" rx="2" filter="url(#shadow)"/>
    </svg>
  `;

  // Composite image onto frame
  const frame = await sharp(Buffer.from(frameSvg))
    .composite([{
      input: resizedImage,
      top: padding + 10,
      left: padding + 10
    }])
    .png()
    .toBuffer();

  return frame;
}

/**
 * Create torn paper edge effect
 */
function createTornEdgeMask(width, height) {
  // Generate random torn edge path
  let topEdge = 'M0 8 ';
  let bottomEdge = `L${width} ${height - 8} `;

  for (let x = 0; x <= width; x += 15) {
    const yOffset = Math.random() * 6;
    topEdge += `L${x} ${5 + yOffset} `;
  }

  topEdge += `L${width} 8 L${width} ${height - 8} `;

  for (let x = width; x >= 0; x -= 15) {
    const yOffset = Math.random() * 6;
    bottomEdge += `L${x} ${height - 5 - yOffset} `;
  }

  bottomEdge += 'L0 8 Z';

  return `
    <svg width="${width}" height="${height}">
      <path d="${topEdge} ${bottomEdge}" fill="white"/>
    </svg>
  `;
}

/**
 * Generate washi tape SVG
 */
function createWashiTape(width, color, rotation = 0) {
  const height = 25;
  return `
    <svg width="${width}" height="${height}">
      <g transform="rotate(${rotation} ${width/2} ${height/2})">
        <rect width="${width}" height="${height}" fill="${color}" opacity="0.7" rx="1"/>
        <line x1="0" y1="6" x2="${width}" y2="6" stroke="white" stroke-width="1" opacity="0.3"/>
        <line x1="0" y1="12" x2="${width}" y2="12" stroke="white" stroke-width="1" opacity="0.2"/>
        <line x1="0" y1="18" x2="${width}" y2="18" stroke="white" stroke-width="1" opacity="0.3"/>
      </g>
    </svg>
  `;
}

/**
 * Generate sticker SVG (heart, star, flower, etc.)
 */
function createSticker(type, size, color) {
  const stickers = {
    heart: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <path d="M50 88 C20 60 5 40 20 25 C35 10 50 25 50 25 C50 25 65 10 80 25 C95 40 80 60 50 88Z"
              fill="${color}" stroke="white" stroke-width="3"/>
      </svg>
    `,
    star: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
                 fill="${color}" stroke="white" stroke-width="2"/>
      </svg>
    `,
    flower: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="15" fill="#FFD700"/>
        <ellipse cx="50" cy="20" rx="12" ry="18" fill="${color}"/>
        <ellipse cx="50" cy="80" rx="12" ry="18" fill="${color}"/>
        <ellipse cx="20" cy="50" rx="18" ry="12" fill="${color}"/>
        <ellipse cx="80" cy="50" rx="18" ry="12" fill="${color}"/>
        <ellipse cx="27" cy="27" rx="12" ry="16" fill="${color}" transform="rotate(-45 27 27)"/>
        <ellipse cx="73" cy="27" rx="12" ry="16" fill="${color}" transform="rotate(45 73 27)"/>
        <ellipse cx="27" cy="73" rx="12" ry="16" fill="${color}" transform="rotate(45 27 73)"/>
        <ellipse cx="73" cy="73" rx="12" ry="16" fill="${color}" transform="rotate(-45 73 73)"/>
      </svg>
    `,
    circle: `
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" opacity="0.8"/>
      </svg>
    `
  };

  return stickers[type] || stickers.circle;
}

/**
 * Generate confetti dots
 */
function createConfetti(count, colors, canvasWidth, canvasHeight) {
  let confetti = '';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    const r = 5 + Math.random() * 15;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.4 + Math.random() * 0.4;
    confetti += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  }
  return confetti;
}

/**
 * Create the title banner
 */
function createTitleBanner(title, themes, width, palette) {
  const bannerHeight = 80;
  const mainTitle = title.toUpperCase();
  const themeText = themes ? themes.map(t => t.toUpperCase()).join(' • ') : '';

  return `
    <svg width="${width}" height="${bannerHeight}">
      <rect width="${width}" height="${bannerHeight}" fill="${palette.bannerBg}"/>
      <text x="${width/2}" y="35"
            text-anchor="middle"
            font-family="Georgia, serif"
            font-size="18px"
            font-weight="400"
            letter-spacing="0.15em"
            fill="${palette.bannerText}">${escapeXml(mainTitle)}</text>
      ${themeText ? `
        <text x="${width/2}" y="58"
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="11px"
              letter-spacing="0.1em"
              fill="${palette.bannerText}"
              opacity="0.9">${escapeXml(themeText)}</text>
      ` : ''}
    </svg>
  `;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Main function: Generate complete hybrid vision board
 */
async function generateHybridVisionBoard(workbookData, options = {}) {
  const {
    aesthetic = 'feminine-glowup',
    symbols = [],
    boardTitle = 'MY 2025 VISION',
    themes = [],
    maxImages = 12 // Limit for cost control
  } = workbookData;

  const {
    costLimit = 1.00,
    skipGeneration = false // For testing layout without API calls
  } = options;

  const palette = PALETTES[aesthetic] || PALETTES['feminine-glowup'];
  const timestamp = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log('HYBRID VISION BOARD GENERATOR');
  console.log('='.repeat(60));
  console.log('Aesthetic:', aesthetic);
  console.log('Title:', boardTitle);
  console.log('Symbols:', symbols.length);
  console.log('Cost limit: $' + costLimit.toFixed(2));

  // Limit symbols to stay within budget
  const maxByBudget = Math.floor(costLimit / COST_PER_IMAGE);
  const symbolsToGenerate = symbols.slice(0, Math.min(maxImages, maxByBudget));
  const estimatedCost = symbolsToGenerate.length * COST_PER_IMAGE;

  console.log('Generating:', symbolsToGenerate.length, 'images');
  console.log('Estimated cost: $' + estimatedCost.toFixed(2));

  // Step 1: Generate polaroid images
  console.log('\n[Step 1] Generating polaroid images...');
  const polaroidBuffers = [];

  if (!skipGeneration) {
    for (let i = 0; i < symbolsToGenerate.length; i++) {
      const buffer = await generatePolaroidImage(symbolsToGenerate[i], aesthetic, i);
      if (buffer) {
        polaroidBuffers.push(buffer);
      }

      // Small delay between API calls
      if (i < symbolsToGenerate.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } else {
    console.log('[Skip] Using placeholder images for layout testing');
    // Create placeholder colored squares for testing
    for (let i = 0; i < symbolsToGenerate.length; i++) {
      const color = palette.accents[i % palette.accents.length];
      const placeholder = await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 4,
          background: color
        }
      }).png().toBuffer();
      polaroidBuffers.push(placeholder);
    }
  }

  console.log(`[Step 1] Generated ${polaroidBuffers.length} images`);

  // Step 2: Create polaroid frames
  console.log('\n[Step 2] Creating polaroid frames...');
  const framedPolaroids = [];

  // Use more consistent sizes with slight variation
  const baseSizes = [220, 240, 230, 250, 225, 235, 245, 220, 240, 230, 250, 235];

  for (let i = 0; i < polaroidBuffers.length; i++) {
    const size = baseSizes[i % baseSizes.length] + (Math.random() - 0.5) * 20;
    const framed = await createPolaroidFrame(polaroidBuffers[i], Math.round(size));
    framedPolaroids.push({
      buffer: framed,
      width: Math.round(size) + 20,
      height: Math.round(size) + 60
    });
  }

  // Step 3: Create base canvas with background
  console.log('\n[Step 3] Creating canvas and compositing...');

  // Create background with subtle gradient
  const backgroundSvg = `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.background}"/>
          <stop offset="100%" style="stop-color:${adjustColor(palette.background, -10)}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      ${createConfetti(40, palette.confetti, CANVAS_WIDTH, CANVAS_HEIGHT)}
    </svg>
  `;

  let canvas = await sharp(Buffer.from(backgroundSvg)).png().toBuffer();

  // Step 4: Place polaroids in overlapping collage layout
  console.log('\n[Step 4] Arranging polaroids in collage layout...');

  const compositeOps = [];
  const positions = calculateCollagePositions(framedPolaroids.length, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (let i = 0; i < framedPolaroids.length; i++) {
    const polaroid = framedPolaroids[i];
    const pos = positions[i];

    // Rotate polaroid slightly
    const rotation = (Math.random() - 0.5) * 20;
    const rotatedPolaroid = await sharp(polaroid.buffer)
      .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    compositeOps.push({
      input: rotatedPolaroid,
      top: Math.round(pos.y),
      left: Math.round(pos.x)
    });

    // Add washi tape to most polaroids (at top or corner)
    if (Math.random() > 0.3) {
      const tapeColor = palette.washiTape[Math.floor(Math.random() * palette.washiTape.length)];
      const tapeWidth = 50 + Math.random() * 30;
      const tapeRotation = (Math.random() - 0.5) * 40;
      const tapeSvg = createWashiTape(tapeWidth, tapeColor, tapeRotation);

      // Place tape at top of polaroid
      compositeOps.push({
        input: Buffer.from(tapeSvg),
        top: Math.round(pos.y - 5),
        left: Math.round(pos.x + polaroid.width/2 - tapeWidth/2 + (Math.random() - 0.5) * 40)
      });
    }

    // Some polaroids get a second tape at bottom corner
    if (Math.random() > 0.7) {
      const tapeColor2 = palette.washiTape[Math.floor(Math.random() * palette.washiTape.length)];
      const tapeWidth2 = 40 + Math.random() * 25;
      const tapeRotation2 = 30 + Math.random() * 30;
      const tapeSvg2 = createWashiTape(tapeWidth2, tapeColor2, tapeRotation2);

      compositeOps.push({
        input: Buffer.from(tapeSvg2),
        top: Math.round(pos.y + polaroid.height - 30),
        left: Math.round(pos.x + polaroid.width - tapeWidth2 + 10)
      });
    }
  }

  // Add scattered stickers - more of them, varied sizes
  const stickerTypes = ['heart', 'star', 'flower', 'circle'];
  for (let i = 0; i < 15; i++) {
    const type = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
    const size = 20 + Math.random() * 35;
    const color = palette.accents[Math.floor(Math.random() * palette.accents.length)];
    const stickerSvg = createSticker(type, size, color);

    compositeOps.push({
      input: Buffer.from(stickerSvg),
      top: Math.round(90 + Math.random() * (CANVAS_HEIGHT - 150)),
      left: Math.round(Math.random() * (CANVAS_WIDTH - size))
    });
  }

  // Add some extra washi tape strips in gaps
  for (let i = 0; i < 4; i++) {
    const tapeColor = palette.washiTape[Math.floor(Math.random() * palette.washiTape.length)];
    const tapeWidth = 70 + Math.random() * 50;
    const tapeRotation = -45 + Math.random() * 90;
    const tapeSvg = createWashiTape(tapeWidth, tapeColor, tapeRotation);

    compositeOps.push({
      input: Buffer.from(tapeSvg),
      top: Math.round(150 + Math.random() * (CANVAS_HEIGHT - 300)),
      left: Math.round(Math.random() * (CANVAS_WIDTH - tapeWidth))
    });
  }

  // Composite all elements
  canvas = await sharp(canvas)
    .composite(compositeOps)
    .png()
    .toBuffer();

  // Step 5: Add title banner
  console.log('\n[Step 5] Adding title banner...');
  const bannerSvg = createTitleBanner(boardTitle, themes, CANVAS_WIDTH, palette);

  canvas = await sharp(canvas)
    .composite([{
      input: Buffer.from(bannerSvg),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer();

  // Step 6: Save output
  console.log('\n[Step 6] Saving final image...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filename = `hybrid-visionboard-${timestamp}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await sharp(canvas).toFile(filepath);

  const actualCost = skipGeneration ? 0 : (polaroidBuffers.length * COST_PER_IMAGE);

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS!');
  console.log('='.repeat(60));
  console.log('Output:', filepath);
  console.log('Images generated:', polaroidBuffers.length);
  console.log('Actual cost: $' + actualCost.toFixed(2));
  console.log('='.repeat(60));

  return {
    success: true,
    filepath,
    imagesGenerated: polaroidBuffers.length,
    cost: actualCost,
    timestamp
  };
}

/**
 * Calculate positions for collage layout - NO overlapping photos
 * Uses a grid-based approach with slight randomness for organic feel
 * but ensures each photo has its own dedicated space
 */
function calculateCollagePositions(count, canvasWidth, canvasHeight) {
  const positions = [];
  const bannerHeight = 85;
  const padding = 15;
  const photoMaxSize = 280; // Max polaroid size including frame

  // Calculate grid dimensions based on count
  let cols, rows;
  if (count <= 6) {
    cols = 3;
    rows = 2;
  } else if (count <= 9) {
    cols = 3;
    rows = 3;
  } else if (count <= 12) {
    cols = 4;
    rows = 3;
  } else {
    cols = 4;
    rows = 4;
  }

  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - bannerHeight - padding * 2;

  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;

  // Pre-calculate all grid positions
  const gridPositions = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Center of each cell
      const centerX = padding + col * cellWidth + cellWidth / 2;
      const centerY = bannerHeight + padding + row * cellHeight + cellHeight / 2;

      // Add small randomness but keep within cell bounds
      const maxOffset = Math.min(cellWidth, cellHeight) * 0.15;
      const offsetX = (Math.random() - 0.5) * maxOffset;
      const offsetY = (Math.random() - 0.5) * maxOffset;

      gridPositions.push({
        x: centerX + offsetX - photoMaxSize / 2,
        y: centerY + offsetY - photoMaxSize / 2,
        row,
        col
      });
    }
  }

  // Shuffle grid positions and take what we need
  const shuffled = gridPositions.sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const pos = shuffled[i];

    // Ensure within canvas bounds
    const x = Math.max(5, Math.min(canvasWidth - photoMaxSize - 5, pos.x));
    const y = Math.max(bannerHeight + 5, Math.min(canvasHeight - photoMaxSize - 40, pos.y));

    positions.push({ x, y });
  }

  return positions;
}

/**
 * Adjust color brightness
 */
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

module.exports = {
  generateHybridVisionBoard,
  PALETTES,
  COST_PER_IMAGE
};
