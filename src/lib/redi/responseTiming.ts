/**
 * Response Timing Optimization
 *
 * Adds natural delays to responses to make Redi feel less robotic.
 * Instant responses feel uncanny - a slight "thinking" pause feels human.
 *
 * IMPACT: Minor UX polish. Makes Redi feel more thoughtful and human-like.
 * Not transformative, but adds to the overall quality feel.
 */

/**
 * Calculate natural response delay based on context
 *
 * @param isPrompted - Whether user asked a question
 * @param responseLength - Number of words in response
 * @param complexity - Estimated complexity of the response (0-1)
 * @returns Delay in milliseconds
 */
export function calculateNaturalDelay(
  isPrompted: boolean,
  responseLength: number,
  complexity: number = 0.5
): number {
  let baseDelay: number;

  if (isPrompted) {
    // User asked a question - they're expecting a response
    // Slight "thinking" pause feels natural
    baseDelay = 150 + Math.random() * 200; // 150-350ms

    // Longer responses warrant slightly more "thinking" time
    baseDelay += Math.min(responseLength * 10, 200); // Up to +200ms

    // Complex responses (multi-part, detailed) need more time
    baseDelay += complexity * 150; // Up to +150ms
  } else {
    // Unprompted observation - should feel spontaneous
    // Very short delay, almost immediate
    baseDelay = 50 + Math.random() * 100; // 50-150ms
  }

  // Add slight randomness to feel more natural
  const jitter = (Math.random() - 0.5) * 50; // ±25ms

  return Math.max(50, Math.round(baseDelay + jitter));
}

/**
 * Wait for the natural delay before responding
 */
export async function waitForNaturalTiming(
  isPrompted: boolean,
  responseLength: number,
  complexity: number = 0.5
): Promise<void> {
  const delay = calculateNaturalDelay(isPrompted, responseLength, complexity);
  await sleep(delay);
}

/**
 * Check if context is still valid after delay
 * (User may have moved on or spoken again)
 */
export function isContextStale(
  contextTimestamp: number,
  maxAgeMs: number = 3000
): boolean {
  return Date.now() - contextTimestamp > maxAgeMs;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Response timing configuration
 */
export const TIMING_CONFIG = {
  // Maximum delay for prompted responses (don't make user wait too long)
  maxPromptedDelayMs: 500,

  // Maximum delay for unprompted observations
  maxUnpromptedDelayMs: 200,

  // Minimum delay (to avoid uncanny instant responses)
  minDelayMs: 50,

  // Context staleness threshold
  contextStaleMs: 3000
};
