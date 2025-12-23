/**
 * ElevenLabs TTS Error Handler
 *
 * Provides robust error handling, retry logic, and fallback strategies
 * for text-to-speech generation.
 */

import axios, { AxiosError } from 'axios';
import { logTTSComplete, logError } from './analyticsLogger';
import {
  SANTA_VOICE_SETTINGS as OPTIMIZED_VOICE_SETTINGS,
  SANTA_MODEL_CONFIG,
  preprocessSantaScript
} from './voiceSettings';

// ============================================================
// CONFIGURATION
// ============================================================

export const TTS_CONFIG = {
  maxRetries: 3,
  initialRetryDelayMs: 1000,
  maxRetryDelayMs: 10000,
  retryMultiplier: 2,
  timeoutMs: 30000,
  rateLimitBackoffMs: 60000
};

export const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Use the optimized/perfected voice settings from voiceSettings.ts
export const SANTA_VOICE_SETTINGS = OPTIMIZED_VOICE_SETTINGS;

// ============================================================
// TYPES
// ============================================================

export interface TTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioSizeBytes?: number;
  error?: TTSError;
  retries: number;
  totalTimeMs: number;
}

export interface TTSError {
  type: TTSErrorType;
  message: string;
  retriable: boolean;
  statusCode?: number;
  rawError?: unknown;
}

export type TTSErrorType =
  | 'rate_limit'
  | 'quota_exceeded'
  | 'authentication_failed'
  | 'invalid_voice'
  | 'invalid_text'
  | 'text_too_long'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'unknown';

// ============================================================
// ERROR CLASSIFICATION
// ============================================================

function classifyError(error: unknown): TTSError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data as Record<string, unknown> | undefined;
    const message = (data?.detail as Record<string, unknown>)?.message as string
      || (data?.error as string)
      || axiosError.message;

    // Rate limiting
    if (status === 429) {
      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded. Please wait before trying again.',
        retriable: true,
        statusCode: 429,
        rawError: error
      };
    }

    // Quota exceeded
    if (status === 402 || message?.toLowerCase().includes('quota')) {
      return {
        type: 'quota_exceeded',
        message: 'API quota exceeded. Please check your ElevenLabs subscription.',
        retriable: false,
        statusCode: status,
        rawError: error
      };
    }

    // Authentication
    if (status === 401 || status === 403) {
      return {
        type: 'authentication_failed',
        message: 'Invalid API key or insufficient permissions.',
        retriable: false,
        statusCode: status,
        rawError: error
      };
    }

    // Invalid voice
    if (status === 404 && message?.toLowerCase().includes('voice')) {
      return {
        type: 'invalid_voice',
        message: 'Voice ID not found. Please check ELEVENLABS_SANTA_VOICE_ID.',
        retriable: false,
        statusCode: 404,
        rawError: error
      };
    }

    // Text validation errors
    if (status === 400) {
      if (message?.toLowerCase().includes('text too long')) {
        return {
          type: 'text_too_long',
          message: 'Script is too long for TTS generation.',
          retriable: false,
          statusCode: 400,
          rawError: error
        };
      }
      return {
        type: 'invalid_text',
        message: `Invalid text input: ${message}`,
        retriable: false,
        statusCode: 400,
        rawError: error
      };
    }

    // Server errors (retriable)
    if (status && status >= 500) {
      return {
        type: 'server_error',
        message: `ElevenLabs server error (${status}). Will retry.`,
        retriable: true,
        statusCode: status,
        rawError: error
      };
    }

    // Network errors
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      return {
        type: 'network_error',
        message: 'Network connection failed. Check internet connection.',
        retriable: true,
        rawError: error
      };
    }

    // Timeout
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        type: 'timeout',
        message: 'Request timed out. Will retry.',
        retriable: true,
        rawError: error
      };
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
    retriable: true,
    rawError: error
  };
}

// ============================================================
// RETRY LOGIC
// ============================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateRetryDelay(attempt: number, error: TTSError): number {
  // Special handling for rate limits
  if (error.type === 'rate_limit') {
    return TTS_CONFIG.rateLimitBackoffMs;
  }

  // Exponential backoff
  const delay = TTS_CONFIG.initialRetryDelayMs * Math.pow(TTS_CONFIG.retryMultiplier, attempt);
  return Math.min(delay, TTS_CONFIG.maxRetryDelayMs);
}

// ============================================================
// MAIN TTS FUNCTION WITH RETRY
// ============================================================

export async function synthesizeSantaMessageWithRetry(
  text: string,
  logId?: string
): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  if (!apiKey) {
    const error: TTSError = {
      type: 'authentication_failed',
      message: 'ELEVENLABS_API_KEY not set in environment',
      retriable: false
    };
    return { success: false, error, retries: 0, totalTimeMs: 0 };
  }

  if (!voiceId) {
    const error: TTSError = {
      type: 'invalid_voice',
      message: 'ELEVENLABS_SANTA_VOICE_ID not set in environment',
      retriable: false
    };
    return { success: false, error, retries: 0, totalTimeMs: 0 };
  }

  const startTime = Date.now();
  let lastError: TTSError | undefined;

  for (let attempt = 0; attempt <= TTS_CONFIG.maxRetries; attempt++) {
    try {
      // Log retry attempt
      if (attempt > 0) {
        console.log(`TTS retry attempt ${attempt}/${TTS_CONFIG.maxRetries}...`);
      }

      // Preprocess the script for better Santa delivery
      const processedText = preprocessSantaScript(text);

      console.log(`[TTS] Using optimized settings: model=${SANTA_MODEL_CONFIG.model_id}, stability=${SANTA_VOICE_SETTINGS.stability}, style=${SANTA_VOICE_SETTINGS.style}`);

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
          model_id: SANTA_MODEL_CONFIG.model_id, // eleven_multilingual_v2
          voice_settings: SANTA_VOICE_SETTINGS   // Optimized warm Santa settings
        },
        responseType: 'arraybuffer',
        timeout: TTS_CONFIG.timeoutMs
      });

      const audioBuffer = Buffer.from(response.data);
      const totalTimeMs = Date.now() - startTime;

      // Log success
      if (logId) {
        logTTSComplete(logId, true, attempt, audioBuffer.length);
      }

      return {
        success: true,
        audioBuffer,
        audioSizeBytes: audioBuffer.length,
        retries: attempt,
        totalTimeMs
      };

    } catch (error) {
      lastError = classifyError(error);

      // Don't retry non-retriable errors
      if (!lastError.retriable) {
        break;
      }

      // Don't retry on last attempt
      if (attempt === TTS_CONFIG.maxRetries) {
        break;
      }

      // Calculate and wait for retry delay
      const delay = calculateRetryDelay(attempt, lastError);
      console.log(`TTS error (${lastError.type}): ${lastError.message}`);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retries failed
  const totalTimeMs = Date.now() - startTime;

  if (logId && lastError) {
    logError(logId, lastError.message);
  }

  return {
    success: false,
    error: lastError,
    retries: TTS_CONFIG.maxRetries,
    totalTimeMs
  };
}

// ============================================================
// HEALTH CHECK
// ============================================================

export async function checkTTSHealth(): Promise<{
  healthy: boolean;
  message: string;
  quotaRemaining?: number;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      healthy: false,
      message: 'ELEVENLABS_API_KEY not configured'
    };
  }

  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/user/subscription`, {
      headers: { 'xi-api-key': apiKey },
      timeout: 5000
    });

    const data = response.data;
    const charactersRemaining = data.character_limit - data.character_count;

    return {
      healthy: charactersRemaining > 1000,
      message: `${charactersRemaining} characters remaining`,
      quotaRemaining: charactersRemaining
    };

  } catch (error) {
    const ttsError = classifyError(error);
    return {
      healthy: false,
      message: ttsError.message
    };
  }
}

// ============================================================
// VOICE VALIDATION
// ============================================================

export async function validateVoice(): Promise<{
  valid: boolean;
  voiceName?: string;
  message: string;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  if (!apiKey || !voiceId) {
    return {
      valid: false,
      message: 'Missing API key or voice ID'
    };
  }

  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      headers: { 'xi-api-key': apiKey },
      timeout: 5000
    });

    return {
      valid: true,
      voiceName: response.data.name,
      message: `Voice "${response.data.name}" is valid and ready`
    };

  } catch (error) {
    const ttsError = classifyError(error);
    return {
      valid: false,
      message: ttsError.message
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { classifyError };
