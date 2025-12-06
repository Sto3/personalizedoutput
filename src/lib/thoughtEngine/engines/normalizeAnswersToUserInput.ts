/**
 * Normalize Answers to User Input
 *
 * Converts raw form answers from front-end into the standardized UserInputPayload.
 * Each product may have different question flows, but they all normalize to the same structure.
 */

import {
  UserInputPayload,
  ProductId,
  GoalInput,
  TensionInput,
  ThemeInput,
  ConstraintInput,
  FreeformAnswer,
  LifeAreaId,
  TimeframeId,
  Timeframe,
  PreferenceInput,
  ImportanceLevel,
  IntensityLevel,
  FrequencyLevel
} from '../models/userInput';
import { getProductConfig } from '../models/productConfig';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// RAW ANSWER TYPES (from front-end)
// ============================================================

export interface RawAnswers {
  [key: string]: string | string[] | number | boolean | undefined;
}

// ============================================================
// NORMALIZER FUNCTION
// ============================================================

export function normalizeAnswersToUserInput(
  rawAnswers: RawAnswers,
  productId: ProductId,
  userId?: string
): UserInputPayload {
  const config = getProductConfig(productId);

  // Extract context
  const context = extractContext(rawAnswers, config.primaryLifeArea, config.defaultTimeframe);

  // Extract structured inputs
  const goals = extractGoals(rawAnswers);
  const tensions = extractTensions(rawAnswers);
  const themes = extractThemes(rawAnswers);
  const constraints = extractConstraints(rawAnswers);
  const preferences = extractPreferences(rawAnswers);
  const freeformAnswers = extractFreeformAnswers(rawAnswers);

  return {
    productId,
    userId,
    createdAtIso: new Date().toISOString(),
    context,
    goals,
    tensions,
    themes,
    constraints,
    preferences,
    freeformAnswers
  };
}

// ============================================================
// EXTRACTION HELPERS
// ============================================================

function extractContext(
  raw: RawAnswers,
  defaultLifeArea: LifeAreaId,
  defaultTimeframeId: TimeframeId
): { primaryLifeArea: LifeAreaId; timeframe: Timeframe; demographicsNotes?: string } {

  const primaryLifeArea = (raw.primary_life_area as LifeAreaId) || defaultLifeArea;

  const timeframeId = (raw.timeframe_id as TimeframeId) || defaultTimeframeId;
  const timeframe: Timeframe = {
    id: timeframeId,
    label: getTimeframeLabel(timeframeId),
    startDate: raw.timeframe_start as string | undefined,
    endDate: raw.timeframe_end as string | undefined,
    year: raw.timeframe_year as number | undefined
  };

  return {
    primaryLifeArea,
    timeframe,
    demographicsNotes: raw.demographics_notes as string | undefined
  };
}

function extractGoals(raw: RawAnswers): GoalInput[] {
  const goals: GoalInput[] = [];

  // Look for goal_* fields or goals array
  if (Array.isArray(raw.goals)) {
    for (const g of raw.goals as any[]) {
      goals.push({
        id: g.id || uuidv4(),
        lifeArea: g.life_area || g.lifeArea || 'other',
        label: g.label || g.text || '',
        importance: (g.importance || 3) as ImportanceLevel,
        timeframeId: g.timeframe_id || g.timeframeId
      });
    }
  }

  // Also check for numbered goals (goal_1, goal_2, etc.)
  for (let i = 1; i <= 10; i++) {
    const goalText = raw[`goal_${i}`] as string;
    if (goalText) {
      goals.push({
        id: uuidv4(),
        lifeArea: (raw[`goal_${i}_area`] as LifeAreaId) || 'other',
        label: goalText,
        importance: (raw[`goal_${i}_importance`] as ImportanceLevel) || 3
      });
    }
  }

  return goals;
}

function extractTensions(raw: RawAnswers): TensionInput[] {
  const tensions: TensionInput[] = [];

  if (Array.isArray(raw.tensions)) {
    for (const t of raw.tensions as any[]) {
      tensions.push({
        id: t.id || uuidv4(),
        lifeArea: t.life_area || t.lifeArea || 'other',
        description: t.description || t.text || '',
        frequency: t.frequency as FrequencyLevel | undefined,
        emotionalIntensity: t.emotional_intensity || t.emotionalIntensity as IntensityLevel | undefined
      });
    }
  }

  // Check for numbered tensions
  for (let i = 1; i <= 10; i++) {
    const tensionText = raw[`tension_${i}`] as string;
    if (tensionText) {
      tensions.push({
        id: uuidv4(),
        lifeArea: (raw[`tension_${i}_area`] as LifeAreaId) || 'relationship',
        description: tensionText,
        frequency: raw[`tension_${i}_frequency`] as FrequencyLevel | undefined,
        emotionalIntensity: raw[`tension_${i}_intensity`] as IntensityLevel | undefined
      });
    }
  }

  // Check for specific named tensions (common in holiday reset)
  const namedTensions = [
    'family_tension', 'partner_tension', 'inlaw_tension',
    'money_tension', 'time_tension', 'expectation_tension'
  ];

  for (const key of namedTensions) {
    const text = raw[key] as string;
    if (text) {
      tensions.push({
        id: uuidv4(),
        lifeArea: key.includes('family') || key.includes('inlaw') ? 'family' : 'relationship',
        description: text
      });
    }
  }

  return tensions;
}

function extractThemes(raw: RawAnswers): ThemeInput[] {
  const themes: ThemeInput[] = [];

  if (Array.isArray(raw.themes)) {
    for (const t of raw.themes as any[]) {
      themes.push({
        id: t.id || uuidv4(),
        label: t.label || t.text || '',
        userWords: t.user_words || t.userWords
      });
    }
  }

  // Check for selected themes (checkboxes)
  const selectedThemes = raw.selected_themes as string[] | undefined;
  if (selectedThemes) {
    for (const label of selectedThemes) {
      themes.push({
        id: uuidv4(),
        label
      });
    }
  }

  // Check for named theme fields
  const themeFields = [
    'boundaries_theme', 'guilt_theme', 'overload_theme',
    'perfectionism_theme', 'people_pleasing_theme', 'grief_theme'
  ];

  for (const key of themeFields) {
    if (raw[key]) {
      const label = key.replace('_theme', '').replace('_', ' ');
      themes.push({
        id: uuidv4(),
        label: label.charAt(0).toUpperCase() + label.slice(1),
        userWords: raw[`${key}_details`] as string | undefined
      });
    }
  }

  return themes;
}

function extractConstraints(raw: RawAnswers): ConstraintInput[] {
  const constraints: ConstraintInput[] = [];

  if (Array.isArray(raw.constraints)) {
    for (const c of raw.constraints as any[]) {
      constraints.push({
        id: c.id || uuidv4(),
        label: c.label || c.text || ''
      });
    }
  }

  // Check for common constraint fields
  const constraintFields = [
    'time_constraint', 'budget_constraint', 'energy_constraint',
    'travel_constraint', 'health_constraint'
  ];

  for (const key of constraintFields) {
    const text = raw[key] as string;
    if (text) {
      constraints.push({
        id: uuidv4(),
        label: text
      });
    }
  }

  return constraints;
}

function extractPreferences(raw: RawAnswers): PreferenceInput {
  return {
    tone: (raw.tone_preference || raw.tone) as 'gentle' | 'neutral' | 'direct' | undefined,
    spiritualLanguageOk: raw.spiritual_language_ok as boolean | undefined,
    profanityOk: raw.profanity_ok as boolean | undefined
  };
}

function extractFreeformAnswers(raw: RawAnswers): FreeformAnswer[] {
  const answers: FreeformAnswer[] = [];

  // Collect all string answers that aren't already processed
  const processedKeys = new Set([
    'primary_life_area', 'timeframe_id', 'timeframe_start', 'timeframe_end',
    'timeframe_year', 'demographics_notes', 'goals', 'tensions', 'themes',
    'constraints', 'selected_themes', 'tone_preference', 'tone',
    'spiritual_language_ok', 'profanity_ok'
  ]);

  for (const [key, value] of Object.entries(raw)) {
    if (processedKeys.has(key)) continue;
    if (key.startsWith('goal_')) continue;
    if (key.startsWith('tension_')) continue;
    if (key.endsWith('_theme')) continue;
    if (key.endsWith('_constraint')) continue;

    if (typeof value === 'string' && value.trim().length > 0) {
      answers.push({
        questionId: key,
        text: value
      });
    }
  }

  return answers;
}

function getTimeframeLabel(id: TimeframeId): string {
  const labels: Record<TimeframeId, string> = {
    holiday_season: "This holiday season",
    next_30_days: "The next 30 days",
    next_90_days: "The next 90 days",
    year_2025: "Year 2025",
    custom: "Custom timeframe"
  };
  return labels[id] || id;
}
