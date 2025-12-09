/**
 * Etsy Automation - Image Pipeline
 *
 * Uses Sharp.js to create professional mockup images from
 * product samples. Supports various mockup templates like
 * frame, desk, phone, and tablet displays.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { ProductType, MockupTemplate, GeneratedImage, ThemeConfig, StyleVariant } from '../config/types';

// ============================================================
// CONFIGURATION
// ============================================================

const ASSETS_DIR = path.join(process.cwd(), 'assets', 'etsy');
const TEMPLATES_DIR = path.join(ASSETS_DIR, 'mockup-templates');
const SAMPLES_DIR = path.join(ASSETS_DIR, 'samples');
const OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'etsy', 'images');

// Standard Etsy image dimensions
const ETSY_IMAGE_SIZE = {
  width: 2000,
  height: 2000  // Square for Etsy
};

const ETSY_THUMBNAIL_SIZE = {
  width: 570,
  height: 456
};

// ============================================================
// MOCKUP TEMPLATES
// ============================================================

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  // ===== VISION BOARD MOCKUPS =====
  {
    id: 'vb_frame_white',
    productType: 'vision_board',
    templatePath: 'vision-board/frame-white.png',
    samplePosition: { x: 200, y: 200, width: 1600, height: 1600 },
    outputSuffix: '-frame-white'
  },
  {
    id: 'vb_frame_black',
    productType: 'vision_board',
    templatePath: 'vision-board/frame-black.png',
    samplePosition: { x: 200, y: 200, width: 1600, height: 1600 },
    outputSuffix: '-frame-black'
  },
  {
    id: 'vb_desk_setup',
    productType: 'vision_board',
    templatePath: 'vision-board/desk-setup.png',
    samplePosition: { x: 400, y: 150, width: 1200, height: 1200 },
    outputSuffix: '-desk'
  },
  {
    id: 'vb_wall_display',
    productType: 'vision_board',
    templatePath: 'vision-board/wall-display.png',
    samplePosition: { x: 300, y: 250, width: 1400, height: 1400 },
    outputSuffix: '-wall'
  },
  {
    id: 'vb_ipad_horizontal',
    productType: 'vision_board',
    templatePath: 'vision-board/ipad-horizontal.png',
    samplePosition: { x: 350, y: 450, width: 1300, height: 975 },
    outputSuffix: '-ipad'
  },

  // ===== FLASH CARDS MOCKUPS =====
  {
    id: 'flash_stack',
    productType: 'flash_cards',
    templatePath: 'flash-cards/card-stack.png',
    samplePosition: { x: 400, y: 300, width: 1200, height: 1200 },
    outputSuffix: '-stack'
  },
  {
    id: 'flash_spread',
    productType: 'flash_cards',
    templatePath: 'flash-cards/cards-spread.png',
    samplePosition: { x: 200, y: 400, width: 800, height: 600 },
    outputSuffix: '-spread'
  },
  {
    id: 'flash_desk',
    productType: 'flash_cards',
    templatePath: 'flash-cards/desk-study.png',
    samplePosition: { x: 500, y: 350, width: 1000, height: 750 },
    outputSuffix: '-desk'
  },

  // ===== WORKBOOK MOCKUPS =====
  {
    id: 'workbook_open',
    productType: 'workbook',
    templatePath: 'workbook/book-open.png',
    samplePosition: { x: 300, y: 300, width: 1400, height: 1000 },
    outputSuffix: '-open'
  },
  {
    id: 'workbook_closed',
    productType: 'workbook',
    templatePath: 'workbook/book-closed.png',
    samplePosition: { x: 500, y: 200, width: 1000, height: 1400 },
    outputSuffix: '-closed'
  },
  {
    id: 'workbook_desk',
    productType: 'workbook',
    templatePath: 'workbook/desk-journal.png',
    samplePosition: { x: 400, y: 400, width: 1200, height: 900 },
    outputSuffix: '-desk'
  },

  // ===== SANTA MESSAGE MOCKUPS =====
  {
    id: 'santa_letter',
    productType: 'santa_message',
    templatePath: 'santa/letter-display.png',
    samplePosition: { x: 400, y: 300, width: 1200, height: 1200 },
    outputSuffix: '-letter'
  },
  {
    id: 'santa_phone',
    productType: 'santa_message',
    templatePath: 'santa/phone-playing.png',
    samplePosition: { x: 600, y: 300, width: 800, height: 1400 },
    outputSuffix: '-phone'
  }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Ensure directories exist
 */
function ensureDirectories(): void {
  const dirs = [ASSETS_DIR, TEMPLATES_DIR, SAMPLES_DIR, OUTPUT_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Get mockup templates by product type
 */
export function getMockupTemplates(productType: ProductType): MockupTemplate[] {
  return MOCKUP_TEMPLATES.filter(t => t.productType === productType);
}

/**
 * Get mockup template by ID
 */
export function getMockupTemplateById(id: string): MockupTemplate | undefined {
  return MOCKUP_TEMPLATES.find(t => t.id === id);
}

/**
 * Generate output filename
 */
function generateOutputFilename(
  themeId: string,
  styleId?: string,
  mockupSuffix?: string
): string {
  const parts = [themeId];
  if (styleId) parts.push(styleId);
  if (mockupSuffix) parts.push(mockupSuffix);
  parts.push(Date.now().toString());
  return parts.join('-') + '.png';
}

// ============================================================
// IMAGE GENERATION
// ============================================================

/**
 * Create a simple solid color background
 */
export async function createColorBackground(
  color: string,
  width: number = ETSY_IMAGE_SIZE.width,
  height: number = ETSY_IMAGE_SIZE.height
): Promise<Buffer> {
  // Parse hex color
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r, g, b, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
}

/**
 * Resize an image to fit within bounds while maintaining aspect ratio
 */
export async function resizeToFit(
  inputPath: string,
  maxWidth: number,
  maxHeight: number
): Promise<Buffer> {
  return sharp(inputPath)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .png()
    .toBuffer();
}

/**
 * Composite a sample image onto a mockup template
 */
export async function createMockup(
  samplePath: string,
  template: MockupTemplate
): Promise<Buffer> {
  ensureDirectories();

  const templatePath = path.join(TEMPLATES_DIR, template.templatePath);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.warn(`[ImagePipeline] Template not found: ${templatePath}`);
    // Return the sample resized to Etsy dimensions as fallback
    return sharp(samplePath)
      .resize(ETSY_IMAGE_SIZE.width, ETSY_IMAGE_SIZE.height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();
  }

  const { x, y, width, height } = template.samplePosition;

  // Resize sample to fit the template position
  const resizedSample = await sharp(samplePath)
    .resize(width, height, {
      fit: 'cover'
    })
    .png()
    .toBuffer();

  // Composite onto template
  return sharp(templatePath)
    .composite([
      {
        input: resizedSample,
        left: x,
        top: y
      }
    ])
    .png()
    .toBuffer();
}

/**
 * Create a simple product preview image (no mockup template)
 */
export async function createSimplePreview(
  samplePath: string,
  backgroundColor: string = '#ffffff'
): Promise<Buffer> {
  // Create background
  const background = await createColorBackground(
    backgroundColor,
    ETSY_IMAGE_SIZE.width,
    ETSY_IMAGE_SIZE.height
  );

  // Resize sample
  const sampleSize = Math.round(ETSY_IMAGE_SIZE.width * 0.8); // 80% of canvas
  const resizedSample = await sharp(samplePath)
    .resize(sampleSize, sampleSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  // Calculate center position
  const offset = Math.round((ETSY_IMAGE_SIZE.width - sampleSize) / 2);

  // Composite
  return sharp(background)
    .composite([
      {
        input: resizedSample,
        left: offset,
        top: offset
      }
    ])
    .png()
    .toBuffer();
}

/**
 * Add text overlay to an image
 */
export async function addTextOverlay(
  imageBuffer: Buffer,
  text: string,
  options: {
    fontSize?: number;
    fontColor?: string;
    position?: 'top' | 'bottom' | 'center';
    padding?: number;
  } = {}
): Promise<Buffer> {
  const {
    fontSize = 60,
    fontColor = '#333333',
    position = 'bottom',
    padding = 50
  } = options;

  // Create SVG text overlay
  const textWidth = ETSY_IMAGE_SIZE.width - (padding * 2);
  const textHeight = fontSize * 2;

  let yPosition: number;
  switch (position) {
    case 'top':
      yPosition = padding;
      break;
    case 'center':
      yPosition = Math.round((ETSY_IMAGE_SIZE.height - textHeight) / 2);
      break;
    case 'bottom':
    default:
      yPosition = ETSY_IMAGE_SIZE.height - textHeight - padding;
  }

  const svgText = `
    <svg width="${ETSY_IMAGE_SIZE.width}" height="${ETSY_IMAGE_SIZE.height}">
      <style>
        .title {
          fill: ${fontColor};
          font-size: ${fontSize}px;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: bold;
        }
      </style>
      <text
        x="${ETSY_IMAGE_SIZE.width / 2}"
        y="${yPosition + fontSize}"
        text-anchor="middle"
        class="title"
      >${escapeXml(text)}</text>
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svgText),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a thumbnail version
 */
export async function createThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(ETSY_THUMBNAIL_SIZE.width, ETSY_THUMBNAIL_SIZE.height, {
      fit: 'cover'
    })
    .png()
    .toBuffer();
}

// ============================================================
// BATCH PROCESSING
// ============================================================

/**
 * Generate all mockups for a sample image
 */
export async function generateAllMockups(
  samplePath: string,
  productType: ProductType,
  themeId: string,
  styleId?: string
): Promise<GeneratedImage[]> {
  ensureDirectories();

  const templates = getMockupTemplates(productType);
  const results: GeneratedImage[] = [];

  // First, save the original sample
  const sampleFilename = generateOutputFilename(themeId, styleId, 'sample');
  const sampleOutputPath = path.join(OUTPUT_DIR, sampleFilename);

  const sampleBuffer = await createSimplePreview(samplePath);
  fs.writeFileSync(sampleOutputPath, sampleBuffer);

  results.push({
    themeId,
    styleId,
    imagePath: sampleOutputPath,
    imageType: 'sample'
  });

  console.log(`[ImagePipeline] Generated sample: ${sampleFilename}`);

  // Generate each mockup
  for (const template of templates) {
    try {
      const mockupBuffer = await createMockup(samplePath, template);
      const mockupFilename = generateOutputFilename(themeId, styleId, template.outputSuffix);
      const mockupOutputPath = path.join(OUTPUT_DIR, mockupFilename);

      fs.writeFileSync(mockupOutputPath, mockupBuffer);

      results.push({
        themeId,
        styleId,
        imagePath: mockupOutputPath,
        imageType: 'mockup',
        mockupType: template.outputSuffix.replace('-', '')
      });

      console.log(`[ImagePipeline] Generated mockup: ${mockupFilename}`);
    } catch (error) {
      console.error(`[ImagePipeline] Error generating mockup ${template.id}:`, error);
    }
  }

  return results;
}

/**
 * Process a batch of samples
 */
export async function processBatch(
  samples: Array<{
    samplePath: string;
    productType: ProductType;
    themeId: string;
    styleId?: string;
  }>,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedImage[]> {
  const allResults: GeneratedImage[] = [];
  const total = samples.length;

  for (let i = 0; i < samples.length; i++) {
    const { samplePath, productType, themeId, styleId } = samples[i];

    const results = await generateAllMockups(samplePath, productType, themeId, styleId);
    allResults.push(...results);

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return allResults;
}

/**
 * Get sample path for a theme (looks in samples directory)
 */
export function getSamplePath(themeId: string, styleId?: string): string | null {
  ensureDirectories();

  // Look for sample with style
  if (styleId) {
    const styledPath = path.join(SAMPLES_DIR, `${themeId}-${styleId}.png`);
    if (fs.existsSync(styledPath)) return styledPath;

    const styledJpg = path.join(SAMPLES_DIR, `${themeId}-${styleId}.jpg`);
    if (fs.existsSync(styledJpg)) return styledJpg;
  }

  // Look for sample without style
  const basePath = path.join(SAMPLES_DIR, `${themeId}.png`);
  if (fs.existsSync(basePath)) return basePath;

  const baseJpg = path.join(SAMPLES_DIR, `${themeId}.jpg`);
  if (fs.existsSync(baseJpg)) return baseJpg;

  return null;
}

/**
 * List all available samples
 */
export function listAvailableSamples(): string[] {
  ensureDirectories();

  if (!fs.existsSync(SAMPLES_DIR)) return [];

  return fs.readdirSync(SAMPLES_DIR)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .map(f => path.join(SAMPLES_DIR, f));
}

// ============================================================
// EXPORTS
// ============================================================

export {
  ASSETS_DIR,
  TEMPLATES_DIR,
  SAMPLES_DIR,
  OUTPUT_DIR,
  ETSY_IMAGE_SIZE,
  ETSY_THUMBNAIL_SIZE
};
