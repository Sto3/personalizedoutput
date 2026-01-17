/**
 * DriverMonitoringService.swift
 *
 * ARKit face tracking for drowsiness and distraction detection.
 * Runs entirely on-device (FREE) - no cloud API calls.
 */

import ARKit
import Combine

class DriverMonitoringService: NSObject, ObservableObject {
    @Published var isDrowsy: Bool = false
    @Published var isDistracted: Bool = false
    @Published var eyesClosedDuration: TimeInterval = 0
    @Published var lookingAwayDuration: TimeInterval = 0
    @Published var isMonitoring: Bool = false

    private var arSession: ARSession?
    private var faceAnchor: ARFaceAnchor?

    // Thresholds
    private let eyeClosedThreshold: Float = 0.3  // ARKit eye openness value
    private let drowsinessTimeThreshold: TimeInterval = 2.0  // Eyes closed for 2+ sec
    private let lookingAwayThreshold: TimeInterval = 3.0  // Looking away for 3+ sec
    private let headTurnThreshold: Float = 0.5  // Radians of head rotation

    // Tracking
    private var eyesClosedStartTime: Date?
    private var lookingAwayStartTime: Date?

    // Callbacks
    var onDrowsinessDetected: (() -> Void)?
    var onDistractionDetected: (() -> Void)?
    var onAlertCleared: (() -> Void)?

    // Cooldowns (don't spam alerts)
    private var lastDrowsinessAlert: Date = .distantPast
    private var lastDistractionAlert: Date = .distantPast
    private let alertCooldown: TimeInterval = 10.0  // 10 seconds between alerts

    func startMonitoring() {
        guard ARFaceTrackingConfiguration.isSupported else {
            print("[DriverMonitor] Face tracking not supported on this device")
            return
        }

        arSession = ARSession()
        arSession?.delegate = self

        let config = ARFaceTrackingConfiguration()
        config.isLightEstimationEnabled = true

        arSession?.run(config, options: [.resetTracking])
        isMonitoring = true
        print("[DriverMonitor] Started monitoring")
    }

    func stopMonitoring() {
        arSession?.pause()
        arSession = nil
        isMonitoring = false
        isDrowsy = false
        isDistracted = false
        eyesClosedDuration = 0
        lookingAwayDuration = 0
        print("[DriverMonitor] Stopped monitoring")
    }

    private func checkDrowsiness(_ faceAnchor: ARFaceAnchor) {
        let blendShapes = faceAnchor.blendShapes

        guard let leftEyeBlink = blendShapes[.eyeBlinkLeft]?.floatValue,
              let rightEyeBlink = blendShapes[.eyeBlinkRight]?.floatValue else {
            return
        }

        let avgEyeClosure = (leftEyeBlink + rightEyeBlink) / 2.0
        let eyesClosed = avgEyeClosure > (1.0 - eyeClosedThreshold)

        if eyesClosed {
            if eyesClosedStartTime == nil {
                eyesClosedStartTime = Date()
            }

            let duration = Date().timeIntervalSince(eyesClosedStartTime!)
            DispatchQueue.main.async {
                self.eyesClosedDuration = duration
            }

            if duration >= drowsinessTimeThreshold && !isDrowsy {
                if Date().timeIntervalSince(lastDrowsinessAlert) > alertCooldown {
                    DispatchQueue.main.async {
                        self.isDrowsy = true
                    }
                    lastDrowsinessAlert = Date()
                    onDrowsinessDetected?()
                }
            }
        } else {
            eyesClosedStartTime = nil
            DispatchQueue.main.async {
                self.eyesClosedDuration = 0
            }

            if isDrowsy {
                DispatchQueue.main.async {
                    self.isDrowsy = false
                }
                onAlertCleared?()
            }
        }
    }

    private func checkDistraction(_ faceAnchor: ARFaceAnchor) {
        let transform = faceAnchor.transform

        // Extract euler angles from transform matrix
        let yaw = atan2(transform.columns.0.z, transform.columns.0.x)
        let pitch = asin(-transform.columns.0.y)

        let isLookingAway = abs(yaw - .pi/2) > headTurnThreshold || abs(pitch) > headTurnThreshold * 0.7

        if isLookingAway {
            if lookingAwayStartTime == nil {
                lookingAwayStartTime = Date()
            }

            let duration = Date().timeIntervalSince(lookingAwayStartTime!)
            DispatchQueue.main.async {
                self.lookingAwayDuration = duration
            }

            if duration >= lookingAwayThreshold && !isDistracted {
                if Date().timeIntervalSince(lastDistractionAlert) > alertCooldown {
                    DispatchQueue.main.async {
                        self.isDistracted = true
                    }
                    lastDistractionAlert = Date()
                    onDistractionDetected?()
                }
            }
        } else {
            lookingAwayStartTime = nil
            DispatchQueue.main.async {
                self.lookingAwayDuration = 0
            }

            if isDistracted {
                DispatchQueue.main.async {
                    self.isDistracted = false
                }
                onAlertCleared?()
            }
        }
    }
}

// MARK: - ARSessionDelegate

extension DriverMonitoringService: ARSessionDelegate {
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard let faceAnchor = anchors.compactMap({ $0 as? ARFaceAnchor }).first else {
            return
        }

        self.faceAnchor = faceAnchor
        checkDrowsiness(faceAnchor)
        checkDistraction(faceAnchor)
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        print("[DriverMonitor] AR session failed: \(error.localizedDescription)")
    }

    func sessionWasInterrupted(_ session: ARSession) {
        print("[DriverMonitor] AR session interrupted")
    }

    func sessionInterruptionEnded(_ session: ARSession) {
        print("[DriverMonitor] AR session interruption ended")
        // Resume tracking
        if let config = session.configuration {
            session.run(config, options: [.resetTracking])
        }
    }
}
