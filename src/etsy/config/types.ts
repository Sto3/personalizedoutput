/**
 * Etsy Automation - Type Definitions
 *
 * Core types used throughout the Etsy automation system.
 */

// ============================================================
// PRODUCT TYPES
// ============================================================

export type ProductType = 'vision_board' | 'santa_message' | 'flash_cards' | 'workbook';

// ============================================================
// THEME CONFIGURATION
// ============================================================

export interface ThemeConfig {
  id: string;                    // 'post_breakup_healing'
  productType: ProductType;      // 'vision_board'
  displayName: string;           // 'Post-Breakup Healing Vision Board'
  shortLabel: string;            // 'Post-breakup healing'
  category: string;              // 'life_transitions', 'personal_growth', etc.
  audience?: string;             // 'women_25_45', 'graduates', 'parents'
  aesthetic?: string;            // 'soft_feminine_pastel', 'bold_vibrant'
  primaryKeywords: string[];     // core SEO terms
  secondaryKeywords: string[];   // supporting SEO terms
  emotionalAngles: string[];     // 'healing', 'fresh start', 'self-worth'
  priceRange: {
    min: number;
    max: number;
    default: number;
  };
}

export interface StyleVariant {
  id: string;                    // 'style_minimalist_clean'
  displayName: string;           // 'Minimalist & Clean'
  description: string;           // for prompts
  colorPalette?: string[];       // hex colors for mockups
}

// ============================================================
// LISTING CONTENT
// ============================================================

export interface ListingContent {
  title: string;                 // max 140 chars for Etsy
  description: string;           // full listing description
  tags: string[];                // max 13 tags, 20 chars each
  price: number;                 // in USD
}

export interface GeneratedListing extends ListingContent {
  productType: ProductType;
  themeId: string;
  styleId?: string;
  variationIndex: number;
  contentHash: string;           // for uniqueness tracking
  generatedAt: string;           // ISO timestamp
}

// ============================================================
// TEMPLATE CONFIGURATION
// ============================================================

export interface TitleTemplate {
  id: string;
  productType: ProductType;
  template: string;              // with {placeholders}
  placeholders: string[];        // list of required placeholders
}

export interface DescriptionBlock {
  id: string;
  productType: ProductType;
  blockType: 'hook' | 'how_it_works' | 'what_you_receive' | 'who_for' | 'reassurance';
  content: string;
  variationIndex: number;
}

export interface TagPool {
  productType: ProductType;
  coreProductTags: string[];
  emotionalTags: string[];
  seasonalTags?: string[];
}

// ============================================================
// IMAGE PIPELINE
// ============================================================

export interface MockupTemplate {
  id: string;
  productType: ProductType;
  templatePath: string;          // path to template image
  samplePosition: {              // where to place sample
    x: number;
    y: number;
    width: number;
    height: number;
  };
  outputSuffix: string;          // '-frame', '-desk', etc.
}

export interface GeneratedImage {
  themeId: string;
  styleId?: string;
  imagePath: string;
  imageType: 'sample' | 'mockup';
  mockupType?: string;           // 'frame', 'desk', 'phone'
}

// ============================================================
// ETSY API
// ============================================================

export interface EtsyCredentials {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  shopId: string;
}

export interface EtsyListingRequest {
  title: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  taxonomyId: number;
  whoMade: 'i_did' | 'someone_else' | 'collective';
  whenMade: string;              // '2020_2024', etc.
  isSupply: boolean;
  type: 'physical' | 'download';
  shippingProfileId?: number;
}

export interface EtsyListingResponse {
  listing_id: number;
  state: 'draft' | 'active' | 'inactive';
  title: string;
  url: string;
}

// ============================================================
// BULK PUBLISHING
// ============================================================

export interface BulkPublishOptions {
  productType: ProductType;
  count: number;
  publishMode: 'draft' | 'active' | 'dry_run';
  themes?: string[];             // optional subset of theme IDs
  styles?: string[];             // optional subset of style IDs
  startIndex?: number;           // for resuming
}

export interface PublishResult {
  success: boolean;
  listingId?: number;
  themeId: string;
  styleId?: string;
  variationIndex: number;
  contentHash: string;
  error?: string;
  timestamp: string;
}

export interface PublishSummary {
  totalAttempted: number;
  successful: number;
  failed: number;
  skippedDuplicates: number;
  results: PublishResult[];
  startTime: string;
  endTime: string;
  durationMs: number;
}

// ============================================================
// LOGGING
// ============================================================

export interface ListingLogEntry {
  timestamp: string;
  productType: ProductType;
  themeId: string;
  styleId?: string;
  variationIndex: number;
  contentHash: string;
  etsyListingId?: number;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  title: string;
  tags: string[];
}
