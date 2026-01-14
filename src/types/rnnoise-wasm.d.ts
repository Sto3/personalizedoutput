/**
 * Type declarations for rnnoise-wasm
 * RNNoise is a noise suppression library based on a recurrent neural network
 */
declare module 'rnnoise-wasm' {
  export interface RNNoiseInstance {
    /**
     * Process a frame of audio samples
     * @param input Float32Array of input samples (must be 480 samples at 48kHz)
     * @returns Float32Array of denoised samples
     */
    processFrame(input: Float32Array): Float32Array;

    /**
     * Clean up resources
     */
    destroy(): void;
  }

  export const RNNoise: {
    /**
     * Create a new RNNoise instance
     */
    create(): Promise<RNNoiseInstance>;
  };

  /**
   * Initialize the RNNoise WASM module
   */
  export default function init(): Promise<void>;
}
