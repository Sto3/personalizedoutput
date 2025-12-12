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
  MULTILINGUAL_V2: 'eleven_multilingual_v2', // Best quality
  FLASH_V2_5: 'eleven_flash_v2_5'       // Balanced speed/quality
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
