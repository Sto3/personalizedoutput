/**
 * Product Chat Configuration
 *
 * Defines chat behavior for each product type.
 * Controls turn limits, system prompts, and generation targets.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

export type GenerationTarget =
  | 'santa_message'
  | 'planner_holiday_reset'
  | 'planner_new_year_reset';

export interface ProductChatConfig {
  id: string;
  displayName: string;
  maxTurns: number;
  minTurnsBeforeGeneration: number;
  systemPromptFile: string;
  generationTarget: GenerationTarget;
  openingContext: string; // Brief context for the opening message
}

// ============================================================
// CONFIGURATIONS
// ============================================================

const PRODUCT_CONFIGS: Record<string, ProductChatConfig> = {
  santa_message: {
    id: 'santa_message',
    displayName: 'Personalized Santa Message',
    maxTurns: 12, // 6 exchanges (user + assistant each)
    minTurnsBeforeGeneration: 6, // At least 3 exchanges
    systemPromptFile: 'chat_santa_guide.txt',
    generationTarget: 'santa_message',
    openingContext: 'helping a parent create a deeply personalized voice message from Santa for their child'
  },

  holiday_reset: {
    id: 'holiday_reset',
    displayName: 'Holiday Relationship Reset Planner',
    maxTurns: 16, // 8 exchanges
    minTurnsBeforeGeneration: 8, // At least 4 exchanges
    systemPromptFile: 'chat_holiday_reset_guide.txt',
    generationTarget: 'planner_holiday_reset',
    openingContext: 'helping someone navigate challenging family dynamics during the holidays'
  },

  new_year_reset: {
    id: 'new_year_reset',
    displayName: 'New Year Reflection & Reset Planner',
    maxTurns: 16, // 8 exchanges
    minTurnsBeforeGeneration: 8, // At least 4 exchanges
    systemPromptFile: 'chat_new_year_reset_guide.txt',
    generationTarget: 'planner_new_year_reset',
    openingContext: 'helping someone reflect on their year and set intentions for the year ahead'
  }
};

// ============================================================
// ACCESSOR FUNCTIONS
// ============================================================

/**
 * Get chat configuration for a product
 */
export function getProductChatConfig(productId: string): ProductChatConfig | null {
  return PRODUCT_CONFIGS[productId] || null;
}

/**
 * Get all available product configurations
 */
export function getAllProductConfigs(): ProductChatConfig[] {
  return Object.values(PRODUCT_CONFIGS);
}

/**
 * Load system prompt content from file
 */
export function loadSystemPrompt(config: ProductChatConfig): string {
  const promptPath = path.join(
    process.cwd(),
    'src',
    'lib',
    'thoughtEngine',
    'prompts',
    config.systemPromptFile
  );

  if (!fs.existsSync(promptPath)) {
    console.error(`[ProductChatConfig] System prompt not found: ${promptPath}`);
    throw new Error(`System prompt file not found: ${config.systemPromptFile}`);
  }

  return fs.readFileSync(promptPath, 'utf-8');
}

/**
 * Check if a session should start wrapping up
 */
export function shouldStartWrapUp(
  productId: string,
  turnCount: number
): boolean {
  const config = getProductChatConfig(productId);
  if (!config) return false;

  // Start wrapping up when we're 2 turns away from max
  return turnCount >= config.maxTurns - 2;
}

/**
 * Check if a session can generate (has enough turns)
 */
export function canGenerate(
  productId: string,
  turnCount: number
): boolean {
  const config = getProductChatConfig(productId);
  if (!config) return false;

  return turnCount >= config.minTurnsBeforeGeneration;
}

/**
 * Get product-specific wrap-up message
 */
export function getWrapUpMessage(productId: string): string {
  switch (productId) {
    case 'santa_message':
      return "I think I have a beautiful picture of your child now. When you're ready, I can create Santa's personalized message - it will weave in all the specific moments and qualities you've shared. Would you like me to create it now, or is there anything else you'd like to add?";

    case 'holiday_reset':
      return "I feel like I understand the heart of what you're navigating now. When you're ready, I can create your personalized Holiday Game Plan - it will address the specific dynamics and give you practical strategies for your situation. Shall I create it, or is there more you'd like to share?";

    case 'new_year_reset':
      return "Thank you for sharing so openly. I have a clear sense of your year and where you want to go. When you're ready, I can create your personalized Reflection & Reset Planner. It will honor everything you've shared and help you move into the new year with intention. Would you like me to create it now?";

    default:
      return "I think I understand what matters most to you. Would you like me to create your personalized output now, or is there anything else you'd like to add?";
  }
}

export { PRODUCT_CONFIGS };
