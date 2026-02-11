/**
 * PushNotificationService.swift
 *
 * APNs push notification registration and handling.
 * Notification types: check_in, reminder, call_incoming, session_summary, low_credits
 */

import UserNotifications
import UIKit

class PushNotificationService: ObservableObject {
    static let shared = PushNotificationService()

    @Published var isRegistered = false
    @Published var deviceToken: String?

    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                    isRegistered = true
                }
            }
            return granted
        } catch {
            print("[Push] Permission error: \(error)")
            return false
        }
    }

    func registerToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = tokenString
        print("[Push] Device token: \(tokenString)")
        sendTokenToServer(tokenString)
    }

    private func sendTokenToServer(_ token: String) {
        guard let url = URL(string: "https://redialways.com/api/notifications/register") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["token": token, "platform": "ios"])
        URLSession.shared.dataTask(with: request) { _, _, error in
            if let error = error {
                print("[Push] Token registration error: \(error)")
            }
        }.resume()
    }

    func registerCategories() {
        let startAction = UNNotificationAction(identifier: "START_SESSION", title: "Start Session", options: [.foreground])
        let remindAction = UNNotificationAction(identifier: "REMIND_LATER", title: "Remind Later", options: [])
        let dismissAction = UNNotificationAction(identifier: "DISMISS", title: "Dismiss", options: [.destructive])

        let checkInCategory = UNNotificationCategory(
            identifier: "REDI_CHECK_IN",
            actions: [startAction, remindAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        let reminderCategory = UNNotificationCategory(
            identifier: "REDI_REMINDER",
            actions: [startAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([checkInCategory, reminderCategory])
    }

    func handleNotification(_ userInfo: [AnyHashable: Any], actionIdentifier: String) {
        let type = userInfo["type"] as? String ?? ""

        switch actionIdentifier {
        case "START_SESSION":
            NotificationCenter.default.post(name: .rediStartSession, object: nil)
        case "REMIND_LATER":
            scheduleReminder(in: 30 * 60) // 30 minutes
        case "DISMISS":
            break
        default:
            if type == "check_in" || type == "reminder" {
                NotificationCenter.default.post(name: .rediStartSession, object: nil)
            }
        }
    }

    private func scheduleReminder(in seconds: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = "Redi"
        content.body = "Ready when you are."
        content.sound = .default
        content.categoryIdentifier = "REDI_CHECK_IN"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
        let request = UNNotificationRequest(identifier: "redi-snooze-\(Date().timeIntervalSince1970)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }
}
