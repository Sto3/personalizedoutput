/**
 * DeveloperModeManager.swift
 *
 * Hidden developer mode activated by tapping the Redi logo 7 times.
 * Provides debug options and dual-vision toggle.
 */

import Foundation
import UIKit

class DeveloperModeManager: ObservableObject {
    @Published var isEnabled = false
    @Published var isDualVisionActive = false

    private var tapCount = 0
    private var lastTapTime: Date?
    private let tapThreshold: TimeInterval = 3.0
    private let requiredTaps = 7

    private let enabledKey = "developerModeEnabled"

    init() {
        isEnabled = UserDefaults.standard.bool(forKey: enabledKey)
    }

    func handleLogoTap() {
        let now = Date()

        if let lastTap = lastTapTime, now.timeIntervalSince(lastTap) > tapThreshold {
            tapCount = 0
        }

        tapCount += 1
        lastTapTime = now

        if tapCount >= requiredTaps {
            isEnabled.toggle()
            UserDefaults.standard.set(isEnabled, forKey: enabledKey)
            tapCount = 0

            if isEnabled {
                print("[DevMode] Developer mode ENABLED")
                let generator = UIImpactFeedbackGenerator(style: .heavy)
                generator.impactOccurred()
            } else {
                print("[DevMode] Developer mode DISABLED")
            }
        }
    }
}
