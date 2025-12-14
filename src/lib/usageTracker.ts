/**
 * Usage Tracker
 *
 * Tracks API usage for monitoring and alerting purposes.
 * Stores usage data in a local JSON file that the monitor script reads.
 */

import * as fs from 'fs';
import * as path from 'path';

const USAGE_FILE = path.join(process.cwd(), 'data', 'usage_tracking.json');

interface MonthlyUsage {
  lessons: number;
  characters: number;
  visionBoards: number;
  flashCards: number;
  santaMessages: number;
  errors: number;
  lastUpdated: string;
}

interface UsageData {
  [monthKey: string]: MonthlyUsage;
}

/**
 * Load current usage data
 */
function loadUsageData(): UsageData {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[UsageTracker] Error loading usage data:', e);
  }
  return {};
}

/**
 * Save usage data
 */
function saveUsageData(data: UsageData): void {
  try {
    const dir = path.dirname(USAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[UsageTracker] Error saving usage data:', e);
  }
}

/**
 * Get current month key (YYYY-MM)
 */
function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get or create current month's usage
 */
function getCurrentMonthUsage(data: UsageData): MonthlyUsage {
  const monthKey = getCurrentMonthKey();
  if (!data[monthKey]) {
    data[monthKey] = {
      lessons: 0,
      characters: 0,
      visionBoards: 0,
      flashCards: 0,
      santaMessages: 0,
      errors: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  return data[monthKey];
}

/**
 * Track a voice generation (lesson with audio)
 */
export function trackVoiceGeneration(characterCount: number): void {
  const data = loadUsageData();
  const month = getCurrentMonthUsage(data);

  month.lessons++;
  month.characters += characterCount;
  month.lastUpdated = new Date().toISOString();

  saveUsageData(data);
  console.log(`[UsageTracker] Voice generation tracked: ${characterCount} chars (total this month: ${month.characters})`);
}

/**
 * Track a vision board generation
 */
export function trackVisionBoard(): void {
  const data = loadUsageData();
  const month = getCurrentMonthUsage(data);

  month.visionBoards++;
  month.lastUpdated = new Date().toISOString();

  saveUsageData(data);
  console.log(`[UsageTracker] Vision board tracked (total this month: ${month.visionBoards})`);
}

/**
 * Track a flash card set generation
 */
export function trackFlashCards(): void {
  const data = loadUsageData();
  const month = getCurrentMonthUsage(data);

  month.flashCards++;
  month.lastUpdated = new Date().toISOString();

  saveUsageData(data);
  console.log(`[UsageTracker] Flash cards tracked (total this month: ${month.flashCards})`);
}

/**
 * Track a Santa message generation
 */
export function trackSantaMessage(characterCount: number): void {
  const data = loadUsageData();
  const month = getCurrentMonthUsage(data);

  month.santaMessages++;
  month.characters += characterCount;
  month.lastUpdated = new Date().toISOString();

  saveUsageData(data);
  console.log(`[UsageTracker] Santa message tracked: ${characterCount} chars`);
}

/**
 * Track an error
 */
export function trackError(): void {
  const data = loadUsageData();
  const month = getCurrentMonthUsage(data);

  month.errors++;
  month.lastUpdated = new Date().toISOString();

  saveUsageData(data);
}

/**
 * Get current month's usage statistics
 */
export function getCurrentUsage(): MonthlyUsage | null {
  const data = loadUsageData();
  const monthKey = getCurrentMonthKey();
  return data[monthKey] || null;
}

/**
 * Get all usage data
 */
export function getAllUsage(): UsageData {
  return loadUsageData();
}
