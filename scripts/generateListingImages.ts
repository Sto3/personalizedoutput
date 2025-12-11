/**
 * Generate Premium Listing Images for Etsy
 *
 * Creates 5 high-quality, professional listing images for each product type:
 *   01_hero.png      - Main product showcase
 *   02_benefit.png   - Why this is different / benefits
 *   03_process.png   - How it works steps
 *   04_sample.png    - Sample product preview
 *   05_reviews.png   - Aspirational reactions
 *
 * Usage:
 *   npm run listing:images:vision
 *   npm run listing:images:planner
 *   npm run listing:images:flash
 *   npm run listing:images:all
 */

import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

// ============================================================
// CONFIGURATION
// ============================================================

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

const BASE_DIR = path.join(__dirname, '..', 'listing_packets');

type ProductType = 'vision_board' | 'planner' | 'flash_cards';

// Premium color schemes per product - carefully crafted for visual appeal
const PRODUCT_COLORS: Record<ProductType, {
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentLight: string;
  bg: string;
  bgGradientEnd: string;
  text: string;
  textMuted: string;
  cardBg: string;
  shadow: string;
}> = {
  vision_board: {
    primary: '#B8A9C9',       // Soft lavender
    primaryLight: '#E8DFF5',  // Light lavender
    secondary: '#6B8E88',     // Sage green
    secondaryLight: '#C5DDD8',// Light sage
    accent: '#D4A574',        // Warm gold
    accentLight: '#F5E6D3',   // Light gold
    bg: '#FDFBF9',            // Warm white
    bgGradientEnd: '#F5F0ED', // Subtle gradient end
    text: '#3D3A38',          // Dark charcoal
    textMuted: '#7A7672',     // Muted text
    cardBg: '#FFFFFF',        // Pure white cards
    shadow: 'rgba(60,50,40,0.08)'
  },
  planner: {
    primary: '#7BA3A8',       // Teal sage
    primaryLight: '#D4E4E6',  // Light teal
    secondary: '#C4A77D',     // Warm sand
    secondaryLight: '#EDE5D8',// Light sand
    accent: '#9C7C6C',        // Terracotta
    accentLight: '#E8DDD6',   // Light terracotta
    bg: '#FAF8F5',            // Cream white
    bgGradientEnd: '#F0EBE5', // Subtle gradient end
    text: '#3A3634',          // Deep brown
    textMuted: '#7D7672',     // Muted text
    cardBg: '#FFFFFF',        // Pure white cards
    shadow: 'rgba(58,54,52,0.08)'
  },
  flash_cards: {
    primary: '#5B8A9A',       // Ocean blue
    primaryLight: '#D0E3E9',  // Light ocean
    secondary: '#E9B44C',     // Sunshine yellow
    secondaryLight: '#FBF0D1',// Light sunshine
    accent: '#D47563',        // Coral
    accentLight: '#F5DDD8',   // Light coral
    bg: '#F9FAFB',            // Cool white
    bgGradientEnd: '#EEF2F5', // Subtle gradient end
    text: '#2C3E4A',          // Deep blue-gray
    textMuted: '#6B7C8A',     // Muted text
    cardBg: '#FFFFFF',        // Pure white cards
    shadow: 'rgba(44,62,74,0.08)'
  }
};

// ============================================================
// CONTENT FOR EACH PRODUCT TYPE
// ============================================================

interface ProductContent {
  hero: {
    title: string;
    subtitle: string;
  };
  benefit: {
    heading: string;
    bullets: string[];
  };
  process: {
    heading: string;
    steps: string[];
    subtext: string;
  };
  sample: {
    overlayText: string;
  };
  reviews: {
    heading: string;
    reactions: string[];
    subtext: string;
  };
}

const CONTENT: Record<ProductType, ProductContent> = {
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
// SVG HELPERS
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

// Premium gradient definitions
function getGradientDefs(colors: typeof PRODUCT_COLORS.vision_board): string {
  return `
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.bgGradientEnd};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.primaryLight};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${colors.accent};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
      </linearGradient>
      <filter id="premiumShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="15" stdDeviation="30" flood-color="${colors.shadow}"/>
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${colors.shadow}"/>
      </filter>
      <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="${colors.shadow}"/>
      </filter>
      <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="20"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <pattern id="subtlePattern" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="30" cy="30" r="1" fill="${colors.primary}" opacity="0.05"/>
      </pattern>
    </defs>
  `;
}

// ============================================================
// PREMIUM IMAGE GENERATORS
// ============================================================

async function generateHeroImage(productType: ProductType): Promise<Buffer> {
  const colors = PRODUCT_COLORS[productType];
  const content = CONTENT[productType];

  const titleLines = wrapText(content.hero.title, 28);
  const titleStartY = 1250;
  const lineHeight = 90;

  // Product-specific sample content
  let samplePreview = '';
  if (productType === 'vision_board') {
    samplePreview = `
      <!-- Premium Vision Board Preview -->
      <g transform="translate(350, 180)">
        <rect x="0" y="0" width="1300" height="850" rx="16" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="8" y="8" width="1284" height="834" rx="12" fill="none" stroke="${colors.primaryLight}" stroke-width="2"/>

        <!-- Photo Grid with Rounded Corners -->
        <rect x="40" y="40" width="380" height="260" rx="12" fill="${colors.primaryLight}"/>
        <rect x="440" y="40" width="380" height="260" rx="12" fill="${colors.secondaryLight}"/>
        <rect x="840" y="40" width="420" height="260" rx="12" fill="${colors.accentLight}"/>

        <rect x="40" y="320" width="600" height="320" rx="12" fill="${colors.secondaryLight}"/>
        <rect x="660" y="320" width="600" height="320" rx="12" fill="${colors.primaryLight}"/>

        <rect x="40" y="660" width="280" height="160" rx="12" fill="${colors.accentLight}"/>
        <rect x="340" y="660" width="440" height="160" rx="12" fill="${colors.primaryLight}"/>
        <rect x="800" y="660" width="460" height="160" rx="12" fill="${colors.secondaryLight}"/>

        <!-- Elegant Quote Accent -->
        <rect x="280" y="750" width="460" height="70" rx="8" fill="${colors.primary}" opacity="0.2"/>
        <text x="510" y="795" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${colors.text}" font-style="italic" opacity="0.8">"Dream it. See it. Become it."</text>
      </g>
    `;
  } else if (productType === 'planner') {
    samplePreview = `
      <!-- Premium Planner Preview -->
      <g transform="translate(300, 180)">
        <!-- Left Page -->
        <rect x="0" y="0" width="650" height="850" rx="12" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="20" y="20" width="610" height="70" rx="8" fill="${colors.primaryLight}"/>
        <text x="325" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="500" fill="${colors.text}">Reflection &amp; Clarity</text>

        <!-- Writing Lines -->
        <g transform="translate(50, 130)">
          ${Array.from({length: 18}, (_, i) =>
            `<line x1="0" y1="${i * 38}" x2="550" y2="${i * 38}" stroke="${colors.primary}" stroke-width="1" opacity="0.25"/>`
          ).join('')}
        </g>

        <!-- Page Number -->
        <text x="50" y="820" font-family="Georgia, serif" font-size="16" fill="${colors.textMuted}">12</text>

        <!-- Binding -->
        <rect x="668" y="30" width="4" height="790" fill="${colors.textMuted}" opacity="0.15" rx="2"/>

        <!-- Right Page -->
        <rect x="700" y="0" width="650" height="850" rx="12" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="720" y="20" width="610" height="70" rx="8" fill="${colors.secondaryLight}"/>
        <text x="1025" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="500" fill="${colors.text}">Next Steps</text>

        <!-- Checkbox Lines -->
        <g transform="translate(750, 130)">
          ${Array.from({length: 10}, (_, i) => `
            <rect x="0" y="${i * 70}" width="24" height="24" rx="6" fill="none" stroke="${colors.secondary}" stroke-width="2"/>
            <line x1="40" y1="${i * 70 + 20}" x2="550" y2="${i * 70 + 20}" stroke="${colors.primary}" stroke-width="1" opacity="0.25"/>
          `).join('')}
        </g>

        <text x="1300" y="820" text-anchor="end" font-family="Georgia, serif" font-size="16" fill="${colors.textMuted}">13</text>
      </g>
    `;
  } else {
    samplePreview = `
      <!-- Premium Flash Cards Preview -->
      <g transform="translate(250, 200)">
        <!-- Card 1 -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="440" height="300" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
          <rect x="0" y="0" width="440" height="60" rx="20 20 0 0" fill="${colors.primary}"/>
          <text x="220" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="white">MATH</text>
          <text x="220" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${colors.text}">5 + 3 = ?</text>
        </g>

        <!-- Card 2 -->
        <g transform="translate(520, 0)">
          <rect x="0" y="0" width="440" height="300" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
          <rect x="0" y="0" width="440" height="60" rx="20 20 0 0" fill="${colors.secondary}"/>
          <text x="220" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="white">READING</text>
          <text x="220" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="${colors.text}">because</text>
        </g>

        <!-- Card 3 -->
        <g transform="translate(1040, 0)">
          <rect x="0" y="0" width="440" height="300" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
          <rect x="0" y="0" width="440" height="60" rx="20 20 0 0" fill="${colors.accent}"/>
          <text x="220" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="white">PHONICS</text>
          <text x="220" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="${colors.text}">ch-</text>
        </g>

        <!-- Card Row 2 -->
        <g transform="translate(260, 380)">
          <rect x="0" y="0" width="440" height="300" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
          <rect x="0" y="0" width="440" height="60" rx="20 20 0 0" fill="${colors.accent}"/>
          <text x="220" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="white">MULTIPLY</text>
          <text x="220" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${colors.text}">6 × 7 = ?</text>
        </g>

        <g transform="translate(780, 380)">
          <rect x="0" y="0" width="440" height="300" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
          <rect x="0" y="0" width="440" height="60" rx="20 20 0 0" fill="${colors.primary}"/>
          <text x="220" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="white">VOCAB</text>
          <text x="220" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="${colors.text}">enormous</text>
        </g>
      </g>
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(colors)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#subtlePattern)"/>

    <!-- Decorative Soft Shapes -->
    <ellipse cx="200" cy="200" rx="300" ry="200" fill="${colors.primary}" opacity="0.06"/>
    <ellipse cx="1800" cy="400" rx="250" ry="300" fill="${colors.secondary}" opacity="0.05"/>
    <ellipse cx="300" cy="1700" rx="200" ry="250" fill="${colors.accent}" opacity="0.05"/>
    <ellipse cx="1750" cy="1650" rx="280" ry="200" fill="${colors.primary}" opacity="0.06"/>

    <!-- Product Preview -->
    ${samplePreview}

    <!-- Title Card -->
    <rect x="200" y="1120" width="1600" height="480" rx="24" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>

    <!-- Title Text -->
    ${titleLines.map((line, i) => `
      <text x="1000" y="${titleStartY + i * lineHeight}" text-anchor="middle" font-family="Georgia, serif" font-size="68" font-weight="600" fill="${colors.text}">${escapeXml(line)}</text>
    `).join('')}

    <!-- Subtitle -->
    <text x="1000" y="${titleStartY + titleLines.length * lineHeight + 50}" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="${colors.textMuted}">${escapeXml(content.hero.subtitle)}</text>

    <!-- Accent Line -->
    <rect x="750" y="${titleStartY + titleLines.length * lineHeight + 90}" width="500" height="4" rx="2" fill="url(#accentGradient)"/>

    <!-- Corner Accents -->
    <g opacity="0.4">
      <path d="M60 60 L60 180 M60 60 L180 60" stroke="${colors.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M1940 60 L1940 180 M1940 60 L1820 60" stroke="${colors.secondary}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M60 1940 L60 1820 M60 1940 L180 1940" stroke="${colors.accent}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M1940 1940 L1940 1820 M1940 1940 L1820 1940" stroke="${colors.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

async function generateBenefitImage(productType: ProductType): Promise<Buffer> {
  const colors = PRODUCT_COLORS[productType];
  const content = CONTENT[productType];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(colors)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#subtlePattern)"/>

    <!-- Decorative Elements -->
    <ellipse cx="100" cy="100" rx="250" ry="200" fill="${colors.primaryLight}" opacity="0.5"/>
    <ellipse cx="1900" cy="1900" rx="300" ry="250" fill="${colors.secondaryLight}" opacity="0.4"/>

    <!-- Main Card -->
    <rect x="120" y="120" width="1760" height="1760" rx="32" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>

    <!-- Header Bar -->
    <rect x="120" y="120" width="1760" height="200" rx="32 32 0 0" fill="url(#primaryGradient)" opacity="0.15"/>

    <!-- Header Text -->
    <text x="1000" y="250" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="600" fill="${colors.text}">${escapeXml(content.benefit.heading)}</text>

    <!-- Decorative Line -->
    <rect x="500" y="300" width="1000" height="3" rx="1.5" fill="url(#accentGradient)"/>

    <!-- Benefit Cards -->
    ${content.benefit.bullets.map((bullet, i) => {
      const y = 420 + i * 310;
      const bulletLines = wrapText(bullet, 45);
      return `
        <g transform="translate(200, ${y})">
          <!-- Card Background -->
          <rect x="0" y="0" width="1600" height="250" rx="20" fill="${colors.cardBg}" filter="url(#subtleShadow)"/>

          <!-- Number Circle -->
          <circle cx="100" cy="125" r="50" fill="${colors.primary}" opacity="0.15"/>
          <circle cx="100" cy="125" r="40" fill="${colors.cardBg}"/>
          <text x="100" y="140" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="600" fill="${colors.primary}">${i + 1}</text>

          <!-- Vertical Accent -->
          <rect x="0" y="30" width="6" height="190" rx="3" fill="${colors.primary}"/>

          <!-- Bullet Text -->
          ${bulletLines.map((line, j) => `
            <text x="180" y="${100 + j * 50}" font-family="Georgia, serif" font-size="38" fill="${colors.text}">${escapeXml(line)}</text>
          `).join('')}
        </g>
      `;
    }).join('')}

    <!-- Bottom Accent Dots -->
    <g transform="translate(900, 1800)">
      <circle cx="0" cy="0" r="10" fill="${colors.primary}" opacity="0.3"/>
      <circle cx="50" cy="0" r="10" fill="${colors.secondary}" opacity="0.3"/>
      <circle cx="100" cy="0" r="10" fill="${colors.accent}" opacity="0.3"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

async function generateProcessImage(productType: ProductType): Promise<Buffer> {
  const colors = PRODUCT_COLORS[productType];
  const content = CONTENT[productType];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(colors)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#subtlePattern)"/>

    <!-- Header -->
    <text x="1000" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="600" fill="${colors.text}">${escapeXml(content.process.heading)}</text>
    <rect x="600" y="250" width="800" height="4" rx="2" fill="url(#accentGradient)"/>

    <!-- Step Cards with Connecting Line -->
    <line x1="1000" y1="400" x2="1000" y2="1500" stroke="${colors.primary}" stroke-width="4" stroke-dasharray="12,8" opacity="0.3"/>

    ${content.process.steps.map((step, i) => {
      const y = 380 + i * 400;
      const stepLines = wrapText(step, 40);
      const isEven = i % 2 === 0;
      const cardX = isEven ? 180 : 920;
      const numberX = isEven ? 860 : 800;

      return `
        <g transform="translate(0, ${y})">
          <!-- Step Card -->
          <rect x="${cardX}" y="0" width="900" height="300" rx="24" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>

          <!-- Accent Bar -->
          <rect x="${cardX}" y="0" width="8" height="300" rx="4 0 0 4" fill="${i === 0 ? colors.primary : i === 1 ? colors.secondary : colors.accent}"/>

          <!-- Step Number Badge -->
          <circle cx="${numberX + (isEven ? 140 : 100)}" cy="150" r="55" fill="${colors.cardBg}" filter="url(#subtleShadow)"/>
          <circle cx="${numberX + (isEven ? 140 : 100)}" cy="150" r="45" fill="${i === 0 ? colors.primary : i === 1 ? colors.secondary : colors.accent}"/>
          <text x="${numberX + (isEven ? 140 : 100)}" y="168" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="white">${i + 1}</text>

          <!-- Step Text -->
          ${stepLines.map((line, j) => `
            <text x="${cardX + 60}" y="${120 + j * 50}" font-family="Georgia, serif" font-size="36" fill="${colors.text}">${escapeXml(line)}</text>
          `).join('')}
        </g>
      `;
    }).join('')}

    <!-- Subtext Card -->
    <rect x="250" y="1620" width="1500" height="140" rx="20" fill="${colors.primaryLight}" opacity="0.4"/>
    <text x="1000" y="1705" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="${colors.text}" font-style="italic">${escapeXml(content.process.subtext)}</text>

    <!-- Decorative Corners -->
    <ellipse cx="100" cy="1900" rx="150" ry="120" fill="${colors.secondaryLight}" opacity="0.5"/>
    <ellipse cx="1900" cy="100" rx="180" ry="140" fill="${colors.accentLight}" opacity="0.4"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

async function generateSampleImage(productType: ProductType): Promise<Buffer> {
  const colors = PRODUCT_COLORS[productType];
  const content = CONTENT[productType];

  // Detailed product samples
  let sampleContent = '';

  if (productType === 'vision_board') {
    sampleContent = `
      <!-- Detailed Vision Board Sample -->
      <g transform="translate(150, 150)">
        <rect x="0" y="0" width="1700" height="1300" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="10" y="10" width="1680" height="1280" rx="16" fill="none" stroke="${colors.primary}" stroke-width="2" opacity="0.3"/>

        <!-- Title Banner -->
        <rect x="0" y="0" width="1700" height="100" rx="20 20 0 0" fill="url(#primaryGradient)"/>
        <text x="850" y="70" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="600" fill="white">2025 VISION</text>

        <!-- Photo Grid - Top Row -->
        <rect x="40" y="130" width="400" height="300" rx="12" fill="${colors.primaryLight}"/>
        <rect x="460" y="130" width="400" height="300" rx="12" fill="${colors.secondaryLight}"/>
        <rect x="880" y="130" width="400" height="300" rx="12" fill="${colors.accentLight}"/>
        <rect x="1300" y="130" width="360" height="300" rx="12" fill="${colors.primaryLight}" opacity="0.7"/>

        <!-- Middle Row -->
        <rect x="40" y="450" width="600" height="380" rx="12" fill="${colors.secondaryLight}"/>
        <rect x="660" y="450" width="500" height="380" rx="12" fill="${colors.accentLight}"/>
        <rect x="1180" y="450" width="480" height="380" rx="12" fill="${colors.primaryLight}"/>

        <!-- Bottom Row -->
        <rect x="40" y="850" width="320" height="200" rx="12" fill="${colors.accentLight}"/>
        <rect x="380" y="850" width="500" height="200" rx="12" fill="${colors.primaryLight}"/>
        <rect x="900" y="850" width="380" height="200" rx="12" fill="${colors.secondaryLight}"/>
        <rect x="1300" y="850" width="360" height="200" rx="12" fill="${colors.accentLight}" opacity="0.7"/>

        <!-- Quote Boxes -->
        <rect x="80" y="1080" width="500" height="80" rx="10" fill="${colors.primary}" opacity="0.15"/>
        <text x="330" y="1130" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="${colors.text}" font-style="italic">"Make it happen"</text>

        <rect x="1120" y="1080" width="500" height="80" rx="10" fill="${colors.secondary}" opacity="0.15"/>
        <text x="1370" y="1130" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="${colors.text}" font-style="italic">"Dream big, start small"</text>

        <!-- Subtitle Banner -->
        <text x="850" y="1220" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${colors.textMuted}" letter-spacing="3">HEALTH • WEALTH • HAPPINESS • GROWTH</text>
      </g>
    `;
  } else if (productType === 'planner') {
    sampleContent = `
      <!-- Detailed Planner Sample - 3 Pages -->
      <g transform="translate(100, 150)">
        <!-- Page 1: Reflection -->
        <rect x="0" y="0" width="550" height="750" rx="12" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="15" y="15" width="520" height="60" rx="8" fill="${colors.primaryLight}"/>
        <text x="275" y="55" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="500" fill="${colors.text}">Your Reflection</text>

        <text x="40" y="120" font-family="Georgia, serif" font-size="16" fill="${colors.textMuted}" font-style="italic">What's weighing on your mind?</text>
        ${Array.from({length: 6}, (_, i) =>
          `<line x1="40" y1="${150 + i * 35}" x2="510" y2="${150 + i * 35}" stroke="${colors.primary}" stroke-width="1" opacity="0.25"/>`
        ).join('')}

        <text x="40" y="380" font-family="Georgia, serif" font-size="16" fill="${colors.textMuted}" font-style="italic">What clarity are you seeking?</text>
        ${Array.from({length: 6}, (_, i) =>
          `<line x1="40" y1="${410 + i * 35}" x2="510" y2="${410 + i * 35}" stroke="${colors.primary}" stroke-width="1" opacity="0.25"/>`
        ).join('')}

        <text x="40" y="720" font-family="Georgia, serif" font-size="14" fill="${colors.textMuted}">12</text>

        <!-- Page 2: Prompts -->
        <rect x="620" y="0" width="550" height="750" rx="12" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="635" y="15" width="520" height="60" rx="8" fill="${colors.secondaryLight}"/>
        <text x="895" y="55" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="500" fill="${colors.text}">Guided Prompts</text>

        <g transform="translate(660, 100)">
          ${['Consider: What would you tell a friend in this situation?', 'Notice: What emotions come up when you think about this?', 'Explore: What would "enough" look like for you?'].map((prompt, i) => `
            <rect x="0" y="${i * 200}" width="480" height="170" rx="10" fill="${colors.primaryLight}" opacity="0.3"/>
            <text x="20" y="${i * 200 + 35}" font-family="Georgia, serif" font-size="16" fill="${colors.text}">${escapeXml(prompt)}</text>
            <line x1="20" y1="${i * 200 + 70}" x2="460" y2="${i * 200 + 70}" stroke="${colors.primary}" stroke-width="1" opacity="0.3"/>
            <line x1="20" y1="${i * 200 + 110}" x2="460" y2="${i * 200 + 110}" stroke="${colors.primary}" stroke-width="1" opacity="0.3"/>
            <line x1="20" y1="${i * 200 + 150}" x2="460" y2="${i * 200 + 150}" stroke="${colors.primary}" stroke-width="1" opacity="0.3"/>
          `).join('')}
        </g>

        <text x="1130" y="720" text-anchor="end" font-family="Georgia, serif" font-size="14" fill="${colors.textMuted}">13</text>

        <!-- Page 3: Next Steps -->
        <rect x="1240" y="0" width="550" height="750" rx="12" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>
        <rect x="1255" y="15" width="520" height="60" rx="8" fill="${colors.accentLight}"/>
        <text x="1515" y="55" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="500" fill="${colors.text}">Your Next Steps</text>

        <text x="1280" y="120" font-family="Georgia, serif" font-size="16" fill="${colors.textMuted}">Based on your reflections, here are gentle next steps:</text>

        <g transform="translate(1280, 160)">
          ${Array.from({length: 8}, (_, i) => `
            <rect x="0" y="${i * 65}" width="26" height="26" rx="6" fill="none" stroke="${colors.accent}" stroke-width="2"/>
            <line x1="45" y1="${i * 65 + 20}" x2="470" y2="${i * 65 + 20}" stroke="${colors.primary}" stroke-width="1" opacity="0.25"/>
          `).join('')}
        </g>

        <rect x="1280" y="700" width="480" height="30" rx="4" fill="${colors.accent}" opacity="0.1"/>
        <text x="1520" y="722" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${colors.textMuted}" font-style="italic">Take it one step at a time</text>
      </g>
    `;
  } else {
    sampleContent = `
      <!-- Detailed Flash Cards Sample -->
      <g transform="translate(100, 150)">
        <!-- Card Grid - Print Layout -->
        <rect x="0" y="0" width="1800" height="1200" rx="20" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>

        <!-- Row 1 -->
        <g transform="translate(50, 50)">
          <rect x="0" y="0" width="520" height="330" rx="16" fill="${colors.cardBg}" stroke="${colors.primary}" stroke-width="3"/>
          <rect x="0" y="0" width="520" height="55" rx="16 16 0 0" fill="${colors.primary}"/>
          <text x="260" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="white">ADDITION</text>
          <text x="260" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="${colors.text}">8 + 4 = ?</text>
        </g>

        <g transform="translate(620, 50)">
          <rect x="0" y="0" width="520" height="330" rx="16" fill="${colors.cardBg}" stroke="${colors.secondary}" stroke-width="3"/>
          <rect x="0" y="0" width="520" height="55" rx="16 16 0 0" fill="${colors.secondary}"/>
          <text x="260" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="white">SIGHT WORD</text>
          <text x="260" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="${colors.text}">because</text>
        </g>

        <g transform="translate(1190, 50)">
          <rect x="0" y="0" width="520" height="330" rx="16" fill="${colors.cardBg}" stroke="${colors.accent}" stroke-width="3"/>
          <rect x="0" y="0" width="520" height="55" rx="16 16 0 0" fill="${colors.accent}"/>
          <text x="260" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="white">PHONICS</text>
          <text x="260" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${colors.text}">sh-</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(50, 420)">
          <rect x="0" y="0" width="520" height="330" rx="16" fill="${colors.cardBg}" stroke="${colors.accent}" stroke-width="3"/>
          <rect x="0" y="0" width="520" height="55" rx="16 16 0 0" fill="${colors.accent}"/>
          <text x="260" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="white">MULTIPLICATION</text>
          <text x="260" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="${colors.text}">7 × 8 = ?</text>
        </g>

        <g transform="translate(620, 420)">
          <rect x="0" y="0" width="520" height="330" rx="16" fill="${colors.cardBg}" stroke="${colors.primary}" stroke-width="3"/>
          <rect x="0" y="0" width="520" height="55" rx="16 16 0 0" fill="${colors.primary}"/>
          <text x="260" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="white">VOCABULARY</text>
          <text x="260" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="bold" fill="${colors.text}">enormous</text>
        </g>

        <g transform="translate(1190, 420)">
          <rect x="0" y="0" width="520" height="330" rx="16" fill="${colors.cardBg}" stroke="${colors.secondary}" stroke-width="3"/>
          <rect x="0" y="0" width="520" height="55" rx="16 16 0 0" fill="${colors.secondary}"/>
          <text x="260" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="white">SUBTRACTION</text>
          <text x="260" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="${colors.text}">15 - 7 = ?</text>
        </g>

        <!-- Cut Lines -->
        <line x1="570" y1="30" x2="570" y2="770" stroke="${colors.textMuted}" stroke-width="2" stroke-dasharray="10,5" opacity="0.4"/>
        <line x1="1140" y1="30" x2="1140" y2="770" stroke="${colors.textMuted}" stroke-width="2" stroke-dasharray="10,5" opacity="0.4"/>
        <line x1="30" y1="400" x2="1720" y2="400" stroke="${colors.textMuted}" stroke-width="2" stroke-dasharray="10,5" opacity="0.4"/>

        <!-- Print Instructions -->
        <rect x="50" y="800" width="1660" height="350" rx="12" fill="${colors.primaryLight}" opacity="0.3"/>
        <text x="880" y="860" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="500" fill="${colors.text}">Print at home • Cut along dotted lines • Learn and play!</text>

        <g transform="translate(200, 920)">
          <circle cx="0" cy="30" r="20" fill="${colors.primary}"/>
          <text x="0" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white">1</text>
          <text x="50" y="40" font-family="Georgia, serif" font-size="22" fill="${colors.text}">Print on cardstock</text>
        </g>

        <g transform="translate(600, 920)">
          <circle cx="0" cy="30" r="20" fill="${colors.secondary}"/>
          <text x="0" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white">2</text>
          <text x="50" y="40" font-family="Georgia, serif" font-size="22" fill="${colors.text}">Cut along lines</text>
        </g>

        <g transform="translate(1000, 920)">
          <circle cx="0" cy="30" r="20" fill="${colors.accent}"/>
          <text x="0" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white">3</text>
          <text x="50" y="40" font-family="Georgia, serif" font-size="22" fill="${colors.text}">Practice and learn!</text>
        </g>
      </g>
    `;
  }

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(colors)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#subtlePattern)"/>

    <!-- Sample Content -->
    ${sampleContent}

    <!-- Overlay Banner -->
    <rect x="150" y="1550" width="1700" height="130" rx="20" fill="${colors.primary}" filter="url(#subtleShadow)"/>
    <text x="1000" y="1630" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="white">${escapeXml(content.sample.overlayText)}</text>

    <!-- Decorative Corners -->
    <ellipse cx="80" cy="80" rx="120" ry="100" fill="${colors.secondaryLight}" opacity="0.5"/>
    <ellipse cx="1920" cy="1920" rx="140" ry="110" fill="${colors.accentLight}" opacity="0.5"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

async function generateReviewsImage(productType: ProductType): Promise<Buffer> {
  const colors = PRODUCT_COLORS[productType];
  const content = CONTENT[productType];

  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${getGradientDefs(colors)}

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGradient)"/>
    <rect width="100%" height="100%" fill="url(#subtlePattern)"/>

    <!-- Decorative Elements -->
    <ellipse cx="150" cy="150" rx="200" ry="150" fill="${colors.primaryLight}" opacity="0.5"/>
    <ellipse cx="1850" cy="1850" rx="220" ry="180" fill="${colors.secondaryLight}" opacity="0.4"/>
    <ellipse cx="1800" cy="300" rx="150" ry="120" fill="${colors.accentLight}" opacity="0.3"/>

    <!-- Header -->
    <text x="1000" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="58" font-weight="600" fill="${colors.text}">${escapeXml(content.reviews.heading)}</text>
    <rect x="550" y="280" width="900" height="4" rx="2" fill="url(#accentGradient)"/>

    <!-- Quote Cards -->
    ${content.reviews.reactions.map((reaction, i) => {
      const y = 420 + i * 400;
      const reactionLines = wrapText(reaction, 38);
      const accentColors = [colors.primary, colors.secondary, colors.accent];

      return `
        <g transform="translate(180, ${y})">
          <!-- Card -->
          <rect x="0" y="0" width="1640" height="320" rx="24" fill="${colors.cardBg}" filter="url(#premiumShadow)"/>

          <!-- Left Accent Bar -->
          <rect x="0" y="0" width="10" height="320" rx="24 0 0 24" fill="${accentColors[i]}"/>

          <!-- Large Quote Mark -->
          <text x="80" y="140" font-family="Georgia, serif" font-size="180" fill="${accentColors[i]}" opacity="0.12">"</text>

          <!-- Reaction Text -->
          ${reactionLines.map((line, j) => `
            <text x="180" y="${140 + j * 60}" font-family="Georgia, serif" font-size="44" fill="${colors.text}" font-style="italic">${escapeXml(line)}</text>
          `).join('')}

          <!-- Decorative Dots -->
          <g transform="translate(1450, 160)">
            <circle cx="0" cy="0" r="8" fill="${colors.primary}" opacity="0.4"/>
            <circle cx="30" cy="0" r="8" fill="${colors.secondary}" opacity="0.4"/>
            <circle cx="60" cy="0" r="8" fill="${colors.accent}" opacity="0.4"/>
          </g>
        </g>
      `;
    }).join('')}

    <!-- Subtext (if present) -->
    ${content.reviews.subtext ? `
      <rect x="300" y="1700" width="1400" height="110" rx="20" fill="${colors.primaryLight}" opacity="0.5"/>
      <text x="1000" y="1770" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${colors.text}" font-style="italic">${escapeXml(content.reviews.subtext)}</text>
    ` : ''}

    <!-- Bottom Flourish -->
    <path d="M700 ${content.reviews.subtext ? '1880' : '1780'} Q1000 ${content.reviews.subtext ? '1820' : '1720'} 1300 ${content.reviews.subtext ? '1880' : '1780'}" stroke="${colors.primary}" stroke-width="3" fill="none" opacity="0.35"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

// ============================================================
// MAIN GENERATION FUNCTION
// ============================================================

async function generateListingImages(productType: ProductType): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENERATING PREMIUM LISTING IMAGES: ${productType.toUpperCase()}`);
  console.log('='.repeat(60));

  const outputDir = path.join(BASE_DIR, productType, 'images');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const images = [
    { name: '01_hero.png', generator: generateHeroImage },
    { name: '02_benefit.png', generator: generateBenefitImage },
    { name: '03_process.png', generator: generateProcessImage },
    { name: '04_sample.png', generator: generateSampleImage },
    { name: '05_reviews.png', generator: generateReviewsImage }
  ];

  for (const { name, generator } of images) {
    console.log(`  Generating ${name}...`);
    try {
      const buffer = await generator(productType);
      const outputPath = path.join(outputDir, name);
      fs.writeFileSync(outputPath, buffer);
      const stats = fs.statSync(outputPath);
      console.log(`    ✓ Saved: ${outputPath} (${(stats.size / 1024).toFixed(0)}KB)`);
    } catch (error) {
      console.error(`    ✗ Error: ${(error as Error).message}`);
    }
  }

  console.log(`\n✓ Completed ${productType} premium listing images`);
}

// ============================================================
// CLI
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  // Determine which product(s) to generate
  let products: ProductType[] = [];

  if (args.includes('--all') || args.includes('all')) {
    products = ['vision_board', 'planner', 'flash_cards'];
  } else if (args.includes('vision') || args.includes('vision_board')) {
    products = ['vision_board'];
  } else if (args.includes('planner')) {
    products = ['planner'];
  } else if (args.includes('flash') || args.includes('flash_cards')) {
    products = ['flash_cards'];
  } else {
    // Default: generate all
    products = ['vision_board', 'planner', 'flash_cards'];
  }

  console.log('\n' + '='.repeat(60));
  console.log('PREMIUM ETSY LISTING IMAGE GENERATOR');
  console.log('='.repeat(60));
  console.log(`Products: ${products.join(', ')}`);
  console.log(`Output: ${BASE_DIR}`);
  console.log(`Resolution: ${CANVAS_WIDTH}x${CANVAS_HEIGHT} (high-quality PNG)`);

  for (const product of products) {
    await generateListingImages(product);
  }

  console.log('\n' + '='.repeat(60));
  console.log('GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\nGenerated premium images:');
  for (const product of products) {
    console.log(`  listing_packets/${product}/images/`);
    console.log('    01_hero.png     - Main product showcase');
    console.log('    02_benefit.png  - Why this is different');
    console.log('    03_process.png  - How it works');
    console.log('    04_sample.png   - Sample preview');
    console.log('    05_reviews.png  - Aspirational reactions');
  }
  console.log('');
}

main().catch(console.error);
