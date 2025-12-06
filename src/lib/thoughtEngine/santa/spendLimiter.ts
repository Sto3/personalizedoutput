/**
 * Santa Spend Limiter
 *
 * Tracks TTS character usage and estimated spend.
 * Prevents runaway costs during development.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// CONFIGURATION
// ============================================================

// ElevenLabs pricing: approximately $0.30 per 1000 characters
export const COST_PER_1000_CHARS = 0.30;

// Internal spend limit (in dollars) - adjust as needed
export const INTERNAL_SANTA_SPEND_LIMIT = 250;

// ============================================================
// TYPES
// ============================================================

export interface SpendTracker {
  month: string;  // Format: YYYY-MM
  totalCharactersUsed: number;
  totalGenerations: number;
  estimatedSpend: number;
  lastUpdated: string;
  generations: GenerationRecord[];
}

export interface GenerationRecord {
  timestamp: string;
  characters: number;
  cost: number;
}

export interface SpendStatus {
  currentMonth: string;
  totalCharactersUsed: number;
  totalGenerations: number;
  totalSpentThisMonth: number;
  limit: number;
  remainingBudget: number;
  audioAllowed: boolean;
  percentUsed: number;
}

// ============================================================
// FILE-BASED TRACKING
// ============================================================

const TRACKER_FILE = path.join(process.cwd(), 'outputs', 'logs', 'santa-spend-tracker.json');

function ensureLogDir(): void {
  const dir = path.dirname(TRACKER_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function loadTracker(): SpendTracker {
  ensureLogDir();

  const currentMonth = getCurrentMonth();

  try {
    if (fs.existsSync(TRACKER_FILE)) {
      const data = fs.readFileSync(TRACKER_FILE, 'utf-8');
      const tracker = JSON.parse(data) as SpendTracker;

      // Reset if new month
      if (tracker.month !== currentMonth) {
        return createNewTracker(currentMonth);
      }

      return tracker;
    }
  } catch (error) {
    console.warn('Could not load spend tracker:', error);
  }

  return createNewTracker(currentMonth);
}

function createNewTracker(month: string): SpendTracker {
  return {
    month,
    totalCharactersUsed: 0,
    totalGenerations: 0,
    estimatedSpend: 0,
    lastUpdated: new Date().toISOString(),
    generations: []
  };
}

function saveTracker(tracker: SpendTracker): void {
  ensureLogDir();

  try {
    tracker.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
  } catch (error) {
    console.error('Failed to save spend tracker:', error);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get the current spend tracker
 */
export function getSpendTracker(): SpendTracker {
  return loadTracker();
}

/**
 * Calculate estimated cost for a given number of characters
 */
export function estimateCost(characters: number): number {
  return (characters / 1000) * COST_PER_1000_CHARS;
}

/**
 * Check if audio generation is allowed based on spend limit
 */
export function canGenerateAudio(): boolean {
  const tracker = loadTracker();
  return tracker.estimatedSpend < INTERNAL_SANTA_SPEND_LIMIT;
}

/**
 * Record an audio generation
 */
export function recordAudioGeneration(characters: number): void {
  const tracker = loadTracker();
  const cost = estimateCost(characters);

  tracker.totalCharactersUsed += characters;
  tracker.totalGenerations += 1;
  tracker.estimatedSpend += cost;
  tracker.generations.push({
    timestamp: new Date().toISOString(),
    characters,
    cost
  });

  // Keep only last 100 generation records to avoid file bloat
  if (tracker.generations.length > 100) {
    tracker.generations = tracker.generations.slice(-100);
  }

  saveTracker(tracker);

  // Log warning if approaching limit
  const percentUsed = (tracker.estimatedSpend / INTERNAL_SANTA_SPEND_LIMIT) * 100;
  if (percentUsed >= 80 && percentUsed < 100) {
    console.warn(`[SPEND WARNING] Santa TTS usage at ${percentUsed.toFixed(1)}% of monthly limit`);
  } else if (percentUsed >= 100) {
    console.warn(`[SPEND LIMIT] Santa TTS monthly limit reached. Audio generation will be disabled.`);
  }
}

/**
 * Get current spend status
 */
export function getSpendStatus(): SpendStatus {
  const tracker = loadTracker();
  const remainingBudget = Math.max(0, INTERNAL_SANTA_SPEND_LIMIT - tracker.estimatedSpend);
  const percentUsed = (tracker.estimatedSpend / INTERNAL_SANTA_SPEND_LIMIT) * 100;

  return {
    currentMonth: tracker.month,
    totalCharactersUsed: tracker.totalCharactersUsed,
    totalGenerations: tracker.totalGenerations,
    totalSpentThisMonth: tracker.estimatedSpend,
    limit: INTERNAL_SANTA_SPEND_LIMIT,
    remainingBudget,
    audioAllowed: tracker.estimatedSpend < INTERNAL_SANTA_SPEND_LIMIT,
    percentUsed: Math.round(percentUsed * 10) / 10
  };
}

/**
 * Reset tracker (for testing)
 */
export function resetTracker(): void {
  const tracker = createNewTracker(getCurrentMonth());
  saveTracker(tracker);
}

/**
 * Get spending summary for display
 */
export function getSpendingSummary(): string {
  const status = getSpendStatus();

  return `
Santa TTS Spend Summary (${status.currentMonth})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generations:     ${status.totalGenerations}
Characters:      ${status.totalCharactersUsed.toLocaleString()}
Estimated Spend: $${status.totalSpentThisMonth.toFixed(2)} / $${status.limit.toFixed(2)}
Remaining:       $${status.remainingBudget.toFixed(2)}
Usage:           ${status.percentUsed}%
Audio Allowed:   ${status.audioAllowed ? 'YES' : 'NO - LIMIT REACHED'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
