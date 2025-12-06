/**
 * Premium Flat-Lay Compositor V5
 *
 * SOPHISTICATED AESTHETIC inspired by professional editorial flat-lay photography
 *
 * Key design principles:
 * - Dark, moody base (charcoal/slate tones)
 * - Mix of polaroids AND loose objects (not everything framed)
 * - Subtle torn paper as background texture only
 * - Small gold/bronze square accents (not childish washi strips)
 * - Clean elegant typography (serif, no script fonts)
 * - Professional shadows and depth
 * - Warm bronze/gold accent colors against dark base
 * - Minimal, curated feel - not cluttered
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { generateImage } = require('../api/ideogramClient');
const { OUTPUT_DIR } = require('../config/constants');

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const COST_PER_IMAGE = 0.025;

// Sophisticated color palettes
const PALETTES = {
  'dark-editorial': {
    background: '#1a1a1a',
    paperLayers: ['#2a2a2a', '#252525', '#303030', '#1f1f1f', '#282828', '#232323'],
    accentMetal: '#b8956e',  // Warm bronze/gold
    accentMetalLight: '#d4b896',
    polaroidBg: '#f5f0e8',  // Warm cream for polaroid frames
    shadowColor: 'rgba(0,0,0,0.4)',
    textColor: '#e8e4dc',
    subtextColor: '#a09080',
  },
  'warm-noir': {
    background: '#1c1915',
    paperLayers: ['#2a2620', '#252220', '#302a25', '#1f1c18', '#28241f', '#23201c'],
    accentMetal: '#c9a66b',
    accentMetalLight: '#e0c99a',
    polaroidBg: '#f8f4ec',
    shadowColor: 'rgba(0,0,0,0.45)',
    textColor: '#f0ece4',
    subtextColor: '#b0a090',
  },
  'cool-slate': {
    background: '#181c1f',
    paperLayers: ['#252a2e', '#202428', '#2a2f33', '#1c2024', '#232830', '#1e2226'],
    accentMetal: '#8fa0a8',  // Cool silver
    accentMetalLight: '#b0c0c8',
    polaroidBg: '#f0f2f4',
    shadowColor: 'rgba(0,0,0,0.4)',
    textColor: '#e4e8ec',
    subtextColor: '#8090a0',
  }
};

/**
 * Create subtle torn paper piece for background layering
 */
function createBackgroundPaper(w, h, color, rotation = 0) {
  const id = Math.random().toString(36).substr(2, 8);

  // Subtle irregular edges
  let topEdge = '';
  let bottomEdge = '';
  const step = 12;

  for (let x = 0; x <= w; x += step) {
    const yTop = 4 + Math.random() * 6;
    const yBottom = h - 4 - Math.random() * 6;
    topEdge += `${x},${yTop} `;
    bottomEdge = `${x},${yBottom} ` + bottomEdge;
  }

  const points = `0,${h/2} ${topEdge} ${w},${h/2} ${bottomEdge}`;

  return `<svg width="${w + 30}" height="${h + 30}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="3" stdDeviation="4" flood-opacity="0.3"/>
      </filter>
    </defs>
    <g transform="translate(15,15) rotate(${rotation} ${w/2} ${h/2})">
      <polygon points="${points}" fill="${color}" filter="url(#shadow${id})"/>
    </g>
  </svg>`;
}

/**
 * Create a sophisticated polaroid frame
 * Cream/warm white with subtle shadow
 */
async function createPolaroid(imgBuffer, size, rotation = 0) {
  const padding = Math.round(size * 0.04);
  const bottomPadding = Math.round(size * 0.12);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;

  const id = Math.random().toString(36).substr(2, 8);

  // Resize image to fit
  const resized = await sharp(imgBuffer)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  // Create frame SVG with realistic shadow
  const frameSvg = `<svg width="${frameW + 40}" height="${frameH + 40}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="polaroidShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
        <feOffset dx="3" dy="5" result="offsetBlur"/>
        <feFlood flood-color="rgba(0,0,0,0.35)"/>
        <feComposite in2="offsetBlur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g transform="translate(20,20) rotate(${rotation} ${frameW/2} ${frameH/2})">
      <rect x="0" y="0" width="${frameW}" height="${frameH}"
            fill="#f5f0e8" rx="1" filter="url(#polaroidShadow${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();

  // Composite image onto frame
  const result = await sharp(frame)
    .composite([{
      input: resized,
      top: 20 + padding,
      left: 20 + padding
    }])
    .png()
    .toBuffer();

  return {
    buffer: result,
    width: frameW + 40,
    height: frameH + 40,
    rotation
  };
}

/**
 * Create a loose object (no frame) with shadow
 * These are the scattered items like watches, keys, plants, etc.
 */
async function createLooseObject(imgBuffer, size, rotation = 0, shape = 'square') {
  const id = Math.random().toString(36).substr(2, 8);

  let resized;
  if (shape === 'circle') {
    // Create circular mask
    const circle = Buffer.from(`<svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
    </svg>`);

    resized = await sharp(imgBuffer)
      .resize(size, size, { fit: 'cover' })
      .composite([{ input: circle, blend: 'dest-in' }])
      .png()
      .toBuffer();
  } else {
    resized = await sharp(imgBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
  }

  // Add shadow underneath
  const shadowSvg = `<svg width="${size + 40}" height="${size + 40}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="objShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/>
        <feOffset dx="4" dy="6" result="offsetBlur"/>
        <feFlood flood-color="rgba(0,0,0,0.4)"/>
        <feComposite in2="offsetBlur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g transform="translate(20,20) rotate(${rotation} ${size/2} ${size/2})">
      <rect x="0" y="0" width="${size}" height="${size}" fill="transparent" filter="url(#objShadow${id})"/>
    </g>
  </svg>`;

  // We need to apply shadow differently - composite the image with rotation
  const rotated = await sharp(resized)
    .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rotatedMeta = await sharp(rotated).metadata();

  // Create shadow base
  const shadowBase = await sharp({
    create: {
      width: rotatedMeta.width + 30,
      height: rotatedMeta.height + 30,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  // Simple drop shadow effect
  const blurredShadow = await sharp(rotated)
    .modulate({ brightness: 0 })
    .blur(8)
    .ensureAlpha(0.35)
    .png()
    .toBuffer();

  const result = await sharp(shadowBase)
    .composite([
      { input: blurredShadow, top: 8, left: 6 },
      { input: rotated, top: 5, left: 5 }
    ])
    .png()
    .toBuffer();

  return {
    buffer: result,
    width: rotatedMeta.width + 30,
    height: rotatedMeta.height + 30,
    rotation
  };
}

/**
 * Create small gold/bronze square accent
 * These replace the childish washi tape strips
 */
function createMetalAccent(size, color) {
  const id = Math.random().toString(36).substr(2, 8);
  return `<svg width="${size + 10}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="metalGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="${lightenColor(color, 20)}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.85"/>
      </linearGradient>
      <filter id="metalShadow${id}">
        <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect x="5" y="5" width="${size}" height="${size}"
          fill="url(#metalGrad${id})" filter="url(#metalShadow${id})"/>
  </svg>`;
}

/**
 * Create elegant title banner
 * Clean serif font, no script/cursive
 */
function createTitleBanner(width, title, subtitle, palette) {
  const height = 80;

  // Clean, elegant typography
  const titleSize = Math.min(28, Math.floor(width / (title.length * 0.6)));
  const subtitleSize = 10;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${palette.background}"/>

    <!-- Subtle top border accent -->
    <rect x="0" y="0" width="100%" height="2" fill="${palette.accentMetal}" opacity="0.6"/>

    <!-- Title - clean serif -->
    <text x="${width/2}" y="${subtitle ? 42 : 48}" text-anchor="middle"
          font-family="'Didot', 'Bodoni MT', 'Georgia', 'Times New Roman', serif"
          font-size="${titleSize}px" font-weight="400" letter-spacing="0.2em"
          fill="${palette.textColor}">${escapeXml(title.toUpperCase())}</text>

    ${subtitle ? `
    <!-- Subtitle - smaller, spaced -->
    <text x="${width/2}" y="62" text-anchor="middle"
          font-family="'Helvetica Neue', 'Arial', sans-serif"
          font-size="${subtitleSize}px" font-weight="300" letter-spacing="0.25em"
          fill="${palette.subtextColor}">${escapeXml(subtitle.toUpperCase())}</text>
    ` : ''}
  </svg>`;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Build prompt for sophisticated flat-lay items
 */
function buildPrompt(symbol, aesthetic) {
  const noPeople = "IMPORTANT: absolutely no people, no human figures, no faces, no hands, no body parts";

  const styleClause = "Moody editorial photography, dark sophisticated background, warm bronze accent lighting, luxury product photography style, professional shadows, high-end magazine aesthetic";

  return `A beautiful ${symbol}. ${styleClause}. Centered subject on dark surface, ${noPeople}, no text, no logos, no brand names. Professional studio lighting with warm highlights. High quality editorial photography.`;
}

async function generateImageForItem(symbol, aesthetic, index) {
  console.log(`  [${index + 1}] "${symbol.substring(0, 40)}..."`);
  try {
    const url = await generateImage(buildPrompt(symbol, aesthetic), {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1'
    });
    return await downloadImage(url);
  } catch (e) {
    console.error(`  [${index + 1}] Error:`, e.message);
    return null;
  }
}

/**
 * Smart layout for flat-lay composition
 * Mix of polaroids (larger) and loose objects (smaller, scattered)
 */
function calculateLayout(itemCount, canvasW, canvasH, bannerH) {
  const items = [];
  const contentH = canvasH - bannerH;
  const margin = 40;

  // Decide how many polaroids vs loose objects
  const polaroidCount = Math.min(4, Math.ceil(itemCount * 0.35));
  const looseCount = itemCount - polaroidCount;

  // Polaroid positions - larger, more prominent
  const polaroidSize = 220;
  const polaroidPositions = [
    { x: margin + 20, y: bannerH + 60, rotation: -5 + Math.random() * 3 },
    { x: canvasW - polaroidSize - margin - 60, y: bannerH + contentH * 0.35, rotation: 3 + Math.random() * 4 },
    { x: margin + 40, y: bannerH + contentH * 0.55, rotation: -3 + Math.random() * 2 },
    { x: canvasW - polaroidSize - margin - 40, y: bannerH + contentH * 0.75, rotation: 2 + Math.random() * 3 },
  ];

  for (let i = 0; i < polaroidCount; i++) {
    const pos = polaroidPositions[i % polaroidPositions.length];
    items.push({
      type: 'polaroid',
      x: pos.x + (Math.random() - 0.5) * 30,
      y: pos.y + (Math.random() - 0.5) * 20,
      size: polaroidSize + (Math.random() - 0.5) * 40,
      rotation: pos.rotation,
      zIndex: i
    });
  }

  // Loose object positions - scattered throughout
  const looseSize = 100 + Math.random() * 60;
  const zones = [];

  // Create grid of possible positions
  const cols = 4;
  const rows = 5;
  const cellW = (canvasW - margin * 2) / cols;
  const cellH = contentH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      zones.push({
        x: margin + c * cellW + cellW * 0.3 + Math.random() * cellW * 0.4,
        y: bannerH + r * cellH + cellH * 0.3 + Math.random() * cellH * 0.4
      });
    }
  }

  // Shuffle zones
  for (let i = zones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]];
  }

  for (let i = 0; i < looseCount; i++) {
    const zone = zones[i % zones.length];
    const size = 80 + Math.random() * 80;
    items.push({
      type: 'loose',
      x: zone.x - size / 2,
      y: zone.y - size / 2,
      size: size,
      rotation: (Math.random() - 0.5) * 30,
      shape: Math.random() > 0.7 ? 'circle' : 'square',
      zIndex: polaroidCount + i
    });
  }

  // Sort by y position for natural layering
  return items.sort((a, b) => a.y - b.y);
}

/**
 * Main generation function - V5 Sophisticated Flat-Lay
 */
async function generateFlatLayV5(workbookData, options = {}) {
  const {
    aesthetic = 'dark-editorial',
    symbols = [],
    boardTitle = 'MY 2025 VISION',
    themes = []
  } = workbookData;

  const { costLimit = 1.00, skipGeneration = false, maxImages = 14 } = options;
  const palette = PALETTES[aesthetic] || PALETTES['dark-editorial'];
  const timestamp = Date.now();
  const bannerH = 80;

  console.log('\n' + '='.repeat(60));
  console.log('PREMIUM FLAT-LAY V5 - Sophisticated Editorial Style');
  console.log('='.repeat(60));
  console.log('Design: Dark moody base, bronze accents, elegant typography');
  console.log('Mix: Polaroids + loose objects, subtle paper textures');

  const maxBudget = Math.floor(costLimit / COST_PER_IMAGE);
  const toGen = symbols.slice(0, Math.min(maxImages, maxBudget));
  console.log(`\nItems: ${toGen.length} (~$${(toGen.length * COST_PER_IMAGE).toFixed(2)})`);

  // Generate or create placeholder images
  console.log('\n[1] Preparing images...');
  const images = [];

  if (!skipGeneration) {
    for (let i = 0; i < toGen.length; i++) {
      const buf = await generateImageForItem(toGen[i], aesthetic, i);
      if (buf) images.push(buf);
      if (i < toGen.length - 1) await new Promise(r => setTimeout(r, 350));
    }
  } else {
    // Create sophisticated placeholder colors (dark tones)
    const placeholderColors = ['#3a3530', '#35302a', '#403830', '#2a2825', '#454035', '#383330'];
    for (let i = 0; i < toGen.length; i++) {
      const color = placeholderColors[i % placeholderColors.length];
      images.push(await sharp({
        create: { width: 300, height: 300, channels: 4, background: color }
      }).png().toBuffer());
    }
  }

  // Create dark base canvas
  console.log('[2] Creating dark base...');
  let canvas = await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: palette.background
    }
  }).png().toBuffer();

  // Add subtle torn paper background layers
  console.log('[3] Adding subtle paper textures...');
  const papers = [];

  for (let i = 0; i < 12; i++) {
    const color = palette.paperLayers[i % palette.paperLayers.length];
    const w = 200 + Math.random() * 300;
    const h = 150 + Math.random() * 250;
    const x = -50 + Math.random() * (CANVAS_WIDTH + 50);
    const y = bannerH + Math.random() * (CANVAS_HEIGHT - bannerH);
    const rot = (Math.random() - 0.5) * 25;

    papers.push({
      input: Buffer.from(createBackgroundPaper(w, h, color, rot)),
      top: Math.round(Math.max(0, y - 15)),
      left: Math.round(Math.max(0, x - 15))
    });
  }

  // Composite papers one by one to avoid dimension issues
  for (const paper of papers) {
    try {
      canvas = await sharp(canvas).composite([paper]).png().toBuffer();
    } catch (e) {
      // Skip papers that exceed bounds
    }
  }

  // Calculate layout
  console.log('[4] Calculating layout...');
  const layout = calculateLayout(images.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Create framed/loose items
  console.log('[5] Creating items...');
  const compositeItems = [];

  for (let i = 0; i < Math.min(images.length, layout.length); i++) {
    const item = layout[i];
    const imgBuf = images[i];

    let processed;
    if (item.type === 'polaroid') {
      processed = await createPolaroid(imgBuf, Math.round(item.size), item.rotation);
    } else {
      processed = await createLooseObject(imgBuf, Math.round(item.size), item.rotation, item.shape);
    }

    compositeItems.push({
      input: processed.buffer,
      top: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 50, item.y))),
      left: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - 50, item.x))),
      zIndex: item.zIndex
    });
  }

  // Composite items
  console.log('[6] Compositing items...');
  for (const item of compositeItems) {
    try {
      canvas = await sharp(canvas).composite([{ input: item.input, top: item.top, left: item.left }]).png().toBuffer();
    } catch (e) {
      // Skip items that don't fit
    }
  }

  // Add small metal accent squares
  console.log('[7] Adding metal accents...');
  const accents = [];
  const accentCount = 8 + Math.floor(Math.random() * 6);

  for (let i = 0; i < accentCount; i++) {
    const size = 12 + Math.random() * 10;
    const x = 30 + Math.random() * (CANVAS_WIDTH - 80);
    const y = bannerH + 30 + Math.random() * (CANVAS_HEIGHT - bannerH - 80);

    accents.push({
      input: Buffer.from(createMetalAccent(size, palette.accentMetal)),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  canvas = await sharp(canvas).composite(accents).png().toBuffer();

  // Add title banner
  console.log('[8] Adding title banner...');
  const subtitle = themes.length > 0 ? themes.join('  •  ') : '';
  const bannerSvg = createTitleBanner(CANVAS_WIDTH, boardTitle, subtitle, palette);

  canvas = await sharp(canvas)
    .composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `flatlay-v5-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : images.length * COST_PER_IMAGE;

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('Style: Dark editorial, bronze accents, elegant typography');
  console.log('='.repeat(60));

  return { success: true, filepath, cost, images: images.length };
}

module.exports = { generateFlatLayV5, COST_PER_IMAGE, PALETTES };
