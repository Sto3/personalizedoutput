/**
 * Etsy CSV Export - Target Configurations
 *
 * Defines CSV formats for different bulk upload tools.
 * Primary target: Shop Uploader (clear docs, well-documented format)
 */

import { CsvTargetConfig, CsvTargetId } from './csvTypes';

// ============================================================
// SHOP UPLOADER TARGET (PRIMARY)
// ============================================================

/**
 * Shop Uploader CSV format
 * Docs: https://www.shopuploader.com/guides/bulk-upload-to-etsy
 *
 * Required columns for new listings:
 * - title, description, price, quantity, type, who_made, is_supply
 * - tag_1 through tag_13 (at least tag_1 required)
 * - image_1 through image_10 (URLs to publicly accessible images)
 */
export const SHOPUPLOADER_TARGET: CsvTargetConfig = {
  id: 'shopuploader',
  label: 'Shop Uploader',
  description: 'CSV format for shopuploader.com bulk upload tool',
  templatePath: 'assets/etsy/csv_templates/shopuploader_template.csv',
  tagFormat: 'multiple',
  maxTags: 13,
  imagePathFormat: 'url',  // Shop Uploader requires public URLs
  columnMappings: {
    title: 'title',
    description: 'description',
    price: 'price',
    quantity: 'quantity',
    sku: 'sku',
    tagColumns: [
      'tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5',
      'tag_6', 'tag_7', 'tag_8', 'tag_9', 'tag_10',
      'tag_11', 'tag_12', 'tag_13'
    ],
    imageColumns: [
      'image_1', 'image_2', 'image_3', 'image_4', 'image_5',
      'image_6', 'image_7', 'image_8', 'image_9', 'image_10'
    ],
    digitalPhysical: 'type',
    whoMadeIt: 'who_made',
    isSupply: 'is_supply',
    processingTime: 'processing_min',
    shippingProfile: 'shipping_profile_id',
    category: 'taxonomy_id'
  },
  defaultValues: {
    'action': 'create',
    'type': 'digital',
    'who_made': 'i_did',
    'when_made': '2020_2025',
    'is_supply': 'FALSE',
    'is_made_to_order': 'FALSE',
    'is_vintage': 'FALSE',
    'auto_renew': 'TRUE',
    'is_taxable': 'TRUE',
    'is_customizable': 'FALSE',
    'is_personalizable': 'TRUE',
    'personalization_is_required': 'FALSE',
    'listing_state': 'draft'
  }
};

// ============================================================
// GENERIC ETSY TARGET (FALLBACK)
// ============================================================

/**
 * Generic Etsy CSV format
 * A simplified format that works with most tools
 * Uses local file paths (for manual upload via tool dashboard)
 */
export const GENERIC_ETSY_TARGET: CsvTargetConfig = {
  id: 'generic_etsy',
  label: 'Generic Etsy CSV',
  description: 'Generic CSV format compatible with most bulk upload tools',
  tagFormat: 'single',
  maxTags: 13,
  imagePathFormat: 'filename',  // Just filenames for manual upload
  columnMappings: {
    title: 'title',
    description: 'description',
    price: 'price',
    quantity: 'quantity',
    sku: 'sku',
    tags: 'tags',  // Comma-separated
    imageColumns: ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'],
    digitalPhysical: 'type',
    whoMadeIt: 'who_made',
    isSupply: 'is_supply'
  },
  defaultValues: {
    'type': 'digital',
    'who_made': 'i_did',
    'is_supply': 'FALSE',
    'quantity': '999'
  }
};

// ============================================================
// CSV LISTER TARGET
// ============================================================

/**
 * CSV Lister format (based on their template structure)
 * Note: Requires account to get exact template, this is inferred
 */
export const CSVLISTER_TARGET: CsvTargetConfig = {
  id: 'csvlister',
  label: 'CSV Lister',
  description: 'CSV format for csvlister.com bulk upload tool',
  templatePath: 'assets/etsy/csv_templates/csvlister_template.csv',
  tagFormat: 'single',
  maxTags: 13,
  imagePathFormat: 'url',
  columnMappings: {
    title: 'Title',
    description: 'Description',
    price: 'Price',
    quantity: 'Quantity',
    sku: 'SKU',
    tags: 'Tags',  // Comma-separated
    imageColumns: ['Image 1', 'Image 2', 'Image 3', 'Image 4', 'Image 5'],
    digitalPhysical: 'Type',
    whoMadeIt: 'Who Made',
    isSupply: 'Is Supply'
  },
  defaultValues: {
    'Type': 'Digital',
    'Who Made': 'I did',
    'Is Supply': 'No',
    'Quantity': '999'
  }
};

// ============================================================
// TARGET REGISTRY
// ============================================================

/**
 * All available CSV targets
 */
export const CSV_TARGETS: Record<CsvTargetId, CsvTargetConfig> = {
  'shopuploader': SHOPUPLOADER_TARGET,
  'generic_etsy': GENERIC_ETSY_TARGET,
  'csvlister': CSVLISTER_TARGET
};

/**
 * Get a CSV target configuration by ID
 */
export function getCsvTarget(targetId: CsvTargetId): CsvTargetConfig {
  const target = CSV_TARGETS[targetId];
  if (!target) {
    throw new Error(`Unknown CSV target: ${targetId}. Available: ${Object.keys(CSV_TARGETS).join(', ')}`);
  }
  return target;
}

/**
 * List all available CSV targets
 */
export function listCsvTargets(): Array<{ id: CsvTargetId; label: string; description: string }> {
  return Object.values(CSV_TARGETS).map(t => ({
    id: t.id,
    label: t.label,
    description: t.description
  }));
}

/**
 * Get the default CSV target
 */
export function getDefaultCsvTarget(): CsvTargetConfig {
  return SHOPUPLOADER_TARGET;  // Shop Uploader is our primary target
}

// ============================================================
// COLUMN ORDER FOR SHOP UPLOADER
// ============================================================

/**
 * Full column order for Shop Uploader CSV
 * This ensures consistent column ordering in output files
 *
 * Based on ShopUploader documentation:
 * https://www.shopuploader.com/docs/templates
 */
export const SHOPUPLOADER_COLUMN_ORDER = [
  'action',
  'title',
  'description',
  'sku',
  'price',
  'quantity',
  'type',
  'who_made',
  'when_made',
  'is_made_to_order',
  'is_vintage',
  'is_supply',
  'is_taxable',
  'is_customizable',
  'is_personalizable',
  'personalization_instructions',
  'personalization_char_count_max',
  'personalization_is_required',
  'auto_renew',
  'listing_state',
  'tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5',
  'tag_6', 'tag_7', 'tag_8', 'tag_9', 'tag_10',
  'tag_11', 'tag_12', 'tag_13',
  'image_1', 'image_2', 'image_3', 'image_4', 'image_5',
  'image_6', 'image_7', 'image_8', 'image_9', 'image_10',
  'digital_file_1', 'digital_file_2', 'digital_file_3'
];

/**
 * Full column order for Generic Etsy CSV
 */
export const GENERIC_COLUMN_ORDER = [
  'title',
  'description',
  'sku',
  'price',
  'quantity',
  'type',
  'who_made',
  'is_supply',
  'tags',
  'image_1', 'image_2', 'image_3', 'image_4', 'image_5'
];
