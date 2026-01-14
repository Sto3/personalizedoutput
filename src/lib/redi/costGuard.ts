/**
 * Cost Guard Service
 *
 * MILITARY-GRADE rate limiting with invisible degradation.
 * Protects against runaway costs while maintaining great UX.
 *
 * Philosophy:
 * - Users should NEVER notice limits 95% of the time
 * - When limits hit, gracefully degrade (don't fail)
 * - Track costs in real-time, warn before limits
 * - Different limits for free vs paid tiers
 */

// ============================================================================
// COST CONFIGURATION
// ============================================================================

/**
 * Estimated costs per operation (USD)
 * These are conservative estimates - actual may vary
 */
const COSTS = {
  // Claude Vision (Sonnet with image)
  claudeVisionCall: 0.015,        // ~$0.015 per image analysis

  // Claude Text (varies by model)
  claudeSonnetCall: 0.008,        // ~$0.008 per response
  claudeHaikuCall: 0.001,         // ~$0.001 per response

  // Voice
  elevenLabsTTS: 0.00003,         // ~$0.00003 per character
  deepgramTranscription: 0.0001,  // ~$0.0001 per second of audio
};

/**
 * Session limits by tier (USD per 15-minute session)
 */
const SESSION_LIMITS = {
  free: {
    totalBudget: 0.15,            // $0.15 per session (~10 vision calls)
    claudeVisionMax: 10,          // Max 10 vision calls per session
    claudeTextMax: 50,            // Max 50 text calls per session
    warningThreshold: 0.8,        // Warn at 80% of budget
  },
  paid: {
    totalBudget: 0.50,            // $0.50 per session (~33 vision calls)
    claudeVisionMax: 40,          // Max 40 vision calls per session
    claudeTextMax: 200,           // Max 200 text calls per session
    warningThreshold: 0.9,        // Warn at 90% of budget
  }
};

// ============================================================================
// SESSION COST TRACKING
// ============================================================================

interface SessionCosts {
  sessionId: string;
  tier: 'free' | 'paid';
  startedAt: number;

  // Operation counts
  claudeVisionCalls: number;
  claudeSonnetCalls: number;
  claudeHaikuCalls: number;
  ttsCharacters: number;
  transcriptionSeconds: number;

  // Computed costs
  totalCost: number;

  // Flags
  warningIssued: boolean;
  limitReached: boolean;
}

const sessionCosts = new Map<string, SessionCosts>();

/**
 * Initialize cost tracking for a session
 */
export function initCostTracking(sessionId: string, tier: 'free' | 'paid' = 'free'): void {
  sessionCosts.set(sessionId, {
    sessionId,
    tier,
    startedAt: Date.now(),
    claudeVisionCalls: 0,
    claudeSonnetCalls: 0,
    claudeHaikuCalls: 0,
    ttsCharacters: 0,
    transcriptionSeconds: 0,
    totalCost: 0,
    warningIssued: false,
    limitReached: false
  });
  console.log(`[CostGuard] Tracking initialized for ${sessionId} (${tier} tier)`);
}

/**
 * Clean up cost tracking for a session
 */
export function cleanupCostTracking(sessionId: string): SessionCosts | null {
  const costs = sessionCosts.get(sessionId);
  if (costs) {
    console.log(`[CostGuard] Session ${sessionId} final costs: $${costs.totalCost.toFixed(4)}`);
    console.log(`[CostGuard]   Vision: ${costs.claudeVisionCalls}, Sonnet: ${costs.claudeSonnetCalls}, Haiku: ${costs.claudeHaikuCalls}`);
    sessionCosts.delete(sessionId);
  }
  return costs || null;
}

// ============================================================================
// COST CHECKS (Call before expensive operations)
// ============================================================================

/**
 * Check if Claude Vision call is allowed
 * Returns true if allowed, false if should skip/degrade
 */
export function canCallClaudeVision(sessionId: string): boolean {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return true;  // No tracking = allow

  const limits = SESSION_LIMITS[costs.tier];

  // Check count limit
  if (costs.claudeVisionCalls >= limits.claudeVisionMax) {
    console.log(`[CostGuard] Vision limit reached for ${sessionId} (${costs.claudeVisionCalls}/${limits.claudeVisionMax})`);
    return false;
  }

  // Check budget
  if (costs.totalCost >= limits.totalBudget) {
    if (!costs.limitReached) {
      costs.limitReached = true;
      console.log(`[CostGuard] Budget limit reached for ${sessionId} ($${costs.totalCost.toFixed(4)}/$${limits.totalBudget})`);
    }
    return false;
  }

  return true;
}

/**
 * Check if Claude text call is allowed
 */
export function canCallClaudeText(sessionId: string): boolean {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return true;

  const limits = SESSION_LIMITS[costs.tier];
  const totalTextCalls = costs.claudeSonnetCalls + costs.claudeHaikuCalls;

  if (totalTextCalls >= limits.claudeTextMax) {
    console.log(`[CostGuard] Text limit reached for ${sessionId} (${totalTextCalls}/${limits.claudeTextMax})`);
    return false;
  }

  return true;
}

/**
 * Get remaining vision calls for a session
 */
export function getRemainingVisionCalls(sessionId: string): number {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return Infinity;

  const limits = SESSION_LIMITS[costs.tier];
  return Math.max(0, limits.claudeVisionMax - costs.claudeVisionCalls);
}

// ============================================================================
// COST RECORDING (Call after operations complete)
// ============================================================================

/**
 * Record a Claude Vision call
 */
export function recordVisionCall(sessionId: string): void {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return;

  costs.claudeVisionCalls++;
  costs.totalCost += COSTS.claudeVisionCall;

  checkWarningThreshold(costs);
}

/**
 * Record a Claude Sonnet call
 */
export function recordSonnetCall(sessionId: string): void {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return;

  costs.claudeSonnetCalls++;
  costs.totalCost += COSTS.claudeSonnetCall;

  checkWarningThreshold(costs);
}

/**
 * Record a Claude Haiku call
 */
export function recordHaikuCall(sessionId: string): void {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return;

  costs.claudeHaikuCalls++;
  costs.totalCost += COSTS.claudeHaikuCall;

  checkWarningThreshold(costs);
}

/**
 * Record TTS usage
 */
export function recordTTS(sessionId: string, characters: number): void {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return;

  costs.ttsCharacters += characters;
  costs.totalCost += characters * COSTS.elevenLabsTTS;
}

/**
 * Record transcription usage
 */
export function recordTranscription(sessionId: string, seconds: number): void {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return;

  costs.transcriptionSeconds += seconds;
  costs.totalCost += seconds * COSTS.deepgramTranscription;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Check if we should issue a warning
 */
function checkWarningThreshold(costs: SessionCosts): void {
  if (costs.warningIssued) return;

  const limits = SESSION_LIMITS[costs.tier];
  const usagePercent = costs.totalCost / limits.totalBudget;

  if (usagePercent >= limits.warningThreshold) {
    costs.warningIssued = true;
    const remaining = limits.totalBudget - costs.totalCost;
    console.log(`[CostGuard] WARNING: Session ${costs.sessionId} at ${Math.round(usagePercent * 100)}% of budget ($${remaining.toFixed(4)} remaining)`);
  }
}

/**
 * Get current costs for a session
 */
export function getSessionCosts(sessionId: string): SessionCosts | null {
  return sessionCosts.get(sessionId) || null;
}

// ============================================================================
// SMART DEGRADATION HELPERS
// ============================================================================

/**
 * Decide whether to use Sonnet or Haiku based on budget
 * Returns 'haiku' when budget is tight to save costs
 */
export function chooseTextModel(sessionId: string, preferSonnet: boolean): 'sonnet' | 'haiku' {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return preferSonnet ? 'sonnet' : 'haiku';

  const limits = SESSION_LIMITS[costs.tier];
  const budgetUsed = costs.totalCost / limits.totalBudget;

  // If budget > 70% used, prefer Haiku to conserve
  if (budgetUsed > 0.7) {
    console.log(`[CostGuard] Budget conservation: using Haiku instead of Sonnet`);
    return 'haiku';
  }

  return preferSonnet ? 'sonnet' : 'haiku';
}

/**
 * Decide whether to do a vision analysis based on budget
 * Returns recommended interval in ms (longer interval = fewer calls)
 */
export function getRecommendedVisionInterval(sessionId: string): number {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return 5000;  // Default 5 seconds

  const remaining = getRemainingVisionCalls(sessionId);

  // If we have plenty of calls left, analyze more frequently
  if (remaining > 20) return 3000;   // 3 seconds
  if (remaining > 10) return 5000;   // 5 seconds
  if (remaining > 5) return 10000;   // 10 seconds
  if (remaining > 0) return 15000;   // 15 seconds

  return Infinity;  // No more calls allowed
}
