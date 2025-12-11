/**
 * Generate Sections
 *
 * Uses the MeaningModel and product-specific prompt templates to generate
 * the sections for planners via LLM.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MeaningModel, SectionOutput, PlannerOutput } from '../models/meaningModel';
import { ProductConfig } from '../models/productConfig';
import { UserInputPayload, FreeformAnswer } from '../models/userInput';

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function generateSections(
  meaningModel: MeaningModel,
  input: UserInputPayload,
  config: ProductConfig
): Promise<PlannerOutput> {

  // Load prompt template
  const promptTemplate = loadPromptTemplate(config.promptTemplateFile);

  // Build the full prompt with context
  const fullPrompt = buildFullPrompt(promptTemplate, meaningModel, input);

  // Call LLM to generate sections
  const sections = await callLLMForSections(fullPrompt, config);

  return {
    productId: config.id,
    title: config.label,
    generatedAt: new Date().toISOString(),
    sections,
    meaningModel
  };
}

// ============================================================
// PROMPT BUILDING
// ============================================================

function loadPromptTemplate(filename: string): string {
  const promptPath = path.join(__dirname, '..', 'prompts', filename);
  return fs.readFileSync(promptPath, 'utf-8');
}

function buildFullPrompt(
  template: string,
  meaningModel: MeaningModel,
  input: UserInputPayload
): string {
  // Serialize meaning model for the prompt
  const meaningModelText = serializeMeaningModel(meaningModel);
  const freeformText = serializeFreeformAnswers(input.freeformAnswers);

  // Replace placeholders
  let prompt = template
    .replace('{{meaningModel}}', meaningModelText)
    .replace('{{freeformAnswers}}', freeformText);

  return prompt;
}

function serializeMeaningModel(model: MeaningModel): string {
  const parts: string[] = [];

  parts.push(`Primary Focus: ${model.keyLifeAreas.join(', ')}`);
  parts.push(`Timeframe: ${model.timeframe.label}`);
  parts.push('');

  if (model.topGoals.length > 0) {
    parts.push('TOP GOALS:');
    for (const goal of model.topGoals) {
      parts.push(`- ${goal.label} (importance: ${goal.importance}/5, area: ${goal.lifeArea})`);
    }
    parts.push('');
  }

  if (model.majorTensions.length > 0) {
    parts.push('MAJOR TENSIONS:');
    for (const tension of model.majorTensions) {
      let line = `- ${tension.description}`;
      if (tension.frequency) line += ` (frequency: ${tension.frequency})`;
      if (tension.emotionalIntensity) line += ` (intensity: ${tension.emotionalIntensity}/5)`;
      parts.push(line);
    }
    parts.push('');
  }

  if (model.coreThemes.length > 0) {
    parts.push('CORE THEMES:');
    for (const theme of model.coreThemes) {
      let line = `- ${theme.label}`;
      if (theme.userWords) line += `: "${theme.userWords}"`;
      parts.push(line);
    }
    parts.push('');
  }

  if (model.constraints.length > 0) {
    parts.push('CONSTRAINTS:');
    for (const constraint of model.constraints) {
      parts.push(`- ${constraint.label}`);
    }
    parts.push('');
  }

  parts.push('DISTILLED SUMMARY:');
  parts.push(model.distilledSummary);
  parts.push('');

  parts.push(`EMOTIONAL WEATHER: ${model.emotionalWeather}`);
  parts.push('');

  if (model.opportunities.length > 0) {
    parts.push('OPPORTUNITIES IDENTIFIED:');
    for (const opp of model.opportunities) {
      parts.push(`- ${opp}`);
    }
  }

  return parts.join('\n');
}

function serializeFreeformAnswers(answers: FreeformAnswer[]): string {
  if (answers.length === 0) {
    return 'No additional freeform answers provided.';
  }

  return answers
    .filter(a => a.text.length > 10)
    .map(a => `${formatQuestionId(a.questionId)}: "${a.text}"`)
    .join('\n\n');
}

function formatQuestionId(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
// LLM CALL
// ============================================================

async function callLLMForSections(
  prompt: string,
  config: ProductConfig
): Promise<SectionOutput[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  // Estimate tokens needed based on sections
  const totalTargetTokens = config.sections.reduce(
    (sum, s) => sum + (s.targetLengthTokens || 300),
    0
  );
  const maxTokens = Math.min(totalTargetTokens * 2, 8000);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
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

  const data = await response.json() as any;
  const text = data.content[0].text;

  // Parse JSON response
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid response structure: missing sections array');
    }

    return parsed.sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content
    }));
  } catch (e) {
    console.error('Failed to parse LLM response:', e);
    console.error('Raw response:', text.substring(0, 500));

    // Return fallback sections
    return generateFallbackSections(config);
  }
}

function generateFallbackSections(config: ProductConfig): SectionOutput[] {
  return config.sections.map(section => ({
    id: section.id,
    title: section.title,
    content: `[This section could not be generated. Please try again or contact support.]\n\n${section.description || ''}`
  }));
}

// ============================================================
// UTILITY: Estimate cost
// ============================================================

export function estimatePlannerCost(config: ProductConfig): { inputTokens: number; outputTokens: number; estimatedCost: number } {
  // Rough estimates
  const inputTokens = 2000; // Prompt template + user context
  const outputTokens = config.sections.reduce(
    (sum, s) => sum + (s.targetLengthTokens || 300),
    0
  );

  // Claude Sonnet pricing (approximate)
  const inputCostPer1K = 0.003;
  const outputCostPer1K = 0.015;

  const estimatedCost = (inputTokens / 1000 * inputCostPer1K) + (outputTokens / 1000 * outputCostPer1K);

  return { inputTokens, outputTokens, estimatedCost };
}
