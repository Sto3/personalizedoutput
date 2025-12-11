/**
 * FINAL VIBRANT Listing Images for Etsy
 *
 * FIXES FROM REVIEW:
 * - Process images: Numbers now INSIDE cards, not on edges
 * - LARGER fonts throughout for thumbnail readability
 * - MORE VIBRANT colors - attention-grabbing, not muted
 * - Better contrast and visual hierarchy
 * - Bigger, bolder text that reads well at small sizes
 *
 * Usage:
 *   npm run listing:images:final
 */

import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const BASE_DIR = path.join(__dirname, '..', 'listing_packets');

type ProductType = 'vision_board' | 'planner' | 'flash_cards';

// ============================================================
// VIBRANT COLOR SCHEMES - Bold, attention-grabbing
// ============================================================

const COLORS = {
  vision_board: {
    primary: '#9B7BB8',           // Rich purple (more saturated)
    primaryBright: '#B794D4',     // Bright purple
    primarySoft: '#E8D5F0',       // Soft purple
    secondary: '#5DAB8B',         // Vibrant sage
    secondaryBright: '#7CC9A8',   // Bright sage
    secondarySoft: '#C8E6D8',     // Soft sage
    accent: '#E8946A',            // Vibrant coral/peach
    accentBright: '#F5A882',      // Bright coral
    accentSoft: '#FADDD0',        // Soft coral
    gold: '#D4A43A',              // Rich gold
    bg: '#FDF8F5',                // Warm white
    bgAlt: '#FBF3EE',             // Warm cream
    text: '#3D3040',              // Deep purple-brown
    textMuted: '#6B5F70',         // Muted purple
    white: '#FFFFFF',
    shadow: 'rgba(61,48,64,0.15)'
  },
  planner: {
    primary: '#4A9BA8',           // Vibrant teal
    primaryBright: '#5FB8C7',     // Bright teal
    primarySoft: '#B8DDE3',       // Soft teal
    secondary: '#D4A65A',         // Rich gold/sand
    secondaryBright: '#E8BB6F',   // Bright gold
    secondarySoft: '#F5E6C8',     // Soft gold
    accent: '#C77B65',            // Rich terracotta
    accentBright: '#DB9580',      // Bright terracotta
    accentSoft: '#F0D5CC',        // Soft terracotta
    gold: '#B8956E',              // Bronze
    bg: '#F8F6F2',                // Warm white
    bgAlt: '#F2EDE6',             // Cream
    text: '#2D3B3D',              // Deep teal-gray
    textMuted: '#5A6B6E',         // Muted teal
    white: '#FFFFFF',
    shadow: 'rgba(45,59,61,0.15)'
  },
  flash_cards: {
    primary: '#4A93B8',           // Vibrant ocean blue
    primaryBright: '#5BA8CF',     // Bright ocean
    primarySoft: '#B8D8E8',       // Soft ocean
    secondary: '#E8B830',         // Vibrant sunshine (more saturated!)
    secondaryBright: '#F5C944',   // Bright sunshine
    secondarySoft: '#FCF0C0',     // Soft sunshine
    accent: '#E86B55',            // Vibrant coral-red
    accentBright: '#F58570',      // Bright coral
    accentSoft: '#FCDAD4',        // Soft coral
    mint: '#50B89A',              // Vibrant mint
    mintBright: '#68CEAE',        // Bright mint
    bg: '#F6FAFC',                // Cool white
    bgAlt: '#EDF4F8',             // Light blue
    text: '#2A3D48',              // Deep blue-gray
    textMuted: '#5A7080',         // Muted blue
    white: '#FFFFFF',
    shadow: 'rgba(42,61,72,0.15)'
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
      heading: 'What This Experience Creates',
      reactions: [
        'This actually feels like me.',
        'I finally see my year in one place.',
        "It's not generic — it's my real life, visualized."
      ],
      subtext: 'Built to help you feel seen, not pressured.'
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
        'Receive a personalized PDF that reflects your story'
      ],
      subtext: 'Each PDF is generated from your responses — no two are the same.'
    },
    sample: {
      overlayText: 'Example pages — your content will be personalized.'
    },
    reviews: {
      heading: 'Made For Real Life, Not Perfection',
      reactions: [
        "You don't have to have it all figured out.",
        "You're not judged — just gently guided.",
        'This is for people in the middle of it.'
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
        'Theme around what they love (dinosaurs, space, sports...)',
        'Designed to build confidence, not shame'
      ]
    },
    process: {
      heading: 'How It Works',
      steps: [
        'Purchase on Etsy',
        "Describe your child's needs in the Thought Organizer",
        'Receive printable PDF flash cards tailored to their gaps'
      ],
      subtext: 'Print, cut, and use them again and again.'
    },
    sample: {
      overlayText: "Example layout — content matches your child's needs."
    },
    reviews: {
      heading: 'Parents Love Saying...',
      reactions: [
        'These finally match how my kid learns.',
        "We're practicing exactly what they keep missing.",
        'Learning feels more like a game now.'
      ],
      subtext: ''
    }
  }
};

// ============================================================
// HELPER FUNCTIONS
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

// Sparkle decoration
function sparkle(x: number, y: number, size: number, color: string, opacity: number = 0.7): string {
  return `
    <g transform="translate(${x}, ${y})" opacity="${opacity}">
      <path d="M0,${-size} Q${size*0.2},${-size*0.2} ${size},0 Q${size*0.2},${size*0.2} 0,${size} Q${-size*0.2},${size*0.2} ${-size},0 Q${-size*0.2},${-size*0.2} 0,${-size}" fill="${color}"/>
    </g>
  `;
}

// Star decoration
function star(x: number, y: number, size: number, color: string, opacity: number = 0.6): string {
  const points = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * Math.PI / 180;
    const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
    points.push(`${x + size * Math.cos(outerAngle)},${y + size * Math.sin(outerAngle)}`);
    points.push(`${x + size * 0.4 * Math.cos(innerAngle)},${y + size * 0.4 * Math.sin(innerAngle)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="${color}" opacity="${opacity}"/>`;
}

// Heart decoration
function heart(x: number, y: number, size: number, color: string, opacity: number = 0.5): string {
  return `
    <path transform="translate(${x - size}, ${y - size * 0.8})"
          d="M${size},${size*0.3} C${size},${size*0.15} ${size*0.75},0 ${size*0.5},0 C${size*0.25},0 0,${size*0.25} 0,${size*0.5} C0,${size} ${size},${size*1.5} ${size},${size*1.8} C${size},${size*1.5} ${size*2},${size} ${size*2},${size*0.5} C${size*2},${size*0.25} ${size*1.75},0 ${size*1.5},0 C${size*1.25},0 ${size},${size*0.15} ${size},${size*0.3}Z"
          fill="${color}" opacity="${opacity}"/>
  `;
}

// Scatter sparkles
function scatterSparkles(count: number, xMin: number, xMax: number, yMin: number, yMax: number, colors: string[]): string {
  let result = '';
  for (let i = 0; i < count; i++) {
    const x = xMin + Math.random() * (xMax - xMin);
    const y = yMin + Math.random() * (yMax - yMin);
    const size = 12 + Math.random() * 20;
    const color = colors[Math.floor(Math.random() * colors.length)];
    result += sparkle(x, y, size, color, 0.25 + Math.random() * 0.35);
  }
  return result;
}

// Gradient definitions
function getGradientDefs(type: ProductType): string {
  const c = COLORS[type];
  return `
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c.bg}"/>
        <stop offset="100%" style="stop-color:${c.bgAlt}"/>
      </linearGradient>
      <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="25" stdDeviation="50" flood-color="${c.shadow}" flood-opacity="1"/>
        <feDropShadow dx="0" dy="8" stdDeviation="15" flood-color="${c.shadow}" flood-opacity="0.6"/>
      </filter>
      <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="12" stdDeviation="25" flood-color="${c.shadow}" flood-opacity="0.8"/>
      </filter>
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${c.accent}"/>
        <stop offset="50%" style="stop-color:${c.primary}"/>
        <stop offset="100%" style="stop-color:${c.secondary}"/>
      </linearGradient>
      <pattern id="dotPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="3" fill="${c.primary}" opacity="0.06"/>
      </pattern>
    </defs>
  `;
}

// ============================================================
// HERO IMAGE - Bold & Vibrant
// ============================================================

async function generateHeroImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  const titleLines = wrapText(content.hero.title, 20);
  const titleY = 1280;
  const lineHeight = 110;

  let productPreview = '';
  let decorations = '';

  if (type === 'vision_board') {
    productPreview = `
      <g transform="translate(200, 80)">
        <rect x="0" y="0" width="1600" height="1000" rx="30" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="10" y="10" width="1580" height="980" rx="24" fill="none" stroke="${c.gold}" stroke-width="3" opacity="0.5"/>

        <!-- Title banner -->
        <rect x="480" y="-35" width="640" height="90" rx="12" fill="${c.primary}" filter="url(#softShadow)"/>
        <text x="800" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="${c.white}">MY 2025 VISION</text>

        <!-- Photo grid -->
        <rect x="50" y="80" width="450" height="340" rx="20" fill="${c.primarySoft}"/>
        <rect x="520" y="80" width="540" height="340" rx="20" fill="${c.secondarySoft}"/>
        <rect x="1080" y="80" width="470" height="200" rx="20" fill="${c.accentSoft}"/>
        <rect x="1080" y="300" width="470" height="120" rx="16" fill="${c.gold}" opacity="0.25"/>
        <text x="1315" y="375" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="${c.text}" font-style="italic">"Dream big"</text>

        <rect x="50" y="440" width="700" height="420" rx="20" fill="${c.secondarySoft}"/>
        <rect x="770" y="440" width="780" height="260" rx="20" fill="${c.primarySoft}"/>
        <rect x="770" y="720" width="380" height="140" rx="16" fill="${c.accentSoft}"/>
        <rect x="1170" y="720" width="380" height="140" rx="16" fill="${c.gold}" opacity="0.2"/>

        <text x="800" y="930" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="${c.textMuted}" letter-spacing="5" font-weight="600">HEALTH • CAREER • JOY • GROWTH</text>
      </g>
    `;
    decorations = `
      ${scatterSparkles(10, 50, 350, 50, 400, [c.gold, c.accentBright, c.primaryBright])}
      ${scatterSparkles(10, 1650, 1950, 50, 450, [c.gold, c.accentBright, c.primaryBright])}
      ${heart(120, 1780, 45, c.accent, 0.35)}
      ${heart(1880, 1720, 40, c.accent, 0.3)}
      ${star(200, 1880, 28, c.gold, 0.4)}
      ${star(1800, 1850, 32, c.gold, 0.35)}
    `;
  } else if (type === 'planner') {
    productPreview = `
      <g transform="translate(180, 80)">
        <!-- Left page -->
        <rect x="0" y="0" width="780" height="980" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="25" y="25" width="730" height="100" rx="16" fill="${c.primarySoft}"/>
        <text x="390" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="600" fill="${c.text}">Reflection &amp; Clarity</text>

        <text x="60" y="180" font-family="Georgia, serif" font-size="24" fill="${c.textMuted}" font-style="italic">What&apos;s been on your mind?</text>
        ${Array.from({length: 8}, (_, i) => `
          <line x1="60" y1="${220 + i * 50}" x2="720" y2="${220 + i * 50}" stroke="${c.primary}" stroke-width="2" opacity="0.35"/>
        `).join('')}

        <text x="60" y="660" font-family="Georgia, serif" font-size="24" fill="${c.textMuted}" font-style="italic">What clarity are you seeking?</text>
        ${Array.from({length: 5}, (_, i) => `
          <line x1="60" y1="${700 + i * 50}" x2="720" y2="${700 + i * 50}" stroke="${c.primary}" stroke-width="2" opacity="0.35"/>
        `).join('')}

        <text x="60" y="950" font-family="Georgia, serif" font-size="20" fill="${c.textMuted}">12</text>

        <!-- Spine -->
        <rect x="800" y="40" width="10" height="900" rx="5" fill="${c.textMuted}" opacity="0.2"/>

        <!-- Right page -->
        <rect x="840" y="0" width="780" height="980" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="865" y="25" width="730" height="100" rx="16" fill="${c.secondarySoft}"/>
        <text x="1230" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="600" fill="${c.text}">Your Next Steps</text>

        ${Array.from({length: 10}, (_, i) => `
          <g transform="translate(900, ${160 + i * 78})">
            <rect x="0" y="0" width="36" height="36" rx="10" fill="none" stroke="${c.accent}" stroke-width="3"/>
            <line x1="55" y1="28" x2="660" y2="28" stroke="${c.primary}" stroke-width="2" opacity="0.3"/>
          </g>
        `).join('')}

        <text x="1575" y="950" text-anchor="end" font-family="Georgia, serif" font-size="20" fill="${c.textMuted}">13</text>
      </g>
    `;
    decorations = `
      ${scatterSparkles(8, 50, 280, 80, 400, [c.gold, c.accentBright])}
      ${scatterSparkles(8, 1720, 1950, 80, 450, [c.gold, c.primaryBright])}
      ${heart(1880, 1750, 38, c.accent, 0.32)}
      ${star(150, 1850, 26, c.gold, 0.38)}
    `;
  } else {
    const fc = COLORS.flash_cards as any;
    productPreview = `
      <g transform="translate(150, 100)">
        <!-- Card 1 -->
        <rect x="0" y="0" width="520" height="360" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="520" height="85" rx="28 28 0 0" fill="${fc.primary}"/>
        <text x="260" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${c.white}">MATH</text>
        <text x="260" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="${c.text}">5 + 3 = ?</text>
        ${star(460, 310, 22, fc.secondary, 0.5)}

        <!-- Card 2 -->
        <rect x="570" y="0" width="520" height="360" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="570" y="0" width="520" height="85" rx="28 28 0 0" fill="${fc.secondary}"/>
        <text x="830" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${c.text}">READING</text>
        <text x="830" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${c.text}">because</text>
        ${heart(630, 310, 24, fc.accent, 0.45)}

        <!-- Card 3 -->
        <rect x="1140" y="0" width="520" height="360" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="1140" y="0" width="520" height="85" rx="28 28 0 0" fill="${fc.accent}"/>
        <text x="1400" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${c.white}">PHONICS</text>
        <text x="1400" y="255" text-anchor="middle" font-family="Arial, sans-serif" font-size="95" font-weight="900" fill="${c.text}">ch-</text>
        ${sparkle(1580, 310, 18, fc.primary, 0.5)}

        <!-- Row 2 -->
        <rect x="285" y="420" width="520" height="360" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="285" y="420" width="520" height="85" rx="28 28 0 0" fill="${fc.accent}"/>
        <text x="545" y="478" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${c.white}">MULTIPLY</text>
        <text x="545" y="665" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="${c.text}">6 × 7 = ?</text>

        <rect x="855" y="420" width="520" height="360" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="855" y="420" width="520" height="85" rx="28 28 0 0" fill="${fc.primary}"/>
        <text x="1115" y="478" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${c.white}">VOCAB</text>
        <text x="1115" y="665" text-anchor="middle" font-family="Arial, sans-serif" font-size="68" font-weight="900" fill="${c.text}">enormous</text>
      </g>
    `;
    decorations = `
      ${scatterSparkles(12, 30, 280, 50, 400, [fc.primaryBright, fc.secondaryBright, fc.accentBright, fc.mintBright])}
      ${scatterSparkles(12, 1720, 1970, 50, 450, [fc.primaryBright, fc.secondaryBright, fc.accentBright])}
      ${star(100, 1800, 32, fc.secondary, 0.45)}
      ${star(1900, 1820, 28, fc.accent, 0.4)}
      ${heart(180, 1880, 30, fc.accent, 0.35)}
      ${heart(1850, 1900, 28, fc.accent, 0.3)}
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotPattern)"/>

    <!-- Decorative blobs -->
    <ellipse cx="120" cy="200" rx="380" ry="300" fill="${c.primarySoft}" opacity="0.45"/>
    <ellipse cx="1880" cy="300" rx="350" ry="380" fill="${c.secondarySoft}" opacity="0.4"/>
    <ellipse cx="150" cy="1800" rx="320" ry="280" fill="${c.accentSoft}" opacity="0.4"/>
    <ellipse cx="1850" cy="1750" rx="380" ry="320" fill="${c.primarySoft}" opacity="0.35"/>

    ${decorations}
    ${productPreview}

    <!-- Title Card -->
    <rect x="140" y="1120" width="1720" height="580" rx="40" fill="${c.white}" filter="url(#cardShadow)"/>
    <rect x="140" y="1120" width="1720" height="16" rx="8 8 0 0" fill="url(#accentGradient)"/>

    <!-- Title - BIGGER -->
    ${titleLines.map((line, i) => `
      <text x="1000" y="${titleY + i * lineHeight}" text-anchor="middle" font-family="Georgia, serif" font-size="88" font-weight="700" fill="${c.text}">${escapeXml(line)}</text>
    `).join('')}

    <!-- Subtitle - BIGGER -->
    <text x="1000" y="${titleY + titleLines.length * lineHeight + 70}" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="${c.textMuted}">${escapeXml(content.hero.subtitle)}</text>

    <!-- Accent line -->
    <rect x="580" y="${titleY + titleLines.length * lineHeight + 120}" width="840" height="8" rx="4" fill="url(#accentGradient)"/>

    <!-- Corner sparkles -->
    ${sparkle(230, 1200, 22, c.gold, 0.45)}
    ${sparkle(1770, 1200, 22, c.gold, 0.45)}

    <!-- Corner accents -->
    <g opacity="0.45">
      <path d="M45 45 L45 165 M45 45 L165 45" stroke="${c.primary}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M1955 45 L1955 165 M1955 45 L1835 45" stroke="${c.secondary}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M45 1955 L45 1835 M45 1955 L165 1955" stroke="${c.accent}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M1955 1955 L1955 1835 M1955 1955 L1835 1955" stroke="${c.primary}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// BENEFIT IMAGE - Bold & Clear
// ============================================================

async function generateBenefitImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  const decorations = `
    ${scatterSparkles(6, 50, 280, 80, 350, [c.gold, c.accentBright])}
    ${scatterSparkles(6, 1720, 1950, 80, 400, [c.gold, c.primaryBright])}
    ${heart(1880, 1820, 35, c.accent, 0.3)}
  `;

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotPattern)"/>

    <!-- Blobs -->
    <ellipse cx="80" cy="80" rx="320" ry="260" fill="${c.primarySoft}" opacity="0.5"/>
    <ellipse cx="1920" cy="1920" rx="380" ry="320" fill="${c.secondarySoft}" opacity="0.45"/>

    ${decorations}

    <!-- Main Card -->
    <rect x="80" y="80" width="1840" height="1840" rx="50" fill="${c.white}" filter="url(#cardShadow)"/>

    <!-- Header -->
    <rect x="80" y="80" width="1840" height="240" rx="50 50 0 0" fill="${c.primarySoft}" opacity="0.6"/>
    <text x="1000" y="235" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="700" fill="${c.text}">${escapeXml(content.benefit.heading)}</text>
    <rect x="400" y="290" width="1200" height="6" rx="3" fill="url(#accentGradient)"/>

    <!-- Benefits - BIGGER TEXT -->
    ${content.benefit.bullets.map((bullet, i) => {
      const y = 420 + i * 360;
      const bulletLines = wrapText(bullet, 36);
      const accentColors = [c.primary, c.secondary, c.accent, c.primary];

      return `
        <g transform="translate(160, ${y})">
          <rect x="0" y="0" width="1680" height="300" rx="28" fill="${c.white}" filter="url(#softShadow)"/>
          <rect x="0" y="0" width="12" height="300" rx="6 0 0 6" fill="${accentColors[i]}"/>

          <!-- Number badge - BIGGER -->
          <circle cx="110" cy="150" r="65" fill="${accentColors[i]}"/>
          <text x="110" y="172" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="${c.white}">${i + 1}</text>

          <!-- Text - BIGGER -->
          ${bulletLines.map((line, j) => `
            <text x="210" y="${130 + j * 60}" font-family="Georgia, serif" font-size="48" fill="${c.text}">${escapeXml(line)}</text>
          `).join('')}

          ${sparkle(1580, 50, 16, c.gold, 0.4)}
        </g>
      `;
    }).join('')}

    <!-- Bottom dots -->
    <g transform="translate(880, 1850)">
      <circle cx="0" cy="0" r="14" fill="${c.primary}" opacity="0.5"/>
      <circle cx="60" cy="0" r="14" fill="${c.secondary}" opacity="0.5"/>
      <circle cx="120" cy="0" r="14" fill="${c.accent}" opacity="0.5"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// PROCESS IMAGE - FIXED: Numbers inside cards, not on edge
// ============================================================

async function generateProcessImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  const decorations = `
    ${scatterSparkles(5, 50, 250, 100, 350, [c.gold, c.accentBright])}
    ${scatterSparkles(5, 1750, 1950, 100, 400, [c.gold, c.primaryBright])}
    ${heart(100, 1880, 30, c.accent, 0.3)}
    ${star(1900, 1850, 25, c.gold, 0.35)}
  `;

  const stepColors = [c.primary, c.secondary, c.accent];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotPattern)"/>

    <!-- Blobs -->
    <ellipse cx="1900" cy="120" rx="300" ry="240" fill="${c.accentSoft}" opacity="0.45"/>
    <ellipse cx="100" cy="1880" rx="280" ry="220" fill="${c.secondarySoft}" opacity="0.4"/>

    ${decorations}

    <!-- Header - BIGGER -->
    <text x="1000" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="82" font-weight="700" fill="${c.text}">${escapeXml(content.process.heading)}</text>
    <rect x="500" y="240" width="1000" height="8" rx="4" fill="url(#accentGradient)"/>

    <!-- Step Cards - FIXED LAYOUT: All cards same width, numbers INSIDE on left -->
    ${content.process.steps.map((step, i) => {
      const y = 340 + i * 430;
      const stepLines = wrapText(step, 30);

      return `
        <g transform="translate(200, ${y})">
          <!-- Card background -->
          <rect x="0" y="0" width="1600" height="350" rx="32" fill="${c.white}" filter="url(#cardShadow)"/>

          <!-- Top accent bar -->
          <rect x="0" y="0" width="1600" height="14" rx="32 32 0 0" fill="${stepColors[i]}"/>

          <!-- Number badge - INSIDE card on left -->
          <circle cx="120" cy="175" r="70" fill="${stepColors[i]}"/>
          <text x="120" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="${c.white}">${i + 1}</text>

          <!-- Step text - BIGGER, positioned to right of number -->
          ${stepLines.map((line, j) => `
            <text x="240" y="${150 + j * 65}" font-family="Georgia, serif" font-size="52" fill="${c.text}">${escapeXml(line)}</text>
          `).join('')}

          <!-- Sparkle -->
          ${sparkle(1500, 60, 18, c.gold, 0.45)}
        </g>
      `;
    }).join('')}

    <!-- Subtext banner -->
    <rect x="180" y="1680" width="1640" height="150" rx="28" fill="${c.primarySoft}" opacity="0.6"/>
    <text x="1000" y="1775" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="${c.text}" font-style="italic">${escapeXml(content.process.subtext)}</text>

    <!-- Bottom dots -->
    <g transform="translate(900, 1900)">
      <circle cx="0" cy="0" r="12" fill="${c.primary}" opacity="0.45"/>
      <circle cx="55" cy="0" r="12" fill="${c.secondary}" opacity="0.45"/>
      <circle cx="110" cy="0" r="12" fill="${c.accent}" opacity="0.45"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// SAMPLE IMAGE - Vibrant Preview
// ============================================================

async function generateSampleImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  let sampleContent = '';
  let decorations = '';

  if (type === 'vision_board') {
    sampleContent = `
      <g transform="translate(80, 80)">
        <rect x="0" y="0" width="1840" height="1300" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="12" y="12" width="1816" height="1276" rx="22" fill="none" stroke="${c.gold}" stroke-width="3" opacity="0.4"/>

        <!-- Title -->
        <rect x="520" y="-40" width="800" height="100" rx="16" fill="${c.primary}" filter="url(#softShadow)"/>
        <text x="920" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="${c.white}">2025 VISION BOARD</text>

        <!-- Photo grid -->
        <rect x="50" y="90" width="500" height="360" rx="20" fill="${c.primarySoft}"/>
        <rect x="570" y="90" width="620" height="360" rx="20" fill="${c.secondarySoft}"/>
        <rect x="1210" y="90" width="580" height="220" rx="20" fill="${c.accentSoft}"/>
        <rect x="1210" y="330" width="580" height="120" rx="14" fill="${c.gold}" opacity="0.3"/>
        <text x="1500" y="405" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${c.text}" font-style="italic">"Make it happen"</text>

        <rect x="50" y="470" width="780" height="440" rx="20" fill="${c.secondarySoft}"/>
        <rect x="850" y="470" width="940" height="280" rx="20" fill="${c.primarySoft}"/>
        <rect x="850" y="770" width="460" height="140" rx="14" fill="${c.accentSoft}"/>
        <rect x="1330" y="770" width="460" height="140" rx="14" fill="${c.gold}" opacity="0.25"/>

        <rect x="50" y="930" width="380" height="240" rx="20" fill="${c.accentSoft}"/>
        <rect x="450" y="930" width="560" height="240" rx="20" fill="${c.gold}" opacity="0.25"/>
        <text x="730" y="1070" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="${c.text}" font-style="italic">"Dream big, start small"</text>
        <rect x="1030" y="930" width="760" height="240" rx="20" fill="${c.primarySoft}"/>

        <text x="920" y="1240" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${c.textMuted}" letter-spacing="5" font-weight="600">HEALTH • CAREER • JOY • RELATIONSHIPS • GROWTH</text>
      </g>
    `;
    decorations = `
      ${sparkle(100, 1500, 18, c.gold, 0.4)}
      ${sparkle(1900, 1480, 20, c.gold, 0.35)}
      ${heart(100, 1880, 30, c.accent, 0.3)}
      ${star(1900, 1860, 25, c.gold, 0.35)}
    `;
  } else if (type === 'planner') {
    sampleContent = `
      <g transform="translate(40, 80)">
        <!-- Page 1 -->
        <rect x="0" y="0" width="620" height="920" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="20" y="20" width="580" height="85" rx="14" fill="${c.primarySoft}"/>
        <text x="310" y="75" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="600" fill="${c.text}">Your Reflection</text>

        <text x="50" y="155" font-family="Georgia, serif" font-size="22" fill="${c.textMuted}" font-style="italic">What&apos;s weighing on your mind?</text>
        ${Array.from({length: 7}, (_, i) => `
          <line x1="50" y1="${195 + i * 45}" x2="570" y2="${195 + i * 45}" stroke="${c.primary}" stroke-width="2" opacity="0.35"/>
        `).join('')}

        <text x="50" y="545" font-family="Georgia, serif" font-size="22" fill="${c.textMuted}" font-style="italic">What clarity are you seeking?</text>
        ${Array.from({length: 6}, (_, i) => `
          <line x1="50" y1="${585 + i * 45}" x2="570" y2="${585 + i * 45}" stroke="${c.primary}" stroke-width="2" opacity="0.35"/>
        `).join('')}

        <text x="50" y="890" font-family="Georgia, serif" font-size="18" fill="${c.textMuted}">12</text>

        <!-- Page 2 -->
        <rect x="660" y="0" width="620" height="920" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="680" y="20" width="580" height="85" rx="14" fill="${c.secondarySoft}"/>
        <text x="970" y="75" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="600" fill="${c.text}">Guided Prompts</text>

        ${['Consider: What would you tell a friend?', 'Notice: What emotions come up?', 'Explore: What does "enough" look like?'].map((prompt, i) => `
          <rect x="700" y="${130 + i * 250}" width="540" height="220" rx="16" fill="${c.primarySoft}" opacity="0.4"/>
          <text x="720" y="${175 + i * 250}" font-family="Georgia, serif" font-size="22" fill="${c.text}">${escapeXml(prompt)}</text>
          ${Array.from({length: 3}, (_, j) => `
            <line x1="720" y1="${215 + i * 250 + j * 45}" x2="1220" y2="${215 + i * 250 + j * 45}" stroke="${c.primary}" stroke-width="1.5" opacity="0.35"/>
          `).join('')}
        `).join('')}

        <text x="1240" y="890" text-anchor="end" font-family="Georgia, serif" font-size="18" fill="${c.textMuted}">13</text>

        <!-- Page 3 -->
        <rect x="1320" y="0" width="620" height="920" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="1340" y="20" width="580" height="85" rx="14" fill="${c.accentSoft}"/>
        <text x="1630" y="75" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="600" fill="${c.text}">Your Next Steps</text>

        <text x="1370" y="155" font-family="Georgia, serif" font-size="20" fill="${c.textMuted}">Based on your reflections:</text>

        ${Array.from({length: 9}, (_, i) => `
          <g transform="translate(1370, ${190 + i * 72})">
            <rect x="0" y="0" width="32" height="32" rx="9" fill="none" stroke="${c.accent}" stroke-width="3"/>
            <line x1="50" y1="26" x2="530" y2="26" stroke="${c.primary}" stroke-width="1.5" opacity="0.35"/>
          </g>
        `).join('')}

        <rect x="1370" y="865" width="530" height="35" rx="8" fill="${c.accent}" opacity="0.15"/>
        <text x="1635" y="890" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="${c.textMuted}" font-style="italic">Take it one step at a time</text>
      </g>
    `;
    decorations = `
      ${sparkle(100, 1100, 16, c.gold, 0.35)}
      ${sparkle(1900, 1080, 18, c.gold, 0.3)}
    `;
  } else {
    const fc = COLORS.flash_cards as any;
    sampleContent = `
      <g transform="translate(40, 80)">
        <rect x="0" y="0" width="1920" height="1280" rx="28" fill="${c.white}" filter="url(#cardShadow)"/>

        <!-- Row 1 -->
        <rect x="50" y="50" width="580" height="380" rx="22" fill="${c.white}" stroke="${fc.primary}" stroke-width="4"/>
        <rect x="50" y="50" width="580" height="75" rx="22 22 0 0" fill="${fc.primary}"/>
        <text x="340" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.white}">ADDITION</text>
        <text x="340" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${c.text}">8 + 4 = ?</text>
        ${star(570, 370, 20, fc.secondary, 0.5)}

        <rect x="670" y="50" width="580" height="380" rx="22" fill="${c.white}" stroke="${fc.secondary}" stroke-width="4"/>
        <rect x="670" y="50" width="580" height="75" rx="22 22 0 0" fill="${fc.secondary}"/>
        <text x="960" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.text}">SIGHT WORD</text>
        <text x="960" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${c.text}">because</text>
        ${heart(730, 370, 22, fc.accent, 0.45)}

        <rect x="1290" y="50" width="580" height="380" rx="22" fill="${c.white}" stroke="${fc.accent}" stroke-width="4"/>
        <rect x="1290" y="50" width="580" height="75" rx="22 22 0 0" fill="${fc.accent}"/>
        <text x="1580" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.white}">PHONICS</text>
        <text x="1580" y="285" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" font-weight="900" fill="${c.text}">sh-</text>
        ${sparkle(1810, 370, 16, fc.primary, 0.5)}

        <!-- Row 2 -->
        <rect x="50" y="470" width="580" height="380" rx="22" fill="${c.white}" stroke="${fc.accent}" stroke-width="4"/>
        <rect x="50" y="470" width="580" height="75" rx="22 22 0 0" fill="${fc.accent}"/>
        <text x="340" y="522" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.white}">MULTIPLICATION</text>
        <text x="340" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${c.text}">7 × 8 = ?</text>

        <rect x="670" y="470" width="580" height="380" rx="22" fill="${c.white}" stroke="${fc.primary}" stroke-width="4"/>
        <rect x="670" y="470" width="580" height="75" rx="22 22 0 0" fill="${fc.primary}"/>
        <text x="960" y="522" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.white}">VOCABULARY</text>
        <text x="960" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="${c.text}">enormous</text>

        <rect x="1290" y="470" width="580" height="380" rx="22" fill="${c.white}" stroke="${fc.secondary}" stroke-width="4"/>
        <rect x="1290" y="470" width="580" height="75" rx="22 22 0 0" fill="${fc.secondary}"/>
        <text x="1580" y="522" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.text}">SUBTRACTION</text>
        <text x="1580" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${c.text}">15 - 7 = ?</text>

        <!-- Cut lines -->
        <line x1="640" y1="30" x2="640" y2="870" stroke="${c.textMuted}" stroke-width="2" stroke-dasharray="14,8" opacity="0.4"/>
        <line x1="1260" y1="30" x2="1260" y2="870" stroke="${c.textMuted}" stroke-width="2" stroke-dasharray="14,8" opacity="0.4"/>
        <line x1="30" y1="450" x2="1890" y2="450" stroke="${c.textMuted}" stroke-width="2" stroke-dasharray="14,8" opacity="0.4"/>

        <!-- Instructions -->
        <rect x="50" y="900" width="1820" height="340" rx="20" fill="${fc.primarySoft}" opacity="0.45"/>
        <text x="960" y="985" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="600" fill="${c.text}">Print at home • Cut along dotted lines • Learn and play!</text>

        <g transform="translate(200, 1060)">
          <circle cx="0" cy="35" r="35" fill="${fc.primary}"/>
          <text x="0" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="white">1</text>
          <text x="60" y="50" font-family="Georgia, serif" font-size="32" fill="${c.text}">Print on cardstock</text>
        </g>

        <g transform="translate(680, 1060)">
          <circle cx="0" cy="35" r="35" fill="${fc.secondary}"/>
          <text x="0" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${c.text}">2</text>
          <text x="60" y="50" font-family="Georgia, serif" font-size="32" fill="${c.text}">Cut along lines</text>
        </g>

        <g transform="translate(1160, 1060)">
          <circle cx="0" cy="35" r="35" fill="${fc.accent}"/>
          <text x="0" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="white">3</text>
          <text x="60" y="50" font-family="Georgia, serif" font-size="32" fill="${c.text}">Practice and learn!</text>
        </g>
      </g>
    `;
    decorations = `
      ${star(80, 1500, 25, fc.secondary, 0.4)}
      ${star(1920, 1480, 22, fc.accent, 0.35)}
      ${heart(1900, 1600, 28, fc.accent, 0.3)}
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotPattern)"/>

    <!-- Blobs -->
    <ellipse cx="80" cy="80" rx="240" ry="200" fill="${c.secondarySoft}" opacity="0.5"/>
    <ellipse cx="1920" cy="1920" rx="280" ry="220" fill="${c.accentSoft}" opacity="0.45"/>

    ${decorations}
    ${sampleContent}

    <!-- Banner -->
    <rect x="80" y="1560" width="1840" height="170" rx="28" fill="${c.primary}" filter="url(#softShadow)"/>
    <rect x="80" y="1560" width="1840" height="12" rx="6 6 0 0" fill="${c.gold}" opacity="0.6"/>
    <text x="1000" y="1670" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="${c.white}">${escapeXml(content.sample.overlayText)}</text>

    ${sparkle(170, 1645, 20, c.white, 0.5)}
    ${sparkle(1830, 1645, 20, c.white, 0.5)}
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// REVIEWS IMAGE - Bold Testimonials
// ============================================================

async function generateReviewsImage(type: ProductType): Promise<Buffer> {
  const c = COLORS[type];
  const content = CONTENT[type];

  const decorations = `
    ${scatterSparkles(8, 40, 280, 80, 380, [c.gold, c.accentBright, c.primaryBright])}
    ${scatterSparkles(8, 1720, 1960, 80, 420, [c.gold, c.accentBright, c.primaryBright])}
    ${heart(1900, 1800, 38, c.accent, 0.35)}
    ${heart(100, 1850, 35, c.accent, 0.3)}
  `;

  const quoteColors = [c.primary, c.secondary, c.accent];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(type)}

    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#dotPattern)"/>

    <!-- Blobs -->
    <ellipse cx="120" cy="120" rx="320" ry="260" fill="${c.primarySoft}" opacity="0.5"/>
    <ellipse cx="1880" cy="1880" rx="360" ry="300" fill="${c.secondarySoft}" opacity="0.45"/>
    <ellipse cx="1850" cy="220" rx="240" ry="200" fill="${c.accentSoft}" opacity="0.4"/>
    <ellipse cx="120" cy="1750" rx="280" ry="240" fill="${c.accentSoft}" opacity="0.35"/>

    ${decorations}

    <!-- Header - BIGGER -->
    <text x="1000" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="78" font-weight="700" fill="${c.text}">${escapeXml(content.reviews.heading)}</text>
    <rect x="450" y="270" width="1100" height="8" rx="4" fill="url(#accentGradient)"/>

    <!-- Quote Cards - BIGGER TEXT -->
    ${content.reviews.reactions.map((reaction, i) => {
      const y = 400 + i * 440;
      const reactionLines = wrapText(reaction, 28);

      return `
        <g transform="translate(130, ${y})">
          <rect x="0" y="0" width="1740" height="360" rx="32" fill="${c.white}" filter="url(#cardShadow)"/>
          <rect x="0" y="0" width="16" height="360" rx="8 0 0 8" fill="${quoteColors[i]}"/>

          <!-- Big quote mark -->
          <text x="90" y="170" font-family="Georgia, serif" font-size="220" fill="${quoteColors[i]}" opacity="0.12">"</text>

          <!-- Quote text - BIGGER -->
          ${reactionLines.map((line, j) => `
            <text x="220" y="${160 + j * 70}" font-family="Georgia, serif" font-size="56" fill="${c.text}" font-style="italic">${escapeXml(line)}</text>
          `).join('')}

          <!-- Dots -->
          <g transform="translate(1520, 180)">
            <circle cx="0" cy="0" r="12" fill="${c.primary}" opacity="0.45"/>
            <circle cx="45" cy="0" r="12" fill="${c.secondary}" opacity="0.45"/>
            <circle cx="90" cy="0" r="12" fill="${c.accent}" opacity="0.45"/>
          </g>

          ${sparkle(1640, 60, 18, c.gold, 0.45)}
        </g>
      `;
    }).join('')}

    <!-- Subtext -->
    ${content.reviews.subtext ? `
      <rect x="220" y="1730" width="1560" height="140" rx="24" fill="${c.primarySoft}" opacity="0.6"/>
      <text x="1000" y="1820" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="${c.text}" font-style="italic">${escapeXml(content.reviews.subtext)}</text>
    ` : ''}

    <!-- Bottom flourish -->
    <path d="M600 ${content.reviews.subtext ? '1930' : '1780'} Q1000 ${content.reviews.subtext ? '1850' : '1700'} 1400 ${content.reviews.subtext ? '1930' : '1780'}" stroke="${c.primary}" stroke-width="5" fill="none" opacity="0.35"/>

    <!-- Bottom dots -->
    <g transform="translate(880, ${content.reviews.subtext ? '1970' : '1880'})">
      <circle cx="0" cy="0" r="12" fill="${c.primary}" opacity="0.45"/>
      <circle cx="55" cy="0" r="12" fill="${c.secondary}" opacity="0.45"/>
      <circle cx="110" cy="0" r="12" fill="${c.accent}" opacity="0.45"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// MAIN GENERATION
// ============================================================

async function generateAllImages(type: ProductType): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FINAL VIBRANT IMAGES: ${type.toUpperCase()}`);
  console.log('═'.repeat(60));

  const outputDir = path.join(BASE_DIR, type, 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const images = [
    { name: '01_hero.png', generator: generateHeroImage, desc: 'Hero' },
    { name: '02_benefit.png', generator: generateBenefitImage, desc: 'Benefits' },
    { name: '03_process.png', generator: generateProcessImage, desc: 'Process (FIXED)' },
    { name: '04_sample.png', generator: generateSampleImage, desc: 'Sample' },
    { name: '05_reviews.png', generator: generateReviewsImage, desc: 'Reviews' }
  ];

  for (const { name, generator, desc } of images) {
    process.stdout.write(`  ${name} (${desc})...`);
    try {
      const buffer = await generator(type);
      const outputPath = path.join(outputDir, name);
      fs.writeFileSync(outputPath, buffer);
      const stats = fs.statSync(outputPath);
      console.log(` ✓ ${(stats.size / 1024).toFixed(0)}KB`);
    } catch (error) {
      console.log(` ✗ ${(error as Error).message}`);
    }
  }

  console.log(`  ✓ Done with ${type}\n`);
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  FINAL VIBRANT ETSY LISTING IMAGES');
  console.log('  Bigger Text • Brighter Colors • Fixed Layout');
  console.log('═'.repeat(60));

  const args = process.argv.slice(2);
  let products: ProductType[] = ['vision_board', 'planner', 'flash_cards'];

  if (args.includes('vision')) products = ['vision_board'];
  else if (args.includes('planner')) products = ['planner'];
  else if (args.includes('flash')) products = ['flash_cards'];

  console.log(`\n  Products: ${products.join(', ')}`);
  console.log(`  Resolution: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);

  for (const product of products) {
    await generateAllImages(product);
  }

  console.log('═'.repeat(60));
  console.log('  COMPLETE!');
  console.log('═'.repeat(60));
  console.log('\n  Fixes applied:');
  console.log('  ✓ Process images: Numbers INSIDE cards (not hidden)');
  console.log('  ✓ Font sizes increased 30-50% throughout');
  console.log('  ✓ Colors more vibrant and saturated');
  console.log('  ✓ Better contrast for thumbnail readability');
  console.log('');
}

main().catch(console.error);
