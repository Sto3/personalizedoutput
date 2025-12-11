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
  | 'planner_new_year_reset'
  | 'vision_board'
  | 'clarity_planner'
  | 'flash_cards';

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
  },

  vision_board: {
    id: 'vision_board',
    displayName: 'Personalized Vision Board',
    maxTurns: 14, // 7 exchanges (~7-10 minutes)
    minTurnsBeforeGeneration: 6, // At least 3 exchanges
    systemPromptFile: 'chat_vision_board_guide.txt',
    generationTarget: 'vision_board',
    openingContext: 'helping someone clarify their dreams and goals to create a personalized vision board'
  },

  clarity_planner: {
    id: 'clarity_planner',
    displayName: 'Guided Clarity Planner',
    maxTurns: 24, // 12 exchanges (~30 minutes of substantive conversation)
    minTurnsBeforeGeneration: 16, // At least 8 exchanges for depth
    systemPromptFile: 'chat_clarity_planner_guide.txt',
    generationTarget: 'clarity_planner',
    openingContext: 'helping someone gain clarity on any life situation - career, relationships, decisions, emotions, or direction'
  },

  flash_cards: {
    id: 'flash_cards',
    displayName: 'Custom Flash Cards for Your Child',
    maxTurns: 14, // 7 exchanges (~10-15 minutes)
    minTurnsBeforeGeneration: 8, // At least 4 exchanges to understand the child
    systemPromptFile: 'chat_flash_cards_guide.txt',
    generationTarget: 'flash_cards',
    openingContext: 'helping a parent create deeply personalized learning flash cards tailored to their child\'s specific needs, interests, and learning style'
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

    case 'vision_board':
      return "I have a beautiful picture of your vision now - your dreams, your aesthetic, and what you're manifesting. When you're ready, I can create your personalized vision board. It will reflect everything you've shared. Would you like me to create it now?";

    case 'clarity_planner':
      return "Thank you for sharing so openly and thoughtfully. I feel like I have a real sense of what you're navigating — the challenges, the hopes, and what clarity looks like for you. When you're ready, I can create your personalized Clarity Planner. It will include reflection prompts, action steps, and exercises tailored specifically to what you've shared today. Would you like me to create it now?";

    case 'flash_cards':
      return "I have such a clear picture of your child now — their personality, what they're working on, and how they learn best. When you're ready, I can create a custom flash card set designed specifically for them. These won't be generic cards — they'll use their interests, address exactly where they're struggling, and be written in a way that connects with how they think. Would you like me to create them now?";

    default:
      return "I think I understand what matters most to you. Would you like me to create your personalized output now, or is there anything else you'd like to add?";
  }
}

export { PRODUCT_CONFIGS };
