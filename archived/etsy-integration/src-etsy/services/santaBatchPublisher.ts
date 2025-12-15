/**
 * Santa Batch Publisher
 *
 * Generates and publishes Santa message listings to Etsy.
 * Uses themes from themes.ts and templates from templates.ts
 * to create unique, SEO-optimized listings.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EtsyClient, getEtsyClient, ListingCreateResponse } from '../api/etsyClient';
import { SANTA_MESSAGE_THEMES, getThemesByProductType } from '../config/themes';
import {
  getTitleTemplatesByProduct,
  getDescriptionBlocks,
  selectTags,
  fillTitleTemplate,
  getRandomTitleTemplate,
  getRandomDescriptionBlock
} from '../config/templates';
import { ThemeConfig, GeneratedListing, ProductType } from '../config/types';

// ============================================================
// CONFIGURATION
// ============================================================

// Santa product price (user specified $19.95)
const SANTA_PRICE = 19.95;

// Taxonomy ID for digital audio products
// Note: You may need to look this up via the API for your specific category
const SANTA_TAXONOMY_ID = 1; // Placeholder - will be looked up

// Image paths (local files to upload)
const SANTA_IMAGES_DIR = path.join(
  process.cwd(),
  'assets/etsy/santa voice message assets'
);

// Alternate image locations
const SANTA_IMAGES_LISTING_PACKET = path.join(
  process.cwd(),
  'listing_packets/santa_message_001/images'
);

// Video file
const SANTA_VIDEO_FILE = path.join(
  process.cwd(),
  'assets/etsy/santa voice message assets/A Personalized Santa Message Made Just for Your Child.mp4'
);

// PDF digital download (sent to buyer after purchase)
const SANTA_PDF_FILE = path.join(
  process.cwd(),
  'assets/etsy/santa voice message assets/Personalized Santa Audio Message_Made Just for Your Child.pdf'
);

// Log file location
const PUBLISH_LOG_FILE = path.join(process.cwd(), 'data/etsy/santa_publish_log.json');

// ============================================================
// TYPES
// ============================================================

interface PublishResult {
  success: boolean;
  listingId?: number;
  title: string;
  themeId: string;
  error?: string;
  url?: string;
  timestamp: string;
}

interface PublishOptions {
  count: number;
  mode: 'draft' | 'active';
  dryRun?: boolean;
  delayMs?: number;  // Delay between listings
  specificThemes?: string[];  // Only use these theme IDs
}

interface PublishReport {
  startTime: string;
  endTime: string;
  mode: string;
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
  results: PublishResult[];
}

// ============================================================
// LISTING GENERATOR
// ============================================================

/**
 * Generate a unique Santa listing from a theme
 */
function generateSantaListing(
  theme: ThemeConfig,
  variationIndex: number = 0
): GeneratedListing {
  // Get a random title template and fill it
  const titleTemplate = getRandomTitleTemplate('santa_message');
  let title: string;

  if (titleTemplate) {
    // Fill placeholders with theme data
    title = fillTitleTemplate(titleTemplate, {
      theme: theme.shortLabel,
      audience: theme.audience.replace(/_/g, ' '),
      angle: theme.emotionalAngles[variationIndex % theme.emotionalAngles.length]
    });
  } else {
    // Fallback title
    title = `Personalized Santa Message | ${theme.displayName} | Custom Audio Gift`;
  }

  // Ensure title is <= 140 characters (Etsy limit)
  if (title.length > 140) {
    title = title.substring(0, 137) + '...';
  }

  // Build description from blocks
  const sections: string[] = [];

  // Custom hook based on theme
  const themeHook = generateThemeHook(theme);
  sections.push(themeHook);

  // Add "Listen to samples first" section
  sections.push(`---

HEAR SANTA'S VOICE BEFORE YOU BUY
Listen to real samples at: personalizedoutput.com/santa-samples

---`);

  // How it works
  const howItWorks = getRandomDescriptionBlock('santa_message', 'how_it_works');
  if (howItWorks) sections.push(howItWorks.content);

  // What makes this different
  sections.push(`WHAT MAKES THIS DIFFERENT

- Santa says YOUR child's name with warmth
- He mentions THEIR specific accomplishments (not generic praise)
- References details only YOUR family would know
- Authentic, warm Santa voice that sounds real
- Keep and replay year after year`);

  // What you receive
  const whatYouReceive = getRandomDescriptionBlock('santa_message', 'what_you_receive');
  if (whatYouReceive) sections.push(whatYouReceive.content);

  // Perfect for section tailored to theme
  sections.push(generatePerfectForSection(theme));

  // Personalization instructions
  sections.push(`TO PERSONALIZE YOUR MESSAGE

Include in the personalization box:
- Child's first name (and pronunciation if unique)
- Their age
- 2-3 specific things they've done well this year
- Special details (pets, siblings, hobbies, favorite things)
- Optional: Challenges they've overcome that deserve recognition`);

  // Who this is for
  const whoFor = getRandomDescriptionBlock('santa_message', 'who_for');
  if (whoFor) sections.push(whoFor.content);

  // Reassurance
  sections.push(`Questions? Message me anytime. I'm here to make your child's Christmas unforgettable.`);

  const description = sections.join('\n\n');

  // Select tags - combine theme keywords with product tags
  const themeTags = [
    ...theme.primaryKeywords.slice(0, 4),
    ...theme.secondaryKeywords.slice(0, 3)
  ];
  const tags = selectTags('santa_message', themeTags, true, 13);

  // Ensure all tags are <= 20 characters (Etsy limit)
  const validTags = tags.map(tag => tag.length > 20 ? tag.substring(0, 20) : tag);

  return {
    id: `santa_${theme.id}_v${variationIndex}`,
    productType: 'santa_message',
    themeId: theme.id,
    variationIndex,
    contentHash: `santa_${theme.id}_${variationIndex}_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    title,
    description,
    tags: validTags,
    price: SANTA_PRICE,
    imagePaths: getSantaImagePaths(),
    sku: `SANTA-${theme.id.toUpperCase().substring(0, 10)}-${variationIndex}`,
    personalization: {
      isPersonalizable: true,
      isRequired: true,
      instructions: `Please provide:
• Child's first name (and pronunciation if unique spelling)
• Their age
• 2-3 specific accomplishments from this year
• Special details (pets, siblings, hobbies, favorite things)
• Optional: Any challenges they've overcome`,
      charCountMax: 1000
    }
  };
}

/**
 * Generate a theme-specific hook
 */
function generateThemeHook(theme: ThemeConfig): string {
  const emotionalAngle = theme.emotionalAngles[0];
  const audience = theme.audience.replace(/_/g, ' ');

  const hooks: Record<string, string> = {
    'toddlers_2_4': `Your little one's eyes will light up when they hear Santa say their name. This personalized audio message is crafted just for toddlers - gentle, warm, and absolutely magical.`,
    'children_5_7': `At this age, the magic of Christmas is at its peak. Give your child a personalized message from Santa that acknowledges their accomplishments and fills them with wonder.`,
    'children_8_10': `Your child is growing up fast, but they still believe. This personalized Santa message validates that belief with specific details about THEIR life that only Santa could know.`,
    'preteens_11_12': `For the older kids who still hold onto the magic - this isn't a childish Santa. It's a respectful, mature message that acknowledges their growth while keeping the wonder alive.`,
    'grieving_children': `Christmas can be hard when someone is missing. This gentle, loving message from Santa acknowledges your child's loss while bringing comfort and hope.`,
    'new_school_kids': `Starting at a new school takes courage. Santa sees the bravery your child has shown and this personalized message celebrates their strength.`,
    'anxious_children': `For sensitive souls who need extra gentleness - this Santa message is calm, reassuring, and designed to bring comfort rather than overwhelm.`,
    'twins': `Two special children deserve a message that celebrates both their unique personalities AND their special bond. Santa knows them each individually.`,
    'grandparents': `The perfect gift from grandparents who want to give their grandchild something truly magical - even from miles away.`
  };

  // Find matching hook or generate default
  for (const [key, hook] of Object.entries(hooks)) {
    if (theme.audience.includes(key) || theme.id.includes(key)) {
      return hook;
    }
  }

  // Default hook using emotional angle
  return `Give your child a Christmas memory they'll treasure forever. This personalized Santa message is crafted with ${emotionalAngle} and designed specifically for ${audience}.`;
}

/**
 * Generate a "Perfect For" section tailored to theme
 */
function generatePerfectForSection(theme: ThemeConfig): string {
  const defaultReasons = [
    'Children who believe in Santa\'s magic',
    'Parents who want Christmas to feel special',
    'Creating memories that last a lifetime'
  ];

  const themeReasons: Record<string, string[]> = {
    'by_age': ['Age-appropriate content and tone', 'Developmental awareness'],
    'by_situation': ['Understanding of your specific situation', 'Extra sensitivity and care'],
    'by_family': ['Recognition of family dynamics', 'Multi-child friendly options'],
    'by_focus': ['Specific emotional focus', 'Tailored messaging approach']
  };

  const extra = themeReasons[theme.category] || [];
  const reasons = [...extra, ...defaultReasons].slice(0, 5);

  return `PERFECT FOR

${reasons.map(r => `- ${r}`).join('\n')}`;
}

/**
 * Get Santa image paths - includes all PNGs (main images + screenshots)
 * Etsy allows up to 10 images per listing
 */
function getSantaImagePaths(): string[] {
  const images: string[] = [];

  // First, add the 5 clean numbered images from listing packet
  if (fs.existsSync(SANTA_IMAGES_LISTING_PACKET)) {
    const packetFiles = fs.readdirSync(SANTA_IMAGES_LISTING_PACKET)
      .filter(f => f.endsWith('.png'))
      .sort()
      .map(f => path.join(SANTA_IMAGES_LISTING_PACKET, f));
    images.push(...packetFiles);
  }

  // Then add screenshots from assets (they're large but good for showing the product)
  if (fs.existsSync(SANTA_IMAGES_DIR)) {
    const screenshots = fs.readdirSync(SANTA_IMAGES_DIR)
      .filter(f => f.endsWith('.png') && f.startsWith('Screenshot'))
      .sort()
      .map(f => path.join(SANTA_IMAGES_DIR, f));
    images.push(...screenshots);
  }

  if (images.length === 0) {
    console.warn('[SantaBatchPublisher] No Santa images found!');
  }

  // Etsy max is 10 images per listing
  return images.slice(0, 10);
}

/**
 * Get the Santa video file path (for video listings)
 */
function getSantaVideoPath(): string | null {
  if (fs.existsSync(SANTA_VIDEO_FILE)) {
    return SANTA_VIDEO_FILE;
  }
  console.warn('[SantaBatchPublisher] Santa video not found');
  return null;
}

/**
 * Get the Santa PDF digital download file path
 * This is the file buyers receive after purchase
 */
function getSantaDigitalFilePath(): string | null {
  if (fs.existsSync(SANTA_PDF_FILE)) {
    return SANTA_PDF_FILE;
  }
  console.warn('[SantaBatchPublisher] Santa PDF not found');
  return null;
}

// ============================================================
// BATCH PUBLISHER
// ============================================================

export class SantaBatchPublisher {
  private client: EtsyClient;
  private taxonomyId: number | null = null;

  constructor() {
    this.client = getEtsyClient();
  }

  /**
   * Initialize the publisher (gets taxonomy ID, etc.)
   */
  async init(): Promise<void> {
    await this.client.init();

    // Try to find appropriate taxonomy ID for digital audio
    try {
      this.taxonomyId = await this.client.findTaxonomyId(['audio', 'digital', 'recording']);
      console.log(`[SantaBatchPublisher] Found taxonomy ID: ${this.taxonomyId}`);
    } catch (e) {
      console.log('[SantaBatchPublisher] Could not find taxonomy, will use default');
      this.taxonomyId = 1; // Default
    }
  }

  /**
   * Generate listings without publishing (preview mode)
   */
  generateListings(count: number, specificThemes?: string[]): GeneratedListing[] {
    const themes = specificThemes
      ? SANTA_MESSAGE_THEMES.filter(t => specificThemes.includes(t.id))
      : SANTA_MESSAGE_THEMES;

    const listings: GeneratedListing[] = [];
    let themeIndex = 0;
    let variationIndex = 0;

    for (let i = 0; i < count; i++) {
      const theme = themes[themeIndex % themes.length];
      const listing = generateSantaListing(theme, variationIndex);
      listings.push(listing);

      // Rotate through themes, then increment variation
      themeIndex++;
      if (themeIndex >= themes.length) {
        themeIndex = 0;
        variationIndex++;
      }
    }

    return listings;
  }

  /**
   * Publish listings to Etsy
   */
  async publishListings(options: PublishOptions): Promise<PublishReport> {
    const startTime = new Date().toISOString();
    const results: PublishResult[] = [];

    // Generate listings
    const listings = this.generateListings(options.count, options.specificThemes);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`SANTA BATCH PUBLISHER`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Mode: ${options.mode.toUpperCase()}`);
    console.log(`Listings to create: ${listings.length}`);
    console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get asset paths once
    const imagePaths = getSantaImagePaths();
    const videoPath = getSantaVideoPath();
    const digitalFilePath = getSantaDigitalFilePath();

    console.log(`Found ${imagePaths.length} images to upload per listing`);
    console.log(`Video: ${videoPath ? 'YES' : 'NO'}`);
    console.log(`PDF digital download: ${digitalFilePath ? 'YES' : 'NO'}\n`);

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const progress = `[${i + 1}/${listings.length}]`;

      console.log(`${progress} Processing: ${listing.title.substring(0, 50)}...`);

      if (options.dryRun) {
        // Dry run - just log what would happen
        results.push({
          success: true,
          title: listing.title,
          themeId: listing.themeId || 'unknown',
          timestamp: new Date().toISOString()
        });
        console.log(`${progress} [DRY RUN] Would create listing`);
        continue;
      }

      try {
        // Create the listing
        const response = await this.client.createListingFromGenerated(listing, {
          taxonomyId: this.taxonomyId || undefined,
          state: options.mode
        });

        console.log(`${progress} Created listing ID: ${response.listing_id}`);

        // Upload images
        if (imagePaths.length > 0) {
          console.log(`${progress} Uploading ${imagePaths.length} images...`);
          await this.client.uploadListingImages(response.listing_id, imagePaths);
          console.log(`${progress} Images uploaded`);
        }

        // Upload video (Etsy allows 1 video per listing)
        if (videoPath) {
          console.log(`${progress} Uploading video...`);
          try {
            await this.client.uploadListingVideo(response.listing_id, videoPath);
            console.log(`${progress} Video uploaded`);
          } catch (videoError) {
            console.warn(`${progress} Video upload failed (non-fatal): ${(videoError as Error).message}`);
          }
        }

        // Upload PDF digital file (buyer receives after purchase)
        if (digitalFilePath) {
          console.log(`${progress} Uploading PDF digital file...`);
          try {
            await this.client.uploadDigitalFile(
              response.listing_id,
              digitalFilePath,
              'Personalized_Santa_Message_Instructions.pdf'
            );
            console.log(`${progress} Digital file uploaded`);
          } catch (pdfError) {
            console.warn(`${progress} PDF upload failed (non-fatal): ${(pdfError as Error).message}`);
          }
        }

        results.push({
          success: true,
          listingId: response.listing_id,
          title: listing.title,
          themeId: listing.themeId || 'unknown',
          url: response.url,
          timestamp: new Date().toISOString()
        });

        // Rate limit protection
        await this.client.waitIfRateLimited();

        // Optional delay between listings
        if (options.delayMs && i < listings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs));
        }

      } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`${progress} ERROR: ${errorMessage}`);

        results.push({
          success: false,
          title: listing.title,
          themeId: listing.themeId || 'unknown',
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }

    const endTime = new Date().toISOString();

    const report: PublishReport = {
      startTime,
      endTime,
      mode: options.mode,
      totalAttempted: listings.length,
      totalSucceeded: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results
    };

    // Save report to log file
    this.saveReport(report);

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PUBLISH COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total attempted: ${report.totalAttempted}`);
    console.log(`Succeeded: ${report.totalSucceeded}`);
    console.log(`Failed: ${report.totalFailed}`);
    console.log(`Log saved to: ${PUBLISH_LOG_FILE}`);
    console.log(`${'='.repeat(60)}\n`);

    return report;
  }

  /**
   * Save publish report to log file
   */
  private saveReport(report: PublishReport): void {
    const dir = path.dirname(PUBLISH_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing logs
    let logs: PublishReport[] = [];
    if (fs.existsSync(PUBLISH_LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(PUBLISH_LOG_FILE, 'utf-8'));
      } catch {
        logs = [];
      }
    }

    // Append new report
    logs.push(report);

    // Save
    fs.writeFileSync(PUBLISH_LOG_FILE, JSON.stringify(logs, null, 2));
  }

  /**
   * Preview what would be generated (no API calls)
   */
  preview(count: number = 5): void {
    const listings = this.generateListings(count);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`SANTA LISTING PREVIEW`);
    console.log(`${'='.repeat(60)}\n`);

    for (const listing of listings) {
      console.log(`ID: ${listing.id}`);
      console.log(`Title: ${listing.title}`);
      console.log(`Price: $${listing.price}`);
      console.log(`Tags: ${listing.tags.join(', ')}`);
      console.log(`SKU: ${listing.sku}`);
      console.log(`\nDescription (first 300 chars):`);
      console.log(listing.description.substring(0, 300) + '...');
      console.log(`\n${'-'.repeat(60)}\n`);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { PublishOptions, PublishResult, PublishReport, GeneratedListing };
