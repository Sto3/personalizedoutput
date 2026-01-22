/**
 * RediConfig.swift
 *
 * Unified configuration for Redi services.
 * MILITARY GRADE FRESHNESS - Jan 21 2026
 * 
 * KEY: 100ms frame interval = 10fps = maximum freshness
 * Frames are never more than ~150ms old
 */

import Foundation
import AVFoundation

// MARK: - Server Version Selection

enum RediServerVersion: String, CaseIterable {
    case v7 = "7"   // OpenAI Realtime API (current stable)
    case v8 = "8"   // Two-Brain: Together AI (fast) + GPT-4o (deep)
    
    var displayName: String {
        switch self {
        case .v7: return "V7 - OpenAI Realtime"
        case .v8: return "V8 - Two-Brain (Fast+Deep)"
        }
    }
    
    var description: String {
        switch self {
        case .v7: return "Stable. Single OpenAI pipeline. ~1.5s response."
        case .v8: return "Experimental. Llama for speed (~500ms), GPT-4o for depth."
        }
    }
    
    var icon: String {
        switch self {
        case .v7: return "bolt.fill"
        case .v8: return "brain.head.profile"
        }
    }
}

struct RediConfig {
    // MARK: - Server Version
    
    /// Current server version - persisted in UserDefaults
    static var serverVersion: RediServerVersion {
        get {
            let stored = UserDefaults.standard.string(forKey: "redi_server_version") ?? "7"
            return RediServerVersion(rawValue: stored) ?? .v7
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: "redi_server_version")
            print("[RediConfig] Server version changed to: \(newValue.displayName)")
        }
    }
    
    // MARK: - Server Configuration
    
    /// Production WebSocket endpoint - uses selected version
    static var serverURL: URL {
        let version = serverVersion.rawValue
        return URL(string: "wss://redialways.com/ws/redi?v=\(version)")!
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
    
    // MARK: - Camera Configuration - MILITARY GRADE FRESHNESS
    
    struct Camera {
        /// Frame interval - 100ms = 10fps for MAXIMUM freshness
        /// This ensures frames are never more than ~150ms stale
        static let staticFrameInterval: TimeInterval = 0.1
        
        /// Frame interval during motion - same as static for consistency
        static let motionFrameInterval: TimeInterval = 0.1
        
        /// Maximum image dimension for transmission
        /// 640p is plenty for AI vision and keeps files small (~20-30KB)
        static let maxDimension: CGFloat = 640
        
        /// JPEG compression quality (0.0 - 1.0)
        /// 50% produces small files (~20-30KB) that AI can still read well
        static let compressionQuality: CGFloat = 0.50
        
        /// Maximum age of a frame before considered stale (milliseconds)
        /// With 100ms interval, frames should never be older than ~150ms
        static let maxFrameAge: Int = 200
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
