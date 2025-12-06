/**
 * Symbol Sanitization Layer - MINIMAL VERSION
 *
 * Only block truly problematic symbols that cause safety failures.
 * Allow normal lifestyle objects to pass through unchanged.
 *
 * BLOCK ONLY:
 * - People/faces/hands references
 * - Explicit text references
 * - Alcohol/weapons
 *
 * ALLOW (do not modify):
 * - Laptops, notebooks, skincare bottles, shoes, decor, fruit
 * - Normal lifestyle objects
 */

const BLOCK_PATTERNS = [
  // People-related - these cause hard safety failures
  { match: /\b(person|people|face|hand|human|body|silhouette|portrait|selfie)\b/i, block: true },

  // Explicit text requests
  { match: /\b(text|writing|words|letters|quote|sign|signage)\b/i, block: true },

  // Alcohol - safety violation
  { match: /\b(wine|beer|alcohol|cocktail|champagne|whiskey|vodka|liquor|bar)\b/i, block: true },

  // Weapons - safety violation
  { match: /\b(gun|weapon|knife|sword)\b/i, block: true }
];

/**
 * Sanitize a single symbol - only block truly problematic items
 * Most symbols pass through unchanged
 * @param {string} raw - The original symbol description
 * @returns {string|null} - Symbol unchanged, or null if blocked
 */
function sanitizeSymbol(raw) {
  for (const rule of BLOCK_PATTERNS) {
    if (rule.match.test(raw)) {
      console.log(`[Sanitize] Blocking: "${raw}" (matched: ${rule.match})`);
      return null; // Block this symbol entirely
    }
  }
  // Pass through unchanged
  return raw;
}

/**
 * Check if a symbol should be blocked
 * @param {string} symbol - The symbol to check
 * @returns {boolean} - True if should be blocked
 */
function isBlockedSymbol(symbol) {
  for (const rule of BLOCK_PATTERNS) {
    if (rule.match.test(symbol)) {
      return true;
    }
  }
  return false;
}

/**
 * Filter symbols - remove blocked ones, keep everything else unchanged
 * @param {string[]} symbols - Array of symbols
 * @returns {string[]} - Filtered array (blocked items removed)
 */
function filterSymbols(symbols) {
  return symbols
    .map(sanitizeSymbol)
    .filter(s => s !== null);
}

module.exports = { sanitizeSymbol, isBlockedSymbol, filterSymbols };
