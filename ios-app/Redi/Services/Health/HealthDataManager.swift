/**
 * HealthDataManager.swift
 *
 * REDI HEALTH DATA PERSISTENCE
 * 
 * Central data store for all health-related data:
 * - Medications and logs
 * - Meal/nutrition logs
 * - Symptom entries
 *
 * Uses UserDefaults/JSON for MVP simplicity.
 * Can migrate to CoreData later for scale.
 *
 * Created: Jan 29, 2026
 */

import Foundation

// MARK: - Data Models

struct Medication: Codable, Identifiable {
    let id: String
    let name: String
    let dosage: String
    let instructions: String?
    let schedule: [ScheduleTime]
    let createdAt: Date
    var isActive: Bool
}

struct ScheduleTime: Codable, Identifiable {
    let id: String
    let hour: Int
    let minute: Int
    var enabled: Bool
    
    var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        let date = Calendar.current.date(from: components) ?? Date()
        return formatter.string(from: date)
    }
}

struct MedicationLog: Codable, Identifiable {
    let id: String
    let medicationId: String
    let timestamp: Date
    let taken: Bool
    let notes: String?
}

enum MealType: String, Codable, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"
}

struct FoodItem: Codable, Identifiable {
    let id: String
    let name: String
    let calories: Int?
    let protein: Double?
    let carbs: Double?
    let fat: Double?
    let servingSize: String?
}

struct MealLog: Codable, Identifiable {
    let id: String
    let timestamp: Date
    let mealType: MealType
    let foods: [FoodItem]
    let totalCalories: Int?
    let notes: String?
    let imageData: Data?
}

struct SymptomEntry: Codable, Identifiable {
    let id: String
    let timestamp: Date
    let symptom: String
    let severity: Int // 1-10
    let notes: String?
    let associatedSymptoms: [String]?
}

// MARK: - Health Data Manager

class HealthDataManager {
    static let shared = HealthDataManager()
    
    private let defaults = UserDefaults.standard
    
    // Storage keys
    private let medicationsKey = "redi_medications"
    private let medicationLogsKey = "redi_medication_logs"
    private let mealLogsKey = "redi_meal_logs"
    private let symptomsKey = "redi_symptoms"
    
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    private init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }
    
    // MARK: - Medications
    
    func getMedications() -> [Medication] {
        guard let data = defaults.data(forKey: medicationsKey),
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
        saveAllMedications(medications)
    }
    
    func deleteMedication(_ id: String) {
        var medications = getMedications()
        medications.removeAll { $0.id == id }
        saveAllMedications(medications)
    }
    
    private func saveAllMedications(_ medications: [Medication]) {
        if let data = try? encoder.encode(medications) {
            defaults.set(data, forKey: medicationsKey)
        }
    }
    
    // MARK: - Medication Logs
    
    func getMedicationLogs(from startDate: Date, to endDate: Date) -> [MedicationLog] {
        guard let data = defaults.data(forKey: medicationLogsKey),
              let logs = try? decoder.decode([MedicationLog].self, from: data) else {
            return []
        }
        return logs.filter { $0.timestamp >= startDate && $0.timestamp < endDate }
    }
    
    func saveMedicationLog(_ log: MedicationLog) {
        var logs = getAllMedicationLogs()
        logs.append(log)
        
        // Keep only last 90 days
        let cutoff = Calendar.current.date(byAdding: .day, value: -90, to: Date())!
        logs = logs.filter { $0.timestamp >= cutoff }
        
        if let data = try? encoder.encode(logs) {
            defaults.set(data, forKey: medicationLogsKey)
        }
    }
    
    private func getAllMedicationLogs() -> [MedicationLog] {
        guard let data = defaults.data(forKey: medicationLogsKey),
              let logs = try? decoder.decode([MedicationLog].self, from: data) else {
            return []
        }
        return logs
    }
    
    // MARK: - Meal Logs
    
    func getMealLogs(from startDate: Date, to endDate: Date) -> [MealLog] {
        guard let data = defaults.data(forKey: mealLogsKey),
              let logs = try? decoder.decode([MealLog].self, from: data) else {
            return []
        }
        return logs.filter { $0.timestamp >= startDate && $0.timestamp < endDate }
    }
    
    func saveMealLog(_ log: MealLog) {
        var logs = getAllMealLogs()
        logs.append(log)
        
        // Keep only last 90 days
        let cutoff = Calendar.current.date(byAdding: .day, value: -90, to: Date())!
        logs = logs.filter { $0.timestamp >= cutoff }
        
        if let data = try? encoder.encode(logs) {
            defaults.set(data, forKey: mealLogsKey)
        }
    }
    
    private func getAllMealLogs() -> [MealLog] {
        guard let data = defaults.data(forKey: mealLogsKey),
              let logs = try? decoder.decode([MealLog].self, from: data) else {
            return []
        }
        return logs
    }
    
    // MARK: - Symptoms
    
    func getSymptoms(from startDate: Date, to endDate: Date) -> [SymptomEntry] {
        guard let data = defaults.data(forKey: symptomsKey),
              let symptoms = try? decoder.decode([SymptomEntry].self, from: data) else {
            return []
        }
        return symptoms.filter { $0.timestamp >= startDate && $0.timestamp < endDate }
    }
    
    func saveSymptom(_ symptom: SymptomEntry) {
        var symptoms = getAllSymptoms()
        symptoms.append(symptom)
        
        // Keep only last 90 days
        let cutoff = Calendar.current.date(byAdding: .day, value: -90, to: Date())!
        symptoms = symptoms.filter { $0.timestamp >= cutoff }
        
        if let data = try? encoder.encode(symptoms) {
            defaults.set(data, forKey: symptomsKey)
        }
    }
    
    private func getAllSymptoms() -> [SymptomEntry] {
        guard let data = defaults.data(forKey: symptomsKey),
              let symptoms = try? decoder.decode([SymptomEntry].self, from: data) else {
            return []
        }
        return symptoms
    }
    
    // MARK: - Data Export
    
    func exportAllData() -> Data? {
        struct ExportData: Codable {
            let exportDate: Date
            let medications: [Medication]
            let medicationLogs: [MedicationLog]
            let mealLogs: [MealLog]
            let symptoms: [SymptomEntry]
        }
        
        let export = ExportData(
            exportDate: Date(),
            medications: getMedications(),
            medicationLogs: getAllMedicationLogs(),
            mealLogs: getAllMealLogs(),
            symptoms: getAllSymptoms()
        )
        
        return try? encoder.encode(export)
    }
    
    // MARK: - Clear Data
    
    func clearAllData() {
        defaults.removeObject(forKey: medicationsKey)
        defaults.removeObject(forKey: medicationLogsKey)
        defaults.removeObject(forKey: mealLogsKey)
        defaults.removeObject(forKey: symptomsKey)
    }
}
