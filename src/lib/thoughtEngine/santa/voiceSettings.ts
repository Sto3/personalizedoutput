/**
 * Santa Voice Settings
 *
 * Two ElevenLabs voice variants for Santa:
 *
 * VARIANT 1: "Warm Santa" (deep American)
 * - Deeper pitch, classic Santa warmth
 * - More resonance, slightly more emotional
 * - American accent, not British
 *
 * VARIANT 2: "Gentle Santa" (soft grandfatherly American)
 * - Softer, gentler delivery
 * - Higher stability for smoother flow
 * - Subtle emotional presence
 *
 * Common Goals:
 * - American accent, not British
 * - Slow-medium pacing (gentle, comforting)
 * - Grandfatherly resonance
 * - Avoid cartoonish "Ho Ho Ho" sound
 * - No theatrical acting
 */

// ============================================================
// VOICE VARIANT TYPE
// ============================================================

export type SantaVoiceVariant = 'warm' | 'gentle';

// ============================================================
// WARM SANTA - Perfected settings (matches perfected demos)
// ============================================================

export const WARM_SANTA_SETTINGS = {
  // Lower stability = more natural speech variation
  stability: 0.68,

  // Higher similarity for character consistency
  similarity_boost: 0.82,

  // Moderate style for warmth without theatrics
  style: 0.32,

  // Speaker boost for clarity
  use_speaker_boost: true
};

// ============================================================
// GENTLE SANTA - Soft Grandfatherly American (smooth, subtle)
// ============================================================

export const GENTLE_SANTA_SETTINGS = {
  // Higher stability for smoother, gentler delivery
  stability: 0.82,

  // Moderate similarity for softer, less intense voice
  similarity_boost: 0.75,

  // Lower style for subtle, understated emotion
  style: 0.30,

  // Speaker boost for clarity
  use_speaker_boost: true
};

// ============================================================
// DEFAULT (for backward compatibility)
// ============================================================

export const SANTA_VOICE_SETTINGS = WARM_SANTA_SETTINGS;

// ============================================================
// MODEL CONFIGURATION
// ============================================================

export const SANTA_MODEL_CONFIG = {
  // Using monolingual v1 (matches perfected demos - better for English)
  model_id: 'eleven_monolingual_v1',

  // Output format
  output_format: 'mp3_44100_128'
};

// ============================================================
// VOICE DIRECTIVE
// ============================================================

// Text directive prepended to help guide the voice style
// This helps ElevenLabs understand the desired delivery
export const SANTA_VOICE_DIRECTIVE = `[Speaking in a deep, warm American voice with gentle pacing and grandfatherly resonance]`;

// ============================================================
// SPEECH PATTERNS
// ============================================================

// Preprocessing rules to improve Santa's natural speech pattern
export function preprocessSantaScript(text: string): string {
  let processed = text;

  // Add natural pauses with commas for better pacing
  // (Only if not already present)

  // Add slight pause after child's name for warmth
  processed = processed.replace(/^(\w+),\s*/g, '$1... ');

  // Ensure ellipsis creates proper pause
  processed = processed.replace(/\.\.\./g, '... ');

  return processed;
}

// ============================================================
// FULL REQUEST BODY BUILDER
// ============================================================

export function buildSantaTTSRequest(text: string): {
  text: string;
  model_id: string;
  voice_settings: typeof SANTA_VOICE_SETTINGS;
} {
  // Optionally prepend voice directive for style guidance
  const processedText = preprocessSantaScript(text);

  return {
    text: processedText,
    model_id: SANTA_MODEL_CONFIG.model_id,
    voice_settings: SANTA_VOICE_SETTINGS
  };
}

// ============================================================
// SETTINGS SUMMARY (for logging/debugging)
// ============================================================

export function getVoiceSettingsSummary(variant: SantaVoiceVariant = 'warm'): string {
  const settings = getSantaVoiceSettings(variant);
  const variantName = variant === 'warm' ? 'Warm Santa (Deep American)' : 'Gentle Santa (Soft Grandfatherly)';

  return `
Santa Voice Settings - ${variantName}:
${'='.repeat(45)}
Model: ${SANTA_MODEL_CONFIG.model_id}
Stability: ${settings.stability} ${variant === 'warm' ? '(natural variation)' : '(smooth delivery)'}
Similarity Boost: ${settings.similarity_boost} (voice clarity)
Style: ${settings.style} ${variant === 'warm' ? '(rich emotion)' : '(subtle emotion)'}
Speaker Boost: ${settings.use_speaker_boost}

Voice Profile:
- ${variant === 'warm' ? 'Deep, warm' : 'Soft, gentle'} American accent
- Slow-medium pacing
- Grandfatherly resonance
- ${variant === 'warm' ? 'Emotionally present' : 'Subtle, understated'}, not theatrical
`.trim();
}

/**
 * Get settings for a specific voice variant
 */
export function getSantaVoiceSettings(variant: SantaVoiceVariant = 'warm') {
  return variant === 'warm' ? WARM_SANTA_SETTINGS : GENTLE_SANTA_SETTINGS;
}
