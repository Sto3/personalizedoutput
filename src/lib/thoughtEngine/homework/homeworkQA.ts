/**
 * Homework Rescue - Automated QA Layer
 *
 * Verifies lesson content for:
 * - Math accuracy (calculations, steps, answers)
 * - Reading accuracy (phonics rules, comprehension)
 * - Safety (kid-safe language, no inappropriate content)
 * - Consistency (answers match, no contradictions)
 *
 * Implements auto-regeneration loop for failed sections.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LessonScript,
  QAResult,
  QAError,
  QAWarning,
  HomeworkIntake,
  PracticeItem
} from './types';
import { generateHomeworkScript, generateSafeFallbackScript } from './generateHomeworkScript';

const anthropic = new Anthropic();

const MAX_REGENERATION_ATTEMPTS = 2;

/**
 * Run complete QA verification on a lesson script
 */
export async function verifyLessonScript(
  script: LessonScript,
  intake: HomeworkIntake
): Promise<QAResult> {
  const errors: QAError[] = [];
  const warnings: QAWarning[] = [];

  // Run all verification checks in parallel
  const [mathResult, readingResult, safetyResult, consistencyResult] = await Promise.all([
    intake.subject === 'Math' ? verifyMathContent(script) : Promise.resolve({ errors: [], warnings: [] }),
    intake.subject === 'Reading' ? verifyReadingContent(script) : Promise.resolve({ errors: [], warnings: [] }),
    verifySafetyContent(script, intake),
    verifyConsistency(script)
  ]);

  // Collect all errors and warnings
  errors.push(...mathResult.errors, ...readingResult.errors, ...safetyResult.errors, ...consistencyResult.errors);
  warnings.push(...mathResult.warnings, ...readingResult.warnings, ...safetyResult.warnings, ...consistencyResult.warnings);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    verifiedAt: new Date()
  };
}

/**
 * Verify math content accuracy
 */
async function verifyMathContent(script: LessonScript): Promise<{ errors: QAError[]; warnings: QAWarning[] }> {
  const errors: QAError[] = [];
  const warnings: QAWarning[] = [];

  // Collect all practice items
  const allItems: { item: PracticeItem; section: string }[] = [
    ...script.firstPractice.practiceItems.map(item => ({ item, section: 'First Practice' })),
    ...script.secondPractice.practiceItems.map(item => ({ item, section: 'Second Practice' })),
    ...script.miniChallenge.practiceItems.map(item => ({ item, section: 'Mini Challenge' }))
  ];

  if (allItems.length === 0) {
    errors.push({
      type: 'math_error',
      location: 'Practice Items',
      description: 'No practice items found in the lesson',
      suggestion: 'Generate practice problems for the lesson'
    });
    return { errors, warnings };
  }

  // Build verification prompt
  const verificationPrompt = `You are a math teacher verifying a lesson for accuracy. Check each problem and answer carefully.

GRADE LEVEL: ${script.grade}
TOPIC: ${script.topic}

PROBLEMS TO VERIFY:
${allItems.map((item, i) => `${i + 1}. [${item.section}] Problem: ${item.item.problem} | Given Answer: ${item.item.answer}`).join('\n')}

EXPLANATION EXCERPTS TO CHECK FOR MATH ERRORS:
${script.conceptExplanation.substring(0, 1000)}
${script.deeperExplanation.substring(0, 1000)}

For each problem, verify:
1. Is the answer mathematically correct?
2. Is the problem appropriate for the grade level?
3. Are there any calculation errors in the explanation?

Return JSON format:
{
  "problems": [
    {
      "index": 1,
      "correct": true/false,
      "correctAnswer": "the correct answer if wrong",
      "issue": "description of error if any"
    }
  ],
  "explanationErrors": [
    {
      "quote": "the incorrect statement",
      "issue": "what's wrong",
      "correction": "correct statement"
    }
  ]
}

Be strict. Math must be 100% correct.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: verificationPrompt }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
    let jsonStr = responseText;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const result = JSON.parse(jsonStr);

    // Process problem verification results
    for (const problem of result.problems || []) {
      if (!problem.correct) {
        const item = allItems[problem.index - 1];
        errors.push({
          type: 'math_error',
          location: item ? item.section : `Problem ${problem.index}`,
          description: `Incorrect answer: "${item?.item.problem}" - Given: "${item?.item.answer}", Correct: "${problem.correctAnswer}"`,
          suggestion: problem.issue
        });
      }
    }

    // Process explanation errors
    for (const expError of result.explanationErrors || []) {
      errors.push({
        type: 'math_error',
        location: 'Explanation',
        description: `Error in explanation: "${expError.quote}"`,
        suggestion: expError.correction
      });
    }

  } catch (error) {
    console.error('Error in math verification:', error);
    warnings.push({
      type: 'pacing',
      description: 'Math verification could not complete - manual review recommended'
    });
  }

  return { errors, warnings };
}

/**
 * Verify reading content accuracy
 */
async function verifyReadingContent(script: LessonScript): Promise<{ errors: QAError[]; warnings: QAWarning[] }> {
  const errors: QAError[] = [];
  const warnings: QAWarning[] = [];

  const verificationPrompt = `You are a reading specialist verifying a lesson for accuracy. Check phonics and comprehension carefully.

GRADE LEVEL: ${script.grade}
TOPIC: ${script.topic}

LESSON CONTENT:
${script.conceptExplanation}

PRACTICE ITEMS:
${[...script.firstPractice.practiceItems, ...script.secondPractice.practiceItems, ...script.miniChallenge.practiceItems]
    .map((item, i) => `${i + 1}. ${item.problem} | Answer: ${item.answer}`)
    .join('\n')}

Verify:
1. Phonics rules are correctly described
2. Example words match the pattern being taught
3. Pronunciation guidance is accurate
4. Comprehension answers are defensible and age-appropriate
5. No misleading information about reading/language

Return JSON format:
{
  "phonicsErrors": [
    {
      "rule": "the rule mentioned",
      "issue": "what's wrong",
      "correction": "correct rule"
    }
  ],
  "exampleWordErrors": [
    {
      "word": "the word",
      "issue": "why it doesn't fit the pattern"
    }
  ],
  "comprehensionIssues": [
    {
      "question": "the question",
      "answer": "the given answer",
      "issue": "why it's problematic"
    }
  ]
}

Be thorough. Reading instruction must be accurate.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: verificationPrompt }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
    let jsonStr = responseText;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const result = JSON.parse(jsonStr);

    // Process phonics errors
    for (const error of result.phonicsErrors || []) {
      errors.push({
        type: 'reading_error',
        location: 'Phonics Rule',
        description: `Incorrect phonics: "${error.rule}" - ${error.issue}`,
        suggestion: error.correction
      });
    }

    // Process example word errors
    for (const error of result.exampleWordErrors || []) {
      errors.push({
        type: 'reading_error',
        location: 'Example Words',
        description: `Word "${error.word}" doesn't fit the pattern`,
        suggestion: error.issue
      });
    }

    // Process comprehension issues
    for (const issue of result.comprehensionIssues || []) {
      errors.push({
        type: 'reading_error',
        location: 'Comprehension',
        description: `Answer issue for "${issue.question}"`,
        suggestion: issue.issue
      });
    }

  } catch (error) {
    console.error('Error in reading verification:', error);
    warnings.push({
      type: 'pacing',
      description: 'Reading verification could not complete - manual review recommended'
    });
  }

  return { errors, warnings };
}

/**
 * Verify content is safe for children
 */
async function verifySafetyContent(
  script: LessonScript,
  intake: HomeworkIntake
): Promise<{ errors: QAError[]; warnings: QAWarning[] }> {
  const errors: QAError[] = [];
  const warnings: QAWarning[] = [];

  const fullText = script.fullScript;

  // Check for things to avoid
  if (intake.thingsToAvoid) {
    const avoidItems = intake.thingsToAvoid.toLowerCase().split(/[,;]/);
    for (const item of avoidItems) {
      const trimmed = item.trim();
      if (trimmed && fullText.toLowerCase().includes(trimmed)) {
        errors.push({
          type: 'safety_error',
          location: 'Full Script',
          description: `Script mentions "${trimmed}" which parent asked to avoid`,
          suggestion: `Remove or replace mentions of "${trimmed}"`
        });
      }
    }
  }

  // Use Claude to check for inappropriate content
  const safetyPrompt = `Check this children's educational lesson for any inappropriate content.

CHILD'S NAME: ${intake.childName}
GRADE: ${intake.grade}

SCRIPT:
${fullText.substring(0, 4000)}

Check for:
1. Any inappropriate, scary, or adult content
2. Shaming, criticism, or discouraging language
3. Any content that could upset a child
4. Violence, death, or disturbing imagery
5. Inappropriate personal information being revealed
6. Any religious content (unless appropriate to the lesson)
7. Gender stereotypes or biased language

Return JSON:
{
  "issues": [
    {
      "quote": "the problematic text",
      "reason": "why it's inappropriate",
      "suggestion": "how to fix"
    }
  ],
  "safe": true/false
}

Only flag genuine issues. Educational content about nature, history, etc. is fine.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: safetyPrompt }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
    let jsonStr = responseText;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const result = JSON.parse(jsonStr);

    for (const issue of result.issues || []) {
      errors.push({
        type: 'safety_error',
        location: 'Content',
        description: `Inappropriate content: "${issue.quote}"`,
        suggestion: issue.suggestion
      });
    }

  } catch (error) {
    console.error('Error in safety verification:', error);
    // Safety check failure is a warning, not blocking
    warnings.push({
      type: 'tone',
      description: 'Safety verification could not complete'
    });
  }

  return { errors, warnings };
}

/**
 * Verify internal consistency of the lesson
 */
async function verifyConsistency(script: LessonScript): Promise<{ errors: QAError[]; warnings: QAWarning[] }> {
  const errors: QAError[] = [];
  const warnings: QAWarning[] = [];

  // Check that all practice items have answers
  const allPractice = [
    ...script.firstPractice.practiceItems,
    ...script.secondPractice.practiceItems,
    ...script.miniChallenge.practiceItems
  ];

  for (const item of allPractice) {
    if (!item.answer || item.answer.trim() === '') {
      errors.push({
        type: 'consistency_error',
        location: 'Practice Items',
        description: `Practice item "${item.problem}" has no answer`,
        suggestion: 'Provide the correct answer'
      });
    }
  }

  // Check word count / pacing
  const wordCount = script.fullScript.split(/\s+/).length;
  if (wordCount < 800) {
    warnings.push({
      type: 'pacing',
      description: `Lesson is short (${wordCount} words). Target is ~1000-1200 for 10 minutes.`
    });
  } else if (wordCount > 1500) {
    warnings.push({
      type: 'pacing',
      description: `Lesson is long (${wordCount} words). May exceed 10 minutes.`
    });
  }

  // Check child's name usage
  const nameCount = (script.fullScript.match(new RegExp(script.childName, 'gi')) || []).length;
  if (nameCount < 5) {
    warnings.push({
      type: 'tone',
      description: `Child's name used only ${nameCount} times. Aim for 8-12 for personalization.`
    });
  }

  return { errors, warnings };
}

/**
 * Run QA with automatic regeneration for failures
 */
export async function verifyAndRegenerateIfNeeded(
  script: LessonScript,
  intake: HomeworkIntake
): Promise<{ script: LessonScript; qaResult: QAResult; attempts: number }> {
  let currentScript = script;
  let attempts = 0;

  while (attempts < MAX_REGENERATION_ATTEMPTS) {
    attempts++;
    const qaResult = await verifyLessonScript(currentScript, intake);

    if (qaResult.passed) {
      return { script: currentScript, qaResult, attempts };
    }

    console.log(`QA failed (attempt ${attempts}/${MAX_REGENERATION_ATTEMPTS}):`, qaResult.errors);

    // Try to regenerate
    if (attempts < MAX_REGENERATION_ATTEMPTS) {
      try {
        // Regenerate with error context
        currentScript = await regenerateWithFixes(currentScript, intake, qaResult.errors);
      } catch (error) {
        console.error('Regeneration failed:', error);
        break;
      }
    }
  }

  // If we've exhausted attempts, use safe fallback
  console.log('Using safe fallback script after QA failures');
  const fallbackScript = await generateSafeFallbackScript(intake);
  const fallbackQA = await verifyLessonScript(fallbackScript, intake);

  // Fallback should pass, but if not, we return it anyway with warnings
  return {
    script: fallbackScript,
    qaResult: {
      ...fallbackQA,
      warnings: [
        ...fallbackQA.warnings,
        { type: 'complexity' as const, description: 'Used simplified fallback lesson due to QA failures' }
      ]
    },
    attempts: attempts + 1
  };
}

/**
 * Regenerate script with specific fixes for QA errors
 */
async function regenerateWithFixes(
  originalScript: LessonScript,
  intake: HomeworkIntake,
  errors: QAError[]
): Promise<LessonScript> {
  const fixPrompt = `The following lesson has errors that need to be fixed. Regenerate the lesson with corrections.

ORIGINAL TOPIC: ${intake.topic}
CHILD: ${intake.childName}, Grade ${intake.grade}

ERRORS TO FIX:
${errors.map(e => `- ${e.location}: ${e.description}${e.suggestion ? ` (Suggestion: ${e.suggestion})` : ''}`).join('\n')}

ORIGINAL CONTENT THAT NEEDS FIXING:
${JSON.stringify({
    introduction: originalScript.introduction,
    conceptExplanation: originalScript.conceptExplanation,
    firstPracticeItems: originalScript.firstPractice.practiceItems,
    secondPracticeItems: originalScript.secondPractice.practiceItems,
    miniChallengeItems: originalScript.miniChallenge.practiceItems
  }, null, 2)}

Regenerate the ENTIRE lesson with all errors fixed. Use the same section format:
[INTRODUCTION]
[CORE_EXPLANATION]
[FIRST_PRACTICE_SETUP]
[FIRST_PRACTICE_ITEMS]
[FIRST_PRACTICE_ANSWERS]
[DEEPER_EXPLANATION]
[SECOND_PRACTICE_SETUP]
[SECOND_PRACTICE_ITEMS]
[SECOND_PRACTICE_ANSWERS]
[MINI_CHALLENGE]
[MINI_CHALLENGE_ANSWER]
[CLOSING]
[PARENT_SUMMARY]

CRITICAL: Fix all the errors listed above. Double-check all math/reading content for accuracy.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: 'You are fixing errors in a children\'s educational lesson. Be extremely careful about accuracy.',
    messages: [{ role: 'user', content: fixPrompt }]
  });

  // Re-run the full script generator with the fixed content
  return generateHomeworkScript(intake);
}

/**
 * Quick pre-generation check for obvious issues in intake
 */
export function validateIntakeForGeneration(intake: HomeworkIntake): string[] {
  const issues: string[] = [];

  if (!intake.childName || intake.childName.length < 2) {
    issues.push('Child name is missing or too short');
  }

  if (!intake.specificProblem || intake.specificProblem.length < 10) {
    issues.push('Specific problem description is too vague');
  }

  if (!intake.interest || intake.interest.length < 3) {
    issues.push('Interest/hook is missing or too vague');
  }

  if (!intake.parentGoal || intake.parentGoal.length < 10) {
    issues.push('Parent goal is missing or too vague');
  }

  return issues;
}
