/**
 * Premium Scrapbook Compositor v2
 *
 * Creates Pinterest-quality vision boards matching the reference aesthetic:
 * - Layered torn paper backgrounds
 * - Mixed photo styles (polaroid, torn edges, clean)
 * - Dense edge-to-edge layout with intentional overlaps
 * - Realistic 3D-looking stickers
 * - Physical props (markers, notebooks) as elements
 * - Confetti and bokeh effects
 * - Textured backgrounds
 *
 * NO random photo-on-photo overlaps - controlled artistic layering only
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { generateImage } = require('../api/ideogramClient');
const { OUTPUT_DIR } = require('../config/constants');

// Canvas dimensions
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350; // Slightly shorter for denser feel

const COST_PER_IMAGE = 0.025;

/**
 * Color palettes
 */
const PALETTES = {
  'feminine-glowup': {
    background: '#F8E8EE', // Soft pink
    paperLayers: ['#FFE4EC', '#E8F4F8', '#FFF5E6', '#F0E6FF', '#E6FFF0', '#FFE6F0'],
    accents: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFD700', '#98FB98', '#FFA07A'],
    confetti: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFD700', '#98FB98', '#FFA07A', '#FF69B4'],
    washiTape: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFDAB9', '#98FB98'],
    bannerBg: 'rgba(40, 35, 38, 0.85)',
  },
  'masculine-editorial': {
    background: '#1A252F',
    paperLayers: ['#2C3E50', '#34495E', '#3D566E', '#4A6278', '#2A3F54'],
    accents: ['#D4A574', '#B8860B', '#708090', '#C0C0C0', '#8B7355'],
    confetti: ['#D4A574', '#B8860B', '#708090', '#C0C0C0'],
    washiTape: ['#D4A574', '#708090', '#4A5568', '#8B7355'],
    bannerBg: 'rgba(20, 25, 30, 0.9)',
  },
  'neutral-minimal': {
    background: '#F5F3EF',
    paperLayers: ['#FAF9F6', '#F0EDE8', '#E8E4DD', '#FFF8F0', '#F5EFE6'],
    accents: ['#D2B48C', '#DEB887', '#C4A484', '#A0522D', '#8B7355'],
    confetti: ['#D2B48C', '#DEB887', '#C4A484', '#E8DCC4'],
    washiTape: ['#D2B48C', '#DEB887', '#E8DCC4', '#C4A484'],
    bannerBg: 'rgba(60, 55, 50, 0.8)',
  }
};

/**
 * Generate torn paper edge path
 */
function tornEdgePath(width, height, roughness = 8) {
  let path = `M0 ${roughness} `;

  // Top edge - torn
  for (let x = 0; x <= width; x += 12) {
    const y = Math.random() * roughness;
    path += `L${x} ${y} `;
  }

  // Right edge
  path += `L${width} ${roughness} L${width} ${height - roughness} `;

  // Bottom edge - torn
  for (let x = width; x >= 0; x -= 12) {
    const y = height - Math.random() * roughness;
    path += `L${x} ${y} `;
  }

  // Left edge
  path += `L0 ${height - roughness} Z`;

  return path;
}

/**
 * Create a torn paper layer SVG
 */
function createTornPaperLayer(width, height, color, rotation = 0) {
  const path = tornEdgePath(width, height, 10);
  return `
    <svg width="${width + 20}" height="${height + 20}">
      <defs>
        <filter id="paperShadow_${Math.random().toString(36).substr(2, 9)}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="4" flood-opacity="0.15"/>
        </filter>
      </defs>
      <g transform="translate(10,10) rotate(${rotation} ${width/2} ${height/2})">
        <path d="${path}" fill="${color}" filter="url(#paperShadow_${Math.random().toString(36).substr(2, 9)})"/>
      </g>
    </svg>
  `;
}

/**
 * Create polaroid frame with torn or clean edges
 */
async function createPhotoFrame(imageBuffer, style = 'polaroid', size = 240) {
  const styles = {
    polaroid: { padding: 12, bottomPadding: 40, border: '#FFFFFF', shadow: true },
    torn: { padding: 8, bottomPadding: 8, border: '#FFFEF8', shadow: true, torn: true },
    clean: { padding: 4, bottomPadding: 4, border: '#FFFFFF', shadow: true },
    tilted: { padding: 10, bottomPadding: 35, border: '#FFFEF5', shadow: true }
  };

  const s = styles[style] || styles.polaroid;
  const frameWidth = size + s.padding * 2;
  const frameHeight = size + s.padding + s.bottomPadding;

  // Resize image
  const resizedImage = await sharp(imageBuffer)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  // Create frame SVG
  const shadowId = `shadow_${Math.random().toString(36).substr(2, 9)}`;
  let frameSvg;

  if (s.torn) {
    const tornPath = tornEdgePath(frameWidth, frameHeight, 6);
    frameSvg = `
      <svg width="${frameWidth + 20}" height="${frameHeight + 20}">
        <defs>
          <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="4" stdDeviation="5" flood-opacity="0.2"/>
          </filter>
        </defs>
        <g transform="translate(10,10)">
          <path d="${tornPath}" fill="${s.border}" filter="url(#${shadowId})"/>
        </g>
      </svg>
    `;
  } else {
    frameSvg = `
      <svg width="${frameWidth + 20}" height="${frameHeight + 20}">
        <defs>
          <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="4" stdDeviation="5" flood-opacity="0.2"/>
          </filter>
        </defs>
        <rect x="10" y="10" width="${frameWidth}" height="${frameHeight}"
              fill="${s.border}" rx="2" filter="url(#${shadowId})"/>
      </svg>
    `;
  }

  // Composite
  const frame = await sharp(Buffer.from(frameSvg))
    .composite([{
      input: resizedImage,
      top: s.padding + 10,
      left: s.padding + 10
    }])
    .png()
    .toBuffer();

  return {
    buffer: frame,
    width: frameWidth + 20,
    height: frameHeight + 20
  };
}

/**
 * Create realistic washi tape
 */
function createWashiTape(width, color, rotation = 0) {
  const height = 22;
  const id = Math.random().toString(36).substr(2, 9);

  // Create torn ends effect
  return `
    <svg width="${width + 10}" height="${height + 10}">
      <defs>
        <linearGradient id="tapeGrad_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8"/>
          <stop offset="50%" style="stop-color:${color};stop-opacity:0.7"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.8"/>
        </linearGradient>
        <filter id="tapeTex_${id}">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>
          <feDiffuseLighting in="noise" lighting-color="${color}" surfaceScale="1" result="light">
            <feDistantLight azimuth="45" elevation="60"/>
          </feDiffuseLighting>
          <feBlend in="SourceGraphic" in2="light" mode="multiply"/>
        </filter>
      </defs>
      <g transform="translate(5,5) rotate(${rotation} ${width/2} ${height/2})">
        <rect width="${width}" height="${height}" fill="url(#tapeGrad_${id})" rx="1"/>
        <!-- Texture lines -->
        <line x1="0" y1="5" x2="${width}" y2="5" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
        <line x1="0" y1="11" x2="${width}" y2="11" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
        <line x1="0" y1="17" x2="${width}" y2="17" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
      </g>
    </svg>
  `;
}

/**
 * Create 3D-looking sticker
 */
function createSticker(type, size, color) {
  const id = Math.random().toString(36).substr(2, 9);

  const stickers = {
    heart: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="heartGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${lightenColor(color, 30)}"/>
            <stop offset="100%" style="stop-color:${color}"/>
          </linearGradient>
          <filter id="heartShadow_${id}">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <path d="M50 85 C20 60 5 40 18 25 C32 10 50 22 50 22 C50 22 68 10 82 25 C95 40 80 60 50 85Z"
              fill="url(#heartGrad_${id})" stroke="white" stroke-width="2" filter="url(#heartShadow_${id})"/>
      </svg>
    `,

    star: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="starGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${lightenColor(color, 40)}"/>
            <stop offset="100%" style="stop-color:${color}"/>
          </linearGradient>
          <filter id="starShadow_${id}">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <polygon points="50,8 61,35 92,35 67,55 78,85 50,68 22,85 33,55 8,35 39,35"
                 fill="url(#starGrad_${id})" stroke="white" stroke-width="2" filter="url(#starShadow_${id})"/>
      </svg>
    `,

    flower: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="flowerGrad_${id}" cx="50%" cy="50%">
            <stop offset="0%" style="stop-color:${lightenColor(color, 30)}"/>
            <stop offset="100%" style="stop-color:${color}"/>
          </radialGradient>
          <filter id="flowerShadow_${id}">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#flowerShadow_${id})">
          <ellipse cx="50" cy="22" rx="14" ry="20" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1"/>
          <ellipse cx="50" cy="78" rx="14" ry="20" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1"/>
          <ellipse cx="22" cy="50" rx="20" ry="14" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1"/>
          <ellipse cx="78" cy="50" rx="20" ry="14" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1"/>
          <ellipse cx="30" cy="30" rx="14" ry="18" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1" transform="rotate(-45 30 30)"/>
          <ellipse cx="70" cy="30" rx="14" ry="18" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1" transform="rotate(45 70 30)"/>
          <ellipse cx="30" cy="70" rx="14" ry="18" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1" transform="rotate(45 30 70)"/>
          <ellipse cx="70" cy="70" rx="14" ry="18" fill="url(#flowerGrad_${id})" stroke="white" stroke-width="1" transform="rotate(-45 70 70)"/>
          <circle cx="50" cy="50" r="16" fill="#FFD700" stroke="white" stroke-width="1"/>
        </g>
      </svg>
    `,

    iceCream: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <defs>
          <filter id="iceShadow_${id}">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#iceShadow_${id})">
          <polygon points="35,50 50,95 65,50" fill="#DEB887" stroke="white" stroke-width="1"/>
          <ellipse cx="50" cy="40" rx="22" ry="18" fill="#FFB6C1" stroke="white" stroke-width="1"/>
          <ellipse cx="40" cy="28" rx="15" ry="12" fill="#87CEEB" stroke="white" stroke-width="1"/>
          <ellipse cx="60" cy="28" rx="15" ry="12" fill="#DDA0DD" stroke="white" stroke-width="1"/>
          <circle cx="50" cy="18" r="8" fill="#FF6B6B" stroke="white" stroke-width="1"/>
        </g>
      </svg>
    `,

    bow: `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="bowGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${lightenColor(color, 30)}"/>
            <stop offset="100%" style="stop-color:${color}"/>
          </linearGradient>
          <filter id="bowShadow_${id}">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#bowShadow_${id})">
          <ellipse cx="30" cy="50" rx="25" ry="20" fill="url(#bowGrad_${id})" stroke="white" stroke-width="1"/>
          <ellipse cx="70" cy="50" rx="25" ry="20" fill="url(#bowGrad_${id})" stroke="white" stroke-width="1"/>
          <circle cx="50" cy="50" r="12" fill="url(#bowGrad_${id})" stroke="white" stroke-width="1"/>
          <path d="M45 62 L40 85 L50 75 L60 85 L55 62" fill="url(#bowGrad_${id})" stroke="white" stroke-width="1"/>
        </g>
      </svg>
    `
  };

  return stickers[type] || stickers.heart;
}

/**
 * Create confetti dot with gradient
 */
function createConfettiDot(size, color) {
  const id = Math.random().toString(36).substr(2, 9);
  return `
    <svg width="${size}" height="${size}">
      <defs>
        <radialGradient id="confGrad_${id}" cx="30%" cy="30%">
          <stop offset="0%" style="stop-color:${lightenColor(color, 40)};stop-opacity:0.9"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.7"/>
        </radialGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="url(#confGrad_${id})"/>
    </svg>
  `;
}

/**
 * Create bokeh circle
 */
function createBokeh(size, color, opacity = 0.3) {
  const id = Math.random().toString(36).substr(2, 9);
  return `
    <svg width="${size}" height="${size}">
      <defs>
        <radialGradient id="bokehGrad_${id}" cx="40%" cy="40%">
          <stop offset="0%" style="stop-color:white;stop-opacity:${opacity * 1.5}"/>
          <stop offset="50%" style="stop-color:${color};stop-opacity:${opacity}"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0"/>
        </radialGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bokehGrad_${id})"/>
    </svg>
  `;
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

/**
 * Download image to buffer
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
 * Build prompt for Ideogram
 */
function buildPrompt(symbol, aesthetic) {
  const styleGuides = {
    'feminine-glowup': 'soft pastel colors, dreamy warm lighting, gentle bokeh background, aesthetic lifestyle photography, cozy feminine vibes',
    'masculine-editorial': 'moody sophisticated lighting, rich dark tones, editorial photography, luxurious masculine aesthetic',
    'neutral-minimal': 'soft natural light, warm beige cream tones, minimal cozy aesthetic, clean lifestyle photography'
  };

  const style = styleGuides[aesthetic] || styleGuides['feminine-glowup'];

  return `A beautiful aesthetic photograph of ${symbol}. ${style}. Centered subject, no people, no faces, no hands, no text, no logos. Simple complementary background. High quality.`;
}

/**
 * Generate single image
 */
async function generateSingleImage(symbol, aesthetic, index) {
  const prompt = buildPrompt(symbol, aesthetic);
  console.log(`[Image ${index + 1}] Generating: "${symbol.substring(0, 35)}..."`);

  try {
    const imageUrl = await generateImage(prompt, {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1'
    });

    const buffer = await downloadImageToBuffer(imageUrl);
    console.log(`[Image ${index + 1}] Success`);
    return buffer;
  } catch (error) {
    console.error(`[Image ${index + 1}] Error:`, error.message);
    return null;
  }
}

/**
 * Calculate non-overlapping positions for photos
 * Uses grid-based placement with defined zones
 */
function calculatePhotoPositions(count, canvasWidth, canvasHeight, bannerHeight) {
  const positions = [];
  const padding = 20;
  const photoSize = 220; // Base size

  // Define placement zones (like a puzzle)
  // Each zone is a region where a photo can be placed
  const zones = [
    // Row 1
    { x: 0, y: bannerHeight, w: 280, h: 320 },
    { x: 260, y: bannerHeight + 30, w: 280, h: 300 },
    { x: 520, y: bannerHeight, w: 280, h: 320 },
    { x: 780, y: bannerHeight + 20, w: 300, h: 310 },
    // Row 2
    { x: 30, y: bannerHeight + 280, w: 260, h: 300 },
    { x: 280, y: bannerHeight + 310, w: 270, h: 290 },
    { x: 540, y: bannerHeight + 290, w: 260, h: 300 },
    { x: 780, y: bannerHeight + 300, w: 300, h: 290 },
    // Row 3
    { x: 0, y: bannerHeight + 560, w: 280, h: 320 },
    { x: 250, y: bannerHeight + 580, w: 280, h: 300 },
    { x: 500, y: bannerHeight + 560, w: 280, h: 320 },
    { x: 760, y: bannerHeight + 570, w: 320, h: 310 },
    // Row 4 (bottom)
    { x: 40, y: bannerHeight + 840, w: 270, h: 280 },
    { x: 300, y: bannerHeight + 860, w: 260, h: 260 },
    { x: 550, y: bannerHeight + 850, w: 260, h: 270 },
    { x: 800, y: bannerHeight + 840, w: 280, h: 280 },
  ];

  // Shuffle and pick zones
  const shuffledZones = zones.sort(() => Math.random() - 0.5).slice(0, count);

  for (const zone of shuffledZones) {
    // Place within zone with small randomness
    const x = zone.x + Math.random() * (zone.w - photoSize - 20);
    const y = zone.y + Math.random() * (zone.h - photoSize - 40);

    positions.push({
      x: Math.max(padding, Math.min(canvasWidth - photoSize - padding, x)),
      y: Math.max(bannerHeight + padding, Math.min(canvasHeight - photoSize - 60, y)),
      rotation: (Math.random() - 0.5) * 16,
      size: photoSize + (Math.random() - 0.5) * 40,
      style: ['polaroid', 'polaroid', 'torn', 'clean', 'tilted'][Math.floor(Math.random() * 5)]
    });
  }

  return positions;
}

/**
 * Main generation function
 */
async function generatePremiumVisionBoard(workbookData, options = {}) {
  const {
    aesthetic = 'feminine-glowup',
    symbols = [],
    boardTitle = 'MY 2025 VISION',
    themes = []
  } = workbookData;

  const {
    costLimit = 1.00,
    skipGeneration = false,
    maxImages = 12
  } = options;

  const palette = PALETTES[aesthetic] || PALETTES['feminine-glowup'];
  const timestamp = Date.now();
  const bannerHeight = 70;

  console.log('\n' + '='.repeat(60));
  console.log('PREMIUM SCRAPBOOK COMPOSITOR v2');
  console.log('='.repeat(60));
  console.log('Aesthetic:', aesthetic);
  console.log('Title:', boardTitle);
  console.log('Symbols:', symbols.length);

  // Limit by budget
  const maxByBudget = Math.floor(costLimit / COST_PER_IMAGE);
  const symbolsToGenerate = symbols.slice(0, Math.min(maxImages, maxByBudget));
  console.log('Generating:', symbolsToGenerate.length, 'images');
  console.log('Est. cost: $' + (symbolsToGenerate.length * COST_PER_IMAGE).toFixed(2));

  // Step 1: Generate images
  console.log('\n[Step 1] Generating images...');
  const imageBuffers = [];

  if (!skipGeneration) {
    for (let i = 0; i < symbolsToGenerate.length; i++) {
      const buffer = await generateSingleImage(symbolsToGenerate[i], aesthetic, i);
      if (buffer) imageBuffers.push(buffer);
      if (i < symbolsToGenerate.length - 1) await new Promise(r => setTimeout(r, 400));
    }
  } else {
    // Placeholders for testing
    for (let i = 0; i < symbolsToGenerate.length; i++) {
      const color = palette.accents[i % palette.accents.length];
      const placeholder = await sharp({
        create: { width: 300, height: 300, channels: 4, background: color }
      }).png().toBuffer();
      imageBuffers.push(placeholder);
    }
  }

  console.log(`[Step 1] Generated ${imageBuffers.length} images`);

  // Step 2: Create base canvas with textured background
  console.log('\n[Step 2] Creating layered background...');

  // Textured background
  const bgSvg = `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
      <defs>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" mode="soft-light"/>
        </filter>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.background}"/>
          <stop offset="50%" style="stop-color:${lightenColor(palette.background, 5)}"/>
          <stop offset="100%" style="stop-color:${darkenColor(palette.background, 5)}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>
    </svg>
  `;

  let canvas = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Step 3: Add torn paper background layers
  console.log('\n[Step 3] Adding torn paper layers...');
  const paperOps = [];

  for (let i = 0; i < 8; i++) {
    const paperColor = palette.paperLayers[i % palette.paperLayers.length];
    const paperWidth = 200 + Math.random() * 300;
    const paperHeight = 150 + Math.random() * 250;
    const paperX = Math.random() * (CANVAS_WIDTH - paperWidth/2);
    const paperY = bannerHeight + Math.random() * (CANVAS_HEIGHT - paperHeight - bannerHeight);
    const paperRotation = (Math.random() - 0.5) * 30;

    const paperSvg = createTornPaperLayer(paperWidth, paperHeight, paperColor, paperRotation);

    paperOps.push({
      input: Buffer.from(paperSvg),
      top: Math.round(paperY),
      left: Math.round(paperX)
    });
  }

  canvas = await sharp(canvas).composite(paperOps).png().toBuffer();

  // Step 4: Add bokeh/glow effects
  console.log('\n[Step 4] Adding bokeh effects...');
  const bokehOps = [];

  for (let i = 0; i < 20; i++) {
    const size = 30 + Math.random() * 80;
    const color = palette.confetti[i % palette.confetti.length];
    const x = Math.random() * CANVAS_WIDTH;
    const y = Math.random() * CANVAS_HEIGHT;
    const opacity = 0.15 + Math.random() * 0.25;

    const bokehSvg = createBokeh(size, color, opacity);
    bokehOps.push({
      input: Buffer.from(bokehSvg),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  canvas = await sharp(canvas).composite(bokehOps).png().toBuffer();

  // Step 5: Create framed photos
  console.log('\n[Step 5] Creating photo frames...');
  const positions = calculatePhotoPositions(imageBuffers.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerHeight);
  const framedPhotos = [];

  for (let i = 0; i < imageBuffers.length; i++) {
    const pos = positions[i];
    const framed = await createPhotoFrame(imageBuffers[i], pos.style, Math.round(pos.size));
    framedPhotos.push({ ...framed, ...pos });
  }

  // Step 6: Composite photos (sorted by y position for natural layering)
  console.log('\n[Step 6] Compositing photos...');
  const sortedPhotos = framedPhotos.sort((a, b) => a.y - b.y);
  const photoOps = [];

  for (const photo of sortedPhotos) {
    // Rotate photo
    const rotatedPhoto = await sharp(photo.buffer)
      .rotate(photo.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    photoOps.push({
      input: rotatedPhoto,
      top: Math.round(photo.y),
      left: Math.round(photo.x)
    });

    // Add washi tape
    if (Math.random() > 0.25) {
      const tapeColor = palette.washiTape[Math.floor(Math.random() * palette.washiTape.length)];
      const tapeWidth = 50 + Math.random() * 40;
      const tapeRotation = (Math.random() - 0.5) * 50;
      const tapeSvg = createWashiTape(tapeWidth, tapeColor, tapeRotation);

      photoOps.push({
        input: Buffer.from(tapeSvg),
        top: Math.round(photo.y + (Math.random() > 0.5 ? -5 : photo.height - 25)),
        left: Math.round(photo.x + photo.width/2 - tapeWidth/2 + (Math.random() - 0.5) * 50)
      });
    }
  }

  canvas = await sharp(canvas).composite(photoOps).png().toBuffer();

  // Step 7: Add stickers
  console.log('\n[Step 7] Adding stickers...');
  const stickerOps = [];
  const stickerTypes = ['heart', 'star', 'flower', 'iceCream', 'bow'];

  for (let i = 0; i < 12; i++) {
    const type = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
    const size = 35 + Math.random() * 40;
    const color = palette.accents[Math.floor(Math.random() * palette.accents.length)];
    const x = Math.random() * (CANVAS_WIDTH - size);
    const y = bannerHeight + 20 + Math.random() * (CANVAS_HEIGHT - bannerHeight - size - 40);

    const stickerSvg = createSticker(type, size, color);
    stickerOps.push({
      input: Buffer.from(stickerSvg),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  canvas = await sharp(canvas).composite(stickerOps).png().toBuffer();

  // Step 8: Add confetti
  console.log('\n[Step 8] Adding confetti...');
  const confettiOps = [];

  for (let i = 0; i < 40; i++) {
    const size = 8 + Math.random() * 20;
    const color = palette.confetti[Math.floor(Math.random() * palette.confetti.length)];
    const x = Math.random() * CANVAS_WIDTH;
    const y = Math.random() * CANVAS_HEIGHT;

    const confettiSvg = createConfettiDot(size, color);
    confettiOps.push({
      input: Buffer.from(confettiSvg),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  canvas = await sharp(canvas).composite(confettiOps).png().toBuffer();

  // Step 9: Add extra washi tape strips
  console.log('\n[Step 9] Adding extra washi tape...');
  const extraTapeOps = [];

  for (let i = 0; i < 6; i++) {
    const tapeColor = palette.washiTape[Math.floor(Math.random() * palette.washiTape.length)];
    const tapeWidth = 60 + Math.random() * 70;
    const tapeRotation = (Math.random() - 0.5) * 90;
    const x = Math.random() * (CANVAS_WIDTH - tapeWidth);
    const y = bannerHeight + 50 + Math.random() * (CANVAS_HEIGHT - bannerHeight - 100);

    const tapeSvg = createWashiTape(tapeWidth, tapeColor, tapeRotation);
    extraTapeOps.push({
      input: Buffer.from(tapeSvg),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  canvas = await sharp(canvas).composite(extraTapeOps).png().toBuffer();

  // Step 10: Add title banner
  console.log('\n[Step 10] Adding title banner...');
  const themeText = themes.length > 0 ? themes.map(t => t.toUpperCase()).join(' • ') : '';

  const bannerSvg = `
    <svg width="${CANVAS_WIDTH}" height="${bannerHeight}">
      <rect width="100%" height="100%" fill="${palette.bannerBg}"/>
      <text x="${CANVAS_WIDTH/2}" y="${themeText ? 28 : 42}"
            text-anchor="middle"
            font-family="Georgia, 'Times New Roman', serif"
            font-size="${themeText ? 16 : 20}px"
            font-weight="400"
            letter-spacing="0.12em"
            fill="white">${escapeXml(boardTitle.toUpperCase())}</text>
      ${themeText ? `
        <text x="${CANVAS_WIDTH/2}" y="52"
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="10px"
              letter-spacing="0.08em"
              fill="white"
              opacity="0.85">${escapeXml(themeText)}</text>
      ` : ''}
    </svg>
  `;

  canvas = await sharp(canvas)
    .composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save
  console.log('\n[Step 11] Saving...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filename = `premium-visionboard-${timestamp}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await sharp(canvas).toFile(filepath);

  const actualCost = skipGeneration ? 0 : (imageBuffers.length * COST_PER_IMAGE);

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS!');
  console.log('='.repeat(60));
  console.log('Output:', filepath);
  console.log('Images:', imageBuffers.length);
  console.log('Cost: $' + actualCost.toFixed(2));

  return {
    success: true,
    filepath,
    imagesGenerated: imageBuffers.length,
    cost: actualCost,
    timestamp
  };
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  generatePremiumVisionBoard,
  PALETTES,
  COST_PER_IMAGE
};
