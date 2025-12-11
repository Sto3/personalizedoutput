/**
 * Themed Hero Images for Etsy Listings
 *
 * Creates hero images that showcase REAL product examples:
 * - Vision Boards: "Built Different" (masculine) + "My Healing Journey" (feminine)
 * - Planners: Scattered thoughts → Organized clarity transformation
 * - Flash Cards: Dinosaur theme featured prominently
 *
 * Usage:
 *   npm run listing:images:hero
 *   npm run listing:images:hero:vision
 *   npm run listing:images:hero:planner
 *   npm run listing:images:hero:flash
 */

import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const BASE_DIR = path.join(__dirname, '..', 'listing_packets');

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// SVG Icons (no emojis - system font compatible)
function iconSparkle(x: number, y: number, size: number = 20, color: string = '#D4A43A'): string {
  return `<g transform="translate(${x}, ${y})">
    <path d="M0,${-size} L${size * 0.25},${-size * 0.25} L${size},0 L${size * 0.25},${size * 0.25} L0,${size} L${-size * 0.25},${size * 0.25} L${-size},0 L${-size * 0.25},${-size * 0.25} Z" fill="${color}"/>
  </g>`;
}

function iconHeart(x: number, y: number, size: number = 24, color: string = '#E86B55'): string {
  const s = size / 24;
  return `<g transform="translate(${x}, ${y}) scale(${s})">
    <path d="M0,6 C-6,-6 -18,-6 -12,-18 C-6,-24 0,-18 0,-12 C0,-18 6,-24 12,-18 C18,-6 6,-6 0,6 Z" fill="${color}"/>
  </g>`;
}

function iconStar(x: number, y: number, size: number = 24, color: string = '#E8B830'): string {
  const s = size / 24;
  return `<g transform="translate(${x}, ${y}) scale(${s})">
    <polygon points="12,0 15,9 24,9 17,15 20,24 12,18 4,24 7,15 0,9 9,9" fill="${color}"/>
  </g>`;
}

function iconCheck(x: number, y: number, size: number = 24, color: string = '#50B89A'): string {
  return `<g transform="translate(${x}, ${y})">
    <circle cx="0" cy="0" r="${size / 2}" fill="${color}"/>
    <path d="M${-size * 0.25},0 L${-size * 0.08},${size * 0.2} L${size * 0.25},${-size * 0.2}" fill="none" stroke="#FFFFFF" stroke-width="${size * 0.12}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function iconGift(x: number, y: number, size: number = 32, color: string = '#9B7BB8'): string {
  const s = size / 32;
  return `<g transform="translate(${x}, ${y}) scale(${s})">
    <rect x="-14" y="-4" width="28" height="22" rx="3" fill="${color}"/>
    <rect x="-16" y="-8" width="32" height="8" rx="2" fill="${color}"/>
    <rect x="-2" y="-8" width="4" height="26" fill="#FFFFFF" opacity="0.5"/>
    <path d="M-2,-8 Q-8,-16 -14,-12 Q-18,-8 -10,-6" fill="none" stroke="${color}" stroke-width="3"/>
    <path d="M2,-8 Q8,-16 14,-12 Q18,-8 10,-6" fill="none" stroke="${color}" stroke-width="3"/>
  </g>`;
}

function iconPalette(x: number, y: number, size: number = 32, color: string = '#4A93B8'): string {
  return `<g transform="translate(${x}, ${y})">
    <ellipse cx="0" cy="0" rx="${size * 0.6}" ry="${size * 0.5}" fill="${color}"/>
    <circle cx="${-size * 0.25}" cy="${-size * 0.15}" r="${size * 0.12}" fill="#E86B55"/>
    <circle cx="${size * 0.15}" cy="${-size * 0.2}" r="${size * 0.1}" fill="#E8B830"/>
    <circle cx="${size * 0.3}" cy="${size * 0.05}" r="${size * 0.08}" fill="#50B89A"/>
    <circle cx="${-size * 0.1}" cy="${size * 0.15}" r="${size * 0.1}" fill="#9B7BB8"/>
    <ellipse cx="${size * 0.35}" cy="${size * 0.25}" rx="${size * 0.15}" ry="${size * 0.2}" fill="#FFFFFF"/>
  </g>`;
}

function iconPhone(x: number, y: number, size: number = 32, color: string = '#4A93B8'): string {
  const s = size / 32;
  return `<g transform="translate(${x}, ${y}) scale(${s})">
    <rect x="-10" y="-16" width="20" height="32" rx="3" fill="${color}"/>
    <rect x="-8" y="-12" width="16" height="22" fill="#FFFFFF"/>
    <circle cx="0" cy="12" r="2" fill="#FFFFFF"/>
  </g>`;
}

function iconDumbbell(x: number, y: number, size: number = 40, color: string = '#C9A962'): string {
  const s = size / 40;
  return `<g transform="translate(${x}, ${y}) scale(${s})">
    <rect x="-25" y="-4" width="50" height="8" rx="2" fill="${color}"/>
    <rect x="-32" y="-12" width="10" height="24" rx="2" fill="${color}"/>
    <rect x="22" y="-12" width="10" height="24" rx="2" fill="${color}"/>
    <rect x="-36" y="-14" width="6" height="28" rx="2" fill="${color}" opacity="0.8"/>
    <rect x="30" y="-14" width="6" height="28" rx="2" fill="${color}" opacity="0.8"/>
  </g>`;
}

function iconButterfly(x: number, y: number, size: number = 50, color1: string = '#D4A5A5', color2: string = '#95B8A0'): string {
  const s = size / 50;
  return `<g transform="translate(${x}, ${y}) scale(${s})">
    <ellipse cx="-18" cy="-8" rx="20" ry="18" fill="${color1}" opacity="0.8"/>
    <ellipse cx="18" cy="-8" rx="20" ry="18" fill="${color1}" opacity="0.8"/>
    <ellipse cx="-14" cy="12" rx="14" ry="12" fill="${color2}" opacity="0.7"/>
    <ellipse cx="14" cy="12" rx="14" ry="12" fill="${color2}" opacity="0.7"/>
    <ellipse cx="0" cy="0" rx="5" ry="22" fill="#4A3B3B"/>
    <path d="M-2,-22 Q-10,-30 -12,-28" fill="none" stroke="#4A3B3B" stroke-width="2"/>
    <path d="M2,-22 Q10,-30 12,-28" fill="none" stroke="#4A3B3B" stroke-width="2"/>
  </g>`;
}

// ============================================================
// VISION BOARD HERO - Shows "Built Different" and "Healing Journey" themes
// ============================================================

function generateVisionBoardHero(): string {
  // Dark masculine theme colors
  const darkTheme = {
    bg: '#1A1A1A',
    accent: '#C9A962', // Gold
    text: '#E8E8E8',
    red: '#8B2020',
    gray: '#3A3A3A'
  };

  // Soft feminine theme colors
  const lightTheme = {
    bg: '#FDF5F0',
    accent: '#D4A5A5', // Rose
    accent2: '#95B8A0', // Sage
    accent3: '#A8C5DB', // Sky blue
    text: '#4A3B3B'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F4F0"/>
      <stop offset="50%" style="stop-color:#FDF8F5"/>
      <stop offset="100%" style="stop-color:#F5EFE8"/>
    </linearGradient>

    <linearGradient id="darkBoardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1A1A1A"/>
      <stop offset="100%" style="stop-color:#2A2A2A"/>
    </linearGradient>

    <linearGradient id="lightBoardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FDF5F0"/>
      <stop offset="100%" style="stop-color:#FBF0E8"/>
    </linearGradient>

    <filter id="boardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="25" flood-color="#000000" flood-opacity="0.2"/>
    </filter>

    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Main background -->
  <rect width="100%" height="100%" fill="url(#mainBg)"/>

  <!-- Decorative elements -->
  <circle cx="150" cy="200" r="80" fill="#E8D5F0" opacity="0.4"/>
  <circle cx="1850" cy="300" r="100" fill="#C8E6D8" opacity="0.4"/>
  <circle cx="100" cy="1800" r="60" fill="#FADDD0" opacity="0.5"/>
  <circle cx="1900" cy="1700" r="90" fill="#E8D5F0" opacity="0.3"/>

  <!-- Sparkles -->
  ${iconSparkle(300, 400, 15, '#D4A43A')}
  ${iconSparkle(1700, 500, 18, '#C9A962')}
  ${iconSparkle(200, 1200, 12, '#D4A43A')}
  ${iconSparkle(1800, 1100, 16, '#C9A962')}

  <!-- HEADER -->
  <text x="1000" y="150" text-anchor="middle" font-size="72" font-weight="900" fill="#3D3040" font-family="Georgia, serif">
    Custom Vision Boards
  </text>
  <text x="1000" y="220" text-anchor="middle" font-size="42" fill="#6B5F70" font-family="Georgia, serif">
    Designed around YOUR story - not a generic template
  </text>
  <rect x="700" y="260" width="600" height="4" rx="2" fill="#9B7BB8" opacity="0.6"/>

  <!-- LEFT BOARD: "BUILT DIFFERENT" (Dark/Masculine) -->
  <g transform="translate(80, 320)">
    <rect x="0" y="0" width="880" height="1100" rx="24" fill="url(#darkBoardBg)" filter="url(#boardShadow)"/>
    <rect x="8" y="8" width="864" height="1084" rx="20" fill="none" stroke="${darkTheme.accent}" stroke-width="3" opacity="0.5"/>

    <!-- Title banner -->
    <rect x="240" y="40" width="400" height="60" rx="8" fill="${darkTheme.accent}"/>
    <text x="440" y="82" text-anchor="middle" font-size="32" font-weight="800" fill="${darkTheme.bg}" font-family="Arial, sans-serif">
      BUILT DIFFERENT
    </text>

    <!-- Content grid -->
    ${generateBuiltDifferentContent(darkTheme)}

    <!-- Motivational words -->
    <text x="150" y="980" font-size="28" font-weight="700" fill="${darkTheme.accent}" transform="rotate(-8, 150, 980)">DISCIPLINE</text>
    <text x="550" y="1000" font-size="24" font-weight="700" fill="${darkTheme.text}" opacity="0.8" transform="rotate(5, 550, 1000)">GRIND</text>
    <text x="720" y="960" font-size="22" font-weight="700" fill="${darkTheme.accent}" transform="rotate(-3, 720, 960)">FOCUS</text>

    <!-- Label -->
    <rect x="20" y="1040" width="220" height="40" rx="6" fill="${darkTheme.gray}"/>
    ${iconDumbbell(50, 1060, 28, darkTheme.accent)}
    <text x="140" y="1068" text-anchor="middle" font-size="18" fill="${darkTheme.text}" font-family="Arial, sans-serif">Fitness Focus</text>
  </g>

  <!-- RIGHT BOARD: "MY HEALING JOURNEY" (Light/Feminine) -->
  <g transform="translate(1040, 320)">
    <rect x="0" y="0" width="880" height="1100" rx="24" fill="url(#lightBoardBg)" filter="url(#boardShadow)"/>
    <rect x="8" y="8" width="864" height="1084" rx="20" fill="none" stroke="${lightTheme.accent}" stroke-width="3" opacity="0.6"/>

    <!-- Title banner -->
    <rect x="180" y="40" width="520" height="60" rx="30" fill="${lightTheme.accent}" opacity="0.9"/>
    <text x="440" y="82" text-anchor="middle" font-size="30" font-weight="700" fill="#FFFFFF" font-family="Georgia, serif">
      My Healing Journey
    </text>

    <!-- Content grid -->
    ${generateHealingJourneyContent(lightTheme)}

    <!-- Gentle words -->
    <text x="120" y="970" font-size="24" font-weight="600" fill="${lightTheme.accent}" font-style="italic" transform="rotate(-5, 120, 970)">peace</text>
    <text x="400" y="990" font-size="22" font-weight="600" fill="${lightTheme.accent2}" font-style="italic">growth</text>
    <text x="680" y="965" font-size="26" font-weight="600" fill="${lightTheme.accent3}" font-style="italic" transform="rotate(5, 680, 965)">hope</text>

    <!-- Label -->
    <rect x="20" y="1040" width="220" height="40" rx="20" fill="${lightTheme.accent}" opacity="0.3"/>
    ${iconButterfly(50, 1060, 30, lightTheme.accent, lightTheme.accent2)}
    <text x="140" y="1068" text-anchor="middle" font-size="18" fill="${lightTheme.text}" font-family="Georgia, serif">Healing + Growth</text>
  </g>

  <!-- BOTTOM SECTION -->
  <g transform="translate(0, 1480)">
    <!-- Feature badges -->
    <g transform="translate(200, 50)">
      ${generateFeatureBadgeNoEmoji(0, iconSparkle, 'Personalized', 'to your story', '#D4A43A')}
      ${generateFeatureBadgeNoEmoji(400, iconPalette, 'Choose your', 'aesthetic vibe', '#4A93B8')}
      ${generateFeatureBadgeNoEmoji(800, iconPhone, 'Digital + Print', 'ready formats', '#50B89A')}
      ${generateFeatureBadgeNoEmoji(1200, iconGift, 'Perfect gift', 'for loved ones', '#9B7BB8')}
    </g>

    <!-- CTA -->
    <rect x="500" y="200" width="1000" height="100" rx="50" fill="#9B7BB8"/>
    <text x="1000" y="265" text-anchor="middle" font-size="38" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">
      Tell Us Your Story - We Create Your Board
    </text>
  </g>

  <!-- Price badge -->
  <g transform="translate(1700, 100)">
    <circle cx="0" cy="0" r="80" fill="#5DAB8B"/>
    <text x="0" y="-10" text-anchor="middle" font-size="32" font-weight="900" fill="#FFFFFF">$14.99</text>
    <text x="0" y="25" text-anchor="middle" font-size="18" fill="#FFFFFF" opacity="0.9">Digital</text>
  </g>
</svg>`;
}

function generateFeatureBadgeNoEmoji(x: number, iconFn: Function, line1: string, line2: string, iconColor: string): string {
  return `
    <g transform="translate(${x}, 0)">
      <rect x="0" y="0" width="320" height="90" rx="45" fill="#FFFFFF" filter="url(#softShadow)"/>
      ${iconFn(45, 45, 28, iconColor)}
      <text x="95" y="42" font-size="20" font-weight="600" fill="#3D3040" font-family="Arial, sans-serif">${escapeXml(line1)}</text>
      <text x="95" y="68" font-size="18" fill="#6B5F70" font-family="Arial, sans-serif">${escapeXml(line2)}</text>
    </g>
  `;
}

function generateBuiltDifferentContent(theme: any): string {
  return `
    <!-- Row 1 -->
    <g transform="translate(40, 130)">
      <!-- Dumbbell card -->
      <rect x="30" y="30" width="180" height="180" rx="12" fill="${theme.gray}"/>
      ${iconDumbbell(120, 120, 60, theme.accent)}

      <!-- Quote card -->
      <rect x="230" y="30" width="340" height="180" rx="12" fill="${theme.gray}"/>
      <text x="400" y="100" text-anchor="middle" font-size="22" font-weight="700" fill="${theme.accent}" font-family="Arial, sans-serif">NO EXCUSES</text>
      <text x="400" y="135" text-anchor="middle" font-size="16" fill="${theme.text}" opacity="0.8" font-family="Arial, sans-serif">Champions are made</text>
      <text x="400" y="160" text-anchor="middle" font-size="16" fill="${theme.text}" opacity="0.8" font-family="Arial, sans-serif">when no one is watching</text>

      <!-- Boxing glove card -->
      <rect x="590" y="30" width="180" height="180" rx="12" fill="${theme.red}" opacity="0.9"/>
      ${drawBoxingGlove(680, 120, theme.accent)}
    </g>

    <!-- Row 2 -->
    <g transform="translate(40, 340)">
      <!-- Weight plate -->
      <rect x="30" y="0" width="260" height="200" rx="12" fill="${theme.gray}"/>
      ${drawWeightPlate(160, 100, theme.accent)}

      <!-- Running figure -->
      <rect x="310" y="0" width="200" height="200" rx="12" fill="${theme.gray}"/>
      ${drawRunningFigure(410, 100, theme.text)}

      <!-- 5AM CLUB -->
      <rect x="530" y="0" width="240" height="200" rx="12" fill="${theme.accent}"/>
      <text x="650" y="85" text-anchor="middle" font-size="42" font-weight="900" fill="${theme.bg}" font-family="Arial, sans-serif">5AM</text>
      <text x="650" y="130" text-anchor="middle" font-size="28" font-weight="700" fill="${theme.bg}" font-family="Arial, sans-serif">CLUB</text>
      <text x="650" y="165" text-anchor="middle" font-size="16" fill="${theme.bg}" opacity="0.8">Rise and Grind</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(40, 570)">
      <!-- Progress bar -->
      <rect x="30" y="0" width="350" height="160" rx="12" fill="${theme.gray}"/>
      <text x="205" y="50" text-anchor="middle" font-size="18" fill="${theme.text}" font-family="Arial, sans-serif">PROGRESS</text>
      <rect x="60" y="80" width="290" height="20" rx="10" fill="${theme.bg}" opacity="0.3"/>
      <rect x="60" y="80" width="220" height="20" rx="10" fill="${theme.accent}"/>
      <text x="205" y="130" text-anchor="middle" font-size="14" fill="${theme.accent}">75% to goal</text>

      <!-- Muscle arm -->
      <rect x="400" y="0" width="160" height="160" rx="12" fill="${theme.gray}"/>
      ${drawMuscleArm(480, 80, theme.accent)}

      <!-- Trophy -->
      <rect x="580" y="0" width="190" height="160" rx="12" fill="${theme.gray}"/>
      ${drawTrophy(675, 80, theme.accent)}
    </g>

    <!-- Row 4 -->
    <g transform="translate(40, 760)">
      <!-- Protein shake -->
      <rect x="30" y="0" width="140" height="140" rx="12" fill="${theme.gray}"/>
      ${drawProteinShake(100, 70, theme.accent)}

      <!-- Heartbeat -->
      <rect x="190" y="0" width="180" height="140" rx="12" fill="${theme.gray}"/>
      ${drawHeartbeat(280, 70, theme.accent)}

      <!-- Clock -->
      <rect x="390" y="0" width="140" height="140" rx="12" fill="${theme.gray}"/>
      ${drawClock(460, 70, theme.text)}

      <!-- Fire/motivation -->
      <rect x="550" y="0" width="220" height="140" rx="12" fill="${theme.red}" opacity="0.8"/>
      ${drawFlame(660, 70, theme.accent)}
    </g>
  `;
}

function generateHealingJourneyContent(theme: any): string {
  return `
    <!-- Row 1 -->
    <g transform="translate(40, 130)">
      <!-- Butterfly -->
      <rect x="30" y="30" width="180" height="180" rx="16" fill="${theme.accent}" opacity="0.2"/>
      ${iconButterfly(120, 120, 80, theme.accent, theme.accent2)}

      <!-- Affirmation -->
      <rect x="230" y="30" width="340" height="180" rx="16" fill="#FFFFFF" opacity="0.9"/>
      <text x="400" y="90" text-anchor="middle" font-size="20" fill="${theme.text}" font-family="Georgia, serif" font-style="italic">"I am worthy of</text>
      <text x="400" y="120" text-anchor="middle" font-size="20" fill="${theme.text}" font-family="Georgia, serif" font-style="italic">love, peace, and</text>
      <text x="400" y="150" text-anchor="middle" font-size="20" fill="${theme.text}" font-family="Georgia, serif" font-style="italic">happiness"</text>
      ${iconHeart(540, 175, 16, theme.accent)}

      <!-- Rose -->
      <rect x="590" y="30" width="180" height="180" rx="16" fill="${theme.accent}" opacity="0.15"/>
      ${drawRose(680, 120, theme.accent)}
    </g>

    <!-- Row 2 -->
    <g transform="translate(40, 340)">
      <!-- Meditation -->
      <rect x="30" y="0" width="200" height="200" rx="16" fill="${theme.accent2}" opacity="0.2"/>
      ${drawMeditationPose(130, 100, theme.accent2)}

      <!-- Journal -->
      <rect x="250" y="0" width="240" height="200" rx="16" fill="#FFFFFF" opacity="0.9"/>
      ${drawJournal(370, 100, theme.accent)}
      <text x="370" y="170" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">Self-reflection</text>

      <!-- Candle -->
      <rect x="510" y="0" width="260" height="200" rx="16" fill="${theme.accent3}" opacity="0.2"/>
      ${drawCandle(640, 90, theme.accent)}
      <text x="640" y="175" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">Inner peace</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(40, 570)">
      <!-- Plant -->
      <rect x="30" y="0" width="180" height="160" rx="16" fill="${theme.accent2}" opacity="0.15"/>
      ${drawPlant(120, 80, theme.accent2)}

      <!-- Moon phases -->
      <rect x="230" y="0" width="280" height="160" rx="16" fill="${theme.accent3}" opacity="0.2"/>
      ${drawMoonPhases(370, 70, '#4A3B3B')}
      <text x="370" y="140" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">Trust the process</text>

      <!-- Heart in hands -->
      <rect x="530" y="0" width="240" height="160" rx="16" fill="${theme.accent}" opacity="0.15"/>
      ${drawHeartInHands(650, 70, theme.accent)}
      <text x="650" y="145" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">Self-love</text>
    </g>

    <!-- Row 4 -->
    <g transform="translate(40, 760)">
      <!-- Tea cup -->
      <rect x="30" y="0" width="160" height="140" rx="16" fill="${theme.accent2}" opacity="0.2"/>
      ${drawTeaCup(110, 65, theme.accent2)}

      <!-- Cloud -->
      <rect x="210" y="0" width="180" height="140" rx="16" fill="${theme.accent3}" opacity="0.15"/>
      ${drawCloud(300, 60, '#FFFFFF')}

      <!-- Feather -->
      <rect x="410" y="0" width="150" height="140" rx="16" fill="${theme.accent}" opacity="0.15"/>
      ${drawFeather(485, 70, theme.accent)}

      <!-- Rainbow -->
      <rect x="580" y="0" width="190" height="140" rx="16" fill="#FFFFFF" opacity="0.9"/>
      ${drawRainbow(675, 50, theme)}
      <text x="675" y="120" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">New beginnings</text>
    </g>
  `;
}

// Illustration helpers
function drawBoxingGlove(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <ellipse cx="0" cy="0" rx="45" ry="40" fill="${color}"/>
      <ellipse cx="-15" cy="-20" rx="20" ry="18" fill="${color}"/>
      <ellipse cx="-40" cy="-5" rx="15" ry="12" fill="${color}" opacity="0.9"/>
      <rect x="-25" y="30" width="50" height="25" rx="6" fill="${color}" opacity="0.8"/>
      <path d="M-20,5 Q0,-15 20,5" fill="none" stroke="#1A1A1A" stroke-width="2" opacity="0.5"/>
    </g>
  `;
}

function drawWeightPlate(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="0" r="55" fill="none" stroke="${color}" stroke-width="20"/>
      <circle cx="0" cy="0" r="15" fill="#3A3A3A"/>
      <text x="0" y="8" text-anchor="middle" font-size="24" font-weight="900" fill="${color}">45</text>
    </g>
  `;
}

function drawRunningFigure(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="-35" r="15" fill="${color}"/>
      <line x1="0" y1="-20" x2="-5" y2="10" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      <line x1="-5" y1="-10" x2="-30" y2="-25" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <line x1="-5" y1="-10" x2="25" y2="5" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <line x1="-5" y1="10" x2="-30" y2="40" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      <line x1="-5" y1="10" x2="25" y2="35" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
    </g>
  `;
}

function drawMuscleArm(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-30,30 Q-20,10 0,0" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>
      <path d="M0,0 Q15,-25 5,-40" fill="none" stroke="${color}" stroke-width="20" stroke-linecap="round"/>
      <ellipse cx="10" cy="-20" rx="18" ry="15" fill="${color}"/>
      <circle cx="-30" cy="35" r="14" fill="${color}"/>
    </g>
  `;
}

function drawTrophy(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-25,-40 L-30,-10 Q-30,15 0,20 Q30,15 30,-10 L25,-40 Z" fill="${color}"/>
      <path d="M-30,-25 Q-50,-20 -45,5 Q-40,15 -25,10" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      <path d="M30,-25 Q50,-20 45,5 Q40,15 25,10" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      <rect x="-20" y="20" width="40" height="8" fill="${color}"/>
      <rect x="-28" y="28" width="56" height="12" rx="3" fill="${color}"/>
      ${iconStar(0, -10, 20, '#1A1A1A')}
    </g>
  `;
}

function drawProteinShake(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-20,-35 L-25,30 L25,30 L20,-35 Z" fill="${color}" opacity="0.9"/>
      <rect x="-22" y="-42" width="44" height="10" rx="3" fill="${color}"/>
      <rect x="5" y="-55" width="6" height="50" fill="${color}" opacity="0.7"/>
      <path d="M-15,0 Q0,-10 15,0" fill="none" stroke="#1A1A1A" stroke-width="2" opacity="0.3"/>
    </g>
  `;
}

function drawHeartbeat(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M0,15 C-30,-15 -50,-30 -25,-45 C0,-60 0,-30 0,-15 C0,-30 0,-60 25,-45 C50,-30 30,-15 0,15 Z" fill="${color}" opacity="0.8"/>
      <path d="M-50,0 L-20,0 L-10,-25 L0,20 L10,-15 L20,0 L50,0" fill="none" stroke="#FFFFFF" stroke-width="3"/>
    </g>
  `;
}

function drawClock(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="0" r="40" fill="none" stroke="${color}" stroke-width="5"/>
      <line x1="0" y1="0" x2="0" y2="-20" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="18" y2="-18" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="5" fill="${color}"/>
      <text x="0" y="55" text-anchor="middle" font-size="14" fill="${color}">5:00</text>
    </g>
  `;
}

function drawFlame(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M0,40 Q-30,20 -20,-10 Q-15,-30 0,-50 Q15,-30 20,-10 Q30,20 0,40 Z" fill="${color}"/>
      <path d="M0,35 Q-15,20 -10,0 Q-5,-15 0,-30 Q5,-15 10,0 Q15,20 0,35 Z" fill="#FFFFFF" opacity="0.5"/>
    </g>
  `;
}

function drawRose(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <ellipse cx="0" cy="0" rx="30" ry="25" fill="${color}"/>
      <ellipse cx="-15" cy="-10" rx="20" ry="18" fill="${color}" opacity="0.9"/>
      <ellipse cx="15" cy="-10" rx="20" ry="18" fill="${color}" opacity="0.9"/>
      <ellipse cx="0" cy="-18" rx="18" ry="15" fill="${color}" opacity="0.85"/>
      <path d="M0,-5 Q8,-10 5,-18 Q0,-22 -5,-18 Q-8,-12 0,-8" fill="none" stroke="#4A3B3B" stroke-width="1.5" opacity="0.4"/>
      <path d="M0,25 Q-5,45 0,60" fill="none" stroke="#95B8A0" stroke-width="4"/>
      <ellipse cx="-15" cy="45" rx="12" ry="8" fill="#95B8A0" transform="rotate(-30, -15, 45)"/>
    </g>
  `;
}

function drawMeditationPose(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="-50" r="20" fill="${color}"/>
      <ellipse cx="0" cy="-15" rx="25" ry="30" fill="${color}"/>
      <ellipse cx="0" cy="30" rx="45" ry="15" fill="${color}"/>
      <ellipse cx="-40" cy="5" rx="15" ry="8" fill="${color}" transform="rotate(-20, -40, 5)"/>
      <ellipse cx="40" cy="5" rx="15" ry="8" fill="${color}" transform="rotate(20, 40, 5)"/>
      <circle cx="-35" cy="20" r="8" fill="${color}"/>
      <circle cx="35" cy="20" r="8" fill="${color}"/>
    </g>
  `;
}

function drawJournal(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <rect x="-45" y="-50" width="90" height="70" rx="5" fill="${color}" opacity="0.8"/>
      <rect x="-40" y="-45" width="80" height="60" rx="3" fill="#FFFFFF"/>
      <line x1="-30" y1="-30" x2="30" y2="-30" stroke="#E0D0D0" stroke-width="1"/>
      <line x1="-30" y1="-18" x2="30" y2="-18" stroke="#E0D0D0" stroke-width="1"/>
      <line x1="-30" y1="-6" x2="30" y2="-6" stroke="#E0D0D0" stroke-width="1"/>
      <line x1="-30" y1="6" x2="20" y2="6" stroke="#E0D0D0" stroke-width="1"/>
      <rect x="35" y="-60" width="8" height="50" rx="2" fill="${color}" transform="rotate(25, 35, -60)"/>
    </g>
  `;
}

function drawCandle(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <rect x="-20" y="0" width="40" height="60" rx="5" fill="#F5E6E0"/>
      <rect x="-2" y="-10" width="4" height="15" fill="#4A3B3B"/>
      <ellipse cx="0" cy="-25" rx="12" ry="20" fill="#F5C944"/>
      <ellipse cx="0" cy="-28" rx="6" ry="12" fill="#FFFFFF" opacity="0.6"/>
      <circle cx="0" cy="-25" r="30" fill="${color}" opacity="0.15"/>
      <ellipse cx="0" cy="60" rx="25" ry="8" fill="${color}" opacity="0.5"/>
    </g>
  `;
}

function drawPlant(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-25,20 L-30,55 L30,55 L25,20 Z" fill="#C4A882"/>
      <rect x="-30" y="15" width="60" height="10" rx="3" fill="#D4B892"/>
      <path d="M0,15 Q-30,-10 -15,-40" fill="none" stroke="${color}" stroke-width="4"/>
      <ellipse cx="-20" cy="-30" rx="15" ry="25" fill="${color}" transform="rotate(-30, -20, -30)"/>
      <path d="M0,15 Q30,-10 15,-40" fill="none" stroke="${color}" stroke-width="4"/>
      <ellipse cx="20" cy="-30" rx="15" ry="25" fill="${color}" transform="rotate(30, 20, -30)"/>
      <path d="M0,15 Q0,-20 0,-50" fill="none" stroke="${color}" stroke-width="4"/>
      <ellipse cx="0" cy="-45" rx="12" ry="22" fill="${color}"/>
    </g>
  `;
}

function drawMoonPhases(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="-80" cy="0" r="18" fill="none" stroke="${color}" stroke-width="2"/>
      <circle cx="-40" cy="0" r="18" fill="${color}" opacity="0.3"/>
      <path d="M-40,-18 A18,18 0 0,1 -40,18 A12,18 0 0,0 -40,-18" fill="${color}"/>
      <circle cx="0" cy="0" r="18" fill="${color}"/>
      <circle cx="40" cy="0" r="18" fill="${color}" opacity="0.3"/>
      <path d="M40,-18 A18,18 0 0,0 40,18 A12,18 0 0,1 40,-18" fill="${color}"/>
      <circle cx="80" cy="0" r="18" fill="none" stroke="${color}" stroke-width="2"/>
    </g>
  `;
}

function drawHeartInHands(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-50,30 Q-60,10 -40,-10 Q-20,-20 0,0" fill="${color}" opacity="0.4"/>
      <path d="M50,30 Q60,10 40,-10 Q20,-20 0,0" fill="${color}" opacity="0.4"/>
      <path d="M0,25 C-25,0 -35,-15 -20,-28 C0,-45 0,-20 0,-5 C0,-20 0,-45 20,-28 C35,-15 25,0 0,25 Z" fill="${color}"/>
    </g>
  `;
}

function drawTeaCup(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-30,-20 L-35,30 Q0,45 35,30 L30,-20 Z" fill="${color}" opacity="0.6"/>
      <path d="M30,0 Q50,0 50,20 Q50,35 30,30" fill="none" stroke="${color}" stroke-width="6" opacity="0.6"/>
      <path d="M-10,-30 Q-15,-45 -5,-55" fill="none" stroke="${color}" stroke-width="3" opacity="0.4"/>
      <path d="M10,-30 Q15,-45 5,-55" fill="none" stroke="${color}" stroke-width="3" opacity="0.4"/>
      <ellipse cx="0" cy="35" rx="45" ry="12" fill="${color}" opacity="0.3"/>
    </g>
  `;
}

function drawCloud(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <ellipse cx="-25" cy="10" rx="30" ry="22" fill="${color}" opacity="0.9"/>
      <ellipse cx="25" cy="10" rx="30" ry="22" fill="${color}" opacity="0.9"/>
      <ellipse cx="0" cy="0" rx="35" ry="28" fill="${color}"/>
      <ellipse cx="-15" cy="-15" rx="20" ry="18" fill="${color}"/>
      <ellipse cx="20" cy="-10" rx="22" ry="18" fill="${color}"/>
    </g>
  `;
}

function drawFeather(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M0,45 Q-5,0 5,-45" fill="none" stroke="${color}" stroke-width="3"/>
      <path d="M0,30 Q-25,25 -30,20" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M-2,15 Q-28,8 -35,0" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M0,0 Q-25,-8 -30,-15" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M3,-15 Q-20,-25 -22,-35" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M0,30 Q25,25 30,20" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M-2,15 Q28,8 35,0" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M0,0 Q25,-8 30,-15" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
      <path d="M3,-15 Q20,-25 22,-35" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>
    </g>
  `;
}

function drawRainbow(cx: number, cy: number, theme: any): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-55,30 A55,55 0 0,1 55,30" fill="none" stroke="${theme.accent}" stroke-width="8" opacity="0.8"/>
      <path d="M-45,30 A45,45 0 0,1 45,30" fill="none" stroke="${theme.accent2}" stroke-width="8" opacity="0.8"/>
      <path d="M-35,30 A35,35 0 0,1 35,30" fill="none" stroke="${theme.accent3}" stroke-width="8" opacity="0.8"/>
      <path d="M-25,30 A25,25 0 0,1 25,30" fill="none" stroke="#F5C944" stroke-width="8" opacity="0.7"/>
    </g>
  `;
}

// ============================================================
// VISION BOARD HERO - GOAL THEMED (Achievement/Professional)
// ============================================================

function generateVisionBoardGoalHero(): string {
  // Professional achievement theme colors
  const goalTheme = {
    bg: '#1B2838', // Deep navy
    accent: '#4A9BD4', // Professional blue
    accent2: '#56C596', // Success green
    accent3: '#F2B134', // Achievement gold
    text: '#E8E8E8'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goalMainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F9FA"/>
      <stop offset="50%" style="stop-color:#EEF2F7"/>
      <stop offset="100%" style="stop-color:#E4EAF1"/>
    </linearGradient>

    <linearGradient id="goalBoardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1B2838"/>
      <stop offset="100%" style="stop-color:#2D4255"/>
    </linearGradient>

    <filter id="goalShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="30" flood-color="#1B2838" flood-opacity="0.35"/>
    </filter>

    <filter id="goalSoftShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Main background -->
  <rect width="100%" height="100%" fill="url(#goalMainBg)"/>

  <!-- Decorative elements -->
  <circle cx="150" cy="200" r="100" fill="${goalTheme.accent}" opacity="0.15"/>
  <circle cx="1850" cy="300" r="120" fill="${goalTheme.accent2}" opacity="0.12"/>
  <circle cx="100" cy="1700" r="80" fill="${goalTheme.accent3}" opacity="0.15"/>

  <!-- Sparkles -->
  ${iconSparkle(250, 350, 18, goalTheme.accent3)}
  ${iconSparkle(1750, 400, 20, goalTheme.accent3)}
  ${iconSparkle(180, 1100, 14, goalTheme.accent)}

  <!-- HEADER -->
  <text x="1000" y="140" text-anchor="middle" font-size="78" font-weight="900" fill="#1B2838" font-family="Arial, sans-serif">
    Your 2025 Goals
  </text>
  <text x="1000" y="210" text-anchor="middle" font-size="42" fill="#4A5568" font-family="Georgia, serif">
    Vision Board - Personalized to Your Ambitions
  </text>
  <rect x="700" y="250" width="600" height="4" rx="2" fill="${goalTheme.accent}" opacity="0.6"/>

  <!-- SINGLE CENTERED BOARD -->
  <g transform="translate(320, 320)">
    <rect x="0" y="0" width="1360" height="1100" rx="30" fill="url(#goalBoardBg)" filter="url(#goalShadow)"/>
    <rect x="10" y="10" width="1340" height="1080" rx="24" fill="none" stroke="${goalTheme.accent3}" stroke-width="3" opacity="0.4"/>

    <!-- Title banner -->
    <rect x="430" y="40" width="500" height="70" rx="35" fill="${goalTheme.accent3}"/>
    <text x="680" y="88" text-anchor="middle" font-size="36" font-weight="800" fill="${goalTheme.bg}" font-family="Arial, sans-serif">
      LEVEL UP 2025
    </text>

    <!-- Goal Grid Content -->
    ${generateGoalBoardContent(goalTheme)}

    <!-- Motivational words -->
    <text x="120" y="1020" font-size="28" font-weight="700" fill="${goalTheme.accent}" opacity="0.9" transform="rotate(-8, 120, 1020)">ACHIEVE</text>
    <text x="600" y="1040" font-size="24" font-weight="700" fill="${goalTheme.accent2}" opacity="0.8">GROW</text>
    <text x="1100" y="1020" font-size="26" font-weight="700" fill="${goalTheme.accent3}" opacity="0.9" transform="rotate(5, 1100, 1020)">SUCCEED</text>

    <!-- Label -->
    <rect x="20" y="1050" width="280" height="40" rx="8" fill="${goalTheme.accent}" opacity="0.3"/>
    ${iconStar(60, 1070, 28, goalTheme.accent3)}
    <text x="165" y="1078" text-anchor="middle" font-size="18" fill="${goalTheme.text}" font-family="Arial, sans-serif">Goals + Achievement</text>
  </g>

  <!-- BOTTOM SECTION - moved up to reduce empty space -->
  <g transform="translate(0, 1530)">
    <!-- Feature badges -->
    <g transform="translate(200, 30)">
      ${generateFeatureBadgeNoEmoji(0, iconSparkle, 'Personalized', 'to your goals', goalTheme.accent3)}
      ${generateFeatureBadgeNoEmoji(400, iconStar, 'Designed for', 'achievement', goalTheme.accent)}
      ${generateFeatureBadgeNoEmoji(800, iconPhone, 'Digital + Print', 'ready formats', goalTheme.accent2)}
      ${generateFeatureBadgeNoEmoji(1200, iconGift, 'Perfect gift', 'for go-getters', '#9B7BB8')}
    </g>

    <!-- CTA -->
    <rect x="500" y="160" width="1000" height="100" rx="50" fill="${goalTheme.accent}"/>
    <text x="1000" y="225" text-anchor="middle" font-size="38" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">
      Tell Us Your Goals - We Create Your Board
    </text>
  </g>

  <!-- Price badge -->
  <g transform="translate(1700, 100)">
    <circle cx="0" cy="0" r="80" fill="${goalTheme.accent2}"/>
    <text x="0" y="-10" text-anchor="middle" font-size="32" font-weight="900" fill="#FFFFFF">$14.99</text>
    <text x="0" y="25" text-anchor="middle" font-size="18" fill="#FFFFFF" opacity="0.9">Digital</text>
  </g>
</svg>`;
}

function generateGoalBoardContent(theme: any): string {
  return `
    <!-- Row 1 -->
    <g transform="translate(60, 140)">
      <!-- Target/Goal card -->
      <rect x="0" y="0" width="280" height="200" rx="16" fill="#2D4255"/>
      ${drawTarget(140, 80, theme.accent3)}
      <text x="140" y="160" text-anchor="middle" font-size="20" fill="${theme.text}" font-family="Arial, sans-serif">Hit Every Target</text>

      <!-- Financial Goals -->
      <rect x="310" y="0" width="360" height="200" rx="16" fill="#2D4255"/>
      <text x="490" y="60" text-anchor="middle" font-size="22" font-weight="700" fill="${theme.accent2}" font-family="Arial, sans-serif">FINANCIAL FREEDOM</text>
      <text x="490" y="100" text-anchor="middle" font-size="42" font-weight="900" fill="${theme.accent3}" font-family="Arial, sans-serif">$100K</text>
      <text x="490" y="140" text-anchor="middle" font-size="18" fill="${theme.text}" opacity="0.9" font-family="Arial, sans-serif">saved by December</text>
      <rect x="360" y="160" width="260" height="20" rx="10" fill="#1B2838"/>
      <rect x="360" y="160" width="165" height="20" rx="10" fill="${theme.accent2}"/>

      <!-- Promotion card -->
      <rect x="700" y="0" width="280" height="200" rx="16" fill="${theme.accent}"/>
      ${drawTrophy(840, 70, '#FFFFFF')}
      <text x="840" y="140" text-anchor="middle" font-size="20" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">PROMOTION</text>
      <text x="840" y="170" text-anchor="middle" font-size="16" fill="#FFFFFF" opacity="0.9" font-family="Arial, sans-serif">Senior Manager by Q3</text>

      <!-- Small square -->
      <rect x="1010" y="0" width="200" height="200" rx="16" fill="#2D4255"/>
      <text x="1110" y="70" text-anchor="middle" font-size="64" font-weight="900" fill="${theme.accent3}" font-family="Arial, sans-serif">5AM</text>
      <text x="1110" y="110" text-anchor="middle" font-size="24" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">CLUB</text>
      <text x="1110" y="150" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">Morning routine</text>
    </g>

    <!-- Row 2 -->
    <g transform="translate(60, 370)">
      <!-- Skills card -->
      <rect x="0" y="0" width="380" height="200" rx="16" fill="#2D4255"/>
      <text x="190" y="50" text-anchor="middle" font-size="20" font-weight="700" fill="${theme.accent}" font-family="Arial, sans-serif">NEW SKILLS</text>
      <g transform="translate(50, 80)">
        <rect x="0" y="0" width="280" height="30" rx="15" fill="#1B2838"/>
        <rect x="0" y="0" width="220" height="30" rx="15" fill="${theme.accent}"/>
        <text x="140" y="22" text-anchor="middle" font-size="14" fill="#FFFFFF">Leadership</text>
      </g>
      <g transform="translate(50, 120)">
        <rect x="0" y="0" width="280" height="30" rx="15" fill="#1B2838"/>
        <rect x="0" y="0" width="180" height="30" rx="15" fill="${theme.accent2}"/>
        <text x="140" y="22" text-anchor="middle" font-size="14" fill="#FFFFFF">Public Speaking</text>
      </g>

      <!-- Networking -->
      <rect x="410" y="0" width="260" height="200" rx="16" fill="${theme.accent2}"/>
      <text x="540" y="60" text-anchor="middle" font-size="48" font-weight="900" fill="#FFFFFF" font-family="Arial, sans-serif">50+</text>
      <text x="540" y="100" text-anchor="middle" font-size="20" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">NEW</text>
      <text x="540" y="130" text-anchor="middle" font-size="20" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">CONNECTIONS</text>
      <text x="540" y="170" text-anchor="middle" font-size="14" fill="#FFFFFF" opacity="0.9">Network expansion</text>

      <!-- Health -->
      <rect x="700" y="0" width="260" height="200" rx="16" fill="#2D4255"/>
      ${drawHeartbeat(830, 70, theme.accent)}
      <text x="830" y="130" text-anchor="middle" font-size="18" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">HEALTH FIRST</text>
      <text x="830" y="160" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">Run a marathon</text>

      <!-- Reading -->
      <rect x="990" y="0" width="220" height="200" rx="16" fill="#2D4255"/>
      ${drawBook(1100, 70, theme.accent3)}
      <text x="1100" y="140" text-anchor="middle" font-size="32" font-weight="900" fill="${theme.accent3}" font-family="Arial, sans-serif">52</text>
      <text x="1100" y="170" text-anchor="middle" font-size="16" fill="${theme.text}">Books in 2025</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(60, 600)">
      <!-- Quote card -->
      <rect x="0" y="0" width="500" height="160" rx="16" fill="#2D4255"/>
      <text x="250" y="60" text-anchor="middle" font-size="28" font-style="italic" fill="${theme.accent3}" font-family="Georgia, serif">"Dream big.</text>
      <text x="250" y="100" text-anchor="middle" font-size="28" font-style="italic" fill="${theme.accent3}" font-family="Georgia, serif">Work hard.</text>
      <text x="250" y="140" text-anchor="middle" font-size="28" font-style="italic" fill="${theme.accent3}" font-family="Georgia, serif">Stay focused."</text>

      <!-- Vision/Mindset -->
      <rect x="530" y="0" width="240" height="160" rx="16" fill="${theme.accent3}"/>
      <text x="650" y="60" text-anchor="middle" font-size="18" font-weight="700" fill="${theme.bg}" font-family="Arial, sans-serif">MINDSET</text>
      <text x="650" y="100" text-anchor="middle" font-size="48" font-weight="900" fill="${theme.bg}" font-family="Arial, sans-serif">10X</text>
      <text x="650" y="130" text-anchor="middle" font-size="16" fill="${theme.bg}" opacity="0.9">Think bigger</text>

      <!-- Side hustle -->
      <rect x="800" y="0" width="200" height="160" rx="16" fill="#2D4255"/>
      <text x="900" y="50" text-anchor="middle" font-size="14" font-weight="700" fill="${theme.accent2}" font-family="Arial, sans-serif">SIDE HUSTLE</text>
      <text x="900" y="95" text-anchor="middle" font-size="32" font-weight="900" fill="${theme.text}" font-family="Arial, sans-serif">$5K</text>
      <text x="900" y="130" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">monthly passive</text>

      <!-- Balance -->
      <rect x="1030" y="0" width="180" height="160" rx="16" fill="#2D4255"/>
      ${drawClock(1120, 60, theme.accent)}
      <text x="1120" y="120" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">WORK-LIFE</text>
      <text x="1120" y="145" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">BALANCE</text>
    </g>
  `;
}

function drawTarget(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="0" r="50" fill="none" stroke="${color}" stroke-width="6"/>
      <circle cx="0" cy="0" r="35" fill="none" stroke="${color}" stroke-width="5"/>
      <circle cx="0" cy="0" r="20" fill="none" stroke="${color}" stroke-width="4"/>
      <circle cx="0" cy="0" r="8" fill="${color}"/>
    </g>
  `;
}

function drawBook(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <rect x="-35" y="-40" width="70" height="80" rx="4" fill="${color}"/>
      <rect x="-30" y="-35" width="25" height="70" fill="#FFFFFF" opacity="0.2"/>
      <rect x="-5" y="-35" width="30" height="70" fill="#FFFFFF" opacity="0.1"/>
      <line x1="-32" y1="-40" x2="-32" y2="40" stroke="#FFFFFF" stroke-width="2" opacity="0.4"/>
    </g>
  `;
}

// ============================================================
// VISION BOARD HERO - RELATIONSHIP THEMED (Love/Connection)
// ============================================================

function generateVisionBoardRelationshipHero(): string {
  // Romantic/connection theme colors
  const loveTheme = {
    bg: '#FDF8F5',
    accent: '#E86B6B', // Warm coral/red
    accent2: '#D4A5A5', // Soft rose
    accent3: '#A8C5DB', // Sky blue
    accent4: '#95B8A0', // Sage green
    text: '#4A3B3B'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="loveMainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FDF8F5"/>
      <stop offset="50%" style="stop-color:#FBF0E8"/>
      <stop offset="100%" style="stop-color:#F8E8E0"/>
    </linearGradient>

    <linearGradient id="loveBoardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FDF8F5"/>
      <stop offset="100%" style="stop-color:#FCF2EC"/>
    </linearGradient>

    <filter id="loveShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="30" flood-color="#D4A5A5" flood-opacity="0.25"/>
    </filter>

    <filter id="loveSoftShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- Main background -->
  <rect width="100%" height="100%" fill="url(#loveMainBg)"/>

  <!-- Decorative elements -->
  <circle cx="150" cy="200" r="100" fill="${loveTheme.accent2}" opacity="0.25"/>
  <circle cx="1850" cy="300" r="120" fill="${loveTheme.accent3}" opacity="0.2"/>
  <circle cx="100" cy="1700" r="80" fill="${loveTheme.accent}" opacity="0.15"/>
  <circle cx="1900" cy="1600" r="100" fill="${loveTheme.accent4}" opacity="0.2"/>

  <!-- Hearts floating -->
  ${iconHeart(200, 400, 24, loveTheme.accent)}
  ${iconHeart(1780, 450, 20, loveTheme.accent2)}
  ${iconHeart(150, 1000, 18, loveTheme.accent)}
  ${iconHeart(1820, 950, 22, loveTheme.accent2)}
  ${iconSparkle(280, 300, 14, '#F2B134')}
  ${iconSparkle(1720, 350, 16, '#F2B134')}

  <!-- HEADER -->
  <text x="1000" y="140" text-anchor="middle" font-size="78" font-weight="700" fill="${loveTheme.text}" font-family="Georgia, serif">
    Love + Connection
  </text>
  <text x="1000" y="210" text-anchor="middle" font-size="42" fill="#6B5F70" font-family="Georgia, serif">
    Vision Board - Celebrate Your Relationships
  </text>
  <rect x="700" y="250" width="600" height="4" rx="2" fill="${loveTheme.accent}" opacity="0.5"/>

  <!-- SINGLE CENTERED BOARD -->
  <g transform="translate(320, 320)">
    <rect x="0" y="0" width="1360" height="1100" rx="30" fill="url(#loveBoardBg)" filter="url(#loveShadow)"/>
    <rect x="10" y="10" width="1340" height="1080" rx="24" fill="none" stroke="${loveTheme.accent2}" stroke-width="3" opacity="0.5"/>

    <!-- Title banner -->
    <rect x="380" y="40" width="600" height="70" rx="35" fill="${loveTheme.accent}"/>
    <text x="680" y="88" text-anchor="middle" font-size="34" font-weight="700" fill="#FFFFFF" font-family="Georgia, serif">
      Our Love Story 2025
    </text>

    <!-- Relationship Grid Content -->
    ${generateRelationshipBoardContent(loveTheme)}

    <!-- Gentle words -->
    <text x="120" y="1020" font-size="26" font-weight="600" fill="${loveTheme.accent}" font-style="italic" transform="rotate(-5, 120, 1020)">forever</text>
    <text x="600" y="1040" font-size="24" font-weight="600" fill="${loveTheme.accent2}" font-style="italic">together</text>
    <text x="1100" y="1020" font-size="28" font-weight="600" fill="${loveTheme.accent4}" font-style="italic" transform="rotate(5, 1100, 1020)">always</text>

    <!-- Label -->
    <rect x="20" y="1050" width="280" height="40" rx="20" fill="${loveTheme.accent}" opacity="0.25"/>
    ${iconHeart(60, 1070, 24, loveTheme.accent)}
    <text x="165" y="1078" text-anchor="middle" font-size="18" fill="${loveTheme.text}" font-family="Georgia, serif">Love + Relationships</text>
  </g>

  <!-- BOTTOM SECTION - moved up to reduce empty space -->
  <g transform="translate(0, 1530)">
    <!-- Feature badges -->
    <g transform="translate(200, 30)">
      ${generateFeatureBadgeNoEmoji(0, iconHeart, 'Personalized', 'to your love story', loveTheme.accent)}
      ${generateFeatureBadgeNoEmoji(400, iconSparkle, 'Celebrate your', 'connection', '#F2B134')}
      ${generateFeatureBadgeNoEmoji(800, iconPhone, 'Digital + Print', 'ready formats', loveTheme.accent3)}
      ${generateFeatureBadgeNoEmoji(1200, iconGift, 'Perfect gift', 'for couples', '#9B7BB8')}
    </g>

    <!-- CTA -->
    <rect x="500" y="160" width="1000" height="100" rx="50" fill="${loveTheme.accent}"/>
    <text x="1000" y="225" text-anchor="middle" font-size="38" font-weight="700" fill="#FFFFFF" font-family="Georgia, serif">
      Tell Us Your Story - We Create Your Board
    </text>
  </g>

  <!-- Price badge -->
  <g transform="translate(1700, 100)">
    <circle cx="0" cy="0" r="80" fill="${loveTheme.accent}"/>
    <text x="0" y="-10" text-anchor="middle" font-size="32" font-weight="900" fill="#FFFFFF">$14.99</text>
    <text x="0" y="25" text-anchor="middle" font-size="18" fill="#FFFFFF" opacity="0.9">Digital</text>
  </g>
</svg>`;
}

function generateRelationshipBoardContent(theme: any): string {
  return `
    <!-- Row 1 -->
    <g transform="translate(60, 140)">
      <!-- Anniversary card -->
      <rect x="0" y="0" width="320" height="200" rx="16" fill="${theme.accent2}" opacity="0.4"/>
      ${drawBigHeart(160, 70, theme.accent)}
      <text x="160" y="150" text-anchor="middle" font-size="20" font-weight="600" fill="${theme.text}" font-family="Georgia, serif">5 Years Together</text>
      <text x="160" y="180" text-anchor="middle" font-size="16" fill="${theme.text}" opacity="0.8" font-family="Georgia, serif">Anniversary celebration</text>

      <!-- Quote -->
      <rect x="350" y="0" width="400" height="200" rx="16" fill="#FFFFFF"/>
      <text x="550" y="70" text-anchor="middle" font-size="24" font-style="italic" fill="${theme.accent}" font-family="Georgia, serif">"In all the world,</text>
      <text x="550" y="105" text-anchor="middle" font-size="24" font-style="italic" fill="${theme.accent}" font-family="Georgia, serif">there is no heart</text>
      <text x="550" y="140" text-anchor="middle" font-size="24" font-style="italic" fill="${theme.accent}" font-family="Georgia, serif">for me like yours"</text>
      <text x="550" y="180" text-anchor="middle" font-size="16" fill="${theme.text}" opacity="0.8">- Maya Angelou</text>

      <!-- Date nights card -->
      <rect x="780" y="0" width="220" height="200" rx="16" fill="${theme.accent3}" opacity="0.5"/>
      <text x="890" y="50" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">DATE NIGHTS</text>
      <text x="890" y="100" text-anchor="middle" font-size="52" font-weight="900" fill="${theme.text}" font-family="Arial, sans-serif">52</text>
      <text x="890" y="140" text-anchor="middle" font-size="18" fill="${theme.text}" font-family="Georgia, serif">one per week</text>
      ${iconHeart(890, 170, 20, theme.accent)}

      <!-- Travel together -->
      <rect x="1030" y="0" width="180" height="200" rx="16" fill="${theme.accent4}" opacity="0.5"/>
      ${drawPlane(1120, 60, theme.text)}
      <text x="1120" y="120" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">TRAVEL</text>
      <text x="1120" y="150" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.9">Dream destinations</text>
      <text x="1120" y="175" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.9">together</text>
    </g>

    <!-- Row 2 -->
    <g transform="translate(60, 370)">
      <!-- Quality time -->
      <rect x="0" y="0" width="260" height="200" rx="16" fill="#FFFFFF"/>
      ${drawClock(130, 60, theme.accent2)}
      <text x="130" y="120" text-anchor="middle" font-size="18" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">QUALITY TIME</text>
      <text x="130" y="150" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">Present moments</text>
      <text x="130" y="175" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">together</text>

      <!-- Communication card -->
      <rect x="290" y="0" width="320" height="200" rx="16" fill="${theme.accent}" opacity="0.2"/>
      <text x="450" y="50" text-anchor="middle" font-size="18" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">COMMUNICATION</text>
      <text x="450" y="95" text-anchor="middle" font-size="28" font-weight="700" fill="${theme.accent}" font-family="Georgia, serif">Listen</text>
      <text x="450" y="130" text-anchor="middle" font-size="28" font-weight="700" fill="${theme.accent}" font-family="Georgia, serif">Understand</text>
      <text x="450" y="165" text-anchor="middle" font-size="28" font-weight="700" fill="${theme.accent}" font-family="Georgia, serif">Grow</text>

      <!-- Future planning -->
      <rect x="640" y="0" width="240" height="200" rx="16" fill="${theme.accent4}" opacity="0.4"/>
      ${drawHouse(760, 65, theme.text)}
      <text x="760" y="130" text-anchor="middle" font-size="18" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">OUR HOME</text>
      <text x="760" y="160" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">Building our</text>
      <text x="760" y="185" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8">dream together</text>

      <!-- Support -->
      <rect x="910" y="0" width="300" height="200" rx="16" fill="#FFFFFF"/>
      <text x="1060" y="50" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.accent}" font-family="Arial, sans-serif">SUPPORT EACH OTHER</text>
      <text x="1060" y="100" text-anchor="middle" font-size="40" fill="${theme.accent}" font-family="Georgia, serif">♡</text>
      <text x="1060" y="140" text-anchor="middle" font-size="16" fill="${theme.text}" opacity="0.9" font-family="Georgia, serif">Through every chapter</text>
      <text x="1060" y="170" text-anchor="middle" font-size="16" fill="${theme.text}" opacity="0.9" font-family="Georgia, serif">Side by side</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(60, 600)">
      <!-- Adventures -->
      <rect x="0" y="0" width="400" height="160" rx="16" fill="${theme.accent3}" opacity="0.4"/>
      <text x="200" y="45" text-anchor="middle" font-size="20" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">ADVENTURES TOGETHER</text>
      <text x="200" y="90" text-anchor="middle" font-size="18" fill="${theme.text}" font-family="Georgia, serif">New experiences</text>
      <text x="200" y="120" text-anchor="middle" font-size="18" fill="${theme.text}" font-family="Georgia, serif">Shared memories</text>
      <text x="200" y="150" text-anchor="middle" font-size="18" fill="${theme.text}" font-family="Georgia, serif">Endless stories</text>

      <!-- Gratitude -->
      <rect x="430" y="0" width="260" height="160" rx="16" fill="${theme.accent2}" opacity="0.5"/>
      <text x="560" y="50" text-anchor="middle" font-size="18" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">GRATITUDE</text>
      <text x="560" y="95" text-anchor="middle" font-size="24" font-style="italic" fill="${theme.text}" font-family="Georgia, serif">Thankful for</text>
      <text x="560" y="130" text-anchor="middle" font-size="24" font-style="italic" fill="${theme.accent}" font-family="Georgia, serif">every moment</text>

      <!-- Grow together -->
      <rect x="720" y="0" width="200" height="160" rx="16" fill="#FFFFFF"/>
      ${drawPlant(820, 55, theme.accent4)}
      <text x="820" y="115" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">GROW</text>
      <text x="820" y="140" text-anchor="middle" font-size="16" font-weight="700" fill="${theme.text}" font-family="Arial, sans-serif">TOGETHER</text>

      <!-- Forever -->
      <rect x="950" y="0" width="260" height="160" rx="16" fill="${theme.accent}" opacity="0.3"/>
      <text x="1080" y="50" text-anchor="middle" font-size="16" fill="${theme.text}" font-family="Georgia, serif">Our Promise</text>
      <text x="1080" y="100" text-anchor="middle" font-size="40" font-weight="700" fill="${theme.accent}" font-family="Georgia, serif">FOREVER</text>
      <text x="1080" y="140" text-anchor="middle" font-size="18" fill="${theme.text}" font-style="italic" font-family="Georgia, serif">&amp; always</text>
    </g>
  `;
}

function drawBigHeart(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M0,15 C-15,-15 -45,-15 -30,-45 C-15,-60 0,-45 0,-30 C0,-45 15,-60 30,-45 C45,-15 15,-15 0,15 Z" fill="${color}" opacity="0.9"/>
    </g>
  `;
}

function drawPlane(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M-30,15 L-10,5 L-25,-5 L0,-15 L25,-5 L10,5 L30,15 L10,10 L0,25 L-10,10 Z" fill="${color}" opacity="0.9"/>
    </g>
  `;
}

function drawHouse(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <polygon points="0,-35 -40,0 -30,0 -30,30 30,30 30,0 40,0" fill="${color}" opacity="0.8"/>
      <rect x="-10" y="5" width="20" height="25" fill="#FFFFFF" opacity="0.5"/>
      <rect x="-6" y="9" width="5" height="8" fill="${color}" opacity="0.6"/>
      <rect x="1" y="9" width="5" height="8" fill="${color}" opacity="0.6"/>
    </g>
  `;
}

function drawPlant(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <rect x="-20" y="15" width="40" height="30" rx="4" fill="${color}" opacity="0.7"/>
      <path d="M0,15 Q-20,-10 0,-30 Q20,-10 0,15" fill="${color}"/>
      <path d="M-15,10 Q-25,-5 -10,-20" fill="none" stroke="${color}" stroke-width="3"/>
      <path d="M15,10 Q25,-5 10,-20" fill="none" stroke="${color}" stroke-width="3"/>
    </g>
  `;
}

function drawFlower(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="-15" r="12" fill="${color}" opacity="0.8"/>
      <circle cx="-12" cy="-5" r="12" fill="${color}" opacity="0.7"/>
      <circle cx="12" cy="-5" r="12" fill="${color}" opacity="0.7"/>
      <circle cx="-8" cy="10" r="12" fill="${color}" opacity="0.6"/>
      <circle cx="8" cy="10" r="12" fill="${color}" opacity="0.6"/>
      <circle cx="0" cy="0" r="10" fill="#F5D76E"/>
    </g>
  `;
}

function drawLeaf(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <ellipse cx="0" cy="-15" rx="20" ry="30" fill="${color}" opacity="0.8" transform="rotate(15, 0, -15)"/>
      <path d="M0,15 L0,-30" fill="none" stroke="${color}" stroke-width="3" opacity="0.6"/>
      <path d="M0,-5 L-10,-15" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>
      <path d="M0,-15 L10,-25" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>
    </g>
  `;
}

function drawChart(cx: number, cy: number, color: string): string {
  return `
    <g transform="translate(${cx}, ${cy})">
      <rect x="-30" y="15" width="15" height="25" fill="${color}" opacity="0.6"/>
      <rect x="-10" y="5" width="15" height="35" fill="${color}" opacity="0.7"/>
      <rect x="10" y="-10" width="15" height="50" fill="${color}" opacity="0.8"/>
      <path d="M-35,-15 L-25,10 L-5,-5 L15,-20 L30,-25" fill="none" stroke="${color}" stroke-width="3"/>
    </g>
  `;
}

// ============================================================
// VISION BOARD HERO - CHRISTMAS GIFT VARIANT
// ============================================================

function generateVisionBoardChristmasHero(): string {
  // Christmas gift theme colors
  const xmasTheme = {
    bg: '#1A1A1A',
    accent: '#C9A962', // Gold
    text: '#E8E8E8',
    red: '#C84040',
    green: '#4A8B5C',
    white: '#FFFFFF'
  };

  const lightTheme = {
    bg: '#FDF5F0',
    accent: '#D4A5A5', // Rose
    accent2: '#95B8A0', // Sage
    accent3: '#A8C5DB', // Sky blue
    text: '#4A3B3B'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="xmasMainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F4F0"/>
      <stop offset="50%" style="stop-color:#FDF8F5"/>
      <stop offset="100%" style="stop-color:#F5EFE8"/>
    </linearGradient>

    <linearGradient id="darkBoardBgXmas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1A1A1A"/>
      <stop offset="100%" style="stop-color:#2A2A2A"/>
    </linearGradient>

    <linearGradient id="lightBoardBgXmas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FDF5F0"/>
      <stop offset="100%" style="stop-color:#FBF0E8"/>
    </linearGradient>

    <filter id="boardShadowXmas" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="25" flood-color="#000000" flood-opacity="0.2"/>
    </filter>

    <filter id="softShadowXmas" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Main background -->
  <rect width="100%" height="100%" fill="url(#xmasMainBg)"/>

  <!-- Christmas decorative elements -->
  <circle cx="150" cy="200" r="80" fill="${xmasTheme.red}" opacity="0.2"/>
  <circle cx="1850" cy="300" r="100" fill="${xmasTheme.green}" opacity="0.2"/>
  <circle cx="100" cy="1800" r="60" fill="${xmasTheme.red}" opacity="0.2"/>
  <circle cx="1900" cy="1700" r="90" fill="${xmasTheme.green}" opacity="0.15"/>

  <!-- Christmas sparkles -->
  ${iconSparkle(300, 400, 18, xmasTheme.accent)}
  ${iconSparkle(1700, 500, 20, xmasTheme.accent)}
  ${iconSparkle(200, 1200, 14, xmasTheme.accent)}
  ${iconSparkle(1800, 1100, 16, xmasTheme.accent)}

  <!-- GIFT MESSAGE BANNER -->
  <rect x="400" y="50" width="1200" height="90" rx="45" fill="${xmasTheme.red}"/>
  <text x="1000" y="108" text-anchor="middle" font-size="42" font-weight="700" fill="${xmasTheme.white}" font-family="Georgia, serif">
    Give the Gift of Foresight
  </text>

  <!-- HEADER -->
  <text x="1000" y="220" text-anchor="middle" font-size="68" font-weight="900" fill="#3D3040" font-family="Georgia, serif">
    Custom Vision Boards
  </text>
  <text x="1000" y="280" text-anchor="middle" font-size="36" fill="#6B5F70" font-family="Georgia, serif">
    The Perfect Christmas Gift - Personalized to Their Dreams
  </text>

  <!-- LEFT BOARD: "BUILT DIFFERENT" (Dark/Masculine) - Centered -->
  <g transform="translate(100, 340)">
    <rect x="0" y="0" width="860" height="1050" rx="24" fill="url(#darkBoardBgXmas)" filter="url(#boardShadowXmas)"/>
    <rect x="8" y="8" width="844" height="1034" rx="20" fill="none" stroke="${xmasTheme.accent}" stroke-width="3" opacity="0.5"/>

    <!-- Title banner -->
    <rect x="230" y="35" width="400" height="55" rx="8" fill="${xmasTheme.accent}"/>
    <text x="430" y="74" text-anchor="middle" font-size="28" font-weight="800" fill="${xmasTheme.bg}" font-family="Arial, sans-serif">
      BUILT DIFFERENT
    </text>

    <!-- Simplified content -->
    ${generateBuiltDifferentContentSmall(xmasTheme)}

    <!-- Label -->
    <rect x="20" y="990" width="200" height="35" rx="6" fill="${xmasTheme.accent}" opacity="0.4"/>
    ${iconDumbbell(50, 1008, 24, xmasTheme.accent)}
    <text x="130" y="1015" text-anchor="middle" font-size="16" fill="${xmasTheme.text}" font-family="Arial, sans-serif">Fitness Focus</text>
  </g>

  <!-- RIGHT BOARD: "MY HEALING JOURNEY" (Light/Feminine) - Centered -->
  <g transform="translate(1040, 340)">
    <rect x="0" y="0" width="860" height="1050" rx="24" fill="url(#lightBoardBgXmas)" filter="url(#boardShadowXmas)"/>
    <rect x="8" y="8" width="844" height="1034" rx="20" fill="none" stroke="${lightTheme.accent}" stroke-width="3" opacity="0.6"/>

    <!-- Title banner -->
    <rect x="170" y="35" width="520" height="55" rx="28" fill="${lightTheme.accent}" opacity="0.9"/>
    <text x="430" y="74" text-anchor="middle" font-size="26" font-weight="700" fill="#FFFFFF" font-family="Georgia, serif">
      My Healing Journey
    </text>

    <!-- Simplified content -->
    ${generateHealingJourneyContentSmall(lightTheme)}

    <!-- Label -->
    <rect x="20" y="990" width="200" height="35" rx="18" fill="${lightTheme.accent}" opacity="0.3"/>
    ${iconButterfly(50, 1008, 26, lightTheme.accent, lightTheme.accent2)}
    <text x="130" y="1015" text-anchor="middle" font-size="16" fill="${lightTheme.text}" font-family="Georgia, serif">Healing + Growth</text>
  </g>

  <!-- BOTTOM SECTION - moved up to reduce empty space -->
  <g transform="translate(0, 1480)">
    <!-- Feature badges -->
    <g transform="translate(200, 30)">
      ${generateFeatureBadgeNoEmoji(0, iconGift, 'Perfect', 'holiday gift', xmasTheme.red)}
      ${generateFeatureBadgeNoEmoji(400, iconPalette, 'Choose their', 'aesthetic vibe', '#4A93B8')}
      ${generateFeatureBadgeNoEmoji(800, iconPhone, 'Digital + Print', 'ready formats', '#50B89A')}
      ${generateFeatureBadgeNoEmoji(1200, iconSparkle, 'Personalized', 'to their story', xmasTheme.accent)}
    </g>

    <!-- CTA -->
    <rect x="500" y="160" width="1000" height="100" rx="50" fill="${xmasTheme.red}"/>
    <text x="1000" y="225" text-anchor="middle" font-size="36" font-weight="700" fill="#FFFFFF" font-family="Arial, sans-serif">
      Order by Dec 20th for Christmas Delivery
    </text>
  </g>

  <!-- Price badge -->
  <g transform="translate(1850, 80)">
    <circle cx="0" cy="0" r="75" fill="${xmasTheme.green}"/>
    <text x="0" y="-8" text-anchor="middle" font-size="30" font-weight="900" fill="#FFFFFF">$14.99</text>
    <text x="0" y="22" text-anchor="middle" font-size="16" fill="#FFFFFF" opacity="0.9">Digital</text>
  </g>
</svg>`;
}

function generateBuiltDifferentContentSmall(theme: any): string {
  return `
    <!-- Row 1 -->
    <g transform="translate(40, 110)">
      <rect x="30" y="0" width="160" height="160" rx="12" fill="${theme.gray || '#3A3A3A'}"/>
      ${iconDumbbell(110, 80, 50, theme.accent)}

      <rect x="210" y="0" width="300" height="160" rx="12" fill="${theme.gray || '#3A3A3A'}"/>
      <text x="360" y="65" text-anchor="middle" font-size="20" font-weight="700" fill="${theme.accent}" font-family="Arial, sans-serif">NO EXCUSES</text>
      <text x="360" y="100" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8" font-family="Arial, sans-serif">Champions are made</text>
      <text x="360" y="120" text-anchor="middle" font-size="14" fill="${theme.text}" opacity="0.8" font-family="Arial, sans-serif">when no one is watching</text>

      <rect x="530" y="0" width="160" height="160" rx="12" fill="${theme.red || '#8B2020'}" opacity="0.9"/>
      ${drawBoxingGlove(610, 80, theme.accent)}
    </g>

    <!-- Row 2 -->
    <g transform="translate(40, 290)">
      <rect x="30" y="0" width="200" height="180" rx="12" fill="${theme.accent}"/>
      <text x="130" y="70" text-anchor="middle" font-size="38" font-weight="900" fill="${theme.bg}" font-family="Arial, sans-serif">5AM</text>
      <text x="130" y="110" text-anchor="middle" font-size="24" font-weight="700" fill="${theme.bg}" font-family="Arial, sans-serif">CLUB</text>
      <text x="130" y="145" text-anchor="middle" font-size="14" fill="${theme.bg}" opacity="0.8">Rise and Grind</text>

      <rect x="250" y="0" width="180" height="180" rx="12" fill="${theme.gray || '#3A3A3A'}"/>
      ${drawRunningFigure(340, 90, theme.text)}

      <rect x="450" y="0" width="240" height="180" rx="12" fill="${theme.gray || '#3A3A3A'}"/>
      <text x="570" y="45" text-anchor="middle" font-size="16" fill="${theme.text}" font-family="Arial, sans-serif">PROGRESS</text>
      <rect x="480" y="70" width="180" height="18" rx="9" fill="${theme.bg}" opacity="0.3"/>
      <rect x="480" y="70" width="135" height="18" rx="9" fill="${theme.accent}"/>
      <text x="570" y="120" text-anchor="middle" font-size="14" fill="${theme.accent}">75% to goal</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(40, 500)">
      <rect x="30" y="0" width="260" height="150" rx="12" fill="${theme.gray || '#3A3A3A'}"/>
      ${drawTrophy(160, 75, theme.accent)}

      <rect x="310" y="0" width="160" height="150" rx="12" fill="${theme.gray || '#3A3A3A'}"/>
      ${drawHeartbeat(390, 75, theme.accent)}

      <rect x="490" y="0" width="200" height="150" rx="12" fill="${theme.red || '#8B2020'}" opacity="0.8"/>
      ${drawFlame(590, 75, theme.accent)}
    </g>

    <!-- Motivational words -->
    <text x="100" y="710" font-size="24" font-weight="700" fill="${theme.accent}" transform="rotate(-8, 100, 710)">DISCIPLINE</text>
    <text x="450" y="730" font-size="22" font-weight="700" fill="${theme.text}" opacity="0.8" transform="rotate(5, 450, 730)">GRIND</text>
    <text x="650" y="700" font-size="20" font-weight="700" fill="${theme.accent}" transform="rotate(-3, 650, 700)">FOCUS</text>
  `;
}

function generateHealingJourneyContentSmall(theme: any): string {
  return `
    <!-- Row 1 -->
    <g transform="translate(40, 110)">
      <rect x="30" y="0" width="250" height="160" rx="16" fill="#FFFFFF" opacity="0.9"/>
      <text x="155" y="50" text-anchor="middle" font-size="18" font-style="italic" fill="${theme.text}" font-family="Georgia, serif">"I am worthy of</text>
      <text x="155" y="80" text-anchor="middle" font-size="18" font-style="italic" fill="${theme.text}" font-family="Georgia, serif">love, peace, and</text>
      <text x="155" y="110" text-anchor="middle" font-size="18" font-style="italic" fill="${theme.text}" font-family="Georgia, serif">happiness"</text>
      ${iconHeart(155, 140, 18, theme.accent)}

      <rect x="300" y="0" width="140" height="160" rx="16" fill="${theme.accent2}" opacity="0.5"/>
      ${drawFlower(370, 60, theme.accent)}
      <text x="370" y="120" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">self-reflection</text>

      <rect x="460" y="0" width="150" height="160" rx="16" fill="${theme.accent3}" opacity="0.5"/>
      ${iconHeart(535, 55, 32, theme.accent)}
      <text x="535" y="115" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">inner peace</text>
    </g>

    <!-- Row 2 -->
    <g transform="translate(40, 290)">
      <rect x="30" y="0" width="200" height="160" rx="16" fill="${theme.accent3}" opacity="0.4"/>
      ${drawChart(130, 50, theme.accent2)}
      <text x="130" y="115" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">Trust the process</text>

      <rect x="250" y="0" width="180" height="160" rx="16" fill="${theme.accent4 || '#F5D0C0'}" opacity="0.5"/>
      ${drawPlant(340, 55, theme.accent2)}
      <text x="340" y="120" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">new beginnings</text>

      <rect x="450" y="0" width="160" height="160" rx="16" fill="#FFFFFF" opacity="0.9"/>
      ${drawTeaCup(530, 55, theme.accent)}
      <text x="530" y="115" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">self-love</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(40, 480)">
      <rect x="30" y="0" width="150" height="140" rx="16" fill="${theme.accent2}" opacity="0.4"/>
      ${drawLeaf(105, 50, theme.accent2)}
      <text x="105" y="110" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">growth</text>

      <rect x="200" y="0" width="260" height="140" rx="16" fill="#FFFFFF" opacity="0.9"/>
      ${drawRainbow(330, 45, theme)}
      <text x="330" y="115" text-anchor="middle" font-size="14" fill="${theme.text}" font-style="italic" font-family="Georgia, serif">hope</text>

      <rect x="480" y="0" width="130" height="140" rx="16" fill="${theme.accent}" opacity="0.3"/>
      ${iconSparkle(545, 50, 24, theme.accent)}
      <text x="545" y="105" text-anchor="middle" font-size="14" fill="${theme.text}" font-family="Georgia, serif">healing</text>
    </g>

    <!-- Gentle words -->
    <text x="100" y="680" font-size="22" font-weight="600" fill="${theme.accent}" font-style="italic" transform="rotate(-5, 100, 680)">peace</text>
    <text x="380" y="700" font-size="20" font-weight="600" fill="${theme.accent2}" font-style="italic">growth</text>
    <text x="620" y="675" font-size="24" font-weight="600" fill="${theme.accent3}" font-style="italic" transform="rotate(5, 620, 675)">hope</text>
  `;
}

// ============================================================
// PLANNER HERO - Scattered to Organized Transformation
// ============================================================

function generatePlannerHero(): string {
  const c = {
    primary: '#4A9BA8',
    primaryBright: '#5FB8C7',
    secondary: '#D4A65A',
    accent: '#C77B65',
    bg: '#F8F6F2',
    text: '#2D3B3D',
    textMuted: '#5A6B6E',
    white: '#FFFFFF'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F6F2"/>
      <stop offset="100%" style="stop-color:#F2EDE6"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="15" flood-color="#000000" flood-opacity="0.15"/>
    </filter>

    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="${c.primary}" flood-opacity="0.2"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>

  <!-- Decorative elements -->
  <circle cx="100" cy="100" r="80" fill="${c.primary}" opacity="0.08"/>
  <circle cx="1900" cy="1900" r="100" fill="${c.secondary}" opacity="0.08"/>
  <circle cx="100" cy="1900" r="60" fill="${c.accent}" opacity="0.1"/>

  <!-- HEADER -->
  <g transform="translate(1000, 100)">
    <text x="0" y="0" text-anchor="middle" font-size="90" font-weight="900" fill="${c.text}" font-family="Georgia, serif">
      Personalized Clarity Planner
    </text>
    <text x="0" y="70" text-anchor="middle" font-size="38" fill="${c.textMuted}" font-family="Georgia, serif">
      AI-Guided Thought Organization in Just 30 Minutes
    </text>
  </g>

  <!-- 30 MINUTES badge - top right, clear of title -->
  <g transform="translate(1820, 85)">
    <circle cx="0" cy="0" r="75" fill="${c.primary}" filter="url(#shadow)"/>
    <text x="0" y="-10" text-anchor="middle" font-size="42" font-weight="900" fill="${c.white}">30</text>
    <text x="0" y="22" text-anchor="middle" font-size="20" font-weight="700" fill="${c.white}">MINUTES</text>
  </g>

  <!-- MAIN TRANSFORMATION SECTION -->
  <g transform="translate(0, 220)">

    <!-- BEFORE Section - Left side -->
    <g transform="translate(80, 0)">
      <text x="340" y="50" text-anchor="middle" font-size="48" font-weight="700" fill="${c.accent}" font-family="Georgia, serif">
        Before: Scattered Thoughts
      </text>

      <g transform="translate(0, 90)">
        ${generateScatteredThoughts(c)}
      </g>

      <g transform="translate(340, 620)">
        <circle cx="0" cy="0" r="50" fill="${c.accent}" opacity="0.2"/>
        <text x="0" y="15" text-anchor="middle" font-size="42" fill="${c.accent}">?!</text>
        <text x="0" y="85" text-anchor="middle" font-size="24" fill="${c.textMuted}" font-style="italic">"I don't know where to start..."</text>
      </g>
    </g>

    <!-- CENTER ARROW - Truly centered with connecting line -->
    <g transform="translate(1000, 450)">
      <!-- Horizontal connecting line -->
      <line x1="-300" y1="0" x2="-150" y2="0" stroke="${c.primary}" stroke-width="4" opacity="0.4"/>
      <line x1="150" y1="0" x2="300" y2="0" stroke="${c.primary}" stroke-width="4" opacity="0.4"/>

      <!-- Arrow pill -->
      <rect x="-140" y="-55" width="280" height="110" rx="55" fill="${c.primary}" filter="url(#softGlow)"/>

      <!-- Arrow icon inside -->
      <polygon points="-50,-15 40,-15 40,-30 80,0 40,30 40,15 -50,15" fill="${c.white}"/>

      <!-- Text above -->
      <text x="0" y="-85" text-anchor="middle" font-size="26" font-weight="700" fill="${c.primary}">30 min with AI guide</text>
    </g>

    <!-- AFTER Section - Right side -->
    <g transform="translate(1280, 0)">
      <text x="340" y="50" text-anchor="middle" font-size="48" font-weight="700" fill="${c.primary}" font-family="Georgia, serif">
        After: Organized Clarity
      </text>

      <g transform="translate(0, 90)">
        ${generateOrganizedClarity(c)}
      </g>

      <g transform="translate(340, 620)">
        <circle cx="0" cy="0" r="50" fill="${c.primary}" opacity="0.2"/>
        ${iconCheck(0, 0, 50, c.primary)}
        <text x="0" y="85" text-anchor="middle" font-size="24" fill="${c.textMuted}" font-style="italic">"I finally see what I need to do"</text>
      </g>
    </g>
  </g>

  <!-- BOTTOM: How It Works -->
  <g transform="translate(0, 1150)">
    <rect x="100" y="0" width="1800" height="380" rx="30" fill="${c.white}" filter="url(#shadow)"/>

    <text x="1000" y="70" text-anchor="middle" font-size="48" font-weight="700" fill="${c.text}" font-family="Georgia, serif">
      The 30-Minute Transformation
    </text>

    <g transform="translate(200, 110)">
      ${generateTransformationStep(0, '1', 'AI Asks', 'Thoughtful questions that', 'draw you deeper', c)}
      ${generateTransformationStep(530, '2', 'You Discover', 'Name what you could not', 'name before', c)}
      ${generateTransformationStep(1060, '3', 'You Receive', 'Personalized PDF with', 'your insights', c)}
    </g>
  </g>

  <!-- BOTTOM CTA -->
  <g transform="translate(0, 1600)">
    <g transform="translate(200, 0)">
      ${generatePillNoEmoji(0, 'AI-Personalized', c.primary)}
      ${generatePillNoEmoji(320, 'Thought Organizing', c.secondary)}
      ${generatePillNoEmoji(680, 'Action Plan Included', c.accent)}
      ${generatePillNoEmoji(1080, 'Perfect Gift', c.primary)}
    </g>

    <rect x="350" y="90" width="1000" height="110" rx="55" fill="${c.primary}"/>
    <text x="850" y="162" text-anchor="middle" font-size="42" font-weight="700" fill="${c.white}" font-family="Arial, sans-serif">
      Start Your 30-Minute Clarity Session
    </text>

    <!-- Price badge -->
    <g transform="translate(1550, 145)">
      <circle cx="0" cy="0" r="70" fill="${c.white}" filter="url(#shadow)"/>
      <text x="0" y="8" text-anchor="middle" font-size="36" font-weight="900" fill="${c.primary}">$14.99</text>
      <text x="0" y="35" text-anchor="middle" font-size="16" fill="${c.textMuted}">PDF</text>
    </g>
  </g>
</svg>`;
}

function generateScatteredThoughts(c: any): string {
  const thoughts = [
    { x: 50, y: 50, w: 180, h: 70, rot: -8, text: 'Why am I so anxious?', color: c.accent },
    { x: 280, y: 30, w: 200, h: 60, rot: 5, text: 'Too many things to do', color: c.secondary },
    { x: 150, y: 130, w: 160, h: 65, rot: -3, text: 'Cannot focus today', color: c.primary },
    { x: 380, y: 100, w: 170, h: 70, rot: 12, text: 'What do I really want?', color: c.accent },
    { x: 80, y: 220, w: 190, h: 60, rot: -10, text: 'Feeling stuck...', color: c.secondary },
    { x: 300, y: 200, w: 200, h: 65, rot: 6, text: 'So many decisions', color: c.primary },
    { x: 180, y: 300, w: 210, h: 70, rot: -5, text: 'Where do I even start?', color: c.accent },
    { x: 420, y: 280, w: 150, h: 60, rot: 15, text: 'Overwhelmed', color: c.secondary },
    { x: 50, y: 380, w: 170, h: 65, rot: -12, text: 'Need clarity', color: c.primary },
    { x: 250, y: 400, w: 180, h: 60, rot: 8, text: 'Mind is racing', color: c.accent },
  ];

  return thoughts.map(t => `
    <g transform="translate(${t.x}, ${t.y}) rotate(${t.rot})">
      <rect x="0" y="0" width="${t.w}" height="${t.h}" rx="20" fill="${t.color}" opacity="0.15"/>
      <rect x="0" y="0" width="${t.w}" height="${t.h}" rx="20" fill="none" stroke="${t.color}" stroke-width="2" opacity="0.4" stroke-dasharray="8,4"/>
      <text x="${t.w / 2}" y="${t.h / 2 + 6}" text-anchor="middle" font-size="16" fill="${c.text}" opacity="0.8" font-family="Georgia, serif">${escapeXml(t.text)}</text>
    </g>
  `).join('');
}

function generateOrganizedClarity(c: any): string {
  const sections = [
    { title: 'What I Am Feeling', items: ['Anxious about the future', 'Excited about new possibilities'], color: c.primary },
    { title: 'What I Actually Want', items: ['More time for creativity', 'Deeper connections'], color: c.secondary },
    { title: 'My Next Steps', items: ['Block 2 hours for art weekly', 'Call mom this Sunday'], color: c.accent },
  ];

  let svg = '';
  let y = 0;

  for (const section of sections) {
    svg += `
      <g transform="translate(0, ${y})">
        <rect x="0" y="0" width="700" height="${80 + section.items.length * 35}" rx="16" fill="${c.white}"/>
        <rect x="0" y="0" width="8" height="${80 + section.items.length * 35}" rx="4" fill="${section.color}"/>
        <text x="30" y="35" font-size="20" font-weight="700" fill="${section.color}" font-family="Georgia, serif">${escapeXml(section.title)}</text>
        ${section.items.map((item, i) => `
          <g transform="translate(30, ${55 + i * 35})">
            <circle cx="8" cy="8" r="6" fill="${section.color}" opacity="0.6"/>
            <text x="25" y="13" font-size="16" fill="${c.text}" font-family="Georgia, serif">${escapeXml(item)}</text>
          </g>
        `).join('')}
      </g>
    `;
    y += 80 + section.items.length * 35 + 20;
  }

  return svg;
}

function generateTransformationStep(x: number, num: string, title: string, desc1: string, desc2: string, c: any): string {
  return `
    <g transform="translate(${x}, 0)">
      <rect x="0" y="0" width="480" height="180" rx="20" fill="${c.bg}"/>
      <circle cx="50" cy="90" r="40" fill="${c.primary}"/>
      <text x="50" y="100" text-anchor="middle" font-size="32" font-weight="900" fill="${c.white}">${num}</text>
      <text x="110" y="55" font-size="26" font-weight="700" fill="${c.text}" font-family="Georgia, serif">${escapeXml(title)}</text>
      <text x="110" y="100" font-size="18" fill="${c.textMuted}" font-family="Georgia, serif">${escapeXml(desc1)}</text>
      <text x="110" y="125" font-size="18" fill="${c.textMuted}" font-family="Georgia, serif">${escapeXml(desc2)}</text>
    </g>
  `;
}

function generatePillNoEmoji(x: number, text: string, color: string): string {
  return `
    <g transform="translate(${x}, 0)">
      <rect x="0" y="0" width="280" height="50" rx="25" fill="${color}" opacity="0.15"/>
      ${iconSparkle(25, 25, 12, color)}
      <text x="155" y="33" text-anchor="middle" font-size="18" font-weight="600" fill="${color}" font-family="Arial, sans-serif">${escapeXml(text)}</text>
    </g>
  `;
}

// ============================================================
// FLASH CARDS HERO - Dinosaur Theme
// ============================================================

function generateFlashCardsHero(): string {
  const c = {
    primary: '#4A93B8',
    secondary: '#E8B830',
    accent: '#E86B55',
    mint: '#50B89A',
    bg: '#F6FAFC',
    text: '#2A3D48',
    textMuted: '#5A7080',
    white: '#FFFFFF'
  };

  const dinoGreen = '#5DAB8B';
  const dinoOrange = '#E8946A';
  const dinoBlue = '#4A93B8';
  const dinoYellow = '#E8B830';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F6FAFC"/>
      <stop offset="50%" style="stop-color:#EDF8F4"/>
      <stop offset="100%" style="stop-color:#F6FAFC"/>
    </linearGradient>

    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#flashBg)"/>

  <!-- Dino footprints background -->
  ${generateDinoFootprints()}

  <!-- HEADER -->
  <g transform="translate(0, 80)">
    ${drawCuteDino(350, 60, 1.2, dinoGreen)}

    <text x="1000" y="70" text-anchor="middle" font-size="72" font-weight="900" fill="${c.text}" font-family="Georgia, serif">
      Custom Flash Cards
    </text>
    <text x="1000" y="130" text-anchor="middle" font-size="36" fill="${c.textMuted}" font-family="Georgia, serif">
      Themed to Your Child's Interests - Making Learning Fun!
    </text>
  </g>

  <!-- DINOSAUR THEME SHOWCASE - CENTERED -->
  <g transform="translate(0, 250)">
    <!-- Theme banner - centered at 1000 -->
    <rect x="550" y="0" width="900" height="70" rx="35" fill="${dinoGreen}" filter="url(#cardShadow)"/>
    ${drawCuteDino(620, 35, 0.5, dinoOrange)}
    <text x="1000" y="48" text-anchor="middle" font-size="36" font-weight="800" fill="${c.white}" font-family="Arial, sans-serif">
      DINOSAUR THEME EXAMPLE
    </text>
    ${drawCuteDino(1380, 35, 0.5, dinoYellow)}

    <!-- Flash cards row 1 - 3 cards centered (total width ~1410, start at 295) -->
    <g transform="translate(100, 100)">
      <!-- Math card -->
      <g transform="translate(0, 0)">
        <rect x="0" y="0" width="540" height="340" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="540" height="55" rx="24 24 0 0" fill="${dinoGreen}"/>
        <rect x="0" y="28" width="540" height="27" fill="${dinoGreen}"/>
        <text x="270" y="42" text-anchor="middle" font-size="26" font-weight="700" fill="${c.white}">ADDITION</text>
        ${drawCuteDino(120, 170, 1.0, dinoOrange)}
        <text x="360" y="180" text-anchor="middle" font-size="72" font-weight="900" fill="${c.text}">3 + 4 = ?</text>
        <text x="270" y="300" text-anchor="middle" font-size="24" fill="${c.textMuted}">Help Rex count his bones!</text>
      </g>

      <!-- Counting card -->
      <g transform="translate(580, 0)">
        <rect x="0" y="0" width="540" height="340" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="540" height="55" rx="24 24 0 0" fill="${dinoBlue}"/>
        <rect x="0" y="28" width="540" height="27" fill="${dinoBlue}"/>
        <text x="270" y="42" text-anchor="middle" font-size="26" font-weight="700" fill="${c.white}">COUNTING</text>
        ${drawCuteDino(80, 150, 0.7, dinoGreen)}
        ${drawCuteDino(180, 150, 0.7, dinoOrange)}
        ${drawCuteDino(280, 150, 0.7, dinoBlue)}
        ${drawCuteDino(380, 150, 0.7, dinoYellow)}
        <text x="270" y="250" text-anchor="middle" font-size="56" font-weight="900" fill="${c.text}">How many?</text>
        <text x="270" y="300" text-anchor="middle" font-size="24" fill="${c.textMuted}">Count the friendly dinos!</text>
      </g>

      <!-- Word problem card -->
      <g transform="translate(1160, 0)">
        <rect x="0" y="0" width="540" height="340" rx="24" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="540" height="55" rx="24 24 0 0" fill="${dinoYellow}"/>
        <rect x="0" y="28" width="540" height="27" fill="${dinoYellow}"/>
        <text x="270" y="42" text-anchor="middle" font-size="26" font-weight="700" fill="${c.text}">WORD PROBLEM</text>
        ${drawCuteDino(420, 130, 0.8, dinoGreen)}
        <text x="40" y="130" font-size="26" fill="${c.text}" font-family="Georgia, serif">Bronto found 5 leaves.</text>
        <text x="40" y="170" font-size="26" fill="${c.text}" font-family="Georgia, serif">He ate 2 leaves.</text>
        <text x="40" y="230" font-size="32" font-weight="700" fill="${c.text}" font-family="Georgia, serif">How many left?</text>
        <text x="270" y="300" text-anchor="middle" font-size="24" fill="${c.textMuted}">Think like a dinosaur!</text>
      </g>
    </g>

    <!-- Flash cards row 2 - 3 cards centered -->
    <g transform="translate(200, 480)">
      <!-- Phonics card -->
      <g transform="translate(0, 0)">
        <rect x="0" y="0" width="460" height="280" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="460" height="50" rx="20 20 0 0" fill="${c.accent}"/>
        <rect x="0" y="25" width="460" height="25" fill="${c.accent}"/>
        <text x="230" y="38" text-anchor="middle" font-size="24" font-weight="700" fill="${c.white}">PHONICS</text>
        ${drawCuteDino(340, 150, 0.7, dinoOrange)}
        <text x="140" y="170" text-anchor="middle" font-size="80" font-weight="900" fill="${c.primary}">Dd</text>
        <text x="230" y="245" text-anchor="middle" font-size="28" fill="${c.text}">D is for Dinosaur!</text>
      </g>

      <!-- Vocabulary card -->
      <g transform="translate(520, 0)">
        <rect x="0" y="0" width="460" height="280" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="460" height="50" rx="20 20 0 0" fill="${c.mint}"/>
        <rect x="0" y="25" width="460" height="25" fill="${c.mint}"/>
        <text x="230" y="38" text-anchor="middle" font-size="24" font-weight="700" fill="${c.white}">VOCABULARY</text>
        ${drawCuteDino(230, 130, 0.9, dinoBlue)}
        <text x="230" y="215" text-anchor="middle" font-size="36" font-weight="700" fill="${c.text}">enormous</text>
        <text x="230" y="255" text-anchor="middle" font-size="22" fill="${c.textMuted}">(very, very big!)</text>
      </g>

      <!-- Multiplication card -->
      <g transform="translate(1040, 0)">
        <rect x="0" y="0" width="460" height="280" rx="20" fill="${c.white}" filter="url(#cardShadow)"/>
        <rect x="0" y="0" width="460" height="50" rx="20 20 0 0" fill="${dinoGreen}"/>
        <rect x="0" y="25" width="460" height="25" fill="${dinoGreen}"/>
        <text x="230" y="38" text-anchor="middle" font-size="24" font-weight="700" fill="${c.white}">MULTIPLY</text>
        ${drawCuteDino(80, 145, 0.6, dinoYellow)}
        ${drawCuteDino(150, 145, 0.6, dinoYellow)}
        <text x="310" y="165" text-anchor="middle" font-size="60" font-weight="900" fill="${c.text}">2 x 3 = ?</text>
        <text x="230" y="245" text-anchor="middle" font-size="22" fill="${c.textMuted}">Groups of dino friends!</text>
      </g>
    </g>
  </g>

  <!-- THEME OPTIONS - LARGER TEXT -->
  <g transform="translate(0, 1050)">
    <text x="1000" y="0" text-anchor="middle" font-size="34" font-weight="700" fill="${c.text}" font-family="Georgia, serif">
      Also Available: Unicorns | Space | Ocean | Princess | Superhero | And More!
    </text>
  </g>

  <!-- BOTTOM SECTION - LARGER TEXT -->
  <g transform="translate(0, 1140)">
    <g transform="translate(150, 0)">
      ${generateFlashBenefit(0, 'Targets their gaps', 'Custom content for YOUR child', c.primary)}
      ${generateFlashBenefit(430, 'Themed for fun', 'Learning they actually enjoy', dinoGreen)}
      ${generateFlashBenefit(860, 'Print-ready PDF', 'Cut out and use anywhere', c.secondary)}
      ${generateFlashBenefit(1290, 'Reusable forever', 'Practice again and again', c.accent)}
    </g>

    <rect x="350" y="180" width="1300" height="120" rx="60" fill="${c.primary}"/>
    <text x="1000" y="258" text-anchor="middle" font-size="46" font-weight="700" fill="${c.white}" font-family="Arial, sans-serif">
      Tell Us What They Are Learning - We Create The Cards
    </text>

    <g transform="translate(1750, 240)">
      <circle cx="0" cy="0" r="85" fill="${dinoGreen}"/>
      <text x="0" y="-5" text-anchor="middle" font-size="40" font-weight="900" fill="${c.white}">$9.99</text>
      <text x="0" y="30" text-anchor="middle" font-size="20" fill="${c.white}" opacity="0.9">PDF</text>
    </g>
  </g>
</svg>`;
}

function generateDinoFootprints(): string {
  const footprints = [];
  const positions = [
    { x: 100, y: 400 }, { x: 200, y: 600 }, { x: 1800, y: 500 },
    { x: 1700, y: 800 }, { x: 150, y: 1000 }, { x: 1850, y: 1100 }
  ];

  for (const pos of positions) {
    footprints.push(`
      <g transform="translate(${pos.x}, ${pos.y})" opacity="0.08">
        <ellipse cx="0" cy="0" rx="15" ry="25" fill="#5DAB8B"/>
        <ellipse cx="-18" cy="-25" rx="8" ry="15" fill="#5DAB8B" transform="rotate(-20)"/>
        <ellipse cx="0" cy="-30" rx="8" ry="18" fill="#5DAB8B"/>
        <ellipse cx="18" cy="-25" rx="8" ry="15" fill="#5DAB8B" transform="rotate(20)"/>
      </g>
    `);
  }
  return footprints.join('');
}

function drawCuteDino(x: number, y: number, scale: number, color: string): string {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="45" ry="30" fill="${color}"/>
      <ellipse cx="50" cy="-15" rx="25" ry="22" fill="${color}"/>
      <circle cx="58" cy="-20" r="8" fill="#FFFFFF"/>
      <circle cx="60" cy="-20" r="4" fill="#2A3D48"/>
      <path d="M45,-5 Q55,5 65,-5" fill="none" stroke="#2A3D48" stroke-width="2"/>
      <ellipse cx="-25" cy="25" rx="12" ry="18" fill="${color}"/>
      <ellipse cx="10" cy="25" rx="12" ry="18" fill="${color}"/>
      <path d="M-45,0 Q-70,-5 -80,10" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>
      <ellipse cx="-20" cy="-25" rx="8" ry="12" fill="${color}" opacity="0.7"/>
      <ellipse cx="0" cy="-28" rx="10" ry="14" fill="${color}" opacity="0.7"/>
      <ellipse cx="25" cy="-25" rx="8" ry="12" fill="${color}" opacity="0.7"/>
    </g>
  `;
}

function generateFlashBenefit(x: number, title: string, desc: string, color: string): string {
  return `
    <g transform="translate(${x}, 0)">
      <rect x="0" y="0" width="390" height="120" rx="20" fill="#FFFFFF" filter="url(#cardShadow)"/>
      ${iconCheck(35, 40, 40, color)}
      <text x="85" y="45" font-size="22" font-weight="700" fill="#2A3D48" font-family="Arial, sans-serif">${escapeXml(title)}</text>
      <text x="85" y="75" font-size="16" fill="#5A7080" font-family="Georgia, serif">${escapeXml(desc)}</text>
    </g>
  `;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function generateImage(svgContent: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await sharp(Buffer.from(svgContent))
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT)
    .png({ quality: 100 })
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// STANDALONE SAMPLE BOARDS (Product Examples)
// ============================================================

function generateGoalSampleBoard(): string {
  const goalTheme = {
    bg: '#1B2838',
    accent: '#4A9BD4',
    accent2: '#56C596',
    accent3: '#F2B134',
    text: '#E8E8E8'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goalSampleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1B2838"/>
      <stop offset="100%" style="stop-color:#2D4255"/>
    </linearGradient>

    <filter id="boardGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="15" stdDeviation="30" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Board background -->
  <rect x="50" y="50" width="1900" height="1900" rx="40" fill="url(#goalSampleBg)" filter="url(#boardGlow)"/>
  <rect x="65" y="65" width="1870" height="1870" rx="35" fill="none" stroke="${goalTheme.accent3}" stroke-width="4" opacity="0.5"/>

  <!-- Title banner -->
  <rect x="600" y="100" width="800" height="100" rx="50" fill="${goalTheme.accent3}"/>
  <text x="1000" y="168" text-anchor="middle" font-size="50" font-weight="900" fill="${goalTheme.bg}" font-family="Arial, sans-serif">
    LEVEL UP 2025
  </text>

  <!-- Scaled board content - larger scale to fill space -->
  <g transform="translate(50, 50) scale(1.45)">
    ${generateGoalBoardContent(goalTheme)}
  </g>

  <!-- Motivational words at bottom -->
  <text x="200" y="1800" font-size="48" font-weight="700" fill="${goalTheme.accent}" opacity="0.8" transform="rotate(-8, 200, 1800)">ACHIEVE</text>
  <text x="900" y="1850" font-size="44" font-weight="700" fill="${goalTheme.accent2}" opacity="0.7">GROW</text>
  <text x="1600" y="1800" font-size="46" font-weight="700" fill="${goalTheme.accent3}" opacity="0.8" transform="rotate(5, 1600, 1800)">SUCCEED</text>

  <!-- Label badge -->
  <rect x="100" y="1720" width="420" height="65" rx="15" fill="${goalTheme.accent}" opacity="0.4"/>
  ${iconStar(155, 1752, 45, goalTheme.accent3)}
  <text x="340" y="1765" text-anchor="middle" font-size="28" fill="${goalTheme.text}" font-family="Arial, sans-serif">Goals + Achievement</text>
</svg>`;
}

function generateRelationshipSampleBoard(): string {
  const loveTheme = {
    bg: '#FDF8F5',
    accent: '#E86B6B',
    accent2: '#D4A5A5',
    accent3: '#A8C5DB',
    accent4: '#95B8A0',
    text: '#4A3B3B'
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="loveSampleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FDF8F5"/>
      <stop offset="100%" style="stop-color:#FCF2EC"/>
    </linearGradient>

    <filter id="loveBoardGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="15" stdDeviation="30" flood-color="#D4A5A5" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Board background -->
  <rect x="50" y="50" width="1900" height="1900" rx="40" fill="url(#loveSampleBg)" filter="url(#loveBoardGlow)"/>
  <rect x="65" y="65" width="1870" height="1870" rx="35" fill="none" stroke="${loveTheme.accent2}" stroke-width="4" opacity="0.6"/>

  <!-- Title banner -->
  <rect x="500" y="100" width="1000" height="100" rx="50" fill="${loveTheme.accent}"/>
  <text x="1000" y="168" text-anchor="middle" font-size="46" font-weight="700" fill="#FFFFFF" font-family="Georgia, serif">
    Our Love Story 2025
  </text>

  <!-- Scaled board content - larger scale to fill space -->
  <g transform="translate(50, 50) scale(1.45)">
    ${generateRelationshipBoardContent(loveTheme)}
  </g>

  <!-- Gentle words at bottom -->
  <text x="200" y="1800" font-size="44" font-weight="600" fill="${loveTheme.accent}" font-style="italic" transform="rotate(-5, 200, 1800)">forever</text>
  <text x="900" y="1850" font-size="40" font-weight="600" fill="${loveTheme.accent2}" font-style="italic">together</text>
  <text x="1600" y="1800" font-size="46" font-weight="600" fill="${loveTheme.accent4}" font-style="italic" transform="rotate(5, 1600, 1800)">always</text>

  <!-- Label badge -->
  <rect x="100" y="1720" width="420" height="65" rx="30" fill="${loveTheme.accent}" opacity="0.3"/>
  ${iconHeart(155, 1752, 40, loveTheme.accent)}
  <text x="340" y="1765" text-anchor="middle" font-size="28" fill="${loveTheme.text}" font-family="Georgia, serif">Love + Relationships</text>
</svg>`;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';

  console.log('\nGenerating Themed Hero Images...\n');

  // Vision board variants
  if (target === 'all' || target === 'vision') {
    const visionSvg = generateVisionBoardHero();
    await generateImage(visionSvg, path.join(BASE_DIR, 'vision_board', 'images', '01_hero_themed.png'));
  }

  if (target === 'all' || target === 'vision-goal' || target === 'vision-all') {
    const goalSvg = generateVisionBoardGoalHero();
    await generateImage(goalSvg, path.join(BASE_DIR, 'vision_board', 'images', '02_hero_goal.png'));
  }

  if (target === 'all' || target === 'vision-relationship' || target === 'vision-all') {
    const relationshipSvg = generateVisionBoardRelationshipHero();
    await generateImage(relationshipSvg, path.join(BASE_DIR, 'vision_board', 'images', '03_hero_relationship.png'));
  }

  if (target === 'all' || target === 'vision-christmas' || target === 'vision-all') {
    const christmasSvg = generateVisionBoardChristmasHero();
    await generateImage(christmasSvg, path.join(BASE_DIR, 'vision_board', 'images', '04_hero_christmas.png'));
  }

  // Planner
  if (target === 'all' || target === 'planner') {
    const plannerSvg = generatePlannerHero();
    await generateImage(plannerSvg, path.join(BASE_DIR, 'planner', 'images', '01_hero_themed.png'));
  }

  // Flash cards
  if (target === 'all' || target === 'flash') {
    const flashSvg = generateFlashCardsHero();
    await generateImage(flashSvg, path.join(BASE_DIR, 'flash_cards', 'images', '01_hero_themed.png'));
  }

  // Standalone sample boards (actual product examples)
  if (target === 'samples' || target === 'sample-goal') {
    const goalSampleSvg = generateGoalSampleBoard();
    await generateImage(goalSampleSvg, path.join(BASE_DIR, 'vision_board', 'images', '05_sample_goal.png'));
    console.log('Generated: Goal sample board');
  }

  if (target === 'samples' || target === 'sample-relationship') {
    const relationshipSampleSvg = generateRelationshipSampleBoard();
    await generateImage(relationshipSampleSvg, path.join(BASE_DIR, 'vision_board', 'images', '06_sample_relationship.png'));
    console.log('Generated: Relationship sample board');
  }

  console.log('\nThemed hero images complete!\n');
}

main().catch(console.error);
