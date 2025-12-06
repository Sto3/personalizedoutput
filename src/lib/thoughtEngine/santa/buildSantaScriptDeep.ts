/**
 * Build Santa Script - Deep Personalization Version
 *
 * Generates richly personalized Santa messages using the deep questionnaire input.
 * This creates messages that make both parents and children say "wow."
 */

import {
  SantaQuestionnaireInput,
  SantaScenarioType,
  ProudMomentInput,
  inferPronouns,
  SCENARIO_CONTEXTS,
  validateSantaInput
} from '../configs/santa_questionnaire';
import { SantaScriptOutput, estimateSpeechDuration } from '../models/meaningModel';

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function buildSantaScriptDeep(
  input: SantaQuestionnaireInput
): Promise<SantaScriptOutput> {
  // Validate input
  const validation = validateSantaInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Build the rich prompt
  const prompt = buildDeepSantaPrompt(input);

  // Call LLM to generate script
  const script = await callLLMForSantaScript(prompt);

  // Calculate metrics
  const wordCount = script.split(/\s+/).length;
  const estimatedDuration = estimateSpeechDuration(script);

  return {
    script,
    childName: input.childFirstName,
    scenario: input.primaryScenario,
    wordCount,
    estimatedDurationSeconds: estimatedDuration
  };
}

// ============================================================
// PROMPT BUILDING
// ============================================================

function buildDeepSantaPrompt(input: SantaQuestionnaireInput): string {
  const pronouns = inferPronouns(input.childGender);
  const scenarioContext = SCENARIO_CONTEXTS[input.primaryScenario];
  const toneDescription = getToneDescription(input.tonePreference);

  return `You are Santa Claus creating a personalized 45-60 second voice message for a child.

IMPORTANT GUIDELINES:
- NO references to "magic" or "magical" (respects all beliefs)
- NO religious references (Christmas meaning differs by family)
- Focus on: kindness, effort, growth, courage, character
- Warm, genuine, grounded tone
- Make both the PARENT and CHILD feel this is truly personal

CHILD INFORMATION:
Name: ${input.childFirstName}
Age: ${input.childAge} years old
Gender: ${input.childGender}

THIS YEAR'S FOCUS: ${scenarioContext}

PROUD MOMENT #1:
What happened: ${input.proudMoment1.whatHappened}
How ${input.childFirstName} responded: ${input.proudMoment1.howChildResponded}
Why it mattered: ${input.proudMoment1.whyItMattered}
${input.proudMoment1.specificDetail ? `Vivid detail: ${input.proudMoment1.specificDetail}` : ''}

PROUD MOMENT #2:
What happened: ${input.proudMoment2.whatHappened}
How ${input.childFirstName} responded: ${input.proudMoment2.howChildResponded}
Why it mattered: ${input.proudMoment2.whyItMattered}
${input.proudMoment2.specificDetail ? `Vivid detail: ${input.proudMoment2.specificDetail}` : ''}

CHARACTER TRAITS: ${input.characterTraits.join(', ')}
WHERE THEY'VE GROWN: ${input.growthArea}
${input.challengeOvercome ? `CHALLENGE OVERCOME: ${input.challengeOvercome}` : ''}

WHAT THE PARENT MOST WANTS REINFORCED:
${input.whatParentWantsReinforced}

${input.anythingToAvoid ? `TOPICS TO AVOID: ${input.anythingToAvoid}` : ''}

TONE: ${toneDescription}

PRONOUNS: Use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive}

---

CRITICAL REQUIREMENTS:

1. USE SPECIFIC DETAILS from the proud moments - this is what makes it personal
2. Reference at least ONE vivid detail or quote if provided
3. Weave the parent's desired message naturally into Santa's words
4. Say ${input.childFirstName} 2-3 times naturally

ABSOLUTELY DO NOT:
- Use the word "magic" or "magical"
- Reference Jesus, God, or religious meaning of Christmas
- Make promises about gifts or what's under the tree
- Say anything that could pressure, guilt, or shame
- Mention anything the parent asked to avoid

STRUCTURE (120-180 words, ~45-60 seconds):

1. GREETING (15-20 words)
   - "Ho ho ho! Hello ${input.childFirstName}!" or similar
   - Brief warm opener

2. RECOGNITION - THE HEART OF THE MESSAGE (80-100 words)
   - Reference SPECIFIC details from the proud moments
   - Show you really KNOW this child
   - This should make the parent tear up
   - Be specific, not generic

3. CHARACTER AFFIRMATION (30-40 words)
   - Weave in the parent's desired message
   - Affirm who they are, not just what they did
   - Connect their traits to why they matter

4. WARM CLOSE (20-25 words)
   - Encouragement for the future (without pressure)
   - Warm sign-off
   - "Merry Christmas, ${input.childFirstName}"

---

Generate the script as plain text, exactly as Santa would speak it aloud.
Include natural pauses with "..." where appropriate.
Write numbers as words (e.g., "seven years old" not "7 years old").
Keep sentences flowing naturally for text-to-speech.`;
}

function getToneDescription(tone: string): string {
  switch (tone) {
    case 'warm_gentle':
      return 'Soft, comforting, like a warm hug. Slower pacing, tender delivery.';
    case 'cheerful':
      return 'Classic jolly Santa. Friendly, upbeat, balanced warmth.';
    case 'enthusiastic':
      return 'Excited, celebratory! More energy and exclamations, but still grounded.';
    default:
      return 'Warm and friendly, classic Santa tone.';
  }
}

// ============================================================
// LLM CALL
// ============================================================

async function callLLMForSantaScript(prompt: string): Promise<string> {
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
      max_tokens: 600,
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

  const data = await response.json() as { content: Array<{ text: string }> };
  let script = data.content[0].text;

  // Clean up the script
  script = cleanScript(script);

  return script;
}

function cleanScript(script: string): string {
  let cleaned = script
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();

  // Remove any preamble
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
// EXPORTS
// ============================================================

export { buildDeepSantaPrompt, getToneDescription };
