/**
 * RediApp.swift
 *
 * REDI APP ENTRY POINT
 * 
 * Main app initialization with:
 * - Notification delegate setup
 * - Health services initialization
 * - Tab-based navigation
 *
 * Created: Jan 29, 2026
 */

import SwiftUI
import UserNotifications

// MARK: - App State (shared across views)

class AppState: ObservableObject {
    static let shared = AppState()
    @Published var useV9 = false  // Set to true to test V9 Three-Brain architecture
}

@main
struct RediApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState.shared

    var body: some Scene {
        WindowGroup {
            RediTabView()
                .environmentObject(appState)
        }
    }
}

// MARK: - App Delegate

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = self
        
        // Register notification categories for medication reminders
        registerNotificationCategories()
        
        // Request notification permissions
        requestNotificationPermissions()

        // Register for remote notifications (push)
        application.registerForRemoteNotifications()

        // Register Siri Shortcuts
        RediShortcuts.registerShortcuts()

        // Register push notification categories for Redi
        PushNotificationService.shared.registerCategories()

        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushNotificationService.shared.registerToken(deviceToken)
    }
    
    // MARK: - Notification Setup
    
    private func registerNotificationCategories() {
        // Medication reminder actions
        let takenAction = UNNotificationAction(
            identifier: "TAKEN_ACTION",
            title: "✓ Taken",
            options: [.foreground]
        )
        
        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE_ACTION",
            title: "⏰ Snooze 15min",
            options: []
        )
        
        let skipAction = UNNotificationAction(
            identifier: "SKIP_ACTION",
            title: "Skip",
            options: [.destructive]
        )
        
        let medicationCategory = UNNotificationCategory(
            identifier: "MEDICATION_REMINDER",
            actions: [takenAction, snoozeAction, skipAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        
        UNUserNotificationCenter.current().setNotificationCategories([medicationCategory])
    }
    
    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("[Redi] Notification permissions granted")
            } else if let error = error {
                print("[Redi] Notification permission error: \(error)")
            }
        }
    }
    
    // MARK: - Notification Delegate Methods
    
    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is open
        completionHandler([.banner, .sound])
    }
    
    // Handle notification actions
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let medicationId = userInfo["medicationId"] as? String
        let scheduleTimeId = userInfo["scheduleTimeId"] as? String
        
        switch response.actionIdentifier {
        case "TAKEN_ACTION":
            handleMedicationTaken(medicationId: medicationId, scheduleTimeId: scheduleTimeId)
            
        case "SNOOZE_ACTION":
            handleMedicationSnooze(medicationId: medicationId, scheduleTimeId: scheduleTimeId)
            
        case "SKIP_ACTION":
            handleMedicationSkipped(medicationId: medicationId, scheduleTimeId: scheduleTimeId)
            
        case UNNotificationDefaultActionIdentifier:
            // User tapped notification - open app
            print("[Redi] Notification tapped")
            
        case UNNotificationDismissActionIdentifier:
            // User dismissed notification
            print("[Redi] Notification dismissed")
            
        default:
            break
        }
        
        completionHandler()
    }
    
    // MARK: - Medication Action Handlers
    
    private func handleMedicationTaken(medicationId: String?, scheduleTimeId: String?) {
        guard let medId = medicationId else { return }
        
        print("[Redi] Medication taken: \(medId)")
        
        // Log the dose
        let medicationService = MedicationService.shared
        medicationService.logDose(medicationId: medId, taken: true, notes: "Logged via notification")
        
        // Post notification to update UI
        NotificationCenter.default.post(name: .medicationDoseLogged, object: nil, userInfo: ["medicationId": medId])
    }
    
    private func handleMedicationSnooze(medicationId: String?, scheduleTimeId: String?) {
        guard let medId = medicationId else { return }
        
        print("[Redi] Medication snoozed: \(medId)")
        
        // Schedule reminder in 15 minutes
        let content = UNMutableNotificationContent()
        content.title = "Medication Reminder (Snoozed)"
        content.body = "Time to take your medication!"
        content.sound = .default
        content.categoryIdentifier = "MEDICATION_REMINDER"
        content.userInfo = ["medicationId": medId, "scheduleTimeId": scheduleTimeId ?? ""]
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 15 * 60, repeats: false)
        let request = UNNotificationRequest(identifier: "snooze-\(medId)-\(Date().timeIntervalSince1970)", content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request)
    }
    
    private func handleMedicationSkipped(medicationId: String?, scheduleTimeId: String?) {
        guard let medId = medicationId else { return }
        
        print("[Redi] Medication skipped: \(medId)")
        
        // Log as not taken
        let medicationService = MedicationService.shared
        medicationService.logDose(medicationId: medId, taken: false, notes: "Skipped via notification")
        
        // Post notification to update UI
        NotificationCenter.default.post(name: .medicationDoseLogged, object: nil, userInfo: ["medicationId": medId])
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let medicationDoseLogged = Notification.Name("medicationDoseLogged")
}
