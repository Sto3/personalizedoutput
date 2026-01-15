/**
 * Redi V3 Configuration
 *
 * Central configuration for OpenAI Realtime API backend.
 */

import Foundation
import AVFoundation

struct V3Config {
    // Server URL - Uses existing Render deployment with V3 endpoint
    static var serverURL: URL {
        // Check for environment override first
        if let envURL = ProcessInfo.processInfo.environment["REDI_V3_SERVER_URL"],
           let url = URL(string: envURL) {
            return url
        }
        // V3 endpoint on existing server
        return URL(string: "wss://personalizedoutput.com/ws/redi-v3")!
    }

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
