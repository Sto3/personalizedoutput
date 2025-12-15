/**
 * Order Validation Module
 *
 * Central module for validating and tracking order/token usage across all products.
 * Provides one-time-use protection for personalized outputs.
 * Works with Stripe orders (primary) and legacy Etsy orders.
 *
 * Functions:
 * - sanitizeOrderId(input): Normalize order/token format
 * - verifyOrder(orderId): Validate order/token format
 * - hasOrderIdBeenUsed(orderId, productId): Check if order has been redeemed
 * - markOrderIdUsed(orderId, productId, metadata): Mark order as used after generation
 * - getOrderUsageRecord(orderId, productId): Get full usage record
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface OrderUsageRecord {
  orderId: string;
  productId: string;
  usedAt: string;
  jobId: string;
  outputType: 'audio' | 'pdf' | 'image' | 'both';
  outputFilename?: string;
  metadata?: {
    customerEmail?: string;
    generationVersion?: string;
    [key: string]: unknown;
  };
}

interface OrderUsageStore {
  version: string;
  records: OrderUsageRecord[];
}

export interface OrderValidationResult {
  valid: boolean;
  error?: string;
  sanitizedOrderId?: string;
}

export interface OrderUsageCheckResult {
  used: boolean;
  record?: OrderUsageRecord;
}

// ============================================================
// CONSTANTS
// ============================================================

const USAGE_STORE_PATH = path.join(process.cwd(), 'data', 'orderUsage.json');
const ORDER_ID_MIN_LENGTH = 4;
const ORDER_ID_MAX_LENGTH = 20;
const ORDER_ID_PATTERN = /^[a-zA-Z0-9]+$/;

// ============================================================
// STORE MANAGEMENT
// ============================================================

/**
 * Ensure the store file exists with proper structure
 */
function ensureStoreExists(): void {
  const dataDir = path.dirname(USAGE_STORE_PATH);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(USAGE_STORE_PATH)) {
    const emptyStore: OrderUsageStore = {
      version: '1.0.0',
      records: []
    };
    fs.writeFileSync(USAGE_STORE_PATH, JSON.stringify(emptyStore, null, 2));
    console.log(`[OrderValidation] Created store: ${USAGE_STORE_PATH}`);
  }
}

/**
 * Load the store from disk
 */
function loadStore(): OrderUsageStore {
  ensureStoreExists();
  try {
    const data = fs.readFileSync(USAGE_STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[OrderValidation] Error loading store, initializing empty:', error);
    return { version: '1.0.0', records: [] };
  }
}

/**
 * Save the store to disk
 */
function saveStore(store: OrderUsageStore): void {
  ensureStoreExists();
  fs.writeFileSync(USAGE_STORE_PATH, JSON.stringify(store, null, 2));
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Sanitize and normalize an order ID
 *
 * - Trims whitespace
 * - Converts to uppercase
 * - Removes any non-alphanumeric characters
 */
export function sanitizeOrderId(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Verify an order ID or token is valid
 *
 * Validates format (4-20 alphanumeric characters).
 * Works with Stripe checkout tokens and legacy Etsy order IDs.
 *
 * @param orderId - The order ID or token to validate
 * @returns Validation result with sanitized order ID if valid
 */
export function verifyOrder(orderId: string): OrderValidationResult {
  // Sanitize first
  const sanitized = sanitizeOrderId(orderId);

  // Check if empty after sanitization
  if (!sanitized) {
    return {
      valid: false,
      error: 'Order ID is required.'
    };
  }

  // Check minimum length
  if (sanitized.length < ORDER_ID_MIN_LENGTH) {
    return {
      valid: false,
      error: `Order ID must be at least ${ORDER_ID_MIN_LENGTH} characters.`
    };
  }

  // Check maximum length
  if (sanitized.length > ORDER_ID_MAX_LENGTH) {
    return {
      valid: false,
      error: `Order ID must be no more than ${ORDER_ID_MAX_LENGTH} characters.`
    };
  }

  // Check pattern (alphanumeric only - should already be true after sanitization)
  if (!ORDER_ID_PATTERN.test(sanitized)) {
    return {
      valid: false,
      error: 'Order ID must contain only letters and numbers.'
    };
  }

  // TODO: Future Etsy API integration
  // const etsyVerified = await verifyWithEtsyApi(sanitized);
  // if (!etsyVerified) {
  //   return { valid: false, error: 'Order ID not found in Etsy records.' };
  // }

  return {
    valid: true,
    sanitizedOrderId: sanitized
  };
}

/**
 * Check if an order ID has already been used for a specific product
 *
 * @param orderId - The order ID to check
 * @param productId - The product ID (e.g., 'santa_message', 'holiday_reset', 'new_year_reset')
 * @returns Whether the order has been used and the usage record if so
 */
export function hasOrderIdBeenUsed(orderId: string, productId: string): OrderUsageCheckResult {
  const sanitized = sanitizeOrderId(orderId);
  const store = loadStore();

  const record = store.records.find(
    r => sanitizeOrderId(r.orderId) === sanitized && r.productId === productId
  );

  if (record) {
    return { used: true, record };
  }

  return { used: false };
}

/**
 * Mark an order ID as used after successful generation
 *
 * @param orderId - The order ID to mark as used
 * @param productId - The product ID
 * @param outputType - Type of output generated ('audio', 'pdf', or 'both')
 * @param outputFilename - Optional filename of the generated output
 * @param metadata - Optional additional metadata
 * @returns The created usage record
 */
export function markOrderIdUsed(
  orderId: string,
  productId: string,
  outputType: 'audio' | 'pdf' | 'image' | 'both',
  outputFilename?: string,
  metadata?: Record<string, unknown>
): OrderUsageRecord {
  const sanitized = sanitizeOrderId(orderId);
  const store = loadStore();

  // Generate unique job ID
  const jobId = crypto.randomBytes(8).toString('hex');

  const record: OrderUsageRecord = {
    orderId: sanitized,
    productId,
    usedAt: new Date().toISOString(),
    jobId,
    outputType,
    outputFilename,
    metadata
  };

  store.records.push(record);
  saveStore(store);

  console.log(`[OrderValidation] Marked order ${sanitized} as used for ${productId} (job: ${jobId})`);

  return record;
}

/**
 * Get the usage record for an order ID and product
 *
 * @param orderId - The order ID to look up
 * @param productId - The product ID
 * @returns The usage record or null if not found
 */
export function getOrderUsageRecord(orderId: string, productId: string): OrderUsageRecord | null {
  const sanitized = sanitizeOrderId(orderId);
  const store = loadStore();

  return store.records.find(
    r => sanitizeOrderId(r.orderId) === sanitized && r.productId === productId
  ) || null;
}

/**
 * Get all usage records (for admin/debugging)
 */
export function getAllUsageRecords(): OrderUsageRecord[] {
  const store = loadStore();
  return store.records;
}

/**
 * Get usage statistics
 */
export function getUsageStats(): {
  totalRecords: number;
  byProduct: Record<string, number>;
  recentRecords: OrderUsageRecord[];
} {
  const store = loadStore();
  const byProduct: Record<string, number> = {};

  for (const record of store.records) {
    byProduct[record.productId] = (byProduct[record.productId] || 0) + 1;
  }

  // Get 10 most recent records
  const recentRecords = [...store.records]
    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
    .slice(0, 10);

  return {
    totalRecords: store.records.length,
    byProduct,
    recentRecords
  };
}

/**
 * Validate orderId from request and check if already used
 * Convenience function that combines verification and usage check
 *
 * @param orderId - The order ID to validate
 * @param productId - The product ID
 * @returns Combined validation result
 */
export function validateOrderForGeneration(
  orderId: string,
  productId: string
): { valid: true; sanitizedOrderId: string } | { valid: false; error: string } {
  // First, verify the format
  const verification = verifyOrder(orderId);
  if (!verification.valid) {
    return { valid: false, error: verification.error || 'Invalid order ID' };
  }

  // Then, check if already used
  const usageCheck = hasOrderIdBeenUsed(orderId, productId);
  if (usageCheck.used) {
    return {
      valid: false,
      error: 'This order has already been redeemed for its personalized output.'
    };
  }

  return { valid: true, sanitizedOrderId: verification.sanitizedOrderId! };
}
