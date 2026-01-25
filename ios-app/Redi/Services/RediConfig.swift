/**
 * RediConfig.swift
 *
 * Unified configuration for Redi services.
 * 
 * VERSIONS:
 * - V7 WebRTC: Direct to OpenAI via WebRTC (BEST - no echo!)
 * - V7: WebSocket → Server → OpenAI (stable, but has echo issues)
 * - V8: Experimental (broken, do not use)
 * 
 * Jan 25, 2026: Added V7 WebRTC option for direct OpenAI connection with echo cancellation
 */

import Foundation
import AVFoundation

// MARK: - Server Version Selection

enum RediServerVersion: String, CaseIterable {
    case v7webrtc = "7webrtc"  // V7 + WebRTC direct to OpenAI (RECOMMENDED - no echo!)
    case v7 = "7"              // WebSocket via server (stable but has echo)
    case v8 = "8"              // Two-Brain: EXPERIMENTAL - BROKEN
    
    var displayName: String {
        switch self {
        case .v7webrtc: return "V7 Production (WebRTC) ✅"
        case .v7: return "V7 Production (WebSocket)"
        case .v8: return "V8 - Experimental"
        }
    }
    
    var description: String {
        switch self {
        case .v7webrtc: return "Direct to OpenAI. Built-in echo cancellation. Best quality."
        case .v7: return "Stable. Routes through server. May have echo issues."
        case .v8: return "BROKEN. Do not use."
        }
    }
    
    var icon: String {
        switch self {
        case .v7webrtc: return "bolt.fill"
        case .v7: return "server.rack"
        case .v8: return "exclamationmark.triangle"
        }
    }
    
    var isWebRTC: Bool {
        return self == .v7webrtc
    }
    
    /// The WebSocket version to use (for non-WebRTC modes)
    var wsVersion: String {
        switch self {
        case .v7webrtc: return "7"  // Falls back to V7 WebSocket if WebRTC fails
        case .v7: return "7"
        case .v8: return "8"
        }
    }
}

struct RediConfig {
    // MARK: - Server Version
    
    /// Current server version
    /// Default to V7 WebRTC for best echo cancellation
    static var serverVersion: RediServerVersion {
        get {
            if let stored = UserDefaults.standard.string(forKey: "redi_server_version"),
               let version = RediServerVersion(rawValue: stored) {
                return version
            }
            // Default to V7 WebRTC for best echo cancellation
            return .v7webrtc
        }
        set {
            print("[RediConfig] SET serverVersion: \(newValue.displayName)")
            UserDefaults.standard.set(newValue.rawValue, forKey: "redi_server_version")
            UserDefaults.standard.synchronize()
        }
    }
    
    // MARK: - Server Configuration
    
    /// Production WebSocket endpoint - uses selected version
    /// Only used for WebSocket modes (V7, V8)
    static var serverURL: URL {
        let version = serverVersion.wsVersion
        let url = URL(string: "wss://redialways.com/ws/redi?v=\(version)")!
        print("[RediConfig] serverURL computed: \(url.absoluteString)")
        return url
    }
    
    /// WebRTC token endpoint
    static var webrtcTokenURL: URL {
        return URL(string: "https://redialways.com/api/redi/webrtc/token")!
    }
    
    /// Check if current version uses WebRTC
    static var isWebRTCEnabled: Bool {
        return serverVersion.isWebRTC
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
        /// Frame interval - 100ms = 10fps for freshness
        static let staticFrameInterval: TimeInterval = 0.1
        
        /// Frame interval during motion - same as static for consistency
        static let motionFrameInterval: TimeInterval = 0.1
        
        /// Maximum image dimension for transmission
        static let maxDimension: CGFloat = 640
        
        /// JPEG compression quality (0.0 - 1.0)
        static let compressionQuality: CGFloat = 0.50
        
        /// Maximum age of a frame before considered stale (milliseconds)
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
