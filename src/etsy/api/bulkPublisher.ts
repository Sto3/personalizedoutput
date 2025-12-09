/**
 * Etsy Automation - Bulk Publisher
 *
 * Orchestrates large-scale listing creation by combining:
 * - Content generation (Claude)
 * - Image processing (Sharp)
 * - Uniqueness validation
 * - Etsy API publishing
 * - Progress logging
 */

import {
  ProductType,
  ThemeConfig,
  StyleVariant,
  BulkPublishOptions,
  PublishResult,
  PublishSummary,
  ListingLogEntry,
  GeneratedListing
} from '../config/types';
import {
  getThemesByProductType,
  getThemeById,
  STYLE_VARIANTS
} from '../config/themes';
import {
  generateListing,
  generateVariations,
  GenerationResult
} from '../generators/listingGenerator';
import {
  validateUniqueness,
  registerHash,
  updateHashWithEtsyId,
  logListingAttempt,
  getNextVariationIndex
} from '../generators/variationEngine';
import {
  generateAllMockups,
  getSamplePath,
  OUTPUT_DIR as IMAGES_OUTPUT_DIR
} from '../images/imagePipeline';
import { EtsyClient, getEtsyClient } from './etsyClient';

// ============================================================
// TYPES
// ============================================================

interface PublishItemResult {
  result: PublishResult;
  listing?: GeneratedListing;
}

interface BatchProgress {
  completed: number;
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  currentItem?: string;
}

type ProgressCallback = (progress: BatchProgress) => void;

// ============================================================
// BULK PUBLISHER CLASS
// ============================================================

export class BulkPublisher {
  private client: EtsyClient;
  private options: BulkPublishOptions;
  private progress: BatchProgress;
  private onProgress?: ProgressCallback;

  constructor(options: BulkPublishOptions) {
    this.client = getEtsyClient();
    this.options = options;
    this.progress = {
      completed: 0,
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  // ============================================================
  // MAIN PUBLISH METHODS
  // ============================================================

  /**
   * Run the bulk publishing job
   */
  async run(onProgress?: ProgressCallback): Promise<PublishSummary> {
    this.onProgress = onProgress;
    const startTime = new Date();
    const results: PublishResult[] = [];

    console.log(`\n[BulkPublisher] Starting bulk publish job`);
    console.log(`[BulkPublisher] Product type: ${this.options.productType}`);
    console.log(`[BulkPublisher] Target count: ${this.options.count}`);
    console.log(`[BulkPublisher] Mode: ${this.options.publishMode}`);

    // Initialize client
    if (this.options.publishMode !== 'dry_run') {
      await this.client.init();
      const connectionTest = await this.client.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Etsy connection failed: ${connectionTest.error}`);
      }
      console.log(`[BulkPublisher] Connected to shop: ${connectionTest.shopName}`);
    }

    // Get themes to process
    const themes = this.getThemesToProcess();
    const styles = this.getStylesToProcess();

    // Calculate total items
    const itemsPerTheme = Math.ceil(this.options.count / themes.length);
    this.progress.total = Math.min(themes.length * itemsPerTheme, this.options.count);

    console.log(`[BulkPublisher] Processing ${themes.length} themes, ${itemsPerTheme} items each`);
    console.log(`[BulkPublisher] Total items to generate: ${this.progress.total}\n`);

    // Process each theme
    let itemsCreated = 0;

    for (const theme of themes) {
      if (itemsCreated >= this.options.count) break;

      for (const style of styles) {
        if (itemsCreated >= this.options.count) break;

        // Get next variation index
        const variationIndex = getNextVariationIndex(theme.id, style?.id);

        this.progress.currentItem = `${theme.shortLabel}${style ? ` (${style.displayName})` : ''} v${variationIndex}`;
        this.updateProgress();

        try {
          const itemResult = await this.publishItem(theme, style, variationIndex);
          results.push(itemResult.result);

          if (itemResult.result.success) {
            this.progress.successful++;
            itemsCreated++;
          } else if (itemResult.result.error?.includes('Duplicate')) {
            this.progress.skipped++;
          } else {
            this.progress.failed++;
          }

        } catch (error) {
          const errorResult: PublishResult = {
            success: false,
            themeId: theme.id,
            styleId: style?.id,
            variationIndex,
            contentHash: '',
            error: (error as Error).message,
            timestamp: new Date().toISOString()
          };
          results.push(errorResult);
          this.progress.failed++;
        }

        this.progress.completed++;
        this.updateProgress();

        // Delay between items
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const endTime = new Date();

    const summary: PublishSummary = {
      totalAttempted: results.length,
      successful: this.progress.successful,
      failed: this.progress.failed,
      skippedDuplicates: this.progress.skipped,
      results,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime()
    };

    this.printSummary(summary);

    return summary;
  }

  /**
   * Publish a single item
   */
  async publishItem(
    theme: ThemeConfig,
    style?: StyleVariant,
    variationIndex: number = 0
  ): Promise<PublishItemResult> {
    const timestamp = new Date().toISOString();

    // Step 1: Generate listing content
    console.log(`[BulkPublisher] Generating content for ${theme.id}...`);
    const generationResult = await generateListing(theme, style, {
      useAI: true,
      variationIndex
    });

    if (!generationResult.success || !generationResult.listing) {
      return {
        result: {
          success: false,
          themeId: theme.id,
          styleId: style?.id,
          variationIndex,
          contentHash: '',
          error: generationResult.error || 'Content generation failed',
          timestamp
        }
      };
    }

    const listing = generationResult.listing;

    // Step 2: Validate uniqueness
    const uniquenessCheck = validateUniqueness(listing);
    if (!uniquenessCheck.isUnique) {
      console.log(`[BulkPublisher] Skipping duplicate: ${uniquenessCheck.reason}`);

      // Log the skip
      const logEntry: ListingLogEntry = {
        timestamp,
        productType: theme.productType,
        themeId: theme.id,
        styleId: style?.id,
        variationIndex,
        contentHash: listing.contentHash,
        status: 'skipped',
        error: uniquenessCheck.reason,
        title: listing.title,
        tags: listing.tags
      };
      logListingAttempt(logEntry);

      return {
        result: {
          success: false,
          themeId: theme.id,
          styleId: style?.id,
          variationIndex,
          contentHash: listing.contentHash,
          error: `Duplicate: ${uniquenessCheck.reason}`,
          timestamp
        },
        listing
      };
    }

    // Step 3: Dry run mode stops here
    if (this.options.publishMode === 'dry_run') {
      console.log(`[BulkPublisher] DRY RUN - Would publish: "${listing.title.substring(0, 50)}..."`);

      // Register hash even in dry run to track what would be created
      registerHash(listing);

      const logEntry: ListingLogEntry = {
        timestamp,
        productType: theme.productType,
        themeId: theme.id,
        styleId: style?.id,
        variationIndex,
        contentHash: listing.contentHash,
        status: 'success',
        title: listing.title,
        tags: listing.tags
      };
      logListingAttempt(logEntry);

      return {
        result: {
          success: true,
          themeId: theme.id,
          styleId: style?.id,
          variationIndex,
          contentHash: listing.contentHash,
          timestamp
        },
        listing
      };
    }

    // Step 4: Create Etsy listing
    console.log(`[BulkPublisher] Creating Etsy listing...`);

    try {
      // Check rate limits
      await this.client.waitIfRateLimited();

      // Create the listing
      const etsyResponse = await this.client.createListingFromGenerated(listing, {
        state: this.options.publishMode === 'active' ? 'active' : 'draft'
      });

      // Register the hash with Etsy ID
      registerHash(listing, etsyResponse.listing_id);

      // Step 5: Upload images (if sample exists)
      const samplePath = getSamplePath(theme.id, style?.id);
      if (samplePath) {
        console.log(`[BulkPublisher] Generating and uploading images...`);

        const images = await generateAllMockups(
          samplePath,
          theme.productType,
          theme.id,
          style?.id
        );

        // Upload first 10 images (Etsy limit)
        const imagePaths = images.slice(0, 10).map(img => img.imagePath);
        if (imagePaths.length > 0) {
          await this.client.uploadListingImages(etsyResponse.listing_id, imagePaths);
        }
      }

      // Log success
      const logEntry: ListingLogEntry = {
        timestamp,
        productType: theme.productType,
        themeId: theme.id,
        styleId: style?.id,
        variationIndex,
        contentHash: listing.contentHash,
        etsyListingId: etsyResponse.listing_id,
        status: 'success',
        title: listing.title,
        tags: listing.tags
      };
      logListingAttempt(logEntry);

      console.log(`[BulkPublisher] Published: ${etsyResponse.listing_id} - "${listing.title.substring(0, 40)}..."`);

      return {
        result: {
          success: true,
          listingId: etsyResponse.listing_id,
          themeId: theme.id,
          styleId: style?.id,
          variationIndex,
          contentHash: listing.contentHash,
          timestamp
        },
        listing
      };

    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`[BulkPublisher] Error publishing: ${errorMessage}`);

      // Log failure
      const logEntry: ListingLogEntry = {
        timestamp,
        productType: theme.productType,
        themeId: theme.id,
        styleId: style?.id,
        variationIndex,
        contentHash: listing.contentHash,
        status: 'failed',
        error: errorMessage,
        title: listing.title,
        tags: listing.tags
      };
      logListingAttempt(logEntry);

      return {
        result: {
          success: false,
          themeId: theme.id,
          styleId: style?.id,
          variationIndex,
          contentHash: listing.contentHash,
          error: errorMessage,
          timestamp
        },
        listing
      };
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Get themes to process based on options
   */
  private getThemesToProcess(): ThemeConfig[] {
    let themes = getThemesByProductType(this.options.productType);

    // Filter by specific theme IDs if provided
    if (this.options.themes && this.options.themes.length > 0) {
      themes = themes.filter(t => this.options.themes!.includes(t.id));
    }

    return themes;
  }

  /**
   * Get styles to process based on options
   */
  private getStylesToProcess(): (StyleVariant | undefined)[] {
    // Only vision boards have styles
    if (this.options.productType !== 'vision_board') {
      return [undefined];
    }

    let styles: (StyleVariant | undefined)[] = [...STYLE_VARIANTS];

    // Filter by specific style IDs if provided
    if (this.options.styles && this.options.styles.length > 0) {
      styles = STYLE_VARIANTS.filter(s => this.options.styles!.includes(s.id));
    }

    return styles.length > 0 ? styles : [undefined];
  }

  /**
   * Update progress callback
   */
  private updateProgress(): void {
    if (this.onProgress) {
      this.onProgress({ ...this.progress });
    }
  }

  /**
   * Print final summary
   */
  private printSummary(summary: PublishSummary): void {
    const durationSec = Math.round(summary.durationMs / 1000);
    const rate = summary.successful > 0
      ? Math.round(summary.successful / (summary.durationMs / 60000) * 10) / 10
      : 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log('BULK PUBLISH SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Attempted:   ${summary.totalAttempted}`);
    console.log(`Successful:        ${summary.successful}`);
    console.log(`Failed:            ${summary.failed}`);
    console.log(`Skipped (dups):    ${summary.skippedDuplicates}`);
    console.log(`Duration:          ${durationSec}s`);
    console.log(`Rate:              ${rate} listings/min`);
    console.log('='.repeat(60));

    if (summary.failed > 0) {
      console.log('\nFailed Items:');
      const failedResults = summary.results.filter(r => !r.success && !r.error?.includes('Duplicate'));
      for (const result of failedResults.slice(0, 10)) {
        console.log(`  - ${result.themeId}: ${result.error}`);
      }
      if (failedResults.length > 10) {
        console.log(`  ... and ${failedResults.length - 10} more`);
      }
    }

    console.log('');
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Quick bulk publish with defaults
 */
export async function bulkPublish(
  productType: ProductType,
  count: number,
  mode: 'draft' | 'active' | 'dry_run' = 'dry_run',
  onProgress?: ProgressCallback
): Promise<PublishSummary> {
  const publisher = new BulkPublisher({
    productType,
    count,
    publishMode: mode
  });

  return publisher.run(onProgress);
}

/**
 * Publish all themes for a product type (one variation each)
 */
export async function publishAllThemes(
  productType: ProductType,
  mode: 'draft' | 'active' | 'dry_run' = 'dry_run',
  onProgress?: ProgressCallback
): Promise<PublishSummary> {
  const themes = getThemesByProductType(productType);

  const publisher = new BulkPublisher({
    productType,
    count: themes.length,
    publishMode: mode
  });

  return publisher.run(onProgress);
}

/**
 * Publish a specific theme with multiple variations
 */
export async function publishThemeVariations(
  themeId: string,
  variationCount: number,
  mode: 'draft' | 'active' | 'dry_run' = 'dry_run',
  onProgress?: ProgressCallback
): Promise<PublishSummary> {
  const theme = getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  const publisher = new BulkPublisher({
    productType: theme.productType,
    count: variationCount,
    publishMode: mode,
    themes: [themeId]
  });

  return publisher.run(onProgress);
}

// ============================================================
// EXPORTS
// ============================================================

export {
  PublishItemResult,
  BatchProgress,
  ProgressCallback
};
