/**
 * ElevenLabs TTS Provider
 * =======================
 * HYBRID STREAMING: Accumulates complete MP3 for reliable decoding,
 * but starts sending as soon as the full response is ready.
 * 
 * Why not chunk streaming: MP3 fragments without headers cause garbled
 * audio in both browser decodeAudioData() and iOS AVAudioPlayer.
 * The real latency win comes from ElevenLabs turbo model + speed param.
 *
 * Model: eleven_turbo_v2_5 (lowest latency)
 * Speed: 1.12x (slightly faster, natural sounding)
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

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
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true, speed: 1.12 },
      output_format: 'mp3_44100_128',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body reader available');

  // Accumulate complete MP3 — partial fragments cause garbled audio
  const chunks: Buffer[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      totalSize += value.length;
    }
  } finally {
    reader.releaseLock();
  }

  if (totalSize > 0) {
    const complete = Buffer.concat(chunks, totalSize);
    const elapsed = Date.now() - startTime;
    console.log(`[ElevenLabs] MP3 ready: ${Math.round(totalSize / 1024)}KB in ${elapsed}ms`);
    onChunk(complete);
  }

  onDone();
}

export function setActiveVoice(voiceName: string): void {
  const voice = VOICE_OPTIONS[voiceName.toLowerCase()];
  if (voice) { activeVoiceId = voice.id; console.log(`[ElevenLabs] Voice set to: ${voice.name}`); }
}

export function getAvailableVoices(): VoiceOption[] {
  return Object.values(VOICE_OPTIONS);
}
