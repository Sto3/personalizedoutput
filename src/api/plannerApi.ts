/**
 * Planner API - Deep Personalization Endpoints
 *
 * Express router for Holiday Reset and New Year Reset planner generation.
 *
 * POST /api/planner/holiday-reset - Generate Holiday Relationship Reset planner
 * POST /api/planner/new-year-reset - Generate New Year Reflection Reset planner
 * GET /api/planner/schema/:productId - Get form schema for product
 * GET /api/planner/health - Health check
 */

import { Router, Request, Response } from 'express';
import { generateHolidayResetPlannerDeep } from '../lib/thoughtEngine/planners/generateHolidayResetDeep';
import { generateNewYearResetPlannerDeep } from '../lib/thoughtEngine/planners/generateNewYearResetDeep';
import { getHolidayResetFormSchema, normalizeHolidayResetAnswers } from '../lib/thoughtEngine/schemas/holidayResetFormSchema';
import { getNewYearResetFormSchema, normalizeNewYearResetAnswers } from '../lib/thoughtEngine/schemas/newYearResetFormSchema';
import { renderPlannerToPDF } from '../lib/thoughtEngine/pdf/renderPlannerPDF';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

interface PlannerGenerateRequest {
  answers: Record<string, unknown>;
}

interface PlannerGenerateResponse {
  success: boolean;
  pdfUrl?: string;
  error?: string;
  meta?: {
    productId: string;
    title: string;
    generationTimeMs: number;
    sectionCount: number;
  };
}

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// POST /api/planner/holiday-reset
// Generate Holiday Relationship Reset planner
// ============================================================

router.post('/holiday-reset', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { answers } = req.body as PlannerGenerateRequest;

  try {
    console.log('[Planner API] Generating Holiday Reset planner...');

    // Normalize answers from flat form data to structured input
    const normalizedAnswers = normalizeHolidayResetAnswers(answers);

    // Generate the planner
    const plannerOutput = await generateHolidayResetPlannerDeep(normalizedAnswers as any);

    // Render to PDF
    const outputDir = path.join(process.cwd(), 'outputs', 'planners');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `holiday-reset-${Date.now()}.pdf`;
    const filepath = path.join(outputDir, filename);

    await renderPlannerToPDF(plannerOutput, filepath);

    const totalTime = Date.now() - startTime;

    const response: PlannerGenerateResponse = {
      success: true,
      pdfUrl: `/outputs/planners/${filename}`,
      meta: {
        productId: plannerOutput.productId,
        title: plannerOutput.title,
        generationTimeMs: totalTime,
        sectionCount: plannerOutput.sections.length
      }
    };

    console.log(`[Planner API] Holiday Reset complete in ${totalTime}ms`);
    res.json(response);

  } catch (error) {
    const err = error as Error;
    console.error('[Planner API] Holiday Reset error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// ============================================================
// POST /api/planner/new-year-reset
// Generate New Year Reflection Reset planner
// ============================================================

router.post('/new-year-reset', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { answers } = req.body as PlannerGenerateRequest;

  try {
    console.log('[Planner API] Generating New Year Reset planner...');

    // Normalize answers from flat form data to structured input
    const normalizedAnswers = normalizeNewYearResetAnswers(answers);

    // Generate the planner
    const plannerOutput = await generateNewYearResetPlannerDeep(normalizedAnswers as any);

    // Render to PDF
    const outputDir = path.join(process.cwd(), 'outputs', 'planners');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `new-year-reset-${Date.now()}.pdf`;
    const filepath = path.join(outputDir, filename);

    await renderPlannerToPDF(plannerOutput, filepath);

    const totalTime = Date.now() - startTime;

    const response: PlannerGenerateResponse = {
      success: true,
      pdfUrl: `/outputs/planners/${filename}`,
      meta: {
        productId: plannerOutput.productId,
        title: plannerOutput.title,
        generationTimeMs: totalTime,
        sectionCount: plannerOutput.sections.length
      }
    };

    console.log(`[Planner API] New Year Reset complete in ${totalTime}ms`);
    res.json(response);

  } catch (error) {
    const err = error as Error;
    console.error('[Planner API] New Year Reset error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// ============================================================
// GET /api/planner/schema/:productId
// Get form schema for a specific product
// ============================================================

router.get('/schema/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    let schema;

    switch (productId) {
      case 'holiday_relationship_reset':
      case 'holiday-reset':
        schema = getHolidayResetFormSchema();
        break;
      case 'new_year_reflection_reset':
      case 'new-year-reset':
        schema = getNewYearResetFormSchema();
        break;
      default:
        return res.status(404).json({
          success: false,
          error: `Unknown product: ${productId}. Available: holiday-reset, new-year-reset`
        });
    }

    res.json(schema);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================
// GET /api/planner/schemas
// Get all available form schemas
// ============================================================

router.get('/schemas', (req: Request, res: Response) => {
  try {
    res.json({
      available: [
        {
          productId: 'holiday_relationship_reset',
          endpoint: '/api/planner/holiday-reset',
          schemaUrl: '/api/planner/schema/holiday-reset'
        },
        {
          productId: 'new_year_reflection_reset',
          endpoint: '/api/planner/new-year-reset',
          schemaUrl: '/api/planner/schema/new-year-reset'
        }
      ],
      schemas: {
        holiday_reset: getHolidayResetFormSchema(),
        new_year_reset: getNewYearResetFormSchema()
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
// GET /api/planner/health
// Health check
// ============================================================

router.get('/health', async (req: Request, res: Response) => {
  try {
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

    res.json({
      status: hasAnthropicKey ? 'ready' : 'degraded',
      anthropic: {
        configured: hasAnthropicKey
      },
      products: [
        {
          id: 'holiday_relationship_reset',
          name: 'Holiday Relationship Reset Planner',
          endpoint: 'POST /api/planner/holiday-reset'
        },
        {
          id: 'new_year_reflection_reset',
          name: 'New Year Reflection & Reset Planner',
          endpoint: 'POST /api/planner/new-year-reset'
        }
      ],
      endpoints: {
        holidayReset: 'POST /api/planner/holiday-reset',
        newYearReset: 'POST /api/planner/new-year-reset',
        schema: 'GET /api/planner/schema/:productId',
        schemas: 'GET /api/planner/schemas',
        health: 'GET /api/planner/health'
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
