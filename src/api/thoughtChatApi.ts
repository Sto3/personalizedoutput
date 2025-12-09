/**
 * Thought Chat API
 *
 * Express router for chat-based thought organization sessions.
 *
 * POST /api/thought-chat/start - Start a new chat session
 * POST /api/thought-chat/continue - Continue an existing session
 * POST /api/thought-chat/generate - Generate final output from session
 * GET /api/thought-chat/session/:sessionId - Get session details
 * GET /api/thought-chat/products - List available products
 * GET /api/thought-chat/health - Health check
 */

import { Router, Request, Response } from 'express';
import {
  createThoughtSession,
  getThoughtSession,
  saveThoughtSession,
  startThoughtSession,
  continueThoughtSession,
  getProductChatConfig,
  getAllProductConfigs,
  extractSantaInputFromConversation,
  extractHolidayResetInputFromConversation,
  extractNewYearResetInputFromConversation,
  getConversationTranscript
} from '../lib/thoughtEngine/chat';

// Import existing generators
import { buildSantaScriptDeep } from '../lib/thoughtEngine/santa/buildSantaScriptDeep';
import { synthesizeSantaMessageWithRetry } from '../lib/thoughtEngine/santa/ttsErrorHandler';
import { runSafetyCheck, DEFAULT_SAFETY_RULES } from '../lib/thoughtEngine/santa/safetyLayer';
import { validateAndAdjust } from '../lib/thoughtEngine/santa/lengthControl';
import { canGenerateAudio, recordAudioGeneration, getSpendStatus } from '../lib/thoughtEngine/santa/spendLimiter';
import { renderPlannerToPDF } from '../lib/thoughtEngine/pdf/renderPlannerPDF';
import { PlannerOutput, SectionOutput } from '../lib/thoughtEngine/models/meaningModel';

import * as fs from 'fs';
import * as path from 'path';

// Import token store for order-based access control
import { validateToken, markTokenRedeemed } from '../lib/thoughtEngine/santa/tokenStore';

// ============================================================
// TYPES
// ============================================================

interface StartSessionRequest {
  productId: 'santa_message' | 'holiday_reset' | 'new_year_reset';
  token?: string; // Access token for santa_message product
}

interface ContinueSessionRequest {
  sessionId: string;
  userMessage: string;
}

interface GenerateRequest {
  sessionId: string;
  forceGenerate?: boolean;
  token?: string; // Access token for santa_message product
}

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// POST /api/thought-chat/start
// Start a new chat session
// ============================================================

router.post('/start', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { productId, token } = req.body as StartSessionRequest;

  try {
    // Validate product
    const config = getProductChatConfig(productId);
    if (!config) {
      return res.status(400).json({
        success: false,
        error: `Unknown product: ${productId}. Available: santa_message, holiday_reset, new_year_reset`
      });
    }

    // Validate token for Santa messages (if provided)
    if (productId === 'santa_message' && token) {
      const tokenValidation = validateToken(token);
      if (!tokenValidation.valid) {
        const errorMessages = {
          'not_found': 'Invalid access token. Please start from your order link.',
          'expired': 'Your session has expired. Please contact support for assistance.',
          'redeemed': 'This order has already been used to generate a Santa message.'
        };
        return res.status(403).json({
          success: false,
          error: errorMessages[tokenValidation.reason]
        });
      }
    }

    console.log(`[ThoughtChat API] Starting session for ${productId}`);

    // Create session
    const session = createThoughtSession(productId);

    // Generate opening message
    const result = await startThoughtSession(session);

    const totalTime = Date.now() - startTime;
    console.log(`[ThoughtChat API] Session ${session.sessionId} started in ${totalTime}ms`);

    res.json({
      success: true,
      sessionId: result.session.sessionId,
      productId: result.session.productId,
      firstAssistantMessage: result.assistantMessage,
      meta: {
        productName: config.displayName,
        estimatedTurns: config.maxTurns,
        generationTimeMs: totalTime
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[ThoughtChat API] Start error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message || 'Failed to start session'
    });
  }
});

// ============================================================
// POST /api/thought-chat/continue
// Continue an existing session
// ============================================================

router.post('/continue', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { sessionId, userMessage } = req.body as ContinueSessionRequest;

  try {
    // Validate input
    if (!sessionId || !userMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, userMessage'
      });
    }

    // Load session
    const session = getThoughtSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session not found: ${sessionId}`
      });
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Session is already completed'
      });
    }

    console.log(`[ThoughtChat API] Continuing session ${sessionId}`);

    // Continue conversation
    const result = await continueThoughtSession(session, userMessage);

    const totalTime = Date.now() - startTime;
    console.log(`[ThoughtChat API] Session ${sessionId} continued in ${totalTime}ms`);

    res.json({
      success: true,
      sessionId: result.session.sessionId,
      assistantMessage: result.assistantMessage,
      status: result.session.status,
      turnCount: result.session.turns.length,
      shouldWrapUp: result.shouldWrapUp,
      canGenerate: result.canGenerate,
      meta: {
        generationTimeMs: totalTime
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[ThoughtChat API] Continue error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message || 'Failed to continue session'
    });
  }
});

// ============================================================
// POST /api/thought-chat/generate
// Generate final output from session
// ============================================================

router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { sessionId, forceGenerate = false, token } = req.body as GenerateRequest;

  try {
    // Validate input
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: sessionId'
      });
    }

    // Load session
    const session = getThoughtSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session not found: ${sessionId}`
      });
    }

    // Check status
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Session already generated. Start a new session for another output.'
      });
    }

    if (session.status !== 'ready_for_generation' && !forceGenerate) {
      return res.status(400).json({
        success: false,
        error: 'Session not ready for generation. Continue the conversation or use forceGenerate: true'
      });
    }

    console.log(`[ThoughtChat API] Generating output for session ${sessionId}`);

    // Route to appropriate generator
    let result;
    switch (session.productId) {
      case 'santa_message':
        result = await generateSantaFromSession(session);
        break;
      case 'holiday_reset':
        result = await generateHolidayResetFromSession(session);
        break;
      case 'new_year_reset':
        result = await generateNewYearResetFromSession(session);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown product: ${session.productId}`
        });
    }

    // Mark session as completed
    session.status = 'completed';
    await saveThoughtSession(session);

    // Mark token as redeemed for Santa messages
    if (session.productId === 'santa_message' && token) {
      markTokenRedeemed(token);
      console.log(`[ThoughtChat API] Token marked as redeemed: ${token.substring(0, 8)}...`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[ThoughtChat API] Generation complete in ${totalTime}ms`);

    res.json({
      success: true,
      sessionId,
      productId: session.productId,
      ...result,
      meta: {
        generationTimeMs: totalTime,
        turnCount: session.turns.length
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[ThoughtChat API] Generate error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate output'
    });
  }
});

// ============================================================
// GET /api/thought-chat/session/:sessionId
// Get session details
// ============================================================

router.get('/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const session = getThoughtSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session not found: ${sessionId}`
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        productId: session.productId,
        status: session.status,
        turnCount: session.turns.length,
        createdAt: session.createdAtIso,
        updatedAt: session.updatedAtIso,
        turns: session.turns
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================
// GET /api/thought-chat/products
// List available products
// ============================================================

router.get('/products', (req: Request, res: Response) => {
  try {
    const products = getAllProductConfigs().map(config => ({
      id: config.id,
      name: config.displayName,
      maxTurns: config.maxTurns,
      minTurnsBeforeGeneration: config.minTurnsBeforeGeneration
    }));

    res.json({
      success: true,
      products
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================
// GET /api/thought-chat/health
// Health check
// ============================================================

router.get('/health', (req: Request, res: Response) => {
  try {
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasElevenLabsKey = !!process.env.ELEVENLABS_API_KEY;

    res.json({
      status: hasAnthropicKey ? 'ready' : 'degraded',
      anthropic: { configured: hasAnthropicKey },
      elevenLabs: { configured: hasElevenLabsKey },
      endpoints: {
        start: 'POST /api/thought-chat/start',
        continue: 'POST /api/thought-chat/continue',
        generate: 'POST /api/thought-chat/generate',
        session: 'GET /api/thought-chat/session/:sessionId',
        products: 'GET /api/thought-chat/products',
        health: 'GET /api/thought-chat/health'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================
// GENERATION FUNCTIONS
// ============================================================

async function generateSantaFromSession(session: any): Promise<{
  script: string;
  audioUrl?: string;
  warnings?: string[];
}> {
  // Extract input from conversation
  const input = extractSantaInputFromConversation(session);
  const transcript = getConversationTranscript(session);

  // Build Santa script using the transcript as additional context
  const scriptResult = await buildSantaScriptFromChat(input, transcript);

  // Run safety check
  const safetyRules = {
    ...DEFAULT_SAFETY_RULES,
    allowChristianLanguage: input.includeChristianMessage
  };
  const safetyResult = runSafetyCheck(scriptResult, input.childFirstName, safetyRules);

  const warnings: string[] = [];
  if (!safetyResult.passed) {
    warnings.push(...safetyResult.issues.map(i => i.description));
  }

  // Validate length
  const lengthResult = validateAndAdjust(scriptResult);
  if (!lengthResult.valid) {
    warnings.push(...lengthResult.notes);
  }
  const finalScript = lengthResult.script;

  // Generate audio if possible
  let audioUrl: string | undefined;

  if (canGenerateAudio()) {
    const ttsResult = await synthesizeSantaMessageWithRetry(finalScript, session.sessionId);

    if (ttsResult.success && ttsResult.audioBuffer) {
      recordAudioGeneration(finalScript.length);

      const outputDir = path.join(process.cwd(), 'outputs', 'santa');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const audioFilename = `santa-chat-${input.childFirstName.toLowerCase()}-${Date.now()}.mp3`;
      const filepath = path.join(outputDir, audioFilename);
      fs.writeFileSync(filepath, ttsResult.audioBuffer);

      audioUrl = `/outputs/santa/${audioFilename}`;
    } else {
      warnings.push(`Audio generation failed: ${ttsResult.error?.message || 'Unknown error'}`);
    }
  } else {
    const spendStatus = getSpendStatus();
    warnings.push(`Spend limit reached ($${spendStatus.totalSpentThisMonth.toFixed(2)}). Audio not generated.`);
  }

  return {
    script: finalScript,
    audioUrl,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

async function generateHolidayResetFromSession(session: any): Promise<{
  pdfUrl: string;
}> {
  // Extract input from conversation
  const input = extractHolidayResetInputFromConversation(session);
  const transcript = getConversationTranscript(session);

  // Generate planner content using conversation
  const plannerOutput = await generatePlannerFromChat('holiday_reset', input, transcript);

  // Render to PDF
  const outputDir = path.join(process.cwd(), 'outputs', 'planners');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `holiday-reset-chat-${Date.now()}.pdf`;
  const filepath = path.join(outputDir, filename);

  await renderPlannerToPDF(plannerOutput, filepath);

  return {
    pdfUrl: `/outputs/planners/${filename}`
  };
}

async function generateNewYearResetFromSession(session: any): Promise<{
  pdfUrl: string;
}> {
  // Extract input from conversation
  const input = extractNewYearResetInputFromConversation(session);
  const transcript = getConversationTranscript(session);

  // Generate planner content using conversation
  const plannerOutput = await generatePlannerFromChat('new_year_reset', input, transcript);

  // Render to PDF
  const outputDir = path.join(process.cwd(), 'outputs', 'planners');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `new-year-reset-chat-${Date.now()}.pdf`;
  const filepath = path.join(outputDir, filename);

  await renderPlannerToPDF(plannerOutput, filepath);

  return {
    pdfUrl: `/outputs/planners/${filename}`
  };
}

// ============================================================
// CHAT-BASED GENERATION HELPERS
// ============================================================

async function buildSantaScriptFromChat(input: any, transcript: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const prompt = `You are creating a personalized voice message from Santa Claus to ${input.childFirstName}, a ${input.childAge}-year-old ${input.childGender}.

The parent has shared the following in a conversation with us:

<conversation_transcript>
${transcript}
</conversation_transcript>

Based on this conversation, create Santa's voice message. The message should:
1. Be warm and personal - use ${input.childFirstName}'s name naturally
2. Reference SPECIFIC moments the parent shared (use their exact details)
3. Acknowledge the child's character traits mentioned
4. Reinforce the messages the parent wants their child to hear
5. Be 120-160 words (45-60 seconds when spoken)
6. Sound like a warm, real Santa - not generic or cheesy
${input.includeChristianMessage ? '7. Include appropriate Christian/faith-based language as the parent requested' : '7. Keep the message secular - no religious references'}

Use pronouns ${input.childGender === 'girl' ? 'she/her' : 'he/him'}.

Write ONLY the script Santa will speak. No stage directions, no quotes, just the words.`;

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
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generatePlannerFromChat(
  productId: string,
  input: any,
  transcript: string
): Promise<PlannerOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  let prompt: string;
  let title: string;

  if (productId === 'holiday_reset') {
    title = 'Your Holiday Game Plan';
    prompt = `You are creating a personalized Holiday Relationship Reset Planner based on this conversation:

<conversation_transcript>
${transcript}
</conversation_transcript>

Create a deeply personalized planner with these sections:
1. "What You're Navigating" - Reflect back their specific situation
2. "The Pattern" - What you noticed about recurring dynamics
3. "What You Actually Need" - The deeper needs beneath the surface
4. "Your Non-Negotiables" - What they must protect
5. "Practical Strategies" - Specific, actionable approaches for THEIR situation
6. "Scripts for Difficult Moments" - Actual phrases they can use
7. "Self-Care Anchors" - Ways to stay grounded
8. "Permission Slip" - The permission they need to give themselves

Tone should be ${input.tonePreference}. ${input.spiritualLanguageOk ? 'Spiritual language is welcome.' : 'Keep it secular.'}

Return as JSON: { "sections": [{ "id": "section_id", "title": "Section Title", "content": "Content with markdown..." }] }`;
  } else {
    title = `${input.firstName}'s 2025 Reflection & Reset`;
    prompt = `You are creating a personalized New Year Reflection & Reset Planner for ${input.firstName} based on this conversation:

<conversation_transcript>
${transcript}
</conversation_transcript>

Create a deeply personalized planner with these sections:
1. "Your Year in Review" - Reflect back their year using their own words
2. "The Moments That Mattered" - The significant moments they shared
3. "What You Discovered" - Insights about themselves
4. "Patterns Worth Noticing" - Recurring themes you observed
5. "What You're Releasing" - What they need to let go of
6. "Your Word for 2025: ${input.oneWordForNextYear}" - Explore what this word means for them
7. "How You Want to Feel" - Their desired emotional state
8. "The One Thing That Must Change" - Their non-negotiable
9. "Potential Obstacles & Support" - What might get in the way and what they need
${input.includeQuarterlyBreakdown ? '10. "Quarterly Intentions" - Breaking the year into seasons' : ''}

Tone should be ${input.tonePreference}.

Return as JSON: { "sections": [{ "id": "section_id", "title": "Section Title", "content": "Content with markdown..." }] }`;
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
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    productId,
    title,
    generatedAt: new Date().toISOString(),
    sections: parsed.sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content
    })),
    meaningModel: {
      keyLifeAreas: [],
      timeframe: { label: productId === 'holiday_reset' ? 'Holiday Season' : '2025' },
      topGoals: [],
      majorTensions: [],
      coreThemes: [],
      constraints: [],
      distilledSummary: 'Generated from conversation',
      emotionalWeather: input.feelingYouWant || input.whatPeaceLooksLike || 'Seeking clarity',
      opportunities: []
    }
  };
}

export default router;
