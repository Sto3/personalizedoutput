/**
 * MotionService.swift
 *
 * Detects significant movement using Core Motion framework.
 * Triggers video clip capture when movement is detected.
 */

import CoreMotion
import Combine

class MotionService: ObservableObject {
    // MARK: - Published Properties

    @Published var isMonitoring: Bool = false
    @Published var currentAcceleration: Double = 0
    @Published var motionDetected: Bool = false

    // MARK: - Publishers

    let significantMotionDetected = PassthroughSubject<Void, Never>()

    // MARK: - Private Properties

    private let motionManager = CMMotionManager()
    private var motionThreshold: Double = 0.3
    private var cooldownTimer: Timer?
    private var isInCooldown: Bool = false
    private var cooldownDuration: TimeInterval = 5.0  // Seconds between triggers

    // Acceleration history for smoothing
    private var accelerationHistory: [Double] = []
    private let historySize = 10

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

        // Check for significant motion
        let isSignificant = smoothedAcceleration > motionThreshold

        DispatchQueue.main.async {
            self.motionDetected = isSignificant
        }

        // Trigger if significant and not in cooldown
        if isSignificant && !isInCooldown {
            triggerMotionEvent()
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
