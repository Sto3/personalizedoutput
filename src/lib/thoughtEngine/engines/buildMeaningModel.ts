/**
 * Build Meaning Model
 *
 * Transforms UserInputPayload into a MeaningModel using rule-based processing
 * plus one LLM call for narrative synthesis (distilledSummary, emotionalWeather, opportunities).
 */

import {
  UserInputPayload,
  GoalInput,
  TensionInput,
  ThemeInput,
  LifeAreaId
} from '../models/userInput';
import { MeaningModel, createEmptyMeaningModel } from '../models/meaningModel';
import { ProductConfig } from '../models/productConfig';

// ============================================================
// LLM CLIENT INTERFACE (to be implemented with actual API)
// ============================================================

interface LLMResponse {
  distilledSummary: string;
  emotionalWeather: string;
  opportunities: string[];
}

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function buildMeaningModel(
  input: UserInputPayload,
  config: ProductConfig
): Promise<MeaningModel> {
  const model = createEmptyMeaningModel(input.productId);

  // 1. Extract key life areas (rule-based)
  model.keyLifeAreas = extractKeyLifeAreas(input);

  // 2. Prioritize top goals (rule-based)
  model.topGoals = prioritizeGoals(input.goals);

  // 3. Identify major tensions (rule-based)
  model.majorTensions = prioritizeTensions(input.tensions);

  // 4. Consolidate core themes (rule-based)
  model.coreThemes = consolidateThemes(input.themes, input.tensions);

  // 5. Copy constraints
  model.constraints = input.constraints;

  // 6. Copy timeframe
  model.timeframe = input.context.timeframe;

  // 7. LLM-assisted narrative synthesis
  const narrative = await synthesizeNarrative(input, model, config);
  model.distilledSummary = narrative.distilledSummary;
  model.emotionalWeather = narrative.emotionalWeather;
  model.opportunities = narrative.opportunities;

  return model;
}

// ============================================================
// RULE-BASED HELPERS
// ============================================================

function extractKeyLifeAreas(input: UserInputPayload): LifeAreaId[] {
  const areaCounts = new Map<LifeAreaId, number>();

  // Count from goals
  for (const goal of input.goals) {
    areaCounts.set(goal.lifeArea, (areaCounts.get(goal.lifeArea) || 0) + 1);
  }

  // Count from tensions (weighted more heavily)
  for (const tension of input.tensions) {
    areaCounts.set(tension.lifeArea, (areaCounts.get(tension.lifeArea) || 0) + 2);
  }

  // Always include primary life area
  areaCounts.set(
    input.context.primaryLifeArea,
    (areaCounts.get(input.context.primaryLifeArea) || 0) + 3
  );

  // Sort by count and return top areas
  const sorted = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area);

  return sorted.slice(0, 4);
}

function prioritizeGoals(goals: GoalInput[]): GoalInput[] {
  // Sort by importance, take top 5
  return [...goals]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);
}

function prioritizeTensions(tensions: TensionInput[]): TensionInput[] {
  // Sort by emotional intensity and frequency, take top 5
  return [...tensions]
    .sort((a, b) => {
      const scoreA = (a.emotionalIntensity || 3) + frequencyScore(a.frequency);
      const scoreB = (b.emotionalIntensity || 3) + frequencyScore(b.frequency);
      return scoreB - scoreA;
    })
    .slice(0, 5);
}

function frequencyScore(frequency?: string): number {
  const scores: Record<string, number> = {
    constant: 4,
    often: 3,
    sometimes: 2,
    rare: 1
  };
  return scores[frequency || 'sometimes'] || 2;
}

function consolidateThemes(themes: ThemeInput[], tensions: TensionInput[]): ThemeInput[] {
  const themeMap = new Map<string, ThemeInput>();

  // Add explicit themes
  for (const theme of themes) {
    const key = theme.label.toLowerCase();
    if (!themeMap.has(key)) {
      themeMap.set(key, theme);
    }
  }

  // Infer themes from tensions
  for (const tension of tensions) {
    const inferredThemes = inferThemesFromTension(tension);
    for (const inferred of inferredThemes) {
      const key = inferred.toLowerCase();
      if (!themeMap.has(key)) {
        themeMap.set(key, {
          id: `inferred_${key}`,
          label: inferred
        });
      }
    }
  }

  return [...themeMap.values()].slice(0, 6);
}

function inferThemesFromTension(tension: TensionInput): string[] {
  const themes: string[] = [];
  const desc = tension.description.toLowerCase();

  // Pattern matching for common themes
  if (desc.includes('boundary') || desc.includes('boundaries') || desc.includes('say no')) {
    themes.push('Boundaries');
  }
  if (desc.includes('guilt') || desc.includes('guilty') || desc.includes('should')) {
    themes.push('Guilt');
  }
  if (desc.includes('overwhelm') || desc.includes('too much') || desc.includes('overload')) {
    themes.push('Overload');
  }
  if (desc.includes('perfect') || desc.includes('enough') || desc.includes('failure')) {
    themes.push('Perfectionism');
  }
  if (desc.includes('please') || desc.includes('disappoint') || desc.includes('approval')) {
    themes.push('People-pleasing');
  }
  if (desc.includes('loss') || desc.includes('grief') || desc.includes('miss')) {
    themes.push('Grief');
  }
  if (desc.includes('money') || desc.includes('afford') || desc.includes('expense')) {
    themes.push('Financial stress');
  }
  if (desc.includes('time') || desc.includes('schedule') || desc.includes('busy')) {
    themes.push('Time pressure');
  }

  return themes;
}

// ============================================================
// LLM-ASSISTED NARRATIVE SYNTHESIS
// ============================================================

async function synthesizeNarrative(
  input: UserInputPayload,
  model: Partial<MeaningModel>,
  config: ProductConfig
): Promise<LLMResponse> {
  // Build context for LLM
  const contextPrompt = buildNarrativePrompt(input, model, config);

  // Call LLM (using Anthropic Claude)
  try {
    const response = await callLLMForNarrative(contextPrompt);
    return response;
  } catch (error) {
    console.error('LLM synthesis failed, using fallback:', error);
    return generateFallbackNarrative(input, model);
  }
}

function buildNarrativePrompt(
  input: UserInputPayload,
  model: Partial<MeaningModel>,
  config: ProductConfig
): string {
  const goalsText = model.topGoals?.map(g => `- ${g.label} (${g.lifeArea})`).join('\n') || 'None specified';
  const tensionsText = model.majorTensions?.map(t => `- ${t.description}`).join('\n') || 'None specified';
  const themesText = model.coreThemes?.map(t => t.label).join(', ') || 'None identified';
  const constraintsText = model.constraints?.map(c => `- ${c.label}`).join('\n') || 'None specified';

  const freeformText = input.freeformAnswers
    .filter(a => a.text.length > 20)
    .map(a => `${a.questionId}: "${a.text}"`)
    .join('\n');

  return `You are helping create a ${config.label} for someone.

THEIR SITUATION:

Primary focus: ${input.context.primaryLifeArea}
Timeframe: ${input.context.timeframe.label}

Goals:
${goalsText}

Tensions they're experiencing:
${tensionsText}

Themes that emerged: ${themesText}

Constraints they mentioned:
${constraintsText}

Their own words:
${freeformText || 'No additional details provided.'}

---

Based on this information, provide a JSON response with exactly these three fields:

1. "distilledSummary": A one-paragraph (3-5 sentences) snapshot of where this person is right now. Be specific to their situation. Don't use generic language. Mirror what they shared.

2. "emotionalWeather": A brief phrase (3-6 words) capturing their emotional state. Examples: "Overwhelmed but hopeful", "Torn between duty and self", "Exhausted yet determined", "Seeking peace amid chaos".

3. "opportunities": An array of 3-4 specific opportunities or spaces where they might have room to act or reflect. These should be concrete and based on what they shared, not generic advice.

IMPORTANT:
- Do NOT give advice or prescriptions
- Do NOT use therapy language or diagnose
- DO mirror their specific situation
- DO be concrete and specific to what they shared

Respond with ONLY valid JSON, no other text.`;
}

async function callLLMForNarrative(prompt: string): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON response
  try {
    const parsed = JSON.parse(text);
    return {
      distilledSummary: parsed.distilledSummary || '',
      emotionalWeather: parsed.emotionalWeather || '',
      opportunities: parsed.opportunities || []
    };
  } catch (e) {
    throw new Error('Failed to parse LLM response as JSON');
  }
}

function generateFallbackNarrative(
  input: UserInputPayload,
  model: Partial<MeaningModel>
): LLMResponse {
  const area = input.context.primaryLifeArea.replace('_', ' ');
  const timeframe = input.context.timeframe.label.toLowerCase();

  const goalCount = model.topGoals?.length || 0;
  const tensionCount = model.majorTensions?.length || 0;

  return {
    distilledSummary: `You're focusing on ${area} during ${timeframe}. You've identified ${goalCount} key goals and ${tensionCount} areas of tension. The themes that emerged suggest you're navigating some complex dynamics that deserve thoughtful attention.`,
    emotionalWeather: 'Seeking clarity',
    opportunities: [
      'Taking small, manageable steps',
      'Creating space for reflection',
      'Having honest conversations'
    ]
  };
}

// Export for testing
export { buildNarrativePrompt, generateFallbackNarrative };
