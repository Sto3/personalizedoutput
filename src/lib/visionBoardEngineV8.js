/**
 * Vision Board Engine V8
 *
 * FIXES FROM V7:
 * 1. DENSER LAYOUT - 10-12 photos + quote/text elements (not replacing photos)
 * 2. MORE OVERLAP - elements touch and overlap like reference
 * 3. LESS MARGIN - push content to edges
 * 4. SOPHISTICATED TYPOGRAPHY:
 *    - Snell Roundhand (elegant script - feminine/neutral)
 *    - Bodoni 72 Small Caps (sophisticated serif - masculine)
 *    - Cormorant Garamond, Playfair Display (elegant serif alternatives)
 * 5. FONT SELECTION based on board mood
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

// ============================================================
// TYPOGRAPHY CONFIGURATION
// ============================================================

const FONTS = {
  // Elegant scripts (feminine/neutral)
  script: {
    primary: "'Snell Roundhand', 'Brush Script MT', 'Lucida Handwriting', cursive",
    weight: '400',
    letterSpacing: '0.02em'
  },
  // Sophisticated serif small caps (masculine/formal)
  serifCaps: {
    primary: "'Bodoni 72 Smallcaps', 'Bodoni MT', 'Didot', 'Playfair Display SC', serif",
    weight: '400',
    letterSpacing: '0.15em'
  },
  // Elegant serif for quotes
  serifQuote: {
    primary: "'Cormorant Garamond', 'Playfair Display', 'EB Garamond', 'Georgia', serif",
    weight: '400',
    letterSpacing: '0.03em'
  },
  // Clean sans for subtitles
  sans: {
    primary: "'Helvetica Neue', 'Avenir Next', 'Arial', sans-serif",
    weight: '400',
    letterSpacing: '0.18em'
  }
};

/**
 * Select fonts based on mood/style
 */
function selectFonts(style) {
  const mood = (style?.mood || '').toLowerCase();

  const isMasculine = mood.includes('masculine') || mood.includes('dark') ||
                      mood.includes('minimal') || mood.includes('professional') ||
                      mood.includes('discipline') || mood.includes('focus');

  const isFormal = mood.includes('formal') || mood.includes('elegant') ||
                   mood.includes('sophisticated');

  if (isMasculine) {
    return {
      title: FONTS.serifCaps,
      quote: FONTS.serifQuote,
      text: FONTS.serifCaps,
      titleTransform: 'uppercase'
    };
  } else if (isFormal) {
    return {
      title: FONTS.serifCaps,
      quote: FONTS.serifQuote,
      text: FONTS.serifCaps,
      titleTransform: 'none'
    };
  } else {
    // Feminine/neutral - use script
    return {
      title: FONTS.script,
      quote: FONTS.serifQuote,
      text: FONTS.serifCaps,
      titleTransform: 'none'
    };
  }
}

// ============================================================
// CONTENT CREATORS
// ============================================================

/**
 * Create polaroid photo frame - tighter padding
 */
async function createPhoto(imgBuffer, size, rotation, colors) {
  const padding = Math.round(size * 0.03);
  const bottomPadding = Math.round(size * 0.09);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;
  const totalW = frameW + 40;
  const totalH = frameH + 40;

  const id = Math.random().toString(36).substr(2, 8);

  const resized = await sharp(imgBuffer)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  const frameSvg = `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ps${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.22)"/>
      </filter>
    </defs>
    <g transform="translate(20,18) rotate(${rotation} ${frameW/2} ${frameH/2})">
      <rect x="0" y="0" width="${frameW}" height="${frameH}"
            fill="#FFFFFF" rx="1" filter="url(#ps${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();

  const result = await sharp(frame)
    .composite([{
      input: resized,
      left: Math.round(20 + padding),
      top: Math.round(18 + padding)
    }])
    .png()
    .toBuffer();

  return { buffer: result, width: totalW, height: totalH };
}

/**
 * Quote Card - elegant serif italic with decorative frame
 */
function createQuoteCard(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);

  const maxChars = Math.max(text.length, 1);
  const baseFontSize = Math.min(height * 0.16, width * 0.75 / (maxChars * 0.45));
  const fontSize = Math.max(13, Math.min(baseFontSize, 26));

  const cardBg = '#FFFEF8';
  const borderColor = colors.accents[0] || '#D4A574';
  const textColor = '#3A3530';

  // Word wrap
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const charsPerLine = Math.floor((width - 36) / (fontSize * 0.48));

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= charsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.5;
  const textBlockHeight = lines.length * lineHeight;
  const startY = (height - textBlockHeight) / 2 + fontSize * 0.8;

  const textElements = lines.map((line, i) =>
    `<text x="${width/2}" y="${startY + i * lineHeight}" text-anchor="middle"
           font-family="${fonts.quote.primary}"
           font-size="${fontSize}px" font-style="italic" font-weight="400"
           fill="${textColor}">${escapeXml(line)}</text>`
  ).join('\n');

  const svg = `<svg width="${width + 24}" height="${height + 24}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="qs${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.18)"/>
      </filter>
    </defs>
    <g transform="translate(12,12) rotate(${rotation} ${width/2} ${height/2})">
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="${cardBg}" rx="3" filter="url(#qs${id})"/>
      <rect x="5" y="5" width="${width-10}" height="${height-10}"
            fill="none" stroke="${borderColor}" stroke-width="1" rx="2" opacity="0.5"/>
      <text x="14" y="22" font-family="Georgia, serif" font-size="20" fill="${borderColor}" opacity="0.35">"</text>
      <text x="${width-22}" y="${height-10}" font-family="Georgia, serif" font-size="20" fill="${borderColor}" opacity="0.35">"</text>
      ${textElements}
    </g>
  </svg>`;

  return svg;
}

/**
 * Text Block - bold motivational word with sophisticated typography
 */
function createTextBlock(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);

  const bgColor = colors.accents[Math.floor(Math.random() * colors.accents.length)] || '#4A4A4A';
  const textColor = isLightColor(bgColor) ? '#2A2A2A' : '#FFFFFF';

  const fontSize = Math.min(height * 0.5, width * 0.85 / (text.length * 0.55));
  const finalFontSize = Math.max(16, Math.min(fontSize, 42));

  const svg = `<svg width="${width + 24}" height="${height + 24}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ts${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.2)"/>
      </filter>
    </defs>
    <g transform="translate(12,12) rotate(${rotation} ${width/2} ${height/2})">
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="${bgColor}" rx="2" filter="url(#ts${id})"/>
      <text x="${width/2}" y="${height/2 + finalFontSize * 0.35}" text-anchor="middle"
            font-family="${fonts.text.primary}"
            font-size="${finalFontSize}px" font-weight="600"
            letter-spacing="${fonts.text.letterSpacing}"
            fill="${textColor}">${escapeXml(text.toUpperCase())}</text>
    </g>
  </svg>`;

  return svg;
}

/**
 * Decorations - hearts, stars, flowers
 */
function createDecoration(type, size, color) {
  const id = Math.random().toString(36).substr(2, 8);

  const decorations = {
    heart: `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 20)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <path d="M50 88C25 65 8 45 18 28C30 10 50 25 50 25C50 25 70 10 82 28C92 45 75 65 50 88Z"
            fill="url(#hg${id})" opacity="0.8"/>
    </svg>`,

    star: `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 25)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
               fill="url(#sg${id})" opacity="0.75"/>
    </svg>`,

    flower: `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fg${id}" cx="50%" cy="50%">
          <stop offset="0%" stop-color="${lighten(color, 30)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </radialGradient>
      </defs>
      <g opacity="0.8">
        <ellipse cx="50" cy="25" rx="12" ry="18" fill="url(#fg${id})"/>
        <ellipse cx="50" cy="75" rx="12" ry="18" fill="url(#fg${id})"/>
        <ellipse cx="25" cy="50" rx="18" ry="12" fill="url(#fg${id})"/>
        <ellipse cx="75" cy="50" rx="18" ry="12" fill="url(#fg${id})"/>
        <circle cx="50" cy="50" r="10" fill="#FFEAA7"/>
      </g>
    </svg>`
  };

  return decorations[type] || decorations.heart;
}

/**
 * Bokeh circle
 */
function createBokeh(size, color, opacity) {
  const id = Math.random().toString(36).substr(2, 8);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bk${id}" cx="30%" cy="30%">
        <stop offset="0%" stop-color="white" stop-opacity="${opacity * 1.5}"/>
        <stop offset="50%" stop-color="${color}" stop-opacity="${opacity}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bk${id})"/>
  </svg>`;
}

/**
 * Accent rectangle
 */
function createAccentRect(w, h, color, rotation = 0) {
  return `<svg width="${w + 16}" height="${h + 16}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(8,8) rotate(${rotation} ${w/2} ${h/2})">
      <rect x="0" y="0" width="${w}" height="${h}" fill="${color}" opacity="0.55"/>
    </g>
  </svg>`;
}

/**
 * Title banner with sophisticated typography
 */
function createBanner(width, title, subtitle, colors, fonts) {
  const height = 65;
  const fontConfig = fonts.title;
  const transform = fonts.titleTransform;

  const displayTitle = transform === 'uppercase' ? title.toUpperCase() : title;
  const titleSize = Math.min(32, Math.floor(width * 0.78 / Math.max(displayTitle.length, 1) * 1.8));
  const subtitleSize = 9;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${colors.banner}"/>

    <text x="${width/2}" y="${subtitle ? 34 : 40}" text-anchor="middle"
          font-family="${fontConfig.primary}"
          font-size="${titleSize}px" font-weight="${fontConfig.weight}"
          letter-spacing="${fontConfig.letterSpacing}"
          fill="${colors.bannerText || '#FFFFFF'}">${escapeXml(displayTitle)}</text>

    ${subtitle ? `
    <text x="${width/2}" y="52" text-anchor="middle"
          font-family="${FONTS.sans.primary}"
          font-size="${subtitleSize}px" font-weight="400"
          letter-spacing="${FONTS.sans.letterSpacing}"
          fill="${colors.bannerSubtext || 'rgba(255,255,255,0.7)'}">${escapeXml(subtitle.toUpperCase())}</text>
    ` : ''}
  </svg>`;
}

// ============================================================
// DENSE LAYOUT ENGINE
// ============================================================

/**
 * Dense layout with 10-12 photos - minimal margins, overlapping
 */
function calculateDensePhotoLayout(photoCount, canvasW, canvasH, bannerH) {
  const items = [];
  const contentH = canvasH - bannerH;
  const margin = 12; // Reduced from 25

  // 4 rows x 3 columns base grid, but with overlap and variance
  const rows = 4;
  const cols = 3;
  const cellW = (canvasW - margin * 2) / cols;
  const cellH = contentH / rows;

  // Photo sizes - varied for visual interest
  const sizes = [210, 195, 180, 200, 185, 190, 205, 175, 195, 185, 200, 190];

  // Dense grid positions with overlap
  const positions = [
    // Row 1
    { col: 0, row: 0, offsetX: -5, offsetY: 8 },
    { col: 1, row: 0, offsetX: 10, offsetY: -5 },
    { col: 2, row: 0, offsetX: 5, offsetY: 12 },
    // Row 2
    { col: 0, row: 1, offsetX: 8, offsetY: -8 },
    { col: 1, row: 1, offsetX: -5, offsetY: 5 },
    { col: 2, row: 1, offsetX: -10, offsetY: -5 },
    // Row 3
    { col: 0, row: 1.95, offsetX: -8, offsetY: 10 },
    { col: 1, row: 2, offsetX: 12, offsetY: -8 },
    { col: 2, row: 1.9, offsetX: 5, offsetY: 5 },
    // Row 4
    { col: 0, row: 2.85, offsetX: 5, offsetY: -5 },
    { col: 1, row: 2.9, offsetX: -8, offsetY: 8 },
    { col: 2, row: 2.8, offsetX: -5, offsetY: -10 },
  ];

  for (let i = 0; i < Math.min(photoCount, positions.length); i++) {
    const pos = positions[i];
    const size = sizes[i % sizes.length];

    const baseX = margin + pos.col * cellW + cellW / 2 - size / 2;
    const baseY = bannerH + 15 + pos.row * cellH + cellH / 2 - size / 2;

    items.push({
      x: baseX + pos.offsetX + (Math.random() - 0.5) * 15,
      y: baseY + pos.offsetY + (Math.random() - 0.5) * 12,
      size: size,
      rotation: (Math.random() - 0.5) * 12,
      zIndex: i
    });
  }

  return items;
}

/**
 * Positions for quote cards and text blocks - scattered on top of photos
 */
function calculateOverlayLayout(quoteCount, textCount, canvasW, canvasH, bannerH) {
  const overlays = [];
  const contentH = canvasH - bannerH;

  // Quote card positions - scattered across the board
  const quotePositions = [
    { x: canvasW * 0.02, y: bannerH + contentH * 0.18, w: 160, h: 100 },
    { x: canvasW * 0.62, y: bannerH + contentH * 0.42, w: 155, h: 95 },
    { x: canvasW * 0.08, y: bannerH + contentH * 0.68, w: 150, h: 90 },
  ];

  // Text block positions - smaller, scattered
  const textPositions = [
    { x: canvasW * 0.72, y: bannerH + contentH * 0.12, w: 100, h: 50 },
    { x: canvasW * 0.05, y: bannerH + contentH * 0.45, w: 95, h: 48 },
    { x: canvasW * 0.68, y: bannerH + contentH * 0.78, w: 105, h: 52 },
  ];

  for (let i = 0; i < quoteCount; i++) {
    const pos = quotePositions[i % quotePositions.length];
    overlays.push({
      type: 'quote',
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y + (Math.random() - 0.5) * 15,
      width: pos.w + (Math.random() - 0.5) * 20,
      height: pos.h + (Math.random() - 0.5) * 15,
      rotation: (Math.random() - 0.5) * 8,
      contentIndex: i
    });
  }

  for (let i = 0; i < textCount; i++) {
    const pos = textPositions[i % textPositions.length];
    overlays.push({
      type: 'text',
      x: pos.x + (Math.random() - 0.5) * 25,
      y: pos.y + (Math.random() - 0.5) * 20,
      width: pos.w + (Math.random() - 0.5) * 15,
      height: pos.h + (Math.random() - 0.5) * 10,
      rotation: (Math.random() - 0.5) * 10,
      contentIndex: i
    });
  }

  return overlays;
}

// ============================================================
// UTILITIES
// ============================================================

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lighten(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function isLightColor(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
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

function buildPhotoPrompt(symbol, style) {
  const noPeople = "absolutely no people, no human figures, no faces, no hands, no body parts";
  const styleHint = style?.mood || "beautiful aesthetic dreamy warm lighting";
  return `A beautiful photograph of ${symbol}. ${styleHint}, professional photography. ${noPeople}, no text, no logos.`;
}

async function generatePhoto(symbol, style, index) {
  console.log(`  [${index + 1}] "${symbol.substring(0, 40)}..."`);
  try {
    const url = await generateImage(buildPhotoPrompt(symbol, style), {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1'
    });
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
  const bannerH = 65;

  // Defaults
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

  // Select fonts based on mood
  const fonts = selectFonts(style);

  console.log('\n' + '='.repeat(60));
  console.log('VISION BOARD ENGINE V8 - Dense Layout');
  console.log('='.repeat(60));
  console.log(`Title: "${title}"`);
  console.log(`Photos: ${photos.length}, Quotes: ${quotes.length}, Text: ${textBlocks.length}`);
  console.log(`Font style: ${style.mood.includes('masculine') ? 'Bodoni/Serif' : 'Snell Roundhand/Script'}`);

  // Generate photos (10-12)
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

  // Background accent rectangles
  console.log('[3] Adding background elements...');
  const bgRects = [];

  // Large soft background shapes
  for (let i = 0; i < 6; i++) {
    const color = lighten(colors.background, (Math.random() - 0.5) * 8);
    const w = 180 + Math.random() * 280;
    const h = 120 + Math.random() * 180;
    bgRects.push({
      input: Buffer.from(createAccentRect(w, h, color, (Math.random() - 0.5) * 20)),
      top: Math.round(bannerH + Math.random() * (CANVAS_HEIGHT - bannerH - h)),
      left: Math.round(Math.random() * (CANVAS_WIDTH - w))
    });
  }

  // Smaller colored accent rectangles
  for (let i = 0; i < 18; i++) {
    const color = colors.accents[i % colors.accents.length];
    const w = 30 + Math.random() * 55;
    const h = 18 + Math.random() * 35;
    bgRects.push({
      input: Buffer.from(createAccentRect(w, h, color, (Math.random() - 0.5) * 25)),
      top: Math.round(bannerH + 15 + Math.random() * (CANVAS_HEIGHT - bannerH - 50)),
      left: Math.round(Math.random() * (CANVAS_WIDTH - w))
    });
  }

  for (const rect of bgRects) {
    try {
      canvas = await sharp(canvas).composite([rect]).png().toBuffer();
    } catch (e) {}
  }

  // Bokeh
  if (style.bokeh) {
    console.log('[4] Adding bokeh...');
    const bokehs = [];
    const bokehColor = colors.accents[0] || '#FFE4B5';

    for (let i = 0; i < 30; i++) {
      const size = 25 + Math.random() * 65;
      bokehs.push({
        input: Buffer.from(createBokeh(size, bokehColor, 0.28)),
        top: Math.round(Math.random() * CANVAS_HEIGHT),
        left: Math.round(Math.random() * CANVAS_WIDTH)
      });
    }
    canvas = await sharp(canvas).composite(bokehs).png().toBuffer();
  }

  // Calculate dense photo layout
  console.log('[5] Creating dense photo layout...');
  const photoLayout = calculateDensePhotoLayout(photoBuffers.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Create photo frames
  const photoItems = [];
  for (let i = 0; i < Math.min(photoBuffers.length, photoLayout.length); i++) {
    const pos = photoLayout[i];
    const photo = await createPhoto(photoBuffers[i], pos.size, pos.rotation, colors);
    photoItems.push({
      input: photo.buffer,
      top: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 80, pos.y))),
      left: Math.round(Math.max(-20, Math.min(CANVAS_WIDTH - 80, pos.x))),
      zIndex: pos.zIndex
    });
  }

  // Sort by zIndex for layering
  photoItems.sort((a, b) => a.zIndex - b.zIndex);

  console.log('[6] Compositing photos...');
  for (const item of photoItems) {
    try {
      canvas = await sharp(canvas).composite([item]).png().toBuffer();
    } catch (e) {}
  }

  // Add quote cards and text blocks ON TOP of photos
  console.log('[7] Adding quotes and text blocks...');
  const overlayLayout = calculateOverlayLayout(
    Math.min(quotes.length, 3),
    Math.min(textBlocks.length, 2),
    CANVAS_WIDTH, CANVAS_HEIGHT, bannerH
  );

  for (const overlay of overlayLayout) {
    try {
      let svgContent;
      if (overlay.type === 'quote' && quotes[overlay.contentIndex]) {
        svgContent = createQuoteCard(
          quotes[overlay.contentIndex],
          overlay.width, overlay.height,
          colors, overlay.rotation, fonts
        );
      } else if (overlay.type === 'text' && textBlocks[overlay.contentIndex]) {
        svgContent = createTextBlock(
          textBlocks[overlay.contentIndex],
          overlay.width, overlay.height,
          colors, overlay.rotation, fonts
        );
      }

      if (svgContent) {
        const buf = await sharp(Buffer.from(svgContent)).png().toBuffer();
        canvas = await sharp(canvas).composite([{
          input: buf,
          top: Math.round(Math.max(0, overlay.y)),
          left: Math.round(Math.max(0, overlay.x))
        }]).png().toBuffer();
      }
    } catch (e) {}
  }

  // Decorations
  if (style.decorations) {
    console.log('[8] Adding decorations...');
    const decorations = [];
    const types = ['heart', 'star', 'flower'];

    for (let i = 0; i < 14; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors.accents[Math.floor(Math.random() * colors.accents.length)];
      const size = 20 + Math.random() * 28;

      decorations.push({
        input: Buffer.from(createDecoration(type, size, color)),
        top: Math.round(bannerH + 20 + Math.random() * (CANVAS_HEIGHT - bannerH - 60)),
        left: Math.round(Math.random() * (CANVAS_WIDTH - size))
      });
    }

    canvas = await sharp(canvas).composite(decorations).png().toBuffer();
  }

  // Banner
  console.log('[9] Adding banner...');
  const bannerSvg = createBanner(CANVAS_WIDTH, title, subtitle, colors, fonts);
  canvas = await sharp(canvas)
    .composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `visionboard-v8-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : photoBuffers.length * COST_PER_IMAGE;

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('='.repeat(60));

  return { success: true, filepath, cost, photoCount: photoBuffers.length };
}

module.exports = { generateVisionBoard, COST_PER_IMAGE };
