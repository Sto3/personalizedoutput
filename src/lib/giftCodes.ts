/**
 * Gift Code Store
 *
 * Manages gift codes for products that can be purchased as gifts.
 * When purchased as a gift, buyer receives a code to share.
 * Recipient enters code to access the product without payment.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface GiftCode {
  code: string;
  productId: string;
  purchaserEmail: string;
  recipientName?: string;
  orderId?: string;
  used: boolean;
  createdAt: string;
  usedAt?: string;
  usedByEmail?: string;
}

interface GiftCodeStore {
  codes: GiftCode[];
}

// ============================================================
// CONSTANTS
// ============================================================

const STORE_PATH = path.join(process.cwd(), 'data', 'gift_codes.json');
const CODE_EXPIRATION_DAYS = 365; // Gift codes valid for 1 year

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function ensureStoreExists(): void {
  const dataDir = path.dirname(STORE_PATH);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const emptyStore: GiftCodeStore = { codes: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(emptyStore, null, 2));
    console.log(`[GiftCodes] Created store: ${STORE_PATH}`);
  }
}

function loadStore(): GiftCodeStore {
  ensureStoreExists();
  try {
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[GiftCodes] Error loading store, initializing empty:', error);
    return { codes: [] };
  }
}

function saveStore(store: GiftCodeStore): void {
  ensureStoreExists();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

/**
 * Generate a readable gift code like GIFT-XXXX-XXXX
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = 'GIFT-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Normalize code for lookup (uppercase, remove spaces)
 */
function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, '');
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if a gift code is expired
 */
export function isCodeExpired(giftCode: GiftCode): boolean {
  const createdAt = new Date(giftCode.createdAt);
  const now = new Date();
  const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff > CODE_EXPIRATION_DAYS;
}

/**
 * Create a new gift code for a purchase
 */
export function createGiftCode(
  productId: string,
  purchaserEmail: string,
  recipientName?: string,
  orderId?: string
): GiftCode {
  const store = loadStore();

  // Generate unique code
  let code = generateCode();
  while (store.codes.some(c => c.code === code)) {
    code = generateCode(); // Ensure uniqueness
  }

  const giftCode: GiftCode = {
    code,
    productId,
    purchaserEmail: purchaserEmail.toLowerCase(),
    recipientName,
    orderId,
    used: false,
    createdAt: new Date().toISOString()
  };

  store.codes.push(giftCode);
  saveStore(store);

  console.log(`[GiftCodes] Created gift code ${code} for ${productId}`);
  return giftCode;
}

/**
 * Validate a gift code
 * Returns the gift code if valid, null if invalid/used/expired
 */
export function validateGiftCode(code: string): GiftCode | null {
  if (!code) return null;

  const normalizedCode = normalizeCode(code);

  // Check if it looks like a gift code
  if (!normalizedCode.startsWith('GIFT-')) return null;

  const store = loadStore();
  const giftCode = store.codes.find(c => c.code === normalizedCode);

  if (!giftCode) return null;
  if (giftCode.used) return null;
  if (isCodeExpired(giftCode)) return null;

  return giftCode;
}

/**
 * Mark a gift code as used
 */
export function redeemGiftCode(code: string, redeemerEmail: string): boolean {
  const normalizedCode = normalizeCode(code);
  const store = loadStore();
  const giftCode = store.codes.find(c => c.code === normalizedCode);

  if (!giftCode) {
    console.error(`[GiftCodes] Code not found: ${code}`);
    return false;
  }

  if (giftCode.used) {
    console.warn(`[GiftCodes] Code already used: ${code}`);
    return false;
  }

  giftCode.used = true;
  giftCode.usedAt = new Date().toISOString();
  giftCode.usedByEmail = redeemerEmail.toLowerCase();
  saveStore(store);

  console.log(`[GiftCodes] Code redeemed: ${code} by ${redeemerEmail}`);
  return true;
}

/**
 * Get a gift code by its code string
 */
export function getGiftCode(code: string): GiftCode | null {
  const normalizedCode = normalizeCode(code);
  const store = loadStore();
  return store.codes.find(c => c.code === normalizedCode) || null;
}

/**
 * Check if a string looks like a gift code (for input detection)
 */
export function looksLikeGiftCode(input: string): boolean {
  const normalized = normalizeCode(input);
  return normalized.startsWith('GIFT-') && normalized.length === 14; // GIFT-XXXX-XXXX
}

/**
 * Get stats about gift codes
 */
export function getGiftCodeStats(): {
  totalCodes: number;
  unusedCodes: number;
  usedCodes: number;
  expiredCodes: number;
} {
  const store = loadStore();

  let unused = 0;
  let used = 0;
  let expired = 0;

  for (const code of store.codes) {
    if (code.used) {
      used++;
    } else if (isCodeExpired(code)) {
      expired++;
    } else {
      unused++;
    }
  }

  return {
    totalCodes: store.codes.length,
    unusedCodes: unused,
    usedCodes: used,
    expiredCodes: expired
  };
}

// Create a test code for verification (only if it doesn't exist)
export function ensureTestCodeExists(): string {
  const testCode = 'GIFT-TEST-CODE';
  const store = loadStore();

  const existing = store.codes.find(c => c.code === testCode);
  if (existing && !existing.used) {
    return testCode; // Already exists and unused
  }

  // Create or recreate test code
  const testGiftCode: GiftCode = {
    code: testCode,
    productId: 'vision_board',
    purchaserEmail: 'test@test.com',
    recipientName: 'Test Recipient',
    used: false,
    createdAt: new Date().toISOString()
  };

  // Remove old test code if it was used
  const existingIndex = store.codes.findIndex(c => c.code === testCode);
  if (existingIndex >= 0) {
    store.codes.splice(existingIndex, 1);
  }

  store.codes.push(testGiftCode);
  saveStore(store);

  console.log(`[GiftCodes] Test code created/reset: ${testCode}`);
  return testCode;
}
