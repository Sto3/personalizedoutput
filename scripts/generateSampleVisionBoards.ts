/**
 * Generate Sample Vision Boards for Etsy Listings
 *
 * Uses visionBoardEngineV12 to generate sample images for each theme.
 * Saves to output/samples/vision-boards/<theme-id>.png
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
    title: 'My Healing Journey',
    subtitle: 'SELF-LOVE • GROWTH • NEW BEGINNINGS • PEACE',
    colors: {
      background: '#F8E8EE',
      accents: ['#FFB6C1', '#E8D4F0', '#B4E4FF', '#FFEAA7'],
      banner: '#4A3F45',
      bannerText: '#FFFFFF'
    },
    photos: ['monarch butterfly on flower', 'sunrise over calm ocean', 'pink blooming roses', 'cherry blossom tree',
             'peaceful zen garden', 'empty road through mountains', 'lit candles and bath salts', 'mountain summit view',
             'yoga mat with plants', 'cozy reading nook with books', 'leather journal and coffee cup', 'starry night sky'],
    quotes: ['"You are worthy of love"', '"This too shall pass"'],
    style: { mood: 'soft feminine healing', bokeh: true, decorations: false }
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
    photos: ['modern desk setup with monitor', 'laptop and latte art coffee', 'city skyline at sunset', 'business documents and pen',
             'organized minimalist desk', 'spiral staircase architecture', 'leather briefcase', 'modern glass office building',
             'conference room table', 'gold trophy on shelf', 'open planner with pen', 'sunrise over city'],
    quotes: ['"Your future starts today"', '"Believe in yourself"'],
    style: { mood: 'professional clean ambitious', bokeh: true, decorations: false }
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
    photos: ['champagne glasses and confetti', 'goal planner notebook', 'fresh fruit and smoothie bowl', 'vintage suitcase with map',
             'dumbbells and water bottle', 'dining table set for feast', 'desk with awards', 'cozy living room interior',
             'lush garden abundance', 'gratitude journal with pen', 'sunrise through window', 'sparklers in night'],
    quotes: ['"Make it happen"', '"Dream big"'],
    style: { mood: 'celebratory hopeful ambitious', bokeh: true, decorations: false }
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
    photos: ['pink heart shaped stones', 'vintage mirror with flowers', 'spa products and towels', 'pink peonies bouquet',
             'meditation cushion with incense', 'open journal and tea', 'colorful healthy salad bowl', 'forest path with sunlight',
             'soft knit blanket', 'sunflowers in golden light', 'bubble bath with rose petals', 'fresh flowers in vase'],
    quotes: ['"You are worthy"', '"Love yourself first"'],
    style: { mood: 'soft feminine self-care', bokeh: true, decorations: false }
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
    photos: ['gym equipment rack', 'green smoothie bowl', 'running shoes on track', 'yoga mat and blocks',
             'fresh vegetables arrangement', 'dumbbells and kettlebells', 'mountain trail path', 'swimming pool water',
             'meditation cushion setup', 'sunrise over track', 'stainless water bottle', 'gold medal trophy'],
    quotes: ['"Progress not perfection"', '"You got this"'],
    style: { mood: 'energetic motivational fitness', bokeh: true, decorations: false }
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
    photos: ['mason jar with coins', 'stock chart on screen', 'luxury home exterior', 'tropical resort pool',
             'budget planner notebook', 'laptop with graphs', 'safe with cash', 'beach sunset view',
             'confetti celebration', 'gold coins stacked', 'investment books', 'ocean horizon'],
    quotes: ['"Wealth flows to me"', '"Invest in yourself"'],
    style: { mood: 'professional abundant prosperous', bokeh: true, decorations: false }
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
    photos: ['airplane wing view clouds', 'eiffel tower at sunset', 'tropical beach palm trees', 'mountain peak vista',
             'passport and stamps', 'vintage suitcase', 'beach sunset waves', 'european cobblestone street',
             'exotic food spread', 'leather travel journal', 'hiking boots on trail', 'world map pinboard'],
    quotes: ['"Explore the world"', '"Adventure awaits"'],
    style: { mood: 'adventurous exciting exploration', bokeh: true, decorations: false }
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
    photos: ['red lipstick and compact', 'stage with spotlight', 'red bottom heels', 'designer handbag',
             'gold medal closeup', 'vintage microphone', 'ornate mirror frame', 'golden crown jewelry',
             'cliff edge ocean view', 'fashion magazine stack', 'empty boardroom', 'champagne popping'],
    quotes: ['"She believed she could"', '"Own your power"'],
    style: { mood: 'bold empowered confident', bokeh: true, decorations: false }
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
    photos: ['zen rock garden', 'meditation cushion with mala', 'still lake mountain reflection', 'incense smoke swirling',
             'misty forest path', 'ceramic tea set', 'yoga mat at sunrise', 'essential oil diffuser',
             'bamboo wind chimes', 'minimalist white room', 'cozy bed linens', 'flickering candle flame'],
    quotes: ['"Be present"', '"Peace begins within"'],
    style: { mood: 'calm peaceful serene', bokeh: true, decorations: false }
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
    photos: ['graduation caps in air', 'diploma scroll ribbon', 'interview outfit on hanger', 'apartment keys on table',
             'vision board desk', 'luggage at airport', 'city skyline view', 'professional blazer',
             'business cards stack', 'corner office window', 'confetti and streamers', 'sunrise new day'],
    quotes: ['"The world awaits"', '"Go get it"'],
    style: { mood: 'celebratory ambitious exciting', bokeh: true, decorations: false }
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
    photos: ['birthday cake with candles', 'colorful balloons bunch', 'wrapped gift boxes', 'champagne glasses toast',
             'bucket list notebook', 'map with pins', 'spa products arrangement', 'goals journal pen',
             'tropical beach resort', 'celebration confetti', 'concert tickets', 'golden sunlight'],
    quotes: ['"This is your year"', '"Celebrate you"'],
    style: { mood: 'celebratory joyful personal', bokeh: true, decorations: false }
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
    photos: ['sunrise over mountains', 'open bible with coffee', 'white church steeple', 'peaceful meadow flowers',
             'gratitude journal open', 'cross silhouette sunset', 'dinner table setting', 'dove in flight',
             'piano keys closeup', 'candlelit sanctuary', 'sunbeams through trees', 'winding path forward'],
    quotes: ['"Trust His plan"', '"Faith over fear"'],
    style: { mood: 'peaceful faithful reverent', bokeh: true, decorations: false }
  },

  // Masculine themes
  built_different: {
    title: 'BUILT DIFFERENT',
    subtitle: 'DISCIPLINE • STRENGTH • LEGACY',
    colors: {
      background: '#1A1A1A',
      accents: ['#2A2A2A', '#3A3A3A', '#4A4A4A', '#5A5A5A'],
      banner: '#000000',
      bannerText: '#FFFFFF'
    },
    photos: ['black dumbbells arranged in V shape', 'mountain summit at dawn', 'leather journal with pen',
             'black coffee steaming', 'black running shoes on concrete', 'minimalist dark desk setup',
             'chess board with pieces', 'luxury watch in box', 'boxing gloves on bench',
             'candle flame in darkness', 'sports car interior', 'empty gym at night'],
    quotes: ['"No excuses"', '"Built not born"'],
    style: { mood: 'dark masculine discipline', bokeh: false, decorations: false }
  },

  // Goal Achievement theme (for Goal hero sample) - NO PEOPLE
  level_up_2025: {
    title: 'LEVEL UP 2025',
    subtitle: 'GOALS • GROWTH • GREATNESS',
    colors: {
      background: '#1B2838',
      accents: ['#4A9BD4', '#56C596', '#F2B134', '#2D4255'],
      banner: '#F2B134',
      bannerText: '#1B2838'
    },
    photos: ['target bullseye with arrows', 'gold trophy on pedestal', 'stack of hundred dollar bills',
             'modern office with city view', 'running track lanes empty', 'signed contract with pen',
             'graduation cap and diploma', 'laptop showing growth chart', 'alarm clock reading 5am',
             'mountain summit flag planted', 'luxury sports car on road', 'bookshelf with success books'],
    quotes: ['"Dream big. Work hard. Stay focused."', '"Hit every target"'],
    style: { mood: 'dark ambitious achievement', bokeh: false, decorations: false }
  },

  // Relationship/Love theme (for Relationship hero sample) - NO PEOPLE
  our_love_story: {
    title: 'OUR LOVE STORY 2025',
    subtitle: 'LOVE • TOGETHER • FOREVER',
    colors: {
      background: '#FDF8F5',
      accents: ['#E86B6B', '#D4A5A5', '#A8C5DB', '#95B8A0'],
      banner: '#E86B6B',
      bannerText: '#FFFFFF'
    },
    photos: ['two intertwined red roses', 'romantic dinner table with candles', 'wedding rings on rose petals',
             'airplane tickets and passport', 'cozy fireplace with blanket', 'picnic basket in park',
             'two champagne glasses clinking', 'beach sunset with footprints', 'kitchen with fresh ingredients',
             'mountain hiking trail vista', 'charming house with garden', 'heart-shaped anniversary cake'],
    quotes: ['"In all the world, there is no heart for me like yours"', '"Forever starts now"'],
    style: { mood: 'romantic warm loving', bokeh: true, decorations: false }
  },

  // Christmas Gift - Masculine Theme (For Him) - NO PEOPLE
  christmas_for_him: {
    title: 'HIS 2025 VISION',
    subtitle: 'GOALS • GROWTH • GREATNESS',
    colors: {
      background: '#1A1A2E',
      accents: ['#C4A35A', '#2B4A2B', '#8B4513', '#1E3D59'],
      banner: '#C4A35A',
      bannerText: '#1A1A2E'
    },
    photos: ['black dumbbells arranged neatly', 'luxury leather watch on stand', 'sports car front view', 'mountain peak at sunrise',
             'executive leather office chair', 'golf clubs on green grass', 'premium whiskey glass amber', 'running track lanes empty',
             'chess pieces king and queen', 'stock chart on monitor', 'luxury villa pool view', 'sunrise over mountain range'],
    quotes: ['"The grind never stops"', '"Build your legacy"'],
    style: { mood: 'dark masculine luxury', bokeh: false, decorations: false }
  },

  // Christmas Gift - Feminine Theme (For Her) - NO PEOPLE
  christmas_for_her: {
    title: 'HER BEST YEAR 2025',
    subtitle: 'LOVE • DREAM • SHINE',
    colors: {
      background: '#FDF5F3',
      accents: ['#D4A5A5', '#E8B4B8', '#A8C5DB', '#F5E6CC'],
      banner: '#D4A5A5',
      bannerText: '#FFFFFF'
    },
    photos: ['pink peonies bouquet', 'spa candles and bath bombs', 'designer handbag on marble', 'cozy cashmere blanket',
             'champagne and macarons', 'beach sunset golden hour', 'yoga mat with candles', 'fresh flowers in ceramic vase',
             'luxury skincare products arranged', 'travel passport and world map', 'cozy reading corner with books', 'golden jewelry on velvet display'],
    quotes: ['"She believed she could, so she did"', '"Glow from within"'],
    style: { mood: 'soft feminine luxury', bokeh: true, decorations: false }
  },

  // Christmas Gift - Couple/Anniversary Theme - NO PEOPLE
  christmas_couple: {
    title: 'OUR YEAR TOGETHER 2025',
    subtitle: 'LOVE • ADVENTURE • FOREVER',
    colors: {
      background: '#F9F5F0',
      accents: ['#B85C5C', '#6B8E6B', '#C4A35A', '#5B7B8A'],
      banner: '#B85C5C',
      bannerText: '#FFFFFF'
    },
    photos: ['pair of wedding rings on roses', 'romantic dinner table candlelight', 'tropical beach palms sunset', 'cozy fireplace with blanket',
             'airplane window view clouds', 'two wine glasses toasting', 'mountain summit hiking gear', 'kitchen with fresh ingredients',
             'charming home with white fence', 'travel suitcases and passport', 'two footprints in beach sand', 'two-tier anniversary cake'],
    quotes: ['"Forever begins with you"', '"Our greatest adventure"'],
    style: { mood: 'warm romantic cozy', bokeh: true, decorations: false }
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
