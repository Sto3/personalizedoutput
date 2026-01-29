/**
 * MedicationService.swift
 *
 * REDI MEDICATION COMPLIANCE SERVICE
 * 
 * Manages:
 * - Medication schedules
 * - Push notification reminders
 * - Dose logging and tracking
 * - Adherence calculations
 * - Voice query handling
 *
 * Created: Jan 29, 2026
 */

import Foundation
import UserNotifications
import UIKit

class MedicationService: ObservableObject {
    static let shared = MedicationService()
    
    @Published var medications: [Medication] = []
    @Published var todaysDoses: [MedicationLog] = []
    
    private let dataManager = HealthDataManager.shared
    
    private init() {
        loadMedications()
        loadTodaysDoses()
    }
    
    // MARK: - Data Loading
    
    func loadMedications() {
        medications = dataManager.getMedications()
    }
    
    func loadTodaysDoses() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        
        todaysDoses = dataManager.getMedicationLogs(from: today, to: tomorrow)
    }
    
    // MARK: - Medication Management
    
    func addMedication(name: String, dosage: String, instructions: String?, scheduleTimes: [Date]) {
        let schedules = scheduleTimes.map { time -> ScheduleTime in
            let components = Calendar.current.dateComponents([.hour, .minute], from: time)
            return ScheduleTime(
                id: UUID().uuidString,
                hour: components.hour ?? 8,
                minute: components.minute ?? 0,
                enabled: true
            )
        }
        
        let medication = Medication(
            id: UUID().uuidString,
            name: name,
            dosage: dosage,
            instructions: instructions,
            schedule: schedules,
            createdAt: Date(),
            isActive: true
        )
        
        dataManager.saveMedication(medication)
        loadMedications()
        
        // Schedule notifications
        scheduleNotifications(for: medication)
    }
    
    func updateMedication(_ medication: Medication) {
        dataManager.saveMedication(medication)
        loadMedications()
        
        // Reschedule notifications
        cancelNotifications(for: medication)
        if medication.isActive {
            scheduleNotifications(for: medication)
        }
    }
    
    func deleteMedication(_ medication: Medication) {
        dataManager.deleteMedication(medication.id)
        cancelNotifications(for: medication)
        loadMedications()
    }
    
    // MARK: - Dose Logging
    
    func logDose(medicationId: String, taken: Bool, notes: String? = nil) {
        let log = MedicationLog(
            id: UUID().uuidString,
            medicationId: medicationId,
            timestamp: Date(),
            taken: taken,
            notes: notes
        )
        
        dataManager.saveMedicationLog(log)
        loadTodaysDoses()
    }
    
    func isDoseTakenToday(medicationId: String, scheduleTime: ScheduleTime) -> Bool {
        let calendar = Calendar.current
        let now = Date()
        
        // Check if there's a log for this medication today at approximately this time
        return todaysDoses.contains { log in
            guard log.medicationId == medicationId && log.taken else { return false }
            
            let logHour = calendar.component(.hour, from: log.timestamp)
            let logMinute = calendar.component(.minute, from: log.timestamp)
            
            // Within 2 hours of scheduled time
            let scheduledMinutes = scheduleTime.hour * 60 + scheduleTime.minute
            let logMinutes = logHour * 60 + logMinute
            
            return abs(scheduledMinutes - logMinutes) < 120
        }
    }
    
    // MARK: - Notifications
    
    private func scheduleNotifications(for medication: Medication) {
        let center = UNUserNotificationCenter.current()
        
        for schedule in medication.schedule where schedule.enabled {
            let content = UNMutableNotificationContent()
            content.title = "Time for \(medication.name)"
            content.body = medication.dosage
            if let instructions = medication.instructions {
                content.body += " - \(instructions)"
            }
            content.sound = .default
            content.categoryIdentifier = "MEDICATION_REMINDER"
            content.userInfo = [
                "medicationId": medication.id,
                "scheduleTimeId": schedule.id
            ]
            
            // Create daily repeating trigger
            var dateComponents = DateComponents()
            dateComponents.hour = schedule.hour
            dateComponents.minute = schedule.minute
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            
            let identifier = "medication-\(medication.id)-\(schedule.id)"
            let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
            
            center.add(request) { error in
                if let error = error {
                    print("[MedicationService] Failed to schedule notification: \(error)")
                } else {
                    print("[MedicationService] Scheduled notification for \(medication.name) at \(schedule.hour):\(schedule.minute)")
                }
            }
        }
    }
    
    private func cancelNotifications(for medication: Medication) {
        let center = UNUserNotificationCenter.current()
        let identifiers = medication.schedule.map { "medication-\(medication.id)-\($0.id)" }
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
    }
    
    // MARK: - Adherence Tracking
    
    func calculateAdherence(days: Int = 7) -> Double {
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            return 0.0
        }
        
        let logs = dataManager.getMedicationLogs(from: startDate, to: endDate)
        
        // Calculate expected doses
        var expectedDoses = 0
        var takenDoses = 0
        
        for medication in medications where medication.isActive {
            // Each schedule time = 1 dose per day
            let dosesPerDay = medication.schedule.filter { $0.enabled }.count
            expectedDoses += dosesPerDay * days
            
            // Count taken doses for this medication
            takenDoses += logs.filter { $0.medicationId == medication.id && $0.taken }.count
        }
        
        guard expectedDoses > 0 else { return 1.0 }
        return Double(takenDoses) / Double(expectedDoses)
    }
    
    func getMissedDoses(days: Int = 7) -> Int {
        let adherence = calculateAdherence(days: days)
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            return 0
        }
        
        var expectedDoses = 0
        for medication in medications where medication.isActive {
            let dosesPerDay = medication.schedule.filter { $0.enabled }.count
            expectedDoses += dosesPerDay * days
        }
        
        let takenDoses = Int(adherence * Double(expectedDoses))
        return expectedDoses - takenDoses
    }
    
    // MARK: - Voice Query Handling
    
    func handleQuery(_ query: String) -> String {
        let lowercased = query.lowercased()
        
        // "Did I take my medication?"
        if lowercased.contains("did i take") || lowercased.contains("have i taken") {
            return checkTodaysMedications()
        }
        
        // "What's my medication schedule?"
        if lowercased.contains("schedule") || lowercased.contains("when") {
            return describeMedicationSchedule()
        }
        
        // "How's my adherence?"
        if lowercased.contains("adherence") || lowercased.contains("compliance") || lowercased.contains("how am i doing") {
            return describeAdherence()
        }
        
        // "What medications am I taking?"
        if lowercased.contains("what medication") || lowercased.contains("list") {
            return listMedications()
        }
        
        // Default
        return "I can help you track your medications. You can ask me if you've taken your medication, what your schedule is, or how your adherence is doing."
    }
    
    private func checkTodaysMedications() -> String {
        loadTodaysDoses()
        
        if medications.isEmpty {
            return "You don't have any medications set up yet. Would you like to add one?"
        }
        
        var takenMeds: [String] = []
        var pendingMeds: [String] = []
        
        for medication in medications where medication.isActive {
            let takenToday = todaysDoses.contains { $0.medicationId == medication.id && $0.taken }
            if takenToday {
                takenMeds.append(medication.name)
            } else {
                pendingMeds.append(medication.name)
            }
        }
        
        if pendingMeds.isEmpty && !takenMeds.isEmpty {
            return "Great job! You've taken all your medications today: \(takenMeds.joined(separator: ", "))."
        } else if !pendingMeds.isEmpty {
            var response = "You still need to take: \(pendingMeds.joined(separator: ", "))."
            if !takenMeds.isEmpty {
                response += " You've already taken: \(takenMeds.joined(separator: ", "))."
            }
            return response
        }
        
        return "You don't have any medications scheduled for today."
    }
    
    private func describeMedicationSchedule() -> String {
        if medications.isEmpty {
            return "You don't have any medications set up. Would you like to add one?"
        }
        
        var schedule: [String] = []
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        
        for medication in medications where medication.isActive {
            for time in medication.schedule where time.enabled {
                var components = DateComponents()
                components.hour = time.hour
                components.minute = time.minute
                let date = Calendar.current.date(from: components) ?? Date()
                schedule.append("\(medication.name) at \(formatter.string(from: date))")
            }
        }
        
        if schedule.isEmpty {
            return "You don't have any medication reminders scheduled."
        }
        
        return "Your medication schedule is: \(schedule.joined(separator: ", "))."
    }
    
    private func describeAdherence() -> String {
        let weeklyAdherence = calculateAdherence(days: 7)
        let missedDoses = getMissedDoses(days: 7)
        
        let percentage = Int(weeklyAdherence * 100)
        
        var response = "Your medication adherence this week is \(percentage)%."
        
        if missedDoses > 0 {
            response += " You've missed \(missedDoses) dose\(missedDoses == 1 ? "" : "s")."
        }
        
        if percentage >= 90 {
            response += " Excellent work keeping up with your medications!"
        } else if percentage >= 70 {
            response += " You're doing well, but there's room for improvement."
        } else {
            response += " Let's work on improving this together. Would you like me to remind you more frequently?"
        }
        
        return response
    }
    
    private func listMedications() -> String {
        if medications.isEmpty {
            return "You don't have any medications set up yet."
        }
        
        let activeMeds = medications.filter { $0.isActive }
        if activeMeds.isEmpty {
            return "You don't have any active medications."
        }
        
        let names = activeMeds.map { "\($0.name) \($0.dosage)" }
        return "You're currently taking: \(names.joined(separator: ", "))."
    }
}
