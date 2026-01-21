/**
 * RediConfig.swift
 *
 * Unified configuration for Redi services.
 * NO VERSION NUMBERS - this is the production config.
 */

import Foundation
import AVFoundation

struct RediConfig {
    // MARK: - Server Configuration
    
    /// Production WebSocket endpoint
    /// SWITCHED BACK TO V6 - proven working on Jan 20
    /// V7 has vision staleness issues (10sec frame age)
    static var serverURL: URL {
        return URL(string: "wss://redialways.com/ws/redi?v=6")!
    }
    
    // MARK: - Audio Configuration
    
    struct Audio {
        /// Sample rate matching OpenAI Realtime API
        static let sampleRate: Double = 24000
        
        /// Mono audio
        static let channels: AVAudioChannelCount = 1
        
        /// 16-bit PCM
        static let bytesPerSample = 2
        static let bitsPerSample = 16
        
        /// Recording buffer size (200ms chunks at 24kHz)
        static let recordingBufferSize: AVAudioFrameCount = 4800
        
        /// Playback chunk size
        static let playbackChunkSize = 9600
        
        /// Minimum playback buffer before starting
        static let minPlaybackBuffer = 1200
    }
    
    // MARK: - Camera Configuration
    
    struct Camera {
        /// Frame interval when scene is static (5 seconds)
        static let staticFrameInterval: TimeInterval = 5.0
        
        /// Frame interval during motion (4 fps)
        static let motionFrameInterval: TimeInterval = 0.25
        
        /// Maximum image dimension for transmission
        /// IMPORTANT: Match CameraService.Config.maxOutputDimension for full quality
        static let maxDimension: CGFloat = 1440
        
        /// JPEG compression quality (0.0 - 1.0)
        /// IMPORTANT: Match CameraService.Config.jpegQuality for full quality
        static let compressionQuality: CGFloat = 0.90
        
        /// Maximum age of a frame before requesting fresh (milliseconds)
        static let maxFrameAge: Int = 2000
    }
    
    // MARK: - Response Configuration
    
    struct Response {
        /// Maximum words for standard responses
        static let maxWords = 50
        
        /// Maximum words for vision responses
        static let maxWordsVision = 100
        
        /// Maximum words in driving mode
        static let maxWordsDriving = 15
        
        /// Minimum gap between responses (ms)
        static let minResponseGapMs = 1000
    }
}
