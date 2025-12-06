/**
 * Thought Engine API
 *
 * Express router for planner generation endpoints.
 *
 * POST /api/thought-engine/generate
 * Body: { productId, answers }
 * Response: { pdfUrl }
 */

import { Router, Request, Response } from 'express';
import { normalizeAnswersToUserInput, RawAnswers } from '../lib/thoughtEngine/engines/normalizeAnswersToUserInput';
import { buildMeaningModel } from '../lib/thoughtEngine/engines/buildMeaningModel';
import { generateSections } from '../lib/thoughtEngine/engines/generateSections';
import { renderPdf } from '../lib/thoughtEngine/engines/renderPdf';
import { getProductConfig, PRODUCT_CONFIGS } from '../lib/thoughtEngine/models/productConfig';
import { ProductId } from '../lib/thoughtEngine/models/userInput';

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// POST /api/thought-engine/generate
// ============================================================

interface GenerateRequest {
  productId: ProductId;
  answers: RawAnswers;
  userId?: string;
}

interface GenerateResponse {
  success: boolean;
  pdfUrl?: string;
  pdfPath?: string;
  error?: string;
  timing?: {
    totalMs: number;
    normalizeMs: number;
    meaningModelMs: number;
    generateSectionsMs: number;
    renderPdfMs: number;
  };
}

router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const timing = {
    normalizeMs: 0,
    meaningModelMs: 0,
    generateSectionsMs: 0,
    renderPdfMs: 0,
    totalMs: 0
  };

  try {
    const { productId, answers, userId } = req.body as GenerateRequest;

    // Validate productId
    if (!productId || !PRODUCT_CONFIGS[productId]) {
      return res.status(400).json({
        success: false,
        error: `Invalid productId. Must be one of: ${Object.keys(PRODUCT_CONFIGS).join(', ')}`
      });
    }

    // Get product config
    const config = getProductConfig(productId);

    // Only planners are supported on this endpoint
    if (config.productType !== 'planner') {
      return res.status(400).json({
        success: false,
        error: `Product "${productId}" is not a planner. Use /api/santa/generate for scripts.`
      });
    }

    // Validate answers
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid answers object'
      });
    }

    console.log(`[ThoughtEngine] Generating ${productId} planner...`);

    // Step 1: Normalize answers
    let stepStart = Date.now();
    const userInput = normalizeAnswersToUserInput(answers, productId, userId);
    timing.normalizeMs = Date.now() - stepStart;
    console.log(`  [1/4] Normalized answers (${timing.normalizeMs}ms)`);

    // Step 2: Build meaning model
    stepStart = Date.now();
    const meaningModel = await buildMeaningModel(userInput, config);
    timing.meaningModelMs = Date.now() - stepStart;
    console.log(`  [2/4] Built meaning model (${timing.meaningModelMs}ms)`);

    // Step 3: Generate sections
    stepStart = Date.now();
    const plannerOutput = await generateSections(meaningModel, userInput, config);
    timing.generateSectionsMs = Date.now() - stepStart;
    console.log(`  [3/4] Generated sections (${timing.generateSectionsMs}ms)`);

    // Step 4: Render PDF
    stepStart = Date.now();
    const pdfResult = await renderPdf(plannerOutput, config);
    timing.renderPdfMs = Date.now() - stepStart;
    console.log(`  [4/4] Rendered PDF (${timing.renderPdfMs}ms)`);

    timing.totalMs = Date.now() - startTime;
    console.log(`[ThoughtEngine] Complete! Total: ${timing.totalMs}ms`);

    // Return success
    const response: GenerateResponse = {
      success: true,
      pdfPath: pdfResult.filepath,
      pdfUrl: `/outputs/${pdfResult.filename}`, // Adjust based on your static file serving
      timing
    };

    res.json(response);

  } catch (error) {
    const err = error as Error;
    console.error('[ThoughtEngine] Error:', err.message);
    console.error(err.stack);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      timing: {
        ...timing,
        totalMs: Date.now() - startTime
      }
    });
  }
});

// ============================================================
// GET /api/thought-engine/products
// ============================================================

router.get('/products', (req: Request, res: Response) => {
  const products = Object.values(PRODUCT_CONFIGS)
    .filter(p => p.productType === 'planner')
    .map(p => ({
      id: p.id,
      label: p.label,
      primaryLifeArea: p.primaryLifeArea,
      defaultTimeframe: p.defaultTimeframe,
      targetSessionMinutes: p.targetSessionMinutes,
      sections: p.sections.map(s => ({ id: s.id, title: s.title }))
    }));

  res.json({ products });
});

// ============================================================
// GET /api/thought-engine/health
// ============================================================

router.get('/health', (req: Request, res: Response) => {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  res.json({
    status: 'ok',
    hasAnthropicKey,
    availableProducts: Object.keys(PRODUCT_CONFIGS).filter(
      id => PRODUCT_CONFIGS[id as ProductId].productType === 'planner'
    )
  });
});

export default router;
