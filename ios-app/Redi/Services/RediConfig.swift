/**
 * RediConfig.swift
 *
 * Unified configuration for Redi services.
 * SPEED OPTIMIZED - Jan 21 2026
 */

import Foundation
import AVFoundation

struct RediConfig {
    // MARK: - Server Configuration
    
    /// Production WebSocket endpoint - V7 with speed optimizations
    static var serverURL: URL {
        return URL(string: "wss://redialways.com/ws/redi?v=7")!
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
    
    // MARK: - Camera Configuration - SPEED OPTIMIZED
    
    struct Camera {
        /// Frame interval - send frames frequently for freshness!
        /// 1 second means we always have a recent frame ready
        static let staticFrameInterval: TimeInterval = 1.0
        
        /// Frame interval during motion (4 fps)
        static let motionFrameInterval: TimeInterval = 0.25
        
        /// Maximum image dimension for transmission
        /// 640p is plenty for AI vision and keeps files small
        static let maxDimension: CGFloat = 640
        
        /// JPEG compression quality (0.0 - 1.0)
        /// 50% produces small files that AI can still read well
        static let compressionQuality: CGFloat = 0.50
        
        /// Maximum age of a frame before requesting fresh (milliseconds)
        static let maxFrameAge: Int = 1000
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
