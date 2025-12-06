/**
 * Generate New Year Reset Planner - Deep Personalization Version
 *
 * Takes the rich input from the deep questionnaire and generates
 * a deeply personalized reflection planner that honors their year.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  NewYearResetQuestionnaireInput,
  validateNewYearResetInput
} from '../configs/new_year_reset_questionnaire';
import { PlannerOutput, SectionOutput } from '../models/meaningModel';

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function generateNewYearResetPlannerDeep(
  input: NewYearResetQuestionnaireInput
): Promise<PlannerOutput> {
  // Validate input
  const validation = validateNewYearResetInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Load and populate prompt template
  const prompt = buildNewYearResetPrompt(input);

  // Call LLM to generate sections
  const sections = await callLLMForPlannerSections(prompt);

  return {
    productId: 'new_year_reflection_reset',
    title: `${input.firstName}'s 2025 Reflection & Reset`,
    generatedAt: new Date().toISOString(),
    sections,
    meaningModel: {
      keyLifeAreas: determineLifeAreas(input),
      timeframe: { label: '2025', startDate: 'Jan 1, 2025', endDate: 'Dec 31, 2025' },
      topGoals: [
        { label: input.oneWordForNextYear, importance: 5, lifeArea: 'personal' },
        { label: input.nonNegotiableChange, importance: 5, lifeArea: 'personal' }
      ],
      majorTensions: [
        { description: input.whatMightGetInWay }
      ],
      coreThemes: [
        { label: 'Year Word', userWords: input.oneWordForNextYear },
        { label: 'Desired Feeling', userWords: input.feelingYouWant },
        { label: 'Pattern Noticed', userWords: input.patternNoticed }
      ],
      constraints: [],
      distilledSummary: `${input.firstName} described 2024 as: ${input.yearOverview.threeWordsToDescribe.join(', ')}. Looking ahead to a year of ${input.oneWordForNextYear}.`,
      emotionalWeather: input.feelingYouWant,
      opportunities: [
        input.secretDream || 'Unstated dreams waiting to emerge'
      ]
    }
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function determineLifeAreas(input: NewYearResetQuestionnaireInput): string[] {
  const areas: string[] = ['personal'];

  if (input.healthIntention) areas.push('health');
  if (input.relationshipIntention) areas.push('relationships');
  if (input.careerIntention) areas.push('career');

  return areas;
}

// ============================================================
// PROMPT BUILDING
// ============================================================

function buildNewYearResetPrompt(input: NewYearResetQuestionnaireInput): string {
  // Load template
  const templatePath = path.join(__dirname, '..', 'prompts', 'new_year_reflection_reset_deep.txt');
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace all placeholders with actual values
  template = template
    // Basic info
    .replace(/\{\{firstName\}\}/g, input.firstName)
    .replace(/\{\{oneWordForNextYear\}\}/g, input.oneWordForNextYear)
    .replace(/\{\{oneWordForNextYear \| uppercase\}\}/g, input.oneWordForNextYear.toUpperCase())

    // Year overview
    .replace(/\{\{yearOverview\.threeWordsToDescribe\.\[0\]\}\}/g, input.yearOverview.threeWordsToDescribe[0])
    .replace(/\{\{yearOverview\.threeWordsToDescribe\.\[1\]\}\}/g, input.yearOverview.threeWordsToDescribe[1])
    .replace(/\{\{yearOverview\.threeWordsToDescribe\.\[2\]\}\}/g, input.yearOverview.threeWordsToDescribe[2])
    .replace(/\{\{yearOverview\.threeWordsToDescribe\}\}/g, input.yearOverview.threeWordsToDescribe.join(', '))
    .replace(/\{\{yearOverview\.biggestAccomplishment\}\}/g, input.yearOverview.biggestAccomplishment)
    .replace(/\{\{yearOverview\.biggestChallenge\}\}/g, input.yearOverview.biggestChallenge)
    .replace(/\{\{yearOverview\.unexpectedJoy\}\}/g, input.yearOverview.unexpectedJoy)

    // Significant moments
    .replace(/\{\{significantMoment1\.whatHappened\}\}/g, input.significantMoment1.whatHappened)
    .replace(/\{\{significantMoment1\.whyItMattered\}\}/g, input.significantMoment1.whyItMattered)
    .replace(/\{\{significantMoment1\.howItChangedYou\}\}/g, input.significantMoment1.howItChangedYou)
    .replace(/\{\{significantMoment1\.whatYouWantToRemember\}\}/g, input.significantMoment1.whatYouWantToRemember)
    .replace(/\{\{significantMoment2\.whatHappened\}\}/g, input.significantMoment2.whatHappened)
    .replace(/\{\{significantMoment2\.whyItMattered\}\}/g, input.significantMoment2.whyItMattered)
    .replace(/\{\{significantMoment2\.howItChangedYou\}\}/g, input.significantMoment2.howItChangedYou)
    .replace(/\{\{significantMoment2\.whatYouWantToRemember\}\}/g, input.significantMoment2.whatYouWantToRemember)

    // What they learned
    .replace(/\{\{surprisedYou\}\}/g, input.surprisedYou)
    .replace(/\{\{strengthDiscovered\}\}/g, input.strengthDiscovered)
    .replace(/\{\{patternNoticed\}\}/g, input.patternNoticed)

    // Unfinished business
    .replace(/\{\{letGoOf\}\}/g, input.letGoOf)

    // Looking forward
    .replace(/\{\{feelingYouWant\}\}/g, input.feelingYouWant)
    .replace(/\{\{nonNegotiableChange\}\}/g, input.nonNegotiableChange)

    // Practical
    .replace(/\{\{whatMightGetInWay\}\}/g, input.whatMightGetInWay)
    .replace(/\{\{supportNeeded\}\}/g, input.supportNeeded)

    // Preferences
    .replace(/\{\{tonePreference\}\}/g, input.tonePreference);

  // Handle optional year overview fields
  if (input.yearOverview.unexpectedLoss) {
    template = template.replace(
      /\{\{#if yearOverview\.unexpectedLoss\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{yearOverview\.unexpectedLoss\}\}/g, input.yearOverview.unexpectedLoss)
    );
  } else {
    template = template.replace(/\{\{#if yearOverview\.unexpectedLoss\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle difficult moment (optional section)
  if (input.difficultMoment) {
    template = template.replace(
      /\{\{#if difficultMoment\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, content) => {
        return content
          .replace(/\{\{difficultMoment\.whatHappened\}\}/g, input.difficultMoment!.whatHappened)
          .replace(/\{\{difficultMoment\.howYouGotThrough\}\}/g, input.difficultMoment!.howYouGotThrough)
          .replace(/\{\{difficultMoment\.whatYouLearned\}\}/g, input.difficultMoment!.whatYouLearned)
          .replace(/\{\{#if difficultMoment\.stillProcessing\}\}([\s\S]*?)\{\{\/if\}\}/g,
            input.difficultMoment!.stillProcessing
              ? `$1`.replace(/\{\{difficultMoment\.stillProcessing\}\}/g, input.difficultMoment!.stillProcessing!)
              : ''
          );
      }
    );
  } else {
    template = template.replace(/\{\{#if difficultMoment\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle optional what they learned fields
  if (input.relationshipInsight) {
    template = template.replace(
      /\{\{#if relationshipInsight\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{relationshipInsight\}\}/g, input.relationshipInsight)
    );
  } else {
    template = template.replace(/\{\{#if relationshipInsight\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle optional unfinished business fields
  if (input.forgiveYourself) {
    template = template.replace(
      /\{\{#if forgiveYourself\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{forgiveYourself\}\}/g, input.forgiveYourself)
    );
  } else {
    template = template.replace(/\{\{#if forgiveYourself\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (input.conversationNeeded) {
    template = template.replace(
      /\{\{#if conversationNeeded\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{conversationNeeded\}\}/g, input.conversationNeeded)
    );
  } else {
    template = template.replace(/\{\{#if conversationNeeded\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (input.unfinishedProject) {
    template = template.replace(
      /\{\{#if unfinishedProject\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{unfinishedProject\}\}/g, input.unfinishedProject)
    );
  } else {
    template = template.replace(/\{\{#if unfinishedProject\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle secret dream
  if (input.secretDream) {
    template = template.replace(
      /\{\{#if secretDream\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{secretDream\}\}/g, input.secretDream)
    );
  } else {
    template = template.replace(/\{\{#if secretDream\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle optional intentions
  const intentionReplacements = [
    { field: 'healthIntention', value: input.healthIntention },
    { field: 'relationshipIntention', value: input.relationshipIntention },
    { field: 'careerIntention', value: input.careerIntention },
    { field: 'personalIntention', value: input.personalIntention }
  ];

  for (const { field, value } of intentionReplacements) {
    if (value) {
      template = template.replace(
        new RegExp(`\\{\\{#if ${field}\\}\\}([\\s\\S]*?)\\{\\{/${field}\\}\\}\\{\\{/if\\}\\}`, 'g'),
        `$1`.replace(new RegExp(`\\{\\{${field}\\}\\}`, 'g'), value)
      );
      template = template.replace(new RegExp(`\\{\\{${field}\\}\\}`, 'g'), value);
    } else {
      template = template.replace(new RegExp(`\\{\\{#if ${field}\\}\\}[\\s\\S]*?\\{\\{/if\\}\\}`, 'g'), '');
    }
  }

  // Handle quarterly breakdown
  if (input.includeQuarterlyBreakdown) {
    template = template.replace(
      /\{\{#if includeQuarterlyBreakdown\}\}([\s\S]*?)\{\{\/if\}\}/g,
      '$1'
    );
  } else {
    template = template.replace(/\{\{#if includeQuarterlyBreakdown\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

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
      max_tokens: 8000,
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

export { buildNewYearResetPrompt };
