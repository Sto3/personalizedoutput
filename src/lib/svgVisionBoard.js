/**
 * SVG-Based Vision Board Generator
 *
 * Creates beautiful vision boards programmatically using:
 * - SVG graphics for icons and decorative elements
 * - Sharp.js for compositing and export
 * - No external AI image generation required
 *
 * Inspired by Pinterest mood boards and editorial collage aesthetics.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { OUTPUT_DIR } = require('../config/constants');

// Canvas dimensions (portrait, like 16x20 print)
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1792;

/**
 * Symbol/Icon Library - SVG paths for common vision board elements
 * Each returns an SVG string that can be composited
 */
const SYMBOLS = {
  // Lifestyle
  coffee: (color = '#8B4513') => `
    <svg viewBox="0 0 100 100">
      <ellipse cx="50" cy="75" rx="30" ry="10" fill="${color}" opacity="0.3"/>
      <path d="M25 30 L30 75 Q50 85 70 75 L75 30 Z" fill="${color}" opacity="0.9"/>
      <ellipse cx="50" cy="30" rx="25" ry="8" fill="${color}"/>
      <path d="M75 40 Q95 45 90 60 Q85 75 70 70" stroke="${color}" fill="none" stroke-width="4"/>
      <path d="M35 25 Q38 15 45 20" stroke="#fff" fill="none" stroke-width="2" opacity="0.5"/>
      <path d="M50 22 Q53 12 60 17" stroke="#fff" fill="none" stroke-width="2" opacity="0.5"/>
    </svg>
  `,

  heart: (color = '#E91E63') => `
    <svg viewBox="0 0 100 100">
      <path d="M50 88 C20 60 5 40 20 25 C35 10 50 25 50 25 C50 25 65 10 80 25 C95 40 80 60 50 88Z"
            fill="${color}" opacity="0.9"/>
      <path d="M35 30 Q40 25 45 30" stroke="#fff" fill="none" stroke-width="3" opacity="0.4"/>
    </svg>
  `,

  star: (color = '#FFD700') => `
    <svg viewBox="0 0 100 100">
      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
               fill="${color}" opacity="0.9"/>
      <polygon points="50,15 58,35 80,35 62,50 70,75 50,60 30,75 38,50 20,35 42,35"
               fill="#fff" opacity="0.2"/>
    </svg>
  `,

  flower: (color = '#FF69B4') => `
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="12" fill="#FFD700"/>
      <ellipse cx="50" cy="25" rx="12" ry="20" fill="${color}" opacity="0.8"/>
      <ellipse cx="50" cy="75" rx="12" ry="20" fill="${color}" opacity="0.8"/>
      <ellipse cx="25" cy="50" rx="20" ry="12" fill="${color}" opacity="0.8"/>
      <ellipse cx="75" cy="50" rx="20" ry="12" fill="${color}" opacity="0.8"/>
      <ellipse cx="32" cy="32" rx="12" ry="18" fill="${color}" opacity="0.8" transform="rotate(-45 32 32)"/>
      <ellipse cx="68" cy="32" rx="12" ry="18" fill="${color}" opacity="0.8" transform="rotate(45 68 32)"/>
      <ellipse cx="32" cy="68" rx="12" ry="18" fill="${color}" opacity="0.8" transform="rotate(45 32 68)"/>
      <ellipse cx="68" cy="68" rx="12" ry="18" fill="${color}" opacity="0.8" transform="rotate(-45 68 68)"/>
    </svg>
  `,

  plane: (color = '#4A90D9') => `
    <svg viewBox="0 0 100 100">
      <path d="M50 10 L55 40 L90 50 L55 55 L60 85 L50 70 L40 85 L45 55 L10 50 L45 40 Z"
            fill="${color}" opacity="0.9"/>
      <path d="M50 15 L53 38" stroke="#fff" fill="none" stroke-width="2" opacity="0.4"/>
    </svg>
  `,

  book: (color = '#8B4513') => `
    <svg viewBox="0 0 100 100">
      <rect x="20" y="15" width="60" height="70" rx="3" fill="${color}" opacity="0.9"/>
      <rect x="25" y="15" width="50" height="70" fill="#F5F5DC"/>
      <line x1="50" y1="15" x2="50" y2="85" stroke="${color}" stroke-width="2" opacity="0.3"/>
      <rect x="30" y="25" width="15" height="3" fill="${color}" opacity="0.4"/>
      <rect x="30" y="32" width="35" height="2" fill="${color}" opacity="0.3"/>
      <rect x="30" y="38" width="35" height="2" fill="${color}" opacity="0.3"/>
      <rect x="30" y="44" width="25" height="2" fill="${color}" opacity="0.3"/>
    </svg>
  `,

  candle: (color = '#FFF8DC') => `
    <svg viewBox="0 0 100 100">
      <ellipse cx="50" cy="85" rx="20" ry="5" fill="#DDD" opacity="0.5"/>
      <rect x="35" y="40" width="30" height="45" rx="2" fill="${color}"/>
      <ellipse cx="50" cy="40" rx="15" ry="4" fill="${color}"/>
      <rect x="48" y="25" width="4" height="18" fill="#333"/>
      <ellipse cx="50" cy="20" rx="8" ry="12" fill="#FF6B35" opacity="0.9"/>
      <ellipse cx="50" cy="18" rx="4" ry="8" fill="#FFD700"/>
      <ellipse cx="50" cy="16" rx="2" ry="4" fill="#FFF"/>
    </svg>
  `,

  plant: (color = '#228B22') => `
    <svg viewBox="0 0 100 100">
      <ellipse cx="50" cy="88" rx="25" ry="8" fill="#8B4513" opacity="0.3"/>
      <path d="M35 90 L35 70 Q35 60 45 60 L55 60 Q65 60 65 70 L65 90 Z" fill="#D2691E"/>
      <path d="M50 60 Q50 40 35 30 Q50 35 50 60" fill="${color}"/>
      <path d="M50 60 Q50 35 65 25 Q50 30 50 60" fill="${color}"/>
      <path d="M50 55 Q45 45 30 45 Q45 50 50 55" fill="${color}" opacity="0.8"/>
      <path d="M50 55 Q55 45 70 45 Q55 50 50 55" fill="${color}" opacity="0.8"/>
      <path d="M50 50 Q50 35 40 20 Q50 30 50 50" fill="${color}" opacity="0.9"/>
    </svg>
  `,

  camera: (color = '#333') => `
    <svg viewBox="0 0 100 100">
      <rect x="15" y="30" width="70" height="50" rx="5" fill="${color}"/>
      <rect x="35" y="20" width="30" height="15" rx="2" fill="${color}"/>
      <circle cx="50" cy="55" r="18" fill="#444"/>
      <circle cx="50" cy="55" r="14" fill="#666"/>
      <circle cx="50" cy="55" r="8" fill="#4A90D9"/>
      <circle cx="46" cy="51" r="3" fill="#fff" opacity="0.5"/>
      <rect x="70" y="35" width="10" height="6" rx="1" fill="#FFD700"/>
    </svg>
  `,

  watch: (color = '#333') => `
    <svg viewBox="0 0 100 100">
      <!-- Watch bands - positioned to not overlap with watch face -->
      <rect x="42" y="5" width="16" height="18" rx="3" fill="${color}"/>
      <rect x="42" y="77" width="16" height="18" rx="3" fill="${color}"/>
      <!-- Watch case and face - properly centered -->
      <circle cx="50" cy="50" r="26" fill="${color}"/>
      <circle cx="50" cy="50" r="22" fill="#F5F5F5"/>
      <!-- Watch hands -->
      <line x1="50" y1="50" x2="50" y2="34" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="50" y1="50" x2="60" y2="50" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Center dot -->
      <circle cx="50" cy="50" r="2.5" fill="${color}"/>
    </svg>
  `,

  sneaker: (color = '#FF69B4') => `
    <svg viewBox="0 0 100 100">
      <path d="M10 60 Q10 50 25 50 L70 50 Q90 50 90 60 L90 70 Q90 75 85 75 L15 75 Q10 75 10 70 Z"
            fill="${color}"/>
      <path d="M15 50 L15 45 Q15 35 30 35 L50 35 L50 50" fill="${color}" opacity="0.9"/>
      <ellipse cx="85" cy="72" rx="8" ry="5" fill="#fff"/>
      <line x1="25" y1="38" x2="45" y2="38" stroke="#fff" stroke-width="2"/>
      <line x1="25" y1="42" x2="45" y2="42" stroke="#fff" stroke-width="2"/>
      <line x1="25" y1="46" x2="45" y2="46" stroke="#fff" stroke-width="2"/>
    </svg>
  `,

  briefcase: (color = '#8B4513') => `
    <svg viewBox="0 0 100 100">
      <rect x="10" y="35" width="80" height="50" rx="5" fill="${color}"/>
      <rect x="35" y="25" width="30" height="15" rx="2" fill="${color}" opacity="0.8"/>
      <rect x="40" y="25" width="20" height="10" fill="none" stroke="#333" stroke-width="2"/>
      <rect x="45" y="55" width="10" height="15" rx="2" fill="#FFD700"/>
      <line x1="10" y1="50" x2="90" y2="50" stroke="#333" stroke-width="1" opacity="0.3"/>
    </svg>
  `,

  compass: (color = '#B8860B') => `
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="${color}" opacity="0.2"/>
      <circle cx="50" cy="50" r="35" fill="#F5F5DC"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="${color}" stroke-width="2"/>
      <polygon points="50,20 45,50 50,55 55,50" fill="#E63946"/>
      <polygon points="50,80 45,50 50,45 55,50" fill="#333"/>
      <circle cx="50" cy="50" r="5" fill="${color}"/>
      <text x="50" y="18" text-anchor="middle" font-size="8" fill="${color}">N</text>
      <text x="50" y="88" text-anchor="middle" font-size="8" fill="${color}">S</text>
      <text x="15" y="53" text-anchor="middle" font-size="8" fill="${color}">W</text>
      <text x="85" y="53" text-anchor="middle" font-size="8" fill="${color}">E</text>
    </svg>
  `,

  sunglasses: (color = '#333') => `
    <svg viewBox="0 0 100 100">
      <ellipse cx="30" cy="50" rx="20" ry="15" fill="${color}"/>
      <ellipse cx="70" cy="50" rx="20" ry="15" fill="${color}"/>
      <path d="M50 50 Q50 45 45 45 L55 45 Q50 45 50 50" stroke="${color}" fill="none" stroke-width="3"/>
      <line x1="10" y1="45" x2="5" y2="40" stroke="${color}" stroke-width="3"/>
      <line x1="90" y1="45" x2="95" y2="40" stroke="${color}" stroke-width="3"/>
      <ellipse cx="25" cy="48" rx="5" ry="3" fill="#fff" opacity="0.2"/>
      <ellipse cx="65" cy="48" rx="5" ry="3" fill="#fff" opacity="0.2"/>
    </svg>
  `,

  laptop: (color = '#333') => `
    <svg viewBox="0 0 100 100">
      <rect x="15" y="20" width="70" height="45" rx="3" fill="${color}"/>
      <rect x="20" y="25" width="60" height="35" fill="#4A90D9" opacity="0.3"/>
      <path d="M5 65 L15 65 L15 68 L85 68 L85 65 L95 65 L95 75 Q95 78 92 78 L8 78 Q5 78 5 75 Z" fill="${color}"/>
      <ellipse cx="50" cy="72" rx="15" ry="3" fill="#555"/>
    </svg>
  `,

  necklace: (color = '#FFD700') => `
    <svg viewBox="0 0 100 100">
      <path d="M20 30 Q50 70 80 30" stroke="${color}" fill="none" stroke-width="2"/>
      <circle cx="50" cy="60" r="8" fill="${color}"/>
      <circle cx="50" cy="60" r="5" fill="#E6BE8A"/>
      <circle cx="35" cy="52" r="3" fill="${color}" opacity="0.7"/>
      <circle cx="65" cy="52" r="3" fill="${color}" opacity="0.7"/>
    </svg>
  `,

  strawberry: (color = '#DC143C') => `
    <svg viewBox="0 0 100 100">
      <path d="M50 20 Q30 25 25 50 Q25 80 50 90 Q75 80 75 50 Q70 25 50 20Z" fill="${color}"/>
      <ellipse cx="40" cy="15" rx="8" ry="5" fill="#228B22"/>
      <ellipse cx="60" cy="15" rx="8" ry="5" fill="#228B22"/>
      <ellipse cx="50" cy="12" rx="6" ry="4" fill="#228B22"/>
      <circle cx="40" cy="40" r="2" fill="#FFD700"/>
      <circle cx="55" cy="35" r="2" fill="#FFD700"/>
      <circle cx="45" cy="55" r="2" fill="#FFD700"/>
      <circle cx="60" cy="50" r="2" fill="#FFD700"/>
      <circle cx="50" cy="70" r="2" fill="#FFD700"/>
      <circle cx="38" cy="65" r="2" fill="#FFD700"/>
      <circle cx="62" cy="65" r="2" fill="#FFD700"/>
    </svg>
  `,

  fairyLights: (color = '#FFD700') => `
    <svg viewBox="0 0 100 100">
      <path d="M5 30 Q25 50 45 30 Q65 10 85 30 Q95 40 95 50" stroke="#333" fill="none" stroke-width="1"/>
      <circle cx="15" cy="38" r="6" fill="${color}" opacity="0.9"/>
      <circle cx="35" cy="28" r="6" fill="#FF69B4" opacity="0.9"/>
      <circle cx="55" cy="22" r="6" fill="${color}" opacity="0.9"/>
      <circle cx="75" cy="28" r="6" fill="#87CEEB" opacity="0.9"/>
      <circle cx="90" cy="42" r="6" fill="#FF69B4" opacity="0.9"/>
      <circle cx="15" cy="38" r="3" fill="#fff" opacity="0.5"/>
      <circle cx="35" cy="28" r="3" fill="#fff" opacity="0.5"/>
      <circle cx="55" cy="22" r="3" fill="#fff" opacity="0.5"/>
      <circle cx="75" cy="28" r="3" fill="#fff" opacity="0.5"/>
      <circle cx="90" cy="42" r="3" fill="#fff" opacity="0.5"/>
    </svg>
  `,
};

/**
 * Decorative elements for collage texture
 */
const DECORATIVE = {
  polaroidFrame: (width, height, rotation = 0) => `
    <g transform="rotate(${rotation} ${width/2} ${height/2})">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"
            filter="drop-shadow(3px 3px 5px rgba(0,0,0,0.2))"/>
      <rect x="8" y="8" width="${width-16}" height="${height-40}" fill="#f0f0f0"/>
    </g>
  `,

  washiTape: (width, color = '#FFB6C1', rotation = 0) => `
    <g transform="rotate(${rotation})">
      <rect width="${width}" height="20" fill="${color}" opacity="0.7"/>
      <line x1="0" y1="5" x2="${width}" y2="5" stroke="#fff" stroke-width="1" opacity="0.3"/>
      <line x1="0" y1="15" x2="${width}" y2="15" stroke="#fff" stroke-width="1" opacity="0.3"/>
    </g>
  `,

  tornPaper: (width, height, color = '#FFF8DC') => `
    <path d="M0 5 Q10 0 20 8 Q30 3 40 7 Q50 2 60 6 Q70 1 80 5 Q90 0 ${width} 4
             L${width} ${height-5} Q${width-10} ${height} ${width-20} ${height-6}
             Q${width-30} ${height-2} ${width-40} ${height-7} Q${width-50} ${height-3} ${width-60} ${height-5}
             Q${width-70} ${height} ${width-80} ${height-4} L0 ${height-3} Z"
          fill="${color}" filter="drop-shadow(2px 2px 3px rgba(0,0,0,0.1))"/>
  `,

  bokehCircle: (r, color, opacity = 0.3) => `
    <circle r="${r}" fill="${color}" opacity="${opacity}">
      <animate attributeName="opacity" values="${opacity};${opacity*0.5};${opacity}" dur="3s" repeatCount="indefinite"/>
    </circle>
  `,
};

/**
 * Color palettes for different aesthetics
 */
const PALETTES = {
  'feminine-glowup': {
    background: ['#FFF5F5', '#FFF0F5', '#FFFAF0'],
    accent: ['#FFB6C1', '#DDA0DD', '#FFD700', '#FFC0CB', '#E6E6FA'],
    symbols: ['#E91E63', '#FF69B4', '#DDA0DD', '#FFB6C1', '#FFC0CB'],
    text: '#4A4A4A',
    banner: 'rgba(45, 35, 40, 0.8)'
  },
  'masculine-editorial': {
    background: ['#2C3E50', '#34495E', '#1A252F'],
    accent: ['#D4A574', '#B8860B', '#708090', '#2F4F4F', '#C0C0C0'],
    symbols: ['#333', '#8B4513', '#B8860B', '#2F4F4F', '#4A4A4A'],
    text: '#F5F5F5',
    banner: 'rgba(25, 30, 35, 0.85)'
  },
  'neutral-minimal': {
    background: ['#FAF9F6', '#F5F5DC', '#FFF8DC'],
    accent: ['#D2B48C', '#DEB887', '#C4A484', '#E8DCC4', '#F5DEB3'],
    symbols: ['#8B7355', '#A0522D', '#D2691E', '#BC8F8F', '#C4A484'],
    text: '#5D5D5D',
    banner: 'rgba(60, 55, 50, 0.75)'
  },
  'earthy-grounded': {
    background: ['#F5F5DC', '#FAF0E6', '#FAEBD7'],
    accent: ['#228B22', '#8B4513', '#CD853F', '#6B8E23', '#D2691E'],
    symbols: ['#228B22', '#8B4513', '#556B2F', '#A0522D', '#6B8E23'],
    text: '#3D3D3D',
    banner: 'rgba(50, 45, 35, 0.75)'
  }
};

/**
 * Generate a complete vision board SVG
 */
function generateVisionBoardSVG(workbookData) {
  const {
    aesthetic = 'feminine-glowup',
    symbols = [],
    boardTitle = 'MY 2025 VISION',
    colors = null
  } = workbookData;

  const palette = PALETTES[aesthetic] || PALETTES['feminine-glowup'];

  // Create gradient background
  const bgGradient = `
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${palette.background[0]}"/>
        <stop offset="50%" style="stop-color:${palette.background[1]}"/>
        <stop offset="100%" style="stop-color:${palette.background[2]}"/>
      </linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;

  // Generate symbol placements
  const symbolElements = generateSymbolPlacements(symbols, palette, aesthetic);

  // Generate decorative elements (bokeh, torn paper, etc.)
  const decorativeElements = generateDecorativeElements(palette, aesthetic);

  // Generate title banner
  const bannerHeight = Math.round(CANVAS_HEIGHT * 0.08);
  const fontSize = Math.round(bannerHeight * 0.5);
  const banner = `
    <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${bannerHeight}" fill="${palette.banner}"/>
    <text x="${CANVAS_WIDTH/2}" y="${bannerHeight * 0.65}"
          text-anchor="middle"
          font-family="Georgia, serif"
          font-size="${fontSize}px"
          font-weight="400"
          letter-spacing="0.15em"
          fill="white">${escapeXml(boardTitle.toUpperCase())}</text>
  `;

  // Assemble final SVG
  const svg = `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${bgGradient}
      <rect width="100%" height="100%" fill="url(#bgGradient)"/>
      ${decorativeElements}
      ${symbolElements}
      ${banner}
    </svg>
  `;

  return svg;
}

/**
 * Place symbols in a visually pleasing collage layout
 */
function generateSymbolPlacements(symbolNames, palette, aesthetic) {
  const elements = [];
  const symbolKeys = Object.keys(SYMBOLS);

  // Map requested symbols to available icons
  const mappedSymbols = mapSymbolsToIcons(symbolNames);

  // Create grid positions with some randomness
  const cols = 4;
  const rows = 6;
  const cellWidth = CANVAS_WIDTH / cols;
  const cellHeight = (CANVAS_HEIGHT - 150) / rows; // Leave room for banner
  const startY = 150; // Below banner

  let index = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (index >= mappedSymbols.length && index >= 12) break;

      const symbolKey = mappedSymbols[index % mappedSymbols.length] ||
                        symbolKeys[index % symbolKeys.length];

      const symbolFn = SYMBOLS[symbolKey];
      if (!symbolFn) continue;

      // Position with slight randomness
      const baseX = col * cellWidth + cellWidth * 0.1;
      const baseY = startY + row * cellHeight + cellHeight * 0.1;
      const offsetX = (Math.random() - 0.5) * cellWidth * 0.3;
      const offsetY = (Math.random() - 0.5) * cellHeight * 0.3;
      const x = Math.max(10, Math.min(CANVAS_WIDTH - 110, baseX + offsetX));
      const y = Math.max(startY + 10, Math.min(CANVAS_HEIGHT - 110, baseY + offsetY));

      // Random size variation
      const size = 80 + Math.random() * 40;

      // Random rotation for organic feel
      const rotation = (Math.random() - 0.5) * 20;

      // Pick color from palette
      const color = palette.symbols[index % palette.symbols.length];

      // Add polaroid frame for some elements
      const hasPolaroid = Math.random() > 0.6;

      if (hasPolaroid) {
        const frameWidth = size + 20;
        const frameHeight = size + 35;
        elements.push(`
          <g transform="translate(${x - 10}, ${y - 10}) rotate(${rotation} ${frameWidth/2} ${frameHeight/2})">
            <rect width="${frameWidth}" height="${frameHeight}" fill="#fff" rx="2"
                  filter="drop-shadow(2px 3px 5px rgba(0,0,0,0.15))"/>
            <g transform="translate(10, 10)">
              ${symbolFn(color)}
            </g>
          </g>
        `);
      } else {
        elements.push(`
          <g transform="translate(${x}, ${y}) rotate(${rotation} ${size/2} ${size/2})">
            <g transform="scale(${size/100})">
              ${symbolFn(color)}
            </g>
          </g>
        `);
      }

      index++;
    }
  }

  return elements.join('\n');
}

/**
 * Map natural language symbol names to icon keys
 */
function mapSymbolsToIcons(symbolNames) {
  const mapping = {
    'coffee': 'coffee',
    'iced coffee': 'coffee',
    'latte': 'coffee',
    'heart': 'heart',
    'love': 'heart',
    'star': 'star',
    'flower': 'flower',
    'peonies': 'flower',
    'roses': 'flower',
    'plane': 'plane',
    'airplane': 'plane',
    'travel': 'plane',
    'book': 'book',
    'journal': 'book',
    'planner': 'book',
    'candle': 'candle',
    'plant': 'plant',
    'succulent': 'plant',
    'camera': 'camera',
    'watch': 'watch',
    'sneaker': 'sneaker',
    'shoes': 'sneaker',
    'briefcase': 'briefcase',
    'compass': 'compass',
    'sunglasses': 'sunglasses',
    'laptop': 'laptop',
    'necklace': 'necklace',
    'jewelry': 'necklace',
    'strawberry': 'strawberry',
    'fruit': 'strawberry',
    'lights': 'fairyLights',
    'fairy lights': 'fairyLights',
  };

  const mapped = [];

  for (const name of symbolNames) {
    const lower = name.toLowerCase();
    let found = false;

    for (const [keyword, iconKey] of Object.entries(mapping)) {
      if (lower.includes(keyword)) {
        if (!mapped.includes(iconKey)) {
          mapped.push(iconKey);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      // Default to a random icon
      const keys = Object.keys(SYMBOLS);
      const randomKey = keys[mapped.length % keys.length];
      if (!mapped.includes(randomKey)) {
        mapped.push(randomKey);
      }
    }
  }

  return mapped;
}

/**
 * Generate decorative background elements
 */
function generateDecorativeElements(palette, aesthetic) {
  const elements = [];

  // Add bokeh circles for dreamy effect
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * CANVAS_WIDTH;
    const y = Math.random() * CANVAS_HEIGHT;
    const r = 20 + Math.random() * 60;
    const color = palette.accent[i % palette.accent.length];
    const opacity = 0.1 + Math.random() * 0.2;

    elements.push(`
      <circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>
    `);
  }

  // Add some washi tape strips
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * CANVAS_WIDTH;
    const y = 200 + Math.random() * (CANVAS_HEIGHT - 400);
    const rotation = -30 + Math.random() * 60;
    const width = 60 + Math.random() * 100;
    const color = palette.accent[i % palette.accent.length];

    elements.push(`
      <g transform="translate(${x}, ${y}) rotate(${rotation})">
        <rect width="${width}" height="25" fill="${color}" opacity="0.5" rx="1"/>
      </g>
    `);
  }

  return elements.join('\n');
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Main export function - generates vision board and saves to file
 */
async function generateSVGVisionBoard(workbookData) {
  const timestamp = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log('SVG VISION BOARD GENERATOR');
  console.log('='.repeat(60));
  console.log('Aesthetic:', workbookData.aesthetic);
  console.log('Title:', workbookData.boardTitle);
  console.log('Symbols:', workbookData.symbols?.length || 0);

  // Generate SVG
  const svg = generateVisionBoardSVG(workbookData);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Convert SVG to PNG using Sharp
  const filename = `svg-visionboard-${timestamp}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(filepath);

  console.log('\n' + '='.repeat(60));
  console.log('SUCCESS!');
  console.log('='.repeat(60));
  console.log('Output:', filepath);

  return {
    success: true,
    filepath,
    timestamp
  };
}

module.exports = {
  generateSVGVisionBoard,
  generateVisionBoardSVG,
  SYMBOLS,
  PALETTES
};
