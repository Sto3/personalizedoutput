/**
 * MotionService.swift
 *
 * IMU Sensor Fusion for Redi
 *
 * Uses CoreMotion to understand user's physical state:
 * - Detects significant movement for video clip capture
 * - Stationary vs walking vs exercising classification
 * - Phone orientation (upright, flat, angled)
 * - Sudden movements (potential falls)
 *
 * This context helps Redi adapt responses and detect activities
 * even when vision is limited.
 */

import CoreMotion
import Combine
import Foundation

// MARK: - Motion State Model

/// Comprehensive motion state for perception
struct MotionState: Codable {
    let isStationary: Bool
    let isWalking: Bool
    let isExercising: Bool
    let phoneOrientation: String  // "upright", "flat", "angled", "face_down", "landscape"
    let suddenMovement: Bool      // Potential fall or jerk
    let activityLevel: Float      // 0.0 (still) to 1.0 (intense)
    let timestamp: TimeInterval

    static let stationary = MotionState(
        isStationary: true,
        isWalking: false,
        isExercising: false,
        phoneOrientation: "unknown",
        suddenMovement: false,
        activityLevel: 0.0,
        timestamp: Date().timeIntervalSince1970 * 1000
    )
}

class MotionService: ObservableObject {
    // MARK: - Published Properties

    @Published var isMonitoring: Bool = false
    @Published var currentAcceleration: Double = 0
    @Published var motionDetected: Bool = false

    // New: Comprehensive motion state
    @Published var currentState: MotionState = .stationary
    @Published var phoneOrientation: String = "unknown"

    // MARK: - Publishers

    let significantMotionDetected = PassthroughSubject<Void, Never>()
    let motionStateUpdated = PassthroughSubject<MotionState, Never>()
    let suddenMovementDetected = PassthroughSubject<Void, Never>()
    let activityChanged = PassthroughSubject<String, Never>()

    // MARK: - Private Properties

    private let motionManager = CMMotionManager()
    private let activityManager = CMMotionActivityManager()
    private var motionThreshold: Double = 0.3
    private var cooldownTimer: Timer?
    private var isInCooldown: Bool = false
    private var cooldownDuration: TimeInterval = 5.0  // Seconds between triggers

    // Acceleration history for smoothing
    private var accelerationHistory: [Double] = []
    private let historySize = 10

    // Activity classification thresholds
    private let stationaryThreshold: Double = 0.05
    private let walkingThreshold: Double = 0.1
    private let exercisingThreshold: Double = 0.5
    private let suddenMovementThreshold: Double = 2.0

    // Activity tracking
    private var previousActivity: String = "unknown"

    // MARK: - Initialization

    init() {
        // Check availability
        guard motionManager.isDeviceMotionAvailable else {
            print("[Motion] Device motion not available")
            return
        }

        motionManager.deviceMotionUpdateInterval = 0.1  // 10 Hz
    }

    // MARK: - Monitoring Control

    func startMonitoring(threshold: Double = 0.3, cooldown: TimeInterval = 5.0) {
        guard !isMonitoring else { return }
        guard motionManager.isDeviceMotionAvailable else {
            print("[Motion] Device motion not available")
            return
        }

        motionThreshold = threshold
        cooldownDuration = cooldown
        accelerationHistory.removeAll()

        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self = self, let motion = motion else { return }
            self.processMotion(motion)
        }

        isMonitoring = true
        print("[Motion] Started monitoring (threshold: \(threshold))")
    }

    func stopMonitoring() {
        motionManager.stopDeviceMotionUpdates()
        cooldownTimer?.invalidate()
        cooldownTimer = nil
        isMonitoring = false
        isInCooldown = false
        print("[Motion] Stopped monitoring")
    }

    func updateThreshold(_ threshold: Double) {
        motionThreshold = max(0.1, min(1.0, threshold))
        print("[Motion] Threshold updated to \(motionThreshold)")
    }

    // MARK: - Motion Processing

    private func processMotion(_ motion: CMDeviceMotion) {
        let userAcceleration = motion.userAcceleration
        let gravity = motion.gravity

        // Calculate magnitude of user acceleration (ignoring gravity)
        let magnitude = sqrt(
            pow(userAcceleration.x, 2) +
            pow(userAcceleration.y, 2) +
            pow(userAcceleration.z, 2)
        )

        // Update history for smoothing
        accelerationHistory.append(magnitude)
        if accelerationHistory.count > historySize {
            accelerationHistory.removeFirst()
        }

        // Calculate smoothed acceleration
        let smoothedAcceleration = accelerationHistory.reduce(0, +) / Double(accelerationHistory.count)
        currentAcceleration = smoothedAcceleration

        // Check for significant motion (original behavior)
        let isSignificant = smoothedAcceleration > motionThreshold

        // Enhanced: Classify phone orientation from gravity
        let orientation = classifyOrientation(gravity)

        // Enhanced: Detect sudden movements (potential fall)
        let suddenMovement = magnitude > suddenMovementThreshold

        // Enhanced: Classify activity level
        let isStationary = smoothedAcceleration < stationaryThreshold
        let isWalking = smoothedAcceleration >= walkingThreshold && smoothedAcceleration < exercisingThreshold
        let isExercising = smoothedAcceleration >= exercisingThreshold
        let activityLevel = min(Float(smoothedAcceleration / exercisingThreshold), 1.0)

        // Create comprehensive motion state
        let state = MotionState(
            isStationary: isStationary,
            isWalking: isWalking,
            isExercising: isExercising,
            phoneOrientation: orientation,
            suddenMovement: suddenMovement,
            activityLevel: activityLevel,
            timestamp: Date().timeIntervalSince1970 * 1000
        )

        DispatchQueue.main.async {
            self.motionDetected = isSignificant
            self.currentState = state
            self.phoneOrientation = orientation
        }

        // Send state update
        motionStateUpdated.send(state)

        // Emit sudden movement event
        if suddenMovement {
            suddenMovementDetected.send()
        }

        // Emit activity change
        let currentActivity = isExercising ? "exercising" : (isWalking ? "walking" : "stationary")
        if currentActivity != previousActivity {
            previousActivity = currentActivity
            activityChanged.send(currentActivity)
        }

        // Trigger video clip if significant and not in cooldown (original behavior)
        if isSignificant && !isInCooldown {
            triggerMotionEvent()
        }
    }

    /// Classify phone orientation from gravity vector
    private func classifyOrientation(_ gravity: CMAcceleration) -> String {
        // gravity.z close to -1 means phone is flat, face up
        // gravity.z close to 1 means phone is flat, face down
        // gravity.y close to -1 means phone is upright (portrait)

        if abs(gravity.z) > 0.9 {
            return gravity.z < 0 ? "flat" : "face_down"
        } else if abs(gravity.y) > 0.7 {
            return "upright"
        } else if abs(gravity.x) > 0.7 {
            return "landscape"
        } else {
            return "angled"
        }
    }

    private func triggerMotionEvent() {
        isInCooldown = true
        print("[Motion] Significant motion detected (acceleration: \(currentAcceleration))")

        significantMotionDetected.send()

        // Start cooldown timer
        cooldownTimer?.invalidate()
        cooldownTimer = Timer.scheduledTimer(withTimeInterval: cooldownDuration, repeats: false) { [weak self] _ in
            self?.isInCooldown = false
        }
    }

    // MARK: - Cleanup

    deinit {
        stopMonitoring()
    }
}

// MARK: - Motion Sensitivity Presets

extension MotionService {
    enum SensitivityPreset {
        case low      // Less sensitive - only large movements
        case medium   // Default - moderate movements
        case high     // More sensitive - small movements trigger

        var threshold: Double {
            switch self {
            case .low: return 0.5
            case .medium: return 0.3
            case .high: return 0.15
            }
        }

        var cooldown: TimeInterval {
            switch self {
            case .low: return 8.0
            case .medium: return 5.0
            case .high: return 3.0
            }
        }
    }

    func applyPreset(_ preset: SensitivityPreset) {
        motionThreshold = preset.threshold
        cooldownDuration = preset.cooldown
        print("[Motion] Applied preset: threshold=\(preset.threshold), cooldown=\(preset.cooldown)s")
    }
}

// MARK: - Motion State Utilities

extension MotionService {
    /// Get a summary suitable for the perception packet
    func getMotionSummary() -> [String: Any] {
        return [
            "isStationary": currentState.isStationary,
            "isWalking": currentState.isWalking,
            "isExercising": currentState.isExercising,
            "phoneOrientation": currentState.phoneOrientation,
            "activityLevel": currentState.activityLevel,
            "suddenMovement": currentState.suddenMovement
        ]
    }

    /// Suggest a mode based on motion patterns
    func getSuggestedMode() -> RediMode? {
        if currentState.isExercising {
            return .sports
        }
        return nil
    }
}
