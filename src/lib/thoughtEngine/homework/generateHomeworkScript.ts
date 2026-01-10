/**
 * Homework Rescue - Lesson Script Generator
 *
 * Creates deeply personalized 10-minute lesson scripts using Claude.
 * Each script includes:
 * - Interest-based introduction
 * - Core concept explanation with analogies
 * - Two pause-and-practice segments
 * - Mini challenge at the end
 * - Parent summary
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  HomeworkIntake,
  LessonScript,
  PracticeSegment,
  PracticeItem,
  ParentSummary,
  GradeLevel
} from './types';

const anthropic = new Anthropic();

// Age-appropriate word counts and pacing
const GRADE_PACING: Record<GradeLevel, {
  wordsPerMinute: number;
  maxSentenceLength: number;
  vocabularyLevel: string;
}> = {
  'K': { wordsPerMinute: 100, maxSentenceLength: 8, vocabularyLevel: 'very simple, concrete' },
  '1': { wordsPerMinute: 110, maxSentenceLength: 10, vocabularyLevel: 'simple, clear' },
  '2': { wordsPerMinute: 120, maxSentenceLength: 12, vocabularyLevel: 'simple but can include learning vocabulary' },
  '3': { wordsPerMinute: 130, maxSentenceLength: 15, vocabularyLevel: 'grade-appropriate with new terms explained' },
  '4': { wordsPerMinute: 140, maxSentenceLength: 18, vocabularyLevel: 'intermediate with context clues' },
  '5': { wordsPerMinute: 145, maxSentenceLength: 20, vocabularyLevel: 'intermediate to advanced' },
  '6': { wordsPerMinute: 150, maxSentenceLength: 22, vocabularyLevel: 'grade-level academic vocabulary' }
};

// Tone instructions
const TONE_INSTRUCTIONS: Record<string, string> = {
  enthusiastic: 'Be energetic and excited! Use phrases like "This is so cool!" and "You\'re going to love this!" Keep the energy high but not overwhelming.',
  calm: 'Be steady and patient. Use a soothing, measured pace. Phrases like "Let\'s take our time" and "No rush." Create a stress-free learning environment.',
  encouraging: 'Be warm and supportive. Celebrate every step. Use phrases like "You\'re doing great!" and "I believe in you!" Make them feel capable.',
  matter_of_fact: 'Be clear and direct. Focus on the content without excessive emotion. Professional but still warm. "Here\'s how this works..." style.'
};

/**
 * Generate a complete personalized lesson script
 */
export async function generateHomeworkScript(intake: HomeworkIntake): Promise<LessonScript> {
  const pacing = GRADE_PACING[intake.grade];
  const toneInstruction = TONE_INSTRUCTIONS[intake.tone] || TONE_INSTRUCTIONS.encouraging;

  // Calculate target word count for ~10 minutes
  const targetWordCount = pacing.wordsPerMinute * 10;

  const systemPrompt = buildSystemPrompt(intake, pacing, toneInstruction, targetWordCount);
  const userPrompt = buildUserPrompt(intake);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const scriptText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse the structured response
  const script = parseScriptResponse(scriptText, intake);

  return script;
}

/**
 * Build the system prompt for lesson generation
 */
function buildSystemPrompt(
  intake: HomeworkIntake,
  pacing: typeof GRADE_PACING[GradeLevel],
  toneInstruction: string,
  targetWordCount: number
): string {
  return `You are an expert tutor creating a personalized 10-minute video lesson for a child.

THE CHILD:
- Name: ${intake.childName}
- Grade: ${intake.grade}
- Subject: ${intake.subject}
- Topic: ${intake.topic}

THE STRUGGLE:
- Specific problem: ${intake.specificProblem}
- What happened when they tried: ${intake.whatHappened}
- Where they got stuck: ${intake.whereStuck}
${intake.additionalContext ? `- Additional context: ${intake.additionalContext}` : ''}

THE HOOK (USE THIS THROUGHOUT):
- ${intake.childName} loves: ${intake.interest}
- Why they love it: ${intake.whyLoveIt}

LEARNING STYLE: ${intake.learningStyle}
PARENT'S GOAL: ${intake.parentGoal}
${intake.thingsToAvoid ? `AVOID: ${intake.thingsToAvoid}` : ''}

TONE: ${toneInstruction}

PACING REQUIREMENTS:
- Target: ${targetWordCount} words total (~10 minutes at ${pacing.wordsPerMinute} words/minute)
- Max sentence length: ${pacing.maxSentenceLength} words
- Vocabulary level: ${pacing.vocabularyLevel}

CRITICAL RULES:
1. Use ${intake.childName}'s name naturally throughout (aim for 8-12 times total)
2. NEVER use pronouns - always use "they/them" or the child's name
3. Reference ${intake.interest} at least 3 times with real analogies
4. Include "..." pause markers for natural pacing (read aloud timing)
5. Include TWO pause-and-practice segments with clear "PAUSE HERE" markers
6. Include ONE mini challenge at the end
7. NEVER shame or criticize - always encourage
8. Use phrases like: "You're close", "Great thinking", "Let's try together"
9. Make every analogy specific to what they love about ${intake.interest}
10. Address their EXACT struggle point: ${intake.whereStuck}

STRUCTURE (with approximate timing):
1. INTRODUCTION (~1 min, ~100 words)
   - Greet ${intake.childName} by name
   - Hook with their interest
   - Preview what we'll learn

2. CORE EXPLANATION (~3 min, ~400 words)
   - Teach the concept using their interest as analogy
   - Break down the exact point where they got stuck
   - Use step-by-step explanation
   - Include "..." pauses for processing

3. FIRST PRACTICE (~2 min, ~200 words)
   - Set up the practice
   - Say "PAUSE HERE and try these problems"
   - List 2-3 practice items
   - After pause: walk through answers with encouragement

4. DEEPER EXPLANATION (~2 min, ~250 words)
   - Build on the concept
   - Address common mistakes
   - Use another analogy from their interest

5. SECOND PRACTICE (~1.5 min, ~150 words)
   - Another round of practice
   - Say "PAUSE HERE and try these"
   - 2 more practice items
   - Walk through with encouragement

6. MINI CHALLENGE (~0.5 min, ~50 words)
   - One slightly harder problem
   - "Here's a challenge for you, ${intake.childName}..."
   - Solution reveal

7. CLOSING (~30 sec, ~50 words)
   - Celebrate their progress
   - Remind them of key concept
   - Encouraging send-off

OUTPUT FORMAT:
Return a structured response with these clearly marked sections:
[INTRODUCTION]
(content)

[CORE_EXPLANATION]
(content)

[FIRST_PRACTICE_SETUP]
(content)

[FIRST_PRACTICE_ITEMS]
Problem 1: (problem text) | Answer: (answer) | Format: (text/equation/word_problem)
Problem 2: ...

[FIRST_PRACTICE_ANSWERS]
(content walking through answers)

[DEEPER_EXPLANATION]
(content)

[SECOND_PRACTICE_SETUP]
(content)

[SECOND_PRACTICE_ITEMS]
Problem 1: (problem text) | Answer: (answer) | Format: (text/equation/word_problem)
Problem 2: ...

[SECOND_PRACTICE_ANSWERS]
(content walking through answers)

[MINI_CHALLENGE]
Challenge: (problem) | Answer: (answer) | Format: (text/equation/word_problem)

[MINI_CHALLENGE_ANSWER]
(content revealing and explaining answer)

[CLOSING]
(content)

[PARENT_SUMMARY]
What we learned: (1-2 sentences)
Key concept: (1 sentence explaining the core concept simply)
How to reinforce: (3 bullet points)
Signs of progress: (2-3 bullet points)
Next steps: (optional, what to learn next)`;
}

/**
 * Build the user prompt for lesson generation
 */
function buildUserPrompt(intake: HomeworkIntake): string {
  return `Create a personalized ${intake.subject} lesson for ${intake.childName} (Grade ${intake.grade}) about ${intake.topic}.

SPECIFIC PROBLEM THEY STRUGGLED WITH:
${intake.specificProblem}

WHAT HAPPENED:
${intake.whatHappened}

WHERE THEY GOT STUCK:
${intake.whereStuck}

THEIR PASSION (${intake.interest}):
${intake.whyLoveIt}

Create the complete lesson script now, following the structure exactly.`;
}

/**
 * Parse the structured script response into LessonScript object
 */
function parseScriptResponse(text: string, intake: HomeworkIntake): LessonScript {
  const sections: Record<string, string> = {};

  // Extract each section
  const sectionRegex = /\[([A-Z_]+)\]\s*([\s\S]*?)(?=\[|$)/g;
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections[match[1]] = match[2].trim();
  }

  // Parse practice items
  const firstPracticeItems = parsePracticeItems(sections['FIRST_PRACTICE_ITEMS'] || '');
  const secondPracticeItems = parsePracticeItems(sections['SECOND_PRACTICE_ITEMS'] || '');
  const miniChallengeItem = parsePracticeItems(sections['MINI_CHALLENGE'] || '');

  // Build practice segments
  const firstPractice: PracticeSegment = {
    setup: sections['FIRST_PRACTICE_SETUP'] || '',
    pausePrompt: `Okay ${intake.childName}, it's your turn! Pause the video here and try these problems. Take your time - there's no rush. When you're ready, press play and we'll go through them together.`,
    practiceItems: firstPracticeItems,
    resumeScript: `Welcome back, ${intake.childName}! Let's see how you did.`,
    answerReveal: sections['FIRST_PRACTICE_ANSWERS'] || ''
  };

  const secondPractice: PracticeSegment = {
    setup: sections['SECOND_PRACTICE_SETUP'] || '',
    pausePrompt: `Time for more practice, ${intake.childName}! Pause here and give these a try. Remember what we just learned.`,
    practiceItems: secondPracticeItems,
    resumeScript: `Great job trying those! Let's check your answers.`,
    answerReveal: sections['SECOND_PRACTICE_ANSWERS'] || ''
  };

  const miniChallenge: PracticeSegment = {
    setup: `Now for a fun challenge, ${intake.childName}!`,
    pausePrompt: `This one's a bit trickier. Pause and see if you can figure it out!`,
    practiceItems: miniChallengeItem,
    resumeScript: `Ready to see the answer?`,
    answerReveal: sections['MINI_CHALLENGE_ANSWER'] || ''
  };

  // Parse parent summary
  const parentSummary = parseParentSummary(sections['PARENT_SUMMARY'] || '', intake);

  // Build full script for TTS
  const fullScript = buildFullScript(
    sections,
    intake,
    firstPractice,
    secondPractice,
    miniChallenge
  );

  // Count words
  const wordCount = fullScript.split(/\s+/).length;

  return {
    childName: intake.childName,
    grade: intake.grade,
    subject: intake.subject,
    topic: intake.topic,
    introduction: sections['INTRODUCTION'] || '',
    conceptExplanation: sections['CORE_EXPLANATION'] || '',
    firstPractice,
    deeperExplanation: sections['DEEPER_EXPLANATION'] || '',
    secondPractice,
    miniChallenge,
    closing: sections['CLOSING'] || '',
    parentSummary,
    fullScript,
    estimatedDuration: Math.round(wordCount / (GRADE_PACING[intake.grade].wordsPerMinute / 60)),
    wordCount
  };
}

/**
 * Parse practice items from text
 */
function parsePracticeItems(text: string): PracticeItem[] {
  const items: PracticeItem[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    // Try to parse format: "Problem 1: ... | Answer: ... | Format: ..."
    const match = line.match(/(?:Problem \d+:|Challenge:)\s*(.+?)\s*\|\s*Answer:\s*(.+?)\s*(?:\|\s*Format:\s*(\w+))?$/i);
    if (match) {
      items.push({
        problem: match[1].trim(),
        answer: match[2].trim(),
        displayFormat: (match[3]?.toLowerCase() as PracticeItem['displayFormat']) || 'text'
      });
    } else if (line.includes('|')) {
      // Simpler format
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        items.push({
          problem: parts[0].replace(/^Problem \d+:\s*|^Challenge:\s*/i, ''),
          answer: parts[1].replace(/^Answer:\s*/i, ''),
          displayFormat: 'text'
        });
      }
    }
  }

  return items;
}

/**
 * Parse parent summary from text
 */
function parseParentSummary(text: string, intake: HomeworkIntake): ParentSummary {
  const lines = text.split('\n');
  let whatWeLearned = '';
  let keyConceptExplained = '';
  const howToReinforce: string[] = [];
  const signsOfProgress: string[] = [];
  let nextSteps = '';

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().startsWith('what we learned:')) {
      currentSection = 'learned';
      whatWeLearned = trimmed.replace(/^what we learned:\s*/i, '');
    } else if (trimmed.toLowerCase().startsWith('key concept:')) {
      currentSection = 'concept';
      keyConceptExplained = trimmed.replace(/^key concept:\s*/i, '');
    } else if (trimmed.toLowerCase().startsWith('how to reinforce:')) {
      currentSection = 'reinforce';
    } else if (trimmed.toLowerCase().startsWith('signs of progress:')) {
      currentSection = 'progress';
    } else if (trimmed.toLowerCase().startsWith('next steps:')) {
      currentSection = 'next';
      nextSteps = trimmed.replace(/^next steps:\s*/i, '');
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
      const content = trimmed.replace(/^[-*]\s*|\d+\.\s*/, '');
      if (currentSection === 'reinforce') {
        howToReinforce.push(content);
      } else if (currentSection === 'progress') {
        signsOfProgress.push(content);
      }
    } else {
      // Continuation of current section
      if (currentSection === 'learned') whatWeLearned += ' ' + trimmed;
      else if (currentSection === 'concept') keyConceptExplained += ' ' + trimmed;
      else if (currentSection === 'next') nextSteps += ' ' + trimmed;
    }
  }

  // Defaults if parsing failed
  if (!whatWeLearned) {
    whatWeLearned = `${intake.childName} learned about ${intake.topic} in ${intake.subject}.`;
  }
  if (!keyConceptExplained) {
    keyConceptExplained = `The key concept was ${intake.topic}.`;
  }
  if (howToReinforce.length === 0) {
    howToReinforce.push(
      `Practice similar problems together`,
      `Look for ${intake.topic} in everyday situations`,
      `Celebrate small wins and progress`
    );
  }
  if (signsOfProgress.length === 0) {
    signsOfProgress.push(
      `${intake.childName} can explain the concept in their own words`,
      `They attempt problems without frustration`,
      `They catch their own mistakes`
    );
  }

  return {
    whatWeLearned: whatWeLearned.trim(),
    keyConceptExplained: keyConceptExplained.trim(),
    howToReinforce,
    signsOfProgress,
    nextSteps: nextSteps.trim() || undefined
  };
}

/**
 * Build the complete narration script for TTS
 */
function buildFullScript(
  sections: Record<string, string>,
  intake: HomeworkIntake,
  firstPractice: PracticeSegment,
  secondPractice: PracticeSegment,
  miniChallenge: PracticeSegment
): string {
  const parts: string[] = [];

  // Introduction
  parts.push(sections['INTRODUCTION'] || '');

  // Core explanation
  parts.push(sections['CORE_EXPLANATION'] || '');

  // First practice
  parts.push(firstPractice.setup);
  parts.push(firstPractice.pausePrompt);
  // Note: Visual will show practice items during pause
  parts.push('... ... ...'); // Pause marker for TTS
  parts.push(firstPractice.resumeScript);
  parts.push(firstPractice.answerReveal);

  // Deeper explanation
  parts.push(sections['DEEPER_EXPLANATION'] || '');

  // Second practice
  parts.push(secondPractice.setup);
  parts.push(secondPractice.pausePrompt);
  parts.push('... ... ...'); // Pause marker
  parts.push(secondPractice.resumeScript);
  parts.push(secondPractice.answerReveal);

  // Mini challenge
  parts.push(miniChallenge.setup);
  parts.push(miniChallenge.pausePrompt);
  parts.push('... ... ...'); // Pause marker
  parts.push(miniChallenge.resumeScript);
  parts.push(miniChallenge.answerReveal);

  // Closing
  parts.push(sections['CLOSING'] || '');

  return parts.filter(p => p).join('\n\n');
}

/**
 * Generate a safe fallback lesson when QA fails repeatedly
 */
export async function generateSafeFallbackScript(intake: HomeworkIntake): Promise<LessonScript> {
  // Use a simpler, verified approach for the topic
  const fallbackPrompt = `Create a simple, verified lesson about ${intake.topic} for Grade ${intake.grade}.

This is a FALLBACK lesson - keep it simple and correct.

CHILD: ${intake.childName} (use they/them, never pronouns)
INTEREST: ${intake.interest}

Create a basic but encouraging 8-minute lesson that:
1. Introduces the topic simply
2. Explains the core concept step-by-step
3. Includes 2 verified practice problems with CORRECT answers
4. Ends with encouragement

For ${intake.subject === 'Math' ? 'math, double-check all calculations' : 'reading, use only verified phonics rules'}.

Use the same output format with [SECTION] markers.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    system: 'You are creating a verified, simple lesson. Accuracy is critical. Keep it basic and correct.',
    messages: [{ role: 'user', content: fallbackPrompt }]
  });

  const scriptText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return parseScriptResponse(scriptText, intake);
}
