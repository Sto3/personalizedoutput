/**
 * Generate Holiday Reset Planner - Deep Personalization Version
 *
 * Takes the rich input from the deep questionnaire and generates
 * a deeply personalized planner that makes users feel truly heard.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HolidayResetQuestionnaireInput,
  validateHolidayResetInput,
  RELATIONSHIP_CONTEXTS,
  HOLIDAY_CONTEXTS
} from '../configs/holiday_reset_questionnaire';
import { PlannerOutput, SectionOutput } from '../models/meaningModel';

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function generateHolidayResetPlannerDeep(
  input: HolidayResetQuestionnaireInput
): Promise<PlannerOutput> {
  // Validate input
  const validation = validateHolidayResetInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Load and populate prompt template
  const prompt = buildHolidayResetPrompt(input);

  // Call LLM to generate sections
  const sections = await callLLMForPlannerSections(prompt);

  return {
    productId: 'holiday_relationship_reset',
    title: 'Your Holiday Game Plan',
    generatedAt: new Date().toISOString(),
    sections,
    meaningModel: {
      keyLifeAreas: ['relationships', 'family', 'mental_health'],
      timeframe: { label: 'Holiday Season', startDate: 'now', endDate: 'Jan 2' },
      topGoals: [{ label: 'Navigate holidays with peace', importance: 5, lifeArea: 'relationships' }],
      majorTensions: [{ description: input.coreTension.whatItLooksLike }],
      coreThemes: [
        { label: 'Family Dynamics', userWords: input.coreTension.withWhom },
        { label: 'Self-Protection', userWords: input.whatPeaceLooksLike }
      ],
      constraints: input.constraints.map(c => ({ label: `${c.type}: ${c.description}` })),
      distilledSummary: `Navigating ${RELATIONSHIP_CONTEXTS[input.primaryRelationship]} during the holidays, specifically ${HOLIDAY_CONTEXTS[input.holidayContext]}.`,
      emotionalWeather: input.coreTension.howItMakesYouFeel,
      opportunities: []
    }
  };
}

// ============================================================
// PROMPT BUILDING
// ============================================================

function buildHolidayResetPrompt(input: HolidayResetQuestionnaireInput): string {
  // Load template
  const templatePath = path.join(__dirname, '..', 'prompts', 'holiday_relationship_reset_deep.txt');
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Get contextual descriptions
  const relationshipContext = RELATIONSHIP_CONTEXTS[input.primaryRelationship];
  const holidayContext = HOLIDAY_CONTEXTS[input.holidayContext];

  // Replace all placeholders with actual values
  template = template
    // Basic info
    .replace(/\{\{firstName\}\}/g, 'Friend') // We don't collect firstName for this questionnaire
    .replace(/\{\{primaryRelationship\}\}/g, relationshipContext)
    .replace(/\{\{holidayContext\}\}/g, holidayContext)

    // Core tension
    .replace(/\{\{coreTension\.withWhom\}\}/g, input.coreTension.withWhom)
    .replace(/\{\{coreTension\.whatItLooksLike\}\}/g, input.coreTension.whatItLooksLike)
    .replace(/\{\{coreTension\.specificExample\}\}/g, input.coreTension.specificExample)
    .replace(/\{\{coreTension\.whatYouUsuallyDo\}\}/g, input.coreTension.whatYouUsuallyDo)
    .replace(/\{\{coreTension\.howItMakesYouFeel\}\}/g, input.coreTension.howItMakesYouFeel)
    .replace(/\{\{coreTension\.whatYouWishYouCouldSay\}\}/g, input.coreTension.whatYouWishYouCouldSay)

    // History
    .replace(/\{\{pastHolidayPattern\}\}/g, input.pastHolidayPattern)
    .replace(/\{\{lastYearSpecific\}\}/g, input.lastYearSpecific)
    .replace(/\{\{whatYouTriedBefore\}\}/g, input.whatYouTriedBefore)

    // Inner world
    .replace(/\{\{biggestFear\}\}/g, input.biggestFear)
    .replace(/\{\{secretHope\}\}/g, input.secretHope)
    .replace(/\{\{whatPeaceLooksLike\}\}/g, input.whatPeaceLooksLike)

    // Needs
    .replace(/\{\{whatYouNeedToHear\}\}/g, input.whatYouNeedToHear)

    // Preferences
    .replace(/\{\{tonePreference\}\}/g, input.tonePreference);

  // Handle optional fields
  if (input.coreTension.underlyingNeed) {
    template = template.replace(
      /\{\{#if coreTension\.underlyingNeed\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{coreTension\.underlyingNeed\}\}/g, input.coreTension.underlyingNeed)
    );
  } else {
    template = template.replace(/\{\{#if coreTension\.underlyingNeed\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (input.whyItDidntWork) {
    template = template.replace(
      /\{\{#if whyItDidntWork\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{whyItDidntWork\}\}/g, input.whyItDidntWork)
    );
  } else {
    template = template.replace(/\{\{#if whyItDidntWork\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (input.guiltyAbout) {
    template = template.replace(
      /\{\{#if guiltyAbout\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{guiltyAbout\}\}/g, input.guiltyAbout)
    );
  } else {
    template = template.replace(/\{\{#if guiltyAbout\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (input.whatYouNeedPermissionFor) {
    template = template.replace(
      /\{\{#if whatYouNeedPermissionFor\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{whatYouNeedPermissionFor\}\}/g, input.whatYouNeedPermissionFor)
    );
    template = template.replace(/\{\{whatYouNeedPermissionFor\}\}/g, input.whatYouNeedPermissionFor);
  } else {
    template = template.replace(/\{\{#if whatYouNeedPermissionFor\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    template = template.replace(/\{\{whatYouNeedPermissionFor\}\}/g, '');
  }

  if (input.boundaryYouWantToSet) {
    template = template.replace(
      /\{\{#if boundaryYouWantToSet\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{boundaryYouWantToSet\}\}/g, input.boundaryYouWantToSet)
    );
  } else {
    template = template.replace(/\{\{#if boundaryYouWantToSet\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle constraints array
  if (input.constraints && input.constraints.length > 0) {
    const constraintsText = input.constraints
      .map(c => `- ${c.type}: "${c.description}"`)
      .join('\n');
    template = template.replace(
      /\{\{#if constraints\}\}([\s\S]*?)\{\{#each constraints\}\}[\s\S]*?\{\{\/each\}\}[\s\S]*?\{\{\/if\}\}/g,
      `Their constraints:\n${constraintsText}`
    );
  } else {
    template = template.replace(/\{\{#if constraints\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle non-negotiables array
  if (input.nonNegotiables && input.nonNegotiables.length > 0) {
    const nonNegotiablesText = input.nonNegotiables
      .map(n => `- "${n}"`)
      .join('\n');
    template = template.replace(
      /\{\{#each nonNegotiables\}\}[\s\S]*?\{\{\/each\}\}/g,
      nonNegotiablesText
    );
  }

  // Handle flexible areas array
  if (input.flexibleAreas && input.flexibleAreas.length > 0) {
    const flexibleText = input.flexibleAreas
      .map(f => `- "${f}"`)
      .join('\n');
    template = template.replace(
      /\{\{#each flexibleAreas\}\}[\s\S]*?\{\{\/each\}\}/g,
      flexibleText
    );
  }

  // Spiritual language
  template = template.replace(
    /\{\{#if spiritualLanguageOk\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/g,
    input.spiritualLanguageOk ? '$1' : '$2'
  );

  return template;
}

// ============================================================
// LLM CALL
// ============================================================

async function callLLMForPlannerSections(prompt: string): Promise<SectionOutput[]> {
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
      max_tokens: 6000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid response structure: missing sections array');
    }

    return parsed.sections.map((s: { id: string; title: string; content: string }) => ({
      id: s.id,
      title: s.title,
      content: s.content
    }));
  } catch (e) {
    console.error('Failed to parse LLM response:', e);
    throw new Error('Failed to generate planner sections');
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { buildHolidayResetPrompt };
