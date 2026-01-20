/**
 * Redi V5 Configuration
 * ====================
 * 
 * CLEAN VERSION - Matches server config exactly
 * 
 * CRITICAL: Audio must be 24kHz PCM 16-bit mono
 * This matches OpenAI's 'pcm16' format requirement.
 */

import Foundation
import AVFoundation

struct V5Config {
    // Server URL - V7 endpoint (production-grade reliability)
    static var serverURL: URL {
        if let envURL = ProcessInfo.processInfo.environment["REDI_V5_SERVER_URL"],
           let url = URL(string: envURL) {
            return url
        }
        // V7 endpoint - Production-grade with state machine, barge-in, fresh frames
        return URL(string: "wss://redialways.com/ws/redi?v=7")!
    }

    // Audio format settings - MUST match server exactly
    struct Audio {
        // OpenAI Realtime API requires 24kHz for 'pcm16' format
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2  // 16-bit = 2 bytes
        static let bitsPerSample = 16
        
        // Buffer sizes optimized for low latency
        static let recordingBufferSize: AVAudioFrameCount = 4800  // 200ms at 24kHz
        static let playbackChunkSize = 9600  // 400ms at 24kHz (bytes, not frames)
        static let minPlaybackBuffer = 1200  // 50ms minimum before starting playback
    }

    // Frame capture settings - V7 uses higher quality
    struct Camera {
        static let staticFrameInterval: TimeInterval = 5.0
        static let motionFrameInterval: TimeInterval = 0.25
        static let maxDimension: CGFloat = 768  // Increased from 512 for better OCR
        static let compressionQuality: CGFloat = 0.85  // Increased from 0.7
    }
}
