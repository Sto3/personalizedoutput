/**
 * Vision Board Engine V9
 *
 * MATCHING THE REFERENCE IMAGE:
 * 1. LARGER photos (240-280px) - fill more space
 * 2. Photos go to EDGES and BLEED OFF canvas
 * 3. Tighter layout - less visible background
 * 4. Quote/text cards BETWEEN photos (in gaps), not on top
 * 5. Photos OVERLAP each other
 * 6. Subtle rotation (±5°) not wild angles
 * 7. Bottom row photos cut off at canvas edge
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

// Typography
const FONTS = {
  script: "'Snell Roundhand', 'Brush Script MT', cursive",
  serifCaps: "'Bodoni 72 Smallcaps', 'Bodoni MT', 'Didot', serif",
  serifQuote: "'Cormorant Garamond', 'Playfair Display', 'Georgia', serif",
  sans: "'Helvetica Neue', 'Arial', sans-serif"
};

function selectFonts(style) {
  const mood = (style?.mood || '').toLowerCase();
  const isMasculine = mood.includes('masculine') || mood.includes('dark') || mood.includes('discipline');

  return {
    title: isMasculine ? FONTS.serifCaps : FONTS.script,
    titleTransform: isMasculine ? 'uppercase' : 'none',
    titleLetterSpacing: isMasculine ? '0.15em' : '0.02em',
    quote: FONTS.serifQuote,
    text: FONTS.serifCaps
  };
}

// ============================================================
// PHOTO FRAME
// ============================================================

async function createPhoto(imgBuffer, size, rotation) {
  const padding = Math.round(size * 0.028);
  const bottomPadding = Math.round(size * 0.085);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;
  const totalW = frameW + 35;
  const totalH = frameH + 35;

  const id = Math.random().toString(36).substr(2, 8);

  const resized = await sharp(imgBuffer)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  const frameSvg = `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ps${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.2)"/>
      </filter>
    </defs>
    <g transform="translate(17,15) rotate(${rotation} ${frameW/2} ${frameH/2})">
      <rect x="0" y="0" width="${frameW}" height="${frameH}" fill="#FFFFFF" rx="1" filter="url(#ps${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();

  return await sharp(frame)
    .composite([{ input: resized, left: Math.round(17 + padding), top: Math.round(15 + padding) }])
    .png()
    .toBuffer();
}

// ============================================================
// QUOTE CARD - smaller, fits in gaps
// ============================================================

function createQuoteCard(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const fontSize = Math.max(11, Math.min(18, height * 0.14));
  const borderColor = colors.accents[0] || '#D4A574';

  // Word wrap
  const words = text.split(' ');
  const lines = [];
  let line = '';
  const maxChars = Math.floor((width - 24) / (fontSize * 0.45));

  for (const word of words) {
    if ((line + ' ' + word).trim().length <= maxChars) {
      line = (line + ' ' + word).trim();
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const lineHeight = fontSize * 1.45;
  const startY = (height - lines.length * lineHeight) / 2 + fontSize * 0.8;

  const textEls = lines.map((l, i) =>
    `<text x="${width/2}" y="${startY + i * lineHeight}" text-anchor="middle"
           font-family="${fonts.quote}" font-size="${fontSize}px" font-style="italic"
           fill="#3A3530">${escapeXml(l)}</text>`
  ).join('');

  return `<svg width="${width + 20}" height="${height + 20}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="qs${id}"><feDropShadow dx="1" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.15)"/></filter></defs>
    <g transform="translate(10,10) rotate(${rotation} ${width/2} ${height/2})">
      <rect width="${width}" height="${height}" fill="#FFFEF8" rx="2" filter="url(#qs${id})"/>
      <rect x="4" y="4" width="${width-8}" height="${height-8}" fill="none" stroke="${borderColor}" stroke-width="0.8" rx="1" opacity="0.4"/>
      <text x="10" y="16" font-family="Georgia" font-size="14" fill="${borderColor}" opacity="0.3">"</text>
      ${textEls}
    </g>
  </svg>`;
}

// ============================================================
// TEXT BLOCK - small bold word
// ============================================================

function createTextBlock(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const bgColor = colors.accents[Math.floor(Math.random() * colors.accents.length)];
  const textColor = isLightColor(bgColor) ? '#2A2A2A' : '#FFFFFF';
  const fontSize = Math.min(height * 0.5, width * 0.8 / (text.length * 0.55));

  return `<svg width="${width + 18}" height="${height + 18}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="ts${id}"><feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.18)"/></filter></defs>
    <g transform="translate(9,9) rotate(${rotation} ${width/2} ${height/2})">
      <rect width="${width}" height="${height}" fill="${bgColor}" rx="2" filter="url(#ts${id})"/>
      <text x="${width/2}" y="${height/2 + fontSize * 0.35}" text-anchor="middle"
            font-family="${fonts.text}" font-size="${fontSize}px" font-weight="600"
            letter-spacing="0.1em" fill="${textColor}">${escapeXml(text.toUpperCase())}</text>
    </g>
  </svg>`;
}

// ============================================================
// DECORATIONS
// ============================================================

function createDecoration(type, size, color) {
  const id = Math.random().toString(36).substr(2, 8);
  const defs = {
    heart: `<path d="M50 88C25 65 8 45 18 28C30 10 50 25 50 25C50 25 70 10 82 28C92 45 75 65 50 88Z" fill="url(#g${id})" opacity="0.8"/>`,
    star: `<polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="url(#g${id})" opacity="0.75"/>`,
    flower: `<g opacity="0.8"><ellipse cx="50" cy="25" rx="12" ry="18" fill="url(#g${id})"/><ellipse cx="50" cy="75" rx="12" ry="18" fill="url(#g${id})"/><ellipse cx="25" cy="50" rx="18" ry="12" fill="url(#g${id})"/><ellipse cx="75" cy="50" rx="18" ry="12" fill="url(#g${id})"/><circle cx="50" cy="50" r="10" fill="#FFEAA7"/></g>`
  };

  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${lighten(color, 20)}"/><stop offset="100%" stop-color="${color}"/>
    </linearGradient></defs>
    ${defs[type] || defs.heart}
  </svg>`;
}

function createBokeh(size, color, opacity) {
  const id = Math.random().toString(36).substr(2, 8);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bk${id}" cx="30%" cy="30%">
      <stop offset="0%" stop-color="white" stop-opacity="${opacity * 1.5}"/>
      <stop offset="50%" stop-color="${color}" stop-opacity="${opacity}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bk${id})"/>
  </svg>`;
}

function createAccentRect(w, h, color, rotation) {
  return `<svg width="${w + 14}" height="${h + 14}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(7,7) rotate(${rotation} ${w/2} ${h/2})">
      <rect width="${w}" height="${h}" fill="${color}" opacity="0.5"/>
    </g>
  </svg>`;
}

function createBanner(width, title, subtitle, colors, fonts) {
  const height = 62;
  const displayTitle = fonts.titleTransform === 'uppercase' ? title.toUpperCase() : title;
  const titleSize = Math.min(30, Math.floor(width * 0.75 / displayTitle.length * 1.8));

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${colors.banner}"/>
    <text x="${width/2}" y="${subtitle ? 32 : 38}" text-anchor="middle"
          font-family="${fonts.title}" font-size="${titleSize}px" font-weight="400"
          letter-spacing="${fonts.titleLetterSpacing}" fill="${colors.bannerText}">${escapeXml(displayTitle)}</text>
    ${subtitle ? `<text x="${width/2}" y="50" text-anchor="middle" font-family="${FONTS.sans}"
          font-size="9px" letter-spacing="0.18em" fill="${colors.bannerSubtext}">${escapeXml(subtitle.toUpperCase())}</text>` : ''}
  </svg>`;
}

// ============================================================
// DENSE LAYOUT - Matching Reference
// ============================================================

/**
 * 12 photos in dense grid:
 * - Row 1: 3 photos (top, can overlap banner slightly)
 * - Row 2: 3 photos
 * - Row 3: 3 photos
 * - Row 4: 3 photos (bottom, bleeds off canvas)
 *
 * LARGER sizes: 250-290px
 * Photos can go NEGATIVE (off left edge) or past right edge
 * Subtle rotation: ±5 degrees
 */
function calculateDenseLayout(photoCount, canvasW, canvasH, bannerH) {
  const items = [];
  const contentH = canvasH - bannerH;

  // Larger photo sizes like reference
  const sizes = [270, 255, 260, 265, 280, 250, 275, 260, 285, 265, 270, 255];

  // 4 rows x 3 cols, tight spacing
  const rowHeight = contentH / 3.8; // Rows overlap
  const colWidth = canvasW / 3;

  const grid = [
    // Row 1 - top (starts right below banner)
    { row: 0, col: 0, offX: -25, offY: 10 },
    { row: 0, col: 1, offX: 15, offY: -5 },
    { row: 0, col: 2, offX: 10, offY: 15 },
    // Row 2
    { row: 1, col: 0, offX: -15, offY: -10 },
    { row: 1, col: 1, offX: 5, offY: 8 },
    { row: 1, col: 2, offX: -10, offY: -5 },
    // Row 3
    { row: 2, col: 0, offX: -20, offY: 5 },
    { row: 2, col: 1, offX: 10, offY: -8 },
    { row: 2, col: 2, offX: 5, offY: 10 },
    // Row 4 - bottom (bleeds off)
    { row: 3, col: 0, offX: -30, offY: 15 },
    { row: 3, col: 1, offX: 0, offY: 5 },
    { row: 3, col: 2, offX: -15, offY: -5 },
  ];

  for (let i = 0; i < Math.min(photoCount, grid.length); i++) {
    const g = grid[i];
    const size = sizes[i];

    const baseX = g.col * colWidth + (colWidth - size) / 2;
    const baseY = bannerH + g.row * rowHeight;

    items.push({
      x: baseX + g.offX + (Math.random() - 0.5) * 10,
      y: baseY + g.offY + (Math.random() - 0.5) * 8,
      size: size,
      rotation: (Math.random() - 0.5) * 10, // Subtle: ±5°
      zIndex: i
    });
  }

  return items;
}

/**
 * Find gaps BETWEEN photos for quote/text cards
 */
function calculateGapPositions(photoLayout, canvasW, canvasH, bannerH) {
  // Predefined gap positions that typically exist between photos
  return [
    // Gap between row 1 and row 2, left side
    { x: 5, y: bannerH + 190, w: 130, h: 80, type: 'quote' },
    // Gap in middle area
    { x: canvasW - 175, y: bannerH + 380, w: 140, h: 85, type: 'quote' },
    // Gap lower left
    { x: 15, y: bannerH + 620, w: 125, h: 75, type: 'quote' },
    // Small text block gaps
    { x: canvasW - 130, y: bannerH + 120, w: 85, h: 42, type: 'text' },
    { x: 10, y: bannerH + 450, w: 80, h: 40, type: 'text' },
  ];
}

// ============================================================
// UTILITIES
// ============================================================

function escapeXml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lighten(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const a = Math.round(2.55 * pct);
  const r = Math.min(255, Math.max(0, (n >> 16) + a));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xFF) + a));
  const b = Math.min(255, Math.max(0, (n & 0xFF) + a));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

function isLightColor(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.5;
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

async function generatePhoto(symbol, style, index) {
  const noPeople = "no people, no faces, no hands, no body parts";
  const mood = style?.mood || "aesthetic dreamy warm";
  const prompt = `Beautiful photograph of ${symbol}. ${mood}, professional photography. ${noPeople}, no text, no logos.`;

  console.log(`  [${index + 1}] "${symbol.substring(0, 38)}..."`);
  try {
    const url = await generateImage(prompt, { model: 'V_2_TURBO', aspectRatio: 'ASPECT_1_1' });
    return await downloadImage(url);
  } catch (e) {
    console.error(`  [${index + 1}] Error:`, e.message);
    return null;
  }
}

// ============================================================
// MAIN GENERATOR
// ============================================================

async function generateVisionBoard(input, options = {}) {
  const { skipGeneration = false, costLimit = 1.00 } = options;
  const timestamp = Date.now();
  const bannerH = 62;

  const title = input.title || 'My Vision';
  const subtitle = input.subtitle || '';
  const colors = {
    background: input.colors?.background || '#F5E8ED',
    accents: input.colors?.accents || ['#FFB6C1', '#B4E4FF', '#E8D4F0', '#FFEAA7'],
    banner: input.colors?.banner || '#4A3F45',
    bannerText: input.colors?.bannerText || '#FFFFFF',
    bannerSubtext: input.colors?.bannerSubtext || 'rgba(255,255,255,0.7)'
  };
  const photos = input.photos || [];
  const quotes = input.quotes || [];
  const textBlocks = input.textBlocks || [];
  const style = {
    decorations: input.style?.decorations !== false,
    bokeh: input.style?.bokeh !== false,
    mood: input.style?.mood || 'dreamy warm aesthetic'
  };

  const fonts = selectFonts(style);

  console.log('\n' + '='.repeat(60));
  console.log('VISION BOARD ENGINE V9 - Reference-Matched Layout');
  console.log('='.repeat(60));
  console.log(`Title: "${title}"`);
  console.log(`Photos: ${photos.length}, Quotes: ${quotes.length}, Text: ${textBlocks.length}`);

  // Generate photos
  console.log('\n[1] Generating photos...');
  const photoBuffers = [];
  const maxPhotos = Math.min(photos.length, 12, Math.floor(costLimit / COST_PER_IMAGE));

  if (!skipGeneration) {
    for (let i = 0; i < maxPhotos; i++) {
      const buf = await generatePhoto(photos[i], style, i);
      if (buf) photoBuffers.push(buf);
      if (i < maxPhotos - 1) await new Promise(r => setTimeout(r, 350));
    }
  } else {
    for (let i = 0; i < Math.min(photos.length, 12); i++) {
      const color = colors.accents[i % colors.accents.length];
      photoBuffers.push(await sharp({
        create: { width: 300, height: 300, channels: 4, background: color }
      }).png().toBuffer());
    }
  }

  // Create canvas
  console.log('[2] Creating canvas...');
  let canvas = await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: colors.background }
  }).png().toBuffer();

  // Background elements
  console.log('[3] Adding background...');
  const bgEls = [];

  // Soft background patches
  for (let i = 0; i < 5; i++) {
    const c = lighten(colors.background, (Math.random() - 0.5) * 6);
    const w = 200 + Math.random() * 250;
    const h = 150 + Math.random() * 200;
    bgEls.push({
      input: Buffer.from(createAccentRect(w, h, c, (Math.random() - 0.5) * 15)),
      top: Math.round(bannerH + Math.random() * (CANVAS_HEIGHT - bannerH - h)),
      left: Math.round(Math.random() * CANVAS_WIDTH - 50)
    });
  }

  // Colored accent rectangles
  for (let i = 0; i < 16; i++) {
    const c = colors.accents[i % colors.accents.length];
    const w = 28 + Math.random() * 50;
    const h = 16 + Math.random() * 32;
    bgEls.push({
      input: Buffer.from(createAccentRect(w, h, c, (Math.random() - 0.5) * 25)),
      top: Math.round(bannerH + 10 + Math.random() * (CANVAS_HEIGHT - bannerH - 40)),
      left: Math.round(Math.random() * CANVAS_WIDTH)
    });
  }

  for (const el of bgEls) {
    try { canvas = await sharp(canvas).composite([el]).png().toBuffer(); } catch (e) {}
  }

  // Bokeh
  if (style.bokeh) {
    console.log('[4] Adding bokeh...');
    const bokehs = [];
    for (let i = 0; i < 28; i++) {
      const size = 25 + Math.random() * 60;
      bokehs.push({
        input: Buffer.from(createBokeh(size, colors.accents[0] || '#FFE4B5', 0.28)),
        top: Math.round(Math.random() * CANVAS_HEIGHT),
        left: Math.round(Math.random() * CANVAS_WIDTH)
      });
    }
    canvas = await sharp(canvas).composite(bokehs).png().toBuffer();
  }

  // Dense photo layout
  console.log('[5] Creating dense photo layout...');
  const photoLayout = calculateDenseLayout(photoBuffers.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Create frames
  const photoItems = [];
  for (let i = 0; i < Math.min(photoBuffers.length, photoLayout.length); i++) {
    const pos = photoLayout[i];
    const frameBuf = await createPhoto(photoBuffers[i], pos.size, pos.rotation);
    photoItems.push({
      input: frameBuf,
      top: Math.round(pos.y),
      left: Math.round(pos.x),
      zIndex: pos.zIndex
    });
  }

  // Sort by zIndex
  photoItems.sort((a, b) => a.zIndex - b.zIndex);

  console.log('[6] Compositing photos...');
  for (const item of photoItems) {
    try { canvas = await sharp(canvas).composite([item]).png().toBuffer(); } catch (e) {}
  }

  // Quote/text in GAPS (not on top)
  console.log('[7] Adding quotes and text in gaps...');
  const gaps = calculateGapPositions(photoLayout, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  let quoteIdx = 0, textIdx = 0;
  for (const gap of gaps) {
    try {
      let svg;
      if (gap.type === 'quote' && quotes[quoteIdx]) {
        svg = createQuoteCard(quotes[quoteIdx++], gap.w, gap.h, colors, (Math.random() - 0.5) * 8, fonts);
      } else if (gap.type === 'text' && textBlocks[textIdx]) {
        svg = createTextBlock(textBlocks[textIdx++], gap.w, gap.h, colors, (Math.random() - 0.5) * 10, fonts);
      }
      if (svg) {
        const buf = await sharp(Buffer.from(svg)).png().toBuffer();
        canvas = await sharp(canvas).composite([{ input: buf, top: Math.round(gap.y), left: Math.round(gap.x) }]).png().toBuffer();
      }
    } catch (e) {}
  }

  // Decorations
  if (style.decorations) {
    console.log('[8] Adding decorations...');
    const decs = [];
    const types = ['heart', 'star', 'flower'];
    for (let i = 0; i < 14; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors.accents[Math.floor(Math.random() * colors.accents.length)];
      const size = 20 + Math.random() * 26;
      decs.push({
        input: Buffer.from(createDecoration(type, size, color)),
        top: Math.round(bannerH + 15 + Math.random() * (CANVAS_HEIGHT - bannerH - 50)),
        left: Math.round(Math.random() * (CANVAS_WIDTH - size))
      });
    }
    canvas = await sharp(canvas).composite(decs).png().toBuffer();
  }

  // Banner
  console.log('[9] Adding banner...');
  const bannerSvg = createBanner(CANVAS_WIDTH, title, subtitle, colors, fonts);
  canvas = await sharp(canvas).composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }]).png().toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `visionboard-v9-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : photoBuffers.length * COST_PER_IMAGE;
  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('='.repeat(60));

  return { success: true, filepath, cost, photoCount: photoBuffers.length };
}

module.exports = { generateVisionBoard, COST_PER_IMAGE };
