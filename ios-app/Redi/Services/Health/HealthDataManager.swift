/**
 * HealthDataManager.swift
 *
 * REDI HEALTH - Shared CoreData Infrastructure
 * 
 * Central persistence layer for all health features:
 * - Medications & dosing logs
 * - Meal/nutrition tracking
 * - Symptom logging
 * 
 * Uses UserDefaults-backed JSON storage (simpler than CoreData for MVP)
 * Can migrate to CoreData later if needed.
 *
 * Created: Jan 26, 2026
 */

import Foundation
import Combine

// MARK: - Data Models

struct Medication: Codable, Identifiable {
    var id: UUID
    var name: String              // "Metformin"
    var dosage: String            // "500mg"
    var schedule: [ScheduleTime]  // When to take
    var instructions: String?     // "Take with food"
    var createdAt: Date
    var isActive: Bool
    
    init(name: String, dosage: String, schedule: [ScheduleTime], instructions: String? = nil) {
        self.id = UUID()
        self.name = name
        self.dosage = dosage
        self.schedule = schedule
        self.instructions = instructions
        self.createdAt = Date()
        self.isActive = true
    }
}

struct ScheduleTime: Codable, Hashable {
    var hour: Int           // 0-23
    var minute: Int         // 0-59
    var daysOfWeek: [Int]   // 1=Sun, 2=Mon, ... 7=Sat (empty = every day)
    
    var displayTime: String {
        let h = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour)
        let ampm = hour >= 12 ? "PM" : "AM"
        return String(format: "%d:%02d %@", h, minute, ampm)
    }
}

struct MedicationLog: Codable, Identifiable {
    var id: UUID
    var medicationId: UUID
    var scheduledTime: Date
    var takenTime: Date?
    var status: DoseStatus
    var verificationMethod: VerificationMethod
    var notes: String?
    
    enum DoseStatus: String, Codable {
        case taken, missed, skipped, pending
    }
    
    enum VerificationMethod: String, Codable {
        case visual, verbal, manual
    }
}

struct MealLog: Codable, Identifiable {
    var id: UUID
    var timestamp: Date
    var mealType: MealType
    var items: [FoodItem]
    var totals: NutritionTotals
    var imageData: Data?
    var notes: String?
    
    enum MealType: String, Codable, CaseIterable {
        case breakfast, lunch, dinner, snack
        
        var displayName: String {
            rawValue.capitalized
        }
    }
}

struct FoodItem: Codable, Identifiable {
    var id: UUID
    var name: String         // "grilled chicken breast"
    var portion: String      // "6 oz"
    var calories: Int
    var protein: Double?
    var carbs: Double?
    var fat: Double?
    
    init(name: String, portion: String, calories: Int, protein: Double? = nil, carbs: Double? = nil, fat: Double? = nil) {
        self.id = UUID()
        self.name = name
        self.portion = portion
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
    }
}

struct NutritionTotals: Codable {
    var calories: Int
    var protein: Double
    var carbs: Double
    var fat: Double
    var fiber: Double
    
    static var zero: NutritionTotals {
        NutritionTotals(calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0)
    }
    
    static func + (lhs: NutritionTotals, rhs: NutritionTotals) -> NutritionTotals {
        NutritionTotals(
            calories: lhs.calories + rhs.calories,
            protein: lhs.protein + rhs.protein,
            carbs: lhs.carbs + rhs.carbs,
            fat: lhs.fat + rhs.fat,
            fiber: lhs.fiber + rhs.fiber
        )
    }
}

struct SymptomEntry: Codable, Identifiable {
    var id: UUID
    var symptom: String           // "dizziness"
    var severity: Int             // 1-10
    var timestamp: Date
    var associatedSymptoms: [String]
    var possibleTriggers: [String]
    var notes: String?
    
    init(symptom: String, severity: Int, associated: [String] = [], triggers: [String] = [], notes: String? = nil) {
        self.id = UUID()
        self.symptom = symptom
        self.severity = max(1, min(10, severity))
        self.timestamp = Date()
        self.associatedSymptoms = associated
        self.possibleTriggers = triggers
        self.notes = notes
    }
}

// MARK: - Health Data Manager

class HealthDataManager: ObservableObject {
    static let shared = HealthDataManager()
    
    // MARK: - Published Data
    
    @Published var medications: [Medication] = []
    @Published var medicationLogs: [MedicationLog] = []
    @Published var mealLogs: [MealLog] = []
    @Published var symptomEntries: [SymptomEntry] = []
    
    // MARK: - Storage Keys
    
    private let medicationsKey = "redi.health.medications"
    private let medicationLogsKey = "redi.health.medicationLogs"
    private let mealLogsKey = "redi.health.mealLogs"
    private let symptomEntriesKey = "redi.health.symptomEntries"
    
    private let defaults = UserDefaults.standard
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    // MARK: - Init
    
    private init() {
        loadAll()
    }
    
    // MARK: - Load/Save
    
    private func loadAll() {
        medications = load(key: medicationsKey) ?? []
        medicationLogs = load(key: medicationLogsKey) ?? []
        mealLogs = load(key: mealLogsKey) ?? []
        symptomEntries = load(key: symptomEntriesKey) ?? []
        
        print("[HealthData] Loaded: \(medications.count) meds, \(medicationLogs.count) dose logs, \(mealLogs.count) meals, \(symptomEntries.count) symptoms")
    }
    
    private func load<T: Codable>(key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? decoder.decode(T.self, from: data)
    }
    
    private func save<T: Codable>(_ value: T, key: String) {
        if let data = try? encoder.encode(value) {
            defaults.set(data, forKey: key)
        }
    }
    
    // MARK: - Medications CRUD
    
    func addMedication(_ medication: Medication) {
        medications.append(medication)
        save(medications, key: medicationsKey)
        print("[HealthData] Added medication: \(medication.name)")
    }
    
    func updateMedication(_ medication: Medication) {
        if let index = medications.firstIndex(where: { $0.id == medication.id }) {
            medications[index] = medication
            save(medications, key: medicationsKey)
        }
    }
    
    func deleteMedication(_ id: UUID) {
        medications.removeAll { $0.id == id }
        save(medications, key: medicationsKey)
    }
    
    func getMedication(byName name: String) -> Medication? {
        medications.first { $0.name.lowercased() == name.lowercased() }
    }
    
    // MARK: - Medication Logs
    
    func logDose(medicationId: UUID, scheduledTime: Date, takenTime: Date?, status: MedicationLog.DoseStatus, method: MedicationLog.VerificationMethod, notes: String? = nil) {
        let log = MedicationLog(
            id: UUID(),
            medicationId: medicationId,
            scheduledTime: scheduledTime,
            takenTime: takenTime,
            status: status,
            verificationMethod: method,
            notes: notes
        )
        medicationLogs.append(log)
        save(medicationLogs, key: medicationLogsKey)
        print("[HealthData] Logged dose: \(status.rawValue)")
    }
    
    func getDoseLogs(for medicationId: UUID, on date: Date) -> [MedicationLog] {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        return medicationLogs.filter {
            $0.medicationId == medicationId &&
            $0.scheduledTime >= startOfDay &&
            $0.scheduledTime < endOfDay
        }
    }
    
    func didTakeMedication(_ medicationId: UUID, on date: Date) -> (taken: Bool, time: Date?) {
        let logs = getDoseLogs(for: medicationId, on: date)
        if let takenLog = logs.first(where: { $0.status == .taken }) {
            return (true, takenLog.takenTime)
        }
        return (false, nil)
    }
    
    func adherenceRate(for medicationId: UUID, days: Int) -> Double {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -days, to: Date())!
        
        let logs = medicationLogs.filter {
            $0.medicationId == medicationId && $0.scheduledTime >= startDate
        }
        
        let taken = logs.filter { $0.status == .taken }.count
        let total = logs.count
        
        return total > 0 ? Double(taken) / Double(total) : 1.0
    }
    
    // MARK: - Meal Logs
    
    func logMeal(_ meal: MealLog) {
        mealLogs.append(meal)
        save(mealLogs, key: mealLogsKey)
        print("[HealthData] Logged meal: \(meal.mealType.rawValue) - \(meal.totals.calories) cal")
    }
    
    func getMeals(on date: Date) -> [MealLog] {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        return mealLogs.filter {
            $0.timestamp >= startOfDay && $0.timestamp < endOfDay
        }.sorted { $0.timestamp < $1.timestamp }
    }
    
    func dailyNutrition(on date: Date) -> NutritionTotals {
        getMeals(on: date).reduce(.zero) { $0 + $1.totals }
    }
    
    // MARK: - Symptom Entries
    
    func logSymptom(_ entry: SymptomEntry) {
        symptomEntries.append(entry)
        save(symptomEntries, key: symptomEntriesKey)
        print("[HealthData] Logged symptom: \(entry.symptom) (\(entry.severity)/10)")
    }
    
    func getSymptoms(on date: Date) -> [SymptomEntry] {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        return symptomEntries.filter {
            $0.timestamp >= startOfDay && $0.timestamp < endOfDay
        }
    }
    
    func getSymptoms(last days: Int) -> [SymptomEntry] {
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
        return symptomEntries.filter { $0.timestamp >= startDate }
    }
    
    func symptomFrequency(last days: Int) -> [(symptom: String, count: Int, avgSeverity: Double)] {
        let recent = getSymptoms(last: days)
        var grouped: [String: [SymptomEntry]] = [:]
        
        for entry in recent {
            grouped[entry.symptom.lowercased(), default: []].append(entry)
        }
        
        return grouped.map { (symptom, entries) in
            let avg = Double(entries.map { $0.severity }.reduce(0, +)) / Double(entries.count)
            return (symptom, entries.count, avg)
        }.sorted { $0.count > $1.count }
    }
    
    // MARK: - Clear Data (for testing)
    
    func clearAllData() {
        medications = []
        medicationLogs = []
        mealLogs = []
        symptomEntries = []
        
        defaults.removeObject(forKey: medicationsKey)
        defaults.removeObject(forKey: medicationLogsKey)
        defaults.removeObject(forKey: mealLogsKey)
        defaults.removeObject(forKey: symptomEntriesKey)
        
        print("[HealthData] All data cleared")
    }
}
