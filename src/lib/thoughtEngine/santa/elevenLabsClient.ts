/**
 * ElevenLabs Client
 *
 * Text-to-speech synthesis for Santa voice messages.
 * Supports two voice variants:
 * - "warm": Deep American Santa (more resonance, emotional)
 * - "gentle": Soft Grandfatherly American (smooth, subtle)
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  SANTA_VOICE_SETTINGS,
  SANTA_MODEL_CONFIG,
  SANTA_VOICE_DIRECTIVE,
  getSantaVoiceSettings,
  preprocessSantaScript,
  type SantaVoiceVariant
} from './voiceSettings';

// ============================================================
// CONFIGURATION
// ============================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// ============================================================
// TYPES
// ============================================================

export interface SynthesisResult {
  audioBuffer: Buffer;
  filepath: string;
  filename: string;
}

// ============================================================
// MAIN FUNCTION - synthesizeSantaMessage
// ============================================================

/**
 * Synthesize Santa voice message using ElevenLabs TTS API.
 *
 * @param text - The script text to convert to speech
 * @param variant - Voice variant: 'warm' (deep) or 'gentle' (soft) - default 'warm'
 * @returns Buffer containing MP3 audio data
 */
export async function synthesizeSantaMessage(
  text: string,
  variant: SantaVoiceVariant = 'warm'
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not set in environment');
  }

  if (!voiceId) {
    throw new Error('ELEVENLABS_SANTA_VOICE_ID not set in environment');
  }

  // Get voice settings for the selected variant
  const voiceSettings = getSantaVoiceSettings(variant);
  const variantName = variant === 'warm' ? 'Warm Santa' : 'Gentle Santa';

  console.log(`[ElevenLabs] Synthesizing ${variantName} message (${text.length} chars)...`);
  console.log(`[ElevenLabs] Settings: stability=${voiceSettings.stability}, style=${voiceSettings.style}`);

  // Preprocess text for better delivery
  const processedText = preprocessSantaScript(text);

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    data: {
      text: processedText,
      model_id: SANTA_MODEL_CONFIG.model_id,
      voice_settings: voiceSettings
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);
  console.log(`[ElevenLabs] ${variantName} audio generated: ${audioBuffer.length} bytes`);

  return audioBuffer;
}

// ============================================================
// FILE SAVING
// ============================================================

/**
 * Save Santa audio buffer to disk.
 *
 * @param audioBuffer - MP3 audio buffer
 * @param outputDir - Directory to save file (default: outputs/santa)
 * @returns Object with filepath and filename
 */
export async function saveSantaAudio(
  audioBuffer: Buffer,
  outputDir: string = 'outputs/santa'
): Promise<{ filepath: string; filename: string }> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate unique filename
  const filename = `santa-${uuidv4()}.mp3`;
  const filepath = path.join(outputDir, filename);

  // Write file
  fs.writeFileSync(filepath, audioBuffer);
  console.log(`[ElevenLabs] Saved audio: ${filepath}`);

  return { filepath, filename };
}

/**
 * Generate and save Santa audio in one call.
 *
 * @param text - Script text to synthesize
 * @param outputDir - Directory to save file
 * @returns Full synthesis result with buffer and file info
 */
export async function generateAndSaveSantaAudio(
  text: string,
  outputDir: string = 'outputs/santa'
): Promise<SynthesisResult> {
  const audioBuffer = await synthesizeSantaMessage(text);
  const { filepath, filename } = await saveSantaAudio(audioBuffer, outputDir);

  return {
    audioBuffer,
    filepath,
    filename
  };
}

// ============================================================
// VOICE MANAGEMENT (for setup/debugging)
// ============================================================

/**
 * List all available voices from ElevenLabs account.
 */
export async function listAvailableVoices(): Promise<any[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not set');
  }

  const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      'xi-api-key': apiKey
    }
  });

  return response.data.voices || [];
}

/**
 * Get details about a specific voice.
 */
export async function getVoiceDetails(voiceId: string): Promise<any> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not set');
  }

  const response = await axios.get(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
    headers: {
      'xi-api-key': apiKey
    }
  });

  return response.data;
}

// ============================================================
// COST ESTIMATION
// ============================================================

/**
 * Estimate cost for audio generation.
 * ElevenLabs pricing: ~$0.30 per 1000 characters (varies by plan)
 */
export function estimateCost(characterCount: number): number {
  const costPer1000Chars = 0.30;
  return (characterCount / 1000) * costPer1000Chars;
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Check if ElevenLabs is properly configured.
 */
export function checkElevenLabsConfig(): {
  configured: boolean;
  hasApiKey: boolean;
  hasVoiceId: boolean;
  voiceId?: string;
} {
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
  const hasVoiceId = !!process.env.ELEVENLABS_SANTA_VOICE_ID;

  return {
    configured: hasApiKey && hasVoiceId,
    hasApiKey,
    hasVoiceId,
    voiceId: hasVoiceId ? process.env.ELEVENLABS_SANTA_VOICE_ID : undefined
  };
}

// ============================================================
// EXPORTS
// ============================================================

export { SANTA_VOICE_SETTINGS };
export type { SantaVoiceVariant };
