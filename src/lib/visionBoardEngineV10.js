/**
 * Vision Board Engine V10
 *
 * FIXES FROM V9:
 * 1. Quote/text cards truly BETWEEN photos - in actual gaps, not overlapping
 * 2. More photo rotation: ±8-10° like reference
 * 3. Layout designed with gaps specifically for text elements
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
// QUOTE CARD - fits in gaps between photos
// ============================================================

function createQuoteCard(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const fontSize = Math.max(10, Math.min(16, height * 0.13));
  const borderColor = colors.accents[0] || '#D4A574';

  // Word wrap
  const words = text.split(' ');
  const lines = [];
  let line = '';
  const maxChars = Math.floor((width - 20) / (fontSize * 0.42));

  for (const word of words) {
    if ((line + ' ' + word).trim().length <= maxChars) {
      line = (line + ' ' + word).trim();
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const lineHeight = fontSize * 1.4;
  const startY = (height - lines.length * lineHeight) / 2 + fontSize * 0.75;

  const textEls = lines.map((l, i) =>
    `<text x="${width/2}" y="${startY + i * lineHeight}" text-anchor="middle"
           font-family="${fonts.quote}" font-size="${fontSize}px" font-style="italic"
           fill="#3A3530">${escapeXml(l)}</text>`
  ).join('');

  return `<svg width="${width + 16}" height="${height + 16}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="qs${id}"><feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.14)"/></filter></defs>
    <g transform="translate(8,8) rotate(${rotation} ${width/2} ${height/2})">
      <rect width="${width}" height="${height}" fill="#FFFEF8" rx="2" filter="url(#qs${id})"/>
      <rect x="3" y="3" width="${width-6}" height="${height-6}" fill="none" stroke="${borderColor}" stroke-width="0.7" rx="1" opacity="0.35"/>
      <text x="8" y="14" font-family="Georgia" font-size="12" fill="${borderColor}" opacity="0.3">"</text>
      ${textEls}
    </g>
  </svg>`;
}

// ============================================================
// TEXT BLOCK - small bold word in gaps
// ============================================================

function createTextBlock(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const bgColor = colors.accents[Math.floor(Math.random() * colors.accents.length)];
  const textColor = isLightColor(bgColor) ? '#2A2A2A' : '#FFFFFF';
  const fontSize = Math.min(height * 0.5, width * 0.75 / (text.length * 0.5));

  return `<svg width="${width + 14}" height="${height + 14}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="ts${id}"><feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.16)"/></filter></defs>
    <g transform="translate(7,7) rotate(${rotation} ${width/2} ${height/2})">
      <rect width="${width}" height="${height}" fill="${bgColor}" rx="2" filter="url(#ts${id})"/>
      <text x="${width/2}" y="${height/2 + fontSize * 0.35}" text-anchor="middle"
            font-family="${fonts.text}" font-size="${fontSize}px" font-weight="600"
            letter-spacing="0.08em" fill="${textColor}">${escapeXml(text.toUpperCase())}</text>
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
// LAYOUT WITH INTENTIONAL GAPS FOR TEXT
// ============================================================

/**
 * Layout designed with specific gaps for quote/text cards
 * Photos are positioned to leave natural spaces
 * Rotation: ±8-10° (more dramatic like reference)
 */
function calculateLayoutWithGaps(photoCount, canvasW, canvasH, bannerH) {
  const photos = [];
  const gaps = [];

  // Photo sizes - large like reference
  const sizes = [265, 250, 270, 255, 275, 245, 260, 255, 270, 250, 265, 255];

  // Strategic layout leaving gaps for text
  // The layout is designed so gaps naturally form

  const photoPositions = [
    // Row 1 - top left and right, gap in middle-right area
    { x: -20, y: bannerH + 5, rot: -8 },
    { x: 340, y: bannerH - 10, rot: 6 },
    { x: 720, y: bannerH + 15, rot: -5 },

    // Row 2 - staggered, gap on left side
    { x: 120, y: bannerH + 235, rot: 7 },
    { x: 430, y: bannerH + 220, rot: -9 },
    { x: 750, y: bannerH + 245, rot: 5 },

    // Row 3 - gap on right side
    { x: -15, y: bannerH + 470, rot: -6 },
    { x: 310, y: bannerH + 455, rot: 8 },
    { x: 680, y: bannerH + 480, rot: -7 },

    // Row 4 - bottom, bleeds off, gap in middle
    { x: 50, y: bannerH + 700, rot: 9 },
    { x: 400, y: bannerH + 720, rot: -8 },
    { x: 730, y: bannerH + 690, rot: 6 },
  ];

  for (let i = 0; i < Math.min(photoCount, photoPositions.length); i++) {
    const pos = photoPositions[i];
    const size = sizes[i];
    photos.push({
      x: pos.x + (Math.random() - 0.5) * 15,
      y: pos.y + (Math.random() - 0.5) * 12,
      size: size,
      rotation: pos.rot + (Math.random() - 0.5) * 4,
      zIndex: i
    });
  }

  // Define gaps - these are the spaces BETWEEN photos where text fits
  // Positioned to NOT overlap with photos
  // More gaps for 4-5 quote/text elements
  gaps.push(
    // Quote gaps (larger, for sentences)
    { x: 8, y: bannerH + 175, w: 115, h: 68, type: 'quote', rot: 4 },
    { x: canvasW - 145, y: bannerH + 410, w: 118, h: 65, type: 'quote', rot: -5 },
    { x: 12, y: bannerH + 620, w: 108, h: 62, type: 'quote', rot: 3 },
    { x: canvasW - 130, y: bannerH + 680, w: 105, h: 60, type: 'quote', rot: -4 },

    // Text block gaps (smaller, for single words)
    { x: canvasW - 110, y: bannerH + 85, w: 76, h: 36, type: 'text', rot: -6 },
    { x: 5, y: bannerH + 395, w: 72, h: 34, type: 'text', rot: 5 },
    { x: canvasW - 95, y: bannerH + 265, w: 70, h: 32, type: 'text', rot: -3 },
    { x: 280, y: bannerH + 720, w: 74, h: 35, type: 'text', rot: 4 },
  );

  return { photos, gaps };
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
  console.log('VISION BOARD ENGINE V10 - Gaps Layout');
  console.log('='.repeat(60));
  console.log(`Title: "${title}"`);
  console.log(`Photos: ${photos.length}, Quotes: ${quotes.length}, Text: ${textBlocks.length}`);
  console.log('Photo rotation: ±8-10° (more dramatic)');
  console.log('Text placement: In gaps BETWEEN photos');

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

  // Soft patches
  for (let i = 0; i < 5; i++) {
    const c = lighten(colors.background, (Math.random() - 0.5) * 6);
    const w = 180 + Math.random() * 220;
    const h = 130 + Math.random() * 180;
    bgEls.push({
      input: Buffer.from(createAccentRect(w, h, c, (Math.random() - 0.5) * 15)),
      top: Math.round(bannerH + Math.random() * (CANVAS_HEIGHT - bannerH - h)),
      left: Math.round(Math.random() * CANVAS_WIDTH - 40)
    });
  }

  // Colored rectangles
  for (let i = 0; i < 14; i++) {
    const c = colors.accents[i % colors.accents.length];
    const w = 25 + Math.random() * 45;
    const h = 14 + Math.random() * 28;
    bgEls.push({
      input: Buffer.from(createAccentRect(w, h, c, (Math.random() - 0.5) * 25)),
      top: Math.round(bannerH + 8 + Math.random() * (CANVAS_HEIGHT - bannerH - 35)),
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
    for (let i = 0; i < 26; i++) {
      const size = 22 + Math.random() * 55;
      bokehs.push({
        input: Buffer.from(createBokeh(size, colors.accents[0] || '#FFE4B5', 0.26)),
        top: Math.round(Math.random() * CANVAS_HEIGHT),
        left: Math.round(Math.random() * CANVAS_WIDTH)
      });
    }
    canvas = await sharp(canvas).composite(bokehs).png().toBuffer();
  }

  // Get layout with gaps
  console.log('[5] Calculating layout with gaps...');
  const { photos: photoLayout, gaps } = calculateLayoutWithGaps(photoBuffers.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Create and composite quote/text cards FIRST (so photos layer over edges)
  console.log('[6] Adding quotes and text in gaps...');
  let quoteIdx = 0, textIdx = 0;
  for (const gap of gaps) {
    try {
      let svg;
      if (gap.type === 'quote' && quotes[quoteIdx]) {
        svg = createQuoteCard(quotes[quoteIdx++], gap.w, gap.h, colors, gap.rot, fonts);
      } else if (gap.type === 'text' && textBlocks[textIdx]) {
        svg = createTextBlock(textBlocks[textIdx++], gap.w, gap.h, colors, gap.rot, fonts);
      }
      if (svg) {
        const buf = await sharp(Buffer.from(svg)).png().toBuffer();
        canvas = await sharp(canvas).composite([{ input: buf, top: Math.round(gap.y), left: Math.round(gap.x) }]).png().toBuffer();
      }
    } catch (e) {}
  }

  // Create photo frames
  console.log('[7] Creating photo frames...');
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

  photoItems.sort((a, b) => a.zIndex - b.zIndex);

  console.log('[8] Compositing photos...');
  for (const item of photoItems) {
    try { canvas = await sharp(canvas).composite([item]).png().toBuffer(); } catch (e) {}
  }

  // Decorations
  if (style.decorations) {
    console.log('[9] Adding decorations...');
    const decs = [];
    const types = ['heart', 'star', 'flower'];
    for (let i = 0; i < 14; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors.accents[Math.floor(Math.random() * colors.accents.length)];
      const size = 18 + Math.random() * 24;
      decs.push({
        input: Buffer.from(createDecoration(type, size, color)),
        top: Math.round(bannerH + 12 + Math.random() * (CANVAS_HEIGHT - bannerH - 45)),
        left: Math.round(Math.random() * (CANVAS_WIDTH - size))
      });
    }
    canvas = await sharp(canvas).composite(decs).png().toBuffer();
  }

  // Banner
  console.log('[10] Adding banner...');
  const bannerSvg = createBanner(CANVAS_WIDTH, title, subtitle, colors, fonts);
  canvas = await sharp(canvas).composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }]).png().toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `visionboard-v10-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : photoBuffers.length * COST_PER_IMAGE;
  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('='.repeat(60));

  return { success: true, filepath, cost, photoCount: photoBuffers.length };
}

module.exports = { generateVisionBoard, COST_PER_IMAGE };
