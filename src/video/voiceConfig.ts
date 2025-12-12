/**
 * ElevenLabs Voice Configuration
 * Warm, diverse female voices for marketing narration
 */

export interface VoiceConfig {
  id: string;
  name: string;
  description: string;
  accent: string;
  age: string;
  tone: string;
  bestFor: string[];
}

// Selected voices for marketing (warm, relatable, modern female voices)
export const NARRATOR_VOICES: VoiceConfig[] = [
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    description: 'Young adult woman with a confident and warm, mature quality and a reassuring, professional tone.',
    accent: 'american',
    age: 'young',
    tone: 'professional-warm',
    bestFor: ['santa', 'clarity_planner', 'general']
  },
  {
    id: 'FGY2WhTYpPnrIDTdsKH5',
    name: 'Laura',
    description: 'Sunny enthusiasm with a quirky attitude.',
    accent: 'american',
    age: 'young',
    tone: 'enthusiastic',
    bestFor: ['vision_board', 'flash_cards', 'general']
  },
  {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'A professional woman with a pleasing alto pitch.',
    accent: 'american',
    age: 'middle_aged',
    tone: 'informative',
    bestFor: ['flash_cards', 'clarity_planner']
  },
  {
    id: 'cgSgspJ2msm6clMCkdW9',
    name: 'Jessica',
    description: 'Young and popular, playful American female voice perfect for trendy content.',
    accent: 'american',
    age: 'young',
    tone: 'playful',
    bestFor: ['santa', 'vision_board', 'general']
  },
  {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    description: 'Velvety British female voice delivers news and narrations with warmth and clarity.',
    accent: 'british',
    age: 'middle_aged',
    tone: 'warm-confident',
    bestFor: ['clarity_planner', 'vision_board']
  },
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    description: 'Clear and engaging, friendly woman with a British accent.',
    accent: 'british',
    age: 'middle_aged',
    tone: 'engaging',
    bestFor: ['flash_cards', 'general']
  }
];

// Santa voice (already configured in .env)
export const SANTA_VOICE = {
  id: '1wg2wOjdEWKA7yQD8Kca',
  name: 'Santa',
  description: 'Warm, jolly Santa voice',
  modelId: 'eleven_multilingual_v2'
};

// ElevenLabs models
export const ELEVENLABS_MODELS = {
  TURBO_V2_5: 'eleven_turbo_v2_5',      // Fastest, good for most content
  MULTILINGUAL_V2: 'eleven_multilingual_v2', // Best quality, most natural
  FLASH_V2_5: 'eleven_flash_v2_5'       // Balanced speed/quality
};

/**
 * Voice settings optimized for MAXIMUM NATURALNESS & HUMAN SOUND
 *
 * CRITICAL SETTINGS FOR HUMAN-SOUNDING VOICE:
 * - stability: 0.25-0.35 = creates natural speech variation (NOT robotic)
 * - similarity_boost: 0.70-0.80 = balances character with naturalness
 * - style: 0.60-0.80 = adds emotional warmth and inflection
 * - use_speaker_boost: true = improves clarity
 *
 * The KEY to sounding human is:
 * 1. Lower stability (more variation like real speech)
 * 2. Higher style (more emotional expression)
 * 3. Using the multilingual_v2 model
 * 4. SSML pauses in the text for breathing
 */
export const NATURAL_VOICE_SETTINGS = {
  // For marketing/promotional content - energetic but warm
  marketing: {
    stability: 0.30,           // LOW = natural variation like real speech
    similarity_boost: 0.75,    // Moderate = natural, not artificial
    style: 0.65,               // HIGH = emotional warmth
    use_speaker_boost: true
  },
  // For educational/lesson content - warm, friendly teacher
  educational: {
    stability: 0.28,           // LOW = conversational, not robotic
    similarity_boost: 0.72,    // Natural character
    style: 0.70,               // HIGH = warm, engaging teacher voice
    use_speaker_boost: true
  },
  // For emotional storytelling - most expressive and human
  emotional: {
    stability: 0.25,           // VERY LOW = maximum natural variation
    similarity_boost: 0.70,
    style: 0.80,               // VERY HIGH = emotional, human feel
    use_speaker_boost: true
  },
  // For personalized intros - warm, friendly, like talking to a friend
  personalized: {
    stability: 0.27,           // LOW = conversational
    similarity_boost: 0.73,
    style: 0.75,               // HIGH = warm, personal connection
    use_speaker_boost: true
  },
  // NEW: Ultra-natural for demo intros - sounds like a real person
  demo_intro: {
    stability: 0.25,           // LOWEST = maximum naturalness
    similarity_boost: 0.70,    // Natural character
    style: 0.78,               // VERY HIGH = warm, human feel
    use_speaker_boost: true
  }
};

/**
 * WARM CONVERSATIONAL VOICES - Best for human-sounding output
 * These are specifically chosen for their natural, non-robotic qualities
 */
export const WARM_VOICES = {
  // River - neutral, calm, conversational - MOST HUMAN SOUNDING
  river: {
    id: 'SAz9YHcvj6GT2YYXdXww',
    name: 'River',
    description: 'Calm, natural, gender-neutral voice. Most human-sounding.',
    tone: 'calm-conversational',
    bestFor: ['lessons', 'intros', 'educational']
  },
  // Will - young male, chill, conversational
  will: {
    id: 'bIHbv24MWmeRgasZH58o',
    name: 'Will',
    description: 'Young, chill, friendly male voice.',
    tone: 'chill-friendly',
    bestFor: ['kids_lessons', 'casual']
  },
  // Roger - classy, conversational male
  roger: {
    id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger',
    description: 'Easy-going, classy male voice for adult content.',
    tone: 'warm-sophisticated',
    bestFor: ['adult_lessons', 'professional']
  },
  // Matilda - upbeat, informative female
  matilda: {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'Upbeat, warm female voice for educational content.',
    tone: 'warm-educational',
    bestFor: ['educational', 'kids']
  },
  // Chris - casual, conversational male
  chris: {
    id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris',
    description: 'Casual, friendly male voice.',
    tone: 'casual-friendly',
    bestFor: ['conversational', 'intros']
  }
};

// Social media handles for CTA
export const SOCIAL_HANDLES = {
  tiktok: '@PersonalizedOutput',
  instagram: '@PersonalizedOutput',
  youtube: '@PersonalizedOutput',
  default: '@PersonalizedOutput'
};

// CTA templates for video endings
export const VIDEO_END_CTA = {
  voiceover: 'Follow us for more at Personalized Output',
  text: 'Follow @PersonalizedOutput for more',
  textLong: 'Follow us @PersonalizedOutput'
};

// Get voice by product
export function getVoicesForProduct(product: string): VoiceConfig[] {
  return NARRATOR_VOICES.filter(v => v.bestFor.includes(product));
}

// Get random narrator voice for a product
export function getRandomNarratorVoice(product?: string): VoiceConfig {
  const voices = product ? getVoicesForProduct(product) : NARRATOR_VOICES;
  if (voices.length === 0) return NARRATOR_VOICES[0];
  return voices[Math.floor(Math.random() * voices.length)];
}

// Get voice by ID
export function getVoiceById(id: string): VoiceConfig | undefined {
  return NARRATOR_VOICES.find(v => v.id === id);
}
