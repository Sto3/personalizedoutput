/**
 * Generate Sample Santa Message Graphics for Etsy Listings
 *
 * Creates "audio player" style sample images showing a Santa message preview.
 * Uses Sharp for image generation.
 * Saves to output/samples/santa-messages/<theme-id>.png
 */

import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';

// Import themes
import { SANTA_MESSAGE_THEMES } from '../src/etsy/config/themes';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'samples', 'santa-messages');

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630; // Social media preview size

// Theme-specific colors and text
const THEME_CONFIGS: Record<string, {
  title: string;
  subtitle: string;
  audience: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
}> = {
  santa_toddler_2_4: {
    title: 'Personalized Santa Message',
    subtitle: 'For Your Little One (Ages 2-4)',
    audience: 'Perfect for toddlers!',
    bgColor: '#1a472a',
    accentColor: '#c41e3a',
    textColor: '#ffffff'
  },
  santa_early_childhood_5_7: {
    title: 'Santa\'s Special Message',
    subtitle: 'Custom Audio for Kids (Ages 5-7)',
    audience: 'Magic for believers!',
    bgColor: '#1a472a',
    accentColor: '#c41e3a',
    textColor: '#ffffff'
  },
  santa_kids_8_10: {
    title: 'Personal Message from Santa',
    subtitle: 'For Older Kids (Ages 8-10)',
    audience: 'Keep the magic alive!',
    bgColor: '#1a472a',
    accentColor: '#c41e3a',
    textColor: '#ffffff'
  },
  santa_first_christmas_baby: {
    title: 'Baby\'s First Christmas',
    subtitle: 'A Keepsake Santa Message',
    audience: 'Treasure forever!',
    bgColor: '#2d5a3a',
    accentColor: '#ffd700',
    textColor: '#ffffff'
  },
  santa_child_lost_loved_one: {
    title: 'Comfort from Santa',
    subtitle: 'A Gentle, Loving Message',
    audience: 'Healing holiday magic',
    bgColor: '#1a472a',
    accentColor: '#87ceeb',
    textColor: '#ffffff'
  },
  santa_twins_siblings: {
    title: 'Santa\'s Message for Twins',
    subtitle: 'Personalized for Both!',
    audience: 'Double the magic!',
    bgColor: '#1a472a',
    accentColor: '#ff69b4',
    textColor: '#ffffff'
  },
  santa_mentions_pet: {
    title: 'Santa Knows Your Pet!',
    subtitle: 'Personalized Message',
    audience: 'Your pet is famous!',
    bgColor: '#1a472a',
    accentColor: '#c41e3a',
    textColor: '#ffffff'
  },
  santa_nice_list_focus: {
    title: 'You\'re on the Nice List!',
    subtitle: 'Personalized Santa Audio',
    audience: 'Extra special recognition',
    bgColor: '#1a472a',
    accentColor: '#ffd700',
    textColor: '#ffffff'
  },
  santa_belief_magic_tone: {
    title: 'Christmas Magic Message',
    subtitle: 'From the North Pole',
    audience: 'Pure wonder!',
    bgColor: '#0d3b66',
    accentColor: '#c41e3a',
    textColor: '#ffffff'
  },
  santa_christian_tone_optional: {
    title: 'Faith-Based Santa Message',
    subtitle: 'The True Spirit of Christmas',
    audience: 'Christ-centered',
    bgColor: '#1a472a',
    accentColor: '#ffd700',
    textColor: '#ffffff'
  }
};

// Default config
const DEFAULT_CONFIG = {
  title: 'Personalized Santa Message',
  subtitle: 'Custom Audio for Your Child',
  audience: 'Christmas magic!',
  bgColor: '#1a472a',
  accentColor: '#c41e3a',
  textColor: '#ffffff'
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSantaSample(themeId: string, dryRun: boolean = false): Promise<string | null> {
  const config = THEME_CONFIGS[themeId] || DEFAULT_CONFIG;
  const theme = SANTA_MESSAGE_THEMES.find(t => t.id === themeId);

  console.log(`\nGenerating Santa sample for: ${theme?.displayName || themeId}`);

  const outputPath = path.join(OUTPUT_DIR, `${themeId}.png`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would generate: ${outputPath}`);
    return outputPath;
  }

  try {
    // Create SVG for audio player style graphic
    const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${config.bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0d1f0d;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Snowflakes decoration -->
      <circle cx="100" cy="80" r="3" fill="#fff" opacity="0.3"/>
      <circle cx="150" cy="150" r="2" fill="#fff" opacity="0.2"/>
      <circle cx="1100" cy="100" r="4" fill="#fff" opacity="0.3"/>
      <circle cx="1050" cy="200" r="2" fill="#fff" opacity="0.2"/>
      <circle cx="200" cy="500" r="3" fill="#fff" opacity="0.2"/>
      <circle cx="1000" cy="530" r="2" fill="#fff" opacity="0.3"/>

      <!-- Audio Player Card -->
      <rect x="100" y="150" width="1000" height="330" rx="20" fill="#ffffff" filter="url(#shadow)"/>

      <!-- Santa Avatar Circle -->
      <circle cx="250" cy="315" r="80" fill="${config.accentColor}"/>
      <text x="250" y="340" text-anchor="middle" font-size="80" fill="#fff">🎅</text>

      <!-- Title -->
      <text x="380" y="230" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#1a1a1a">${escapeXml(config.title)}</text>

      <!-- Subtitle -->
      <text x="380" y="275" font-family="Georgia, serif" font-size="22" fill="#666666">${escapeXml(config.subtitle)}</text>

      <!-- Play Button -->
      <circle cx="400" cy="370" r="35" fill="${config.accentColor}"/>
      <polygon points="390,355 390,385 420,370" fill="#ffffff"/>

      <!-- Audio Waveform -->
      <g transform="translate(470, 340)">
        <rect x="0" y="10" width="4" height="20" fill="#ddd" rx="2"/>
        <rect x="12" y="5" width="4" height="30" fill="#ddd" rx="2"/>
        <rect x="24" y="0" width="4" height="40" fill="${config.accentColor}" rx="2"/>
        <rect x="36" y="8" width="4" height="24" fill="${config.accentColor}" rx="2"/>
        <rect x="48" y="3" width="4" height="34" fill="${config.accentColor}" rx="2"/>
        <rect x="60" y="10" width="4" height="20" fill="${config.accentColor}" rx="2"/>
        <rect x="72" y="5" width="4" height="30" fill="${config.accentColor}" rx="2"/>
        <rect x="84" y="12" width="4" height="16" fill="#ddd" rx="2"/>
        <rect x="96" y="8" width="4" height="24" fill="#ddd" rx="2"/>
        <rect x="108" y="3" width="4" height="34" fill="#ddd" rx="2"/>
        <rect x="120" y="10" width="4" height="20" fill="#ddd" rx="2"/>
        <rect x="132" y="6" width="4" height="28" fill="#ddd" rx="2"/>
        <rect x="144" y="12" width="4" height="16" fill="#ddd" rx="2"/>
        <rect x="156" y="8" width="4" height="24" fill="#ddd" rx="2"/>
        <rect x="168" y="5" width="4" height="30" fill="#ddd" rx="2"/>
        <rect x="180" y="10" width="4" height="20" fill="#ddd" rx="2"/>
      </g>

      <!-- Duration -->
      <text x="680" y="380" font-family="Arial, sans-serif" font-size="14" fill="#999">0:45 / 1:30</text>

      <!-- Audience Badge -->
      <rect x="800" y="350" width="200" height="40" rx="20" fill="${config.accentColor}" opacity="0.1"/>
      <text x="900" y="377" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${config.accentColor}">${escapeXml(config.audience)}</text>

      <!-- Bottom Banner -->
      <rect x="0" y="520" width="${CANVAS_WIDTH}" height="110" fill="${config.accentColor}"/>
      <text x="600" y="575" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#ffffff">✨ Personalized Christmas Magic ✨</text>
      <text x="600" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)">Custom audio message • Digital delivery • Keepsake forever</text>
    </svg>`;

    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    fs.writeFileSync(outputPath, buffer);
    console.log(`  Generated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`  Error generating ${themeId}:`, error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const themeArg = args.find(a => a.startsWith('--theme='));
  const limitArg = args.find(a => a.startsWith('--limit='));

  console.log('='.repeat(60));
  console.log('SANTA MESSAGE SAMPLE GENERATOR');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'GENERATING'}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let themesToGenerate = Object.keys(THEME_CONFIGS);

  if (themeArg) {
    const specificTheme = themeArg.split('=')[1];
    themesToGenerate = [specificTheme];
  }

  if (limitArg) {
    const limit = parseInt(limitArg.split('=')[1]);
    themesToGenerate = themesToGenerate.slice(0, limit);
  }

  console.log(`\nThemes to generate: ${themesToGenerate.length}`);

  const results: { themeId: string; path: string | null }[] = [];

  for (const themeId of themesToGenerate) {
    const outputPath = await generateSantaSample(themeId, dryRun);
    results.push({ themeId, path: outputPath });
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter(r => r.path).length}`);
  console.log(`Failed: ${results.filter(r => !r.path).length}`);

  // Save manifest
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    samples: results
  }, null, 2));

  console.log(`\nManifest saved: ${manifestPath}`);
}

main().catch(console.error);
