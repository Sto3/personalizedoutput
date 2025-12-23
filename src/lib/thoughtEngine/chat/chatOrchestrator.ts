/**
 * Chat Orchestrator
 *
 * Manages the conversation flow for thought organization sessions.
 * Handles turn-by-turn interaction with Claude API.
 */

import {
  ThoughtSession,
  addTurn,
  saveThoughtSession,
  getConversationTranscript
} from './thoughtSession';
import {
  getProductChatConfig,
  loadSystemPrompt,
  shouldStartWrapUp,
  getWrapUpMessage,
  canGenerate
} from './productChatConfig';

// ============================================================
// TYPES
// ============================================================

// Anthropic API Response types
interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  model?: string;
  stop_reason?: string;
}

interface OrchestratorResult {
  session: ThoughtSession;
  assistantMessage: string;
  shouldWrapUp: boolean;
  canGenerate: boolean;
}

// ============================================================
// MAIN ORCHESTRATOR FUNCTION
// ============================================================

/**
 * Continue a thought session with a new user message
 */
export async function continueThoughtSession(
  session: ThoughtSession,
  latestUserMessage: string
): Promise<OrchestratorResult> {
  const config = getProductChatConfig(session.productId);

  if (!config) {
    throw new Error(`Unknown product: ${session.productId}`);
  }

  // 1. Append user message to session
  addTurn(session, 'user', latestUserMessage);

  // 2. Check if user is ready to generate
  const userWantsToGenerate = checkIfUserWantsToGenerate(latestUserMessage);
  const hasEnoughTurns = canGenerate(session.productId, session.turns.length);

  if (userWantsToGenerate && hasEnoughTurns) {
    // User is ready - mark session and return confirmation
    session.status = 'ready_for_generation';
    await saveThoughtSession(session);

    const confirmMessage = getGenerationConfirmationMessage(session.productId);

    addTurn(session, 'assistant', confirmMessage);
    await saveThoughtSession(session);

    return {
      session,
      assistantMessage: confirmMessage,
      shouldWrapUp: true,
      canGenerate: true
    };
  }

  // 3. Load system prompt
  const systemPrompt = loadSystemPrompt(config);

  // 4. Build messages for Claude API
  const messages = buildClaudeMessages(session, systemPrompt);

  // 5. Check if we should start wrapping up
  const shouldWrap = shouldStartWrapUp(session.productId, session.turns.length);

  // 6. Add wrap-up instruction if needed
  let additionalInstruction = '';
  if (shouldWrap && !session.turns.some(t =>
    t.role === 'assistant' && t.content.includes("ready") && t.content.includes("create")
  )) {
    additionalInstruction = `\n\nIMPORTANT: We're approaching the end of our conversation. After responding to this message, gently transition toward offering to create the final output. Use something like: "${getWrapUpMessage(session.productId)}"`;
  }

  // 7. Call Claude API
  const assistantResponse = await callClaudeAPI(messages, systemPrompt + additionalInstruction);

  // 7b. Check if Claude accidentally generated the full script (instead of just asking questions)
  // This happens sometimes - detect it and route to generation
  const looksLikeGeneratedScript = detectGeneratedScript(assistantResponse, session.productId);
  if (looksLikeGeneratedScript && hasEnoughTurns) {
    console.log('[ChatOrchestrator] Detected Claude generated script prematurely - routing to generation');
    session.status = 'ready_for_generation';
    await saveThoughtSession(session);

    return {
      session,
      assistantMessage: "Perfect! Creating your message now...",
      shouldWrapUp: true,
      canGenerate: true
    };
  }

  // 8. Append assistant response to session
  addTurn(session, 'assistant', assistantResponse);

  // 9. Save session
  await saveThoughtSession(session);

  return {
    session,
    assistantMessage: assistantResponse,
    shouldWrapUp: shouldWrap,
    canGenerate: hasEnoughTurns
  };
}

/**
 * Detect if Claude accidentally generated the full output instead of asking questions
 */
function detectGeneratedScript(response: string, productId: string): boolean {
  const lowerResponse = response.toLowerCase();

  // Santa message indicators
  if (productId === 'santa_message') {
    const santaIndicators = [
      'ho ho ho',
      "here's santa",
      "santa's message",
      "message for",
      "merry christmas",
      "santa claus here"
    ];
    const hasSantaContent = santaIndicators.some(ind => lowerResponse.includes(ind));
    const isLongResponse = response.length > 300; // Scripts are usually 500+ chars

    return hasSantaContent && isLongResponse;
  }

  return false;
}

/**
 * Start a new session and generate the opening message
 */
export async function startThoughtSession(
  session: ThoughtSession
): Promise<OrchestratorResult> {
  const config = getProductChatConfig(session.productId);

  if (!config) {
    throw new Error(`Unknown product: ${session.productId}`);
  }

  // Load system prompt
  const systemPrompt = loadSystemPrompt(config);

  // Generate opening message
  const openingInstruction = `Generate a brief opening (2-3 sentences max). Structure:
1. One sentence of warm context about what we're creating together
2. Ask for their child's first name or nickname

Example: "Let's create a personalized Santa message for your child. What's your child's first name or the nickname they go by?"

Keep it short and direct. No filler.`;

  const openingMessage = await callClaudeAPI(
    [{ role: 'user', content: openingInstruction }],
    systemPrompt
  );

  // Add to session
  addTurn(session, 'assistant', openingMessage);
  await saveThoughtSession(session);

  return {
    session,
    assistantMessage: openingMessage,
    shouldWrapUp: false,
    canGenerate: false
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Build messages array for Claude API from session turns
 */
function buildClaudeMessages(
  session: ThoughtSession,
  systemPrompt: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const turn of session.turns) {
    messages.push({
      role: turn.role,
      content: turn.content
    });
  }

  return messages;
}

/**
 * Check if user message indicates they want to generate
 */
function checkIfUserWantsToGenerate(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const positiveIndicators = [
    'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'ready',
    'create it', 'make it', 'generate', 'let\'s do it',
    'sounds good', 'go ahead', 'please do', 'that\'s it',
    'i\'m ready', 'nothing else', 'that\'s all', 'go for it'
  ];

  return positiveIndicators.some(indicator =>
    lowerMessage.includes(indicator)
  ) && (
    lowerMessage.includes('ready') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('generate') ||
    lowerMessage.includes('yes') ||
    lowerMessage.includes('go') ||
    lowerMessage.length < 50 // Short affirmative responses
  );
}

/**
 * Get confirmation message when user is ready to generate
 */
function getGenerationConfirmationMessage(productId: string): string {
  switch (productId) {
    case 'santa_message':
      return "Perfect! I have everything I need. I'm creating Santa's message now - it will weave in all those beautiful specific moments you shared. Give me just a moment...";

    case 'holiday_reset':
      return "Got it. I'm creating your personalized Holiday Game Plan now. It will address the specific dynamics you've shared and give you practical strategies for your situation. This will just take a moment...";

    case 'new_year_reset':
      return "Wonderful. I'm creating your Reflection & Reset Planner now. It will honor everything you've shared about your year and help you move forward with intention. Just a moment...";

    case 'vision_board':
      return "Beautiful. I have a clear picture of your vision now. I'm creating your personalized vision board - it will reflect everything you've shared about where you are and where you want to go. This will just take a moment...";

    case 'clarity_planner':
      return "Thank you for sharing so openly. I'm creating your personalized Clarity Planner now. It will include reflection prompts, action steps, and exercises tailored specifically to everything you've shared. This will just take a moment...";

    default:
      return "I'm creating your personalized output now. This will just take a moment...";
  }
}

/**
 * Call Claude API
 */
async function callClaudeAPI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string
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
      max_tokens: 1000,
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as AnthropicResponse;

  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error('Invalid response from Claude API');
  }

  return data.content[0].text;
}

// ============================================================
// EXPORTS
// ============================================================

export { buildClaudeMessages, checkIfUserWantsToGenerate };
