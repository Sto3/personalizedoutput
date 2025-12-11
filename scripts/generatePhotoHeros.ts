/**
 * Photo-Based Hero Images for Etsy Listings
 *
 * Creates hero images that feature REAL Ideogram-generated vision boards
 * as the dominant visual element, just like the user requested.
 *
 * This script composites the actual photo boards into hero layouts with:
 * - Large prominent board display (the actual product)
 * - Minimal text overlay
 * - Price badge
 * - Feature bullets
 */

import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const BASE_DIR = path.join(__dirname, '..', 'listing_packets');
const SAMPLES_DIR = path.join(BASE_DIR, 'vision_board', 'images', 'samples');

interface HeroConfig {
  outputName: string;
  title: string;
  subtitle: string;
  price: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  boardPath: string;
  features: string[];
}

// Generate a hero image with a real photo board prominently displayed
async function generatePhotoHero(config: HeroConfig): Promise<void> {
  const outputDir = path.join(BASE_DIR, 'vision_board', 'images');
  const outputPath = path.join(outputDir, config.outputName);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if the sample board exists
  if (!fs.existsSync(config.boardPath)) {
    console.error(`Sample board not found: ${config.boardPath}`);
    return;
  }

  // Create background with gradient
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${config.backgroundColor}"/>
      <stop offset="100%" style="stop-color:${adjustColor(config.backgroundColor, -10)}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="15" stdDeviation="30" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>

  <!-- Top banner with title -->
  <rect x="0" y="0" width="2000" height="180" fill="${config.accentColor}"/>
  <text x="1000" y="110" font-family="Arial Black, Arial, sans-serif" font-size="72" font-weight="900" fill="${config.textColor}" text-anchor="middle">${escapeXml(config.title)}</text>
  <text x="1000" y="155" font-family="Arial, sans-serif" font-size="28" fill="${config.textColor}" text-anchor="middle" opacity="0.9">${escapeXml(config.subtitle)}</text>

  <!-- Price badge -->
  <g transform="translate(1750, 280)">
    <circle r="100" fill="${config.accentColor}"/>
    <circle r="90" fill="#FFFFFF"/>
    <text y="-15" font-family="Arial Black, Arial, sans-serif" font-size="48" font-weight="900" fill="${config.accentColor}" text-anchor="middle">${config.price}</text>
    <text y="25" font-family="Arial, sans-serif" font-size="24" fill="#666666" text-anchor="middle">PDF</text>
  </g>

  <!-- Feature bullets at bottom -->
  <g transform="translate(100, 1750)">
    ${config.features.map((feature, i) => `
    <g transform="translate(${i * 450}, 0)">
      <circle r="20" fill="${config.accentColor}"/>
      <text x="0" y="6" font-family="Arial, sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle">✓</text>
      <text x="35" y="8" font-family="Arial, sans-serif" font-size="26" fill="${config.textColor}">${escapeXml(feature)}</text>
    </g>
    `).join('')}
  </g>

  <!-- CTA text -->
  <text x="1000" y="1920" font-family="Arial, sans-serif" font-size="36" fill="${config.textColor}" text-anchor="middle" opacity="0.8">Tell us your goals - We create your board</text>
</svg>`;

  // Generate background layer
  const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Load and resize the sample board to fit prominently
  const boardWidth = 1400;
  const boardHeight = 1400;
  const boardBuffer = await sharp(config.boardPath)
    .resize(boardWidth, boardHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  // Composite the board onto the background
  const finalImage = await sharp(bgBuffer)
    .composite([
      {
        input: boardBuffer,
        top: 230,  // Below the banner
        left: Math.floor((CANVAS_WIDTH - boardWidth) / 2)  // Centered
      }
    ])
    .png()
    .toBuffer();

  // Add shadow effect by re-compositing
  const shadowedBoard = await sharp(boardBuffer)
    .extend({
      top: 20,
      bottom: 40,
      left: 20,
      right: 20,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .blur(15)
    .modulate({ brightness: 0.3 })
    .png()
    .toBuffer();

  // Final composite with shadow
  const withShadow = await sharp(bgBuffer)
    .composite([
      {
        input: shadowedBoard,
        top: 240,
        left: Math.floor((CANVAS_WIDTH - boardWidth) / 2) - 10
      },
      {
        input: boardBuffer,
        top: 230,
        left: Math.floor((CANVAS_WIDTH - boardWidth) / 2)
      }
    ])
    .png()
    .toBuffer();

  // Save
  await sharp(withShadow).toFile(outputPath);
  console.log(`Generated: ${outputPath}`);
}

// Generate a hero showing TWO boards side by side (dark + light theme)
async function generateDualBoardHero(
  outputName: string,
  leftBoardPath: string,
  rightBoardPath: string,
  title: string,
  subtitle: string
): Promise<void> {
  const outputDir = path.join(BASE_DIR, 'vision_board', 'images');
  const outputPath = path.join(outputDir, outputName);

  // Check boards exist
  if (!fs.existsSync(leftBoardPath) || !fs.existsSync(rightBoardPath)) {
    console.error('One or both board paths not found');
    return;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dualBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F4F0"/>
      <stop offset="100%" style="stop-color:#EDE8E3"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#dualBg)"/>

  <!-- Top banner -->
  <rect x="0" y="0" width="2000" height="180" fill="#4A3B3B"/>
  <text x="1000" y="100" font-family="Arial Black, Arial, sans-serif" font-size="68" font-weight="900" fill="#FFFFFF" text-anchor="middle">${escapeXml(title)}</text>
  <text x="1000" y="150" font-family="Arial, sans-serif" font-size="28" fill="#FFFFFF" text-anchor="middle" opacity="0.9">${escapeXml(subtitle)}</text>

  <!-- Price badge -->
  <g transform="translate(1850, 280)">
    <circle r="90" fill="#D4A43A"/>
    <circle r="80" fill="#FFFFFF"/>
    <text y="-10" font-family="Arial Black, Arial, sans-serif" font-size="44" font-weight="900" fill="#D4A43A" text-anchor="middle">$14.99</text>
    <text y="25" font-family="Arial, sans-serif" font-size="22" fill="#666666" text-anchor="middle">PDF</text>
  </g>

  <!-- Labels for boards -->
  <text x="500" y="260" font-family="Arial, sans-serif" font-size="32" fill="#4A3B3B" text-anchor="middle" font-weight="bold">FOR HIM</text>
  <text x="1500" y="260" font-family="Arial, sans-serif" font-size="32" fill="#4A3B3B" text-anchor="middle" font-weight="bold">FOR HER</text>

  <!-- Feature bullets -->
  <g transform="translate(250, 1820)">
    <g transform="translate(0, 0)">
      <circle r="18" fill="#50B89A"/>
      <text x="30" y="6" font-family="Arial, sans-serif" font-size="26" fill="#4A3B3B">Personalized</text>
    </g>
    <g transform="translate(350, 0)">
      <circle r="18" fill="#50B89A"/>
      <text x="30" y="6" font-family="Arial, sans-serif" font-size="26" fill="#4A3B3B">Any Theme</text>
    </g>
    <g transform="translate(660, 0)">
      <circle r="18" fill="#50B89A"/>
      <text x="30" y="6" font-family="Arial, sans-serif" font-size="26" fill="#4A3B3B">Print-Ready PDF</text>
    </g>
    <g transform="translate(1030, 0)">
      <circle r="18" fill="#50B89A"/>
      <text x="30" y="6" font-family="Arial, sans-serif" font-size="26" fill="#4A3B3B">24hr Delivery</text>
    </g>
  </g>

  <!-- CTA -->
  <text x="1000" y="1940" font-family="Arial, sans-serif" font-size="32" fill="#4A3B3B" text-anchor="middle" opacity="0.8">Tell us your vision - We create your board</text>
</svg>`;

  const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Load and resize both boards
  const boardWidth = 850;
  const boardHeight = 1050;

  const leftBoard = await sharp(leftBoardPath)
    .resize(boardWidth, boardHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  const rightBoard = await sharp(rightBoardPath)
    .resize(boardWidth, boardHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  // Composite both boards
  const finalImage = await sharp(bgBuffer)
    .composite([
      {
        input: leftBoard,
        top: 300,
        left: 75
      },
      {
        input: rightBoard,
        top: 300,
        left: 1075
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Generated dual-board hero: ${outputPath}`);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

async function main() {
  console.log('='.repeat(60));
  console.log('PHOTO-BASED HERO IMAGE GENERATOR');
  console.log('='.repeat(60));

  // Check for existing sample boards
  const samplesExist = fs.existsSync(SAMPLES_DIR);
  if (!samplesExist) {
    console.error('Sample boards directory not found. Run generateSampleVisionBoards.ts first.');
    return;
  }

  // List available samples
  const samples = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${samples.length} sample boards: ${samples.join(', ')}`);

  // Generate dual-board hero (main listing image)
  const levelUpPath = path.join(SAMPLES_DIR, 'level_up_2025_goal.png');
  const healingPath = path.join(SAMPLES_DIR, 'our_love_story_relationship.png');
  const christmasHimPath = path.join(SAMPLES_DIR, 'christmas_for_him.png');
  const christmasHerPath = path.join(SAMPLES_DIR, 'christmas_for_her.png');

  // Main vision board hero - Goal + Relationship side by side
  if (fs.existsSync(levelUpPath) && fs.existsSync(healingPath)) {
    await generateDualBoardHero(
      '01_hero_photo_dual.png',
      levelUpPath,
      healingPath,
      'CUSTOM VISION BOARDS',
      'PERSONALIZED FOR YOUR GOALS & DREAMS'
    );
  }

  // Christmas gift hero - For Him + For Her
  if (fs.existsSync(christmasHimPath) && fs.existsSync(christmasHerPath)) {
    await generateDualBoardHero(
      '02_hero_christmas_gift.png',
      christmasHimPath,
      christmasHerPath,
      'PERFECT CHRISTMAS GIFT',
      'THOUGHTFUL & PERSONALIZED'
    );
  }

  // Single board heroes for variety
  if (fs.existsSync(levelUpPath)) {
    await generatePhotoHero({
      outputName: '03_hero_goals.png',
      title: '2025 GOAL VISION BOARD',
      subtitle: 'CRUSH YOUR GOALS THIS YEAR',
      price: '$14.99',
      backgroundColor: '#1B2838',
      textColor: '#FFFFFF',
      accentColor: '#F2B134',
      boardPath: levelUpPath,
      features: ['Personalized', 'Print-Ready', '24hr Delivery', 'Any Goal']
    });
  }

  if (fs.existsSync(healingPath)) {
    await generatePhotoHero({
      outputName: '04_hero_relationship.png',
      title: 'COUPLES VISION BOARD',
      subtitle: 'VISUALIZE YOUR LOVE STORY',
      price: '$14.99',
      backgroundColor: '#FDF8F5',
      textColor: '#4A3B3B',
      accentColor: '#E86B6B',
      boardPath: healingPath,
      features: ['Romantic', 'Personalized', 'Print-Ready', 'Any Theme']
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
