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
    @Published var useV9 = true  // V9 Three-Brain architecture (Cerebras + Haiku + GPT-4o)
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
        UNUserNotificationCenter.current().delegate = self
        registerNotificationCategories()
        requestNotificationPermissions()
        application.registerForRemoteNotifications()
        RediShortcuts.registerShortcuts()
        PushNotificationService.shared.registerCategories()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushNotificationService.shared.registerToken(deviceToken)
    }
    
    private func registerNotificationCategories() {
        let takenAction = UNNotificationAction(identifier: "TAKEN_ACTION", title: "\u2713 Taken", options: [.foreground])
        let snoozeAction = UNNotificationAction(identifier: "SNOOZE_ACTION", title: "\u23f0 Snooze 15min", options: [])
        let skipAction = UNNotificationAction(identifier: "SKIP_ACTION", title: "Skip", options: [.destructive])
        let medicationCategory = UNNotificationCategory(identifier: "MEDICATION_REMINDER", actions: [takenAction, snoozeAction, skipAction], intentIdentifiers: [], options: [.customDismissAction])
        UNUserNotificationCenter.current().setNotificationCategories([medicationCategory])
    }
    
    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted { print("[Redi] Notification permissions granted") }
            else if let error = error { print("[Redi] Notification permission error: \(error)") }
        }
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let medicationId = userInfo["medicationId"] as? String
        let scheduleTimeId = userInfo["scheduleTimeId"] as? String
        
        switch response.actionIdentifier {
        case "TAKEN_ACTION": handleMedicationTaken(medicationId: medicationId, scheduleTimeId: scheduleTimeId)
        case "SNOOZE_ACTION": handleMedicationSnooze(medicationId: medicationId, scheduleTimeId: scheduleTimeId)
        case "SKIP_ACTION": handleMedicationSkipped(medicationId: medicationId, scheduleTimeId: scheduleTimeId)
        case UNNotificationDefaultActionIdentifier: print("[Redi] Notification tapped")
        case UNNotificationDismissActionIdentifier: print("[Redi] Notification dismissed")
        default: break
        }
        completionHandler()
    }
    
    private func handleMedicationTaken(medicationId: String?, scheduleTimeId: String?) {
        guard let medId = medicationId else { return }
        print("[Redi] Medication taken: \(medId)")
        MedicationService.shared.logDose(medicationId: medId, taken: true, notes: "Logged via notification")
        NotificationCenter.default.post(name: .medicationDoseLogged, object: nil, userInfo: ["medicationId": medId])
    }
    
    private func handleMedicationSnooze(medicationId: String?, scheduleTimeId: String?) {
        guard let medId = medicationId else { return }
        print("[Redi] Medication snoozed: \(medId)")
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
        MedicationService.shared.logDose(medicationId: medId, taken: false, notes: "Skipped via notification")
        NotificationCenter.default.post(name: .medicationDoseLogged, object: nil, userInfo: ["medicationId": medId])
    }
}

extension Notification.Name {
    static let medicationDoseLogged = Notification.Name("medicationDoseLogged")
}
