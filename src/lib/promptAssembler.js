const { PROVEN_PROMPT_TEMPLATE } = require('../config/prompts');

/**
 * Assembles the final prompt by inserting variables.
 *
 * RULES:
 * - Only replace the 5 designated variables
 * - Do not add anything else to the prompt
 * - Do not reformat the prompt
 * - SYMBOLIC_ELEMENTS must be a comma-separated natural list (not bullets)
 */

function assemblePrompt(variables) {
  const {
    STYLE_KEYWORDS,
    THEME_SENTENCE,
    NUM_ELEMENTS,
    COLOR_PALETTE,
    SYMBOLIC_ELEMENTS
  } = variables;

  // Simple string replacement
  let prompt = PROVEN_PROMPT_TEMPLATE
    .replace('${STYLE_KEYWORDS}', STYLE_KEYWORDS)
    .replace('${THEME_SENTENCE}', THEME_SENTENCE)
    .replace('${NUM_ELEMENTS}', NUM_ELEMENTS.toString())
    .replace('${COLOR_PALETTE}', COLOR_PALETTE)
    .replace('${SYMBOLIC_ELEMENTS}', SYMBOLIC_ELEMENTS);

  return prompt;
}

module.exports = { assemblePrompt };
