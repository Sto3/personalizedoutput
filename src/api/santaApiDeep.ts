/**
 * Santa Message API - Deep Personalization Version
 *
 * Express router for Santa message generation with deep questionnaire support.
 *
 * POST /api/santa/generate - Generate Santa message with mode support
 * GET /api/santa/schema - Get form schema for front-end rendering
 * GET /api/santa/health - Health check
 */

import { Router, Request, Response } from 'express';
import { buildSantaScriptDeep } from '../lib/thoughtEngine/santa/buildSantaScriptDeep';
import { synthesizeSantaMessageWithRetry, checkTTSHealth } from '../lib/thoughtEngine/santa/ttsErrorHandler';
import { runSafetyCheck, DEFAULT_SAFETY_RULES } from '../lib/thoughtEngine/santa/safetyLayer';
import { validateAndAdjust } from '../lib/thoughtEngine/santa/lengthControl';
import { logGeneration, logScriptComplete, logTTSComplete, logError, getUsageStats } from '../lib/thoughtEngine/santa/analyticsLogger';
import { getSpendTracker, canGenerateAudio, recordAudioGeneration, getSpendStatus } from '../lib/thoughtEngine/santa/spendLimiter';
import { getSantaFormSchema } from '../lib/thoughtEngine/schemas/santaFormSchema';
import { markTokenRedeemed, validateToken } from '../lib/thoughtEngine/santa/tokenStore';
import {
  SantaQuestionnaireInput,
  validateSantaInput,
  inferPronouns
} from '../lib/thoughtEngine/configs/santa_questionnaire';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

export type GenerationMode = 'script_only' | 'audio_only' | 'full';

interface SantaGenerateRequest {
  answers: SantaQuestionnaireInput;
  mode?: GenerationMode;
  token?: string; // Access token from order claim
}

interface SantaGenerateResponse {
  success: boolean;
  mode: GenerationMode;
  script?: string;
  audioUrl?: string;
  error?: string;
  warnings?: string[];
  meta?: {
    childName: string;
    scenario: string;
    wordCount: number;
    estimatedDurationSeconds: number;
    audioFilename?: string;
    generationTimeMs: number;
    safetyCheckPassed: boolean;
    spendStatus?: {
      totalSpentThisMonth: number;
      limit: number;
      audioAllowed: boolean;
    };
  };
}

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// POST /api/santa/generate
// Generate Santa message with mode support
// ============================================================

router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { answers, mode = 'full', token } = req.body as SantaGenerateRequest;

  // Validate token if provided (required for production flow)
  if (token) {
    const tokenValidation = validateToken(token);
    if (!tokenValidation.valid) {
      const errorMessages = {
        'not_found': 'Invalid access token. Please start from your order link.',
        'expired': 'Your session has expired. Please contact support for assistance.',
        'redeemed': 'This order has already been used to generate a Santa message.'
      };
      return res.status(403).json({
        success: false,
        mode,
        error: errorMessages[tokenValidation.reason]
      });
    }
  }

  // Start analytics logging
  const logId = logGeneration(
    answers.childFirstName || 'Unknown',
    answers.childAge || 0,
    answers.primaryScenario || 'general_celebration'
  );

  try {
    // Validate input
    const validation = validateSantaInput(answers);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        mode,
        error: `Validation failed: ${validation.errors.join(', ')}`
      });
    }

    const warnings: string[] = [];
    let script: string | undefined;
    let audioUrl: string | undefined;
    let audioFilename: string | undefined;

    // ===== STEP 1: Generate Script (unless audio_only) =====
    if (mode !== 'audio_only') {
      console.log(`[Santa API] Generating script for ${answers.childFirstName}...`);

      const scriptOutput = await buildSantaScriptDeep(answers);
      script = scriptOutput.script;

      // Log script metrics
      const scriptTime = Date.now() - startTime;
      logScriptComplete(logId, script, answers.childFirstName, scriptTime);

      // Run safety check
      const safetyRules = {
        ...DEFAULT_SAFETY_RULES,
        allowChristianLanguage: answers.includeChristianMessage || false
      };
      const safetyResult = runSafetyCheck(script, answers.childFirstName, safetyRules);

      if (!safetyResult.passed) {
        const issues = safetyResult.issues.map(i => i.description);
        warnings.push(...issues);
        console.warn('[Santa API] Safety issues:', issues);
      }

      // Validate and adjust length
      const lengthResult = validateAndAdjust(script);
      if (!lengthResult.valid) {
        warnings.push(...lengthResult.notes);
      }
      script = lengthResult.script;

      console.log(`[Santa API] Script generated: ${lengthResult.wordCount} words (~${lengthResult.seconds}s)`);
    }

    // ===== STEP 2: Generate Audio (unless script_only) =====
    if (mode !== 'script_only' && script) {
      // Check spend limit
      const spendStatus = getSpendStatus();

      if (!canGenerateAudio()) {
        warnings.push(`SPEND LIMIT REACHED: $${spendStatus.totalSpentThisMonth.toFixed(2)} of $${spendStatus.limit} used this month. Audio generation skipped.`);
        console.warn('[Santa API] Spend limit reached - skipping audio generation');
      } else {
        console.log('[Santa API] Generating audio...');

        const ttsResult = await synthesizeSantaMessageWithRetry(script, logId);

        if (ttsResult.success && ttsResult.audioBuffer) {
          // Record the spend
          recordAudioGeneration(script.length);

          // Save audio file
          const outputDir = path.join(process.cwd(), 'outputs', 'santa');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          audioFilename = `santa-${answers.childFirstName.toLowerCase()}-${Date.now()}.mp3`;
          const filepath = path.join(outputDir, audioFilename);
          fs.writeFileSync(filepath, ttsResult.audioBuffer);

          audioUrl = `/outputs/santa/${audioFilename}`;

          // Log TTS success
          logTTSComplete(logId, true, ttsResult.retries, ttsResult.audioBuffer.length);

          console.log(`[Santa API] Audio saved: ${audioFilename}`);
        } else {
          const errorMsg = ttsResult.error?.message || 'Unknown TTS error';
          warnings.push(`Audio generation failed: ${errorMsg}`);
          logError(logId, errorMsg);
        }
      }
    }

    // ===== Build Response =====
    const totalTime = Date.now() - startTime;
    const spendStatus = getSpendStatus();

    const response: SantaGenerateResponse = {
      success: true,
      mode,
      script: mode !== 'audio_only' ? script : undefined,
      audioUrl: mode !== 'script_only' ? audioUrl : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      meta: {
        childName: answers.childFirstName,
        scenario: answers.primaryScenario,
        wordCount: script ? script.split(/\s+/).length : 0,
        estimatedDurationSeconds: script ? Math.round(script.split(/\s+/).length / 2.5) : 0,
        audioFilename,
        generationTimeMs: totalTime,
        safetyCheckPassed: warnings.filter(w => w.includes('Safety')).length === 0,
        spendStatus: {
          totalSpentThisMonth: spendStatus.totalSpentThisMonth,
          limit: spendStatus.limit,
          audioAllowed: spendStatus.audioAllowed
        }
      }
    };

    // Mark token as redeemed after successful generation
    if (token) {
      markTokenRedeemed(token);
      console.log(`[Santa API] Token marked as redeemed: ${token.substring(0, 8)}...`);
    }

    console.log(`[Santa API] Complete in ${totalTime}ms`);
    res.json(response);

  } catch (error) {
    const err = error as Error;
    console.error('[Santa API] Error:', err.message);
    logError(logId, err.message);

    res.status(500).json({
      success: false,
      mode,
      error: err.message || 'Internal server error'
    });
  }
});

// ============================================================
// GET /api/santa/schema
// Get form schema for front-end rendering
// ============================================================

router.get('/schema', (req: Request, res: Response) => {
  try {
    const schema = getSantaFormSchema();
    res.json(schema);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================
// GET /api/santa/stats
// Get usage statistics
// ============================================================

router.get('/stats', (req: Request, res: Response) => {
  try {
    const usageStats = getUsageStats();
    const spendStatus = getSpendStatus();

    res.json({
      usage: usageStats,
      spend: spendStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================
// GET /api/santa/health
// Health check
// ============================================================

router.get('/health', async (req: Request, res: Response) => {
  try {
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const ttsHealth = await checkTTSHealth();
    const spendStatus = getSpendStatus();

    res.json({
      status: hasAnthropicKey && ttsHealth.healthy ? 'ready' : 'degraded',
      anthropic: {
        configured: hasAnthropicKey
      },
      elevenLabs: ttsHealth,
      spend: spendStatus,
      endpoints: {
        generate: 'POST /api/santa/generate (modes: script_only, audio_only, full)',
        schema: 'GET /api/santa/schema',
        stats: 'GET /api/santa/stats',
        health: 'GET /api/santa/health'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
