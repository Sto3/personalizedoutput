/**
 * Thought Engine
 *
 * Main entry point for the Thought Organizer / Planner engine.
 * Exports all public functions and types.
 */

// ============================================================
// MODELS
// ============================================================

export * from './models/userInput';
export * from './models/meaningModel';
export * from './models/productConfig';

// ============================================================
// ENGINES
// ============================================================

export { normalizeAnswersToUserInput } from './engines/normalizeAnswersToUserInput';
export { buildMeaningModel } from './engines/buildMeaningModel';
export { generateSections, estimatePlannerCost } from './engines/generateSections';
export { renderPdf, getDefaultTemplate } from './engines/renderPdf';

// ============================================================
// SANTA
// ============================================================

export { buildSantaScript } from './santa/buildSantaScript';
export {
  synthesizeSantaMessage,
  saveSantaAudio,
  listAvailableVoices,
  checkElevenLabsConfig,
  estimateCost as estimateAudioCost,
  SANTA_VOICE_SETTINGS
} from './santa/elevenLabsClient';

// ============================================================
// HIGH-LEVEL FUNCTIONS
// ============================================================

import { normalizeAnswersToUserInput, RawAnswers } from './engines/normalizeAnswersToUserInput';
import { buildMeaningModel } from './engines/buildMeaningModel';
import { generateSections } from './engines/generateSections';
import { renderPdf, PdfRenderResult } from './engines/renderPdf';
import { getProductConfig } from './models/productConfig';
import { ProductId, SantaMessageInput } from './models/userInput';
import { PlannerOutput, SantaMessageOutput } from './models/meaningModel';
import { buildSantaScript } from './santa/buildSantaScript';
import { synthesizeSantaMessage, saveSantaAudio } from './santa/elevenLabsClient';

/**
 * Generate a complete planner from raw form answers.
 * This is the main entry point for planner generation.
 */
export async function generatePlanner(
  productId: ProductId,
  answers: RawAnswers,
  userId?: string,
  outputDir?: string
): Promise<{ planner: PlannerOutput; pdf: PdfRenderResult }> {
  const config = getProductConfig(productId);

  if (config.productType !== 'planner') {
    throw new Error(`Product "${productId}" is not a planner type`);
  }

  // Step 1: Normalize
  const userInput = normalizeAnswersToUserInput(answers, productId, userId);

  // Step 2: Build meaning model
  const meaningModel = await buildMeaningModel(userInput, config);

  // Step 3: Generate sections
  const planner = await generateSections(meaningModel, userInput, config);

  // Step 4: Render PDF
  const pdf = await renderPdf(planner, config, outputDir);

  return { planner, pdf };
}

/**
 * Generate a complete Santa message with audio.
 * This is the main entry point for Santa message generation.
 */
export async function generateSantaMessage(
  input: SantaMessageInput,
  includeAudio: boolean = true,
  outputDir?: string
): Promise<SantaMessageOutput> {
  // Step 1: Generate script
  const scriptOutput = await buildSantaScript(input);

  const result: SantaMessageOutput = {
    script: scriptOutput,
    generatedAt: new Date().toISOString()
  };

  // Step 2: Generate audio (if requested)
  if (includeAudio) {
    try {
      const audioBuffer = await synthesizeSantaMessage(scriptOutput.script);
      result.audioBuffer = audioBuffer;

      // Save to file if outputDir provided
      if (outputDir) {
        const { filepath } = await saveSantaAudio(audioBuffer, outputDir);
        result.audioUrl = filepath;
      }
    } catch (error) {
      console.warn('Audio generation failed:', (error as Error).message);
      // Continue without audio
    }
  }

  return result;
}
