/**
 * ElevenLabs TTS Provider
 * =======================
 * Output: mp3_44100_128 streamed in chunks for low-latency playback
 *
 * STREAMING MODE: Sends audio chunks as they arrive from ElevenLabs.
 * First chunk arrives in ~150-250ms, giving near-instant voice response.
 * Client must handle sequential MP3 chunk playback.
 *
 * Model: eleven_turbo_v2_5 (lowest latency)
 * Speed: 1.15x (slightly faster for conversational feel)
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// Minimum chunk size before sending — prevents micro-fragments
const MIN_CHUNK_BYTES = 4096; // 4KB minimum per chunk

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
}

const VOICE_OPTIONS: Record<string, VoiceOption> = {
  brian: { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'American, deep, authoritative, warm', gender: 'male' },
  chris: { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'American, casual, conversational, middle-aged', gender: 'male' },
  eric: { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'American, friendly, conversational, middle-aged', gender: 'male' },
  daniel: { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'British, authoritative, calm, professional', gender: 'male' },
  aria: { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'American, expressive, calm, mature', gender: 'female' },
  matilda: { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'American, friendly, warm, narration', gender: 'female' },
  alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'British, confident, authoritative, news', gender: 'female' },
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
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not set');
  if (!text.trim()) { onDone(); return; }

  const selectedVoice = voiceId || activeVoiceId;
  const startTime = Date.now();
  let firstChunkSent = false;

  const response = await fetch(getElevenLabsEndpoint(selectedVoice), {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true, speed: 1.15 },
      output_format: 'mp3_44100_128',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body reader available');

  let buffer = Buffer.alloc(0);
  let totalSize = 0;
  let chunkCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = Buffer.from(value);
      buffer = Buffer.concat([buffer, chunk]);
      totalSize += chunk.length;

      // Send when we have enough data for smooth playback
      if (buffer.length >= MIN_CHUNK_BYTES) {
        if (!firstChunkSent) {
          console.log(`[ElevenLabs] First chunk: ${Date.now() - startTime}ms | ${Math.round(buffer.length / 1024)}KB`);
          firstChunkSent = true;
        }
        onChunk(buffer);
        chunkCount++;
        buffer = Buffer.alloc(0);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Send any remaining data
  if (buffer.length > 0) {
    if (!firstChunkSent) {
      console.log(`[ElevenLabs] First chunk: ${Date.now() - startTime}ms | ${Math.round(buffer.length / 1024)}KB`);
    }
    onChunk(buffer);
    chunkCount++;
  }

  console.log(`[ElevenLabs] Stream done: ${chunkCount} chunks, ${Math.round(totalSize / 1024)}KB, ${Date.now() - startTime}ms`);
  onDone();
}

export function setActiveVoice(voiceName: string): void {
  const voice = VOICE_OPTIONS[voiceName.toLowerCase()];
  if (voice) { activeVoiceId = voice.id; console.log(`[ElevenLabs] Voice set to: ${voice.name}`); }
}

export function getAvailableVoices(): VoiceOption[] {
  return Object.values(VOICE_OPTIONS);
}
