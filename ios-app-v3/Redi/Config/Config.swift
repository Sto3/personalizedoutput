/**
 * Redi V3 Configuration
 *
 * Central configuration for API endpoints and constants.
 */

import Foundation

struct Config {
    // Server URL - Update this for production
    static let serverURL = URL(string: "wss://redi-v3.onrender.com/ws")!

    // For local development, use:
    // static let serverURL = URL(string: "ws://localhost:3000")!

    // Audio format settings (must match OpenAI Realtime API expectations)
    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2  // 16-bit PCM
    }

    // Frame capture settings
    struct Camera {
        static let framesPerSecond: Double = 2.0
        static let maxDimension: CGFloat = 512
        static let compressionQuality: CGFloat = 0.7
    }
}
