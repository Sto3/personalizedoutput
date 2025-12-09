/**
 * Generate Sample Vision Boards for Etsy Listings
 *
 * Uses visionBoardEngineV12 to generate sample images for each theme.
 * Saves to output/samples/vision-boards/<theme-id>.png
 */

import * as path from 'path';
import * as fs from 'fs';

// Import the vision board engine
const { generateVisionBoard } = require('../src/lib/visionBoardEngineV12');

// Import themes
import { VISION_BOARD_THEMES } from '../src/etsy/config/themes';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'samples', 'vision-boards');

// Theme-specific configurations for vision boards
const THEME_CONFIGS: Record<string, {
  title: string;
  subtitle: string;
  colors: { background: string; accents: string[]; banner: string; bannerText: string };
  photos: string[];
  quotes: string[];
  style: { mood: string; bokeh: boolean; decorations: boolean };
}> = {
  // Life Transitions
  post_breakup_healing: {
    title: 'HEALING',
    subtitle: 'New Beginnings',
    colors: {
      background: '#F8E8EE',
      accents: ['#FFB6C1', '#E8D4F0', '#B4E4FF', '#FFEAA7'],
      banner: '#4A3F45',
      bannerText: '#FFFFFF'
    },
    photos: ['butterfly transformation', 'sunrise over ocean', 'woman smiling', 'blooming flower',
             'peaceful garden', 'open road ahead', 'self-care candles', 'mountain summit',
             'yoga meditation', 'cozy reading nook', 'journal and coffee', 'starry night'],
    quotes: ['"You are worthy of love"', '"This too shall pass"'],
    style: { mood: 'soft feminine healing', bokeh: true, decorations: true }
  },

  new_job_career_change: {
    title: 'CAREER GOALS',
    subtitle: 'New Chapter',
    colors: {
      background: '#F5F0E8',
      accents: ['#4A90A4', '#7EB5A6', '#E8C547', '#D4A574'],
      banner: '#2C3E50',
      bannerText: '#FFFFFF'
    },
    photos: ['professional workspace', 'laptop and coffee', 'city skyline', 'handshake success',
             'organized desk', 'climbing stairs', 'confident person', 'modern office',
             'networking event', 'achievement trophy', 'planner calendar', 'sunrise'],
    quotes: ['"Your future starts today"', '"Believe in yourself"'],
    style: { mood: 'professional clean ambitious', bokeh: true, decorations: true }
  },

  new_year_2025_vision: {
    title: '2025 VISION',
    subtitle: 'My Best Year Yet',
    colors: {
      background: '#F0E6D3',
      accents: ['#C9A66B', '#8B7355', '#D4A574', '#E8C547'],
      banner: '#3A3530',
      bannerText: '#FFFFFF'
    },
    photos: ['champagne celebration', 'goal planner', 'healthy lifestyle', 'travel adventure',
             'fitness motivation', 'family gathering', 'career success', 'peaceful home',
             'abundance nature', 'gratitude journal', 'sunrise new day', 'sparklers celebration'],
    quotes: ['"Make it happen"', '"Dream big"'],
    style: { mood: 'celebratory hopeful ambitious', bokeh: true, decorations: true }
  },

  self_love_healing: {
    title: 'SELF LOVE',
    subtitle: 'You Are Enough',
    colors: {
      background: '#F8E8EE',
      accents: ['#FFB6C1', '#E8D4F0', '#FFEAA7', '#B4E4FF'],
      banner: '#4A3F45',
      bannerText: '#FFFFFF'
    },
    photos: ['heart hands', 'mirror affirmation', 'spa self-care', 'blooming flowers',
             'peaceful meditation', 'journaling', 'healthy meal', 'nature walk',
             'cozy blanket', 'sunshine face', 'bubble bath', 'smile portrait'],
    quotes: ['"You are worthy"', '"Love yourself first"'],
    style: { mood: 'soft feminine self-care', bokeh: true, decorations: true }
  },

  fitness_health_journey: {
    title: 'HEALTH GOALS',
    subtitle: 'Strong Body, Strong Mind',
    colors: {
      background: '#E8F4E8',
      accents: ['#7EB5A6', '#4A90A4', '#E8C547', '#FF6B6B'],
      banner: '#2C5530',
      bannerText: '#FFFFFF'
    },
    photos: ['gym workout', 'healthy smoothie', 'running outdoors', 'yoga pose',
             'fresh vegetables', 'weights training', 'mountain hiking', 'swimming pool',
             'meditation peaceful', 'sunrise run', 'water bottle', 'achievement'],
    quotes: ['"Progress not perfection"', '"You got this"'],
    style: { mood: 'energetic motivational fitness', bokeh: true, decorations: true }
  },

  financial_goals_abundance: {
    title: 'ABUNDANCE',
    subtitle: 'Financial Freedom',
    colors: {
      background: '#F5F0E8',
      accents: ['#C9A66B', '#4A90A4', '#7EB5A6', '#E8C547'],
      banner: '#2C3E50',
      bannerText: '#FFFFFF'
    },
    photos: ['savings jar coins', 'investment growth', 'dream home', 'luxury vacation',
             'budget planner', 'passive income', 'emergency fund', 'retirement beach',
             'debt free celebration', 'prosperity mindset', 'wealth building', 'financial freedom'],
    quotes: ['"Wealth flows to me"', '"Invest in yourself"'],
    style: { mood: 'professional abundant prosperous', bokeh: true, decorations: true }
  },

  travel_goals_dream_trips: {
    title: 'WANDERLUST',
    subtitle: 'Adventure Awaits',
    colors: {
      background: '#E8F4F8',
      accents: ['#4A90A4', '#E8C547', '#FF6B6B', '#7EB5A6'],
      banner: '#2C4A5E',
      bannerText: '#FFFFFF'
    },
    photos: ['airplane window', 'eiffel tower paris', 'tropical beach', 'mountain adventure',
             'passport stamps', 'suitcase packed', 'sunset beach', 'city exploration',
             'local cuisine', 'travel journal', 'adventure hiking', 'world map'],
    quotes: ['"Explore the world"', '"Adventure awaits"'],
    style: { mood: 'adventurous exciting exploration', bokeh: true, decorations: true }
  },

  confidence_empowerment: {
    title: 'CONFIDENCE',
    subtitle: 'Unstoppable',
    colors: {
      background: '#F8E8E8',
      accents: ['#FF6B6B', '#E8C547', '#4A90A4', '#7EB5A6'],
      banner: '#4A3030',
      bannerText: '#FFFFFF'
    },
    photos: ['power pose woman', 'stage spotlight', 'bold lipstick', 'high heels',
             'achievement medal', 'microphone speech', 'mirror confidence', 'crown success',
             'fearless jump', 'bold fashion', 'leadership meeting', 'celebration'],
    quotes: ['"She believed she could"', '"Own your power"'],
    style: { mood: 'bold empowered confident', bokeh: true, decorations: true }
  },

  mindfulness_peace_calm: {
    title: 'INNER PEACE',
    subtitle: 'Find Your Calm',
    colors: {
      background: '#F0F4F0',
      accents: ['#7EB5A6', '#B4E4FF', '#E8D4F0', '#FFEAA7'],
      banner: '#3A4A3A',
      bannerText: '#FFFFFF'
    },
    photos: ['zen garden', 'meditation cushion', 'calm lake reflection', 'incense burning',
             'peaceful forest', 'morning tea', 'yoga sunrise', 'breathing exercise',
             'nature sounds', 'minimalist room', 'peaceful sleeping', 'candle flame'],
    quotes: ['"Be present"', '"Peace begins within"'],
    style: { mood: 'calm peaceful serene', bokeh: true, decorations: true }
  },

  graduation_new_grad: {
    title: 'CLASS OF 2025',
    subtitle: 'The Future is Yours',
    colors: {
      background: '#F0E8F8',
      accents: ['#E8C547', '#4A90A4', '#FF6B6B', '#7EB5A6'],
      banner: '#2C2C50',
      bannerText: '#FFFFFF'
    },
    photos: ['graduation cap throw', 'diploma celebration', 'first job interview', 'apartment keys',
             'career goals', 'travel adventure', 'city life', 'professional attire',
             'networking event', 'dream career', 'celebration party', 'bright future'],
    quotes: ['"The world awaits"', '"Go get it"'],
    style: { mood: 'celebratory ambitious exciting', bokeh: true, decorations: true }
  },

  birthday_year_vision: {
    title: 'MY YEAR',
    subtitle: 'This is My Time',
    colors: {
      background: '#F8F0E8',
      accents: ['#FFB6C1', '#E8C547', '#B4E4FF', '#E8D4F0'],
      banner: '#4A3F45',
      bannerText: '#FFFFFF'
    },
    photos: ['birthday candles', 'celebration balloons', 'gift wrapped', 'champagne toast',
             'bucket list', 'adventure planning', 'self love spa', 'goals journal',
             'dream vacation', 'friendship celebration', 'new experiences', 'joy happiness'],
    quotes: ['"This is your year"', '"Celebrate you"'],
    style: { mood: 'celebratory joyful personal', bokeh: true, decorations: true }
  },

  faith_purpose_calling: {
    title: 'FAITH & PURPOSE',
    subtitle: 'Trust the Journey',
    colors: {
      background: '#F5F0E8',
      accents: ['#C9A66B', '#8B7355', '#7EB5A6', '#B4E4FF'],
      banner: '#3A3530',
      bannerText: '#FFFFFF'
    },
    photos: ['sunrise prayer', 'bible and coffee', 'church steeple', 'peaceful nature',
             'grateful heart hands', 'cross sunset', 'family blessing', 'helping hands',
             'worship music', 'quiet reflection', 'grace light', 'faith journey'],
    quotes: ['"Trust His plan"', '"Faith over fear"'],
    style: { mood: 'peaceful faithful reverent', bokeh: true, decorations: true }
  }
};

// Default config for themes not specifically defined
const DEFAULT_CONFIG = {
  title: 'MY VISION',
  subtitle: 'Dream Big',
  colors: {
    background: '#F5E8ED',
    accents: ['#FFB6C1', '#B4E4FF', '#E8D4F0', '#FFEAA7'],
    banner: '#4A3F45',
    bannerText: '#FFFFFF'
  },
  photos: ['success achievement', 'peaceful nature', 'happy life', 'dream lifestyle',
           'motivation sunrise', 'goal planning', 'self improvement', 'abundance',
           'health wellness', 'love happiness', 'career growth', 'adventure travel'],
  quotes: ['"Believe in yourself"', '"Make it happen"'],
  style: { mood: 'dreamy warm aesthetic', bokeh: true, decorations: true }
};

async function generateSampleForTheme(themeId: string, dryRun: boolean = false): Promise<string | null> {
  const config = THEME_CONFIGS[themeId] || DEFAULT_CONFIG;
  const theme = VISION_BOARD_THEMES.find(t => t.id === themeId);

  console.log(`\nGenerating sample for: ${theme?.displayName || themeId}`);

  const input = {
    title: config.title,
    subtitle: config.subtitle,
    colors: config.colors,
    photos: config.photos,
    quotes: config.quotes,
    textBlocks: [],
    style: config.style
  };

  const outputPath = path.join(OUTPUT_DIR, `${themeId}.png`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would generate: ${outputPath}`);
    console.log(`  Config: ${JSON.stringify(config, null, 2).slice(0, 200)}...`);
    return outputPath;
  }

  try {
    const result = await generateVisionBoard(input, {
      skipGeneration: false,  // Use real image generation
      costLimit: 0.50  // Limit cost per board
    });

    // The engine saves to OUTPUT_DIR by default, we may need to copy/rename
    console.log(`  Generated: ${result?.outputPath || outputPath}`);
    return result?.outputPath || outputPath;
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
  console.log('VISION BOARD SAMPLE GENERATOR');
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
    const outputPath = await generateSampleForTheme(themeId, dryRun);
    results.push({ themeId, path: outputPath });

    // Small delay between generations to avoid rate limits
    if (!dryRun) {
      await new Promise(r => setTimeout(r, 1000));
    }
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
