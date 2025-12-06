/**
 * Meaning Model
 *
 * Shared internal representation built from user inputs.
 * Can drive different outputs: planners, letters, vision boards, etc.
 */

import {
  LifeAreaId,
  GoalInput,
  TensionInput,
  ThemeInput,
  ConstraintInput,
  Timeframe,
  ProductId
} from './userInput';

// ============================================================
// MEANING MODEL
// ============================================================

export interface MeaningModel {
  productId: ProductId;
  keyLifeAreas: LifeAreaId[];
  topGoals: GoalInput[];
  majorTensions: TensionInput[];
  coreThemes: ThemeInput[];
  constraints: ConstraintInput[];
  timeframe: Timeframe;

  // Short narrative fragments, LLM-assisted:
  distilledSummary: string;     // One paragraph snapshot
  emotionalWeather: string;     // "Overwhelmed but hopeful", etc.
  opportunities: string[];      // Spaces where they might have room to act or reflect
}

// ============================================================
// SECTION OUTPUT (for planners)
// ============================================================

export interface SectionOutput {
  id: string;
  title: string;
  content: string;              // Rendered markdown or plain text
  subsections?: SubsectionOutput[];
}

export interface SubsectionOutput {
  id: string;
  title?: string;
  content: string;
}

// ============================================================
// PLANNER OUTPUT
// ============================================================

export interface PlannerOutput {
  productId: ProductId;
  title: string;
  subtitle?: string;
  generatedAt: string;          // ISO timestamp
  sections: SectionOutput[];
  meaningModel: MeaningModel;   // Keep for reference/debugging
}

// ============================================================
// SANTA SCRIPT OUTPUT
// ============================================================

export interface SantaScriptOutput {
  script: string;               // The 120-160 word message
  childName: string;
  scenario: string;
  wordCount: number;
  estimatedDurationSeconds: number;
}

export interface SantaMessageOutput {
  script: SantaScriptOutput;
  audioUrl?: string;            // URL to the generated MP3
  audioBuffer?: Buffer;         // Raw audio data (if not uploaded)
  generatedAt: string;
}

// ============================================================
// FACTORY HELPERS
// ============================================================

export function createEmptyMeaningModel(productId: ProductId): MeaningModel {
  return {
    productId,
    keyLifeAreas: [],
    topGoals: [],
    majorTensions: [],
    coreThemes: [],
    constraints: [],
    timeframe: {
      id: "holiday_season",
      label: "This holiday season"
    },
    distilledSummary: "",
    emotionalWeather: "",
    opportunities: []
  };
}

export function estimateSpeechDuration(text: string): number {
  // Average speaking rate: ~150 words per minute
  const wordCount = text.split(/\s+/).length;
  return Math.round((wordCount / 150) * 60);
}
