/**
 * RediShortcuts.swift
 *
 * Siri Shortcuts integration for Redi.
 * Registers "Call Redi" and "Hey Redi" shortcuts.
 * Call during onboarding and on every app launch.
 */

import Intents
import IntentsUI
import CoreSpotlight

class RediShortcuts {

    static func registerShortcuts() {
        // "Call Redi" shortcut
        let callActivity = NSUserActivity(activityType: "com.redi.startSession")
        callActivity.title = "Call Redi"
        callActivity.suggestedInvocationPhrase = "Call Redi"
        callActivity.isEligibleForSearch = true
        callActivity.isEligibleForPrediction = true
        callActivity.persistentIdentifier = "com.redi.startSession"

        let attributes = CSSearchableItemAttributeSet(contentType: .item)
        attributes.contentDescription = "Start a voice session with Redi"
        callActivity.contentAttributeSet = attributes

        // "Hey Redi" shortcut
        let heyActivity = NSUserActivity(activityType: "com.redi.heyRedi")
        heyActivity.title = "Hey Redi"
        heyActivity.suggestedInvocationPhrase = "Hey Redi"
        heyActivity.isEligibleForSearch = true
        heyActivity.isEligibleForPrediction = true
        heyActivity.persistentIdentifier = "com.redi.heyRedi"

        // Donate to Siri
        let interaction = INInteraction(intent: INStartCallIntent(), response: nil)
        interaction.donate { error in
            if let error = error {
                print("[Siri] Donation error: \(error)")
            }
        }
    }

    static func handleShortcut(activity: NSUserActivity) -> Bool {
        switch activity.activityType {
        case "com.redi.startSession", "com.redi.heyRedi":
            NotificationCenter.default.post(name: .rediStartSession, object: nil)
            return true
        default:
            return false
        }
    }
}

extension Notification.Name {
    static let rediStartSession = Notification.Name("rediStartSession")
}
