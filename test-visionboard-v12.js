require('dotenv').config();

const { generateVisionBoard } = require('./src/lib/visionBoardEngineV12');

// Test with quotes and text blocks
const selfLoveGlowUpInput = {
  title: "My Big 2025 Glow-Up Vision",
  subtitle: "SELF-LOVE • FRIENDSHIPS • TRAVEL • CREATIVITY • WELLNESS",

  colors: {
    background: '#F5E8ED',
    accents: ['#FFB6C1', '#B4E4FF', '#E8D4F0', '#FFEAA7', '#B8F0D4', '#FFD4E5'],
    banner: '#4A3F45',
    bannerText: '#F8F4F6',
    bannerSubtext: 'rgba(255,255,255,0.7)'
  },

  photos: [
    'airplane window view with pink sunset clouds',
    'two iced coffee drinks on cozy cafe table with fairy lights',
    'pink laptop on aesthetic desk with plants and candles',
    'colorful acai bowl with fresh berries and flowers',
    'charming european street with string lights at dusk',
    'pink skincare bottles on marble surface with soft lighting',
    'colorful beaded friendship bracelets on soft pink fabric',
    'lavender sneakers in flower meadow with bokeh',
    'aesthetic planner with sticky notes and roses',
    'golden hour pink purple sunset clouds',
    'cozy rolled blanket with fairy lights twinkling',
    'luxury perfume bottles on elegant vanity display'
  ],

  quotes: [
    "I am worthy of beautiful things",
    "This is my season of blooming",
    "Choosing myself always",
    "Dream big, sparkle more"
  ],

  textBlocks: [
    "GLOW",
    "MAGIC",
    "SHINE",
    "BLOOM"
  ],

  style: {
    decorations: true,
    bokeh: true,
    mood: 'soft pastel dreamy bokeh feminine aesthetic warm golden lighting'
  }
};

const masculineInput = {
  title: "Built Different",
  subtitle: "DISCIPLINE • STRENGTH • LEGACY",

  colors: {
    background: '#1E1E1E',
    accents: ['#8B7355', '#5A5A5A', '#4A6741', '#6B5B4F', '#7A7A7A'],
    banner: '#0F0F0F',
    bannerText: '#E8E4E0',
    bannerSubtext: 'rgba(255,255,255,0.5)'
  },

  photos: [
    'gym weights on dark floor dramatic lighting',
    'morning sunrise over mountain silhouette',
    'leather journal with fountain pen on dark wood',
    'black coffee ceramic mug steam rising',
    'running shoes on wet pavement morning',
    'minimalist desk setup single monitor dark',
    'chess pieces strategic thinking moody light',
    'luxury watch on dark velvet display',
    'mountain climber summit at dawn',
    'boxing gloves in dark gym',
    'meditation single candle flame',
    'sports car dashboard night city'
  ],

  quotes: [
    "Discipline over motivation",
    "The grind never stops",
    "Embrace the struggle",
    "Legacy over comfort"
  ],

  textBlocks: [
    "GRIND",
    "LEGACY",
    "FOCUS",
    "RISE"
  ],

  style: {
    decorations: false,
    bokeh: false,
    mood: 'moody dark dramatic editorial masculine sophisticated'
  }
};

async function runTest() {
  console.log('='.repeat(70));
  console.log('VISION BOARD V12 - REFERENCE LAYOUT + TEXT BETWEEN PHOTOS');
  console.log('='.repeat(70));
  console.log('');
  console.log('KEY CHANGE:');
  console.log('  ✓ Photo layout SAME as reference (V9 sizes/positions)');
  console.log('  ✓ Text/quotes rendered BEFORE photos');
  console.log('  ✓ Photos layer on TOP, so text peeks out from gaps');
  console.log('  ✓ More text/quote positions for 4 quotes + 4 text blocks');
  console.log('');

  console.log('--- Feminine Glow-Up ---');
  const r1 = await generateVisionBoard(selfLoveGlowUpInput, { skipGeneration: true });
  console.log('Saved:', r1.filepath);

  console.log('\n--- Masculine Focus ---');
  const r2 = await generateVisionBoard(masculineInput, { skipGeneration: true });
  console.log('Saved:', r2.filepath);

  console.log('\n' + '='.repeat(70));
  console.log('COMPARE: Text should now peek out from BETWEEN photos');
  console.log('='.repeat(70));
}

runTest().catch(console.error);
