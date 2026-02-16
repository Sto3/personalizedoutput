/**
 * V9Config.swift
 *
 * Configuration for V9 Three-Brain architecture.
 * Server endpoint: wss://redialways.com/ws/redi?v=9
 * Audio: PCM16, 24kHz, mono (matching Deepgram expectations)
 */

import Foundation

struct V9Config {
    // Server URL — V9 endpoint
    static var serverURL: URL {
        URL(string: "wss://redialways.com/ws/redi?v=9")!
    }

    // Audio settings — must match Deepgram expectations
    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: Int = 1
        static let encoding: String = "linear16"  // PCM16
    }

    // Frame settings
    struct Frame {
        static let maxDimension: CGFloat = 1440  // pixels
        static let compressionQuality: CGFloat = 0.85  // JPEG quality
        static let captureInterval: TimeInterval = 3.0  // seconds between frames
        static let maxFrameAgeMs: Int = 2000  // server rejects older frames
    }

    // Developer mode frame settings (lower res for cost savings)
    struct DeveloperFrame {
        static let maxDimension: CGFloat = 640   // text-readable, 75% fewer tokens
        static let compressionQuality: CGFloat = 0.7
        static let captureInterval: TimeInterval = 5.0  // less frequent for static screens
    }
}
