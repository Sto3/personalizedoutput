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
    case alwaysOnAudio = "Always On (Listen)"
    case alwaysOnScreen = "Always On (Screen + Listen)"

    var icon: String {
        switch self {
        case .videoAndVoice: return "video.fill"
        case .chatAndVoice: return "text.bubble.fill"
        case .voiceOnly: return "mic.fill"
        case .chatOnly: return "keyboard"
        case .alwaysOnAudio: return "ear"
        case .alwaysOnScreen: return "rectangle.and.text.magnifyingglass"
        }
    }

    var cameraEnabled: Bool {
        self == .videoAndVoice
    }

    var micEnabled: Bool {
        switch self {
        case .chatOnly: return false
        default: return true
        }
    }

    var chatVisible: Bool {
        self == .chatAndVoice || self == .chatOnly
    }

    var isObserveMode: Bool {
        self == .alwaysOnAudio || self == .alwaysOnScreen
    }

    /// Active session modes (shown in the main 2x2 grid)
    static var activeModes: [RediSessionMode] {
        [.videoAndVoice, .chatAndVoice, .voiceOnly, .chatOnly]
    }

    /// Observation modes (shown in the Always On section)
    static var observeModes: [RediSessionMode] {
        [.alwaysOnAudio, .alwaysOnScreen]
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
