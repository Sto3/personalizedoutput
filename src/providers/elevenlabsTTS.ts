/**
 * ElevenLabs TTS Provider
 * =======================
 * Streaming text-to-speech using ElevenLabs.
 * Voice selection system with mature, authoritative voices.
 * Model: eleven_turbo_v2_5
 * Output: pcm_24000 (raw PCM16 signed LE, 24kHz, mono)
 *
 * IMPORTANT: Accept header must match output_format.
 * pcm_24000 = raw audio bytes, NOT mp3.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// Voice options — mature, professional, authoritative
// Target: mid-30s to early 40s. Calm but profound. Thoughtful but pointed.

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
}

const VOICE_OPTIONS: Record<string, VoiceOption> = {
  // PRIMARY MALE: Brian — American, deep, middle-aged, resonant
  brian: {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    description: 'American, deep, authoritative, warm',
    gender: 'male',
  },
  // BACKUP MALE: Chris — American, casual but professional
  chris: {
    id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris',
    description: 'American, casual, conversational, middle-aged',
    gender: 'male',
  },
  // ALTERNATIVE MALE: Eric — American, friendly
  eric: {
    id: 'cjVigY5qzO86Huf0OWal',
    name: 'Eric',
    description: 'American, friendly, conversational, middle-aged',
    gender: 'male',
  },
  // BRITISH MALE: Daniel
  daniel: {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    description: 'British, authoritative, calm, professional',
    gender: 'male',
  },
  // PRIMARY FEMALE: Aria — American, mature
  aria: {
    id: '9BWtsMINqrJLrRacOk9x',
    name: 'Aria',
    description: 'American, expressive, calm, mature',
    gender: 'female',
  },
  // BACKUP FEMALE: Matilda — American, friendly
  matilda: {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'American, friendly, warm, narration',
    gender: 'female',
  },
  // BRITISH FEMALE: Alice
  alice: {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    description: 'British, confident, authoritative, news',
    gender: 'female',
  },
};

// Default voice — Brian (authoritative American male)
let activeVoiceId = VOICE_OPTIONS.brian.id;

function getElevenLabsEndpoint(voiceId: string): string {
  return `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
}

export async function elevenLabsStreamTTS(
  text: string,
  onChunk: (audio: Buffer) => void,
  onDone: () => void,
  voiceId?: string,
): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not set');
  }

  if (!text.trim()) {
    onDone();
    return;
  }

  const selectedVoice = voiceId || activeVoiceId;

  const response = await fetch(
    getElevenLabsEndpoint(selectedVoice),
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        // CRITICAL: Accept must be audio/pcm for pcm output, NOT audio/mpeg
        'Accept': 'application/octet-stream',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.80,
          style: 0.15,
          use_speaker_boost: true,
        },
        output_format: 'pcm_24000',
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}

export function setActiveVoice(voiceName: string): void {
  const voice = VOICE_OPTIONS[voiceName.toLowerCase()];
  if (voice) {
    activeVoiceId = voice.id;
    console.log(`[ElevenLabs] Voice set to: ${voice.name} (${voice.description})`);
  }
}

export function getAvailableVoices(): VoiceOption[] {
  return Object.values(VOICE_OPTIONS);
}
