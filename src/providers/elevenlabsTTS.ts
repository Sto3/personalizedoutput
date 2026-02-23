/**
 * ElevenLabs TTS Provider
 * =======================
 * Streaming text-to-speech using ElevenLabs.
 * 
 * Output: mp3_44100_128 (MP3, 44.1kHz, 128kbps)
 * 
 * Streaming strategy:
 * - Accumulate chunks until we have >= MIN_CHUNK_SIZE bytes
 * - Send accumulated chunk to client as binary WebSocket frame
 * - Client receives multiple MP3 fragments and plays them in sequence
 * - This gives fast time-to-first-audio while keeping chunks decodable
 *
 * Model: eleven_turbo_v2_5
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// Minimum bytes to accumulate before sending a chunk to client.
// Too small = decode errors (MP3 frames need ~417 bytes each at 128kbps).
// Too large = high latency to first audio.
// 8KB = ~0.5 seconds of audio, enough for clean MP3 frames.
const MIN_CHUNK_SIZE = 8192;

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
}

const VOICE_OPTIONS: Record<string, VoiceOption> = {
  brian: {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    description: 'American, deep, authoritative, warm',
    gender: 'male',
  },
  chris: {
    id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris',
    description: 'American, casual, conversational, middle-aged',
    gender: 'male',
  },
  eric: {
    id: 'cjVigY5qzO86Huf0OWal',
    name: 'Eric',
    description: 'American, friendly, conversational, middle-aged',
    gender: 'male',
  },
  daniel: {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    description: 'British, authoritative, calm, professional',
    gender: 'male',
  },
  aria: {
    id: '9BWtsMINqrJLrRacOk9x',
    name: 'Aria',
    description: 'American, expressive, calm, mature',
    gender: 'female',
  },
  matilda: {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'American, friendly, warm, narration',
    gender: 'female',
  },
  alice: {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    description: 'British, confident, authoritative, news',
    gender: 'female',
  },
};

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
        'Accept': 'audio/mpeg',
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
        output_format: 'mp3_44100_128',
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

  // Accumulate into chunks of MIN_CHUNK_SIZE for clean MP3 frame boundaries
  let accumulator: Buffer[] = [];
  let accumulatedSize = 0;
  let chunksSent = 0;
  let totalBytes = 0;
  let isFirstChunk = true;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const buf = Buffer.from(value);
      accumulator.push(buf);
      accumulatedSize += buf.length;
      totalBytes += buf.length;

      // Send when we've accumulated enough for clean MP3 playback
      if (accumulatedSize >= MIN_CHUNK_SIZE) {
        const chunk = Buffer.concat(accumulator, accumulatedSize);
        if (isFirstChunk) {
          console.log(`[ElevenLabs] First chunk: ${chunk.length} bytes, header: ${chunk.slice(0, 4).toString('hex')}`);
          isFirstChunk = false;
        }
        onChunk(chunk);
        chunksSent++;
        accumulator = [];
        accumulatedSize = 0;
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Send any remaining accumulated data
  if (accumulatedSize > 0) {
    const remaining = Buffer.concat(accumulator, accumulatedSize);
    onChunk(remaining);
    chunksSent++;
  }

  console.log(`[ElevenLabs] Complete: ${chunksSent} chunks, ${Math.round(totalBytes / 1024)}KB`);
  onDone();
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
