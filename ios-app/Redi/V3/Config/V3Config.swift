/**
 * Redi V3 Configuration
 *
 * Central configuration for OpenAI Realtime API backend.
 *
 * URL NOTE: V3 uses redialways.com, while V1/V2 and API calls use personalizedoutput.com.
 * Both domains route to the same backend server. redialways.com is the primary production domain.
 */

import Foundation
import AVFoundation

struct V3Config {
    // Server URL - Uses existing Render deployment with V3 via query parameter
    // Uses /ws/redi?v=3 instead of /ws/redi-v3 for Cloudflare WebSocket compatibility
    static var serverURL: URL {
        // Check for environment override first
        if let envURL = ProcessInfo.processInfo.environment["REDI_V3_SERVER_URL"],
           let url = URL(string: envURL) {
            return url
        }
        // V3 endpoint via query parameter (Cloudflare only has WebSocket enabled for /ws/redi)
        // NOTE: Uses redialways.com (production domain) - same backend as personalizedoutput.com
        return URL(string: "wss://redialways.com/ws/redi?v=3")!
    }

    // Audio format settings (must match OpenAI Realtime API expectations)
    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2  // 16-bit PCM
    }

    // Frame capture settings
    // NOTE: Actual behavior is smart frame rate in V3CameraService:
    // - 5 seconds interval when no motion detected
    // - 0.25 seconds (4 fps) when motion detected
    struct Camera {
        static let staticFrameInterval: TimeInterval = 5.0   // When no motion
        static let motionFrameInterval: TimeInterval = 0.25  // 4fps when motion
        static let maxDimension: CGFloat = 512
        static let compressionQuality: CGFloat = 0.7

        // Legacy: framesPerSecond is deprecated in favor of smart frame rate
        @available(*, deprecated, message: "Use staticFrameInterval/motionFrameInterval instead")
        static let framesPerSecond: Double = 2.0
    }
}
