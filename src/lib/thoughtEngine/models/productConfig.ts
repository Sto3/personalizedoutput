/**
 * Product Configuration
 *
 * Each product (Holiday Reset, New Year Reset, Santa) is defined by a config.
 */

import { LifeAreaId, TimeframeId, ProductId } from './userInput';

// ============================================================
// TYPES
// ============================================================

export type ProductType = "planner" | "script" | "image" | "cards";

export interface SectionConfig {
  id: string;
  title: string;
  description?: string;         // Internal description for prompt context
  targetLengthTokens?: number;  // Rough guidance for LLM output
  required?: boolean;
}

export interface ProductConfig {
  id: ProductId;
  label: string;                // Human-readable name
  productType: ProductType;
  primaryLifeArea: LifeAreaId;
  defaultTimeframe: TimeframeId;
  sections: SectionConfig[];
  promptTemplateFile: string;   // Filename in /prompts
  pdfTemplateFile?: string;     // Filename in /pdfTemplates (planners only)
  targetSessionMinutes?: number;
  maxSessionMinutes?: number;
}

// ============================================================
// PRODUCT CONFIGS
// ============================================================

export const HOLIDAY_RELATIONSHIP_RESET: ProductConfig = {
  id: "holiday_relationship_reset",
  label: "Holiday Game Plan: Family, Mental Health & Peace",
  productType: "planner",
  primaryLifeArea: "family",
  defaultTimeframe: "holiday_season",
  targetSessionMinutes: 20,
  maxSessionMinutes: 30,
  promptTemplateFile: "holiday_relationship_reset.txt",
  pdfTemplateFile: "holiday_relationship_reset.html",
  sections: [
    {
      id: "snapshot",
      title: "Where You Are Right Now",
      description: "Organized recap of their situation, grouped into themes",
      targetLengthTokens: 400,
      required: true
    },
    {
      id: "themes_tensions",
      title: "Key Themes & Tensions",
      description: "Named tensions, trade-offs, mixed feelings, unspoken fears",
      targetLengthTokens: 500,
      required: true
    },
    {
      id: "wisdom",
      title: "Things to Consider",
      description: "Perspectives to consider, framed as options not instructions",
      targetLengthTokens: 600,
      required: true
    },
    {
      id: "action_plan",
      title: "Your Holiday Game Plan",
      description: "Scheduled steps: before/during/after holidays",
      targetLengthTokens: 700,
      required: true
    },
    {
      id: "closing",
      title: "A Note on Organizing Your Thoughts",
      description: "Brief framing about value of clarity, not therapy",
      targetLengthTokens: 200,
      required: true
    }
  ]
};

export const NEW_YEAR_REFLECTION_RESET: ProductConfig = {
  id: "new_year_reflection_reset",
  label: "New Year 2025 Reflection & Reset Planner",
  productType: "planner",
  primaryLifeArea: "self_discovery",
  defaultTimeframe: "year_2025",
  targetSessionMinutes: 20,
  maxSessionMinutes: 30,
  promptTemplateFile: "new_year_reflection_reset.txt",
  pdfTemplateFile: "new_year_reflection_reset.html",
  sections: [
    {
      id: "year_review",
      title: "Looking Back at 2024",
      description: "Reflection on the year that was",
      targetLengthTokens: 400,
      required: true
    },
    {
      id: "patterns",
      title: "Patterns & Realizations",
      description: "What emerged, what surprised, what became clear",
      targetLengthTokens: 500,
      required: true
    },
    {
      id: "intentions",
      title: "Intentions for 2025",
      description: "Not resolutions - intentions and directions",
      targetLengthTokens: 500,
      required: true
    },
    {
      id: "quarterly_focus",
      title: "Your Quarterly Focus",
      description: "Q1-Q4 breakdown of focus areas",
      targetLengthTokens: 600,
      required: true
    },
    {
      id: "closing",
      title: "Moving Forward with Clarity",
      description: "Brief encouraging close",
      targetLengthTokens: 200,
      required: true
    }
  ]
};

export const SANTA_MESSAGE: ProductConfig = {
  id: "santa_message",
  label: "Personalized Message from Santa",
  productType: "script",
  primaryLifeArea: "family",
  defaultTimeframe: "holiday_season",
  promptTemplateFile: "santa_message.txt",
  sections: [
    {
      id: "greeting",
      title: "Opening",
      description: "Warm greeting with child's name",
      targetLengthTokens: 30,
      required: true
    },
    {
      id: "recognition",
      title: "Recognition",
      description: "Acknowledge what they went through / accomplished",
      targetLengthTokens: 80,
      required: true
    },
    {
      id: "encouragement",
      title: "Encouragement",
      description: "Gentle encouragement for the future",
      targetLengthTokens: 50,
      required: true
    },
    {
      id: "closing",
      title: "Closing",
      description: "Warm sign-off from Santa",
      targetLengthTokens: 30,
      required: true
    }
  ]
};

// ============================================================
// VISION BOARD CONFIG
// ============================================================

export const VISION_BOARD: ProductConfig = {
  id: "vision_board",
  label: "AI-Powered Vision Board",
  productType: "image",
  primaryLifeArea: "self_discovery",
  defaultTimeframe: "year_2025",
  targetSessionMinutes: 15,
  maxSessionMinutes: 25,
  promptTemplateFile: "vision_board.txt",
  sections: [
    {
      id: "theme",
      title: "Board Theme",
      description: "Central theme or word for the vision board",
      required: true
    },
    {
      id: "goals",
      title: "Key Goals",
      description: "3-5 main goals to visualize",
      required: true
    },
    {
      id: "imagery",
      title: "Imagery & Colors",
      description: "Visual style preferences",
      required: false
    }
  ]
};

// ============================================================
// CLARITY PLANNER CONFIG
// ============================================================

export const CLARITY_PLANNER: ProductConfig = {
  id: "clarity_planner",
  label: "Guided Clarity Planner",
  productType: "planner",
  primaryLifeArea: "self_discovery",
  defaultTimeframe: "custom",
  targetSessionMinutes: 20,
  maxSessionMinutes: 30,
  promptTemplateFile: "clarity_planner.txt",
  pdfTemplateFile: "clarity_planner.html",
  sections: [
    {
      id: "landscape",
      title: "Understanding Your Landscape",
      description: "Current situation overview",
      targetLengthTokens: 400,
      required: true
    },
    {
      id: "emotional_terrain",
      title: "Emotional Terrain",
      description: "Feelings and emotional context",
      targetLengthTokens: 350,
      required: true
    },
    {
      id: "values_desires",
      title: "Values & Desires",
      description: "What matters most and what you want",
      targetLengthTokens: 400,
      required: true
    },
    {
      id: "obstacles_resources",
      title: "Obstacles & Resources",
      description: "What's in the way and what support exists",
      targetLengthTokens: 400,
      required: true
    },
    {
      id: "clarity_synthesis",
      title: "Your Path Forward",
      description: "Key insights and actionable next steps",
      targetLengthTokens: 500,
      required: true
    }
  ]
};

// ============================================================
// FLASH CARDS CONFIG
// ============================================================

export const FLASH_CARDS: ProductConfig = {
  id: "flash_cards",
  label: "Personalized Affirmation Flash Cards",
  productType: "cards",
  primaryLifeArea: "self_discovery",
  defaultTimeframe: "custom",
  targetSessionMinutes: 10,
  maxSessionMinutes: 15,
  promptTemplateFile: "flash_cards.txt",
  sections: [
    {
      id: "theme",
      title: "Card Theme",
      description: "Central theme for the affirmations",
      required: true
    },
    {
      id: "affirmations",
      title: "Affirmations",
      description: "10 personalized affirmation cards",
      required: true
    },
    {
      id: "reflection_prompts",
      title: "Reflection Prompts",
      description: "5 daily reflection questions",
      required: true
    }
  ]
};

// ============================================================
// CONFIG REGISTRY
// ============================================================

export const PRODUCT_CONFIGS: Record<ProductId, ProductConfig> = {
  holiday_relationship_reset: HOLIDAY_RELATIONSHIP_RESET,
  new_year_reflection_reset: NEW_YEAR_REFLECTION_RESET,
  santa_message: SANTA_MESSAGE,
  vision_board: VISION_BOARD,
  clarity_planner: CLARITY_PLANNER,
  flash_cards: FLASH_CARDS
};

export function getProductConfig(productId: ProductId): ProductConfig {
  const config = PRODUCT_CONFIGS[productId];
  if (!config) {
    throw new Error(`Unknown product: ${productId}`);
  }
  return config;
}
