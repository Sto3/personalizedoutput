/**
 * Build Santa Script
 *
 * Generates a personalized 45-60 second Santa message script
 * based on parent-provided information about the child.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SantaMessageInput,
  SantaScenario,
  Pronouns,
  SantaEnergyLevel
} from '../models/userInput';
import { SantaScriptOutput, estimateSpeechDuration } from '../models/meaningModel';

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function buildSantaScript(
  input: SantaMessageInput
): Promise<SantaScriptOutput> {
  // Build prompt from template
  const prompt = buildSantaPrompt(input);

  // Call LLM to generate script
  const script = await callLLMForSantaScript(prompt, input);

  // Calculate metrics
  const wordCount = script.split(/\s+/).length;
  const estimatedDuration = estimateSpeechDuration(script);

  return {
    script,
    childName: input.childName,
    scenario: input.scenario,
    wordCount,
    estimatedDurationSeconds: estimatedDuration
  };
}

// ============================================================
// PROMPT BUILDING
// ============================================================

function buildSantaPrompt(input: SantaMessageInput): string {
  const pronouns = getPronounSet(input.pronouns);
  const scenarioGuidance = getScenarioGuidance(input.scenario);

  return `You are Santa Claus creating a personalized 45-60 second voice message for a child.

CHILD INFORMATION:
Name: ${input.childName}
${input.pronunciation ? `Pronunciation: ${input.pronunciation}` : ''}
Age: ${input.age}
Pronouns: ${input.pronouns} (${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
Scenario: ${formatScenario(input.scenario)}
${input.customScenario ? `Custom details: ${input.customScenario}` : ''}

WHAT THE PARENT SHARED:
Proud moment: ${input.proudMoment}
${input.encouragementNote ? `Something to gently encourage: ${input.encouragementNote}` : ''}

ENERGY LEVEL: ${input.energyLevel}
${getEnergyDescription(input.energyLevel)}

---

CRITICAL REQUIREMENTS:

TONE:
- Warm, kind, grounded
- NOT hyper or manic
- NOT over-the-top theatrical
- Encouraging but realistic
- Age-appropriate for a ${input.age}-year-old

MUST INCLUDE:
- Child's name (used 2-3 times naturally)
- Specific recognition of what the parent shared
- Acknowledgment tailored to their scenario
- Gentle encouragement for the future
- Warm sign-off

ABSOLUTELY NO:
- Medical, psychological, or supernatural promises
- "Your illness will go away" / "Everything will be fixed"
- Pressure, guilt, or shame
- "I'm disappointed" / "You need to do better"
- Promises about specific gifts
- Anything that could scare or worry the child

---

SCENARIO GUIDANCE:
${scenarioGuidance}

---

STRUCTURE (target: 120-160 words, ~45-60 seconds when spoken):

1. GREETING (15-25 words)
   - "Ho ho ho! Hello, ${input.childName}!" or similar
   - Brief warm opener

2. RECOGNITION (60-80 words)
   - Acknowledge their specific situation/accomplishment
   - Reference the specific details the parent shared
   - Make them feel truly seen

3. ENCOURAGEMENT (30-40 words)
   - Gentle forward-looking message
   ${input.encouragementNote ? '- Weave in the encouragement note naturally' : ''}
   - Keep it positive without pressure

4. CLOSING (15-25 words)
   - Warm sign-off
   - "Merry Christmas" or similar
   - "From your friend, Santa" type ending

---

Generate the script as plain text. Write it exactly as Santa would speak it aloud, including natural pauses indicated by "..." where appropriate.

Remember: This will be read by a text-to-speech system, so:
- Write numbers as words ("eight years old" not "8 years old")
${input.pronunciation ? `- The child's name "${input.childName}" is pronounced "${input.pronunciation}"` : ''}
- Keep sentences flowing naturally
- Avoid complex punctuation`;
}

function getPronounSet(pronouns: Pronouns): { subject: string; object: string; possessive: string } {
  switch (pronouns) {
    case 'he':
      return { subject: 'he', object: 'him', possessive: 'his' };
    case 'she':
      return { subject: 'she', object: 'her', possessive: 'her' };
    case 'they':
      return { subject: 'they', object: 'them', possessive: 'their' };
  }
}

function formatScenario(scenario: SantaScenario): string {
  const labels: Record<SantaScenario, string> = {
    overcoming_bullying: 'Overcoming bullying / standing up for themselves',
    improving_grades: 'Working hard in class / improving grades',
    tough_year: 'Being brave through a tough year',
    kindness_helpfulness: 'Being especially kind or helpful at home',
    bravery: 'Showing courage and bravery',
    custom: 'Custom scenario'
  };
  return labels[scenario] || scenario;
}

function getScenarioGuidance(scenario: SantaScenario): string {
  const guidance: Record<SantaScenario, string> = {
    overcoming_bullying: `Focus on: Their courage, standing up for themselves, the strength it takes to face difficult situations. Remind them they matter and deserve kindness. Emphasize that being kind to themselves and others is what truly matters.`,

    improving_grades: `Focus on: Their hard work and effort (not just results), the progress they've made, how proud Santa is of their dedication. Emphasize that trying hard and not giving up is what makes Santa's "nice list."`,

    tough_year: `Focus on: Their bravery through change, how strong they've been, that it's okay to have hard feelings, and that good things can still come. Be gentle and validating without minimizing what they went through.`,

    kindness_helpfulness: `Focus on: Specific acts of kindness, how helping others makes the world brighter, how Santa notices these things especially. Emphasize that kindness is the most magical thing of all.`,

    bravery: `Focus on: What made them brave, how courage isn't about not being scared but doing things anyway, how proud everyone is. Validate that being brave can be hard.`,

    custom: `Focus on: The specific details provided by the parent. Be warm and encouraging while staying grounded in reality.`
  };
  return guidance[scenario] || guidance.custom;
}

function getEnergyDescription(energy: SantaEnergyLevel): string {
  switch (energy) {
    case 'soft':
      return '- Warm, gentle, calm Santa. Speak softly and tenderly.';
    case 'cheerful':
      return '- Classic jolly Santa, balanced warmth. Friendly and upbeat but not over-the-top.';
    case 'very_upbeat':
      return '- Enthusiastic, excited Santa. More energy and exclamation, but still grounded.';
  }
}

// ============================================================
// LLM CALL
// ============================================================

async function callLLMForSantaScript(
  prompt: string,
  input: SantaMessageInput
): Promise<string> {
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
      max_tokens: 500,
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
  let script = data.content[0].text;

  // Clean up the script
  script = cleanScript(script);

  // Validate length
  const wordCount = script.split(/\s+/).length;
  if (wordCount < 100) {
    console.warn(`Santa script shorter than expected: ${wordCount} words`);
  } else if (wordCount > 200) {
    console.warn(`Santa script longer than expected: ${wordCount} words`);
  }

  return script;
}

function cleanScript(script: string): string {
  // Remove any markdown formatting
  let cleaned = script
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();

  // Remove any preamble like "Here's the script:"
  const preamblePatterns = [
    /^Here'?s?\s+(the\s+)?script:?\s*/i,
    /^The\s+script:?\s*/i,
    /^Santa'?s?\s+message:?\s*/i
  ];

  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

export {
  buildSantaPrompt,
  getPronounSet,
  formatScenario,
  getScenarioGuidance
};
