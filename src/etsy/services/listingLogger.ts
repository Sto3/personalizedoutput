/**
 * Etsy Automation - Listing Logger
 *
 * Logs all listing operations to JSON line files for audit trail.
 * Output: output/listings/<product-type>-YYYYMMDD.json
 */

import * as path from 'path';
import * as fs from 'fs';
import { ProductType, ListingLogEntry } from '../config/types';

// ============================================================
// CONFIGURATION
// ============================================================

const LOGS_BASE = path.join(__dirname, '..', '..', '..', 'output', 'listings');

// ============================================================
// LOGGER CLASS
// ============================================================

export class ListingLogger {
  private logsDir: string;

  constructor() {
    this.logsDir = LOGS_BASE;
    this.ensureLogsDir();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogsDir(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Get log file path for today
   */
  private getLogFilePath(productType: ProductType): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return path.join(this.logsDir, `${productType}-${date}.json`);
  }

  /**
   * Append a log entry
   */
  log(entry: ListingLogEntry): void {
    const filePath = this.getLogFilePath(entry.productType);
    const line = JSON.stringify(entry) + '\n';

    fs.appendFileSync(filePath, line, 'utf-8');
    console.log(`[ListingLogger] Logged ${entry.status}: ${entry.title.substring(0, 50)}...`);
  }

  /**
   * Log a successful listing creation
   */
  logSuccess(data: {
    productType: ProductType;
    themeId: string;
    styleId?: string;
    variationIndex: number;
    contentHash: string;
    etsyListingId: number;
    title: string;
    tags: string[];
  }): void {
    this.log({
      timestamp: new Date().toISOString(),
      productType: data.productType,
      themeId: data.themeId,
      styleId: data.styleId,
      variationIndex: data.variationIndex,
      contentHash: data.contentHash,
      etsyListingId: data.etsyListingId,
      status: 'success',
      title: data.title,
      tags: data.tags
    });
  }

  /**
   * Log a failed listing creation
   */
  logFailure(data: {
    productType: ProductType;
    themeId: string;
    styleId?: string;
    variationIndex: number;
    contentHash: string;
    title: string;
    tags: string[];
    error: string;
  }): void {
    this.log({
      timestamp: new Date().toISOString(),
      productType: data.productType,
      themeId: data.themeId,
      styleId: data.styleId,
      variationIndex: data.variationIndex,
      contentHash: data.contentHash,
      status: 'failed',
      error: data.error,
      title: data.title,
      tags: data.tags
    });
  }

  /**
   * Log a skipped listing (duplicate)
   */
  logSkipped(data: {
    productType: ProductType;
    themeId: string;
    styleId?: string;
    variationIndex: number;
    contentHash: string;
    title: string;
    tags: string[];
  }): void {
    this.log({
      timestamp: new Date().toISOString(),
      productType: data.productType,
      themeId: data.themeId,
      styleId: data.styleId,
      variationIndex: data.variationIndex,
      contentHash: data.contentHash,
      status: 'skipped',
      title: data.title,
      tags: data.tags
    });
  }

  /**
   * Read logs for a date range
   */
  readLogs(productType: ProductType, date?: string): ListingLogEntry[] {
    const dateStr = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filePath = path.join(this.logsDir, `${productType}-${dateStr}.json`);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as ListingLogEntry);
  }

  /**
   * Get summary for today
   */
  getTodaySummary(productType: ProductType): {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  } {
    const logs = this.readLogs(productType);

    return {
      total: logs.length,
      success: logs.filter(l => l.status === 'success').length,
      failed: logs.filter(l => l.status === 'failed').length,
      skipped: logs.filter(l => l.status === 'skipped').length
    };
  }

  /**
   * Check if a content hash was already logged today (duplicate check)
   */
  wasAlreadyCreated(productType: ProductType, contentHash: string): boolean {
    const logs = this.readLogs(productType);
    return logs.some(l => l.contentHash === contentHash && l.status === 'success');
  }

  /**
   * Get all listing IDs created today
   */
  getTodayListingIds(productType: ProductType): number[] {
    const logs = this.readLogs(productType);
    return logs
      .filter(l => l.status === 'success' && l.etsyListingId)
      .map(l => l.etsyListingId!);
  }

  /**
   * Get recent failures for retry
   */
  getRecentFailures(productType: ProductType, limit: number = 10): ListingLogEntry[] {
    const logs = this.readLogs(productType);
    return logs
      .filter(l => l.status === 'failed')
      .slice(-limit);
  }
}

// ============================================================
// SINGLETON
// ============================================================

let loggerInstance: ListingLogger | null = null;

export function getListingLogger(): ListingLogger {
  if (!loggerInstance) {
    loggerInstance = new ListingLogger();
  }
  return loggerInstance;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Print summary of today's listings
 */
export function printTodaySummary(): void {
  const logger = getListingLogger();
  const productTypes: ProductType[] = ['vision_board', 'santa_message', 'planner', 'flash_cards'];

  console.log('\n' + '='.repeat(60));
  console.log('TODAY\'S LISTING SUMMARY');
  console.log('='.repeat(60));

  for (const type of productTypes) {
    const summary = logger.getTodaySummary(type);
    if (summary.total > 0) {
      console.log(`\n${type}:`);
      console.log(`  Total: ${summary.total}`);
      console.log(`  Success: ${summary.success}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Skipped: ${summary.skipped}`);
    }
  }
}

/**
 * Export logs to CSV
 */
export function exportToCsv(productType: ProductType, outputPath?: string): string {
  const logger = getListingLogger();
  const logs = logger.readLogs(productType);

  const headers = ['timestamp', 'themeId', 'styleId', 'variationIndex', 'status', 'etsyListingId', 'title', 'error'];
  const csvLines = [headers.join(',')];

  for (const log of logs) {
    const row = [
      log.timestamp,
      log.themeId,
      log.styleId || '',
      log.variationIndex.toString(),
      log.status,
      log.etsyListingId?.toString() || '',
      `"${log.title.replace(/"/g, '""')}"`,
      log.error || ''
    ];
    csvLines.push(row.join(','));
  }

  const csv = csvLines.join('\n');
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const defaultPath = path.join(LOGS_BASE, `${productType}-${date}.csv`);
  const finalPath = outputPath || defaultPath;

  fs.writeFileSync(finalPath, csv, 'utf-8');
  console.log(`[ListingLogger] Exported CSV: ${finalPath}`);

  return finalPath;
}
