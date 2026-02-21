/**
 * PushNotificationService.swift
 * Push notification registration and handling stub.
 * TODO: Wire up to server for Redi Reaches Out
 */

import Foundation
import UserNotifications

class PushNotificationService {
    static let shared = PushNotificationService()
    
    private init() {}
    
    func registerCategories() {
        print("[PushNotification] Categories registered (stub)")
    }
    
    func registerToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[PushNotification] Token: \(token.prefix(16))...")
        // TODO: Send token to server
    }
}
