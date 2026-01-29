/**
 * HealthDataManager.swift
 *
 * REDI HEALTH DATA PERSISTENCE
 * 
 * Manages storage and retrieval of all health data:
 * - Medications and logs
 * - Meal logs
 * - Symptom entries
 *
 * Uses UserDefaults/JSON for MVP simplicity.
 * Can migrate to CoreData later.
 *
 * Created: Jan 29, 2026
 */

import Foundation

class HealthDataManager {
    static let shared = HealthDataManager()
    
    private let userDefaults = UserDefaults.standard
    
    // Storage keys
    private let medicationsKey = "redi_medications"
    private let medicationLogsKey = "redi_medication_logs"
    private let mealLogsKey = "redi_meal_logs"
    private let symptomEntriesKey = "redi_symptom_entries"
    
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    private init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }
    
    // MARK: - Medications
    
    func getMedications() -> [Medication] {
        guard let data = userDefaults.data(forKey: medicationsKey),
              let medications = try? decoder.decode([Medication].self, from: data) else {
            return []
        }
        return medications
    }
    
    func saveMedication(_ medication: Medication) {
        var medications = getMedications()
        if let index = medications.firstIndex(where: { $0.id == medication.id }) {
            medications[index] = medication
        } else {
            medications.append(medication)
        }
        
        if let data = try? encoder.encode(medications) {
            userDefaults.set(data, forKey: medicationsKey)
        }
    }
    
    func deleteMedication(_ id: String) {
        var medications = getMedications()
        medications.removeAll { $0.id == id }
        
        if let data = try? encoder.encode(medications) {
            userDefaults.set(data, forKey: medicationsKey)
        }
    }
    
    // MARK: - Medication Logs
    
    func getMedicationLogs(from startDate: Date, to endDate: Date) -> [MedicationLog] {
        guard let data = userDefaults.data(forKey: medicationLogsKey),
              let logs = try? decoder.decode([MedicationLog].self, from: data) else {
            return []
        }
        return logs.filter { $0.timestamp >= startDate && $0.timestamp < endDate }
    }
    
    func saveMedicationLog(_ log: MedicationLog) {
        var logs = getAllMedicationLogs()
        logs.append(log)
        
        // Keep only last 90 days
        let cutoff = Calendar.current.date(byAdding: .day, value: -90, to: Date()) ?? Date()
        logs = logs.filter { $0.timestamp >= cutoff }
        
        if let data = try? encoder.encode(logs) {
            userDefaults.set(data, forKey: medicationLogsKey)
        }
    }
    
    private func getAllMedicationLogs() -> [MedicationLog] {
        guard let data = userDefaults.data(forKey: medicationLogsKey),
              let logs = try? decoder.decode([MedicationLog].self, from: data) else {
            return []
        }
        return logs
    }
    
    // MARK: - Meal Logs
    
    func getMealLogs(from startDate: Date, to endDate: Date) -> [MealLog] {
        guard let data = userDefaults.data(forKey: mealLogsKey),
              let logs = try? decoder.decode([MealLog].self, from: data) else {
            return []
        }
        return logs.filter { $0.timestamp >= startDate && $0.timestamp < endDate }
    }
    
    func saveMealLog(_ log: MealLog) {
        var logs = getAllMealLogs()
        logs.append(log)
        
        // Keep only last 90 days
        let cutoff = Calendar.current.date(byAdding: .day, value: -90, to: Date()) ?? Date()
        logs = logs.filter { $0.timestamp >= cutoff }
        
        if let data = try? encoder.encode(logs) {
            userDefaults.set(data, forKey: mealLogsKey)
        }
    }
    
    func deleteMealLog(_ id: String) {
        var logs = getAllMealLogs()
        logs.removeAll { $0.id == id }
        
        if let data = try? encoder.encode(logs) {
            userDefaults.set(data, forKey: mealLogsKey)
        }
    }
    
    private func getAllMealLogs() -> [MealLog] {
        guard let data = userDefaults.data(forKey: mealLogsKey),
              let logs = try? decoder.decode([MealLog].self, from: data) else {
            return []
        }
        return logs
    }
    
    // MARK: - Symptom Entries
    
    func getSymptomEntries(from startDate: Date, to endDate: Date) -> [SymptomEntry] {
        guard let data = userDefaults.data(forKey: symptomEntriesKey),
              let entries = try? decoder.decode([SymptomEntry].self, from: data) else {
            return []
        }
        return entries.filter { $0.timestamp >= startDate && $0.timestamp < endDate }
    }
    
    func saveSymptomEntry(_ entry: SymptomEntry) {
        var entries = getAllSymptomEntries()
        entries.append(entry)
        
        // Keep only last 90 days
        let cutoff = Calendar.current.date(byAdding: .day, value: -90, to: Date()) ?? Date()
        entries = entries.filter { $0.timestamp >= cutoff }
        
        if let data = try? encoder.encode(entries) {
            userDefaults.set(data, forKey: symptomEntriesKey)
        }
    }
    
    func deleteSymptomEntry(_ id: String) {
        var entries = getAllSymptomEntries()
        entries.removeAll { $0.id == id }
        
        if let data = try? encoder.encode(entries) {
            userDefaults.set(data, forKey: symptomEntriesKey)
        }
    }
    
    private func getAllSymptomEntries() -> [SymptomEntry] {
        guard let data = userDefaults.data(forKey: symptomEntriesKey),
              let entries = try? decoder.decode([SymptomEntry].self, from: data) else {
            return []
        }
        return entries
    }
    
    // MARK: - Clear All Data
    
    func clearAllHealthData() {
        userDefaults.removeObject(forKey: medicationsKey)
        userDefaults.removeObject(forKey: medicationLogsKey)
        userDefaults.removeObject(forKey: mealLogsKey)
        userDefaults.removeObject(forKey: symptomEntriesKey)
    }
}

// MARK: - Data Models

struct Medication: Codable, Identifiable {
    let id: String
    var name: String
    var dosage: String
    var instructions: String?
    var schedule: [ScheduleTime]
    var createdAt: Date
    var isActive: Bool
}

struct ScheduleTime: Codable, Identifiable {
    let id: String
    var hour: Int
    var minute: Int
    var enabled: Bool
}

struct MedicationLog: Codable, Identifiable {
    let id: String
    let medicationId: String
    let timestamp: Date
    let taken: Bool
    var notes: String?
}

struct MealLog: Codable, Identifiable {
    let id: String
    let timestamp: Date
    let mealType: MealType
    var foods: [FoodItem]
    var notes: String?
    var imageData: Data?
    
    var totalCalories: Int? {
        foods.compactMap { $0.calories }.reduce(0, +)
    }
    
    var totalProtein: Int? {
        foods.compactMap { $0.protein }.reduce(0, +)
    }
    
    var totalCarbs: Int? {
        foods.compactMap { $0.carbs }.reduce(0, +)
    }
    
    var totalFat: Int? {
        foods.compactMap { $0.fat }.reduce(0, +)
    }
}

struct FoodItem: Codable, Identifiable {
    let id: String
    var name: String
    var calories: Int?
    var protein: Int?
    var carbs: Int?
    var fat: Int?
    var servingSize: String?
}

struct SymptomEntry: Codable, Identifiable {
    let id: String
    let timestamp: Date
    var symptomName: String
    var severity: Int // 1-10
    var location: String?
    var associatedSymptoms: [String]
    var notes: String?
}
