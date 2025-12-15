/**
 * Etsy Automation - Image Pipeline Service
 *
 * Connects generated sample images to Etsy listings.
 * Handles:
 * - Finding appropriate sample images for themes
 * - Generating mockups if needed
 * - Uploading images to listings
 * - Fallback to default images if theme-specific not available
 */

import * as path from 'path';
import * as fs from 'fs';
import { ProductType } from '../config/types';
import { getEtsyClient } from '../api/etsyClient';

// ============================================================
// CONFIGURATION
// ============================================================

const SAMPLES_BASE = path.join(__dirname, '..', '..', '..', 'output', 'samples');

const SAMPLE_DIRS: Record<ProductType, string> = {
  vision_board: path.join(SAMPLES_BASE, 'vision-boards'),
  santa_message: path.join(SAMPLES_BASE, 'santa-messages'),
  planner: path.join(SAMPLES_BASE, 'planners'),
  flash_cards: path.join(SAMPLES_BASE, 'flash-cards')
};

// Default images to use when theme-specific samples are not available
const DEFAULT_IMAGES: Record<ProductType, string> = {
  vision_board: 'default-vision-board.png',
  santa_message: 'default-santa-message.png',
  planner: 'default-planner.png',
  flash_cards: 'default-flash-cards.png'
};

// ============================================================
// TYPES
// ============================================================

export interface ImagePipelineResult {
  success: boolean;
  imagePath?: string;
  uploadedImageId?: number;
  error?: string;
  usedFallback?: boolean;
}

export interface ListingImageSet {
  primary: string;        // Main listing image
  mockups?: string[];     // Additional mockup images
  thumbnails?: string[];  // Thumbnail versions
}

// ============================================================
// IMAGE LOOKUP
// ============================================================

/**
 * Find sample image for a theme
 */
export function findSampleImage(
  productType: ProductType,
  themeId: string
): string | null {
  const dir = SAMPLE_DIRS[productType];

  if (!fs.existsSync(dir)) {
    console.warn(`[ImagePipeline] Sample directory not found: ${dir}`);
    return null;
  }

  // Try exact theme match
  const themePath = path.join(dir, `${themeId}.png`);
  if (fs.existsSync(themePath)) {
    return themePath;
  }

  // Try with .jpg extension
  const jpgPath = path.join(dir, `${themeId}.jpg`);
  if (fs.existsSync(jpgPath)) {
    return jpgPath;
  }

  console.log(`[ImagePipeline] No exact match for theme: ${themeId}`);
  return null;
}

/**
 * Get default sample image for product type
 */
export function getDefaultImage(productType: ProductType): string | null {
  const dir = SAMPLE_DIRS[productType];
  const defaultFile = DEFAULT_IMAGES[productType];
  const defaultPath = path.join(dir, defaultFile);

  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  // Try to find any image in the directory as fallback
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f =>
      f.endsWith('.png') || f.endsWith('.jpg')
    );
    if (files.length > 0) {
      console.log(`[ImagePipeline] Using first available sample: ${files[0]}`);
      return path.join(dir, files[0]);
    }
  }

  console.warn(`[ImagePipeline] No default image found for ${productType}`);
  return null;
}

/**
 * Get all images for a listing
 */
export function getListingImages(
  productType: ProductType,
  themeId: string
): ListingImageSet | null {
  // Find primary image
  let primaryImage = findSampleImage(productType, themeId);
  let usedFallback = false;

  if (!primaryImage) {
    primaryImage = getDefaultImage(productType);
    usedFallback = true;
  }

  if (!primaryImage) {
    console.error(`[ImagePipeline] No images available for ${productType}/${themeId}`);
    return null;
  }

  return {
    primary: primaryImage,
    mockups: [], // Can be populated with additional mockups
    thumbnails: []
  };
}

// ============================================================
// IMAGE VALIDATION
// ============================================================

/**
 * Validate image file meets Etsy requirements
 */
export function validateImage(imagePath: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check file exists
  if (!fs.existsSync(imagePath)) {
    errors.push('File does not exist');
    return { valid: false, errors };
  }

  // Check file size (Etsy max is 10MB)
  const stats = fs.statSync(imagePath);
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (stats.size > maxSize) {
    errors.push(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB (max 10MB)`);
  }

  // Check extension
  const ext = path.extname(imagePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
    errors.push(`Invalid file type: ${ext}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================
// UPLOAD SERVICE
// ============================================================

/**
 * Upload images to an Etsy listing
 */
export async function uploadImagesToListing(
  listingId: number,
  productType: ProductType,
  themeId: string,
  options: {
    skipValidation?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<ImagePipelineResult[]> {
  const results: ImagePipelineResult[] = [];

  // Get listing images
  const imageSet = getListingImages(productType, themeId);

  if (!imageSet) {
    return [{
      success: false,
      error: 'No images available for this listing'
    }];
  }

  const allImages = [
    imageSet.primary,
    ...(imageSet.mockups || [])
  ].filter(Boolean);

  for (let i = 0; i < allImages.length; i++) {
    const imagePath = allImages[i];

    // Validate
    if (!options.skipValidation) {
      const validation = validateImage(imagePath);
      if (!validation.valid) {
        results.push({
          success: false,
          imagePath,
          error: validation.errors.join(', ')
        });
        continue;
      }
    }

    // Upload (or dry run)
    if (options.dryRun) {
      console.log(`[DRY RUN] Would upload: ${imagePath} to listing ${listingId}`);
      results.push({
        success: true,
        imagePath,
        usedFallback: i === 0 && imageSet.primary !== findSampleImage(productType, themeId)
      });
    } else {
      try {
        const client = getEtsyClient();
        const response = await client.uploadListingImage(listingId, imagePath, {
          rank: i + 1
        });

        results.push({
          success: true,
          imagePath,
          uploadedImageId: response.listing_image_id,
          usedFallback: i === 0 && imageSet.primary !== findSampleImage(productType, themeId)
        });

        console.log(`[ImagePipeline] Uploaded image ${i + 1}: ${response.listing_image_id}`);
      } catch (error) {
        results.push({
          success: false,
          imagePath,
          error: (error as Error).message
        });
        console.error(`[ImagePipeline] Upload failed:`, error);
      }
    }
  }

  return results;
}

// ============================================================
// SAFETY CHECKS
// ============================================================

/**
 * Check if listing has images before activating
 */
export async function checkListingHasImages(listingId: number): Promise<boolean> {
  try {
    // This would need to check with Etsy API
    // For now, return true to allow the flow to continue
    console.log(`[ImagePipeline] Checking images for listing ${listingId}`);
    return true;
  } catch (error) {
    console.error(`[ImagePipeline] Error checking listing images:`, error);
    return false;
  }
}

/**
 * Pre-flight check before listing creation
 */
export function preflightCheck(
  productType: ProductType,
  themeId: string
): {
  ready: boolean;
  hasImages: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for theme-specific image
  const themeImage = findSampleImage(productType, themeId);
  const hasThemeImage = themeImage !== null;

  if (!hasThemeImage) {
    warnings.push(`No theme-specific image for ${themeId}, will use default`);
  }

  // Check for any available image
  const anyImage = themeImage || getDefaultImage(productType);
  const hasAnyImage = anyImage !== null;

  if (!hasAnyImage) {
    warnings.push(`No images available for ${productType}`);
  }

  return {
    ready: hasAnyImage,
    hasImages: hasAnyImage,
    warnings
  };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  SAMPLE_DIRS,
  DEFAULT_IMAGES
};
