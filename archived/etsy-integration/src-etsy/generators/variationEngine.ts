/**
 * Etsy Automation - Variation Engine
 *
 * Ensures each generated listing is unique through content hashing
 * and tracking. Prevents duplicate listings from being published.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ListingContent, GeneratedListing, ListingLogEntry } from '../config/types';

// ============================================================
// TYPES
// ============================================================

interface ContentHashRecord {
  hash: string;
  themeId: string;
  styleId?: string;
  variationIndex: number;
  title: string;
  createdAt: string;
  etsyListingId?: number;
}

interface HashStore {
  version: number;
  lastUpdated: string;
  hashes: Record<string, ContentHashRecord>;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DATA_DIR = path.join(process.cwd(), 'data', 'etsy');
const HASH_STORE_FILE = path.join(DATA_DIR, 'content_hashes.json');
const LISTING_LOG_FILE = path.join(DATA_DIR, 'listing_log.jsonl');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ============================================================
// HASH GENERATION
// ============================================================

/**
 * Generate a unique content hash for a listing
 * Uses title + first 200 chars of description + tags
 */
export function generateContentHash(content: ListingContent): string {
  const hashInput = [
    content.title.toLowerCase().trim(),
    content.description.substring(0, 200).toLowerCase().trim(),
    content.tags.sort().join(',').toLowerCase()
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for readability
}

/**
 * Generate a variation key for tracking
 */
export function generateVariationKey(
  themeId: string,
  styleId?: string,
  variationIndex: number = 0
): string {
  const parts = [themeId];
  if (styleId) parts.push(styleId);
  parts.push(variationIndex.toString());
  return parts.join(':');
}

// ============================================================
// HASH STORE MANAGEMENT
// ============================================================

/**
 * Load the hash store from disk
 */
function loadHashStore(): HashStore {
  ensureDataDir();

  if (!fs.existsSync(HASH_STORE_FILE)) {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      hashes: {}
    };
  }

  try {
    const data = fs.readFileSync(HASH_STORE_FILE, 'utf-8');
    return JSON.parse(data) as HashStore;
  } catch (error) {
    console.error('[VariationEngine] Error loading hash store:', error);
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      hashes: {}
    };
  }
}

/**
 * Save the hash store to disk
 */
function saveHashStore(store: HashStore): void {
  ensureDataDir();
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(HASH_STORE_FILE, JSON.stringify(store, null, 2));
}

/**
 * Check if a content hash already exists
 */
export function isDuplicateHash(hash: string): boolean {
  const store = loadHashStore();
  return hash in store.hashes;
}

/**
 * Check if a variation key already exists
 */
export function isDuplicateVariation(
  themeId: string,
  styleId?: string,
  variationIndex: number = 0
): boolean {
  const store = loadHashStore();
  const key = generateVariationKey(themeId, styleId, variationIndex);

  for (const record of Object.values(store.hashes)) {
    const recordKey = generateVariationKey(
      record.themeId,
      record.styleId,
      record.variationIndex
    );
    if (recordKey === key) {
      return true;
    }
  }

  return false;
}

/**
 * Register a new content hash
 */
export function registerHash(
  listing: GeneratedListing,
  etsyListingId?: number
): ContentHashRecord {
  const store = loadHashStore();

  const record: ContentHashRecord = {
    hash: listing.contentHash,
    themeId: listing.themeId,
    styleId: listing.styleId,
    variationIndex: listing.variationIndex,
    title: listing.title,
    createdAt: new Date().toISOString(),
    etsyListingId
  };

  store.hashes[listing.contentHash] = record;
  saveHashStore(store);

  return record;
}

/**
 * Update a hash record with Etsy listing ID after publishing
 */
export function updateHashWithEtsyId(hash: string, etsyListingId: number): void {
  const store = loadHashStore();

  if (store.hashes[hash]) {
    store.hashes[hash].etsyListingId = etsyListingId;
    saveHashStore(store);
  }
}

/**
 * Get all registered hashes
 */
export function getAllHashes(): ContentHashRecord[] {
  const store = loadHashStore();
  return Object.values(store.hashes);
}

/**
 * Get hash record by hash
 */
export function getHashRecord(hash: string): ContentHashRecord | undefined {
  const store = loadHashStore();
  return store.hashes[hash];
}

/**
 * Get statistics about the hash store
 */
export function getHashStats(): {
  totalHashes: number;
  publishedCount: number;
  unpublishedCount: number;
  byTheme: Record<string, number>;
  byStyle: Record<string, number>;
} {
  const store = loadHashStore();
  const hashes = Object.values(store.hashes);

  const byTheme: Record<string, number> = {};
  const byStyle: Record<string, number> = {};
  let publishedCount = 0;

  for (const record of hashes) {
    // Count by theme
    byTheme[record.themeId] = (byTheme[record.themeId] || 0) + 1;

    // Count by style
    if (record.styleId) {
      byStyle[record.styleId] = (byStyle[record.styleId] || 0) + 1;
    }

    // Count published
    if (record.etsyListingId) {
      publishedCount++;
    }
  }

  return {
    totalHashes: hashes.length,
    publishedCount,
    unpublishedCount: hashes.length - publishedCount,
    byTheme,
    byStyle
  };
}

/**
 * Clear all hashes (use with caution!)
 */
export function clearAllHashes(): void {
  const store: HashStore = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    hashes: {}
  };
  saveHashStore(store);
  console.log('[VariationEngine] All hashes cleared');
}

// ============================================================
// LISTING LOG
// ============================================================

/**
 * Log a listing attempt (JSON Lines format)
 */
export function logListingAttempt(entry: ListingLogEntry): void {
  ensureDataDir();

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(LISTING_LOG_FILE, line);
}

/**
 * Read recent listing log entries
 */
export function getRecentLogEntries(count: number = 100): ListingLogEntry[] {
  ensureDataDir();

  if (!fs.existsSync(LISTING_LOG_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(LISTING_LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);

    // Get last N entries
    const recentLines = lines.slice(-count);

    return recentLines.map(line => JSON.parse(line) as ListingLogEntry);
  } catch (error) {
    console.error('[VariationEngine] Error reading log entries:', error);
    return [];
  }
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  totalAttempts: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  byProductType: Record<string, number>;
  recentErrors: string[];
} {
  const entries = getRecentLogEntries(1000);

  const byProductType: Record<string, number> = {};
  const recentErrors: string[] = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const entry of entries) {
    // Count by status
    switch (entry.status) {
      case 'success':
        successCount++;
        break;
      case 'failed':
        failedCount++;
        if (entry.error) {
          recentErrors.push(entry.error);
        }
        break;
      case 'skipped':
        skippedCount++;
        break;
    }

    // Count by product type
    byProductType[entry.productType] = (byProductType[entry.productType] || 0) + 1;
  }

  return {
    totalAttempts: entries.length,
    successCount,
    failedCount,
    skippedCount,
    byProductType,
    recentErrors: recentErrors.slice(-10) // Last 10 errors
  };
}

// ============================================================
// UNIQUENESS VALIDATION
// ============================================================

/**
 * Validate a listing is unique before publishing
 */
export function validateUniqueness(listing: GeneratedListing): {
  isUnique: boolean;
  reason?: string;
  existingRecord?: ContentHashRecord;
} {
  // Check content hash
  if (isDuplicateHash(listing.contentHash)) {
    const existingRecord = getHashRecord(listing.contentHash);
    return {
      isUnique: false,
      reason: `Duplicate content hash: ${listing.contentHash}`,
      existingRecord
    };
  }

  // Check variation key (theme + style + variation index)
  if (isDuplicateVariation(listing.themeId, listing.styleId, listing.variationIndex)) {
    return {
      isUnique: false,
      reason: `Duplicate variation: ${listing.themeId}:${listing.styleId || 'default'}:${listing.variationIndex}`
    };
  }

  return { isUnique: true };
}

/**
 * Find the next available variation index for a theme/style combo
 */
export function getNextVariationIndex(themeId: string, styleId?: string): number {
  const store = loadHashStore();
  let maxIndex = -1;

  for (const record of Object.values(store.hashes)) {
    if (record.themeId === themeId && record.styleId === styleId) {
      maxIndex = Math.max(maxIndex, record.variationIndex);
    }
  }

  return maxIndex + 1;
}

/**
 * Get all variations for a theme/style combo
 */
export function getVariationsForTheme(
  themeId: string,
  styleId?: string
): ContentHashRecord[] {
  const store = loadHashStore();

  return Object.values(store.hashes).filter(
    record => record.themeId === themeId && record.styleId === styleId
  );
}

// ============================================================
// EXPORTS
// ============================================================

export {
  ContentHashRecord,
  HashStore,
  DATA_DIR,
  HASH_STORE_FILE,
  LISTING_LOG_FILE
};
