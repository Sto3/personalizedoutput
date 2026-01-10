/**
 * Homework Rescue - Multi-Turn Personalization Experience
 *
 * This is NOT a form. It's an intelligent conversation that adapts
 * based on what the parent tells us, continuing until we have
 * everything needed to create a truly personalized lesson.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  GradeLevel,
  Subject,
  LearningStyle,
  TonePreference,
  MATH_TOPICS,
  READING_TOPICS,
  HomeworkIntake
} from './types';

const anthropic = new Anthropic();

// Conversation state tracking
export interface ConversationState {
  sessionId: string;
  currentPhase: ConversationPhase;
  collectedData: Partial<HomeworkIntake>;
  messageHistory: ConversationMessage[];
  diagnosisAttempts: number;
  isComplete: boolean;
}

export interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export type ConversationPhase =
  | 'greeting'
  | 'basic_info'
  | 'specific_struggle'
  | 'diagnosis_confirmation'
  | 'interest_discovery'
  | 'learning_preferences'
  | 'goals_and_tone'
  | 'final_confirmation'
  | 'complete';

/**
 * System prompt for the personalization conversation
 */
const PERSONALIZATION_SYSTEM_PROMPT = `You are a warm, expert tutor helping a parent describe their child's homework struggle so we can create a perfectly personalized lesson video.

YOUR ROLE:
- You're having a conversation to deeply understand the child's specific challenge
- You ask smart follow-up questions based on what they tell you
- You never rush - you keep asking until you truly understand
- You reflect back what you've heard to confirm understanding
- You're warm, professional, and reassuring

CONVERSATION FLOW:
1. GREETING: Warm welcome, ask child's name and grade
2. BASIC INFO: Get subject (Math or Reading), specific topic
3. SPECIFIC STRUGGLE: Get the EXACT problem they struggled with
   - Ask them to paste or describe the actual problem
   - Ask what happened when they tried it
   - Ask where exactly they got stuck
4. DIAGNOSIS CONFIRMATION: Summarize what you understand
   - "It sounds like the tricky part for [name] is ___, especially when ___"
   - Ask if that's accurate or if you missed something
   - If they say "not quite," ask more questions
5. INTEREST DISCOVERY: What does the child LOVE?
   - Ask what they're passionate about
   - Ask why they love it (this gives us rich material)
6. LEARNING PREFERENCES: How do they learn best?
   - Visual, auditory, hands-on, stories?
   - What have they already tried?
7. GOALS & TONE: What does the parent want?
   - What should the child understand after watching?
   - What tone works best (enthusiastic, calm, encouraging)?
   - Anything to avoid?
8. FINAL CONFIRMATION: Quick summary of everything

CRITICAL RULES:
- NEVER proceed to the next phase until you have what you need
- Always use the child's name naturally in your responses
- Never use pronouns - use "they/them" or the child's name
- Be encouraging: "That's really helpful" not just "ok"
- If something is unclear, ask a clarifying question
- Keep responses concise but warm (2-4 sentences usually)
- After diagnosis, ALWAYS ask "Is that accurate, or did I miss something?"

REQUIRED DATA (must have before completing):
- Child's first name
- Grade level (K-6)
- Subject (Math or Reading)
- Specific topic
- The actual problem they struggled with
- What happened when they tried
- Where exactly they got stuck
- Confirmed diagnosis
- What the child loves (interest hook)
- Why they love it
- Learning style preference
- What parent wants them to understand
- Preferred tone

RESPONSE FORMAT:
Always respond with ONLY the next message to the parent. No explanations, no metadata.
Be conversational and natural.`;

/**
 * Generate the next message in the personalization conversation
 */
export async function generateNextMessage(
  state: ConversationState,
  userMessage?: string
): Promise<{ message: string; updatedState: ConversationState }> {
  // Add user message to history if provided
  if (userMessage) {
    state.messageHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
  }

  // Build the conversation for Claude
  const messages = state.messageHistory.map(m => ({
    role: m.role as 'assistant' | 'user',
    content: m.content
  }));

  // Add context about what we still need
  const contextPrompt = buildContextPrompt(state);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: PERSONALIZATION_SYSTEM_PROMPT + '\n\n' + contextPrompt,
    messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Start the conversation' }]
  });

  const assistantMessage = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Update state with assistant message
  state.messageHistory.push({
    role: 'assistant',
    content: assistantMessage,
    timestamp: new Date()
  });

  // Extract any data from the conversation
  if (userMessage) {
    await extractDataFromConversation(state, userMessage);
  }

  // Update phase based on collected data
  updatePhase(state);

  return { message: assistantMessage, updatedState: state };
}

/**
 * Build context prompt about what data we still need
 */
function buildContextPrompt(state: ConversationState): string {
  const data = state.collectedData;
  const missing: string[] = [];
  const collected: string[] = [];

  // Check what we have
  if (data.childName) collected.push(`Child's name: ${data.childName}`);
  else missing.push('child\'s name');

  if (data.grade) collected.push(`Grade: ${data.grade}`);
  else missing.push('grade level');

  if (data.subject) collected.push(`Subject: ${data.subject}`);
  else missing.push('subject (Math or Reading)');

  if (data.topic) collected.push(`Topic: ${data.topic}`);
  else if (data.subject) missing.push('specific topic within ' + data.subject);

  if (data.specificProblem) collected.push(`Specific problem: ${data.specificProblem}`);
  else if (data.topic) missing.push('the specific problem they struggled with');

  if (data.whatHappened) collected.push(`What happened: ${data.whatHappened}`);
  else if (data.specificProblem) missing.push('what happened when they tried it');

  if (data.whereStuck) collected.push(`Where stuck: ${data.whereStuck}`);
  else if (data.whatHappened) missing.push('where exactly they got stuck');

  if (data.diagnosisConfirmed) collected.push('Diagnosis confirmed');
  else if (data.whereStuck) missing.push('confirmation of our diagnosis');

  if (data.interest) collected.push(`Interest: ${data.interest}`);
  else if (data.diagnosisConfirmed) missing.push('what the child loves');

  if (data.whyLoveIt) collected.push(`Why they love it: ${data.whyLoveIt}`);
  else if (data.interest) missing.push('why they love ' + (data.interest || 'it'));

  if (data.learningStyle) collected.push(`Learning style: ${data.learningStyle}`);
  else if (data.whyLoveIt) missing.push('learning style preference');

  if (data.parentGoal) collected.push(`Parent goal: ${data.parentGoal}`);
  else if (data.learningStyle) missing.push('what parent wants child to understand');

  if (data.tone) collected.push(`Tone: ${data.tone}`);
  else if (data.parentGoal) missing.push('preferred tone');

  let context = `CURRENT CONVERSATION STATE:
Phase: ${state.currentPhase}

DATA COLLECTED:
${collected.length > 0 ? collected.join('\n') : 'None yet'}

STILL NEEDED:
${missing.length > 0 ? missing.join('\n') : 'All required data collected!'}`;

  if (state.currentPhase === 'diagnosis_confirmation') {
    context += `\n\nIMPORTANT: You must now summarize your understanding and ask "Is that accurate, or did I miss something?"
Attempt ${state.diagnosisAttempts + 1} of 3.`;
  }

  return context;
}

/**
 * Extract structured data from user messages using Claude
 */
async function extractDataFromConversation(
  state: ConversationState,
  userMessage: string
): Promise<void> {
  const extractionPrompt = `Given this conversation and the latest user message, extract any new information.

CONVERSATION SO FAR:
${state.messageHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}

LATEST MESSAGE: ${userMessage}

CURRENTLY KNOWN:
${JSON.stringify(state.collectedData, null, 2)}

Extract any NEW information from the latest message. Return a JSON object with ONLY the fields that have new values. If no new information, return {}.

Valid fields:
- childName: string (first name only)
- grade: "K" | "1" | "2" | "3" | "4" | "5" | "6"
- subject: "Math" | "Reading"
- topic: string (the specific topic within the subject)
- specificProblem: string (the actual problem or example)
- whatHappened: string (what occurred when they tried)
- whereStuck: string (where confusion happened)
- diagnosisConfirmed: boolean (true if they confirmed our summary)
- additionalContext: string (if they said we missed something)
- interest: string (what the child loves)
- whyLoveIt: string (why they love it)
- learningStyle: "visual" | "auditory" | "hands_on" | "stories" | "not_sure"
- previousAttempts: string (what they've already tried)
- parentGoal: string (what parent wants child to understand)
- tone: "enthusiastic" | "calm" | "encouraging" | "matter_of_fact"
- thingsToAvoid: string (anything to avoid mentioning)

Return ONLY valid JSON, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: extractionPrompt }]
    });

    const extractedText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '{}';

    // Parse JSON, handling potential markdown code blocks
    let jsonStr = extractedText;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const extracted = JSON.parse(jsonStr);

    // Merge with existing data
    state.collectedData = {
      ...state.collectedData,
      ...extracted
    };

    // Special handling for diagnosis confirmation
    if (extracted.diagnosisConfirmed === false && extracted.additionalContext) {
      state.diagnosisAttempts++;
      state.collectedData.diagnosisConfirmed = false;
    } else if (extracted.diagnosisConfirmed === true) {
      state.collectedData.diagnosisConfirmed = true;
    }

  } catch (error) {
    console.error('Error extracting data:', error);
    // Continue without extraction - conversation will naturally collect data
  }
}

/**
 * Update conversation phase based on collected data
 */
function updatePhase(state: ConversationState): void {
  const data = state.collectedData;

  if (!data.childName || !data.grade) {
    state.currentPhase = 'basic_info';
  } else if (!data.subject || !data.topic) {
    state.currentPhase = 'basic_info';
  } else if (!data.specificProblem || !data.whatHappened || !data.whereStuck) {
    state.currentPhase = 'specific_struggle';
  } else if (!data.diagnosisConfirmed) {
    state.currentPhase = 'diagnosis_confirmation';
  } else if (!data.interest || !data.whyLoveIt) {
    state.currentPhase = 'interest_discovery';
  } else if (!data.learningStyle) {
    state.currentPhase = 'learning_preferences';
  } else if (!data.parentGoal || !data.tone) {
    state.currentPhase = 'goals_and_tone';
  } else {
    state.currentPhase = 'final_confirmation';

    // Check if we have everything
    if (isIntakeComplete(data)) {
      state.isComplete = true;
      state.currentPhase = 'complete';
    }
  }
}

/**
 * Check if intake data is complete
 */
function isIntakeComplete(data: Partial<HomeworkIntake>): boolean {
  return !!(
    data.childName &&
    data.grade &&
    data.subject &&
    data.topic &&
    data.specificProblem &&
    data.whatHappened &&
    data.whereStuck &&
    data.diagnosisConfirmed &&
    data.interest &&
    data.whyLoveIt &&
    data.learningStyle &&
    data.parentGoal &&
    data.tone
  );
}

/**
 * Create initial conversation state
 */
export function createConversationState(sessionId: string): ConversationState {
  return {
    sessionId,
    currentPhase: 'greeting',
    collectedData: {},
    messageHistory: [],
    diagnosisAttempts: 0,
    isComplete: false
  };
}

/**
 * Generate diagnosis summary for confirmation
 */
export async function generateDiagnosisSummary(data: Partial<HomeworkIntake>): Promise<string> {
  const prompt = `Based on this information about a child's homework struggle, write a warm, clear diagnosis summary.

Child: ${data.childName}, Grade ${data.grade}
Subject: ${data.subject}
Topic: ${data.topic}
Problem they tried: ${data.specificProblem}
What happened: ${data.whatHappened}
Where they got stuck: ${data.whereStuck}

Write a 1-2 sentence summary in this format:
"It sounds like the tricky part for [name] is [specific challenge], especially when [specific situation]."

Be specific to their exact struggle. Don't be generic.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : '';
}

/**
 * Get topics for a given grade and subject
 */
export function getTopicsForGradeSubject(grade: GradeLevel, subject: Subject): string[] {
  if (subject === 'Math') {
    return MATH_TOPICS[grade] || [];
  } else {
    return READING_TOPICS[grade] || [];
  }
}

/**
 * Finalize intake data
 */
export function finalizeIntake(
  state: ConversationState,
  orderId: string
): HomeworkIntake {
  const data = state.collectedData;

  if (!isIntakeComplete(data)) {
    throw new Error('Intake data is incomplete');
  }

  return {
    childName: data.childName!,
    grade: data.grade!,
    subject: data.subject!,
    topic: data.topic!,
    specificProblem: data.specificProblem!,
    whatHappened: data.whatHappened!,
    whereStuck: data.whereStuck!,
    diagnosisSummary: data.diagnosisSummary || '',
    diagnosisConfirmed: data.diagnosisConfirmed!,
    additionalContext: data.additionalContext,
    interest: data.interest!,
    whyLoveIt: data.whyLoveIt!,
    learningStyle: data.learningStyle!,
    previousAttempts: data.previousAttempts,
    parentGoal: data.parentGoal!,
    tone: data.tone!,
    thingsToAvoid: data.thingsToAvoid,
    orderId,
    createdAt: new Date(),
    sessionId: state.sessionId
  };
}
