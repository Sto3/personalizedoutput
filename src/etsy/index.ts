/**
 * Etsy Automation Module
 *
 * Complete system for automated Etsy listing management.
 *
 * This module provides:
 * - Theme and template configurations for 4 product types
 * - AI-powered listing content generation (Claude)
 * - Image processing and mockup generation (Sharp.js)
 * - Etsy OAuth authentication (PKCE flow)
 * - Etsy API client for listing management
 * - Bulk publishing orchestrator
 * - CLI for command-line operations
 *
 * Usage (CLI):
 *   npx ts-node src/etsy/cli/etsyCli.ts auth
 *   npx ts-node src/etsy/cli/etsyCli.ts preview vision_board 10
 *   npx ts-node src/etsy/cli/etsyCli.ts publish vision_board 50 --mode=draft
 *
 * Usage (Programmatic):
 *   import { bulkPublish, getThemesByProductType } from './etsy';
 *
 *   const themes = getThemesByProductType('vision_board');
 *   const summary = await bulkPublish('vision_board', 50, 'dry_run');
 */

// ============================================================
// CONFIG EXPORTS
// ============================================================

export * from './config/types';
export {
  // Theme collections
  VISION_BOARD_THEMES,
  SANTA_MESSAGE_THEMES,
  FLASH_CARD_THEMES,
  PLANNER_THEMES,
  STYLE_VARIANTS,
  // Theme helpers
  getThemesByProductType,
  getThemeById,
  getThemesByCategory,
  getStyleVariantById,
  getAllThemes
} from './config/themes';
export {
  // Template collections
  TITLE_TEMPLATES,
  DESCRIPTION_BLOCKS,
  TAG_POOLS,
  // Template helpers
  getTitleTemplatesByProduct,
  getDescriptionBlocks,
  getTagPool,
  getRandomTitleTemplate,
  getRandomDescriptionBlock,
  fillTitleTemplate,
  buildDescription,
  selectTags
} from './config/templates';

// ============================================================
// GENERATOR EXPORTS
// ============================================================

export {
  // Content generation
  generateListing,
  generateVariations,
  generateForStyle,
  batchGenerate,
  // Template-only generation
  generateTemplateTitle,
  generateTemplateDescription,
  generateTemplateTags,
  // Types
  GeneratorOptions,
  GenerationResult
} from './generators/listingGenerator';

export {
  // Uniqueness tracking
  generateContentHash,
  generateVariationKey,
  isDuplicateHash,
  isDuplicateVariation,
  registerHash,
  updateHashWithEtsyId,
  getAllHashes,
  getHashRecord,
  getHashStats,
  clearAllHashes,
  // Log management
  logListingAttempt,
  getRecentLogEntries,
  getLogStats,
  // Validation
  validateUniqueness,
  getNextVariationIndex,
  getVariationsForTheme,
  // Types
  ContentHashRecord,
  DATA_DIR as VARIATION_DATA_DIR,
  HASH_STORE_FILE,
  LISTING_LOG_FILE
} from './generators/variationEngine';

// ============================================================
// IMAGE EXPORTS
// ============================================================

export {
  // Mockup templates
  MOCKUP_TEMPLATES,
  getMockupTemplates,
  getMockupTemplateById,
  // Image generation
  createColorBackground,
  resizeToFit,
  createMockup,
  createSimplePreview,
  addTextOverlay,
  createThumbnail,
  // Batch processing
  generateAllMockups,
  processBatch,
  // Sample management
  getSamplePath,
  listAvailableSamples,
  // Constants
  ASSETS_DIR,
  TEMPLATES_DIR,
  SAMPLES_DIR,
  OUTPUT_DIR as IMAGES_OUTPUT_DIR,
  ETSY_IMAGE_SIZE,
  ETSY_THUMBNAIL_SIZE
} from './images/imagePipeline';

// ============================================================
// API EXPORTS
// ============================================================

export {
  // OAuth
  startAuthFlow,
  refreshAccessToken,
  getValidAccessToken,
  getEtsyCredentials,
  // Credential management
  loadCredentials,
  areCredentialsValid,
  canRefreshToken,
  getAuthStatus,
  clearCredentials,
  // Constants
  ETSY_API_BASE,
  REQUIRED_SCOPES,
  CREDENTIALS_FILE,
  // Types
  StoredCredentials
} from './api/etsyAuth';

export {
  // Client
  EtsyClient,
  getEtsyClient,
  // Types
  ListingCreateResponse,
  ImageUploadResponse,
  EtsyShopInfo,
  EtsyShippingProfile,
  EtsyTaxonomy
} from './api/etsyClient';

export {
  // Bulk publishing
  BulkPublisher,
  bulkPublish,
  publishAllThemes,
  publishThemeVariations,
  // Types
  BatchProgress,
  ProgressCallback
} from './api/bulkPublisher';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import { ProductType } from './config/types';
import { getThemesByProductType, STYLE_VARIANTS } from './config/themes';

/**
 * Get total listing count for a product type
 * (themes × styles for vision boards, just themes for others)
 */
export function getMaxListingsForProduct(productType: ProductType): number {
  const themes = getThemesByProductType(productType);

  if (productType === 'vision_board') {
    return themes.length * STYLE_VARIANTS.length;
  }

  return themes.length;
}

/**
 * Get summary counts for all products
 */
export function getProductSummary(): Record<ProductType, { themes: number; maxListings: number }> {
  const products: ProductType[] = ['vision_board', 'santa_message', 'flash_cards', 'planner'];

  const summary: Record<ProductType, { themes: number; maxListings: number }> = {} as any;

  for (const product of products) {
    const themes = getThemesByProductType(product);
    summary[product] = {
      themes: themes.length,
      maxListings: getMaxListingsForProduct(product)
    };
  }

  return summary;
}
