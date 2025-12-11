/**
 * ULTRA PREMIUM Listing Images for Etsy
 *
 * Designed for maximum Etsy appeal with:
 * - Cute decorative elements (stars, hearts, sparkles, botanicals)
 * - Warm, inviting color palettes
 * - Lifestyle/emotional visual appeal
 * - Rich textures and depth
 * - Pinterest-worthy aesthetics
 *
 * Usage:
 *   npm run listing:images:ultra
 */

import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const BASE_DIR = path.join(__dirname, '..', 'listing_packets');

type ProductType = 'vision_board' | 'planner' | 'flash_cards';

// ============================================================
// ULTRA PREMIUM COLOR SCHEMES - Warm, Etsy-friendly palettes
// ============================================================

const COLORS = {
  vision_board: {
    // Dreamy lavender + rose gold + sage
    primary: '#C4A7C7',           // Dusty lavender
    primarySoft: '#E8D5EA',       // Soft lavender
    secondary: '#A8C5A8',         // Sage green
    secondarySoft: '#D4E5D4',     // Light sage
    accent: '#E8B4A0',            // Rose gold/peach
    accentSoft: '#F5DDD3',        // Light peach
    gold: '#D4AF37',              // True gold
    goldSoft: '#F5E6C8',          // Cream gold
    bg: '#FDF9F7',                // Warm cream
    bgAlt: '#F8F4F2',             // Slightly darker cream
    text: '#4A4145',              // Soft charcoal
    textMuted: '#8B8087',         // Muted mauve
    white: '#FFFFFF',
    shadow: 'rgba(74,65,69,0.12)'
  },
  planner: {
    // Calming teal + warm sand + terracotta
    primary: '#7BA3A8',           // Sage teal
    primarySoft: '#C5DADC',       // Light teal
    secondary: '#C9B896',         // Warm sand
    secondarySoft: '#EBE3D5',     // Light sand
    accent: '#C4917B',            // Terracotta
    accentSoft: '#EBCFC3',        // Light terracotta
    gold: '#B8956E',              // Bronze
    goldSoft: '#E8DBC8',          // Light bronze
    bg: '#FAF8F5',                // Warm white
    bgAlt: '#F3EFE9',             // Cream
    text: '#3D4342',              // Deep teal-gray
    textMuted: '#7A8382',         // Muted gray
    white: '#FFFFFF',
    shadow: 'rgba(61,67,66,0.10)'
  },
  flash_cards: {
    // Playful but sophisticated: ocean + sunshine + coral
    primary: '#6BA3B5',           // Ocean blue
    primarySoft: '#C2DCE4',       // Light ocean
    secondary: '#E8C55A',         // Sunshine yellow
    secondarySoft: '#F9EEC4',     // Light sunshine
    accent: '#E8907A',            // Coral
    accentSoft: '#F9D4CB',        // Light coral
    mint: '#8FC1B5',              // Mint green
    mintSoft: '#D1E8E2',          // Light mint
    bg: '#FAFCFD',                // Cool cream
    bgAlt: '#F0F5F7',             // Light blue-gray
    text: '#3A4A52',              // Deep blue-gray
    textMuted: '#7A8A92',         // Muted blue-gray
    white: '#FFFFFF',
    shadow: 'rgba(58,74,82,0.10)'
  }
};

// ============================================================
// CONTENT
// ============================================================

const CONTENT = {
  vision_board: {
    hero: {
      title: 'Custom Vision Board For Your Next Chapter',
      subtitle: 'Created from your story — not a generic template.'
    },
    benefit: {
      heading: "Why This Isn't Just a Pretty Collage",
      bullets: [
        'Clarify what you actually want for this season of life',
        'Turn vague hopes into a visual, daily reminder',
        'Feel excited and grounded instead of overwhelmed',
        'Designed from your own words and goals'
      ]
    },
    process: {
      heading: 'How It Works',
      steps: [
        'Purchase on Etsy',
        'Answer a short Thought Organizer (guided questions online)',
        'Receive your custom vision board as a high-res digital download'
      ],
      subtext: 'Everything is done for you. No design tools needed.'
    },
    sample: {
      overlayText: 'Example layout — your board will be designed from your responses.'
    },
    reviews: {
      heading: 'What This Experience Is Designed To Create',
      reactions: [
        'This actually feels like me.',
        'I finally see my year in one place.',
        "It's not generic — it's my real life, visualized."
      ],
      subtext: 'The Thought Organizer is built to help you feel seen, not pressured.'
    }
  },
  planner: {
    hero: {
      title: 'Guided Clarity Experience + Personalized PDF',
      subtitle: 'Not a blank planner. A reflection written from your own words.'
    },
    benefit: {
      heading: 'What This Experience Helps With',
      bullets: [
        "Make sense of what you've been carrying this year",
        'See your situation more clearly, in writing',
        'Receive prompts tailored to your actual story',
        'End with next steps that feel realistic — not overwhelming'
      ]
    },
    process: {
      heading: 'How It Works',
      steps: [
        'Purchase on Etsy',
        'Answer a guided Thought Organizer about your situation',
        'Receive a personalized PDF that reflects your story and offers gentle structure'
      ],
      subtext: 'Each PDF is generated from your responses — no two are the same.'
    },
    sample: {
      overlayText: 'Example pages — your content will be personalized based on your responses.'
    },
    reviews: {
      heading: 'Made For Real Life, Not Perfection',
      reactions: [
        "You don't have to have it all figured out before you start.",
        "You're not judged — just gently guided.",
        'This is for people in the middle of it, not on the other side.'
      ],
      subtext: ''
    }
  },
  flash_cards: {
    hero: {
      title: 'Custom Flash Cards For Your Child',
      subtitle: 'Tell us where they struggle — we create cards for those exact gaps.'
    },
    benefit: {
      heading: 'Why These Cards Are Different',
      bullets: [
        "Built from your child's grade level, struggles, and interests",
        'Math, reading, vocabulary, phonics, and more',
        'Option to theme around what they love (dinosaurs, princesses, space, sports...)',
        'Designed to build confidence, not shame'
      ]
    },
    process: {
      heading: 'How It Works',
      steps: [
        'Purchase on Etsy',
        "Use the Thought Organizer to describe your child's needs",
        'Receive printable PDF flash cards tailored to their exact gaps'
      ],
      subtext: 'You can print, cut, and use them again and again.'
    },
    sample: {
      overlayText: "Example layout — content will match your child's needs."
    },
    reviews: {
      heading: 'Designed So Parents Can Say...',
      reactions: [
        'These finally match how my kid actually learns.',
        "We're practicing the exact things they keep missing.",
        'Learning feels less like a fight and more like a game.'
      ],
      subtext: ''
    }
  }
};

// ============================================================
// DECORATIVE SVG ELEMENTS - Cute Etsy aesthetic
// ============================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Sparkle/star decoration
function sparkle(x: number, y: number, size: number, color: string, opacity: number = 0.6): string {
  const s = size;
  return `
    <g transform="translate(${x}, ${y})" opacity="${opacity}">
      <path d="M0,${-s} Q${s*0.15},${-s*0.15} ${s},0 Q${s*0.15},${s*0.15} 0,${s} Q${-s*0.15},${s*0.15} ${-s},0 Q${-s*0.15},${-s*0.15} 0,${-s}" fill="${color}"/>
    </g>
  `;
}

// Small star
function star(x: number, y: number, size: number, color: string, opacity: number = 0.5): string {
  const points = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * Math.PI / 180;
    const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
    points.push(`${x + size * Math.cos(outerAngle)},${y + size * Math.sin(outerAngle)}`);
    points.push(`${x + size * 0.4 * Math.cos(innerAngle)},${y + size * 0.4 * Math.sin(innerAngle)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="${color}" opacity="${opacity}"/>`;
}

// Heart shape
function heart(x: number, y: number, size: number, color: string, opacity: number = 0.4): string {
  const s = size;
  return `
    <path transform="translate(${x - s}, ${y - s * 0.8})"
          d="M${s},${s*0.3} C${s},${s*0.15} ${s*0.75},0 ${s*0.5},0 C${s*0.25},0 0,${s*0.25} 0,${s*0.5} C0,${s} ${s},${s*1.5} ${s},${s*1.8} C${s},${s*1.5} ${s*2},${s} ${s*2},${s*0.5} C${s*2},${s*0.25} ${s*1.75},0 ${s*1.5},0 C${s*1.25},0 ${s},${s*0.15} ${s},${s*0.3}Z"
          fill="${color}" opacity="${opacity}"/>
  `;
}

// Leaf/botanical element
function leaf(x: number, y: number, size: number, rotation: number, color: string, opacity: number = 0.3): string {
  return `
    <g transform="translate(${x}, ${y}) rotate(${rotation})">
      <path d="M0,0 Q${size*0.4},${-size*0.3} ${size},0 Q${size*0.4},${size*0.3} 0,0"
            fill="${color}" opacity="${opacity}"/>
      <line x1="0" y1="0" x2="${size*0.9}" y2="0" stroke="${color}" stroke-width="1" opacity="${opacity * 0.7}"/>
    </g>
  `;
}

// Eucalyptus branch
function eucalyptusBranch(x: number, y: number, scale: number, color: string, opacity: number = 0.25): string {
  const leaves = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i % 2 === 0 ? -40 : 40);
    const yOffset = i * 25 * scale;
    leaves.push(leaf(0, yOffset, 20 * scale, angle, color, opacity));
  }
  return `<g transform="translate(${x}, ${y})">${leaves.join('')}</g>`;
}

// Dot pattern for texture
function dotPattern(id: string, color: string, size: number = 4, spacing: number = 30): string {
  return `
    <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
      <circle cx="${spacing/2}" cy="${spacing/2}" r="${size}" fill="${color}" opacity="0.03"/>
    </pattern>
  `;
}

// Scatter sparkles across an area
function scatterSparkles(count: number, xMin: number, xMax: number, yMin: number, yMax: number, colors: string[]): string {
  let result = '';
  for (let i = 0; i < count; i++) {
    const x = xMin + Math.random() * (xMax - xMin);
    const y = yMin + Math.random() * (yMax - yMin);
    const size = 8 + Math.random() * 16;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.15 + Math.random() * 0.25;
    result += sparkle(x, y, size, color, opacity);
  }
  return result;
}

// ============================================================
// GRADIENT DEFINITIONS
// ============================================================

function getGradientDefs(type: ProductType): string {
  const c = COLORS[type];
  return `
    <defs>
      <!-- Background gradients -->
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c.bg};stop-opacity:1"/>
        <stop offset="50%" style="stop-color:${c.bgAlt};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${c.bg};stop-opacity:1"/>
      </linearGradient>

      <!-- Card shadow -->
      <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="20" stdDeviation="40" flood-color="${c.shadow}" flood-opacity="0.8"/>
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="${c.shadow}" flood-opacity="0.5"/>
      </filter>

      <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="${c.shadow}" flood-opacity="0.6"/>
      </filter>

      <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${c.shadow}" flood-opacity="0.4"/>
      </filter>

      <!-- Glow effect -->
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <!-- Accent gradients -->
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${c.accent};stop-opacity:1"/>
        <stop offset="50%" style="stop-color:${c.primary};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:1"/>
      </linearGradient>

      <linearGradient id="warmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${c.primarySoft};stop-opacity:0.8"/>
        <stop offset="100%" style="stop-color:${c.accentSoft};stop-opacity:0.6"/>
      </linearGradient>

      <!-- Texture patterns -->
      ${dotPattern('dotTexture', c.primary, 3, 25)}
      ${dotPattern('dotTextureLight', c.secondary, 2, 35)}

      <!-- Noise texture for premium feel -->
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" in2="noise" mode="multiply" result="blend"/>
        <feComposite in="blend" in2="SourceGraphic" operator="in"/>
      </filter>
    </defs>
  `;
}

// ============================================================
// HERO IMAGE - Ultra Premium
// ============================================================

async function generateHeroImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  const titleLines = wrapText(content.hero.title, 24);
  const titleY = 1300;
  const lineHeight = 95;

  // Product-specific premium preview
  let productPreview = '';
  let decorations = '';

  if (type === 'vision_board') {
    // Beautiful vision board mockup with actual image placeholders
    productPreview = `
      <g transform="translate(250, 120)">
        <!-- Main board with elegant frame -->
        <rect x="0" y="0" width="1500" height="950" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="8" y="8" width="1484" height="934" rx="20" fill="none" stroke="${c.gold}" stroke-width="2" opacity="0.4"/>

        <!-- Title ribbon -->
        <rect x="500" y="-25" width="500" height="70" rx="8" fill="${c.primary}" filter="url(#subtleShadow)"/>
        <text x="750" y="20" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="600" fill="${c.white}">MY 2025 VISION</text>

        <!-- Photo collage grid - lifestyle feel -->
        <g transform="translate(40, 60)">
          <!-- Top row -->
          <rect x="0" y="0" width="340" height="260" rx="16" fill="${c.primarySoft}"/>
          <rect x="360" y="0" width="380" height="260" rx="16" fill="${c.secondarySoft}"/>
          <rect x="760" y="0" width="340" height="160" rx="16" fill="${c.accentSoft}"/>
          <rect x="760" y="180" width="340" height="80" rx="12" fill="${c.goldSoft}"/>
          <text x="930" y="230" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="${c.text}" font-style="italic">"Dream big"</text>
          <rect x="1120" y="0" width="280" height="260" rx="16" fill="${c.primarySoft}" opacity="0.7"/>

          <!-- Middle row -->
          <rect x="0" y="280" width="500" height="340" rx="16" fill="${c.secondarySoft}"/>
          <rect x="520" y="280" width="400" height="340" rx="16" fill="${c.accentSoft}"/>
          <rect x="940" y="280" width="460" height="200" rx="16" fill="${c.primarySoft}"/>
          <rect x="940" y="500" width="220" height="120" rx="12" fill="${c.goldSoft}"/>
          <rect x="1180" y="500" width="220" height="120" rx="12" fill="${c.secondarySoft}"/>

          <!-- Bottom row with inspirational quotes -->
          <rect x="0" y="640" width="280" height="180" rx="16" fill="${c.accentSoft}"/>
          <rect x="300" y="640" width="380" height="180" rx="16" fill="${c.goldSoft}"/>
          <text x="490" y="745" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${c.text}" font-style="italic">"Make it happen"</text>
          <rect x="700" y="640" width="300" height="180" rx="16" fill="${c.primarySoft}"/>
          <rect x="1020" y="640" width="380" height="180" rx="16" fill="${c.secondarySoft}"/>
        </g>

        <!-- Category labels at bottom -->
        <text x="750" y="900" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${c.textMuted}" letter-spacing="4">HEALTH • CAREER • RELATIONSHIPS • GROWTH • JOY</text>
      </g>
    `;

    // Decorative elements for vision board
    decorations = `
      ${eucalyptusBranch(80, 200, 1.5, c.secondary, 0.2)}
      ${eucalyptusBranch(1850, 300, 1.3, c.secondary, 0.18)}
      ${scatterSparkles(8, 100, 400, 100, 400, [c.gold, c.accent, c.primary])}
      ${scatterSparkles(8, 1600, 1900, 100, 500, [c.gold, c.accent, c.primary])}
      ${heart(120, 1750, 35, c.accent, 0.2)}
      ${heart(1880, 1680, 30, c.accent, 0.18)}
      ${star(200, 1850, 20, c.gold, 0.3)}
      ${star(1800, 1800, 25, c.gold, 0.25)}
    `;
  } else if (type === 'planner') {
    // Elegant planner spread
    productPreview = `
      <g transform="translate(200, 120)">
        <!-- Left page -->
        <rect x="0" y="0" width="720" height="920" rx="16" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="20" y="20" width="680" height="80" rx="12" fill="${c.primarySoft}"/>
        <text x="360" y="72" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="500" fill="${c.text}">Reflection &amp; Clarity</text>

        <!-- Elegant writing lines -->
        <g transform="translate(50, 140)">
          <text x="0" y="0" font-family="Georgia, serif" font-size="18" fill="${c.textMuted}" font-style="italic">What's been on your mind lately?</text>
          ${Array.from({length: 8}, (_, i) => `
            <line x1="0" y1="${40 + i * 42}" x2="620" y2="${40 + i * 42}" stroke="${c.primary}" stroke-width="1" opacity="0.3"/>
          `).join('')}
        </g>

        <g transform="translate(50, 520)">
          <text x="0" y="0" font-family="Georgia, serif" font-size="18" fill="${c.textMuted}" font-style="italic">What clarity are you seeking?</text>
          ${Array.from({length: 6}, (_, i) => `
            <line x1="0" y1="${40 + i * 42}" x2="620" y2="${40 + i * 42}" stroke="${c.primary}" stroke-width="1" opacity="0.3"/>
          `).join('')}
        </g>

        <!-- Page decoration -->
        ${leaf(620, 850, 50, -30, c.secondary, 0.2)}
        <text x="50" y="890" font-family="Georgia, serif" font-size="16" fill="${c.textMuted}">12</text>

        <!-- Binding spine -->
        <rect x="740" y="50" width="8" height="820" rx="4" fill="${c.textMuted}" opacity="0.15"/>

        <!-- Right page -->
        <rect x="780" y="0" width="720" height="920" rx="16" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="800" y="20" width="680" height="80" rx="12" fill="${c.secondarySoft}"/>
        <text x="1140" y="72" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="500" fill="${c.text}">Your Next Steps</text>

        <!-- Checkbox items -->
        <g transform="translate(830, 140)">
          ${Array.from({length: 10}, (_, i) => `
            <g transform="translate(0, ${i * 75})">
              <rect x="0" y="0" width="30" height="30" rx="8" fill="none" stroke="${c.accent}" stroke-width="2.5"/>
              <line x1="50" y1="22" x2="600" y2="22" stroke="${c.primary}" stroke-width="1" opacity="0.25"/>
            </g>
          `).join('')}
        </g>

        <text x="1450" y="890" text-anchor="end" font-family="Georgia, serif" font-size="16" fill="${c.textMuted}">13</text>
        ${leaf(830, 850, 45, 30, c.accent, 0.2)}
      </g>
    `;

    decorations = `
      ${eucalyptusBranch(50, 150, 1.4, c.primary, 0.18)}
      ${eucalyptusBranch(1920, 250, 1.2, c.secondary, 0.15)}
      ${scatterSparkles(6, 50, 250, 900, 1200, [c.gold, c.accent])}
      ${scatterSparkles(6, 1750, 1950, 800, 1100, [c.gold, c.primary])}
      ${heart(1850, 1700, 28, c.accent, 0.18)}
      ${star(150, 1820, 18, c.gold, 0.25)}
    `;
  } else {
    // Playful flash cards
    productPreview = `
      <g transform="translate(200, 150)">
        <!-- Card 1 - Math -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="480" height="320" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
          <rect x="0" y="0" width="480" height="70" rx="24 24 0 0" fill="${c.primary}"/>
          <text x="240" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">MATH</text>
          <text x="240" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="${c.text}">5 + 3 = ?</text>
          ${star(420, 280, 18, c.secondary, 0.4)}
        </g>

        <!-- Card 2 - Reading -->
        <g transform="translate(540, 0)">
          <rect x="0" y="0" width="480" height="320" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
          <rect x="0" y="0" width="480" height="70" rx="24 24 0 0" fill="${c.secondary}"/>
          <text x="240" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.text}">READING</text>
          <text x="240" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${c.text}">because</text>
          ${heart(60, 280, 20, c.accent, 0.35)}
        </g>

        <!-- Card 3 - Phonics -->
        <g transform="translate(1080, 0)">
          <rect x="0" y="0" width="480" height="320" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
          <rect x="0" y="0" width="480" height="70" rx="24 24 0 0" fill="${c.accent}"/>
          <text x="240" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">PHONICS</text>
          <text x="240" y="215" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="${c.text}">ch-</text>
          ${sparkle(420, 280, 15, c.primary, 0.4)}
        </g>

        <!-- Row 2 -->
        <g transform="translate(270, 400)">
          <rect x="0" y="0" width="480" height="320" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
          <rect x="0" y="0" width="480" height="70" rx="24 24 0 0" fill="${c.accent}"/>
          <text x="240" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">MULTIPLY</text>
          <text x="240" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="${c.text}">6 × 7 = ?</text>
          ${star(60, 280, 16, c.secondary, 0.35)}
        </g>

        <g transform="translate(810, 400)">
          <rect x="0" y="0" width="480" height="320" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
          <rect x="0" y="0" width="480" height="70" rx="24 24 0 0" fill="${c.primary}"/>
          <text x="240" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">VOCAB</text>
          <text x="240" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="${c.text}">enormous</text>
          ${heart(420, 280, 18, c.accent, 0.35)}
        </g>
      </g>
    `;

    const fc = COLORS.flash_cards as any;
    decorations = `
      ${scatterSparkles(10, 50, 300, 100, 400, [fc.primary, fc.secondary, fc.accent, fc.mint])}
      ${scatterSparkles(10, 1700, 1950, 100, 500, [fc.primary, fc.secondary, fc.accent])}
      ${star(100, 1750, 25, fc.secondary, 0.35)}
      ${star(180, 1820, 18, fc.accent, 0.3)}
      ${star(1850, 1780, 22, fc.primary, 0.3)}
      ${heart(1900, 1850, 25, fc.accent, 0.25)}
      ${sparkle(80, 200, 20, fc.secondary, 0.3)}
      ${sparkle(1920, 300, 25, fc.accent, 0.25)}
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotTexture)"/>

    <!-- Soft decorative blobs -->
    <ellipse cx="150" cy="250" rx="350" ry="280" fill="${c.primarySoft}" opacity="0.3"/>
    <ellipse cx="1850" cy="350" rx="300" ry="350" fill="${c.secondarySoft}" opacity="0.25"/>
    <ellipse cx="200" cy="1750" rx="280" ry="220" fill="${c.accentSoft}" opacity="0.25"/>
    <ellipse cx="1800" cy="1700" rx="320" ry="280" fill="${c.primarySoft}" opacity="0.2"/>

    <!-- Decorative elements -->
    ${decorations}

    <!-- Product Preview -->
    ${productPreview}

    <!-- Title Card -->
    <rect x="180" y="1150" width="1640" height="520" rx="32" fill="${c.white}" filter="url(#cardShadow)"/>
    <rect x="180" y="1150" width="1640" height="12" rx="6 6 0 0" fill="url(#accentGradient)"/>

    <!-- Title -->
    ${titleLines.map((line, i) => `
      <text x="1000" y="${titleY + i * lineHeight}" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="600" fill="${c.text}">${escapeXml(line)}</text>
    `).join('')}

    <!-- Subtitle -->
    <text x="1000" y="${titleY + titleLines.length * lineHeight + 60}" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${c.textMuted}">${escapeXml(content.hero.subtitle)}</text>

    <!-- Decorative accent line -->
    <rect x="650" y="${titleY + titleLines.length * lineHeight + 100}" width="700" height="5" rx="2.5" fill="url(#accentGradient)"/>

    <!-- Corner sparkles on title card -->
    ${sparkle(260, 1230, 18, c.gold, 0.35)}
    ${sparkle(1740, 1230, 18, c.gold, 0.35)}
    ${sparkle(260, 1590, 15, c.accent, 0.3)}
    ${sparkle(1740, 1590, 15, c.accent, 0.3)}

    <!-- Elegant corner accents -->
    <g opacity="0.35">
      <path d="M50 50 L50 150 M50 50 L150 50" stroke="${c.primary}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M1950 50 L1950 150 M1950 50 L1850 50" stroke="${c.secondary}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M50 1950 L50 1850 M50 1950 L150 1950" stroke="${c.accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M1950 1950 L1950 1850 M1950 1950 L1850 1950" stroke="${c.primary}" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// BENEFIT IMAGE - Ultra Premium
// ============================================================

async function generateBenefitImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  let decorations = '';
  if (type === 'vision_board') {
    decorations = `
      ${eucalyptusBranch(50, 100, 1.3, c.secondary, 0.15)}
      ${eucalyptusBranch(1900, 200, 1.1, c.secondary, 0.12)}
      ${scatterSparkles(5, 1700, 1950, 100, 400, [c.gold, c.accent])}
      ${heart(1850, 1800, 30, c.accent, 0.2)}
    `;
  } else if (type === 'planner') {
    decorations = `
      ${eucalyptusBranch(30, 150, 1.2, c.primary, 0.12)}
      ${leaf(1900, 300, 60, -45, c.secondary, 0.15)}
      ${scatterSparkles(4, 1750, 1950, 150, 450, [c.gold, c.accent])}
    `;
  } else {
    decorations = `
      ${star(100, 150, 30, (COLORS.flash_cards as any).secondary, 0.3)}
      ${star(1900, 200, 25, (COLORS.flash_cards as any).accent, 0.25)}
      ${scatterSparkles(6, 50, 250, 100, 400, [(COLORS.flash_cards as any).primary, (COLORS.flash_cards as any).secondary, (COLORS.flash_cards as any).accent])}
      ${scatterSparkles(6, 1750, 1950, 100, 400, [(COLORS.flash_cards as any).primary, (COLORS.flash_cards as any).secondary])}
      ${heart(80, 1850, 28, (COLORS.flash_cards as any).accent, 0.25)}
      ${heart(1920, 1800, 25, (COLORS.flash_cards as any).accent, 0.2)}
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotTextureLight)"/>

    <!-- Soft decorative shapes -->
    <ellipse cx="100" cy="100" rx="280" ry="220" fill="${c.primarySoft}" opacity="0.35"/>
    <ellipse cx="1900" cy="1900" rx="320" ry="280" fill="${c.secondarySoft}" opacity="0.3"/>
    <ellipse cx="1850" cy="200" rx="200" ry="250" fill="${c.accentSoft}" opacity="0.25"/>

    <!-- Decorations -->
    ${decorations}

    <!-- Main Card -->
    <rect x="100" y="100" width="1800" height="1800" rx="40" fill="${c.white}" filter="url(#cardShadow)"/>

    <!-- Header with gradient accent -->
    <rect x="100" y="100" width="1800" height="220" rx="40 40 0 0" fill="url(#warmGradient)"/>
    <text x="1000" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="58" font-weight="600" fill="${c.text}">${escapeXml(content.benefit.heading)}</text>

    <!-- Decorative line under header -->
    <rect x="450" y="300" width="1100" height="4" rx="2" fill="url(#accentGradient)"/>

    <!-- Benefit Items -->
    ${content.benefit.bullets.map((bullet, i) => {
      const y = 420 + i * 340;
      const bulletLines = wrapText(bullet, 42);
      const accentColors = [c.primary, c.secondary, c.accent, type === 'flash_cards' ? (COLORS.flash_cards as any).mint : c.primary];

      return `
        <g transform="translate(180, ${y})">
          <!-- Item card -->
          <rect x="0" y="0" width="1640" height="280" rx="24" fill="${c.white}" filter="url(#softShadow)"/>

          <!-- Left accent bar -->
          <rect x="0" y="0" width="8" height="280" rx="4 0 0 4" fill="${accentColors[i]}"/>

          <!-- Number badge -->
          <circle cx="100" cy="140" r="55" fill="${c.white}" filter="url(#subtleShadow)"/>
          <circle cx="100" cy="140" r="45" fill="${accentColors[i]}" opacity="0.15"/>
          <circle cx="100" cy="140" r="38" fill="${accentColors[i]}"/>
          <text x="100" y="155" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="600" fill="${c.white}">${i + 1}</text>

          <!-- Bullet text -->
          ${bulletLines.map((line, j) => `
            <text x="200" y="${120 + j * 55}" font-family="Georgia, serif" font-size="40" fill="${c.text}">${escapeXml(line)}</text>
          `).join('')}

          <!-- Small decorative element -->
          ${i === 0 ? sparkle(1550, 50, 14, c.gold, 0.3) : ''}
          ${i === 1 ? star(1560, 55, 12, c.gold, 0.25) : ''}
          ${i === 2 ? heart(1545, 50, 15, c.accent, 0.25) : ''}
          ${i === 3 ? sparkle(1550, 50, 12, c.primary, 0.3) : ''}
        </g>
      `;
    }).join('')}

    <!-- Bottom decorative dots -->
    <g transform="translate(900, 1820)">
      <circle cx="0" cy="0" r="12" fill="${c.primary}" opacity="0.4"/>
      <circle cx="50" cy="0" r="12" fill="${c.secondary}" opacity="0.4"/>
      <circle cx="100" cy="0" r="12" fill="${c.accent}" opacity="0.4"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// PROCESS IMAGE - Ultra Premium
// ============================================================

async function generateProcessImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  let decorations = '';
  if (type === 'vision_board') {
    decorations = `
      ${eucalyptusBranch(1920, 150, 1.2, c.secondary, 0.15)}
      ${eucalyptusBranch(30, 1700, 1.0, c.secondary, 0.12)}
      ${scatterSparkles(4, 50, 250, 100, 350, [c.gold, c.accent])}
      ${heart(100, 1900, 25, c.accent, 0.2)}
    `;
  } else if (type === 'planner') {
    decorations = `
      ${leaf(1880, 180, 55, -40, c.primary, 0.15)}
      ${leaf(80, 1850, 50, 35, c.accent, 0.12)}
      ${scatterSparkles(3, 1750, 1950, 100, 350, [c.gold])}
    `;
  } else {
    decorations = `
      ${star(150, 180, 28, (COLORS.flash_cards as any).secondary, 0.3)}
      ${star(1850, 250, 22, (COLORS.flash_cards as any).accent, 0.25)}
      ${scatterSparkles(5, 50, 200, 150, 400, [(COLORS.flash_cards as any).primary, (COLORS.flash_cards as any).secondary])}
      ${scatterSparkles(5, 1800, 1950, 150, 400, [(COLORS.flash_cards as any).accent, (COLORS.flash_cards as any).mint])}
      ${heart(100, 1880, 22, (COLORS.flash_cards as any).accent, 0.2)}
    `;
  }

  const stepColors = [c.primary, c.secondary, c.accent];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotTexture)"/>

    <!-- Soft decorative shapes -->
    <ellipse cx="1900" cy="150" rx="250" ry="200" fill="${c.accentSoft}" opacity="0.3"/>
    <ellipse cx="100" cy="1850" rx="220" ry="180" fill="${c.secondarySoft}" opacity="0.3"/>

    <!-- Decorations -->
    ${decorations}

    <!-- Header -->
    <text x="1000" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="68" font-weight="600" fill="${c.text}">${escapeXml(content.process.heading)}</text>
    <rect x="550" y="230" width="900" height="5" rx="2.5" fill="url(#accentGradient)"/>

    <!-- Connecting timeline -->
    <line x1="1000" y1="380" x2="1000" y2="1480" stroke="${c.primary}" stroke-width="5" stroke-dasharray="15,10" opacity="0.25"/>

    <!-- Step Cards -->
    ${content.process.steps.map((step, i) => {
      const y = 350 + i * 420;
      const stepLines = wrapText(step, 36);
      const isLeft = i % 2 === 0;
      const cardX = isLeft ? 150 : 950;
      const badgeX = isLeft ? 880 : 920;

      return `
        <g transform="translate(0, ${y})">
          <!-- Step card -->
          <rect x="${cardX}" y="0" width="900" height="320" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>

          <!-- Top accent bar -->
          <rect x="${cardX}" y="0" width="900" height="10" rx="28 28 0 0" fill="${stepColors[i]}"/>

          <!-- Number badge with glow -->
          <circle cx="${badgeX + (isLeft ? 140 : 100)}" cy="160" r="65" fill="${c.white}" filter="url(#softShadow)"/>
          <circle cx="${badgeX + (isLeft ? 140 : 100)}" cy="160" r="52" fill="${stepColors[i]}"/>
          <text x="${badgeX + (isLeft ? 140 : 100)}" y="178" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="${c.white}">${i + 1}</text>

          <!-- Step text -->
          ${stepLines.map((line, j) => `
            <text x="${cardX + 60}" y="${130 + j * 55}" font-family="Georgia, serif" font-size="38" fill="${c.text}">${escapeXml(line)}</text>
          `).join('')}

          <!-- Decorative sparkle -->
          ${sparkle(cardX + 820, 50, 14, c.gold, 0.35)}
        </g>
      `;
    }).join('')}

    <!-- Subtext banner -->
    <rect x="200" y="1620" width="1600" height="160" rx="24" fill="${c.primarySoft}" opacity="0.5"/>
    <text x="1000" y="1718" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="${c.text}" font-style="italic">${escapeXml(content.process.subtext)}</text>

    <!-- Bottom decorative dots -->
    <g transform="translate(900, 1850)">
      <circle cx="0" cy="0" r="10" fill="${c.primary}" opacity="0.35"/>
      <circle cx="45" cy="0" r="10" fill="${c.secondary}" opacity="0.35"/>
      <circle cx="90" cy="0" r="10" fill="${c.accent}" opacity="0.35"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// SAMPLE IMAGE - Ultra Premium
// ============================================================

async function generateSampleImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  let sampleContent = '';
  let decorations = '';

  if (type === 'vision_board') {
    sampleContent = `
      <!-- Detailed Vision Board Sample -->
      <g transform="translate(100, 100)">
        <rect x="0" y="0" width="1800" height="1300" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="10" y="10" width="1780" height="1280" rx="20" fill="none" stroke="${c.gold}" stroke-width="2" opacity="0.3"/>

        <!-- Title ribbon at top -->
        <rect x="550" y="-30" width="700" height="80" rx="12" fill="${c.primary}" filter="url(#subtleShadow)"/>
        <text x="900" y="25" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="600" fill="${c.white}">2025 VISION BOARD</text>

        <!-- Photo collage - detailed -->
        <g transform="translate(40, 80)">
          <!-- Row 1 -->
          <rect x="0" y="0" width="420" height="320" rx="16" fill="${c.primarySoft}"/>
          <rect x="440" y="0" width="480" height="320" rx="16" fill="${c.secondarySoft}"/>
          <rect x="940" y="0" width="380" height="200" rx="16" fill="${c.accentSoft}"/>
          <rect x="940" y="220" width="380" height="100" rx="12" fill="${c.goldSoft}"/>
          <text x="1130" y="285" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${c.text}" font-style="italic">"Make it happen"</text>
          <rect x="1340" y="0" width="380" height="320" rx="16" fill="${c.primarySoft}" opacity="0.8"/>

          <!-- Row 2 -->
          <rect x="0" y="340" width="600" height="400" rx="16" fill="${c.secondarySoft}"/>
          <rect x="620" y="340" width="500" height="400" rx="16" fill="${c.accentSoft}"/>
          <rect x="1140" y="340" width="580" height="250" rx="16" fill="${c.primarySoft}"/>
          <rect x="1140" y="610" width="280" height="130" rx="12" fill="${c.goldSoft}"/>
          <rect x="1440" y="610" width="280" height="130" rx="12" fill="${c.secondarySoft}"/>

          <!-- Row 3 -->
          <rect x="0" y="760" width="350" height="220" rx="16" fill="${c.accentSoft}"/>
          <rect x="370" y="760" width="500" height="220" rx="16" fill="${c.goldSoft}"/>
          <text x="620" y="890" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="${c.text}" font-style="italic">"Dream big, start small"</text>
          <rect x="890" y="760" width="400" height="220" rx="16" fill="${c.primarySoft}"/>
          <rect x="1310" y="760" width="410" height="220" rx="16" fill="${c.secondarySoft}"/>

          <!-- Category labels -->
          <text x="860" y="1050" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${c.textMuted}" letter-spacing="4">HEALTH • CAREER • JOY • RELATIONSHIPS • GROWTH</text>
        </g>

        <!-- Corner decorations -->
        ${sparkle(80, 80, 16, c.gold, 0.4)}
        ${sparkle(1720, 80, 16, c.gold, 0.4)}
        ${sparkle(80, 1220, 14, c.accent, 0.35)}
        ${sparkle(1720, 1220, 14, c.accent, 0.35)}
      </g>
    `;
    decorations = `
      ${eucalyptusBranch(30, 1500, 1.0, c.secondary, 0.15)}
      ${eucalyptusBranch(1920, 1400, 0.9, c.secondary, 0.12)}
      ${heart(100, 1850, 25, c.accent, 0.2)}
      ${star(1880, 1880, 20, c.gold, 0.25)}
    `;
  } else if (type === 'planner') {
    sampleContent = `
      <!-- Detailed Planner Sample - 3 Pages -->
      <g transform="translate(50, 100)">
        <!-- Page 1: Reflection -->
        <rect x="0" y="0" width="600" height="850" rx="16" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="20" y="20" width="560" height="70" rx="12" fill="${c.primarySoft}"/>
        <text x="300" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="500" fill="${c.text}">Your Reflection</text>

        <text x="45" y="135" font-family="Georgia, serif" font-size="17" fill="${c.textMuted}" font-style="italic">What&apos;s weighing on your mind?</text>
        ${Array.from({length: 7}, (_, i) => `
          <line x1="45" y1="${170 + i * 38}" x2="555" y2="${170 + i * 38}" stroke="${c.primary}" stroke-width="1" opacity="0.28"/>
        `).join('')}

        <text x="45" y="470" font-family="Georgia, serif" font-size="17" fill="${c.textMuted}" font-style="italic">What clarity are you seeking?</text>
        ${Array.from({length: 7}, (_, i) => `
          <line x1="45" y1="${505 + i * 38}" x2="555" y2="${505 + i * 38}" stroke="${c.primary}" stroke-width="1" opacity="0.28"/>
        `).join('')}

        ${leaf(520, 780, 45, -25, c.secondary, 0.2)}
        <text x="45" y="820" font-family="Georgia, serif" font-size="15" fill="${c.textMuted}">12</text>

        <!-- Page 2: Prompts -->
        <rect x="650" y="0" width="600" height="850" rx="16" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="670" y="20" width="560" height="70" rx="12" fill="${c.secondarySoft}"/>
        <text x="950" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="500" fill="${c.text}">Guided Prompts</text>

        <g transform="translate(690, 115)">
          ${['Consider: What would you tell a friend?', 'Notice: What emotions come up?', 'Explore: What would "enough" look like?'].map((prompt, i) => `
            <rect x="0" y="${i * 230}" width="520" height="200" rx="14" fill="${c.primarySoft}" opacity="0.35"/>
            <text x="20" y="${i * 230 + 40}" font-family="Georgia, serif" font-size="18" fill="${c.text}">${escapeXml(prompt)}</text>
            ${Array.from({length: 3}, (_, j) => `
              <line x1="20" y1="${i * 230 + 80 + j * 40}" x2="500" y2="${i * 230 + 80 + j * 40}" stroke="${c.primary}" stroke-width="1" opacity="0.3"/>
            `).join('')}
          `).join('')}
        </g>

        <text x="1205" y="820" text-anchor="end" font-family="Georgia, serif" font-size="15" fill="${c.textMuted}">13</text>

        <!-- Page 3: Next Steps -->
        <rect x="1300" y="0" width="600" height="850" rx="16" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="1320" y="20" width="560" height="70" rx="12" fill="${c.accentSoft}"/>
        <text x="1600" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="500" fill="${c.text}">Your Next Steps</text>

        <text x="1345" y="135" font-family="Georgia, serif" font-size="17" fill="${c.textMuted}">Based on your reflections:</text>

        <g transform="translate(1345, 170)">
          ${Array.from({length: 9}, (_, i) => `
            <g transform="translate(0, ${i * 68})">
              <rect x="0" y="0" width="28" height="28" rx="7" fill="none" stroke="${c.accent}" stroke-width="2.5"/>
              <line x1="45" y1="22" x2="510" y2="22" stroke="${c.primary}" stroke-width="1" opacity="0.28"/>
            </g>
          `).join('')}
        </g>

        <rect x="1345" y="800" width="510" height="30" rx="6" fill="${c.accent}" opacity="0.12"/>
        <text x="1600" y="822" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="${c.textMuted}" font-style="italic">Take it one step at a time</text>
      </g>
    `;
    decorations = `
      ${leaf(30, 1050, 50, 40, c.primary, 0.15)}
      ${leaf(1920, 1000, 45, -35, c.secondary, 0.12)}
      ${sparkle(100, 1100, 14, c.gold, 0.3)}
    `;
  } else {
    const fc = COLORS.flash_cards as any;
    sampleContent = `
      <!-- Detailed Flash Cards Sample -->
      <g transform="translate(50, 100)">
        <rect x="0" y="0" width="1900" height="1250" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>

        <!-- Row 1 -->
        <g transform="translate(50, 50)">
          <rect x="0" y="0" width="560" height="360" rx="20" fill="${c.white}" stroke="${fc.primary}" stroke-width="4"/>
          <rect x="0" y="0" width="560" height="65" rx="20 20 0 0" fill="${fc.primary}"/>
          <text x="280" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">ADDITION</text>
          <text x="280" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${c.text}">8 + 4 = ?</text>
          ${star(500, 320, 16, fc.secondary, 0.4)}
        </g>

        <g transform="translate(660, 50)">
          <rect x="0" y="0" width="560" height="360" rx="20" fill="${c.white}" stroke="${fc.secondary}" stroke-width="4"/>
          <rect x="0" y="0" width="560" height="65" rx="20 20 0 0" fill="${fc.secondary}"/>
          <text x="280" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.text}">SIGHT WORD</text>
          <text x="280" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="${c.text}">because</text>
          ${heart(60, 320, 18, fc.accent, 0.35)}
        </g>

        <g transform="translate(1270, 50)">
          <rect x="0" y="0" width="560" height="360" rx="20" fill="${c.white}" stroke="${fc.accent}" stroke-width="4"/>
          <rect x="0" y="0" width="560" height="65" rx="20 20 0 0" fill="${fc.accent}"/>
          <text x="280" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">PHONICS</text>
          <text x="280" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="${c.text}">sh-</text>
          ${sparkle(500, 320, 14, fc.primary, 0.4)}
        </g>

        <!-- Row 2 -->
        <g transform="translate(50, 450)">
          <rect x="0" y="0" width="560" height="360" rx="20" fill="${c.white}" stroke="${fc.accent}" stroke-width="4"/>
          <rect x="0" y="0" width="560" height="65" rx="20 20 0 0" fill="${fc.accent}"/>
          <text x="280" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">MULTIPLICATION</text>
          <text x="280" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${c.text}">7 × 8 = ?</text>
        </g>

        <g transform="translate(660, 450)">
          <rect x="0" y="0" width="560" height="360" rx="20" fill="${c.white}" stroke="${fc.primary}" stroke-width="4"/>
          <rect x="0" y="0" width="560" height="65" rx="20 20 0 0" fill="${fc.primary}"/>
          <text x="280" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.white}">VOCABULARY</text>
          <text x="280" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="${c.text}">enormous</text>
        </g>

        <g transform="translate(1270, 450)">
          <rect x="0" y="0" width="560" height="360" rx="20" fill="${c.white}" stroke="${fc.secondary}" stroke-width="4"/>
          <rect x="0" y="0" width="560" height="65" rx="20 20 0 0" fill="${fc.secondary}"/>
          <text x="280" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${c.text}">SUBTRACTION</text>
          <text x="280" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${c.text}">15 - 7 = ?</text>
        </g>

        <!-- Cut lines -->
        <line x1="620" y1="30" x2="620" y2="830" stroke="${c.textMuted}" stroke-width="2" stroke-dasharray="12,6" opacity="0.35"/>
        <line x1="1230" y1="30" x2="1230" y2="830" stroke="${c.textMuted}" stroke-width="2" stroke-dasharray="12,6" opacity="0.35"/>
        <line x1="30" y1="430" x2="1820" y2="430" stroke="${c.textMuted}" stroke-width="2" stroke-dasharray="12,6" opacity="0.35"/>

        <!-- Instructions -->
        <rect x="50" y="870" width="1800" height="330" rx="16" fill="${fc.primarySoft}" opacity="0.35"/>
        <text x="950" y="940" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="500" fill="${c.text}">Print at home • Cut along dotted lines • Learn and play!</text>

        <g transform="translate(200, 1000)">
          <circle cx="0" cy="35" r="28" fill="${fc.primary}"/>
          <text x="0" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="white">1</text>
          <text x="55" y="48" font-family="Georgia, serif" font-size="26" fill="${c.text}">Print on cardstock</text>
        </g>

        <g transform="translate(650, 1000)">
          <circle cx="0" cy="35" r="28" fill="${fc.secondary}"/>
          <text x="0" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${c.text}">2</text>
          <text x="55" y="48" font-family="Georgia, serif" font-size="26" fill="${c.text}">Cut along lines</text>
        </g>

        <g transform="translate(1100, 1000)">
          <circle cx="0" cy="35" r="28" fill="${fc.accent}"/>
          <text x="0" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="white">3</text>
          <text x="55" y="48" font-family="Georgia, serif" font-size="26" fill="${c.text}">Practice and learn!</text>
        </g>
      </g>
    `;
    decorations = `
      ${star(80, 1450, 22, fc.secondary, 0.3)}
      ${star(1920, 1400, 20, fc.accent, 0.25)}
      ${scatterSparkles(4, 50, 200, 1400, 1600, [fc.primary, fc.secondary])}
      ${heart(1880, 1550, 22, fc.accent, 0.2)}
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotTextureLight)"/>

    <!-- Soft shapes -->
    <ellipse cx="100" cy="100" rx="200" ry="160" fill="${c.secondarySoft}" opacity="0.35"/>
    <ellipse cx="1900" cy="1900" rx="220" ry="180" fill="${c.accentSoft}" opacity="0.3"/>

    <!-- Decorations -->
    ${decorations}

    <!-- Sample Content -->
    ${sampleContent}

    <!-- Overlay Banner -->
    <rect x="100" y="1550" width="1800" height="150" rx="24" fill="${c.primary}" filter="url(#softShadow)"/>
    <rect x="100" y="1550" width="1800" height="8" rx="4 4 0 0" fill="${c.gold}" opacity="0.5"/>
    <text x="1000" y="1645" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="${c.white}">${escapeXml(content.sample.overlayText)}</text>

    <!-- Banner decorations -->
    ${sparkle(180, 1625, 16, c.white, 0.4)}
    ${sparkle(1820, 1625, 16, c.white, 0.4)}
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// REVIEWS IMAGE - Ultra Premium
// ============================================================

async function generateReviewsImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  let decorations = '';
  if (type === 'vision_board') {
    decorations = `
      ${eucalyptusBranch(50, 100, 1.2, c.secondary, 0.15)}
      ${eucalyptusBranch(1900, 200, 1.0, c.secondary, 0.12)}
      ${scatterSparkles(6, 1700, 1950, 100, 400, [c.gold, c.accent, c.primary])}
      ${heart(1880, 1750, 30, c.accent, 0.2)}
      ${heart(100, 1800, 25, c.accent, 0.18)}
    `;
  } else if (type === 'planner') {
    decorations = `
      ${leaf(80, 200, 55, 30, c.primary, 0.15)}
      ${leaf(1880, 250, 50, -35, c.secondary, 0.12)}
      ${scatterSparkles(4, 1750, 1950, 150, 400, [c.gold, c.accent])}
      ${heart(1850, 1800, 25, c.accent, 0.18)}
    `;
  } else {
    decorations = `
      ${star(120, 180, 28, (COLORS.flash_cards as any).secondary, 0.3)}
      ${star(1880, 220, 24, (COLORS.flash_cards as any).accent, 0.25)}
      ${scatterSparkles(6, 50, 250, 120, 400, [(COLORS.flash_cards as any).primary, (COLORS.flash_cards as any).secondary, (COLORS.flash_cards as any).accent])}
      ${scatterSparkles(6, 1750, 1950, 120, 400, [(COLORS.flash_cards as any).primary, (COLORS.flash_cards as any).mint])}
      ${heart(100, 1820, 26, (COLORS.flash_cards as any).accent, 0.22)}
      ${heart(1900, 1780, 24, (COLORS.flash_cards as any).accent, 0.2)}
    `;
  }

  const quoteColors = [c.primary, c.secondary, c.accent];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotTexture)"/>

    <!-- Soft decorative shapes -->
    <ellipse cx="150" cy="150" rx="280" ry="220" fill="${c.primarySoft}" opacity="0.35"/>
    <ellipse cx="1850" cy="1850" rx="300" ry="250" fill="${c.secondarySoft}" opacity="0.3"/>
    <ellipse cx="1800" cy="250" rx="200" ry="180" fill="${c.accentSoft}" opacity="0.25"/>
    <ellipse cx="150" cy="1700" rx="220" ry="200" fill="${c.accentSoft}" opacity="0.2"/>

    <!-- Decorations -->
    ${decorations}

    <!-- Header -->
    <text x="1000" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="62" font-weight="600" fill="${c.text}">${escapeXml(content.reviews.heading)}</text>
    <rect x="500" y="260" width="1000" height="5" rx="2.5" fill="url(#accentGradient)"/>

    <!-- Quote Cards -->
    ${content.reviews.reactions.map((reaction, i) => {
      const y = 400 + i * 420;
      const reactionLines = wrapText(reaction, 34);

      return `
        <g transform="translate(150, ${y})">
          <!-- Card with shadow -->
          <rect x="0" y="0" width="1700" height="340" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>

          <!-- Left accent bar -->
          <rect x="0" y="0" width="12" height="340" rx="6 0 0 6" fill="${quoteColors[i]}"/>

          <!-- Large decorative quote mark -->
          <text x="80" y="150" font-family="Georgia, serif" font-size="200" fill="${quoteColors[i]}" opacity="0.1">"</text>

          <!-- Quote text -->
          ${reactionLines.map((line, j) => `
            <text x="200" y="${150 + j * 65}" font-family="Georgia, serif" font-size="48" fill="${c.text}" font-style="italic">${escapeXml(line)}</text>
          `).join('')}

          <!-- Decorative dots -->
          <g transform="translate(1500, 170)">
            <circle cx="0" cy="0" r="10" fill="${c.primary}" opacity="0.35"/>
            <circle cx="35" cy="0" r="10" fill="${c.secondary}" opacity="0.35"/>
            <circle cx="70" cy="0" r="10" fill="${c.accent}" opacity="0.35"/>
          </g>

          <!-- Corner sparkles -->
          ${sparkle(1620, 60, 14, c.gold, 0.35)}
        </g>
      `;
    }).join('')}

    <!-- Subtext (if present) -->
    ${content.reviews.subtext ? `
      <rect x="250" y="1700" width="1500" height="130" rx="20" fill="${c.primarySoft}" opacity="0.5"/>
      <text x="1000" y="1780" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${c.text}" font-style="italic">${escapeXml(content.reviews.subtext)}</text>
    ` : ''}

    <!-- Bottom flourish -->
    <path d="M650 ${content.reviews.subtext ? '1900' : '1750'} Q1000 ${content.reviews.subtext ? '1830' : '1680'} 1350 ${content.reviews.subtext ? '1900' : '1750'}" stroke="${c.primary}" stroke-width="4" fill="none" opacity="0.3"/>

    <!-- Bottom decorative dots -->
    <g transform="translate(900, ${content.reviews.subtext ? '1950' : '1850'})">
      <circle cx="0" cy="0" r="10" fill="${c.primary}" opacity="0.35"/>
      <circle cx="45" cy="0" r="10" fill="${c.secondary}" opacity="0.35"/>
      <circle cx="90" cy="0" r="10" fill="${c.accent}" opacity="0.35"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// MAIN GENERATION
// ============================================================

async function generateAllImages(type: ProductType): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ULTRA PREMIUM IMAGE GENERATION: ${type.toUpperCase()}`);
  console.log('═'.repeat(60));

  const outputDir = path.join(BASE_DIR, type, 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const images = [
    { name: '01_hero.png', generator: generateHeroImage, desc: 'Hero showcase' },
    { name: '02_benefit.png', generator: generateBenefitImage, desc: 'Benefits' },
    { name: '03_process.png', generator: generateProcessImage, desc: 'How it works' },
    { name: '04_sample.png', generator: generateSampleImage, desc: 'Sample preview' },
    { name: '05_reviews.png', generator: generateReviewsImage, desc: 'Aspirational reactions' }
  ];

  for (const { name, generator, desc } of images) {
    process.stdout.write(`  Generating ${name} (${desc})...`);
    try {
      const buffer = await generator(type);
      const outputPath = path.join(outputDir, name);
      fs.writeFileSync(outputPath, buffer);
      const stats = fs.statSync(outputPath);
      console.log(` ✓ ${(stats.size / 1024).toFixed(0)}KB`);
    } catch (error) {
      console.log(` ✗ Error: ${(error as Error).message}`);
    }
  }

  console.log(`\n  ✓ Completed ${type} ultra premium images\n`);
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  ULTRA PREMIUM ETSY LISTING IMAGE GENERATOR');
  console.log('  Cute • Warm • Irresistible • Pinterest-worthy');
  console.log('═'.repeat(60));

  const args = process.argv.slice(2);
  let products: ProductType[] = ['vision_board', 'planner', 'flash_cards'];

  if (args.includes('vision') || args.includes('vision_board')) {
    products = ['vision_board'];
  } else if (args.includes('planner')) {
    products = ['planner'];
  } else if (args.includes('flash') || args.includes('flash_cards')) {
    products = ['flash_cards'];
  }

  console.log(`\n  Products: ${products.join(', ')}`);
  console.log(`  Resolution: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);
  console.log(`  Output: ${BASE_DIR}`);

  for (const product of products) {
    await generateAllImages(product);
  }

  console.log('═'.repeat(60));
  console.log('  GENERATION COMPLETE!');
  console.log('═'.repeat(60));
  console.log('\n  Features included:');
  console.log('  • Cute decorative elements (sparkles, hearts, stars, botanicals)');
  console.log('  • Warm, Etsy-friendly color palettes');
  console.log('  • Premium shadows and depth');
  console.log('  • Detailed product previews');
  console.log('  • Pinterest-worthy aesthetic');
  console.log('');
}

main().catch(console.error);
