/**
 * MedicationService.swift
 *
 * REDI HEALTH - Medication Compliance System
 * 
 * Features:
 * - Add/manage medications with schedules
 * - Push notification reminders
 * - Visual verification via front camera
 * - Voice logging
 * - Adherence tracking
 *
 * Created: Jan 26, 2026
 */

import Foundation
import UserNotifications
import Combine
import UIKit

class MedicationService: ObservableObject {
    static let shared = MedicationService()
    
    // MARK: - Published
    
    @Published var todaysSchedule: [ScheduledDose] = []
    @Published var pendingVerification: Medication?
    
    // MARK: - Dependencies
    
    private let dataManager = HealthDataManager.shared
    private let notificationCenter = UNUserNotificationCenter.current()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Types
    
    struct ScheduledDose: Identifiable {
        var id: String { "\(medication.id)-\(scheduledTime.timeIntervalSince1970)" }
        let medication: Medication
        let scheduledTime: Date
        var status: DoseStatus
        
        enum DoseStatus {
            case upcoming
            case due
            case taken(Date)
            case missed
            case skipped
        }
    }
    
    // MARK: - Init
    
    private init() {
        setupNotificationCategories()
        
        // Refresh schedule when medications change
        dataManager.$medications
            .sink { [weak self] _ in
                self?.refreshTodaysSchedule()
            }
            .store(in: &cancellables)
        
        // Initial load
        refreshTodaysSchedule()
    }
    
    // MARK: - Notification Setup
    
    private func setupNotificationCategories() {
        let takenAction = UNNotificationAction(
            identifier: "TAKEN",
            title: "✓ Taken",
            options: []
        )
        
        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE",
            title: "Snooze 10 min",
            options: []
        )
        
        let skipAction = UNNotificationAction(
            identifier: "SKIP",
            title: "Skip",
            options: [.destructive]
        )
        
        let category = UNNotificationCategory(
            identifier: "MEDICATION_REMINDER",
            actions: [takenAction, snoozeAction, skipAction],
            intentIdentifiers: [],
            options: []
        )
        
        notificationCenter.setNotificationCategories([category])
    }
    
    // MARK: - Add Medication
    
    func addMedication(name: String, dosage: String, times: [ScheduleTime], instructions: String? = nil) {
        let medication = Medication(
            name: name,
            dosage: dosage,
            schedule: times,
            instructions: instructions
        )
        
        dataManager.addMedication(medication)
        scheduleNotifications(for: medication)
        refreshTodaysSchedule()
    }
    
    // MARK: - Schedule Notifications
    
    func scheduleNotifications(for medication: Medication) {
        // Cancel existing
        cancelNotifications(for: medication)
        
        for (index, time) in medication.schedule.enumerated() {
            let content = UNMutableNotificationContent()
            content.title = "Time for \(medication.name)"
            content.body = "\(medication.dosage)" + (medication.instructions.map { " — \($0)" } ?? "")
            content.sound = .default
            content.categoryIdentifier = "MEDICATION_REMINDER"
            content.userInfo = [
                "medicationId": medication.id.uuidString,
                "medicationName": medication.name
            ]
            
            var dateComponents = DateComponents()
            dateComponents.hour = time.hour
            dateComponents.minute = time.minute
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            let request = UNNotificationRequest(
                identifier: "med-\(medication.id)-\(index)",
                content: content,
                trigger: trigger
            )
            
            notificationCenter.add(request) { error in
                if let error = error {
                    print("[Medication] Notification error: \(error)")
                } else {
                    print("[Medication] Scheduled notification for \(medication.name) at \(time.displayTime)")
                }
            }
        }
    }
    
    func cancelNotifications(for medication: Medication) {
        let identifiers = medication.schedule.indices.map { "med-\(medication.id)-\($0)" }
        notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiers)
    }
    
    // MARK: - Request Permission
    
    func requestNotificationPermission() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
            print("[Medication] Notification permission: \(granted)")
            return granted
        } catch {
            print("[Medication] Permission error: \(error)")
            return false
        }
    }
    
    // MARK: - Today's Schedule
    
    func refreshTodaysSchedule() {
        let calendar = Calendar.current
        let now = Date()
        let today = calendar.component(.weekday, from: now) // 1=Sun, 7=Sat
        
        var schedule: [ScheduledDose] = []
        
        for medication in dataManager.medications where medication.isActive {
            for time in medication.schedule {
                // Check if this dose is for today
                if time.daysOfWeek.isEmpty || time.daysOfWeek.contains(today) {
                    // Create scheduled time for today
                    var components = calendar.dateComponents([.year, .month, .day], from: now)
                    components.hour = time.hour
                    components.minute = time.minute
                    
                    guard let scheduledTime = calendar.date(from: components) else { continue }
                    
                    // Check if already taken
                    let (taken, takenTime) = dataManager.didTakeMedication(medication.id, on: now)
                    
                    let status: ScheduledDose.DoseStatus
                    if taken, let time = takenTime {
                        status = .taken(time)
                    } else if scheduledTime < now.addingTimeInterval(-3600) { // >1 hour past
                        status = .missed
                    } else if scheduledTime < now.addingTimeInterval(1800) { // within 30 min
                        status = .due
                    } else {
                        status = .upcoming
                    }
                    
                    schedule.append(ScheduledDose(
                        medication: medication,
                        scheduledTime: scheduledTime,
                        status: status
                    ))
                }
            }
        }
        
        todaysSchedule = schedule.sorted { $0.scheduledTime < $1.scheduledTime }
    }
    
    // MARK: - Log Dose
    
    func logDoseTaken(medication: Medication, method: MedicationLog.VerificationMethod = .manual) {
        let now = Date()
        let scheduledTime = findNearestScheduledTime(for: medication) ?? now
        
        dataManager.logDose(
            medicationId: medication.id,
            scheduledTime: scheduledTime,
            takenTime: now,
            status: .taken,
            method: method
        )
        
        refreshTodaysSchedule()
    }
    
    func logDoseSkipped(medication: Medication, reason: String? = nil) {
        let now = Date()
        let scheduledTime = findNearestScheduledTime(for: medication) ?? now
        
        dataManager.logDose(
            medicationId: medication.id,
            scheduledTime: scheduledTime,
            takenTime: nil,
            status: .skipped,
            method: .manual,
            notes: reason
        )
        
        refreshTodaysSchedule()
    }
    
    private func findNearestScheduledTime(for medication: Medication) -> Date? {
        let calendar = Calendar.current
        let now = Date()
        
        var nearest: Date?
        var nearestDiff: TimeInterval = .infinity
        
        for time in medication.schedule {
            var components = calendar.dateComponents([.year, .month, .day], from: now)
            components.hour = time.hour
            components.minute = time.minute
            
            if let scheduled = calendar.date(from: components) {
                let diff = abs(scheduled.timeIntervalSince(now))
                if diff < nearestDiff {
                    nearestDiff = diff
                    nearest = scheduled
                }
            }
        }
        
        return nearest
    }
    
    // MARK: - Adherence
    
    func weeklyAdherence() -> Double {
        let activeMeds = dataManager.medications.filter { $0.isActive }
        guard !activeMeds.isEmpty else { return 1.0 }
        
        let rates = activeMeds.map { dataManager.adherenceRate(for: $0.id, days: 7) }
        return rates.reduce(0, +) / Double(rates.count)
    }
    
    func adherenceReport(days: Int) -> [(medication: Medication, rate: Double, missed: Int)] {
        dataManager.medications.filter { $0.isActive }.map { med in
            let rate = dataManager.adherenceRate(for: med.id, days: days)
            let logs = dataManager.medicationLogs.filter { $0.medicationId == med.id }
            let missed = logs.filter { $0.status == .missed }.count
            return (med, rate, missed)
        }
    }
    
    // MARK: - Voice Queries
    
    func handleQuery(_ query: String) -> String {
        let lower = query.lowercased()
        
        // "Did I take my [medication]?"
        if lower.contains("did i take") || lower.contains("have i taken") {
            // Try to extract medication name
            for med in dataManager.medications {
                if lower.contains(med.name.lowercased()) {
                    let (taken, time) = dataManager.didTakeMedication(med.id, on: Date())
                    if taken, let t = time {
                        let formatter = DateFormatter()
                        formatter.timeStyle = .short
                        return "Yes, you took your \(med.name) at \(formatter.string(from: t))."
                    } else {
                        return "I don't have a record of you taking \(med.name) today yet."
                    }
                }
            }
            return "Which medication are you asking about?"
        }
        
        // "What medications do I have today?"
        if lower.contains("medication") && (lower.contains("today") || lower.contains("schedule")) {
            refreshTodaysSchedule()
            if todaysSchedule.isEmpty {
                return "You don't have any medications scheduled for today."
            }
            
            let upcoming = todaysSchedule.filter {
                if case .upcoming = $0.status { return true }
                if case .due = $0.status { return true }
                return false
            }
            
            if upcoming.isEmpty {
                return "You've taken all your medications for today!"
            }
            
            let list = upcoming.map { "\($0.medication.name) at \(formatTime($0.scheduledTime))" }.joined(separator: ", ")
            return "You have: \(list)"
        }
        
        // "How's my adherence?"
        if lower.contains("adherence") || lower.contains("compliance") {
            let rate = weeklyAdherence()
            let percent = Int(rate * 100)
            if percent >= 90 {
                return "Your medication adherence is excellent at \(percent)% this week!"
            } else if percent >= 70 {
                return "Your adherence is \(percent)% this week. Try to keep it above 90%."
            } else {
                return "Your adherence is \(percent)% this week. Missing doses can affect your health."
            }
        }
        
        return "I can help you track medications. Try: 'Did I take my [medication]?' or 'What's my schedule today?'"
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
