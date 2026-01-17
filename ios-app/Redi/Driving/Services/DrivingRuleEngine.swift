/**
 * DrivingRuleEngine.swift
 *
 * Manages alert priority and cooldowns for driving mode.
 * Ensures critical alerts (drowsiness, emergency vehicles) take precedence
 * over lower-priority notifications.
 */

import Foundation

enum DrivingAlertPriority: Int, Comparable {
    case low = 0
    case medium = 1
    case high = 2
    case critical = 3

    static func < (lhs: DrivingAlertPriority, rhs: DrivingAlertPriority) -> Bool {
        return lhs.rawValue < rhs.rawValue
    }
}

struct DrivingAlert {
    let message: String
    let priority: DrivingAlertPriority
    let type: AlertType

    enum AlertType: String {
        case navigation
        case drowsiness
        case distraction
        case tailgating
        case emergencyVehicle
        case fastApproach
        case reminder
    }
}

class DrivingRuleEngine: ObservableObject {
    @Published var currentAlert: DrivingAlert?
    @Published var alertQueue: [DrivingAlert] = []

    private var pendingAlerts: [DrivingAlert] = []
    private var lastAlertTime: [DrivingAlert.AlertType: Date] = [:]
    private var isSpeaking = false

    // Cooldowns per alert type
    private let cooldowns: [DrivingAlert.AlertType: TimeInterval] = [
        .navigation: 0,           // No cooldown for navigation
        .drowsiness: 10,          // 10 sec between drowsiness alerts
        .distraction: 10,         // 10 sec between distraction alerts
        .tailgating: 30,          // 30 sec between tailgating alerts
        .emergencyVehicle: 5,     // 5 sec for emergency (important)
        .fastApproach: 15,        // 15 sec between approach alerts
        .reminder: 300            // 5 min between reminders
    ]

    // Alert messages - varied for natural feel
    let alertMessages: [DrivingAlert.AlertType: [String]] = [
        .drowsiness: [
            "Hey. Eyes on the road.",
            "Stay alert.",
            "You seem tired. Consider a break."
        ],
        .distraction: [
            "Eyes up.",
            "Watch the road.",
            "Keep your eyes forward."
        ],
        .tailgating: [
            "Car close behind you.",
            "Vehicle tailgating.",
            "Someone's riding your bumper."
        ],
        .emergencyVehicle: [
            "Emergency vehicle approaching. Pull over when safe."
        ],
        .fastApproach: [
            "Vehicle approaching quickly from behind.",
            "Fast vehicle behind you."
        ],
        .reminder: [
            "You've been driving for an hour. Consider a rest stop.",
            "Two hours of driving. Break recommended."
        ]
    ]

    var onAlertReady: ((String) -> Void)?
    var onAlertFinished: (() -> Void)?

    // MARK: - Public Methods

    func queueAlert(type: DrivingAlert.AlertType, priority: DrivingAlertPriority, customMessage: String? = nil) {
        // Check cooldown
        if let lastTime = lastAlertTime[type],
           let cooldown = cooldowns[type],
           Date().timeIntervalSince(lastTime) < cooldown {
            return  // Still in cooldown
        }

        // Get message
        let message: String
        if let custom = customMessage {
            message = custom
        } else if let messages = alertMessages[type], let random = messages.randomElement() {
            message = random
        } else {
            return
        }

        let alert = DrivingAlert(message: message, priority: priority, type: type)

        // If higher priority than current, interrupt and speak immediately
        if let current = currentAlert {
            if alert.priority > current.priority {
                // Interrupt current alert
                pendingAlerts.insert(current, at: 0)
                speakAlert(alert)
            } else {
                // Queue for later, sorted by priority
                pendingAlerts.append(alert)
                pendingAlerts.sort { $0.priority > $1.priority }
            }
        } else if isSpeaking {
            // Something is being spoken, queue this
            pendingAlerts.append(alert)
            pendingAlerts.sort { $0.priority > $1.priority }
        } else {
            // Nothing playing, speak immediately
            speakAlert(alert)
        }

        updateAlertQueue()
    }

    func queueNavigationInstruction(_ instruction: String) {
        let alert = DrivingAlert(
            message: instruction,
            priority: .medium,
            type: .navigation
        )

        // Navigation can interrupt low-priority alerts
        if let current = currentAlert, current.priority < .medium {
            pendingAlerts.insert(current, at: 0)
            speakAlert(alert)
        } else if currentAlert == nil && !isSpeaking {
            speakAlert(alert)
        } else {
            // Insert at front since navigation is time-sensitive
            pendingAlerts.insert(alert, at: 0)
        }

        updateAlertQueue()
    }

    func alertFinished() {
        isSpeaking = false
        currentAlert = nil
        onAlertFinished?()
        processNextAlert()
    }

    func clearAllAlerts() {
        pendingAlerts.removeAll()
        currentAlert = nil
        isSpeaking = false
        updateAlertQueue()
    }

    // MARK: - Private Methods

    private func speakAlert(_ alert: DrivingAlert) {
        currentAlert = alert
        isSpeaking = true
        lastAlertTime[alert.type] = Date()
        onAlertReady?(alert.message)

        // Estimate speaking time and auto-finish (backup in case delegate doesn't call)
        let estimatedDuration = Double(alert.message.count) * 0.06 + 0.5  // ~60ms per char + buffer
        DispatchQueue.main.asyncAfter(deadline: .now() + estimatedDuration) { [weak self] in
            if self?.currentAlert?.message == alert.message {
                self?.alertFinished()
            }
        }
    }

    private func processNextAlert() {
        guard !pendingAlerts.isEmpty, !isSpeaking else { return }
        let next = pendingAlerts.removeFirst()
        speakAlert(next)
        updateAlertQueue()
    }

    private func updateAlertQueue() {
        DispatchQueue.main.async {
            self.alertQueue = self.pendingAlerts
        }
    }
}
