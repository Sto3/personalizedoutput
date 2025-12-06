/**
 * Mixed Media Vision Board V6
 *
 * KEY FEATURES:
 * - Mixed image styles: photos, illustrations, 3D renders, typography cards
 * - Theme-specific palettes that actually look good for each aesthetic
 * - Clean serif typography (NO script fonts)
 * - Organic polaroid layout with realistic shadows
 * - Subtle decorative elements appropriate to theme
 * - Consistent dreamy/bokeh aesthetic in generated images
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

/**
 * Theme-specific configurations
 * Each theme has colors, decorative elements, and typography appropriate to it
 */
const THEMES = {
  'feminine-soft': {
    name: 'Feminine Soft',
    background: '#F5E8ED',
    backgroundGradient: ['#F5E8ED', '#EDE4F0', '#F0E8F5'],
    polaroidBg: '#FFFFFF',
    accentColors: ['#FFB6C1', '#B4E4FF', '#E8D4F0', '#FFEAA7', '#B8F0D4', '#FFD4E5'],
    bannerBg: '#4A3F45',
    bannerText: '#F8F4F6',
    bannerSubtext: '#D0C4C8',
    decorations: ['heart', 'star', 'flower'],
    decorationColors: ['#FFB6C1', '#FFEAA7', '#B4E4FF', '#E8D4F0', '#B8F0D4'],
    imageStyle: 'soft pastel dreamy bokeh feminine aesthetic warm golden lighting',
    bokehColor: '#FFE4B5',
    bokehOpacity: 0.3,
  },
  'masculine-dark': {
    name: 'Masculine Dark',
    background: '#1E1E1E',
    backgroundGradient: ['#1E1E1E', '#252525', '#1A1A1A'],
    polaroidBg: '#F5F3F0',
    accentColors: ['#8B7355', '#5C5C5C', '#4A6741', '#6B5B4F', '#7A7A7A', '#5A5040'],
    bannerBg: '#0F0F0F',
    bannerText: '#E8E4E0',
    bannerSubtext: '#908880',
    decorations: [], // No cutesy decorations for masculine
    decorationColors: [],
    imageStyle: 'moody dark sophisticated editorial dramatic lighting masculine aesthetic',
    bokehColor: '#D4A574',
    bokehOpacity: 0.15,
  },
  'masculine-minimal': {
    name: 'Masculine Minimal',
    background: '#2A2A2A',
    backgroundGradient: ['#2A2A2A', '#303030', '#252525'],
    polaroidBg: '#FAFAFA',
    accentColors: ['#6B6B6B', '#8B8B8B', '#5A5A5A', '#7A7A7A', '#4A4A4A'],
    bannerBg: '#151515',
    bannerText: '#F0F0F0',
    bannerSubtext: '#888888',
    decorations: [],
    decorationColors: [],
    imageStyle: 'minimalist clean modern sleek professional dark background studio lighting',
    bokehColor: '#888888',
    bokehOpacity: 0.1,
  },
  'romantic-warm': {
    name: 'Romantic Warm',
    background: '#FDF5F3',
    backgroundGradient: ['#FDF5F3', '#FAF0EE', '#FFF8F5'],
    polaroidBg: '#FFFEFA',
    accentColors: ['#E8A598', '#D4978A', '#C4867A', '#F0B8A8', '#DDA090', '#ECBEB0'],
    bannerBg: '#5C3D3D',
    bannerText: '#FFF8F5',
    bannerSubtext: '#D0B8B0',
    decorations: ['heart'],
    decorationColors: ['#E8A598', '#F0B8A8', '#DDA090'],
    imageStyle: 'romantic warm golden hour soft intimate cozy lifestyle photography',
    bokehColor: '#FFD4C4',
    bokehOpacity: 0.25,
  },
  'nature-earth': {
    name: 'Nature Earth',
    background: '#E8E4D8',
    backgroundGradient: ['#E8E4D8', '#E0DCD0', '#F0ECE0'],
    polaroidBg: '#FDFCF8',
    accentColors: ['#7D8B6A', '#A8B89A', '#6B7A5A', '#9AAA8A', '#8A9A7A', '#B8C8A8'],
    bannerBg: '#3A4030',
    bannerText: '#F4F2EC',
    bannerSubtext: '#B8B4A8',
    decorations: ['leaf'],
    decorationColors: ['#7D8B6A', '#9AAA8A', '#A8B89A'],
    imageStyle: 'natural earthy organic botanical warm sunlight lifestyle photography',
    bokehColor: '#D4E8C4',
    bokehOpacity: 0.2,
  },
  'ocean-calm': {
    name: 'Ocean Calm',
    background: '#E8F4F8',
    backgroundGradient: ['#E8F4F8', '#E0F0F5', '#F0F8FC'],
    polaroidBg: '#FFFFFF',
    accentColors: ['#87CEEB', '#A8D8E8', '#6BB8D0', '#98D4E8', '#78C4D8', '#B8E4F0'],
    bannerBg: '#2A4A5A',
    bannerText: '#F4FAFC',
    bannerSubtext: '#A8C8D4',
    decorations: ['wave'],
    decorationColors: ['#87CEEB', '#A8D8E8', '#6BB8D0'],
    imageStyle: 'calm serene ocean coastal beach soft blue tones peaceful aesthetic',
    bokehColor: '#B8E8F8',
    bokehOpacity: 0.25,
  }
};

/**
 * Image style variations for mixed-media approach
 */
const IMAGE_STYLES = {
  photo: {
    prefix: 'A beautiful aesthetic photograph of',
    suffix: 'professional photography, high quality',
  },
  illustration: {
    prefix: 'A soft watercolor illustration of',
    suffix: 'delicate artistic style, gentle colors',
  },
  render3d: {
    prefix: 'A 3D rendered image of',
    suffix: 'soft lighting, clay render style, minimal',
  },
  flatlay: {
    prefix: 'A styled flat-lay photograph of',
    suffix: 'overhead view, aesthetic arrangement',
  }
};

/**
 * Create polaroid frame with realistic shadow
 */
async function createPolaroidFrame(imgBuffer, size, rotation = 0, theme) {
  const padding = Math.round(size * 0.035);
  const bottomPadding = Math.round(size * 0.10);
  const frameW = size + padding * 2;
  const frameH = size + padding + bottomPadding;
  const totalW = frameW + 50;
  const totalH = frameH + 50;

  const id = Math.random().toString(36).substr(2, 8);

  // Resize image
  const resized = await sharp(imgBuffer)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  // Create frame with shadow
  const frameSvg = `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
    </defs>
    <g transform="translate(25,20) rotate(${rotation} ${frameW/2} ${frameH/2})">
      <rect x="0" y="0" width="${frameW}" height="${frameH}"
            fill="${theme.polaroidBg}" rx="2" filter="url(#shadow${id})"/>
    </g>
  </svg>`;

  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();

  // Calculate where to place image after rotation
  const angleRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Center of frame
  const cx = totalW / 2;
  const cy = totalH / 2 - (bottomPadding - padding) / 2;

  // Image position relative to frame center
  const imgOffsetX = -size / 2;
  const imgOffsetY = -size / 2 - (bottomPadding - padding) / 2;

  // Rotated position
  const finalX = cx + imgOffsetX * cos - imgOffsetY * sin;
  const finalY = cy + imgOffsetX * sin + imgOffsetY * cos;

  // Rotate image
  const rotatedImg = await sharp(resized)
    .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rotatedMeta = await sharp(rotatedImg).metadata();

  // Composite
  const result = await sharp(frame)
    .composite([{
      input: rotatedImg,
      left: Math.round(25 + padding + (rotation !== 0 ? (rotatedMeta.width - size) / 2 * -0.1 : 0)),
      top: Math.round(20 + padding + (rotation !== 0 ? (rotatedMeta.height - size) / 2 * -0.1 : 0))
    }])
    .png()
    .toBuffer();

  return {
    buffer: result,
    width: totalW,
    height: totalH
  };
}

/**
 * Create simple colored accent rectangle
 */
function createAccentRect(w, h, color, rotation = 0) {
  return `<svg width="${w + 20}" height="${h + 20}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(10,10) rotate(${rotation} ${w/2} ${h/2})">
      <rect x="0" y="0" width="${w}" height="${h}" fill="${color}" opacity="0.6"/>
    </g>
  </svg>`;
}

/**
 * Create decorative elements based on theme
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
            fill="url(#hg${id})" opacity="0.85"/>
    </svg>`,

    star: `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 25)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
               fill="url(#sg${id})" opacity="0.8"/>
    </svg>`,

    flower: `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fg${id}" cx="50%" cy="50%">
          <stop offset="0%" stop-color="${lighten(color, 30)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </radialGradient>
      </defs>
      <g opacity="0.85">
        <ellipse cx="50" cy="25" rx="12" ry="18" fill="url(#fg${id})"/>
        <ellipse cx="50" cy="75" rx="12" ry="18" fill="url(#fg${id})"/>
        <ellipse cx="25" cy="50" rx="18" ry="12" fill="url(#fg${id})"/>
        <ellipse cx="75" cy="50" rx="18" ry="12" fill="url(#fg${id})"/>
        <circle cx="50" cy="50" r="12" fill="#FFEAA7"/>
      </g>
    </svg>`,

    leaf: `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 15)}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <path d="M50 10 Q80 30 80 60 Q80 85 50 90 Q20 85 20 60 Q20 30 50 10"
            fill="url(#lg${id})" opacity="0.8"/>
      <path d="M50 25 L50 80" stroke="${lighten(color, -20)}" stroke-width="2" opacity="0.5"/>
    </svg>`,

    wave: `<svg width="${s}" height="${s}" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 30 Q25 10 50 30 Q75 50 100 30"
            stroke="${color}" stroke-width="4" fill="none" opacity="0.7"/>
    </svg>`
  };

  return decorations[type] || decorations.heart;
}

/**
 * Create soft bokeh circles for background
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
 * Create title banner with clean typography
 */
function createBanner(width, title, subtitle, theme) {
  const height = 70;
  const titleSize = Math.min(32, Math.floor(width * 0.75 / title.length));
  const subtitleSize = 9;

  // Clean serif font - Didot/Bodoni style, NO script
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${theme.bannerBg}"/>

    <text x="${width/2}" y="${subtitle ? 36 : 42}" text-anchor="middle"
          font-family="'Didot', 'Bodoni MT', 'Bodoni 72', 'Georgia', serif"
          font-size="${titleSize}px" font-weight="400" letter-spacing="0.08em"
          fill="${theme.bannerText}">${escapeXml(title)}</text>

    ${subtitle ? `
    <text x="${width/2}" y="56" text-anchor="middle"
          font-family="'Helvetica Neue', 'Arial', sans-serif"
          font-size="${subtitleSize}px" font-weight="400" letter-spacing="0.2em"
          fill="${theme.bannerSubtext}">${escapeXml(subtitle.toUpperCase())}</text>
    ` : ''}
  </svg>`;
}

/**
 * Organic layout calculator - creates natural-feeling placement
 */
function calculateLayout(count, canvasW, canvasH, bannerH) {
  const items = [];
  const contentH = canvasH - bannerH;
  const margin = 30;

  // Base sizes
  const sizes = {
    large: 240,
    medium: 200,
    small: 170
  };

  // Predefined zones for organic feel (not a strict grid)
  const zones = [
    // Row 1 - top
    { x: margin, y: bannerH + 30, size: 'large', rotation: -4 + Math.random() * 3 },
    { x: canvasW * 0.38, y: bannerH + 15, size: 'medium', rotation: 2 + Math.random() * 4 },
    { x: canvasW * 0.68, y: bannerH + 40, size: 'medium', rotation: -2 + Math.random() * 3 },

    // Row 2
    { x: margin - 10, y: bannerH + contentH * 0.26, size: 'medium', rotation: 3 + Math.random() * 3 },
    { x: canvasW * 0.32, y: bannerH + contentH * 0.24, size: 'large', rotation: -1 + Math.random() * 4 },
    { x: canvasW * 0.65, y: bannerH + contentH * 0.28, size: 'medium', rotation: -3 + Math.random() * 2 },

    // Row 3
    { x: margin + 20, y: bannerH + contentH * 0.48, size: 'medium', rotation: -2 + Math.random() * 4 },
    { x: canvasW * 0.35, y: bannerH + contentH * 0.50, size: 'medium', rotation: 4 + Math.random() * 3 },
    { x: canvasW * 0.62, y: bannerH + contentH * 0.46, size: 'large', rotation: -4 + Math.random() * 2 },

    // Row 4 - bottom
    { x: margin, y: bannerH + contentH * 0.72, size: 'medium', rotation: 2 + Math.random() * 3 },
    { x: canvasW * 0.30, y: bannerH + contentH * 0.74, size: 'medium', rotation: -3 + Math.random() * 4 },
    { x: canvasW * 0.58, y: bannerH + contentH * 0.70, size: 'medium', rotation: 1 + Math.random() * 3 },
  ];

  // Assign image styles for variety
  const stylePattern = ['photo', 'photo', 'photo', 'illustration', 'photo', 'flatlay', 'photo', 'photo', 'render3d', 'photo', 'photo', 'photo'];

  for (let i = 0; i < Math.min(count, zones.length); i++) {
    const zone = zones[i];
    const baseSize = sizes[zone.size];

    items.push({
      x: zone.x + (Math.random() - 0.5) * 25,
      y: zone.y + (Math.random() - 0.5) * 20,
      size: baseSize + (Math.random() - 0.5) * 30,
      rotation: zone.rotation,
      imageStyle: stylePattern[i % stylePattern.length]
    });
  }

  return items;
}

function lighten(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
 * Build prompt with style variation
 */
function buildPrompt(symbol, theme, imageStyle) {
  const style = IMAGE_STYLES[imageStyle] || IMAGE_STYLES.photo;
  const noPeople = "absolutely no people, no human figures, no faces, no hands, no body parts";

  return `${style.prefix} ${symbol}. ${theme.imageStyle}, ${style.suffix}. ${noPeople}, no text, no logos, no brand names. Beautiful composition, centered subject.`;
}

async function generateImageForItem(symbol, theme, imageStyle, index) {
  console.log(`  [${index + 1}] ${imageStyle}: "${symbol.substring(0, 35)}..."`);
  try {
    const url = await generateImage(buildPrompt(symbol, theme, imageStyle), {
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
 * Main generation function - V6 Mixed Media
 */
async function generateMixedMediaBoard(workbookData, options = {}) {
  const {
    theme = 'feminine-soft',
    symbols = [],
    boardTitle = 'My 2025 Vision',
    themes = []
  } = workbookData;

  const { costLimit = 1.00, skipGeneration = false, maxImages = 12 } = options;
  const themeConfig = THEMES[theme] || THEMES['feminine-soft'];
  const timestamp = Date.now();
  const bannerH = 70;

  console.log('\n' + '='.repeat(60));
  console.log(`MIXED MEDIA BOARD V6 - ${themeConfig.name}`);
  console.log('='.repeat(60));
  console.log('Features: Mixed styles (photo/illustration/3D), organic layout');
  console.log('Typography: Clean serif (Didot/Bodoni), no script fonts');

  const maxBudget = Math.floor(costLimit / COST_PER_IMAGE);
  const toGen = symbols.slice(0, Math.min(maxImages, maxBudget));
  console.log(`\nItems: ${toGen.length} (~$${(toGen.length * COST_PER_IMAGE).toFixed(2)})`);

  // Calculate layout first to know image styles
  const layout = calculateLayout(toGen.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);

  // Generate images
  console.log('\n[1] Generating images with mixed styles...');
  const images = [];

  if (!skipGeneration) {
    for (let i = 0; i < toGen.length; i++) {
      const style = layout[i]?.imageStyle || 'photo';
      const buf = await generateImageForItem(toGen[i], themeConfig, style, i);
      if (buf) images.push(buf);
      if (i < toGen.length - 1) await new Promise(r => setTimeout(r, 350));
    }
  } else {
    // Placeholder colors based on theme
    for (let i = 0; i < toGen.length; i++) {
      const color = themeConfig.accentColors[i % themeConfig.accentColors.length];
      images.push(await sharp({
        create: { width: 300, height: 300, channels: 4, background: color }
      }).png().toBuffer());
    }
  }

  // Create background with subtle gradient feel
  console.log('[2] Creating background...');
  let canvas = await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: themeConfig.background
    }
  }).png().toBuffer();

  // Add subtle background paper/texture rectangles
  console.log('[3] Adding background textures...');
  const bgElements = [];

  // Large soft rectangles for depth
  for (let i = 0; i < 8; i++) {
    const color = themeConfig.backgroundGradient[i % themeConfig.backgroundGradient.length];
    const w = 200 + Math.random() * 400;
    const h = 150 + Math.random() * 300;
    const x = Math.random() * CANVAS_WIDTH - 50;
    const y = bannerH + Math.random() * (CANVAS_HEIGHT - bannerH);
    const rot = (Math.random() - 0.5) * 15;

    bgElements.push({
      input: Buffer.from(createAccentRect(w, h, color, rot)),
      top: Math.round(Math.max(0, y)),
      left: Math.round(Math.max(0, x))
    });
  }

  // Colored accent rectangles (like in reference)
  for (let i = 0; i < 12; i++) {
    const color = themeConfig.accentColors[i % themeConfig.accentColors.length];
    const w = 40 + Math.random() * 60;
    const h = 25 + Math.random() * 40;
    const x = Math.random() * (CANVAS_WIDTH - w);
    const y = bannerH + 20 + Math.random() * (CANVAS_HEIGHT - bannerH - 60);
    const rot = (Math.random() - 0.5) * 20;

    bgElements.push({
      input: Buffer.from(createAccentRect(w, h, color, rot)),
      top: Math.round(y),
      left: Math.round(x)
    });
  }

  for (const el of bgElements) {
    try {
      canvas = await sharp(canvas).composite([el]).png().toBuffer();
    } catch (e) { /* skip */ }
  }

  // Add bokeh
  console.log('[4] Adding bokeh effects...');
  const bokehs = [];
  const bokehCount = themeConfig.bokehOpacity > 0.2 ? 30 : 15;

  for (let i = 0; i < bokehCount; i++) {
    const size = 30 + Math.random() * 80;
    bokehs.push({
      input: Buffer.from(createBokeh(size, themeConfig.bokehColor, themeConfig.bokehOpacity)),
      top: Math.round(Math.random() * CANVAS_HEIGHT),
      left: Math.round(Math.random() * CANVAS_WIDTH)
    });
  }

  canvas = await sharp(canvas).composite(bokehs).png().toBuffer();

  // Create and composite polaroid frames
  console.log('[5] Creating polaroid frames...');
  const photoComposites = [];

  for (let i = 0; i < Math.min(images.length, layout.length); i++) {
    const pos = layout[i];
    const frame = await createPolaroidFrame(images[i], Math.round(pos.size), pos.rotation, themeConfig);

    photoComposites.push({
      input: frame.buffer,
      top: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 100, pos.y))),
      left: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - 100, pos.x)))
    });
  }

  // Sort by Y for natural overlap
  photoComposites.sort((a, b) => a.top - b.top);

  console.log('[6] Compositing photos...');
  for (const photo of photoComposites) {
    try {
      canvas = await sharp(canvas).composite([photo]).png().toBuffer();
    } catch (e) { /* skip */ }
  }

  // Add decorations if theme has them
  if (themeConfig.decorations.length > 0) {
    console.log('[7] Adding decorations...');
    const decorations = [];

    for (let i = 0; i < 15; i++) {
      const type = themeConfig.decorations[Math.floor(Math.random() * themeConfig.decorations.length)];
      const color = themeConfig.decorationColors[Math.floor(Math.random() * themeConfig.decorationColors.length)];
      const size = 25 + Math.random() * 30;
      const x = Math.random() * (CANVAS_WIDTH - size);
      const y = bannerH + 30 + Math.random() * (CANVAS_HEIGHT - bannerH - 80);

      decorations.push({
        input: Buffer.from(createDecoration(type, size, color)),
        top: Math.round(y),
        left: Math.round(x)
      });
    }

    canvas = await sharp(canvas).composite(decorations).png().toBuffer();
  } else {
    console.log('[7] Skipping decorations (minimal theme)...');
  }

  // Add title banner
  console.log('[8] Adding banner...');
  const subtitle = themes.length > 0 ? themes.join(' • ') : '';
  const bannerSvg = createBanner(CANVAS_WIDTH, boardTitle, subtitle, themeConfig);

  canvas = await sharp(canvas)
    .composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `mixedmedia-v6-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : images.length * COST_PER_IMAGE;

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));
  console.log('Theme:', themeConfig.name);
  console.log('='.repeat(60));

  return { success: true, filepath, cost, images: images.length, theme: themeConfig.name };
}

module.exports = { generateMixedMediaBoard, THEMES, COST_PER_IMAGE };
