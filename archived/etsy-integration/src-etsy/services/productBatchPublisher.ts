/**
 * Product Batch Publisher
 *
 * Unified batch publisher for all Etsy products:
 * - Vision Boards
 * - Planners (Guided Clarity Experiences)
 * - Flash Cards
 *
 * Santa has its own dedicated publisher (santaBatchPublisher.ts)
 */

import * as fs from 'fs';
import * as path from 'path';
import { EtsyClient, getEtsyClient } from '../api/etsyClient';
import {
  VISION_BOARD_THEMES,
  PLANNER_THEMES,
  FLASH_CARD_THEMES,
  getThemesByProductType
} from '../config/themes';
import {
  getRandomTitleTemplate,
  fillTitleTemplate,
  getRandomDescriptionBlock,
  selectTags
} from '../config/templates';
import { ThemeConfig, GeneratedListing, ProductType } from '../config/types';

// ============================================================
// CONFIGURATION
// ============================================================

const PRODUCT_CONFIG: Record<ProductType, {
  price: number;
  assetsDir: string;
  imagesDir: string;
}> = {
  vision_board: {
    price: 12.99,
    assetsDir: path.join(process.cwd(), 'assets/etsy/vision-boards'),
    imagesDir: path.join(process.cwd(), 'listing_packets/vision_board/images')
  },
  planner: {
    price: 14.99,
    assetsDir: path.join(process.cwd(), 'assets/etsy/planners'),
    imagesDir: path.join(process.cwd(), 'listing_packets/planner/images')
  },
  flash_cards: {
    price: 9.99,
    assetsDir: path.join(process.cwd(), 'assets/etsy/flash-cards'),
    imagesDir: path.join(process.cwd(), 'listing_packets/flash_cards/images')
  },
  santa_message: {
    price: 19.95,
    assetsDir: path.join(process.cwd(), 'assets/etsy/santa voice message assets'),
    imagesDir: path.join(process.cwd(), 'listing_packets/santa_message_001/images')
  }
};

// Log file location
const PUBLISH_LOG_FILE = path.join(process.cwd(), 'data/etsy/publish_log.json');

// ============================================================
// TYPES
// ============================================================

interface PublishResult {
  success: boolean;
  listingId?: number;
  title: string;
  themeId: string;
  productType: ProductType;
  error?: string;
  url?: string;
  timestamp: string;
}

interface PublishOptions {
  productType: ProductType;
  count: number;
  mode: 'draft' | 'active';
  dryRun?: boolean;
  delayMs?: number;
  specificThemes?: string[];
}

interface PublishReport {
  startTime: string;
  endTime: string;
  productType: ProductType;
  mode: string;
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
  results: PublishResult[];
}

// ============================================================
// LISTING GENERATORS
// ============================================================

/**
 * Generate a Vision Board listing
 */
function generateVisionBoardListing(theme: ThemeConfig, variationIndex: number): GeneratedListing {
  const titleTemplate = getRandomTitleTemplate('vision_board');
  let title: string;

  if (titleTemplate) {
    title = fillTitleTemplate(titleTemplate, {
      theme: theme.shortLabel || theme.displayName,
      angle: theme.emotionalAngles[variationIndex % theme.emotionalAngles.length],
      audience: theme.audience.replace(/_/g, ' '),
      outcome: theme.primaryKeywords[0] || 'transformation'
    });
  } else {
    title = `${theme.displayName} Vision Board | Digital Download | Printable Wall Art`;
  }

  if (title.length > 140) title = title.substring(0, 137) + '...';

  const description = buildVisionBoardDescription(theme);
  const tags = selectTags('vision_board', [
    ...theme.primaryKeywords.slice(0, 4),
    ...theme.secondaryKeywords.slice(0, 3)
  ], true, 13);

  return {
    id: `vb_${theme.id}_v${variationIndex}`,
    productType: 'vision_board',
    themeId: theme.id,
    variationIndex,
    contentHash: `vb_${theme.id}_${variationIndex}_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    title,
    description,
    tags: tags.map(t => t.length > 20 ? t.substring(0, 20) : t),
    price: PRODUCT_CONFIG.vision_board.price,
    imagePaths: getProductImages('vision_board'),
    sku: `VB-${theme.id.toUpperCase().substring(0, 12)}-${variationIndex}`,
    personalization: {
      isPersonalizable: true,
      isRequired: false,
      instructions: 'Optional: Add your name, specific goals, or affirmations to personalize your vision board.',
      charCountMax: 500
    }
  };
}

/**
 * Generate a Planner (Guided Clarity Experience / Personalized Reflection Session) listing
 */
function generatePlannerListing(theme: ThemeConfig, variationIndex: number): GeneratedListing {
  const angle = theme.emotionalAngles[variationIndex % theme.emotionalAngles.length];
  const themeLabel = theme.shortLabel || theme.displayName.replace(' Planner', '').replace(' Reflection', '');

  // Alternate between "Guided Clarity Experience" and "Personalized Reflection Session"
  const titleVariants = [
    `Guided Clarity Experience | ${themeLabel} | Personalized PDF Keepsake`,
    `Personalized Reflection Session | ${themeLabel} | ${angle}`,
    `${themeLabel} Guided Clarity | Personalized PDF | Self-Discovery Gift`,
    `Personalized ${themeLabel} Session | Clarity & Reflection | Digital PDF`,
    `Guided Clarity | ${themeLabel} | Personalized Reflection Experience`,
    `${themeLabel} Reflection Session | Personalized for YOU | PDF Keepsake`
  ];

  let title = titleVariants[variationIndex % titleVariants.length];

  if (title.length > 140) title = title.substring(0, 137) + '...';

  const description = buildPlannerDescription(theme);
  const tags = selectTags('planner', [
    ...theme.primaryKeywords.slice(0, 4),
    ...theme.secondaryKeywords.slice(0, 3)
  ], true, 13);

  return {
    id: `pl_${theme.id}_v${variationIndex}`,
    productType: 'planner',
    themeId: theme.id,
    variationIndex,
    contentHash: `pl_${theme.id}_${variationIndex}_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    title,
    description,
    tags: tags.map(t => t.length > 20 ? t.substring(0, 20) : t),
    price: PRODUCT_CONFIG.planner.price,
    imagePaths: getProductImages('planner'),
    sku: `PL-${theme.id.toUpperCase().substring(0, 12)}-${variationIndex}`,
    personalization: {
      isPersonalizable: true,
      isRequired: true,
      instructions: `Tell us about your situation:\n• What's on your mind right now?\n• What clarity are you seeking?\n• Any specific questions or challenges?\n\nWe'll create a personalized reflection experience just for you.`,
      charCountMax: 1000
    }
  };
}

/**
 * Generate a Flash Cards listing - "Custom Flash Cards for Your Child"
 */
function generateFlashCardsListing(theme: ThemeConfig, variationIndex: number): GeneratedListing {
  const angle = theme.emotionalAngles[variationIndex % theme.emotionalAngles.length];
  const themeLabel = theme.shortLabel || theme.displayName.replace(' Flash Cards', '');

  // All titles emphasize "Custom Flash Cards for Your Child"
  const titleVariants = [
    `Custom Flash Cards for Your Child | ${themeLabel} | Personalized PDF`,
    `Custom ${themeLabel} Flash Cards | Made for YOUR Child | Printable PDF`,
    `Personalized Flash Cards | ${themeLabel} | Custom for Your Child's Needs`,
    `Custom Flash Cards for Your Child | ${themeLabel} | ${angle}`,
    `${themeLabel} Flash Cards | Custom Made for YOUR Child | Digital PDF`,
    `Custom Learning Cards | ${themeLabel} | Personalized for Your Child`
  ];

  let title = titleVariants[variationIndex % titleVariants.length];

  if (title.length > 140) title = title.substring(0, 137) + '...';

  const description = buildFlashCardsDescription(theme);
  const tags = selectTags('flash_cards', [
    ...theme.primaryKeywords.slice(0, 4),
    ...theme.secondaryKeywords.slice(0, 3)
  ], true, 13);

  return {
    id: `fc_${theme.id}_v${variationIndex}`,
    productType: 'flash_cards',
    themeId: theme.id,
    variationIndex,
    contentHash: `fc_${theme.id}_${variationIndex}_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    title,
    description,
    tags: tags.map(t => t.length > 20 ? t.substring(0, 20) : t),
    price: PRODUCT_CONFIG.flash_cards.price,
    imagePaths: getProductImages('flash_cards'),
    sku: `FC-${theme.id.toUpperCase().substring(0, 12)}-${variationIndex}`,
    personalization: {
      isPersonalizable: true,
      isRequired: true,
      instructions: `Tell us about your child:\n• Child's name and age\n• Where they struggle (specific concepts)\n• Their interests (dinosaurs, princesses, sports, etc.)\n• Learning style (visual, hands-on, etc.)\n\nWe'll create flash cards targeting THEIR exact needs.`,
      charCountMax: 1000
    }
  };
}

// ============================================================
// DESCRIPTION BUILDERS
// ============================================================

function buildVisionBoardDescription(theme: ThemeConfig): string {
  const angle = theme.emotionalAngles[0];

  return `Transform your dreams into reality with this beautiful ${theme.displayName}.

This isn't just a pretty picture — it's a powerful tool for manifestation and goal-setting, designed to keep your intentions front and center every single day.

---

WHAT YOU'LL RECEIVE

• High-resolution digital PDF (ready to print)
• Multiple sizes included (8x10, 11x14, 16x20)
• Instant download after purchase
• Print at home or at any print shop

---

WHY VISION BOARDS WORK

When you see your goals daily, your brain starts working toward them — consciously and subconsciously. This ${angle} board is designed to inspire action and keep you focused on what matters most.

---

PERFECT FOR

• ${theme.audience.replace(/_/g, ' ')}
• Anyone ready for ${angle}
• Goal-setters and dreamers
• Those seeking clarity and direction
• New Year intentions and fresh starts

---

HOW TO USE

1. Print your vision board
2. Place it somewhere you'll see daily
3. Spend a moment each day visualizing your goals
4. Watch your mindset shift toward your dreams

---

PERSONALIZATION AVAILABLE

Want to add your name, specific goals, or personal affirmations? Use the personalization option at checkout!

Questions? Message me anytime — I'm here to help you create your best year yet.`;
}

function buildPlannerDescription(theme: ThemeConfig): string {
  const angle = theme.emotionalAngles[0];

  return `This isn't a template. It's not a generic workbook. This is a Guided Clarity Experience — a personalized PDF created specifically for YOUR situation.

Tell us what's on your mind, and we'll create a thoughtful reflection experience designed to help you find clarity, peace, and direction.

---

HOW IT WORKS

1. Purchase this listing
2. Share your situation in the personalization box (what you're going through, what clarity you need)
3. We create a personalized PDF with guided prompts, reflections, and exercises tailored to YOU
4. Receive your custom clarity experience within 24 hours

---

THIS IS PERFECT FOR

• ${theme.displayName}
• Anyone seeking ${angle}
• Those at a crossroads
• People who need space to think and reflect
• Anyone who processes better through writing

---

WHAT MAKES THIS DIFFERENT

This isn't AI-generated filler. We take the time to understand your specific situation and create prompts, exercises, and reflections that actually apply to what you're going through.

Every single experience is unique — because YOUR journey is unique.

---

WHAT YOU'LL RECEIVE

• Personalized PDF (15-25 pages)
• Custom reflection prompts
• Guided exercises for clarity
• Space for your thoughts and intentions
• Delivered within 24 hours

---

A MEANINGFUL GIFT

Looking for a thoughtful gift for someone going through a transition? This makes a beautiful, personal present that shows you truly care.

Questions? Message me. I'm here to support your journey toward clarity.`;
}

function buildFlashCardsDescription(theme: ThemeConfig): string {
  const angle = theme.emotionalAngles[0];

  return `These aren't generic flash cards. Tell us where YOUR child struggles — and we'll create cards targeting THEIR exact needs.

Every child learns differently. That's why we create personalized flash card sets based on what YOUR child needs to practice, in a theme THEY'LL love.

---

HOW IT WORKS

1. Purchase this listing
2. Tell us about your child:
   - Their name and age
   - Where they struggle (specific concepts)
   - Their interests (dinosaurs, princesses, sports, animals, etc.)
   - How they learn best
3. We create a custom PDF flash card set just for them
4. Print, cut, and start learning!

---

WHAT YOU'LL RECEIVE

• Personalized PDF flash card set (30-50 cards)
• 3×5 inch cards, 6 per page
• Cut guides included
• Professional, clean design
• Themed to your child's interests
• Delivered within 24-48 hours

---

PERFECT FOR

• ${theme.displayName}
• Children who need ${angle}
• Homeschool families
• Parents who want targeted practice
• Kids who need extra help in specific areas
• Making learning FUN with themes kids love

---

WHY PERSONALIZED CARDS WORK BETTER

Generic flash cards include things your child already knows AND things way beyond their level. Our custom cards focus ONLY on what YOUR child needs to practice — making every minute of study time count.

Plus, when cards feature their favorite themes, kids actually WANT to practice!

---

THEMES AVAILABLE

• Dinosaurs 🦖
• Princesses 👑
• Superheroes 🦸
• Space & Rockets 🚀
• Animals 🐾
• Sports ⚽
• And more — just tell us what they love!

---

Questions? Message me anytime. Let's help your child succeed!`;
}

// ============================================================
// IMAGE HELPERS
// ============================================================

/**
 * Get product images in the correct order for Etsy listings:
 *   1. 01_hero (main product image)
 *   2. 04_sample (product preview)
 *   3. 02_benefit (why it's different)
 *   4. 03_process (how it works)
 *   5. 05_reviews (aspirational reactions)
 *   + any additional images from assets folder
 */
function getProductImages(productType: ProductType): string[] {
  const config = PRODUCT_CONFIG[productType];
  const images: string[] = [];

  // Define the preferred order for listing images
  const preferredOrder = [
    '01_hero.png',
    '04_sample.png',
    '02_benefit.png',
    '03_process.png',
    '05_reviews.png'
  ];

  // Check listing packets first with custom ordering
  if (fs.existsSync(config.imagesDir)) {
    const allFiles = fs.readdirSync(config.imagesDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

    // Add files in preferred order first
    for (const preferred of preferredOrder) {
      if (allFiles.includes(preferred)) {
        images.push(path.join(config.imagesDir, preferred));
      }
    }

    // Then add any other files not in preferred order
    const otherFiles = allFiles.filter(f => !preferredOrder.includes(f));
    for (const file of otherFiles.sort()) {
      images.push(path.join(config.imagesDir, file));
    }
  }

  // Then check assets folder for additional images
  if (fs.existsSync(config.assetsDir)) {
    const assetFiles = fs.readdirSync(config.assetsDir)
      .filter(f => (f.endsWith('.png') || f.endsWith('.jpg')) && !f.startsWith('.'))
      .map(f => path.join(config.assetsDir, f));
    images.push(...assetFiles);
  }

  return images.slice(0, 10); // Etsy max 10 images
}

// ============================================================
// BATCH PUBLISHER CLASS
// ============================================================

export class ProductBatchPublisher {
  private client: EtsyClient;
  private taxonomyId: number | null = null;

  constructor() {
    this.client = getEtsyClient();
  }

  async init(): Promise<void> {
    await this.client.init();
    this.taxonomyId = 1; // Will be looked up dynamically
  }

  /**
   * Generate listings for a product type
   */
  generateListings(
    productType: ProductType,
    count: number,
    specificThemes?: string[]
  ): GeneratedListing[] {
    const themes = specificThemes
      ? getThemesByProductType(productType).filter(t => specificThemes.includes(t.id))
      : getThemesByProductType(productType);

    if (themes.length === 0) {
      console.warn(`[ProductBatchPublisher] No themes found for ${productType}`);
      return [];
    }

    const listings: GeneratedListing[] = [];
    let themeIndex = 0;
    let variationIndex = 0;

    for (let i = 0; i < count; i++) {
      const theme = themes[themeIndex % themes.length];

      let listing: GeneratedListing;
      switch (productType) {
        case 'vision_board':
          listing = generateVisionBoardListing(theme, variationIndex);
          break;
        case 'planner':
          listing = generatePlannerListing(theme, variationIndex);
          break;
        case 'flash_cards':
          listing = generateFlashCardsListing(theme, variationIndex);
          break;
        default:
          throw new Error(`Unsupported product type: ${productType}`);
      }

      listings.push(listing);

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

    const listings = this.generateListings(
      options.productType,
      options.count,
      options.specificThemes
    );

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${options.productType.toUpperCase()} BATCH PUBLISHER`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Mode: ${options.mode.toUpperCase()}`);
    console.log(`Listings to create: ${listings.length}`);
    console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log(`${'='.repeat(60)}\n`);

    const imagePaths = getProductImages(options.productType);
    console.log(`Found ${imagePaths.length} images to upload per listing\n`);

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const progress = `[${i + 1}/${listings.length}]`;

      console.log(`${progress} Processing: ${listing.title.substring(0, 50)}...`);

      if (options.dryRun) {
        results.push({
          success: true,
          title: listing.title,
          themeId: listing.themeId || 'unknown',
          productType: options.productType,
          timestamp: new Date().toISOString()
        });
        console.log(`${progress} [DRY RUN] Would create listing`);
        continue;
      }

      try {
        const response = await this.client.createListingFromGenerated(listing, {
          taxonomyId: this.taxonomyId || undefined,
          state: options.mode
        });

        console.log(`${progress} Created listing ID: ${response.listing_id}`);

        if (imagePaths.length > 0) {
          console.log(`${progress} Uploading ${imagePaths.length} images...`);
          await this.client.uploadListingImages(response.listing_id, imagePaths);
          console.log(`${progress} Images uploaded`);
        }

        results.push({
          success: true,
          listingId: response.listing_id,
          title: listing.title,
          themeId: listing.themeId || 'unknown',
          productType: options.productType,
          url: response.url,
          timestamp: new Date().toISOString()
        });

        await this.client.waitIfRateLimited();

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
          productType: options.productType,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }

    const endTime = new Date().toISOString();

    const report: PublishReport = {
      startTime,
      endTime,
      productType: options.productType,
      mode: options.mode,
      totalAttempted: listings.length,
      totalSucceeded: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results
    };

    this.saveReport(report);

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

  private saveReport(report: PublishReport): void {
    const dir = path.dirname(PUBLISH_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let logs: PublishReport[] = [];
    if (fs.existsSync(PUBLISH_LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(PUBLISH_LOG_FILE, 'utf-8'));
      } catch {
        logs = [];
      }
    }

    logs.push(report);
    fs.writeFileSync(PUBLISH_LOG_FILE, JSON.stringify(logs, null, 2));
  }

  /**
   * Preview listings (no API calls)
   */
  preview(productType: ProductType, count: number = 5): void {
    const listings = this.generateListings(productType, count);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${productType.toUpperCase()} LISTING PREVIEW`);
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

export { PublishOptions, PublishResult, PublishReport };
