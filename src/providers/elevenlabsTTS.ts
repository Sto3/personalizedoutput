/**
 * ElevenLabs TTS Provider
 * =======================
 * Streaming text-to-speech using ElevenLabs.
 * Voice: JBFqnCBsd6RMkjVDRZzb (George)
 * Model: eleven_turbo_v2_5
 * Output: pcm_24000
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

export async function elevenLabsStreamTTS(
  text: string,
  onChunk: (audio: Buffer) => void,
  onDone: () => void,
): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not set');
  }

  if (!text.trim()) {
    onDone();
    return;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
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
          stability: 0.5,
          similarity_boost: 0.75,
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
