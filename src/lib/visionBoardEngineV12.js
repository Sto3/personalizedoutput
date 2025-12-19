/**
 * Vision Board Engine V12
 *
 * BASED ON V9 (the layout you liked) with ONE FIX:
 * - Text/quotes rendered BEFORE photos so they peek out from BETWEEN photos
 * - V9 rendered text AFTER photos (on top)
 * - V12 renders text FIRST, then photos layer over the edges
 *
 * V9's photo layout is preserved exactly:
 * - 3 columns x 4 rows (12 photos)
 * - Sizes: 250-290px (large)
 * - Rotation: ±5°
 * - Bottom photos bleed off canvas
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

// Typography - exact fontconfig names for SVG rendering
const FONTS = {
  script: "Snell Roundhand",  // For feminine boards
  serifCaps: "Bodoni 72 Smallcaps",  // For masculine/neutral boards (NOT Oldstyle)
  serifQuote: "Cormorant Garamond, Playfair Display, Georgia, serif",
  sans: "Helvetica Neue, Arial, sans-serif"
};

function selectFonts(style) {
  const mood = (style?.mood || '').toLowerCase();
  const isMasculine = mood.includes('masculine') || mood.includes('dark') || mood.includes('discipline');
  // Detect relationship/couples boards - use NEUTRAL font (not masculine smallcaps, not feminine script)
  const isRelationship = mood.includes('couple') || mood.includes('relationship') || mood.includes('together') || mood.includes('partner');

  // For relationship boards: use elegant serif (Cormorant Garamond) - neither masculine nor feminine
  if (isRelationship) {
    return {
      title: "Cormorant Garamond",  // Elegant, gender-neutral serif
      titleTransform: 'none',
      titleLetterSpacing: '0.05em',
      quote: FONTS.serifQuote,
      text: FONTS.serifCaps
    };
  }

  return {
    title: isMasculine ? FONTS.serifCaps : FONTS.script,
    titleTransform: isMasculine ? 'uppercase' : 'none',
    titleLetterSpacing: isMasculine ? '0.15em' : '0.02em',
    quote: FONTS.serifQuote,
    text: FONTS.serifCaps
  };
}

// ============================================================
// PHOTO FRAME (same as V9)
// ============================================================

async function createPhoto(imgBuffer, size, rotation) {
  const padding = Math.round(size * 0.028);
  const bottomPadding = Math.round(size * 0.085);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;
  const margin = 50; // Extra space for rotation
  const totalW = frameW + margin * 2;
  const totalH = frameH + margin * 2;

  const id = Math.random().toString(36).substr(2, 8);

  // Photo size matches frame opening
  const photoSize = size + 8;
  const resized = await sharp(imgBuffer)
    .resize(photoSize, photoSize, { fit: 'cover' })
    .toBuffer();

  // Create frame, then composite rotated photo on top
  const frameSvg = `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ps${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
    </defs>
    <g transform="rotate(${rotation} ${totalW/2} ${totalH/2})">
      <rect x="${margin}" y="${margin}" width="${frameW}" height="${frameH}" fill="#FFFFFF" rx="1" filter="url(#ps${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();

  // Calculate where photo goes after rotation
  const rad = rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = totalW / 2;
  const cy = totalH / 2;
  // Photo position (shifted to cover more of the white frame)
  const photoX = margin + padding - 5;
  const photoY = margin + padding - 5;
  // Rotate photo position around center
  const dx = photoX + photoSize/2 - cx;
  const dy = photoY + photoSize/2 - cy;
  const rotX = cx + dx * cos - dy * sin - photoSize/2;
  const rotY = cy + dx * sin + dy * cos - photoSize/2;

  // Also rotate the photo itself
  const rotatedPhoto = await sharp(resized)
    .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return await sharp(frame)
    .composite([{ input: rotatedPhoto, left: Math.round(rotX), top: Math.round(rotY) }])
    .png()
    .toBuffer();
}

// ============================================================
// QUOTE CARD (same as V9)
// ============================================================

function createQuoteCard(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const fontSize = Math.max(12, Math.min(20, height * 0.17));
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
// TEXT BLOCK (same as V9)
// ============================================================

function createTextBlock(text, width, height, colors, rotation, fonts) {
  const id = Math.random().toString(36).substr(2, 8);
  const bgColor = colors.accents[Math.floor(Math.random() * colors.accents.length)];
  const textColor = isLightColor(bgColor) ? '#2A2A2A' : '#FFFFFF';
  const fontSize = Math.min(height * 0.55, width * 0.85 / (text.length * 0.5));

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
// DECORATIONS (same as V9)
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
  // For Snell Roundhand (script), use Title Case. For Bodoni (masculine), use UPPERCASE
  const displayTitle = fonts.titleTransform === 'uppercase'
    ? title.toUpperCase()
    : toTitleCase(title);  // Convert to Title Case for feminine/script fonts
  const titleSize = Math.min(30, Math.floor(width * 0.75 / displayTitle.length * 1.8));

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${colors.banner}"/>
    <text x="${width/2}" y="${subtitle ? 28 : 38}" text-anchor="middle"
          font-family="${fonts.title}" font-size="${titleSize}px" font-weight="400"
          letter-spacing="${fonts.titleLetterSpacing}" fill="${colors.bannerText}">${escapeXml(displayTitle)}</text>
    ${subtitle ? `<text x="${width/2}" y="52" text-anchor="middle" font-family="${FONTS.sans}"
          font-size="14px" letter-spacing="0.12em" fill="${colors.bannerSubtext}">${escapeXml(subtitle.toUpperCase())}</text>` : ''}
  </svg>`;
}

// ============================================================
// FIXED LAYOUT - Locked to match reference images exactly
// ============================================================

function calculateDenseLayout(photoCount, canvasW, canvasH, bannerH) {
  // LOCKED LAYOUT: 12 photos only, fixed positions and rotations
  // Matches the reference images exactly - no randomization

  const contentH = canvasH - bannerH;
  const baseSize = 285;
  const cols = 3;
  const rows = 4;

  const colWidth = canvasW / (cols + 0.3);
  // Reduced overlap: changed from (rows + 0.2) to (rows + 0.5) for more spacing between rows
  const rowHeight = contentH / (rows + 0.5);

  // Fixed rotations matching reference images (in degrees)
  // Row 1: +5, -6, +4
  // Row 2: -4, -5, +6
  // Row 3: +5, +3, -4
  // Row 4: -5, -4, +5
  const fixedRotations = [
    5, -6, 4,    // Row 1
    -4, -5, 6,   // Row 2
    5, 3, -4,    // Row 3
    -5, -4, 5    // Row 4
  ];

  // Fixed size variations for organic feel (but consistent)
  const fixedSizes = [
    290, 280, 285,  // Row 1
    275, 295, 280,  // Row 2
    285, 270, 290,  // Row 3
    280, 285, 275   // Row 4
  ];

  // Fixed X offsets for organic positioning
  const fixedOffX = [
    -15, 8, -5,    // Row 1
    10, -12, 5,    // Row 2
    -8, 15, -10,   // Row 3
    5, -5, 12      // Row 4
  ];

  // Fixed Y offsets for organic positioning
  const fixedOffY = [
    5, -8, 10,     // Row 1
    -5, 35, -3,    // Row 2 - Middle photo (index 4) moved DOWN from 12 to 35 to prevent overlap
    8, -10, 5,     // Row 3
    -8, 5, -5      // Row 4
  ];

  const items = [];
  const actualCount = Math.min(photoCount, 12);

  for (let i = 0; i < actualCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const size = fixedSizes[i];
    const baseX = col * colWidth + (colWidth - size) / 2 + 15;
    const baseY = bannerH + row * rowHeight + 5;

    items.push({
      x: baseX + fixedOffX[i],
      y: baseY + fixedOffY[i],
      size: size,
      rotation: fixedRotations[i],
      zIndex: i
    });
  }

  return items;
}

/**
 * Gap positions for text/quotes
 * INTERLEAVED - alternating text and quotes, alternating left and right
 * Creates more dimension and visual interest
 */
function calculateGapPositions(canvasW, canvasH, bannerH) {
  return [
    // Row 1 - TEXT on right
    { x: 670, y: bannerH + 70, w: 95, h: 52, type: 'text' },

    // Row 1-2 gap - QUOTE on left
    { x: 8, y: bannerH + 270, w: 105, h: 65, type: 'quote' },

    // Row 2 - TEXT on right
    { x: 670, y: bannerH + 330, w: 105, h: 58, type: 'text' },

    // Row 2-3 gap - QUOTE on right (switch sides!)
    { x: 720, y: bannerH + 530, w: 105, h: 65, type: 'quote' },

    // Row 3 - TEXT on left (switch sides!)
    { x: 8, y: bannerH + 590, w: 100, h: 55, type: 'text' },

    // Row 3-4 gap - QUOTE on left
    { x: 8, y: bannerH + 790, w: 105, h: 62, type: 'quote' },

    // Row 4 - TEXT on right
    { x: 670, y: bannerH + 850, w: 100, h: 55, type: 'text' },

    // Bottom - QUOTE on right (switch sides!)
    { x: 720, y: bannerH + 1050, w: 100, h: 60, type: 'quote' },
  ];
}

// ============================================================
// UTILITIES
// ============================================================

function escapeXml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Convert string to Title Case (for Snell Roundhand / feminine fonts)
// "MY HEALING JOURNEY" -> "My Healing Journey"
function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, char => char.toUpperCase());
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
  const mood = style?.mood || "aesthetic dreamy warm";

  // CRITICAL: Explicitly state NO PEOPLE in the prompt itself, not just negative prompt
  // This is the most reliable way to prevent human figures from appearing
  const prompt = `Beautiful photograph of ${symbol}. ${mood}, professional photography, OBJECTS ONLY, NO PEOPLE, NO HUMANS, no text, no logos, no watermarks. Focus on objects, scenery, and items - never include any human figures, faces, or body parts.`;

  // COMPREHENSIVE negative prompt to absolutely prevent people/body parts AND alcohol/liquor
  // This list is intentionally exhaustive to cover all possible ways the AI might interpret human presence
  const negativePrompt = [
    // People and humans - every possible variation
    "people", "person", "human", "humans", "man", "woman", "men", "women",
    "child", "children", "kid", "kids", "baby", "babies", "infant", "toddler",
    "adult", "adults", "elderly", "senior", "teenager", "teen", "youth",
    "couple", "couples", "family", "families", "crowd", "group", "gathering",
    // Body parts - comprehensive list
    "face", "faces", "head", "heads", "portrait", "portraits", "selfie",
    "hand", "hands", "finger", "fingers", "arm", "arms", "leg", "legs",
    "foot", "feet", "toe", "toes", "body", "bodies", "torso", "chest",
    "back", "shoulder", "shoulders", "neck", "skin", "eye", "eyes",
    "mouth", "lips", "nose", "ear", "ears", "hair", "beard", "mustache",
    // Figures and silhouettes
    "figure", "figures", "silhouette", "silhouettes", "shadow of person",
    "human form", "human shape", "human figure", "human silhouette",
    "model", "models", "pose", "posing", "posed",
    // Alcohol and drinking
    "alcohol", "liquor", "whiskey", "whisky", "beer", "wine", "cocktail",
    "champagne", "vodka", "rum", "gin", "tequila", "bourbon", "scotch",
    "drinking", "bar", "drunk", "bottle of alcohol", "alcoholic beverage"
  ].join(", ");

  console.log(`  [${index + 1}] "${symbol.substring(0, 38)}..."`);
  try {
    const url = await generateImage(prompt, {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1',
      negativePrompt: negativePrompt
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
  const bannerH = 62;

  const title = input.title || 'My Vision';
  const subtitle = input.subtitle || '';

  // Detect if this is a masculine/male board based on mood
  const inputMood = (input.style?.mood || '').toLowerCase();
  const isMasculineBoard = inputMood.includes('masculine') || inputMood.includes('dark') || inputMood.includes('discipline');

  // For masculine boards, FORCE fully BLACK background regardless of input colors
  // This creates the dark, moody aesthetic that works best for male-focused boards
  const colors = {
    background: isMasculineBoard ? '#0a0a0f' : (input.colors?.background || '#F5E8ED'),
    accents: input.colors?.accents || ['#FFB6C1', '#B4E4FF', '#E8D4F0', '#FFEAA7'],
    banner: input.colors?.banner || '#4A3F45',
    bannerText: input.colors?.bannerText || '#FFFFFF',
    bannerSubtext: input.colors?.bannerSubtext || 'rgba(255,255,255,0.7)'
  };

  const photos = input.photos || [];
  const quotes = input.quotes || [];
  const textBlocks = input.textBlocks || [];
  const style = {
    decorations: false,  // DISABLED - no hearts, stars, flowers per user request
    bokeh: isMasculineBoard ? false : (input.style?.bokeh !== false),  // No bokeh on masculine boards
    mood: input.style?.mood || 'dreamy warm aesthetic'
  };

  const fonts = selectFonts(style);

  console.log('\n' + '='.repeat(60));
  console.log('VISION BOARD ENGINE V12 - V9 Layout + Text BETWEEN Photos');
  console.log('='.repeat(60));
  console.log(`Title: "${title}"`);
  console.log(`Photos: ${photos.length}, Quotes: ${quotes.length}, Text: ${textBlocks.length}`);

  // Generate photos
  console.log('\n[1] Generating photos...');
  const photoBuffers = [];
  const maxPhotos = Math.min(photos.length, 30, Math.floor(costLimit / COST_PER_IMAGE));

  if (!skipGeneration) {
    for (let i = 0; i < maxPhotos; i++) {
      const buf = await generatePhoto(photos[i], style, i);
      if (buf) photoBuffers.push(buf);
      if (i < maxPhotos - 1) await new Promise(r => setTimeout(r, 350));
    }
  } else {
    for (let i = 0; i < Math.min(photos.length, 30); i++) {
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

  // Background - no tape/accent rectangles, keeping it clean
  console.log('[3] Adding background...');

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

  // Dense photo layout (same as V9)
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

  // Text/quotes removed - letting the images speak for themselves

  // Decorations (on top of everything)
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

  // Banner - pre-render SVG to PNG for correct font rendering
  console.log('[9] Adding banner...');
  const bannerSvg = createBanner(CANVAS_WIDTH, title, subtitle, colors, fonts);
  const bannerPng = await sharp(Buffer.from(bannerSvg)).png().toBuffer();
  canvas = await sharp(canvas).composite([{ input: bannerPng, top: 0, left: 0 }]).png().toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `visionboard-v12-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : photoBuffers.length * COST_PER_IMAGE;
  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('='.repeat(60));

  return { success: true, filepath, cost, photoCount: photoBuffers.length };
}

module.exports = { generateVisionBoard, COST_PER_IMAGE };
