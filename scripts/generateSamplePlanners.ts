/**
 * Generate Sample Planner Graphics for Etsy Listings
 *
 * Creates mock page spread layouts for planners.
 * Uses Sharp for image generation.
 * Saves to output/samples/planners/<theme-id>.png
 */

import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';

// Import themes
import { PLANNER_THEMES } from '../src/etsy/config/themes';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'samples', 'planners');

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1000;

// Theme-specific configurations
const THEME_CONFIGS: Record<string, {
  title: string;
  pageTitle1: string;
  pageTitle2: string;
  prompts: string[];
  accentColor: string;
  bgColor: string;
  textColor: string;
  mood: string;
}> = {
  pl_post_breakup: {
    title: 'Post-Breakup Reflection Planner',
    pageTitle1: 'Processing My Feelings',
    pageTitle2: 'My New Chapter',
    prompts: [
      'What I\'m grateful for today...',
      'Three things that made me smile...',
      'One boundary I\'m setting...',
      'My affirmation for today...'
    ],
    accentColor: '#E8B4D4',
    bgColor: '#FFF8FA',
    textColor: '#4A3F45',
    mood: 'soft healing'
  },
  pl_career_change_clarity: {
    title: 'Career Change Clarity Planner',
    pageTitle1: 'Skills & Strengths',
    pageTitle2: 'My Ideal Role',
    prompts: [
      'Skills I\'m proud of...',
      'What energizes me at work...',
      'My non-negotiables...',
      'Next steps this week...'
    ],
    accentColor: '#4A90A4',
    bgColor: '#F5F8FA',
    textColor: '#2C3E50',
    mood: 'professional confident'
  },
  pl_new_year_reset: {
    title: 'New Year Reset Planner',
    pageTitle1: 'Reflecting on Last Year',
    pageTitle2: 'Goals for the Year Ahead',
    prompts: [
      'My biggest win last year...',
      'What I want to release...',
      'My word for this year...',
      'Three priorities for Q1...'
    ],
    accentColor: '#C9A66B',
    bgColor: '#F5F0E8',
    textColor: '#3A3530',
    mood: 'fresh hopeful'
  },
  pl_goal_clarity: {
    title: 'Goal Clarity Planner',
    pageTitle1: 'Defining My Goals',
    pageTitle2: 'Action Planning',
    prompts: [
      'My big dream goal...',
      'Why this matters to me...',
      'First milestone...',
      'Obstacles & solutions...'
    ],
    accentColor: '#7EB5A6',
    bgColor: '#F0F4F0',
    textColor: '#2C4A3A',
    mood: 'focused intentional'
  },
  pl_confidence_building: {
    title: 'Confidence Building Planner',
    pageTitle1: 'Celebrating My Wins',
    pageTitle2: 'Growth Challenges',
    prompts: [
      'A time I was brave...',
      'Compliments I\'ve received...',
      'What I\'m proud of...',
      'My comfort zone stretch...'
    ],
    accentColor: '#FF6B6B',
    bgColor: '#FFF5F5',
    textColor: '#4A3030',
    mood: 'bold empowering'
  },
  pl_gratitude_faith: {
    title: 'Gratitude & Faith Planner',
    pageTitle1: 'Today\'s Blessings',
    pageTitle2: 'Prayer & Reflection',
    prompts: [
      'Three blessings today...',
      'How God showed up...',
      'What I\'m praying for...',
      'Scripture that spoke to me...'
    ],
    accentColor: '#C9A66B',
    bgColor: '#F5F0E8',
    textColor: '#3A3530',
    mood: 'peaceful faithful'
  },
  pl_relationship_check_in: {
    title: 'Relationship Check-In Planner',
    pageTitle1: 'Connection Moments',
    pageTitle2: 'Growth Together',
    prompts: [
      'What I appreciate about us...',
      'A favorite memory recently...',
      'Something I want to share...',
      'Our next adventure...'
    ],
    accentColor: '#E8B4D4',
    bgColor: '#FFF8FA',
    textColor: '#4A3F45',
    mood: 'loving connected'
  },
  pl_time_priorities: {
    title: 'Time & Priorities Planner',
    pageTitle1: 'Weekly Overview',
    pageTitle2: 'Focus Priorities',
    prompts: [
      'This week\'s top 3 priorities...',
      'Time blocks for deep work...',
      'Boundaries I\'m honoring...',
      'Energy management...'
    ],
    accentColor: '#4A90A4',
    bgColor: '#F5F8FA',
    textColor: '#2C3E50',
    mood: 'organized focused'
  }
};

// Default config
const DEFAULT_CONFIG = {
  title: 'Reflection Planner',
  pageTitle1: 'Daily Reflection',
  pageTitle2: 'Goals & Intentions',
  prompts: [
    'What I\'m grateful for...',
    'Today\'s focus...',
    'Reflections...',
    'Tomorrow\'s intention...'
  ],
  accentColor: '#C9A66B',
  bgColor: '#F5F0E8',
  textColor: '#3A3530',
  mood: 'thoughtful calm'
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generatePlannerSample(themeId: string, dryRun: boolean = false): Promise<string | null> {
  const config = THEME_CONFIGS[themeId] || DEFAULT_CONFIG;
  const theme = PLANNER_THEMES.find(t => t.id === themeId);

  console.log(`\nGenerating planner sample for: ${theme?.displayName || themeId}`);

  const outputPath = path.join(OUTPUT_DIR, `${themeId}.png`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would generate: ${outputPath}`);
    return outputPath;
  }

  try {
    // Generate lines for writing areas
    const generateLines = (startY: number, count: number, width: number) => {
      let lines = '';
      for (let i = 0; i < count; i++) {
        const y = startY + i * 28;
        lines += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
      }
      return lines;
    };

    // Create SVG for two-page spread
    const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pageShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="10" flood-color="rgba(0,0,0,0.15)"/>
        </filter>
        <filter id="innerShadow">
          <feDropShadow dx="-2" dy="0" stdDeviation="3" flood-color="rgba(0,0,0,0.1)"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="#e8e4df"/>

      <!-- Decorative Elements -->
      <circle cx="80" cy="80" r="40" fill="${config.accentColor}" opacity="0.1"/>
      <circle cx="1520" cy="920" r="50" fill="${config.accentColor}" opacity="0.1"/>

      <!-- Left Page -->
      <g filter="url(#pageShadow)">
        <rect x="100" y="50" width="650" height="900" fill="${config.bgColor}" rx="5"/>

        <!-- Page Header -->
        <rect x="100" y="50" width="650" height="60" fill="${config.accentColor}" opacity="0.15" rx="5 5 0 0"/>
        <text x="425" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="${config.textColor}">${escapeXml(config.pageTitle1)}</text>

        <!-- Decorative Line -->
        <line x1="200" y1="130" x2="650" y2="130" stroke="${config.accentColor}" stroke-width="2"/>

        <!-- Prompt 1 -->
        <text x="140" y="180" font-family="Georgia, serif" font-size="16" fill="${config.textColor}" font-style="italic">${escapeXml(config.prompts[0])}</text>
        <g transform="translate(140, 200)">
          ${generateLines(0, 6, 570)}
        </g>

        <!-- Prompt 2 -->
        <text x="140" y="400" font-family="Georgia, serif" font-size="16" fill="${config.textColor}" font-style="italic">${escapeXml(config.prompts[1])}</text>
        <g transform="translate(140, 420)">
          ${generateLines(0, 6, 570)}
        </g>

        <!-- Decorative Corner -->
        <path d="M100 880 L100 950 L170 950" fill="none" stroke="${config.accentColor}" stroke-width="2" opacity="0.3"/>

        <!-- Page Number -->
        <text x="140" y="920" font-family="Georgia, serif" font-size="12" fill="#999">12</text>
      </g>

      <!-- Binding Shadow -->
      <rect x="748" y="50" width="4" height="900" fill="rgba(0,0,0,0.1)"/>

      <!-- Right Page -->
      <g filter="url(#pageShadow)">
        <rect x="850" y="50" width="650" height="900" fill="${config.bgColor}" rx="5"/>

        <!-- Page Header -->
        <rect x="850" y="50" width="650" height="60" fill="${config.accentColor}" opacity="0.15" rx="5 5 0 0"/>
        <text x="1175" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="${config.textColor}">${escapeXml(config.pageTitle2)}</text>

        <!-- Decorative Line -->
        <line x1="950" y1="130" x2="1400" y2="130" stroke="${config.accentColor}" stroke-width="2"/>

        <!-- Prompt 3 -->
        <text x="890" y="180" font-family="Georgia, serif" font-size="16" fill="${config.textColor}" font-style="italic">${escapeXml(config.prompts[2])}</text>
        <g transform="translate(890, 200)">
          ${generateLines(0, 6, 570)}
        </g>

        <!-- Prompt 4 -->
        <text x="890" y="400" font-family="Georgia, serif" font-size="16" fill="${config.textColor}" font-style="italic">${escapeXml(config.prompts[3])}</text>
        <g transform="translate(890, 420)">
          ${generateLines(0, 6, 570)}
        </g>

        <!-- Checkbox Area -->
        <rect x="890" y="600" width="560" height="200" fill="${config.accentColor}" opacity="0.05" rx="10"/>
        <text x="920" y="640" font-family="Georgia, serif" font-size="16" fill="${config.textColor}">Today's Priorities:</text>
        <g transform="translate(920, 660)">
          <rect x="0" y="0" width="20" height="20" fill="none" stroke="${config.accentColor}" stroke-width="2" rx="3"/>
          <line x1="30" y1="15" x2="520" y2="15" stroke="#e0e0e0" stroke-width="1"/>
          <rect x="0" y="35" width="20" height="20" fill="none" stroke="${config.accentColor}" stroke-width="2" rx="3"/>
          <line x1="30" y1="50" x2="520" y2="50" stroke="#e0e0e0" stroke-width="1"/>
          <rect x="0" y="70" width="20" height="20" fill="none" stroke="${config.accentColor}" stroke-width="2" rx="3"/>
          <line x1="30" y1="85" x2="520" y2="85" stroke="#e0e0e0" stroke-width="1"/>
        </g>

        <!-- Decorative Corner -->
        <path d="M1430 880 L1500 880 L1500 950" fill="none" stroke="${config.accentColor}" stroke-width="2" opacity="0.3"/>

        <!-- Page Number -->
        <text x="1460" y="920" font-family="Georgia, serif" font-size="12" fill="#999">13</text>
      </g>

      <!-- Title Banner -->
      <rect x="550" y="0" width="500" height="45" fill="${config.accentColor}" rx="0 0 10 10"/>
      <text x="800" y="32" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#fff">${escapeXml(config.title)}</text>
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
  console.log('PLANNER SAMPLE GENERATOR');
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
    const outputPath = await generatePlannerSample(themeId, dryRun);
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
