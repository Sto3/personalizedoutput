/**
 * Santa Message API
 *
 * Express router for Santa message generation endpoints.
 *
 * POST /api/santa/generate - Full Santa message with audio
 * POST /api/santa/preview - Script only (no audio)
 * POST /api/santa/test - Dev test endpoint
 */

import { Router, Request, Response } from 'express';
import { buildSantaScript } from '../lib/thoughtEngine/santa/buildSantaScript';
import {
  synthesizeSantaMessage,
  saveSantaAudio,
  checkElevenLabsConfig,
  listAvailableVoices,
  estimateCost
} from '../lib/thoughtEngine/santa/elevenLabsClient';
import {
  SantaMessageInput,
  SantaScenario,
  SantaEnergyLevel,
  Pronouns
} from '../lib/thoughtEngine/models/userInput';

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// POST /api/santa/generate
// Full Santa message generation with audio
// ============================================================

interface SantaGenerateRequest {
  answers: {
    childName: string;
    pronunciation?: string;
    age: number | string;
    pronouns: Pronouns;
    scenario: SantaScenario;
    customScenario?: string;
    proudMoment: string;
    encouragementNote?: string;
    energyLevel: SantaEnergyLevel;
  };
}

interface SantaGenerateResponse {
  success: boolean;
  script?: string;
  audioUrl?: string;
  error?: string;
  meta?: {
    wordCount: number;
    estimatedDurationSeconds: number;
    audioFilename?: string;
    cost?: number;
  };
}

router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { answers } = req.body as SantaGenerateRequest;

    // Validate required fields
    const requiredFields = ['childName', 'age', 'pronouns', 'scenario', 'proudMoment', 'energyLevel'];
    for (const field of requiredFields) {
      if (!answers[field as keyof typeof answers]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    // Build Santa input
    const santaInput: SantaMessageInput = {
      childName: answers.childName,
      pronunciation: answers.pronunciation,
      age: typeof answers.age === 'string' ? parseInt(answers.age, 10) : answers.age,
      pronouns: answers.pronouns,
      scenario: answers.scenario,
      customScenario: answers.customScenario,
      proudMoment: answers.proudMoment,
      encouragementNote: answers.encouragementNote,
      energyLevel: answers.energyLevel
    };

    console.log(`[Santa API] Generating message for ${santaInput.childName}...`);

    // Step 1: Generate script using buildSantaScript
    console.log('  [1/2] Generating script...');
    const scriptOutput = await buildSantaScript(santaInput);
    console.log(`  [1/2] Script generated (${scriptOutput.wordCount} words)`);

    // Step 2: Generate audio using synthesizeSantaMessage
    console.log('  [2/2] Generating audio...');
    const audioBuffer = await synthesizeSantaMessage(scriptOutput.script);

    // Step 3: Save audio to disk
    const { filepath, filename } = await saveSantaAudio(audioBuffer);
    const audioUrl = `/outputs/santa/${filename}`;
    console.log(`  [2/2] Audio saved: ${filename}`);

    const totalTime = Date.now() - startTime;
    console.log(`[Santa API] Complete in ${totalTime}ms`);

    // Return response
    const response: SantaGenerateResponse = {
      success: true,
      script: scriptOutput.script,
      audioUrl: audioUrl,
      meta: {
        wordCount: scriptOutput.wordCount,
        estimatedDurationSeconds: scriptOutput.estimatedDurationSeconds,
        audioFilename: filename,
        cost: estimateCost(scriptOutput.script.length)
      }
    };

    res.json(response);

  } catch (error) {
    const err = error as Error;
    console.error('[Santa API] Error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// ============================================================
// POST /api/santa/preview
// Generate script only (no audio) for preview/editing
// ============================================================

router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { answers } = req.body as SantaGenerateRequest;

    // Validate required fields
    const requiredFields = ['childName', 'age', 'pronouns', 'scenario', 'proudMoment', 'energyLevel'];
    for (const field of requiredFields) {
      if (!answers[field as keyof typeof answers]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    const santaInput: SantaMessageInput = {
      childName: answers.childName,
      pronunciation: answers.pronunciation,
      age: typeof answers.age === 'string' ? parseInt(answers.age, 10) : answers.age,
      pronouns: answers.pronouns,
      scenario: answers.scenario,
      customScenario: answers.customScenario,
      proudMoment: answers.proudMoment,
      encouragementNote: answers.encouragementNote,
      energyLevel: answers.energyLevel
    };

    const scriptOutput = await buildSantaScript(santaInput);

    res.json({
      success: true,
      script: scriptOutput.script,
      meta: {
        wordCount: scriptOutput.wordCount,
        estimatedDurationSeconds: scriptOutput.estimatedDurationSeconds
      }
    });

  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================================
// POST /api/santa/test
// Dev test endpoint - quick test with minimal input
// ============================================================

interface SantaTestRequest {
  name: string;
  scenario?: string;
}

router.post('/test', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { name, scenario } = req.body as SantaTestRequest;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: name'
      });
    }

    console.log(`[Santa Test] Generating test message for ${name}...`);

    // Build test input with defaults
    const testInput: SantaMessageInput = {
      childName: name,
      age: 8,
      pronouns: 'they',
      scenario: (scenario as SantaScenario) || 'improving_grades',
      proudMoment: `${name} has been working really hard this year and showing great improvement in school. They always try their best and never give up, even when things are difficult.`,
      encouragementNote: 'Keep being curious and keep trying your best!',
      energyLevel: 'cheerful'
    };

    // Step 1: Generate script
    console.log('  [1/2] Generating test script...');
    const scriptOutput = await buildSantaScript(testInput);
    console.log(`  [1/2] Script: ${scriptOutput.wordCount} words`);

    // Step 2: Generate audio
    console.log('  [2/2] Generating test audio...');
    const audioBuffer = await synthesizeSantaMessage(scriptOutput.script);

    // Step 3: Save audio
    const { filepath, filename } = await saveSantaAudio(audioBuffer);
    const audioUrl = `/outputs/santa/${filename}`;
    console.log(`  [2/2] Audio saved: ${filename}`);

    const totalTime = Date.now() - startTime;
    console.log(`[Santa Test] Complete in ${totalTime}ms`);

    res.json({
      success: true,
      script: scriptOutput.script,
      audioUrl: audioUrl,
      meta: {
        childName: name,
        scenario: testInput.scenario,
        wordCount: scriptOutput.wordCount,
        estimatedDurationSeconds: scriptOutput.estimatedDurationSeconds,
        audioFilename: filename,
        generationTimeMs: totalTime
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[Santa Test] Error:', err.message);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================================
// GET /api/santa/scenarios
// List available Santa scenarios
// ============================================================

router.get('/scenarios', (req: Request, res: Response) => {
  const scenarios = [
    {
      id: 'overcoming_bullying',
      label: 'Overcoming bullying / standing up for themselves',
      description: 'For children who have faced bullying and shown courage'
    },
    {
      id: 'improving_grades',
      label: 'Working hard in class / improving grades',
      description: 'For children who have put effort into their schoolwork'
    },
    {
      id: 'tough_year',
      label: 'Being brave through a tough year',
      description: 'For children who have navigated family changes, moves, or other challenges'
    },
    {
      id: 'kindness_helpfulness',
      label: 'Being especially kind or helpful at home',
      description: 'For children who have shown kindness to family members'
    },
    {
      id: 'bravery',
      label: 'Showing courage and bravery',
      description: 'For children who have been brave in any situation'
    },
    {
      id: 'custom',
      label: 'Custom (Tell Santa what to mention)',
      description: 'Write your own scenario for Santa to address'
    }
  ];

  res.json({ scenarios });
});

// ============================================================
// GET /api/santa/voices
// List available ElevenLabs voices (for setup)
// ============================================================

router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await listAvailableVoices();

    res.json({
      totalVoices: voices.length,
      voices: voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        labels: v.labels,
        previewUrl: v.preview_url
      }))
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
// Health check for Santa engine
// ============================================================

router.get('/health', (req: Request, res: Response) => {
  const elevenLabsConfig = checkElevenLabsConfig();
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  res.json({
    status: elevenLabsConfig.configured && hasAnthropicKey ? 'ready' : 'not_configured',
    anthropic: {
      configured: hasAnthropicKey
    },
    elevenLabs: elevenLabsConfig,
    endpoints: {
      generate: 'POST /api/santa/generate',
      preview: 'POST /api/santa/preview',
      test: 'POST /api/santa/test',
      scenarios: 'GET /api/santa/scenarios',
      voices: 'GET /api/santa/voices'
    }
  });
});

export default router;
