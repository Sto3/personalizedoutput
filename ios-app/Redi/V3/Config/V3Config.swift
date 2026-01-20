/**
 * Redi V3 Configuration
 *
 * Central configuration for OpenAI Realtime API backend.
 *
 * URL NOTE: V3 uses redialways.com, while V1/V2 and API calls use personalizedoutput.com.
 * Both domains route to the same backend server. redialways.com is the primary production domain.
 *
 * MILITARY-GRADE VISION: Jan 20 2026
 * Increased resolution to 1024px and quality to 85% for accurate vision.
 * Previous 512px/70% was causing the model to misidentify objects and positions.
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
        // V7 endpoint via query parameter (Cloudflare only has WebSocket enabled for /ws/redi)
        // NOTE: Uses redialways.com (production domain) - same backend as personalizedoutput.com
        return URL(string: "wss://redialways.com/ws/redi?v=7")!
    }

    // Audio format settings (must match OpenAI Realtime API expectations)
    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2  // 16-bit PCM
    }

    // Frame capture settings - MILITARY GRADE
    // NOTE: Actual behavior is smart frame rate in V3CameraService:
    // - 5 seconds interval when no motion detected
    // - 0.25 seconds (4 fps) when motion detected
    struct Camera {
        static let staticFrameInterval: TimeInterval = 5.0   // When no motion
        static let motionFrameInterval: TimeInterval = 0.25  // 4fps when motion
        
        // MILITARY-GRADE VISION SETTINGS
        // 1024px gives enough detail to read app icons and UI elements
        // 85% JPEG quality preserves text and fine details
        // Expected frame size: 80-150KB (was 22-37KB at 512px/70%)
        static let maxDimension: CGFloat = 1024
        static let compressionQuality: CGFloat = 0.85

        // Legacy: framesPerSecond is deprecated in favor of smart frame rate
        @available(*, deprecated, message: "Use staticFrameInterval/motionFrameInterval instead")
        static let framesPerSecond: Double = 2.0
    }
}
