/**
 * Generates the 5 required variables from workbook data.
 *
 * Variables:
 * - STYLE_KEYWORDS: aesthetic descriptors
 * - THEME_SENTENCE: single sentence describing the board's meaning
 * - NUM_ELEMENTS: number of symbolic items (12-24)
 * - COLOR_PALETTE: comma-separated colors
 * - SYMBOLIC_ELEMENTS: comma-separated list of objects (natural language)
 * - BANNER_COLOR: rgba color for the title banner
 */

const { filterSymbols } = require('./sanitizeSymbol');

/**
 * BASE STYLE KEYWORDS - THE MAGIC FORMULA
 *
 * These keywords produce the rich, textured, atmospheric collage style
 * that works consistently. DO NOT MODIFY without extensive testing.
 *
 * Every aesthetic uses this same base - only colors/theme/symbols change.
 */
const BASE_STYLE_KEYWORDS = 'dreamy, soft, warm, cinematic bokeh, Pinterest mood board, scrapbook collage, layered paper textures';

/**
 * AESTHETIC PRESETS
 *
 * Each preset only defines what CHANGES from the base:
 * - THEME_SENTENCE: The meaning/intention of the board
 * - DEFAULT_COLORS: The color palette
 * - BANNER_COLOR: Semi-transparent overlay color for title
 *
 * STYLE_KEYWORDS is always the BASE_STYLE_KEYWORDS (proven formula)
 */
const AESTHETIC_PRESETS = {
  'feminine-glowup': {
    THEME_SENTENCE: 'This board expresses self-love, lifestyle glow-up energy, creativity, calm, and gentle personal transformation.',
    BANNER_COLOR: 'rgba(45, 35, 40, 0.75)',  // Soft dark mauve - complements pink/peach
    DEFAULT_COLORS: 'soft pink, peach, lavender, warm cream, soft gold'
  },
  'masculine-editorial': {
    THEME_SENTENCE: 'This board represents discipline, ambition, clarity, structure, grounded mindset, and high-performance personal development.',
    BANNER_COLOR: 'rgba(25, 30, 35, 0.85)',  // Deep slate - complements dark/neutral tones
    DEFAULT_COLORS: 'charcoal, navy, warm gray, cognac brown, matte black, brushed gold'
  },
  'neutral-minimal': {
    THEME_SENTENCE: 'This board reflects grounding, clarity, calm productivity, warmth, and gentle lifestyle intention.',
    BANNER_COLOR: 'rgba(60, 55, 50, 0.7)',   // Warm charcoal - complements beige/cream
    DEFAULT_COLORS: 'warm beige, cream, soft taupe, natural linen, warm white'
  },
  'conceptual-abstract': {
    THEME_SENTENCE: 'This board symbolizes introspection, philosophical inquiry, stillness, subtle meaning, and quiet creative thought.',
    BANNER_COLOR: 'rgba(35, 35, 40, 0.8)',   // Cool charcoal - complements muted tones
    DEFAULT_COLORS: 'muted gray, soft black, warm ivory, dusty blue, aged paper'
  },
  'bold-ambitious': {
    THEME_SENTENCE: 'This board represents success, wealth, ambition, power moves, and unstoppable momentum toward goals.',
    BANNER_COLOR: 'rgba(15, 15, 20, 0.85)',  // Near black - complements luxury aesthetic
    DEFAULT_COLORS: 'black, gold, deep navy, rich burgundy, polished silver'
  },
  'earthy-grounded': {
    THEME_SENTENCE: 'This board expresses connection to nature, inner peace, sustainable living, and organic growth.',
    BANNER_COLOR: 'rgba(50, 45, 35, 0.75)',  // Warm brown - complements earth tones
    DEFAULT_COLORS: 'terracotta, sage green, warm brown, natural cream, forest green'
  }
};

function generateVariables(workbookData, options = {}) {
  const {
    aesthetic = 'feminine-glowup',
    customStyleKeywords = null,
    customThemeSentence = null,
    colors = null,
    symbols = [],
    elementCount = 18,
    boardTitle = 'My Vision Board'
  } = workbookData;

  const { skipSanitization = false } = options;

  // Get preset or use custom
  const preset = AESTHETIC_PRESETS[aesthetic] || AESTHETIC_PRESETS['feminine-glowup'];

  // Minimal sanitization - only filter out truly blocked items (people, alcohol, weapons)
  // Most symbols pass through unchanged
  const processedSymbols = skipSanitization
    ? symbols
    : filterSymbols(symbols);

  return {
    STYLE_KEYWORDS: customStyleKeywords || BASE_STYLE_KEYWORDS,
    THEME_SENTENCE: customThemeSentence || preset.THEME_SENTENCE,
    NUM_ELEMENTS: elementCount,
    COLOR_PALETTE: colors || preset.DEFAULT_COLORS,
    SYMBOLIC_ELEMENTS: formatSymbolsAsNaturalList(processedSymbols),
    BOARD_TITLE: boardTitle,
    BANNER_COLOR: preset.BANNER_COLOR,
    // Include for logging
    _originalSymbols: symbols,
    _processedSymbols: processedSymbols,
    _aesthetic: aesthetic
  };
}

/**
 * CRITICAL: Format symbols as natural comma-separated prose.
 * NOT as bullet points or newline-separated list.
 */
function formatSymbolsAsNaturalList(symbols) {
  if (!symbols || symbols.length === 0) {
    // Default symbols if none provided
    return 'fresh flowers in a vase, a lit candle, a cozy knit blanket, a bowl of fresh fruit, soft ambient lighting, and decorative objects';
  }

  if (symbols.length === 1) {
    return symbols[0];
  }

  // Join with commas, "and" before the last item
  const allButLast = symbols.slice(0, -1).join(', ');
  const last = symbols[symbols.length - 1];
  return `${allButLast}, and ${last}`;
}

module.exports = { generateVariables, AESTHETIC_PRESETS };
