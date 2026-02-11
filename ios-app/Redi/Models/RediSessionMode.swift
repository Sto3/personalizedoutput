/**
 * RediSessionMode.swift
 *
 * Session mode options for Redi.
 * Determines camera, mic, and chat availability.
 */

import Foundation

enum RediSessionMode: String, CaseIterable, Codable {
    case videoAndVoice = "Video & Voice"
    case chatAndVoice = "Chat & Voice"
    case voiceOnly = "Voice Only"
    case chatOnly = "Chat Only"

    var icon: String {
        switch self {
        case .videoAndVoice: return "video.fill"
        case .chatAndVoice: return "text.bubble.fill"
        case .voiceOnly: return "mic.fill"
        case .chatOnly: return "keyboard"
        }
    }

    var cameraEnabled: Bool {
        self == .videoAndVoice
    }

    var micEnabled: Bool {
        self != .chatOnly
    }

    var chatVisible: Bool {
        self == .chatAndVoice || self == .chatOnly
    }

    static var defaultMode: RediSessionMode {
        get {
            if let raw = UserDefaults.standard.string(forKey: "defaultSessionMode"),
               let mode = RediSessionMode(rawValue: raw) {
                return mode
            }
            return .videoAndVoice
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: "defaultSessionMode")
        }
    }
}
