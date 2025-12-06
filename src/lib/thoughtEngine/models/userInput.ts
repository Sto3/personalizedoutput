/**
 * User Input Models
 *
 * Normalized structure for all Thought Engine products.
 * Front-end question flows vary per product but normalize into this structure.
 */

// ============================================================
// ENUMS & TYPE IDS
// ============================================================

export type TimeframeId =
  | "holiday_season"
  | "next_30_days"
  | "next_90_days"
  | "year_2025"
  | "custom";

export type LifeAreaId =
  | "relationship"
  | "family"
  | "career"
  | "health"
  | "money"
  | "creativity"
  | "home"
  | "friendships"
  | "self_discovery"
  | "other";

export type TonePreference = "gentle" | "neutral" | "direct";
export type FrequencyLevel = "rare" | "sometimes" | "often" | "constant";
export type ImportanceLevel = 1 | 2 | 3 | 4 | 5;
export type IntensityLevel = 1 | 2 | 3 | 4 | 5;

// ============================================================
// CORE INPUT INTERFACES
// ============================================================

export interface Timeframe {
  id: TimeframeId;
  label: string;        // e.g. "This holiday season"
  startDate?: string;   // ISO date string
  endDate?: string;     // ISO date string
  year?: number;
}

export interface GoalInput {
  id: string;
  lifeArea: LifeAreaId;
  label: string;        // user's wording
  importance: ImportanceLevel;
  timeframeId?: TimeframeId;
}

export interface TensionInput {
  id: string;
  lifeArea: LifeAreaId;
  description: string;  // "We keep fighting about chores with my mom"
  frequency?: FrequencyLevel;
  emotionalIntensity?: IntensityLevel;
}

export interface ThemeInput {
  id: string;
  label: string;        // "Boundaries", "Guilt", "Overload"
  userWords?: string;   // user's own description
}

export interface ConstraintInput {
  id: string;
  label: string;        // "I only have 1 free evening per week"
}

export interface PreferenceInput {
  tone?: TonePreference;
  spiritualLanguageOk?: boolean;
  profanityOk?: boolean;
}

export interface UserContext {
  primaryLifeArea: LifeAreaId;
  timeframe: Timeframe;
  demographicsNotes?: string;   // optional hint for tone; not identity-critical
}

export interface FreeformAnswer {
  questionId: string;
  text: string;
}

// ============================================================
// MAIN PAYLOAD
// ============================================================

export type ProductId =
  | "holiday_relationship_reset"
  | "new_year_reflection_reset"
  | "santa_message";

export interface UserInputPayload {
  productId: ProductId;
  userId?: string;
  createdAtIso: string;

  context: UserContext;
  goals: GoalInput[];
  tensions: TensionInput[];
  themes: ThemeInput[];
  constraints: ConstraintInput[];
  preferences: PreferenceInput;
  freeformAnswers: FreeformAnswer[];
}

// ============================================================
// SANTA-SPECIFIC INPUT (simplified subset)
// ============================================================

export type SantaScenario =
  | "overcoming_bullying"
  | "improving_grades"
  | "tough_year"
  | "kindness_helpfulness"
  | "bravery"
  | "custom";

export type SantaEnergyLevel = "soft" | "cheerful" | "very_upbeat";
export type Pronouns = "he" | "she" | "they";

export interface SantaMessageInput {
  childName: string;
  pronunciation?: string;       // optional pronunciation guide
  age: number;
  pronouns: Pronouns;
  scenario: SantaScenario;
  customScenario?: string;      // if scenario is "custom"
  proudMoment: string;          // "Describe something they did this year..."
  encouragementNote?: string;   // "Is there anything Santa should gently encourage..."
  energyLevel: SantaEnergyLevel;
}

// Helper to convert Santa input to UserInputPayload if needed
export function santaInputToPayload(santaInput: SantaMessageInput): UserInputPayload {
  return {
    productId: "santa_message",
    createdAtIso: new Date().toISOString(),
    context: {
      primaryLifeArea: "family",
      timeframe: {
        id: "holiday_season",
        label: "Holiday Season 2024"
      }
    },
    goals: [],
    tensions: [],
    themes: [{
      id: "santa_scenario",
      label: santaInput.scenario,
      userWords: santaInput.customScenario
    }],
    constraints: [],
    preferences: {
      tone: santaInput.energyLevel === "soft" ? "gentle" :
            santaInput.energyLevel === "very_upbeat" ? "direct" : "neutral"
    },
    freeformAnswers: [
      { questionId: "child_name", text: santaInput.childName },
      { questionId: "pronunciation", text: santaInput.pronunciation || "" },
      { questionId: "age", text: String(santaInput.age) },
      { questionId: "pronouns", text: santaInput.pronouns },
      { questionId: "proud_moment", text: santaInput.proudMoment },
      { questionId: "encouragement", text: santaInput.encouragementNote || "" }
    ]
  };
}
