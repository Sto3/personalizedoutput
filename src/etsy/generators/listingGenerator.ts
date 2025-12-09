/**
 * Etsy Automation - Listing Content Generator
 *
 * Uses Claude API to generate unique, SEO-optimized listing content
 * for each product type and theme combination.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ProductType,
  ThemeConfig,
  StyleVariant,
  ListingContent,
  GeneratedListing
} from '../config/types';
import {
  getTitleTemplatesByProduct,
  getRandomTitleTemplate,
  fillTitleTemplate,
  buildDescription,
  selectTags,
  getRandomDescriptionBlock
} from '../config/templates';
import { generateContentHash } from './variationEngine';

// ============================================================
// TYPES
// ============================================================

interface GeneratorOptions {
  useAI?: boolean;           // Use Claude for enhanced content (default: true)
  variationIndex?: number;   // Which variation to generate (0-based)
  includeSeasonal?: boolean; // Include seasonal tags
  customHook?: string;       // Override the opening hook
}

interface GenerationResult {
  success: boolean;
  listing?: GeneratedListing;
  error?: string;
  tokensUsed?: number;
}

// ============================================================
// CLAUDE CLIENT
// ============================================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const TITLE_SYSTEM_PROMPT = `You are an Etsy SEO expert specializing in digital downloads. Your job is to create compelling, keyword-rich titles that:
- Are under 140 characters (Etsy limit)
- Front-load the most important keywords
- Feel natural and appealing to buyers
- Include the product type (vision board, flash cards, etc.)
- Mention "digital download" or "printable" for SEO

IMPORTANT: Only output the title, nothing else. No quotes, no explanation.`;

const DESCRIPTION_HOOK_PROMPT = `You are a copywriter specializing in empathetic, encouraging content for Etsy digital products. Write opening hooks that:
- Connect emotionally with the buyer's situation
- Feel warm and supportive, never salesy
- Are 2-3 sentences max
- Focus on transformation and hope
- Are family-friendly and faith-compatible

IMPORTANT: Only output the hook paragraph, nothing else. No quotes, no explanation.`;

const TAGS_SYSTEM_PROMPT = `You are an Etsy SEO specialist. Generate relevant search tags that:
- Are 20 characters or less each (Etsy limit)
- Include a mix of specific and broad terms
- Cover different ways buyers might search
- Are lowercase with no special characters

IMPORTANT: Output only comma-separated tags, nothing else. Maximum 8 tags.`;

// ============================================================
// AI-ENHANCED GENERATION
// ============================================================

/**
 * Generate an AI-enhanced title for a listing
 */
async function generateAITitle(
  theme: ThemeConfig,
  style?: StyleVariant
): Promise<{ title: string; tokens: number }> {
  const client = getAnthropicClient();

  const styleContext = style ? `Style: ${style.displayName} - ${style.description}` : '';

  const userPrompt = `Create an Etsy title for this digital product:

Product Type: ${theme.productType.replace('_', ' ')}
Theme: ${theme.displayName}
Short Label: ${theme.shortLabel}
${styleContext}
Primary Keywords: ${theme.primaryKeywords.join(', ')}
Emotional Angles: ${theme.emotionalAngles.join(', ')}
Target Audience: ${theme.audience || 'general'}

Remember: Max 140 characters, front-load keywords, include "digital download" or "printable".`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    system: TITLE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const title = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  // Ensure title is under 140 characters
  const truncatedTitle = title.length > 140 ? title.substring(0, 137) + '...' : title;

  return { title: truncatedTitle, tokens };
}

/**
 * Generate an AI-enhanced description hook
 */
async function generateAIHook(
  theme: ThemeConfig
): Promise<{ hook: string; tokens: number }> {
  const client = getAnthropicClient();

  const userPrompt = `Write an opening hook for an Etsy listing:

Product: ${theme.displayName}
Who it's for: ${theme.audience || 'anyone seeking positive change'}
Emotional angles: ${theme.emotionalAngles.join(', ')}
Category: ${theme.category.replace('_', ' ')}

Write 2-3 warm, encouraging sentences that connect with someone experiencing this life moment.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: DESCRIPTION_HOOK_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const hook = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  return { hook, tokens };
}

/**
 * Generate AI-suggested additional tags
 */
async function generateAITags(
  theme: ThemeConfig,
  existingTags: string[]
): Promise<{ tags: string[]; tokens: number }> {
  const client = getAnthropicClient();

  const userPrompt = `Suggest additional Etsy search tags for:

Product: ${theme.displayName}
Type: ${theme.productType.replace('_', ' ')}
Keywords already used: ${existingTags.join(', ')}

Generate 8 NEW tags (not duplicating existing ones) that buyers might search for. Max 20 characters each.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system: TAGS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const tagText = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const tags = tagText
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0 && t.length <= 20 && !existingTags.includes(t));

  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  return { tags, tokens };
}

// ============================================================
// TEMPLATE-BASED GENERATION
// ============================================================

/**
 * Generate title using templates (no AI)
 */
function generateTemplateTitle(
  theme: ThemeConfig,
  style?: StyleVariant
): string {
  const template = getRandomTitleTemplate(theme.productType);
  if (!template) {
    // Fallback title
    return `${theme.displayName} | Digital Download | Printable`;
  }

  const values: Record<string, string> = {
    theme: theme.shortLabel,
    angle: theme.emotionalAngles[0] || 'inspiration',
    outcome: theme.emotionalAngles[1] || 'growth',
    audience: theme.audience?.replace('_', ' ') || 'everyone'
  };

  let title = fillTitleTemplate(template, values);

  // Ensure under 140 characters
  if (title.length > 140) {
    title = title.substring(0, 137) + '...';
  }

  return title;
}

/**
 * Generate description using templates (no AI)
 */
function generateTemplateDescription(
  theme: ThemeConfig,
  customHook?: string
): string {
  return buildDescription(theme.productType, customHook);
}

/**
 * Generate tags using templates (no AI)
 */
function generateTemplateTags(
  theme: ThemeConfig,
  includeSeasonal: boolean = false
): string[] {
  const themeTags = [...theme.primaryKeywords, ...theme.secondaryKeywords];
  return selectTags(theme.productType, themeTags, includeSeasonal, 13);
}

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Generate a complete listing for a theme
 */
export async function generateListing(
  theme: ThemeConfig,
  style?: StyleVariant,
  options: GeneratorOptions = {}
): Promise<GenerationResult> {
  const {
    useAI = true,
    variationIndex = 0,
    includeSeasonal = false,
    customHook
  } = options;

  try {
    let title: string;
    let description: string;
    let tags: string[];
    let totalTokens = 0;

    if (useAI) {
      // AI-enhanced generation
      console.log(`[ListingGenerator] Generating AI content for ${theme.id}...`);

      // Generate title
      const titleResult = await generateAITitle(theme, style);
      title = titleResult.title;
      totalTokens += titleResult.tokens;

      // Generate custom hook
      let hookToUse = customHook;
      if (!hookToUse) {
        const hookResult = await generateAIHook(theme);
        hookToUse = hookResult.hook;
        totalTokens += hookResult.tokens;
      }

      // Build description with AI hook
      description = buildDescription(theme.productType, hookToUse);

      // Generate base tags from templates
      const baseTags = generateTemplateTags(theme, includeSeasonal);

      // Enhance with AI tags
      const aiTagsResult = await generateAITags(theme, baseTags);
      totalTokens += aiTagsResult.tokens;

      // Combine and limit to 13 tags
      tags = [...baseTags, ...aiTagsResult.tags].slice(0, 13);

    } else {
      // Template-only generation
      console.log(`[ListingGenerator] Generating template content for ${theme.id}...`);

      title = generateTemplateTitle(theme, style);
      description = generateTemplateDescription(theme, customHook);
      tags = generateTemplateTags(theme, includeSeasonal);
    }

    // Determine price
    const price = theme.priceRange.default;

    // Create listing content
    const listingContent: ListingContent = {
      title,
      description,
      tags,
      price
    };

    // Generate content hash for uniqueness tracking
    const contentHash = generateContentHash(listingContent);

    // Create full generated listing
    const listing: GeneratedListing = {
      ...listingContent,
      productType: theme.productType,
      themeId: theme.id,
      styleId: style?.id,
      variationIndex,
      contentHash,
      generatedAt: new Date().toISOString()
    };

    console.log(`[ListingGenerator] Generated listing: "${title.substring(0, 50)}..."`);

    return {
      success: true,
      listing,
      tokensUsed: totalTokens
    };

  } catch (error) {
    const err = error as Error;
    console.error(`[ListingGenerator] Error generating listing for ${theme.id}:`, err.message);

    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Generate multiple variations for a theme
 */
export async function generateVariations(
  theme: ThemeConfig,
  style?: StyleVariant,
  count: number = 3,
  options: Omit<GeneratorOptions, 'variationIndex'> = {}
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];

  for (let i = 0; i < count; i++) {
    console.log(`[ListingGenerator] Generating variation ${i + 1}/${count} for ${theme.id}...`);

    const result = await generateListing(theme, style, {
      ...options,
      variationIndex: i
    });

    results.push(result);

    // Small delay between API calls to be respectful
    if (options.useAI !== false && i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Generate listings for a style across all themes of a product type
 */
export async function generateForStyle(
  productType: ProductType,
  style: StyleVariant,
  themes: ThemeConfig[],
  options: GeneratorOptions = {}
): Promise<GenerationResult[]> {
  const relevantThemes = themes.filter(t => t.productType === productType);
  const results: GenerationResult[] = [];

  console.log(`[ListingGenerator] Generating ${relevantThemes.length} listings for style ${style.id}...`);

  for (const theme of relevantThemes) {
    const result = await generateListing(theme, style, options);
    results.push(result);

    // Delay between themes
    if (options.useAI !== false) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return results;
}

/**
 * Batch generate listings with progress callback
 */
export async function batchGenerate(
  items: Array<{ theme: ThemeConfig; style?: StyleVariant }>,
  options: GeneratorOptions = {},
  onProgress?: (completed: number, total: number, current: GenerationResult) => void
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  const total = items.length;

  console.log(`[ListingGenerator] Starting batch generation of ${total} listings...`);

  for (let i = 0; i < items.length; i++) {
    const { theme, style } = items[i];

    const result = await generateListing(theme, style, {
      ...options,
      variationIndex: i
    });

    results.push(result);

    if (onProgress) {
      onProgress(i + 1, total, result);
    }

    // Delay between items
    if (options.useAI !== false && i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  const successful = results.filter(r => r.success).length;
  console.log(`[ListingGenerator] Batch complete: ${successful}/${total} successful`);

  return results;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  GeneratorOptions,
  GenerationResult,
  generateTemplateTitle,
  generateTemplateDescription,
  generateTemplateTags
};
