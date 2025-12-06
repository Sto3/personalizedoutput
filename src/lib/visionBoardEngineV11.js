/**
 * Vision Board Engine V11
 *
 * Based on REFERENCE IMAGE analysis:
 * - 3 columns x 4 rows of photos (12 total)
 * - Photo sizes ~220-250px (not too big, not too small)
 * - Moderate rotation ±6-8°
 * - Photos overlap slightly
 * - Quote/text cards tucked in gaps between photos
 * - Dense layout - fills the canvas
 * - Bottom photos bleed off slightly
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
  const padding = Math.round(size * 0.03);
  const bottomPadding = Math.round(size * 0.09);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;
  const totalW = frameW + 30;
  const totalH = frameH + 30;

  const id = Math.random().toString(36).substr(2, 8);

  const resized = await sharp(imgBuffer).resize(size, size, { fit: 'cover' }).toBuffer();

  const frameSvg = `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ps${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.18)"/>
      </filter>
    </defs>
    <g transform="translate(15,13) rotate(${rotation} ${frameW/2} ${frameH/2})">
      <rect x="0" y="0" width="${frameW}" height="${frameH}" fill="#FFFFFF" rx="1" filter="url(#ps${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();
  return await sharp(frame)
    .composite([{ input: resized, left: Math.round(15 + padding), top: Math.round(13 + padding) }])
    .png()
    .toBuffer();
}

// ============================================================
// QUOTE CARD
// ============================================================

function createQuoteCard(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const fontSize = Math.max(10, Math.min(15, height * 0.13));
  const borderColor = colors.accents[0] || '#D4A574';

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
    <defs><filter id="qs${id}"><feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.12)"/></filter></defs>
    <g transform="translate(8,8) rotate(${rotation} ${width/2} ${height/2})">
      <rect width="${width}" height="${height}" fill="#FFFEF8" rx="2" filter="url(#qs${id})"/>
      <rect x="3" y="3" width="${width-6}" height="${height-6}" fill="none" stroke="${borderColor}" stroke-width="0.6" rx="1" opacity="0.35"/>
      <text x="7" y="13" font-family="Georgia" font-size="11" fill="${borderColor}" opacity="0.25">"</text>
      ${textEls}
    </g>
  </svg>`;
}

// ============================================================
// TEXT BLOCK
// ============================================================

function createTextBlock(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const bgColor = colors.accents[Math.floor(Math.random() * colors.accents.length)];
  const textColor = isLightColor(bgColor) ? '#2A2A2A' : '#FFFFFF';
  const fontSize = Math.min(height * 0.48, width * 0.75 / (text.length * 0.5));

  return `<svg width="${width + 14}" height="${height + 14}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="ts${id}"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.15)"/></filter></defs>
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
  const shapes = {
    heart: `<path d="M50 88C25 65 8 45 18 28C30 10 50 25 50 25C50 25 70 10 82 28C92 45 75 65 50 88Z" fill="url(#g${id})" opacity="0.8"/>`,
    star: `<polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="url(#g${id})" opacity="0.75"/>`,
    flower: `<g opacity="0.8"><ellipse cx="50" cy="25" rx="12" ry="18" fill="url(#g${id})"/><ellipse cx="50" cy="75" rx="12" ry="18" fill="url(#g${id})"/><ellipse cx="25" cy="50" rx="18" ry="12" fill="url(#g${id})"/><ellipse cx="75" cy="50" rx="18" ry="12" fill="url(#g${id})"/><circle cx="50" cy="50" r="10" fill="#FFEAA7"/></g>`
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${lighten(color, 20)}"/><stop offset="100%" stop-color="${color}"/>
    </linearGradient></defs>
    ${shapes[type] || shapes.heart}
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
  return `<svg width="${w + 12}" height="${h + 12}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(6,6) rotate(${rotation} ${w/2} ${h/2})">
      <rect width="${w}" height="${h}" fill="${color}" opacity="0.5"/>
    </g>
  </svg>`;
}

function createBanner(width, title, subtitle, colors, fonts) {
  const height = 60;
  const displayTitle = fonts.titleTransform === 'uppercase' ? title.toUpperCase() : title;
  const titleSize = Math.min(28, Math.floor(width * 0.72 / displayTitle.length * 1.8));

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${colors.banner}"/>
    <text x="${width/2}" y="${subtitle ? 30 : 36}" text-anchor="middle"
          font-family="${fonts.title}" font-size="${titleSize}px" font-weight="400"
          letter-spacing="${fonts.titleLetterSpacing}" fill="${colors.bannerText}">${escapeXml(displayTitle)}</text>
    ${subtitle ? `<text x="${width/2}" y="48" text-anchor="middle" font-family="${FONTS.sans}"
          font-size="8px" letter-spacing="0.16em" fill="${colors.bannerSubtext}">${escapeXml(subtitle.toUpperCase())}</text>` : ''}
  </svg>`;
}

// ============================================================
// REFERENCE-MATCHED LAYOUT
// 3 columns x 4 rows, sizes 220-250px, rotation ±6-8°
// ============================================================

function calculateReferenceLayout(photoCount, canvasW, canvasH, bannerH) {
  const photos = [];
  const textGaps = [];

  const contentH = canvasH - bannerH;
  const colW = canvasW / 3;
  const rowH = contentH / 3.6; // Overlap rows slightly

  // Photo sizes - moderate, like reference
  const baseSizes = [235, 225, 240, 230, 245, 220, 235, 230, 240, 225, 235, 230];

  // 3x4 grid with organic offsets and rotation ±6-8°
  const grid = [
    // Row 0 (top)
    { col: 0, row: 0, offX: -15, offY: 5, rot: -7 },
    { col: 1, row: 0, offX: 10, offY: -8, rot: 5 },
    { col: 2, row: 0, offX: 5, offY: 10, rot: -4 },
    // Row 1
    { col: 0, row: 1, offX: 5, offY: -5, rot: 6 },
    { col: 1, row: 1, offX: -8, offY: 8, rot: -6 },
    { col: 2, row: 1, offX: -5, offY: -3, rot: 7 },
    // Row 2
    { col: 0, row: 2, offX: -10, offY: 5, rot: -5 },
    { col: 1, row: 2, offX: 8, offY: -5, rot: 8 },
    { col: 2, row: 2, offX: 0, offY: 8, rot: -7 },
    // Row 3 (bottom - bleeds off)
    { col: 0, row: 3, offX: 5, offY: 10, rot: 6 },
    { col: 1, row: 3, offX: -5, offY: 5, rot: -6 },
    { col: 2, row: 3, offX: -10, offY: -5, rot: 5 },
  ];

  for (let i = 0; i < Math.min(photoCount, grid.length); i++) {
    const g = grid[i];
    const size = baseSizes[i];
    const x = g.col * colW + (colW - size) / 2 + g.offX + (Math.random() - 0.5) * 12;
    const y = bannerH + g.row * rowH + g.offY + (Math.random() - 0.5) * 10;
    const rot = g.rot + (Math.random() - 0.5) * 3;

    photos.push({ x, y, size, rotation: rot, zIndex: i });
  }

  // Text gaps - positioned in corners and edges where photos don't fully cover
  textGaps.push(
    // Left edge gaps
    { x: 5, y: bannerH + 165, w: 95, h: 55, type: 'text', rot: 5 },
    { x: 8, y: bannerH + 440, w: 90, h: 52, type: 'quote', rot: -4 },

    // Right edge gaps
    { x: canvasW - 105, y: bannerH + 130, w: 88, h: 50, type: 'text', rot: -6 },
    { x: canvasW - 115, y: bannerH + 395, w: 98, h: 58, type: 'quote', rot: 4 },
    { x: canvasW - 100, y: bannerH + 620, w: 85, h: 48, type: 'quote', rot: -5 },

    // Bottom area
    { x: 15, y: bannerH + 680, w: 92, h: 54, type: 'quote', rot: 3 },
    { x: canvasW / 2 - 45, y: canvasH - 85, w: 90, h: 50, type: 'text', rot: -3 },
  );

  return { photos, textGaps };
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

  console.log(`  [${index + 1}] "${symbol.substring(0, 35)}..."`);
  try {
    const url = await generateImage(prompt, { model: 'V_2_TURBO', aspectRatio: 'ASPECT_1_1' });
    return await downloadImage(url);
  } catch (e) {
    console.error(`  [${index + 1}] Error:`, e.message);
    return null;
  }
}

// ============================================================
// MAIN
// ============================================================

async function generateVisionBoard(input, options = {}) {
  const { skipGeneration = false, costLimit = 1.00 } = options;
  const timestamp = Date.now();
  const bannerH = 60;

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
  console.log('VISION BOARD ENGINE V11 - Reference-Matched');
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

  // Canvas
  console.log('[2] Creating canvas...');
  let canvas = await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: colors.background }
  }).png().toBuffer();

  // Background elements
  console.log('[3] Adding background...');
  const bgEls = [];

  for (let i = 0; i < 5; i++) {
    const c = lighten(colors.background, (Math.random() - 0.5) * 5);
    const w = 150 + Math.random() * 200;
    const h = 100 + Math.random() * 150;
    bgEls.push({
      input: Buffer.from(createAccentRect(w, h, c, (Math.random() - 0.5) * 12)),
      top: Math.round(bannerH + Math.random() * (CANVAS_HEIGHT - bannerH - h)),
      left: Math.round(Math.random() * CANVAS_WIDTH - 30)
    });
  }

  for (let i = 0; i < 14; i++) {
    const c = colors.accents[i % colors.accents.length];
    const w = 22 + Math.random() * 40;
    const h = 12 + Math.random() * 25;
    bgEls.push({
      input: Buffer.from(createAccentRect(w, h, c, (Math.random() - 0.5) * 20)),
      top: Math.round(bannerH + 5 + Math.random() * (CANVAS_HEIGHT - bannerH - 30)),
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
    for (let i = 0; i < 25; i++) {
      const size = 20 + Math.random() * 50;
      bokehs.push({
        input: Buffer.from(createBokeh(size, colors.accents[0] || '#FFE4B5', 0.25)),
        top: Math.round(Math.random() * CANVAS_HEIGHT),
        left: Math.round(Math.random() * CANVAS_WIDTH)
      });
    }
    canvas = await sharp(canvas).composite(bokehs).png().toBuffer();
  }

  // Layout
  console.log('[5] Calculating layout...');
  const { photos: photoLayout, textGaps } = calculateReferenceLayout(photoBuffers.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Add text/quotes in gaps FIRST
  console.log('[6] Adding text in gaps...');
  let quoteIdx = 0, textIdx = 0;
  for (const gap of textGaps) {
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

  // Photos
  console.log('[7] Creating photos...');
  const photoItems = [];
  for (let i = 0; i < Math.min(photoBuffers.length, photoLayout.length); i++) {
    const pos = photoLayout[i];
    const frameBuf = await createPhoto(photoBuffers[i], pos.size, pos.rotation);
    photoItems.push({ input: frameBuf, top: Math.round(pos.y), left: Math.round(pos.x), zIndex: pos.zIndex });
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
    for (let i = 0; i < 12; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors.accents[Math.floor(Math.random() * colors.accents.length)];
      const size = 18 + Math.random() * 22;
      decs.push({
        input: Buffer.from(createDecoration(type, size, color)),
        top: Math.round(bannerH + 10 + Math.random() * (CANVAS_HEIGHT - bannerH - 40)),
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
  const filepath = path.join(OUTPUT_DIR, `visionboard-v11-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : photoBuffers.length * COST_PER_IMAGE;
  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('='.repeat(60));

  return { success: true, filepath, cost, photoCount: photoBuffers.length };
}

module.exports = { generateVisionBoard, COST_PER_IMAGE };
