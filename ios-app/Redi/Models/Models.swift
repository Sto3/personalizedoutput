/**
 * Models.swift
 *
 * Core data models for the Redi iOS app.
 */

import Foundation

// MARK: - Session Models

struct RediSession: Codable, Identifiable {
    let id: String
    let mode: RediMode
    let sensitivity: Double
    let voiceGender: VoiceGender
    let durationMinutes: Int
    let expiresAt: Date
    var status: SessionStatus
    let websocketUrl: String

    // Multi-phone session fields
    let joinCode: String?
    let isHost: Bool
    var participantCount: Int
    let maxParticipants: Int
    var audioOutputMode: AudioOutputMode

    var remainingSeconds: Int {
        max(0, Int(expiresAt.timeIntervalSinceNow))
    }

    var isExpired: Bool {
        Date() >= expiresAt
    }
}

enum AudioOutputMode: String, Codable {
    case hostOnly = "host_only"
    case allDevices = "all_devices"

    var displayName: String {
        switch self {
        case .hostOnly: return "Host Only"
        case .allDevices: return "All Devices"
        }
    }
}

struct SessionParticipant: Codable, Identifiable {
    let deviceId: String
    let isHost: Bool
    let deviceName: String?

    var id: String { deviceId }
}

enum RediMode: String, Codable, CaseIterable {
    case studying = "studying"
    case meeting = "meeting"
    case sports = "sports"
    case music = "music"
    case assembly = "assembly"
    case monitoring = "monitoring"

    var displayName: String {
        switch self {
        case .studying: return "Studying & Learning"
        case .meeting: return "Meeting & Presentation"
        case .sports: return "Sports & Movement"
        case .music: return "Music & Instrument"
        case .assembly: return "Building & Assembly"
        case .monitoring: return "Watching Over"
        }
    }

    var icon: String {
        switch self {
        case .studying: return "book.fill"
        case .meeting: return "person.3.fill"
        case .sports: return "figure.run"
        case .music: return "music.note"
        case .assembly: return "wrench.and.screwdriver.fill"
        case .monitoring: return "eye.fill"
        }
    }

    var usesMotionDetection: Bool {
        switch self {
        case .sports, .music, .assembly: return true
        default: return false
        }
    }

    var snapshotIntervalMs: Int {
        switch self {
        case .studying: return 8000
        case .meeting: return 10000
        case .sports: return 0  // Motion triggered only
        case .music: return 0
        case .assembly: return 5000
        case .monitoring: return 15000
        }
    }
}

enum VoiceGender: String, Codable, CaseIterable {
    case male = "male"
    case female = "female"

    var displayName: String {
        switch self {
        case .male: return "Male"
        case .female: return "Female"
        }
    }
}

enum SessionStatus: String, Codable {
    case active = "active"
    case paused = "paused"
    case expired = "expired"
    case ended = "ended"
}

// MARK: - Subscription Models

enum SubscriptionTier: String, Codable, CaseIterable {
    case starter = "starter"
    case regular = "regular"
    case unlimited = "unlimited"

    var displayName: String {
        switch self {
        case .starter: return "Starter"
        case .regular: return "Regular"
        case .unlimited: return "Unlimited"
        }
    }

    var priceMonthly: Int {
        switch self {
        case .starter: return 72
        case .regular: return 110
        case .unlimited: return 149
        }
    }

    var sessionsIncluded: Int {
        switch self {
        case .starter: return 3
        case .regular: return 5
        case .unlimited: return -1  // Unlimited
        }
    }

    var sessionDuration: Int {
        return 30  // All subscription sessions are 30 min
    }

    var features: [String] {
        switch self {
        case .starter:
            return [
                "3 sessions per month",
                "30 minutes each",
                "All modes included",
                "Multi-phone support"
            ]
        case .regular:
            return [
                "5 sessions per month",
                "30 minutes each",
                "All modes included",
                "Multi-phone support",
                "Priority support"
            ]
        case .unlimited:
            return [
                "Unlimited sessions",
                "30 minutes each",
                "All modes included",
                "Multi-phone support",
                "Priority support",
                "Early access to new features"
            ]
        }
    }

    var isUnlimited: Bool {
        return sessionsIncluded == -1
    }
}

struct UserSubscription: Codable {
    let hasSubscription: Bool
    let tierId: SubscriptionTier?
    let tierName: String?
    let status: String?
    let sessionsRemaining: Int
    let sessionsUsedThisPeriod: Int
    let isUnlimited: Bool
    let periodEnd: Date?
    let canStartSession: Bool
}

enum PurchaseType: String, Codable {
    case oneTime = "one_time"
    case subscription = "subscription"
}

struct OneTimePurchase: Identifiable {
    let id: Int  // Duration in minutes
    let duration: Int
    let price: Int

    static let twentyMinutes = OneTimePurchase(id: 20, duration: 20, price: 14)
    static let thirtyMinutes = OneTimePurchase(id: 30, duration: 30, price: 26)
    static let sixtyMinutes = OneTimePurchase(id: 60, duration: 60, price: 49)

    static let all: [OneTimePurchase] = [twentyMinutes, thirtyMinutes, sixtyMinutes]
}

// MARK: - Configuration

struct SessionConfig: Codable {
    var mode: RediMode
    var sensitivity: Double
    var voiceGender: VoiceGender
    var durationMinutes: Int
    var voiceOnly: Bool  // Audio-only mode without camera

    static var `default`: SessionConfig {
        SessionConfig(
            mode: .studying,
            sensitivity: 0.5,
            voiceGender: .female,
            durationMinutes: 15,
            voiceOnly: false
        )
    }
}

// MARK: - Minute Balance

struct MinuteBalance: Codable {
    let hasSubscription: Bool
    let tierId: String?
    let tierName: String?
    let status: String?
    let minutesRemaining: Int
    let minutesUsedThisPeriod: Int
    let isUnlimited: Bool
    let periodEnd: Date?
    let canStartSession: Bool
    let minutesRemainingDisplay: String?
}

struct AppConfig: Codable {
    let modes: [ModeConfig]
    let voices: [VoiceOption]
    let pricing: [String: PriceOption]

    struct ModeConfig: Codable {
        let id: String
        let name: String
        let description: String
        let defaultSensitivity: Double
        let usesMotionDetection: Bool
    }

    struct VoiceOption: Codable {
        let id: String
        let name: String
        let gender: String
    }

    struct PriceOption: Codable {
        let price: Int
        let currency: String
        let label: String
    }
}

// MARK: - WebSocket Messages

struct WSMessage: Codable {
    let type: WSMessageType
    let sessionId: String
    let timestamp: Int
    let payload: [String: AnyCodable]?
}

enum WSMessageType: String, Codable {
    case sessionStart = "session_start"
    case sessionEnd = "session_end"
    case audioChunk = "audio_chunk"
    case transcript = "transcript"
    case snapshot = "snapshot"
    case motionClip = "motion_clip"
    case visualAnalysis = "visual_analysis"
    case aiResponse = "ai_response"
    case voiceAudio = "voice_audio"
    case sensitivityUpdate = "sensitivity_update"
    case error = "error"
    case ping = "ping"
    case pong = "pong"
    // Multi-phone session messages
    case participantJoined = "participant_joined"
    case participantLeft = "participant_left"
    case participantList = "participant_list"
    case audioOutputModeChanged = "audio_output_mode_changed"
    // Military-grade perception messages
    case perception = "perception"
    case userSpeaking = "user_speaking"
    case userStopped = "user_stopped"
}

// MARK: - Transcript

struct TranscriptChunk: Codable {
    let text: String
    let isFinal: Bool
    let confidence: Double
    let timestamp: Int
}

// MARK: - Visual Analysis

struct VisualAnalysis: Codable {
    let description: String
    let detectedObjects: [String]
    let textContent: [String]
    let suggestions: [String]
    let timestamp: Int
}

// MARK: - AI Response

struct AIResponse: Codable {
    let text: String
    let isStreaming: Bool
    let isFinal: Bool
}

// MARK: - Voice Audio

struct VoiceAudio: Codable {
    let audio: String  // Base64 encoded
    let format: String
    let isStreaming: Bool
    let isFinal: Bool
}

// MARK: - Helper for Any Codable

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

// MARK: - Session History

struct SessionHistoryEntry: Codable, Identifiable {
    let id: String
    let userId: String
    let deviceId: String?
    let mode: String
    let durationMinutes: Int
    let actualDurationSeconds: Int?
    let aiResponsesCount: Int
    let userQuestionsCount: Int
    let snapshotsAnalyzed: Int
    let motionClipsAnalyzed: Int
    let aiSummary: String?
    let keyFeedback: [String]?
    let startedAt: Date
    let endedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case deviceId = "device_id"
        case mode
        case durationMinutes = "duration_minutes"
        case actualDurationSeconds = "actual_duration_seconds"
        case aiResponsesCount = "ai_responses_count"
        case userQuestionsCount = "user_questions_count"
        case snapshotsAnalyzed = "snapshots_analyzed"
        case motionClipsAnalyzed = "motion_clips_analyzed"
        case aiSummary = "ai_summary"
        case keyFeedback = "key_feedback"
        case startedAt = "started_at"
        case endedAt = "ended_at"
    }

    var modeDisplayName: String {
        let modes: [String: String] = [
            "studying": "Studying & Learning",
            "meeting": "Meeting & Presentation",
            "sports": "Sports & Movement",
            "music": "Music & Instrument",
            "assembly": "Building & Assembly",
            "monitoring": "Watching Over"
        ]
        return modes[mode] ?? mode.capitalized
    }

    var formattedDuration: String {
        guard let seconds = actualDurationSeconds else {
            return "\(durationMinutes) min"
        }
        let minutes = seconds / 60
        return "\(minutes) min"
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: startedAt)
    }
}

struct SessionStats: Codable {
    let totalSessions: Int
    let totalMinutes: Int
    let favoriteMode: String?
    let averageSessionLength: Int

    enum CodingKeys: String, CodingKey {
        case totalSessions = "total_sessions"
        case totalMinutes = "total_minutes"
        case favoriteMode = "favorite_mode"
        case averageSessionLength = "average_session_length"
    }
}

// MARK: - JSONDecoder Extension for ISO8601 with Fractional Seconds

extension JSONDecoder {
    /// Returns a JSONDecoder configured to handle ISO8601 dates with or without milliseconds
    static var rediDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        let formatterWithFractionalSeconds = ISO8601DateFormatter()
        formatterWithFractionalSeconds.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let formatterWithoutFractionalSeconds = ISO8601DateFormatter()
        formatterWithoutFractionalSeconds.formatOptions = [.withInternetDateTime]

        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            if let date = formatterWithFractionalSeconds.date(from: dateString) {
                return date
            }
            if let date = formatterWithoutFractionalSeconds.date(from: dateString) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date: \(dateString)")
        }
        return decoder
    }
}
