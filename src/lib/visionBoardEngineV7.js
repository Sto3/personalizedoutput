/**
 * Vision Board Engine V7
 *
 * Accepts structured input from Thought Organizer
 * Produces premium vision boards with mixed content:
 *
 * CONTENT TYPES:
 * 1. Photos - AI-generated from user's symbol descriptions (polaroid framed)
 * 2. Quote Cards - User's own words/paraphrased, elegant script, decorative frame
 * 3. Text Blocks - Bold motivational single words, impactful typography
 * 4. Color Blocks - Solid colors from their palette, breathing room
 *
 * All colors, words, symbols come from user's Thought Organizer responses
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
// CONTENT CREATORS
// ============================================================

/**
 * Create a photo in polaroid frame
 */
async function createPhotoContent(imgBuffer, size, rotation, colors) {
  const padding = Math.round(size * 0.035);
  const bottomPadding = Math.round(size * 0.10);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;
  const totalW = frameW + 50;
  const totalH = frameH + 50;

  const id = Math.random().toString(36).substr(2, 8);

  const resized = await sharp(imgBuffer)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  const frameSvg = `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.22)"/>
      </filter>
    </defs>
    <g transform="translate(25,20) rotate(${rotation} ${frameW/2} ${frameH/2})">
      <rect x="0" y="0" width="${frameW}" height="${frameH}"
            fill="#FFFFFF" rx="2" filter="url(#shadow${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();

  const result = await sharp(frame)
    .composite([{
      input: resized,
      left: Math.round(25 + padding),
      top: Math.round(20 + padding)
    }])
    .png()
    .toBuffer();

  return { buffer: result, width: totalW, height: totalH };
}

/**
 * Create a Quote Card - User's words in elegant frame
 * Looks like a decorative card with script/serif typography
 */
function createQuoteCard(text, width, height, colors, rotation = 0) {
  const id = Math.random().toString(36).substr(2, 8);

  // Calculate font size based on text length and card size
  const maxChars = Math.max(text.length, 1);
  const baseFontSize = Math.min(height * 0.18, width * 0.8 / (maxChars * 0.5));
  const fontSize = Math.max(14, Math.min(baseFontSize, 32));

  // Elegant cream/off-white background
  const cardBg = '#FDF8F3';
  const borderColor = colors.accents[0] || '#D4A574';
  const textColor = '#3A3530';

  // Word wrap for longer quotes
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const maxWidth = width - 40;
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= charsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.4;
  const textBlockHeight = lines.length * lineHeight;
  const startY = (height - textBlockHeight) / 2 + fontSize;

  const textElements = lines.map((line, i) =>
    `<text x="${width/2}" y="${startY + i * lineHeight}" text-anchor="middle"
           font-family="'Georgia', 'Times New Roman', serif"
           font-size="${fontSize}px" font-style="italic" font-weight="400"
           fill="${textColor}">${escapeXml(line)}</text>`
  ).join('\n');

  const svg = `<svg width="${width + 30}" height="${height + 30}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="cardShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.18)"/>
      </filter>
    </defs>
    <g transform="translate(15,15) rotate(${rotation} ${width/2} ${height/2})">
      <!-- Card background -->
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="${cardBg}" rx="4" filter="url(#cardShadow${id})"/>

      <!-- Decorative border -->
      <rect x="6" y="6" width="${width-12}" height="${height-12}"
            fill="none" stroke="${borderColor}" stroke-width="1.5" rx="2" opacity="0.6"/>

      <!-- Corner flourishes -->
      <path d="M12 20 Q12 12 20 12" stroke="${borderColor}" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M${width-12} 20 Q${width-12} 12 ${width-20} 12" stroke="${borderColor}" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M12 ${height-20} Q12 ${height-12} 20 ${height-12}" stroke="${borderColor}" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M${width-12} ${height-20} Q${width-12} ${height-12} ${width-20} ${height-12}" stroke="${borderColor}" stroke-width="1.5" fill="none" opacity="0.5"/>

      <!-- Quote marks -->
      <text x="20" y="35" font-family="Georgia, serif" font-size="28" fill="${borderColor}" opacity="0.4">"</text>
      <text x="${width-30}" y="${height-15}" font-family="Georgia, serif" font-size="28" fill="${borderColor}" opacity="0.4">"</text>

      <!-- Quote text -->
      ${textElements}
    </g>
  </svg>`;

  return svg;
}

/**
 * Create a Text Block - Bold motivational single word or short phrase
 * Impactful, modern typography
 */
function createTextBlock(text, width, height, colors, rotation = 0) {
  const id = Math.random().toString(36).substr(2, 8);

  // Use one of their accent colors as background
  const bgColor = colors.accents[Math.floor(Math.random() * colors.accents.length)] || '#4A4A4A';
  const textColor = isLightColor(bgColor) ? '#2A2A2A' : '#FFFFFF';

  // Bold, impactful sizing
  const fontSize = Math.min(height * 0.45, width * 0.8 / (text.length * 0.6));
  const finalFontSize = Math.max(18, Math.min(fontSize, 48));

  const svg = `<svg width="${width + 30}" height="${height + 30}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="textShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.2)"/>
      </filter>
    </defs>
    <g transform="translate(15,15) rotate(${rotation} ${width/2} ${height/2})">
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="${bgColor}" rx="3" filter="url(#textShadow${id})"/>

      <text x="${width/2}" y="${height/2 + finalFontSize * 0.35}" text-anchor="middle"
            font-family="'Helvetica Neue', 'Arial Black', sans-serif"
            font-size="${finalFontSize}px" font-weight="800" letter-spacing="0.1em"
            fill="${textColor}">${escapeXml(text.toUpperCase())}</text>
    </g>
  </svg>`;

  return svg;
}

/**
 * Create a Color Block - Solid color for visual breathing room
 * Subtle, with slight texture
 */
function createColorBlock(width, height, color, rotation = 0) {
  const id = Math.random().toString(36).substr(2, 8);

  const svg = `<svg width="${width + 24}" height="${height + 24}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="colorShadow${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.15)"/>
      </filter>
      <pattern id="paper${id}" patternUnits="userSpaceOnUse" width="100" height="100">
        <rect width="100" height="100" fill="${color}"/>
        <rect width="100" height="100" fill="white" opacity="0.03"/>
      </pattern>
    </defs>
    <g transform="translate(12,12) rotate(${rotation} ${width/2} ${height/2})">
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="url(#paper${id})" rx="2" filter="url(#colorShadow${id})"/>
    </g>
  </svg>`;

  return svg;
}

/**
 * Create decorative elements (hearts, stars, flowers)
 */
function createDecoration(type, size, color) {
  const id = Math.random().toString(36).substr(2, 8);
  const s = size;

  const decorations = {
    heart: `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 20)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <path d="M50 88C25 65 8 45 18 28C30 10 50 25 50 25C50 25 70 10 82 28C92 45 75 65 50 88Z"
            fill="url(#hg${id})" opacity="0.8"/>
    </svg>`,

    star: `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 25)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
               fill="url(#sg${id})" opacity="0.75"/>
    </svg>`,

    flower: `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
 * Create bokeh circle
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
 * Create title banner
 */
function createBanner(width, title, subtitle, colors) {
  const height = 70;
  const titleSize = Math.min(30, Math.floor(width * 0.75 / Math.max(title.length, 1)));
  const subtitleSize = 9;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${colors.banner}"/>

    <text x="${width/2}" y="${subtitle ? 36 : 42}" text-anchor="middle"
          font-family="'Didot', 'Bodoni MT', 'Georgia', serif"
          font-size="${titleSize}px" font-weight="400" letter-spacing="0.08em"
          fill="${colors.bannerText || '#FFFFFF'}">${escapeXml(title)}</text>

    ${subtitle ? `
    <text x="${width/2}" y="56" text-anchor="middle"
          font-family="'Helvetica Neue', 'Arial', sans-serif"
          font-size="${subtitleSize}px" font-weight="400" letter-spacing="0.2em"
          fill="${colors.bannerSubtext || 'rgba(255,255,255,0.7)'}">${escapeXml(subtitle.toUpperCase())}</text>
    ` : ''}
  </svg>`;
}

// ============================================================
// LAYOUT ENGINE
// ============================================================

/**
 * Calculate layout for mixed content
 * Returns positions for all content types
 */
function calculateMixedLayout(contentPlan, canvasW, canvasH, bannerH) {
  const items = [];
  const contentH = canvasH - bannerH;
  const margin = 25;

  // Define layout zones - organic placement
  const zones = [
    // Row 1
    { x: margin, y: bannerH + 25, baseSize: 220, type: 'large' },
    { x: canvasW * 0.40, y: bannerH + 15, baseSize: 190, type: 'medium' },
    { x: canvasW * 0.70, y: bannerH + 35, baseSize: 180, type: 'medium' },

    // Row 2
    { x: margin - 5, y: bannerH + contentH * 0.25, baseSize: 185, type: 'medium' },
    { x: canvasW * 0.30, y: bannerH + contentH * 0.23, baseSize: 210, type: 'large' },
    { x: canvasW * 0.63, y: bannerH + contentH * 0.27, baseSize: 175, type: 'medium' },

    // Row 3
    { x: margin + 15, y: bannerH + contentH * 0.47, baseSize: 180, type: 'medium' },
    { x: canvasW * 0.33, y: bannerH + contentH * 0.49, baseSize: 195, type: 'medium' },
    { x: canvasW * 0.64, y: bannerH + contentH * 0.45, baseSize: 215, type: 'large' },

    // Row 4
    { x: margin, y: bannerH + contentH * 0.70, baseSize: 190, type: 'medium' },
    { x: canvasW * 0.28, y: bannerH + contentH * 0.72, baseSize: 175, type: 'medium' },
    { x: canvasW * 0.56, y: bannerH + contentH * 0.68, baseSize: 185, type: 'medium' },
  ];

  // Assign content to zones
  let photoIndex = 0;
  let quoteIndex = 0;
  let textIndex = 0;
  let colorIndex = 0;

  for (let i = 0; i < Math.min(contentPlan.totalSlots, zones.length); i++) {
    const zone = zones[i];
    const contentType = contentPlan.slotTypes[i];

    let size = zone.baseSize + (Math.random() - 0.5) * 30;
    const rotation = (Math.random() - 0.5) * 10;
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 15;

    // Adjust size for different content types
    if (contentType === 'quote') {
      size = size * 0.85; // Quote cards slightly smaller
    } else if (contentType === 'text') {
      size = size * 0.6; // Text blocks more compact
    } else if (contentType === 'color') {
      size = size * 0.5; // Color blocks smallest
    }

    items.push({
      type: contentType,
      x: zone.x + offsetX,
      y: zone.y + offsetY,
      width: Math.round(size),
      height: Math.round(contentType === 'photo' ? size * 1.1 : size * 0.7),
      rotation: rotation,
      contentIndex: contentType === 'photo' ? photoIndex++ :
                    contentType === 'quote' ? quoteIndex++ :
                    contentType === 'text' ? textIndex++ : colorIndex++
    });
  }

  return items.sort((a, b) => a.y - b.y);
}

/**
 * Determine content mix based on available content
 */
function planContentMix(input) {
  const photoCount = input.photos?.length || 0;
  const quoteCount = input.quotes?.length || 0;
  const textCount = input.textBlocks?.length || 0;

  // Target 12 slots total
  const totalSlots = 12;
  const slotTypes = [];

  // Prioritize photos, but mix in other content
  // Aim for: 7-8 photos, 2-3 quotes, 1-2 text blocks, 1-2 color blocks

  let photosUsed = 0;
  let quotesUsed = 0;
  let textsUsed = 0;

  for (let i = 0; i < totalSlots; i++) {
    // Distribution pattern for variety
    if (i === 1 && quoteCount > quotesUsed) {
      slotTypes.push('quote');
      quotesUsed++;
    } else if (i === 4 && textCount > textsUsed) {
      slotTypes.push('text');
      textsUsed++;
    } else if (i === 6 && quoteCount > quotesUsed) {
      slotTypes.push('quote');
      quotesUsed++;
    } else if (i === 8 && textCount > textsUsed) {
      slotTypes.push('text');
      textsUsed++;
    } else if (i === 10) {
      slotTypes.push('color');
    } else if (photosUsed < photoCount) {
      slotTypes.push('photo');
      photosUsed++;
    } else if (quotesUsed < quoteCount) {
      slotTypes.push('quote');
      quotesUsed++;
    } else {
      slotTypes.push('color');
    }
  }

  return { totalSlots, slotTypes };
}

// ============================================================
// UTILITIES
// ============================================================

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
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

  return `A beautiful photograph of ${symbol}. ${styleHint}, professional photography, centered subject. ${noPeople}, no text, no logos, no brand names.`;
}

async function generatePhoto(symbol, style, index) {
  console.log(`  [Photo ${index + 1}] "${symbol.substring(0, 40)}..."`);
  try {
    const url = await generateImage(buildPhotoPrompt(symbol, style), {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1'
    });
    return await downloadImage(url);
  } catch (e) {
    console.error(`  [Photo ${index + 1}] Error:`, e.message);
    return null;
  }
}

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Generate Vision Board from Thought Organizer input
 *
 * @param {Object} input - Structured input from Thought Organizer
 * @param {string} input.title - Board title
 * @param {string} input.subtitle - Subtitle/themes (e.g., "GROWTH • COURAGE • FREEDOM")
 * @param {Object} input.colors - Color palette
 * @param {string} input.colors.background - Background color
 * @param {string[]} input.colors.accents - Accent colors array
 * @param {string} input.colors.banner - Banner background color
 * @param {string[]} input.photos - Array of photo prompt descriptions
 * @param {string[]} input.quotes - Array of user quotes (for quote cards)
 * @param {string[]} input.textBlocks - Array of single words/short phrases (for text blocks)
 * @param {Object} input.style - Style preferences
 * @param {boolean} input.style.decorations - Whether to add hearts/stars/flowers
 * @param {boolean} input.style.bokeh - Whether to add bokeh effect
 * @param {string} input.style.mood - Mood description for image generation
 */
async function generateVisionBoard(input, options = {}) {
  const { skipGeneration = false, costLimit = 1.00 } = options;
  const timestamp = Date.now();
  const bannerH = 70;

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

  console.log('\n' + '='.repeat(60));
  console.log('VISION BOARD ENGINE V7');
  console.log('='.repeat(60));
  console.log(`Title: "${title}"`);
  console.log(`Photos: ${photos.length}, Quotes: ${quotes.length}, Text Blocks: ${textBlocks.length}`);
  console.log(`Style: decorations=${style.decorations}, bokeh=${style.bokeh}`);

  // Plan content mix
  const contentPlan = planContentMix({ photos, quotes, textBlocks });
  console.log(`\nContent plan: ${contentPlan.slotTypes.join(', ')}`);

  // Generate photos
  console.log('\n[1] Generating photos...');
  const photoBuffers = [];
  const maxPhotos = Math.min(photos.length, Math.floor(costLimit / COST_PER_IMAGE));

  if (!skipGeneration) {
    for (let i = 0; i < maxPhotos; i++) {
      const buf = await generatePhoto(photos[i], style, i);
      if (buf) photoBuffers.push(buf);
      if (i < maxPhotos - 1) await new Promise(r => setTimeout(r, 350));
    }
  } else {
    // Placeholders
    for (let i = 0; i < photos.length; i++) {
      const color = colors.accents[i % colors.accents.length];
      photoBuffers.push(await sharp({
        create: { width: 300, height: 300, channels: 4, background: color }
      }).png().toBuffer());
    }
  }

  // Create canvas
  console.log('[2] Creating canvas...');
  let canvas = await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: colors.background
    }
  }).png().toBuffer();

  // Add subtle background texture rectangles
  console.log('[3] Adding background textures...');
  const bgRects = [];
  for (let i = 0; i < 10; i++) {
    const color = lighten(colors.background, (Math.random() - 0.5) * 10);
    const w = 150 + Math.random() * 300;
    const h = 100 + Math.random() * 200;
    const x = Math.random() * CANVAS_WIDTH - 50;
    const y = bannerH + Math.random() * (CANVAS_HEIGHT - bannerH);
    const rot = (Math.random() - 0.5) * 20;

    bgRects.push({
      input: Buffer.from(createColorBlock(w, h, color, rot)),
      top: Math.round(Math.max(0, y)),
      left: Math.round(Math.max(0, x))
    });
  }

  // Small accent rectangles
  for (let i = 0; i < 15; i++) {
    const color = colors.accents[i % colors.accents.length];
    const w = 35 + Math.random() * 50;
    const h = 20 + Math.random() * 35;
    const x = Math.random() * (CANVAS_WIDTH - w);
    const y = bannerH + 20 + Math.random() * (CANVAS_HEIGHT - bannerH - 60);
    const rot = (Math.random() - 0.5) * 25;

    bgRects.push({
      input: Buffer.from(createColorBlock(w, h, color, rot)),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  for (const rect of bgRects) {
    try {
      canvas = await sharp(canvas).composite([rect]).png().toBuffer();
    } catch (e) { /* skip */ }
  }

  // Add bokeh if enabled
  if (style.bokeh) {
    console.log('[4] Adding bokeh...');
    const bokehs = [];
    const bokehColor = colors.accents[0] || '#FFE4B5';

    for (let i = 0; i < 25; i++) {
      const size = 30 + Math.random() * 70;
      bokehs.push({
        input: Buffer.from(createBokeh(size, bokehColor, 0.25)),
        top: Math.round(Math.random() * CANVAS_HEIGHT),
        left: Math.round(Math.random() * CANVAS_WIDTH)
      });
    }
    canvas = await sharp(canvas).composite(bokehs).png().toBuffer();
  }

  // Calculate layout
  console.log('[5] Calculating layout...');
  const layout = calculateMixedLayout(contentPlan, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Create and composite content
  console.log('[6] Creating content pieces...');
  const contentItems = [];

  for (const item of layout) {
    let contentBuffer;

    try {
      if (item.type === 'photo' && photoBuffers[item.contentIndex]) {
        const photo = await createPhotoContent(
          photoBuffers[item.contentIndex],
          item.width,
          item.rotation,
          colors
        );
        contentBuffer = photo.buffer;
      } else if (item.type === 'quote' && quotes[item.contentIndex]) {
        const svg = createQuoteCard(
          quotes[item.contentIndex],
          item.width,
          item.height,
          colors,
          item.rotation
        );
        contentBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      } else if (item.type === 'text' && textBlocks[item.contentIndex]) {
        const svg = createTextBlock(
          textBlocks[item.contentIndex],
          item.width,
          item.height,
          colors,
          item.rotation
        );
        contentBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      } else if (item.type === 'color') {
        const color = colors.accents[item.contentIndex % colors.accents.length];
        const svg = createColorBlock(item.width, item.height, color, item.rotation);
        contentBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      }

      if (contentBuffer) {
        contentItems.push({
          input: contentBuffer,
          top: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 50, item.y))),
          left: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - 50, item.x)))
        });
      }
    } catch (e) {
      console.log(`  Skipping ${item.type} - error:`, e.message);
    }
  }

  console.log('[7] Compositing content...');
  for (const item of contentItems) {
    try {
      canvas = await sharp(canvas).composite([item]).png().toBuffer();
    } catch (e) { /* skip */ }
  }

  // Add decorations if enabled
  if (style.decorations) {
    console.log('[8] Adding decorations...');
    const decorations = [];
    const decorTypes = ['heart', 'star', 'flower'];

    for (let i = 0; i < 12; i++) {
      const type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
      const color = colors.accents[Math.floor(Math.random() * colors.accents.length)];
      const size = 22 + Math.random() * 25;
      const x = Math.random() * (CANVAS_WIDTH - size);
      const y = bannerH + 25 + Math.random() * (CANVAS_HEIGHT - bannerH - 70);

      decorations.push({
        input: Buffer.from(createDecoration(type, size, color)),
        top: Math.round(y),
        left: Math.round(x)
      });
    }

    canvas = await sharp(canvas).composite(decorations).png().toBuffer();
  }

  // Add banner
  console.log('[9] Adding banner...');
  const bannerSvg = createBanner(CANVAS_WIDTH, title, subtitle, colors);
  canvas = await sharp(canvas)
    .composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `visionboard-v7-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : photoBuffers.length * COST_PER_IMAGE;

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('='.repeat(60));

  return { success: true, filepath, cost, photoCount: photoBuffers.length };
}

module.exports = { generateVisionBoard, COST_PER_IMAGE };
