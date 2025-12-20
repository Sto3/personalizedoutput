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
import { validateToken, markTokenRedeemed, getRecordByToken } from '../lib/thoughtEngine/santa/tokenStore';

// Import order validation
import {
  validateOrderForGeneration,
  markOrderIdUsed,
  sanitizeOrderId
} from '../lib/orders/orderValidation';

// Import vision board engine V12
const { generateVisionBoard: generateVisionBoardV12 } = require('../lib/visionBoardEngineV12');

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

interface StartSessionRequest {
  productId: 'santa_message' | 'holiday_reset' | 'new_year_reset' | 'vision_board' | 'clarity_planner';
  token?: string; // Access token for santa_message product
  orderId?: string; // Order ID from Stripe checkout (required for production)
}

interface ContinueSessionRequest {
  sessionId: string;
  userMessage: string;
}

interface GenerateRequest {
  sessionId: string;
  forceGenerate?: boolean;
  token?: string; // Access token for santa_message product
  orderId?: string; // Order ID (can be passed here or will use session's orderId)
  firstName?: string; // First name for personalized vision boards
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
  const { productId, token, orderId: bodyOrderId } = req.body as StartSessionRequest;

  try {
    // Validate product
    const config = getProductChatConfig(productId);
    if (!config) {
      return res.status(400).json({
        success: false,
        error: `Unknown product: ${productId}. Available: santa_message, holiday_reset, new_year_reset`
      });
    }

    // Resolve orderId from multiple sources
    let resolvedOrderId: string | undefined;

    // Validate token for Santa messages (if provided)
    if (productId === 'santa_message' && token) {
      const tokenValidation = validateToken(token);
      if (!tokenValidation.valid) {
        const errorMessages: Record<string, string> = {
          'not_found': 'Invalid access token. Please start from your order link.',
          'expired': 'Your session has expired. Please contact support for assistance.',
          'redeemed': 'This order has already been used to generate a Santa message.'
        };
        return res.status(403).json({
          success: false,
          error: errorMessages[(tokenValidation as { valid: false; reason: string }).reason]
        });
      }
      // Get orderId from token record
      const record = getRecordByToken(token);
      if (record) {
        resolvedOrderId = record.orderId;
      }
    }

    // If no orderId from token, try body
    if (!resolvedOrderId) {
      resolvedOrderId = bodyOrderId;
    }

    // Validate orderId if provided
    let sanitizedOrderId: string | undefined;
    if (resolvedOrderId) {
      const orderValidation = validateOrderForGeneration(resolvedOrderId, productId);
      if (!orderValidation.valid) {
        return res.status(400).json({
          success: false,
          error: (orderValidation as { valid: false; error: string }).error
        });
      }
      sanitizedOrderId = (orderValidation as { valid: true; sanitizedOrderId: string }).sanitizedOrderId;
    }

    console.log(`[ThoughtChat API] Starting session for ${productId}${sanitizedOrderId ? ` (order: ${sanitizedOrderId})` : ''}`);

    // Create session
    const session = createThoughtSession(productId);

    // Store orderId in session for later use
    if (sanitizedOrderId) {
      (session as any).orderId = sanitizedOrderId;
    }

    // Generate opening message
    const result = await startThoughtSession(session);

    const totalTime = Date.now() - startTime;
    console.log(`[ThoughtChat API] Session ${session.sessionId} started in ${totalTime}ms`);

    res.json({
      success: true,
      sessionId: result.session.sessionId,
      productId: result.session.productId,
      orderId: sanitizedOrderId,
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
  const { sessionId, forceGenerate = false, token, orderId: bodyOrderId, firstName } = req.body as GenerateRequest;

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

    // Get orderId from session or request
    const sessionOrderId = (session as any).orderId;
    const orderId = sessionOrderId || bodyOrderId;

    console.log(`[ThoughtChat API] Generating output for session ${sessionId}${orderId ? ` (order: ${orderId})` : ''}`);

    // Route to appropriate generator (pass orderId for filename generation)
    let result;
    switch (session.productId) {
      case 'santa_message':
        result = await generateSantaFromSession(session, orderId);
        break;
      case 'holiday_reset':
        result = await generateHolidayResetFromSession(session, orderId);
        break;
      case 'new_year_reset':
        result = await generateNewYearResetFromSession(session, orderId);
        break;
      case 'vision_board':
        result = await generateVisionBoardFromSession(session, orderId, firstName);
        break;
      case 'clarity_planner':
        result = await generateClarityPlannerFromSession(session, orderId);
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
      orderId,
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

async function generateSantaFromSession(session: any, orderId?: string): Promise<{
  script: string;
  audioUrl?: string;
  warnings?: string[];
  jobId?: string;
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
  let jobId: string | undefined;

  if (canGenerateAudio()) {
    const ttsResult = await synthesizeSantaMessageWithRetry(finalScript, session.sessionId);

    if (ttsResult.success && ttsResult.audioBuffer) {
      recordAudioGeneration(finalScript.length);

      const outputDir = path.join(process.cwd(), 'outputs', 'santa');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Use orderId in filename if available
      const filenameBase = orderId || input.childFirstName.toLowerCase();
      const audioFilename = `santa-chat-${filenameBase}-${Date.now()}.mp3`;
      const filepath = path.join(outputDir, audioFilename);
      fs.writeFileSync(filepath, ttsResult.audioBuffer);

      audioUrl = `/outputs/santa/${audioFilename}`;

      // Mark order as used after successful audio generation
      if (orderId) {
        const usageRecord = markOrderIdUsed(orderId, 'santa_message', 'audio', audioFilename);
        jobId = usageRecord.jobId;
        console.log(`[ThoughtChat API] Order marked as used: ${orderId} (job: ${jobId})`);
      }
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
    warnings: warnings.length > 0 ? warnings : undefined,
    jobId
  };
}

async function generateHolidayResetFromSession(session: any, orderId?: string): Promise<{
  pdfUrl: string;
  jobId?: string;
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

  // Use orderId in filename if available
  const filenameBase = orderId || 'chat';
  const filename = `holiday-reset-${filenameBase}-${Date.now()}.pdf`;
  const filepath = path.join(outputDir, filename);

  await renderPlannerToPDF(plannerOutput, filepath, {
    orderId,
    productId: 'holiday_relationship_reset'
  });

  // Mark order as used after successful generation
  let jobId: string | undefined;
  if (orderId) {
    const usageRecord = markOrderIdUsed(orderId, 'holiday_relationship_reset', 'pdf', filename);
    jobId = usageRecord.jobId;
    console.log(`[ThoughtChat API] Order marked as used: ${orderId} (job: ${jobId})`);
  }

  return {
    pdfUrl: `/outputs/planners/${filename}`,
    jobId
  };
}

async function generateNewYearResetFromSession(session: any, orderId?: string): Promise<{
  pdfUrl: string;
  jobId?: string;
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

  // Use orderId in filename if available
  const filenameBase = orderId || 'chat';
  const filename = `new-year-reset-${filenameBase}-${Date.now()}.pdf`;
  const filepath = path.join(outputDir, filename);

  await renderPlannerToPDF(plannerOutput, filepath, {
    orderId,
    productId: 'new_year_reflection_reset'
  });

  // Mark order as used after successful generation
  let jobId: string | undefined;
  if (orderId) {
    const usageRecord = markOrderIdUsed(orderId, 'new_year_reflection_reset', 'pdf', filename);
    jobId = usageRecord.jobId;
    console.log(`[ThoughtChat API] Order marked as used: ${orderId} (job: ${jobId})`);
  }

  return {
    pdfUrl: `/outputs/planners/${filename}`,
    jobId
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

  const data = await response.json() as AnthropicResponse;
  return data.content[0].text || '';
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

  const data = await response.json() as AnthropicResponse;
  const text = data.content[0].text || '';

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    productId: productId as any,
    title,
    generatedAt: new Date().toISOString(),
    sections: parsed.sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content
    })),
    meaningModel: {
      productId: productId as any,
      keyLifeAreas: [],
      timeframe: { id: 'custom' as const, label: productId === 'holiday_reset' ? 'Holiday Season' : '2025' },
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

async function generateVisionBoardFromSession(session: any, orderId?: string, firstName?: string): Promise<{
  imageUrl: string;
  jobId?: string;
}> {
  const transcript = getConversationTranscript(session);

  // Extract vision board parameters from conversation using Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  // Enhanced extraction prompt that generates photo prompts for the V12 engine
  const extractionPrompt = `Based on this conversation, extract parameters for generating a personalized vision board.

<conversation_transcript>
${transcript}
</conversation_transcript>

Return a JSON object with:
{
  "theme": "one word theme (e.g., 'abundance', 'clarity', 'growth')",
  "goals": ["list of 3-5 specific goals mentioned"],
  "aesthetic": "visual style (e.g., 'feminine dreamy soft', 'masculine dark discipline', 'warm romantic cozy')",
  "isMasculine": true/false based on the person's preferences and goals,
  "isRelationship": true/false if this is about couples/relationship goals,
  "subtitle": "3 words separated by bullets like 'GROW • THRIVE • BLOOM'",
  "photoPrompts": [
    "12 specific photo descriptions that represent their goals - NO PEOPLE, only objects, scenes, and items. Examples:",
    "luxury watch on marble desk, morning light",
    "yoga mat with candles, peaceful meditation space",
    "stack of books by window with coffee cup",
    "hiking boots on mountain trail at sunrise",
    "healthy meal prep containers, colorful vegetables",
    "journal with gold pen on cozy blanket",
    "running shoes by door with sunrise light",
    "plane tickets and passport on world map",
    "home office with plants, organized desk",
    "fresh flowers in elegant vase, soft light",
    "beach at sunset, peaceful ocean waves",
    "cozy reading corner with fairy lights"
  ],
  "colors": {
    "background": "hex color for background (light for feminine, dark for masculine)",
    "banner": "hex color for title banner",
    "bannerText": "hex color for banner text",
    "accents": ["4 hex accent colors that match the mood"]
  }
}

CRITICAL: photoPrompts must describe OBJECTS and SCENES only - never include people, faces, or body parts.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: extractionPrompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json() as AnthropicResponse;
  const text = data.content[0].text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Could not extract vision board parameters');
  }

  const visionParams = JSON.parse(jsonMatch[0]);

  // Build personalized title
  const personalizedTitle = firstName
    ? `${firstName.toUpperCase()}'S ${(visionParams.theme || '2025 VISION').toUpperCase()}`
    : visionParams.theme
      ? `MY ${visionParams.theme.toUpperCase()} VISION`
      : 'MY 2025 VISION';

  // Determine style mood based on extracted parameters
  let styleMood = visionParams.aesthetic || 'dreamy warm aesthetic';
  if (visionParams.isMasculine) {
    styleMood = 'masculine dark discipline executive';
  } else if (visionParams.isRelationship) {
    styleMood = 'warm romantic cozy intimate couple relationship together partner';
  }

  // Build V12 engine input
  const engineInput = {
    title: personalizedTitle,
    subtitle: visionParams.subtitle || 'DREAM • BELIEVE • ACHIEVE',
    colors: {
      background: visionParams.colors?.background || (visionParams.isMasculine ? '#000000' : '#fdf8f0'),
      banner: visionParams.colors?.banner || (visionParams.isMasculine ? '#000000' : '#b8860b'),
      bannerText: visionParams.colors?.bannerText || (visionParams.isMasculine ? '#c9a962' : '#FFFFFF'),
      bannerSubtext: visionParams.isMasculine ? 'rgba(201,169,98,0.7)' : 'rgba(255,255,255,0.85)',
      accents: visionParams.colors?.accents || ['#FFD700', '#DAA520', '#F5DEB3', '#FFFACD']
    },
    style: {
      mood: styleMood,
      bokeh: !visionParams.isMasculine
    },
    photos: visionParams.photoPrompts || [
      "elegant planner on marble desk with gold accents",
      "sunrise over mountains, new beginnings",
      "cozy workspace with candles and plants",
      "fresh flowers in gold vase, morning light",
      "meditation cushion in peaceful room",
      "hiking trail through beautiful forest",
      "healthy breakfast spread, colorful fruits",
      "stack of inspiring books by window",
      "yoga mat with peaceful decor",
      "world map with travel pins",
      "journal and gold pen on soft blanket",
      "ocean waves at golden hour"
    ]
  };

  console.log(`[ThoughtChat API] Vision board parameters extracted:`, {
    title: engineInput.title,
    subtitle: engineInput.subtitle,
    mood: styleMood,
    photoCount: engineInput.photos.length
  });

  // Actually generate the vision board using V12 engine
  console.log(`[ThoughtChat API] Calling Vision Board Engine V12...`);

  const result = await generateVisionBoardV12(engineInput);

  if (!result || !result.filepath) {
    throw new Error('Vision board generation failed - no output file');
  }

  console.log(`[ThoughtChat API] Vision board generated: ${result.filepath}`);

  // Get just the filename from the full path
  const filename = path.basename(result.filepath);

  // Mark order as used
  let jobId: string | undefined;
  if (orderId) {
    const usageRecord = markOrderIdUsed(orderId, 'vision_board', 'image', filename);
    jobId = usageRecord.jobId;
    console.log(`[ThoughtChat API] Order marked as used: ${orderId} (job: ${jobId})`);
  }

  // Return the URL path to the generated image
  return {
    imageUrl: `/outputs/${filename}`,
    jobId
  };
}

async function generateClarityPlannerFromSession(session: any, orderId?: string): Promise<{
  pdfUrl: string;
  jobId?: string;
}> {
  const transcript = getConversationTranscript(session);

  // Generate clarity planner content using conversation
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const prompt = `You are creating a personalized Clarity Planner based on this substantive conversation:

<conversation_transcript>
${transcript}
</conversation_transcript>

Create a deeply personalized planner with these sections:
1. "What You're Processing" - Reflect back their situation in their own words
2. "The Heart of It" - What the core issue/desire really is
3. "What You're Feeling" - The emotional landscape you observed
4. "What You're Afraid Of" - The fears and concerns beneath the surface
5. "What You Actually Want" - Their deepest hopes and desires
6. "What's Getting in the Way" - The obstacles they've identified
7. "The Wisdom You Already Have" - Insights they shared that they might not have noticed
8. "Your Next Smallest Step" - One concrete action they can take
9. "Reflection Prompts" - 5-7 personalized journaling questions
10. "Permission Slip" - What they need to give themselves permission to do/feel/be

Make each section deeply specific to THEIR situation. Use their exact words where powerful. This should feel like someone truly heard them.

Return as JSON: { "sections": [{ "id": "section_id", "title": "Section Title", "content": "Content with markdown..." }] }`;

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

  const data = await response.json() as AnthropicResponse;
  const text = data.content[0].text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const plannerOutput: PlannerOutput = {
    productId: 'clarity_planner' as const,
    title: 'Your Clarity Planner',
    generatedAt: new Date().toISOString(),
    sections: parsed.sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content
    })),
    meaningModel: {
      productId: 'clarity_planner' as const,
      keyLifeAreas: [],
      timeframe: { id: 'custom' as const, label: 'Your Journey' },
      topGoals: [],
      majorTensions: [],
      coreThemes: [],
      constraints: [],
      distilledSummary: 'Generated from 30-minute reflection',
      emotionalWeather: 'Seeking clarity',
      opportunities: []
    }
  };

  // Render to PDF
  const outputDir = path.join(process.cwd(), 'outputs', 'planners');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filenameBase = orderId || 'chat';
  const filename = `clarity-planner-${filenameBase}-${Date.now()}.pdf`;
  const filepath = path.join(outputDir, filename);

  await renderPlannerToPDF(plannerOutput, filepath, {
    orderId,
    productId: 'clarity_planner'
  });

  // Mark order as used
  let jobId: string | undefined;
  if (orderId) {
    const usageRecord = markOrderIdUsed(orderId, 'clarity_planner', 'pdf', filename);
    jobId = usageRecord.jobId;
    console.log(`[ThoughtChat API] Order marked as used: ${orderId} (job: ${jobId})`);
  }

  return {
    pdfUrl: `/outputs/planners/${filename}`,
    jobId
  };
}

export default router;
