/**
 * Audio Denoiser Service
 *
 * Uses RNNoise for real-time audio denoising before transcription.
 * Removes background noise for cleaner speech recognition.
 *
 * RNNoise is a recurrent neural network that processes audio at 48kHz.
 * It's particularly effective at removing stationary noise (fans, AC, traffic).
 */

// Dynamic import for WASM module
let RNNoiseModule: any = null;

interface DenoiserInstance {
  processFrame: (input: Float32Array) => Float32Array;
  destroy: () => void;
}

// RNNoise works with 48kHz audio, 10ms frames (480 samples)
const RNNOISE_SAMPLE_RATE = 48000;
const RNNOISE_FRAME_SIZE = 480;

// Our audio is 16kHz, so we need to resample
const INPUT_SAMPLE_RATE = 16000;
const INPUT_FRAME_SIZE = 160; // 10ms at 16kHz

/**
 * Audio Denoiser using RNNoise
 */
export class AudioDenoiser {
  private denoiser: DenoiserInstance | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Resampling buffers
  private upsampleBuffer: Float32Array;
  private downsampleBuffer: Float32Array;

  constructor() {
    this.upsampleBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
    this.downsampleBuffer = new Float32Array(INPUT_FRAME_SIZE);
  }

  /**
   * Initialize the denoiser (lazy loading)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Dynamic import to avoid issues with WASM loading
      const { RNNoise } = await import('rnnoise-wasm');
      RNNoiseModule = RNNoise;

      this.denoiser = await RNNoise.create();
      this.initialized = true;
      console.log('[AudioDenoiser] RNNoise initialized successfully');
    } catch (error) {
      console.error('[AudioDenoiser] Failed to initialize RNNoise:', error);
      // Don't throw - we can fall back to no denoising
    }
  }

  /**
   * Process an audio buffer through RNNoise
   * Input: 16-bit PCM at 16kHz
   * Output: 16-bit PCM at 16kHz (denoised)
   */
  processAudioBuffer(inputBuffer: Buffer): Buffer {
    if (!this.initialized || !this.denoiser) {
      // Not initialized - return unchanged
      return inputBuffer;
    }

    try {
      // Convert 16-bit PCM to Float32
      const inputSamples = this.pcm16ToFloat32(inputBuffer);

      // Process in frames
      const outputSamples = new Float32Array(inputSamples.length);

      for (let i = 0; i < inputSamples.length; i += INPUT_FRAME_SIZE) {
        const frameEnd = Math.min(i + INPUT_FRAME_SIZE, inputSamples.length);
        const inputFrame = inputSamples.slice(i, frameEnd);

        // Upsample 16kHz → 48kHz (3x)
        const upsampledFrame = this.upsample(inputFrame);

        // Process through RNNoise
        const denoisedFrame = this.denoiser.processFrame(upsampledFrame);

        // Downsample 48kHz → 16kHz (3x)
        const downsampledFrame = this.downsample(denoisedFrame);

        // Copy to output
        outputSamples.set(downsampledFrame, i);
      }

      // Convert back to 16-bit PCM
      return this.float32ToPcm16(outputSamples);

    } catch (error) {
      console.error('[AudioDenoiser] Error processing audio:', error);
      return inputBuffer; // Return original on error
    }
  }

  /**
   * Simple linear interpolation upsample (16kHz → 48kHz)
   */
  private upsample(input: Float32Array): Float32Array {
    const ratio = 3;
    const output = new Float32Array(input.length * ratio);

    for (let i = 0; i < input.length - 1; i++) {
      const baseIdx = i * ratio;
      output[baseIdx] = input[i];
      output[baseIdx + 1] = input[i] + (input[i + 1] - input[i]) / 3;
      output[baseIdx + 2] = input[i] + (input[i + 1] - input[i]) * 2 / 3;
    }

    // Handle last sample
    const lastIdx = (input.length - 1) * ratio;
    output[lastIdx] = input[input.length - 1];
    output[lastIdx + 1] = input[input.length - 1];
    output[lastIdx + 2] = input[input.length - 1];

    return output;
  }

  /**
   * Simple decimation downsample (48kHz → 16kHz)
   */
  private downsample(input: Float32Array): Float32Array {
    const ratio = 3;
    const output = new Float32Array(Math.floor(input.length / ratio));

    for (let i = 0; i < output.length; i++) {
      // Take every 3rd sample (could add low-pass filter for better quality)
      output[i] = input[i * ratio];
    }

    return output;
  }

  /**
   * Convert 16-bit PCM Buffer to Float32Array
   */
  private pcm16ToFloat32(buffer: Buffer): Float32Array {
    const samples = buffer.length / 2;
    const output = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      // Read 16-bit signed integer, little endian
      const sample = buffer.readInt16LE(i * 2);
      // Convert to -1.0 to 1.0 range
      output[i] = sample / 32768;
    }

    return output;
  }

  /**
   * Convert Float32Array to 16-bit PCM Buffer
   */
  private float32ToPcm16(samples: Float32Array): Buffer {
    const buffer = Buffer.alloc(samples.length * 2);

    for (let i = 0; i < samples.length; i++) {
      // Clamp to -1.0 to 1.0 range
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      // Convert to 16-bit signed integer
      const sample = Math.round(clamped * 32767);
      buffer.writeInt16LE(sample, i * 2);
    }

    return buffer;
  }

  /**
   * Check if denoiser is ready
   */
  isReady(): boolean {
    return this.initialized && this.denoiser !== null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.denoiser) {
      this.denoiser.destroy();
      this.denoiser = null;
    }
    this.initialized = false;
  }
}

// Singleton instance for shared use
let globalDenoiser: AudioDenoiser | null = null;

/**
 * Get the global audio denoiser instance
 */
export async function getAudioDenoiser(): Promise<AudioDenoiser> {
  if (!globalDenoiser) {
    globalDenoiser = new AudioDenoiser();
    await globalDenoiser.initialize();
  }
  return globalDenoiser;
}

/**
 * Process audio through the global denoiser
 * Convenience function for quick denoising
 */
export async function denoiseAudio(audioBuffer: Buffer): Promise<Buffer> {
  const denoiser = await getAudioDenoiser();
  return denoiser.processAudioBuffer(audioBuffer);
}
