/**
 * Azure Speech TTS Service
 *
 * Alternative to ElevenLabs for more authoritative voice options.
 * Uses Azure Neural TTS with SSML for precise prosody control.
 *
 * IMPACT: Provides fallback when ElevenLabs is unavailable,
 * and offers alternative voice styles (narration-professional, newscast-formal)
 * that may sound more authoritative for certain use cases.
 */

import axios from 'axios';
import { VoiceGender } from './types';

// Azure Speech pricing: ~$16 per 1M characters for neural voices
const COST_PER_1000_CHARS = 0.016;

// Azure Neural Voice Names for professional, authoritative sound
const AZURE_VOICES: Record<VoiceGender, string> = {
  female: 'en-US-JennyNeural',    // Professional female
  male: 'en-US-GuyNeural'         // Professional male
};

// Alternative voices to try:
// - en-US-AriaNeural (female, conversational)
// - en-US-DavisNeural (male, authoritative)
// - en-US-SaraNeural (female, warm)

interface AzureTTSConfig {
  subscriptionKey: string;
  region: string;
}

let config: AzureTTSConfig | null = null;

/**
 * Initialize Azure TTS with credentials
 */
export function initAzureTTS(): boolean {
  const subscriptionKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';

  if (!subscriptionKey) {
    console.log('[Azure TTS] No AZURE_SPEECH_KEY found, Azure TTS unavailable');
    return false;
  }

  config = { subscriptionKey, region };
  console.log(`[Azure TTS] Initialized with region: ${region}`);
  return true;
}

/**
 * Check if Azure TTS is available
 */
export function isAzureTTSAvailable(): boolean {
  return config !== null;
}

/**
 * Generate speech using Azure Neural TTS with SSML
 *
 * @param text - Text to speak
 * @param gender - Voice gender
 * @param style - Speaking style (narration-professional, newscast-formal, assistant)
 * @returns Audio buffer (MP3 format)
 */
export async function speakAzure(
  text: string,
  gender: VoiceGender = 'female',
  style: 'narration-professional' | 'newscast-formal' | 'assistant' | 'friendly' = 'narration-professional'
): Promise<Buffer | null> {
  if (!config) {
    console.error('[Azure TTS] Not initialized');
    return null;
  }

  const voiceName = AZURE_VOICES[gender];

  // Build SSML for precise control
  // - rate="-5%" slightly slower for authority
  // - pitch="-2%" slightly lower for maturity
  // - style for professional tone
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
           xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="${voiceName}">
        <prosody rate="-5%" pitch="-2%">
          <mstts:express-as style="${style}" styledegree="1.5">
            ${escapeXml(text)}
          </mstts:express-as>
        </prosody>
      </voice>
    </speak>
  `.trim();

  try {
    const tokenUrl = `https://${config.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    const ttsUrl = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    // Get access token
    const tokenResponse = await axios.post(tokenUrl, null, {
      headers: {
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = tokenResponse.data;

    // Generate speech
    const response = await axios.post(ttsUrl, ssml, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'Redi'
      },
      responseType: 'arraybuffer'
    });

    console.log(`[Azure TTS] Generated ${text.length} chars with ${voiceName} (${style})`);

    return Buffer.from(response.data);

  } catch (error: any) {
    console.error('[Azure TTS] Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Escape XML special characters for SSML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calculate cost for Azure TTS
 */
export function calculateAzureCost(characterCount: number): number {
  return (characterCount / 1000) * COST_PER_1000_CHARS;
}
