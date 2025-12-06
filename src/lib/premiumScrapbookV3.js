/**
 * Premium Scrapbook Compositor v3
 *
 * Target: Match reference image EXACTLY
 * - TRUE edge-to-edge (no background visible)
 * - Controlled photo edge overlapping
 * - Larger photos with dramatic size variation
 * - Many more torn paper layers
 * - Confetti/stickers on top of photos
 * - Organic non-grid layout
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

const PALETTES = {
  'feminine-glowup': {
    background: '#F5E6EA',
    paperLayers: ['#FFE8F0', '#E8F4F8', '#FFF8E8', '#F0E8FF', '#E8FFF0', '#FFE8E8', '#F8F0FF', '#FFF0E8'],
    accents: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFD700', '#98FB98', '#FFA07A', '#FF69B4', '#B0E0E6'],
    confetti: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFD700', '#98FB98', '#FFA07A', '#FF69B4'],
    washiTape: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFDAB9', '#98FB98', '#B0E0E6'],
    bannerBg: '#3A2F35',
    bannerText: '#F8F0F0',
    stickers: ['#FFB6C1', '#DDA0DD', '#98FB98', '#87CEEB', '#FFDAB9'],
  },
  'masculine-dark': {
    background: '#2A2A2A',
    paperLayers: ['#3A3A3A', '#4A4A4A', '#353535', '#454545', '#303030', '#404040', '#383838', '#484848'],
    accents: ['#8B7355', '#6B8E6B', '#4682B4', '#CD853F', '#708090', '#8B4513', '#556B2F', '#4A4A4A'],
    confetti: [],  // No confetti for masculine
    washiTape: ['#5C5C5C', '#6B6B6B', '#4A4A4A', '#7A7A7A', '#8B7355', '#556B2F'],
    bannerBg: '#1A1A1A',
    bannerText: '#E8E8E8',
    stickers: [],  // No stickers for masculine - clean look
  },
  'relationship-love': {
    background: '#FFF5F5',
    paperLayers: ['#FFE4E4', '#FFF0F0', '#FFE8E8', '#FFDADA', '#FFE0E0', '#FFF2F2', '#FFECEC', '#FFD8D8'],
    accents: ['#FF6B6B', '#FF8E8E', '#FFB6B6', '#E85A5A', '#FF7777', '#FF9999', '#FFAAAA', '#FF5555'],
    confetti: [],  // No confetti
    washiTape: ['#FF8E8E', '#FFB6B6', '#FFDADA', '#FF9999', '#FFCCCC', '#FFE0E0'],
    bannerBg: '#8B3A3A',  // Deep romantic red
    bannerText: '#FFF5F5',
    stickers: ['#FF6B6B', '#FF8E8E', '#FFB6B6', '#E85A5A'],  // Heart-focused colors
  }
};

// Torn edge path generator
function tornPath(w, h, roughness = 8) {
  let d = `M0 ${roughness}`;
  for (let x = 0; x <= w; x += 10) d += ` L${x} ${Math.random() * roughness}`;
  d += ` L${w} ${roughness} L${w} ${h - roughness}`;
  for (let x = w; x >= 0; x -= 10) d += ` L${x} ${h - Math.random() * roughness}`;
  d += ` L0 ${h - roughness} Z`;
  return d;
}

// Create torn paper
function tornPaper(w, h, color, rot = 0) {
  const id = Math.random().toString(36).substr(2, 6);
  return `<svg width="${w+20}" height="${h+20}">
    <defs><filter id="ps${id}"><feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.12"/></filter></defs>
    <g transform="translate(10,10) rotate(${rot} ${w/2} ${h/2})">
      <path d="${tornPath(w, h, 8)}" fill="${color}" filter="url(#ps${id})"/>
    </g>
  </svg>`;
}

// Ripped edge path for photos - more dramatic torn effect
function rippedEdgePath(w, h, side = 'right') {
  // Creates an irregular ripped edge on specified side
  let d = 'M0 0';
  if (side === 'right' || side === 'both') {
    d = `M0 0 L${w - 15} 0`;
    for (let y = 0; y <= h; y += 8) {
      d += ` L${w - 15 + Math.random() * 15} ${y}`;
    }
    d += ` L${w - 15} ${h} L0 ${h}`;
  } else {
    d = `M0 0 L${w} 0 L${w} ${h} L0 ${h}`;
  }
  // Add torn bottom edge
  if (side === 'bottom' || side === 'both') {
    d = `M0 0 L${w} 0 L${w} ${h - 10}`;
    for (let x = w; x >= 0; x -= 8) {
      d += ` L${x} ${h - 10 + Math.random() * 12}`;
    }
    d += ' L0 0';
  }
  d += ' Z';
  return d;
}

// Photo frame with more variety - polaroid, torn edges, curled corners
async function photoFrame(imgBuf, style, size) {
  const styles = {
    polaroid: { pad: 10, bottom: 40, bg: '#FFFFFF', shadow: 0.2 },
    tornRight: { pad: 6, bottom: 6, bg: '#FFFEF8', ripped: 'right', shadow: 0.15 },
    tornBottom: { pad: 6, bottom: 6, bg: '#FFF9F0', ripped: 'bottom', shadow: 0.15 },
    vintage: { pad: 8, bottom: 8, bg: '#FFFDE8', aged: true, shadow: 0.22 },
    clean: { pad: 4, bottom: 4, bg: '#FFFFFF', shadow: 0.12 },
  };
  const s = styles[style] || styles.polaroid;
  const fw = size + s.pad * 2;
  const fh = size + s.pad + s.bottom;

  const resized = await sharp(imgBuf).resize(size, size, { fit: 'cover' }).toBuffer();

  const id = Math.random().toString(36).substr(2, 6);
  let frameSvg;

  if (s.ripped) {
    // Torn/ripped edge photo
    frameSvg = `<svg width="${fw+20}" height="${fh+20}">
      <defs>
        <filter id="fs${id}">
          <feDropShadow dx="3" dy="4" stdDeviation="5" flood-opacity="${s.shadow}"/>
        </filter>
        <filter id="paper${id}">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
          <feDiffuseLighting in="noise" lighting-color="${s.bg}" surfaceScale="2">
            <feDistantLight azimuth="45" elevation="60"/>
          </feDiffuseLighting>
        </filter>
      </defs>
      <g transform="translate(10,10)">
        <path d="${rippedEdgePath(fw, fh, s.ripped)}" fill="${s.bg}" filter="url(#fs${id})"/>
      </g>
    </svg>`;
  } else if (s.aged) {
    // Vintage with subtle texture and yellowed edges
    frameSvg = `<svg width="${fw+20}" height="${fh+20}">
      <defs>
        <filter id="fs${id}">
          <feDropShadow dx="3" dy="5" stdDeviation="6" flood-opacity="${s.shadow}"/>
        </filter>
        <linearGradient id="aged${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFDE8"/>
          <stop offset="50%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#FFF8E0"/>
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="${fw}" height="${fh}" fill="url(#aged${id})" rx="2" filter="url(#fs${id})"/>
      <rect x="10" y="10" width="${fw}" height="${fh}" fill="none" stroke="#E8DCC8" stroke-width="1" rx="2"/>
    </svg>`;
  } else {
    // Standard polaroid with deeper shadow
    frameSvg = `<svg width="${fw+20}" height="${fh+20}">
      <defs>
        <filter id="fs${id}">
          <feDropShadow dx="3" dy="5" stdDeviation="6" flood-opacity="${s.shadow}"/>
        </filter>
      </defs>
      <rect x="10" y="10" width="${fw}" height="${fh}" fill="${s.bg}" rx="1" filter="url(#fs${id})"/>
    </svg>`;
  }

  return {
    buffer: await sharp(Buffer.from(frameSvg))
      .composite([{ input: resized, top: s.pad + 10, left: s.pad + 10 }])
      .png().toBuffer(),
    width: fw + 20,
    height: fh + 20
  };
}

// Washi tape - more realistic with pattern and translucency
function washiTape(w, color, rot = 0) {
  const id = Math.random().toString(36).substr(2, 6);
  return `<svg width="${w+8}" height="28">
    <defs>
      <pattern id="tp${id}" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="${color}"/>
        <rect x="0" y="0" width="3" height="3" fill="rgba(255,255,255,0.1)"/>
        <rect x="3" y="3" width="3" height="3" fill="rgba(255,255,255,0.1)"/>
      </pattern>
    </defs>
    <g transform="translate(4,4) rotate(${rot} ${w/2} 10)">
      <rect width="${w}" height="18" fill="url(#tp${id})" opacity="0.8" rx="0"/>
      <rect width="${w}" height="18" fill="${color}" opacity="0.4" rx="0"/>
    </g>
  </svg>`;
}

// Binder clip - proper butterfly/foldback clip shape
function binderClip(size, color = '#333') {
  const id = Math.random().toString(36).substr(2, 6);
  return `<svg width="${size}" height="${size * 0.8}" viewBox="0 0 50 40">
    <defs>
      <linearGradient id="bc${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4A4A4A"/>
        <stop offset="30%" stop-color="#2A2A2A"/>
        <stop offset="70%" stop-color="#3A3A3A"/>
        <stop offset="100%" stop-color="#1A1A1A"/>
      </linearGradient>
      <linearGradient id="bh${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#C0C0C0"/>
        <stop offset="50%" stop-color="#808080"/>
        <stop offset="100%" stop-color="#A0A0A0"/>
      </linearGradient>
      <filter id="bcs${id}"><feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-opacity="0.35"/></filter>
    </defs>
    <g filter="url(#bcs${id})">
      <!-- Main clip body -->
      <path d="M8 18 L8 35 Q8 38 11 38 L39 38 Q42 38 42 35 L42 18 Q42 15 39 15 L11 15 Q8 15 8 18 Z" fill="url(#bc${id})"/>
      <!-- Wire handles (folded up) -->
      <path d="M15 15 L15 6 Q15 3 18 3 L22 3" fill="none" stroke="url(#bh${id})" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M35 15 L35 6 Q35 3 32 3 L28 3" fill="none" stroke="url(#bh${id})" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Highlight -->
      <rect x="10" y="20" width="30" height="2" fill="rgba(255,255,255,0.15)" rx="1"/>
    </g>
  </svg>`;
}

// Kraft paper scrap - prominent texture for depth
function kraftPaper(w, h, rot = 0) {
  const id = Math.random().toString(36).substr(2, 6);
  // Vary the kraft color for visual interest
  const colors = ['#C9B896', '#D4C4A8', '#BFA98A', '#E0D4BE'];
  const baseColor = colors[Math.floor(Math.random() * colors.length)];
  return `<svg width="${w+24}" height="${h+24}">
    <defs>
      <filter id="ks${id}">
        <feDropShadow dx="3" dy="4" stdDeviation="5" flood-opacity="0.25"/>
      </filter>
      <pattern id="kp${id}" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="4" height="4" fill="${baseColor}"/>
        <rect x="0" y="0" width="2" height="2" fill="rgba(0,0,0,0.03)"/>
        <rect x="2" y="2" width="2" height="2" fill="rgba(255,255,255,0.05)"/>
      </pattern>
    </defs>
    <g transform="translate(12,12) rotate(${rot} ${w/2} ${h/2})">
      <path d="${tornPath(w, h, 8)}" fill="url(#kp${id})" filter="url(#ks${id})"/>
      <path d="${tornPath(w, h, 8)}" fill="rgba(255,255,255,0.1)"/>
    </g>
  </svg>`;
}

// 3D sticker
function sticker(type, size, color) {
  const id = Math.random().toString(36).substr(2, 6);
  const light = lighten(color, 35);
  const stickers = {
    heart: `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
      <defs><linearGradient id="hg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${color}"/>
      </linearGradient><filter id="hs${id}"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter></defs>
      <path d="M50 85C20 60 5 40 18 25C32 10 50 22 50 22C50 22 68 10 82 25C95 40 80 60 50 85Z"
        fill="url(#hg${id})" stroke="white" stroke-width="2" filter="url(#hs${id})"/>
    </svg>`,
    star: `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
      <defs><linearGradient id="sg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${color}"/>
      </linearGradient><filter id="ss${id}"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter></defs>
      <polygon points="50,8 61,35 92,35 67,55 78,85 50,68 22,85 33,55 8,35 39,35"
        fill="url(#sg${id})" stroke="white" stroke-width="2" filter="url(#ss${id})"/>
    </svg>`,
    flower: `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
      <defs><radialGradient id="fg${id}" cx="50%" cy="50%">
        <stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${color}"/>
      </radialGradient><filter id="fls${id}"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter></defs>
      <g filter="url(#fls${id})">
        <ellipse cx="50" cy="22" rx="13" ry="18" fill="url(#fg${id})" stroke="white" stroke-width="1"/>
        <ellipse cx="50" cy="78" rx="13" ry="18" fill="url(#fg${id})" stroke="white" stroke-width="1"/>
        <ellipse cx="22" cy="50" rx="18" ry="13" fill="url(#fg${id})" stroke="white" stroke-width="1"/>
        <ellipse cx="78" cy="50" rx="18" ry="13" fill="url(#fg${id})" stroke="white" stroke-width="1"/>
        <ellipse cx="30" cy="30" rx="12" ry="16" fill="url(#fg${id})" stroke="white" stroke-width="1" transform="rotate(-45 30 30)"/>
        <ellipse cx="70" cy="30" rx="12" ry="16" fill="url(#fg${id})" stroke="white" stroke-width="1" transform="rotate(45 70 30)"/>
        <ellipse cx="30" cy="70" rx="12" ry="16" fill="url(#fg${id})" stroke="white" stroke-width="1" transform="rotate(45 30 70)"/>
        <ellipse cx="70" cy="70" rx="12" ry="16" fill="url(#fg${id})" stroke="white" stroke-width="1" transform="rotate(-45 70 70)"/>
        <circle cx="50" cy="50" r="14" fill="#FFD700" stroke="white" stroke-width="1"/>
      </g>
    </svg>`,
    iceCream: `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
      <defs><filter id="is${id}"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter></defs>
      <g filter="url(#is${id})">
        <polygon points="35,50 50,92 65,50" fill="#DEB887" stroke="white" stroke-width="1"/>
        <ellipse cx="50" cy="42" rx="20" ry="16" fill="#FFB6C1" stroke="white" stroke-width="1"/>
        <ellipse cx="40" cy="30" rx="14" ry="11" fill="#87CEEB" stroke="white" stroke-width="1"/>
        <ellipse cx="60" cy="30" rx="14" ry="11" fill="#DDA0DD" stroke="white" stroke-width="1"/>
        <circle cx="50" cy="18" r="7" fill="#FF6B6B" stroke="white" stroke-width="1"/>
      </g>
    </svg>`
  };
  return stickers[type] || stickers.heart;
}

// Confetti dot
function confetti(size, color) {
  const id = Math.random().toString(36).substr(2, 6);
  return `<svg width="${size}" height="${size}">
    <defs><radialGradient id="cg${id}" cx="30%" cy="30%">
      <stop offset="0%" stop-color="${lighten(color, 40)}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.75"/>
    </radialGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-1}" fill="url(#cg${id})"/>
  </svg>`;
}

// Bokeh glow
function bokeh(size, color, op = 0.25) {
  const id = Math.random().toString(36).substr(2, 6);
  return `<svg width="${size}" height="${size}">
    <defs><radialGradient id="bg${id}" cx="40%" cy="40%">
      <stop offset="0%" stop-color="white" stop-opacity="${op*1.5}"/>
      <stop offset="50%" stop-color="${color}" stop-opacity="${op}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bg${id})"/>
  </svg>`;
}

function lighten(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const a = Math.round(2.55 * pct);
  const r = Math.min(255, (n >> 16) + a);
  const g = Math.min(255, ((n >> 8) & 0xFF) + a);
  const b = Math.min(255, (n & 0xFF) + a);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
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

function buildPrompt(symbol, aesthetic) {
  // CRITICAL: Strongly enforce NO PEOPLE - Ideogram tends to add them
  const noPeopleClause = "IMPORTANT: absolutely no people, no human figures, no faces, no hands, no fingers, no body parts, no silhouettes of people, no shadows of people, objects only";

  // Adapt style based on aesthetic
  const isMasculine = aesthetic.includes('masculine') || aesthetic.includes('dark');
  const isRomantic = aesthetic.includes('relationship') || aesthetic.includes('love');

  let styleClause;
  if (isMasculine) {
    styleClause = "Moody dramatic lighting, rich dark tones, deep shadows, masculine sophisticated aesthetic, editorial product photography style";
  } else if (isRomantic) {
    styleClause = "Warm golden hour lighting, soft romantic tones, cozy intimate atmosphere, lifestyle photography";
  } else {
    styleClause = "Soft pastel colors, dreamy warm lighting, gentle bokeh background, aesthetic lifestyle photography, cozy feminine vibes";
  }

  return `A beautiful aesthetic photograph of ${symbol}. ${styleClause}. Centered subject, ${noPeopleClause}, no text, no logos, no brand names, no trademarks, no Nike, no Jordan, no Adidas, generic unbranded items only. Simple complementary background. High quality professional photography.`;
}

async function genImage(symbol, aesthetic, i) {
  console.log(`[${i + 1}] "${symbol.substring(0, 30)}..."`);
  try {
    const url = await generateImage(buildPrompt(symbol, aesthetic), {
      model: 'V_2_TURBO',
      aspectRatio: 'ASPECT_1_1'
    });
    return await downloadImage(url);
  } catch (e) {
    console.error(`[${i + 1}] Error:`, e.message);
    return null;
  }
}

/**
 * Layout engine - ORGANIC with intentional placement
 * Like reference: varied sizes, overlapping edges but not chaos
 * Grid-guided but organic placement
 * Dynamically adjusts grid based on image count
 */
function layoutPhotos(count, cw, ch, bannerH) {
  const positions = [];
  const contentH = ch - bannerH;

  // Dynamic grid based on count
  // 12 images = 3x4, 24 images = 4x6, etc.
  let cols, rows;
  if (count <= 12) {
    cols = 3;
    rows = 4;
  } else if (count <= 20) {
    cols = 4;
    rows = 5;
  } else if (count <= 30) {
    cols = 5;
    rows = 6;
  } else {
    cols = 6;
    rows = Math.ceil(count / 6);
  }

  const cellW = cw / cols;
  const cellH = contentH / rows;

  // Photo styles for variety - include torn edges for realism
  const styles = ['polaroid', 'vintage', 'tornRight', 'polaroid', 'clean', 'tornBottom', 'vintage', 'polaroid'];

  // Create intentional layout zones
  const zones = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      zones.push({
        centerX: (c * cellW) + (cellW / 2),
        centerY: bannerH + (r * cellH) + (cellH / 2),
        row: r,
        col: c
      });
    }
  }

  // Shuffle zones for organic feel
  for (let i = zones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]];
  }

  // Scale photo sizes based on count - more photos = smaller sizes
  // For 12 images, use larger sizes like the liked reference images
  const baseSize = count <= 12 ? 260 : count <= 20 ? 200 : 170;
  const sizeVariation = count <= 12 ? 50 : count <= 20 ? 35 : 25;

  // Assign photos to zones with intentional sizing
  for (let i = 0; i < Math.min(count, zones.length); i++) {
    const zone = zones[i];

    // Size varies more dramatically - some larger hero-ish photos
    let size;
    if (i < 3) {
      // First few can be larger (hero-ish)
      size = baseSize + 20 + Math.random() * sizeVariation;
    } else if (i < Math.floor(count * 0.6)) {
      // Middle batch medium
      size = baseSize + Math.random() * (sizeVariation * 0.75);
    } else {
      // Rest smaller for variety
      size = baseSize - 30 + Math.random() * sizeVariation;
    }

    // Position with organic offset from zone center (smaller offset for more images)
    const offsetScale = count <= 12 ? 1 : count <= 20 ? 0.7 : 0.5;
    const offsetX = (Math.random() - 0.5) * 60 * offsetScale;
    const offsetY = (Math.random() - 0.5) * 50 * offsetScale;

    // Rotation for organic feel (-8 to +8 degrees)
    const rotation = (Math.random() - 0.5) * 16;

    positions.push({
      x: zone.centerX - (size / 2) + offsetX,
      y: zone.centerY - (size / 2) + offsetY,
      size: size,
      rotation: rotation,
      style: styles[i % styles.length],
      zone: zone
    });
  }

  // Sort by y position for proper layering (back to front)
  return positions.sort((a, b) => a.y - b.y);
}

/**
 * Main generation function
 */
async function generatePremiumBoardV3(workbookData, options = {}) {
  const {
    aesthetic = 'feminine-glowup',
    symbols = [],
    boardTitle = 'MY 2025 VISION',
    themes = []
  } = workbookData;

  const { costLimit = 1.00, skipGeneration = false, maxImages = 14 } = options;
  const palette = PALETTES[aesthetic] || PALETTES['feminine-glowup'];
  const timestamp = Date.now();
  const bannerH = 60;

  console.log('\n' + '='.repeat(60));
  console.log('PREMIUM SCRAPBOOK v3 - Edge-to-Edge');
  console.log('='.repeat(60));

  const maxBudget = Math.floor(costLimit / COST_PER_IMAGE);
  const toGen = symbols.slice(0, Math.min(maxImages, maxBudget));
  console.log(`Generating ${toGen.length} images (~$${(toGen.length * COST_PER_IMAGE).toFixed(2)})`);

  // Generate images
  console.log('\n[1] Generating images...');
  const images = [];
  if (!skipGeneration) {
    for (let i = 0; i < toGen.length; i++) {
      const buf = await genImage(toGen[i], aesthetic, i);
      if (buf) images.push(buf);
      if (i < toGen.length - 1) await new Promise(r => setTimeout(r, 350));
    }
  } else {
    for (let i = 0; i < toGen.length; i++) {
      const color = palette.accents[i % palette.accents.length];
      images.push(await sharp({ create: { width: 300, height: 300, channels: 4, background: color } }).png().toBuffer());
    }
  }

  // Create layered background
  console.log('\n[2] Creating dense background...');
  let canvas = await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: palette.background }
  }).png().toBuffer();

  // Many torn paper layers - specifically targeting edges and gaps
  console.log('[3] Adding torn paper layers (many)...');
  const papers = [];

  // Random papers across canvas
  for (let i = 0; i < 15; i++) {
    const color = palette.paperLayers[i % palette.paperLayers.length];
    const w = 180 + Math.random() * 350;
    const h = 150 + Math.random() * 280;
    const x = -80 + Math.random() * (CANVAS_WIDTH + 100);
    const y = bannerH - 30 + Math.random() * (CANVAS_HEIGHT - bannerH);
    const rot = (Math.random() - 0.5) * 40;
    papers.push({ input: Buffer.from(tornPaper(w, h, color, rot)), top: Math.round(y), left: Math.round(x) });
  }

  // Extra papers specifically on RIGHT edge
  for (let i = 0; i < 6; i++) {
    const color = palette.paperLayers[i % palette.paperLayers.length];
    const w = 200 + Math.random() * 300;
    const h = 180 + Math.random() * 250;
    const x = CANVAS_WIDTH - w + 50 + Math.random() * 100;  // Hang off right edge
    const y = bannerH + (i * 180) + Math.random() * 80;
    const rot = (Math.random() - 0.5) * 35;
    papers.push({ input: Buffer.from(tornPaper(w, h, color, rot)), top: Math.round(y), left: Math.round(x) });
  }

  // Extra papers specifically on BOTTOM edge
  for (let i = 0; i < 5; i++) {
    const color = palette.paperLayers[i % palette.paperLayers.length];
    const w = 220 + Math.random() * 320;
    const h = 200 + Math.random() * 220;
    const x = (i * 220) - 50 + Math.random() * 60;
    const y = CANVAS_HEIGHT - h + 80 + Math.random() * 100;  // Hang off bottom
    const rot = (Math.random() - 0.5) * 35;
    papers.push({ input: Buffer.from(tornPaper(w, h, color, rot)), top: Math.round(y), left: Math.round(x) });
  }

  // REMOVED kraft paper - it was clutter, not purposeful

  canvas = await sharp(canvas).composite(papers).png().toBuffer();

  // Bokeh background
  console.log('[4] Adding bokeh...');
  const bokehs = [];
  for (let i = 0; i < 25; i++) {
    const size = 40 + Math.random() * 100;
    const color = palette.confetti[i % palette.confetti.length];
    bokehs.push({
      input: Buffer.from(bokeh(size, color, 0.15 + Math.random() * 0.2)),
      top: Math.round(Math.random() * CANVAS_HEIGHT),
      left: Math.round(Math.random() * CANVAS_WIDTH)
    });
  }
  canvas = await sharp(canvas).composite(bokehs).png().toBuffer();

  // Create photo frames
  console.log('[5] Creating photo frames...');
  const positions = layoutPhotos(images.length, CANVAS_WIDTH, CANVAS_HEIGHT, bannerH);
  const framed = [];
  for (let i = 0; i < images.length; i++) {
    const pos = positions[i];
    const f = await photoFrame(images[i], pos.style, Math.round(pos.size));
    framed.push({ ...f, ...pos });
  }

  // Composite photos with functional attachments
  console.log('[6] Compositing photos...');
  const photoOps = [];
  for (const photo of framed) {
    const rotated = await sharp(photo.buffer)
      .rotate(photo.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();

    // Get actual dimensions after rotation for precise tape placement
    const rotatedMeta = await sharp(rotated).metadata();
    const actualW = rotatedMeta.width;
    const actualH = rotatedMeta.height;

    photoOps.push({ input: rotated, top: Math.round(photo.y), left: Math.round(photo.x) });

    // Tape at TOP of photo - precisely overlapping the top edge
    // Position tape so it's half on the photo, half above (looks attached)
    const tc = palette.washiTape[Math.floor(Math.random() * palette.washiTape.length)];
    const tw = 50 + Math.random() * 20;
    const tapeHeight = 18;  // Washi tape is ~18px tall

    // Calculate tape position to overlap photo's top edge by ~10px
    const tapeTop = photo.y + 5;  // Slightly into the photo frame
    const tapeLeft = photo.x + (actualW / 2) - (tw / 2);

    // Match tape rotation to photo rotation for natural look
    photoOps.push({
      input: Buffer.from(washiTape(tw, tc, photo.rotation * 0.8)),
      top: Math.round(tapeTop),
      left: Math.round(tapeLeft)
    });
  }
  canvas = await sharp(canvas).composite(photoOps).png().toBuffer();

  // Add stickers at photo CORNERS - functioning as tape/attachment points
  // Skip for masculine aesthetics (empty stickers array)
  const stickerColors = palette.stickers || [];
  if (stickerColors.length > 0) {
    console.log('[7] Adding stickers at corners (as tape)...');
    const stickerOps = [];
    const stickerTypes = ['heart', 'flower', 'star'];

    for (let i = 0; i < framed.length; i++) {
      const photo = framed[i];

      // 50% chance of sticker at bottom-left corner
      if (Math.random() > 0.5) {
        const type = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
        const color = stickerColors[Math.floor(Math.random() * stickerColors.length)];
        const size = 35 + Math.random() * 15;
        stickerOps.push({
          input: Buffer.from(sticker(type, size, color)),
          top: Math.round(photo.y + photo.height - size - 15),
          left: Math.round(photo.x - 5)
        });
      }

      // 50% chance of sticker at bottom-right corner
      if (Math.random() > 0.5) {
        const type = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
        const color = stickerColors[Math.floor(Math.random() * stickerColors.length)];
        const size = 35 + Math.random() * 15;
        stickerOps.push({
          input: Buffer.from(sticker(type, size, color)),
          top: Math.round(photo.y + photo.height - size - 15),
          left: Math.round(photo.x + photo.width - size + 5)
        });
      }
    }
    if (stickerOps.length > 0) {
      canvas = await sharp(canvas).composite(stickerOps).png().toBuffer();
    }
  } else {
    console.log('[7] Skipping stickers (masculine/minimal aesthetic)...');
  }

  // NO confetti - everything should be purposeful
  console.log('[8] Skipping confetti (intentional design)...');

  // Title banner - Font varies by aesthetic
  // Feminine: Snell Roundhand (elegant script, natural case)
  // Masculine: Bodoni 72 (clean serif, all caps)
  console.log('[10] Adding banner...');
  const bannerHeight = 70;
  const themeText = themes.length ? themes.map(t => t.toUpperCase()).join('  •  ') : '';
  const textColor = palette.bannerText || '#F8F0F0';

  // Determine font based on aesthetic
  const isMasculine = aesthetic.includes('masculine') || aesthetic.includes('dark') || aesthetic.includes('minimal');
  const titleFont = isMasculine
    ? "'Bodoni 72','Didot','Georgia','Times New Roman',serif"
    : "'Snell Roundhand','Brush Script MT','Lucida Handwriting','cursive'";
  const titleText = isMasculine ? boardTitle.toUpperCase() : boardTitle;
  const titleSize = isMasculine ? (themeText ? 22 : 26) : (themeText ? 28 : 32);
  const letterSpacing = isMasculine ? " letter-spacing='0.15em'" : "";

  const banner = `<svg width="${CANVAS_WIDTH}" height="${bannerHeight}">
    <rect width="100%" height="100%" fill="${palette.bannerBg}"/>
    <text x="${CANVAS_WIDTH/2}" y="${themeText ? 38 : 46}" text-anchor="middle"
      font-family="${titleFont}"
      font-size="${titleSize}px" font-weight="normal"${letterSpacing} fill="${textColor}">${escapeXml(titleText)}</text>
    ${themeText ? `<text x="${CANVAS_WIDTH/2}" y="58" text-anchor="middle"
      font-family="'Bodoni 72','Didot','Georgia','Times New Roman',serif"
      font-size="9px" font-weight="400" letter-spacing="0.2em" fill="${textColor}" opacity="0.8">${escapeXml(themeText)}</text>` : ''}
  </svg>`;
  canvas = await sharp(canvas).composite([{ input: Buffer.from(banner), top: 0, left: 0 }]).png().toBuffer();

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = path.join(OUTPUT_DIR, `premium-v3-${timestamp}.png`);
  await sharp(canvas).toFile(filepath);

  const cost = skipGeneration ? 0 : images.length * COST_PER_IMAGE;
  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS:', filepath);
  console.log('Cost: $' + cost.toFixed(2));

  return { success: true, filepath, cost, images: images.length };
}

function escapeXml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { generatePremiumBoardV3, COST_PER_IMAGE };
