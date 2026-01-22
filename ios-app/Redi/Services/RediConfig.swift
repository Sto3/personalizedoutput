/**
 * RediConfig.swift
 *
 * Unified configuration for Redi services.
 * MILITARY GRADE FRESHNESS - Jan 21 2026
 * 
 * KEY: 100ms frame interval = 10fps = maximum freshness
 * Frames are never more than ~150ms old
 * 
 * CRITICAL: V7 is the stable working version. V8 is experimental and broken.
 */

import Foundation
import AVFoundation

// MARK: - Server Version Selection

enum RediServerVersion: String, CaseIterable {
    case v7 = "7"   // OpenAI Realtime API (STABLE - WORKING)
    case v8 = "8"   // Two-Brain: EXPERIMENTAL - BROKEN (no audio, bad vision)
    
    var displayName: String {
        switch self {
        case .v7: return "V7 - OpenAI Realtime"
        case .v8: return "V8 - Two-Brain (Experimental)"
        }
    }
    
    var description: String {
        switch self {
        case .v7: return "Stable. Single OpenAI pipeline. Working audio."
        case .v8: return "BROKEN. Do not use."
        }
    }
    
    var icon: String {
        switch self {
        case .v7: return "bolt.fill"
        case .v8: return "exclamationmark.triangle"
        }
    }
}

struct RediConfig {
    // MARK: - Server Version
    
    /// Current server version - FORCED TO V7 until V8 is fixed
    static var serverVersion: RediServerVersion {
        get {
            // FORCED TO V7 - V8 is broken (no audio, bad vision accuracy)
            // When V8 is fixed, restore UserDefaults logic
            return .v7
        }
        set {
            // Still allow setting for future when V8 is fixed
            print("[RediConfig] SET serverVersion: \(newValue.displayName) (raw: '\(newValue.rawValue)')")
            UserDefaults.standard.set(newValue.rawValue, forKey: "redi_server_version")
            UserDefaults.standard.synchronize()
        }
    }
    
    // MARK: - Server Configuration
    
    /// Production WebSocket endpoint - uses selected version
    static var serverURL: URL {
        let version = serverVersion.rawValue
        let url = URL(string: "wss://redialways.com/ws/redi?v=\(version)")!
        print("[RediConfig] serverURL computed: \(url.absoluteString)")
        return url
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
