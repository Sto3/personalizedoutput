/**
 * Etsy CSV Export - Types
 *
 * Type definitions for CSV-based bulk upload workflow.
 * Supports multiple third-party tools (CSVLister, ShopUploader, etc.)
 */

import { ProductType } from '../config/types';

// ============================================================
// CSV TARGET TYPES
// ============================================================

/**
 * Supported CSV target tool IDs
 */
export type CsvTargetId = 'csvlister' | 'shopuploader' | 'generic_etsy';

/**
 * Column mapping configuration for a CSV target
 */
export interface CsvColumnMappings {
  // Core listing fields
  title: string;
  description: string;
  price: string;
  quantity: string;

  // Tags - either single column or multiple columns
  tags?: string;                    // Single column for comma-separated tags
  tagColumns?: string[];            // Multiple columns (tag1, tag2, etc.)

  // Images - array of column names for image paths/URLs
  imageColumns: string[];           // e.g. ['image1', 'image2', 'image3']

  // Optional fields
  sku?: string;
  category?: string;
  digitalPhysical?: string;         // 'digital' or 'physical' type column
  shippingProfile?: string;
  processingTime?: string;
  materials?: string;
  occasion?: string;
  whoMadeIt?: string;               // 'i_did', 'collective', 'someone_else'
  whenMadeIt?: string;              // 'made_to_order', '2020_2024', etc.
  isSupply?: string;                // true/false for craft supplies

  // Any additional custom columns
  [key: string]: string | string[] | undefined;
}

/**
 * Configuration for a CSV export target tool
 */
export interface CsvTargetConfig {
  id: CsvTargetId;
  label: string;
  description: string;
  templatePath?: string;            // Path to sample template file
  columnMappings: CsvColumnMappings;
  defaultValues?: Record<string, string>;  // Default values for optional columns
  tagFormat: 'single' | 'multiple';        // How tags are formatted
  maxTags?: number;                        // Max number of tags supported
  imagePathFormat: 'full' | 'filename' | 'url';  // How image paths should be formatted
}

// ============================================================
// LISTING DRAFT TYPES
// ============================================================

/**
 * Internal listing draft structure (output from listing generator)
 */
export interface ListingDraft {
  // Core fields
  title: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];

  // Product metadata
  productType: ProductType;
  themeId: string;
  styleId?: string;
  variationIndex: number;

  // Image paths (local filesystem)
  imagePaths: string[];

  // Tracking
  contentHash: string;
  generatedAt: string;

  // Optional fields
  sku?: string;
  category?: string;
  materials?: string[];
}

/**
 * A single row in the CSV output
 */
export interface CsvRow {
  [columnName: string]: string;
}

// ============================================================
// EXPORT RESULT TYPES
// ============================================================

/**
 * Result of a CSV export operation
 */
export interface CsvExportResult {
  success: boolean;
  filePath: string;
  targetId: CsvTargetId;
  productType: ProductType;
  rowCount: number;
  generatedAt: string;
  durationMs: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Export options for CLI
 */
export interface CsvExportOptions {
  productType: ProductType;
  count: number;
  targetId: CsvTargetId;
  outputFile: string;
  themeIds?: string[];              // Optional filter by theme IDs
  dryRun?: boolean;                 // Preview without writing file
  skipImageGeneration?: boolean;    // Use existing images only
}

// ============================================================
// LOG ENTRY FOR TRACKING
// ============================================================

/**
 * Log entry for CSV export operations
 */
export interface CsvExportLogEntry {
  timestamp: string;
  filePath: string;
  targetId: CsvTargetId;
  productType: ProductType;
  rowCount: number;
  themeIds?: string[];
  success: boolean;
  error?: string;
}
