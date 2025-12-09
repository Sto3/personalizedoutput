/**
 * Token Store for Order-Based Access Control
 *
 * Manages one-time-use tokens tied to Etsy orders for the Santa message flow.
 * Tokens are stored in data/order_redemptions.json and expire after 72 hours.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface RedemptionRecord {
  orderId: string;
  productId: string;
  email: string;
  token: string;
  redeemed: boolean;
  createdAt: string;
  redeemedAt?: string;
}

interface RedemptionStore {
  records: RedemptionRecord[];
}

// ============================================================
// CONSTANTS
// ============================================================

const STORE_PATH = path.join(process.cwd(), 'data', 'order_redemptions.json');
const TOKEN_EXPIRATION_HOURS = 72;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Ensure the store file exists with proper structure
 */
function ensureStoreExists(): void {
  const dataDir = path.dirname(STORE_PATH);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const emptyStore: RedemptionStore = { records: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(emptyStore, null, 2));
    console.log(`[TokenStore] Created store: ${STORE_PATH}`);
  }
}

/**
 * Load the store from disk
 */
function loadStore(): RedemptionStore {
  ensureStoreExists();
  try {
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[TokenStore] Error loading store, initializing empty:', error);
    return { records: [] };
  }
}

/**
 * Save the store to disk
 */
function saveStore(store: RedemptionStore): void {
  ensureStoreExists();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Normalize order ID for consistent lookup
 */
function normalizeOrderId(orderId: string): string {
  return orderId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if a token is expired (older than 72 hours)
 */
export function isTokenExpired(record: RedemptionRecord): boolean {
  const createdAt = new Date(record.createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff > TOKEN_EXPIRATION_HOURS;
}

/**
 * Get a record by its token
 */
export function getRecordByToken(token: string): RedemptionRecord | null {
  const store = loadStore();
  return store.records.find(r => r.token === token) || null;
}

/**
 * Get a record by orderId and productId
 */
export function getRecordByOrder(orderId: string, productId: string): RedemptionRecord | null {
  const store = loadStore();
  const normalizedOrderId = normalizeOrderId(orderId);
  return store.records.find(
    r => normalizeOrderId(r.orderId) === normalizedOrderId && r.productId === productId
  ) || null;
}

/**
 * Create a new token or reuse existing one for an order
 *
 * Returns:
 * - { success: true, token, record, isNew } if token created/reused
 * - { success: false, error, alreadyRedeemed } if order already redeemed
 */
export function createOrReuseToken(
  orderId: string,
  productId: string,
  email: string
): { success: true; token: string; record: RedemptionRecord; isNew: boolean }
 | { success: false; error: string; alreadyRedeemed: boolean } {

  const store = loadStore();
  const normalizedOrderId = normalizeOrderId(orderId);

  // Look for existing record
  const existingRecord = store.records.find(
    r => normalizeOrderId(r.orderId) === normalizedOrderId && r.productId === productId
  );

  if (existingRecord) {
    // Check if already redeemed
    if (existingRecord.redeemed) {
      return {
        success: false,
        error: 'This order has already been used to generate a Santa message.',
        alreadyRedeemed: true
      };
    }

    // Check if expired - if so, generate new token
    if (isTokenExpired(existingRecord)) {
      existingRecord.token = generateToken();
      existingRecord.createdAt = new Date().toISOString();
      existingRecord.email = email; // Update email in case it changed
      saveStore(store);

      console.log(`[TokenStore] Refreshed expired token for order: ${orderId}`);
      return {
        success: true,
        token: existingRecord.token,
        record: existingRecord,
        isNew: false
      };
    }

    // Reuse existing valid token
    console.log(`[TokenStore] Reusing existing token for order: ${orderId}`);
    return {
      success: true,
      token: existingRecord.token,
      record: existingRecord,
      isNew: false
    };
  }

  // Create new record
  const newRecord: RedemptionRecord = {
    orderId: orderId.trim(),
    productId,
    email: email.trim().toLowerCase(),
    token: generateToken(),
    redeemed: false,
    createdAt: new Date().toISOString()
  };

  store.records.push(newRecord);
  saveStore(store);

  console.log(`[TokenStore] Created new token for order: ${orderId}`);
  return {
    success: true,
    token: newRecord.token,
    record: newRecord,
    isNew: true
  };
}

/**
 * Mark a token as redeemed (after successful generation)
 */
export function markTokenRedeemed(token: string): boolean {
  const store = loadStore();
  const record = store.records.find(r => r.token === token);

  if (!record) {
    console.error(`[TokenStore] Token not found for redemption: ${token}`);
    return false;
  }

  if (record.redeemed) {
    console.warn(`[TokenStore] Token already redeemed: ${token}`);
    return true;
  }

  record.redeemed = true;
  record.redeemedAt = new Date().toISOString();
  saveStore(store);

  console.log(`[TokenStore] Marked token as redeemed for order: ${record.orderId}`);
  return true;
}

/**
 * Validate a token for access
 *
 * Returns:
 * - { valid: true, record } if token is valid and not redeemed/expired
 * - { valid: false, reason } if token is invalid, expired, or redeemed
 */
export function validateToken(token: string):
  { valid: true; record: RedemptionRecord }
| { valid: false; reason: 'not_found' | 'expired' | 'redeemed' } {

  if (!token) {
    return { valid: false, reason: 'not_found' };
  }

  const record = getRecordByToken(token);

  if (!record) {
    return { valid: false, reason: 'not_found' };
  }

  if (record.redeemed) {
    return { valid: false, reason: 'redeemed' };
  }

  if (isTokenExpired(record)) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, record };
}

/**
 * Get stats about the token store (for debugging/admin)
 */
export function getStoreStats(): {
  totalRecords: number;
  activeTokens: number;
  redeemedTokens: number;
  expiredTokens: number;
} {
  const store = loadStore();
  const now = new Date();

  let active = 0;
  let redeemed = 0;
  let expired = 0;

  for (const record of store.records) {
    if (record.redeemed) {
      redeemed++;
    } else if (isTokenExpired(record)) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    totalRecords: store.records.length,
    activeTokens: active,
    redeemedTokens: redeemed,
    expiredTokens: expired
  };
}
