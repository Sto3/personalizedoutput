/**
 * Etsy CSV Export - Exporter Module
 *
 * Converts ListingDraft objects to CSV files for bulk upload tools.
 * Primary target: Shop Uploader (shopuploader.com)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProductType } from '../config/types';
import {
  CsvTargetConfig,
  CsvTargetId,
  ListingDraft,
  CsvRow,
  CsvExportResult,
  CsvExportOptions,
  CsvExportLogEntry
} from './csvTypes';
import {
  getCsvTarget,
  getDefaultCsvTarget,
  SHOPUPLOADER_COLUMN_ORDER,
  GENERIC_COLUMN_ORDER
} from './csvTargets';

// ============================================================
// CONFIGURATION
// ============================================================

const CSV_LOG_FILE = path.join(process.cwd(), 'output', 'etsy_csv', 'export_log.json');

// Pricing by product type
const PRODUCT_PRICES: Record<ProductType, number> = {
  'santa_message': 9.99,
  'vision_board': 4.99,
  'planner': 6.99,
  'flash_cards': 5.99
};

// Personalization instructions by product type
const PERSONALIZATION_INSTRUCTIONS: Record<ProductType, string> = {
  'santa_message': 'Please provide: 1) Child\'s name, 2) Age, 3) 2-3 good things they did this year',
  'vision_board': 'Please provide: 1) Your name or title for the board, 2) Any specific words/phrases for the subtitle, 3) Color preferences (optional)',
  'planner': 'Please provide: 1) Your name (optional), 2) Any specific goals to highlight',
  'flash_cards': 'Please provide: 1) Topic or subject, 2) Age group or difficulty level'
};

// Max personalization characters by product type
const PERSONALIZATION_CHAR_LIMIT: Record<ProductType, number> = {
  'santa_message': 1000,
  'vision_board': 500,
  'planner': 300,
  'flash_cards': 200
};

// Default quantity for digital products
const DEFAULT_QUANTITY = 999;

// ============================================================
// CSV ESCAPING
// ============================================================

/**
 * Escape a value for CSV format
 * - Wrap in quotes if contains comma, quote, or newline
 * - Double any existing quotes
 */
function escapeCsvValue(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if escaping is needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Double existing quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert a row object to CSV line
 */
function rowToCsvLine(row: CsvRow, columns: string[]): string {
  return columns.map(col => escapeCsvValue(row[col] || '')).join(',');
}

// ============================================================
// LISTING TO ROW CONVERSION
// ============================================================

/**
 * Convert a ListingDraft to a Shop Uploader CSV row
 */
function listingToShopUploaderRow(listing: ListingDraft, target: CsvTargetConfig): CsvRow {
  const row: CsvRow = {};

  // Action (first column for ShopUploader)
  row['action'] = 'create';

  // Core fields
  row['title'] = listing.title.substring(0, 140);  // Etsy max 140 chars
  row['description'] = listing.description;
  row['sku'] = listing.sku || `${listing.productType}-${listing.themeId}-${listing.variationIndex}`;
  row['price'] = listing.price.toFixed(2);
  row['quantity'] = String(listing.quantity || DEFAULT_QUANTITY);

  // Type fields
  row['type'] = 'digital';
  row['who_made'] = 'i_did';
  row['when_made'] = '2020_2025';
  row['is_made_to_order'] = 'FALSE';
  row['is_vintage'] = 'FALSE';
  row['is_supply'] = 'FALSE';
  row['is_taxable'] = 'TRUE';
  row['is_customizable'] = 'FALSE';
  row['auto_renew'] = 'TRUE';

  // Personalization (product-specific)
  row['is_personalizable'] = 'TRUE';
  row['personalization_instructions'] = PERSONALIZATION_INSTRUCTIONS[listing.productType];
  row['personalization_char_count_max'] = String(PERSONALIZATION_CHAR_LIMIT[listing.productType]);
  row['personalization_is_required'] = 'FALSE';

  // Listing state (default to draft for review before publishing)
  row['listing_state'] = 'draft';

  // Tags (up to 13, each max 20 chars)
  const mappings = target.columnMappings;
  if (mappings.tagColumns) {
    for (let i = 0; i < mappings.tagColumns.length; i++) {
      const tagCol = mappings.tagColumns[i];
      const tag = listing.tags[i];
      if (tag) {
        row[tagCol] = tag.substring(0, 20);  // Etsy max 20 chars per tag
      } else {
        row[tagCol] = '';
      }
    }
  }

  // Images (up to 10)
  for (let i = 0; i < mappings.imageColumns.length; i++) {
    const imgCol = mappings.imageColumns[i];
    const imgPath = listing.imagePaths[i];
    if (imgPath) {
      // For Shop Uploader, we need public URLs
      // For now, use the local path - user will need to upload to image host
      row[imgCol] = formatImagePath(imgPath, target);
    } else {
      row[imgCol] = '';
    }
  }

  return row;
}

/**
 * Convert a ListingDraft to a Generic Etsy CSV row
 */
function listingToGenericRow(listing: ListingDraft, target: CsvTargetConfig): CsvRow {
  const row: CsvRow = {};

  // Core fields
  row['title'] = listing.title.substring(0, 140);
  row['description'] = listing.description;
  row['sku'] = listing.sku || `${listing.productType}-${listing.themeId}-${listing.variationIndex}`;
  row['price'] = listing.price.toFixed(2);
  row['quantity'] = String(listing.quantity || DEFAULT_QUANTITY);

  // Type fields
  row['type'] = 'digital';
  row['who_made'] = 'i_did';
  row['is_supply'] = 'FALSE';

  // Tags as comma-separated string
  row['tags'] = listing.tags.slice(0, 13).map(t => t.substring(0, 20)).join(',');

  // Images
  const mappings = target.columnMappings;
  for (let i = 0; i < mappings.imageColumns.length; i++) {
    const imgCol = mappings.imageColumns[i];
    const imgPath = listing.imagePaths[i];
    if (imgPath) {
      row[imgCol] = formatImagePath(imgPath, target);
    } else {
      row[imgCol] = '';
    }
  }

  return row;
}

/**
 * Format image path based on target requirements
 */
function formatImagePath(imagePath: string, target: CsvTargetConfig): string {
  switch (target.imagePathFormat) {
    case 'filename':
      return path.basename(imagePath);
    case 'url':
      // Return the path as-is; user needs to upload to image host
      // and replace paths with URLs before importing
      return `[UPLOAD_TO_HOST]${path.basename(imagePath)}`;
    case 'full':
    default:
      return imagePath;
  }
}

/**
 * Convert a ListingDraft to a CSV row for any target
 */
export function listingToRow(listing: ListingDraft, target: CsvTargetConfig): CsvRow {
  switch (target.id) {
    case 'shopuploader':
      return listingToShopUploaderRow(listing, target);
    case 'generic_etsy':
    case 'csvlister':
    default:
      return listingToGenericRow(listing, target);
  }
}

// ============================================================
// CSV GENERATION
// ============================================================

/**
 * Get column order for a target
 */
function getColumnOrder(target: CsvTargetConfig): string[] {
  switch (target.id) {
    case 'shopuploader':
      return SHOPUPLOADER_COLUMN_ORDER;
    case 'generic_etsy':
    default:
      return GENERIC_COLUMN_ORDER;
  }
}

/**
 * Generate CSV content from listings
 */
export function generateCsv(listings: ListingDraft[], target: CsvTargetConfig): string {
  const columns = getColumnOrder(target);
  const rows = listings.map(listing => listingToRow(listing, target));

  // Header row
  const headerLine = columns.join(',');

  // Data rows
  const dataLines = rows.map(row => rowToCsvLine(row, columns));

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Write CSV to file
 */
export function writeCsvToFile(csvContent: string, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write as UTF-8
  fs.writeFileSync(filePath, csvContent, 'utf-8');
}

// ============================================================
// EXPORT LOGGING
// ============================================================

/**
 * Log a CSV export operation
 */
function logExport(entry: CsvExportLogEntry): void {
  const dir = path.dirname(CSV_LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(CSV_LOG_FILE, line, 'utf-8');
}

/**
 * Read recent export logs
 */
export function getExportLogs(limit: number = 50): CsvExportLogEntry[] {
  if (!fs.existsSync(CSV_LOG_FILE)) {
    return [];
  }

  const content = fs.readFileSync(CSV_LOG_FILE, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as CsvExportLogEntry)
    .slice(-limit);
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

/**
 * Export listings to CSV file
 *
 * This is the main entry point for CSV export.
 * It takes generated listings and writes them to a CSV file
 * in the format expected by the target bulk upload tool.
 */
export async function exportToCsv(
  listings: ListingDraft[],
  options: {
    targetId?: CsvTargetId;
    outputFile: string;
    productType: ProductType;
  }
): Promise<CsvExportResult> {
  const startTime = Date.now();
  const target = options.targetId ? getCsvTarget(options.targetId) : getDefaultCsvTarget();

  try {
    // Generate CSV content
    const csvContent = generateCsv(listings, target);

    // Write to file
    writeCsvToFile(csvContent, options.outputFile);

    const result: CsvExportResult = {
      success: true,
      filePath: options.outputFile,
      targetId: target.id,
      productType: options.productType,
      rowCount: listings.length,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime
    };

    // Log the export
    logExport({
      timestamp: result.generatedAt,
      filePath: result.filePath,
      targetId: result.targetId,
      productType: result.productType,
      rowCount: result.rowCount,
      success: true
    });

    console.log(`[CsvExporter] Exported ${listings.length} listings to ${options.outputFile}`);
    console.log(`[CsvExporter] Target: ${target.label}, Duration: ${result.durationMs}ms`);

    return result;

  } catch (error) {
    const errorMessage = (error as Error).message;

    const result: CsvExportResult = {
      success: false,
      filePath: options.outputFile,
      targetId: target.id,
      productType: options.productType,
      rowCount: 0,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      errors: [errorMessage]
    };

    // Log the failure
    logExport({
      timestamp: result.generatedAt,
      filePath: options.outputFile,
      targetId: target.id,
      productType: options.productType,
      rowCount: 0,
      success: false,
      error: errorMessage
    });

    console.error(`[CsvExporter] Export failed:`, error);

    return result;
  }
}

// ============================================================
// HELPER: CREATE LISTING DRAFT
// ============================================================

/**
 * Create a ListingDraft from listing generator output
 * This bridges the existing generator to the CSV exporter
 */
export function createListingDraft(
  generatorOutput: {
    title: string;
    description: string;
    tags: string[];
    contentHash: string;
  },
  metadata: {
    productType: ProductType;
    themeId: string;
    styleId?: string;
    variationIndex: number;
    imagePaths: string[];
  }
): ListingDraft {
  return {
    title: generatorOutput.title,
    description: generatorOutput.description,
    tags: generatorOutput.tags,
    price: PRODUCT_PRICES[metadata.productType],
    quantity: DEFAULT_QUANTITY,
    productType: metadata.productType,
    themeId: metadata.themeId,
    styleId: metadata.styleId,
    variationIndex: metadata.variationIndex,
    imagePaths: metadata.imagePaths,
    contentHash: generatorOutput.contentHash,
    generatedAt: new Date().toISOString()
  };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  PRODUCT_PRICES,
  DEFAULT_QUANTITY,
  escapeCsvValue,
  getColumnOrder
};
