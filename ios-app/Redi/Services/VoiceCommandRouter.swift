/**
 * VoiceCommandRouter.swift
 *
 * REDI VOICE COMMAND ROUTER
 * 
 * Routes voice commands to appropriate health services:
 * - Medication queries
 * - Nutrition queries
 * - Symptom logging
 * - Health reports
 *
 * Created: Jan 29, 2026
 */

import Foundation

class VoiceCommandRouter {
    static let shared = VoiceCommandRouter()
    
    private let medicationService = MedicationService.shared
    private let nutritionService = NutritionService.shared
    private let symptomService = SymptomService.shared
    private let reportService = HealthReportService.shared
    
    private init() {}
    
    // MARK: - Intent Detection
    
    enum Intent {
        case medication
        case nutrition
        case symptom
        case report
        case screenShare
        case general
    }
    
    func detectIntent(from query: String) -> Intent {
        let lowercased = query.lowercased()
        
        // Medication keywords
        let medicationKeywords = ["medication", "medicine", "pill", "dose", "prescription", "drug", "take my", "did i take", "adherence", "compliance"]
        if medicationKeywords.contains(where: { lowercased.contains($0) }) {
            return .medication
        }
        
        // Nutrition keywords
        let nutritionKeywords = ["calorie", "calories", "eat", "ate", "food", "meal", "breakfast", "lunch", "dinner", "snack", "protein", "carb", "fat", "nutrition", "diet"]
        if nutritionKeywords.contains(where: { lowercased.contains($0) }) {
            return .nutrition
        }
        
        // Symptom keywords
        let symptomKeywords = ["symptom", "feeling", "feel", "pain", "ache", "headache", "nausea", "tired", "fatigue", "dizzy", "hurt", "sick", "unwell"]
        if symptomKeywords.contains(where: { lowercased.contains($0) }) {
            return .symptom
        }
        
        // Report keywords
        let reportKeywords = ["report", "summary", "doctor", "appointment", "visit", "health summary", "overview"]
        if reportKeywords.contains(where: { lowercased.contains($0) }) {
            return .report
        }
        
        // Screen share keywords
        let screenShareKeywords = ["screen", "computer", "desktop", "share my screen", "show my screen"]
        if screenShareKeywords.contains(where: { lowercased.contains($0) }) {
            return .screenShare
        }
        
        return .general
    }
    
    // MARK: - Route Query
    
    struct RouteResult {
        let handled: Bool
        let response: String?
        let action: (() -> Void)?
    }
    
    func routeQuery(_ query: String) -> RouteResult {
        let intent = detectIntent(from: query)
        
        switch intent {
        case .medication:
            return routeToMedication(query)
            
        case .nutrition:
            return routeToNutrition(query)
            
        case .symptom:
            return routeToSymptom(query)
            
        case .report:
            return routeToReport(query)
            
        case .screenShare:
            return RouteResult(
                handled: true,
                response: "I'll help you share your computer screen. Opening the screen share setup now.",
                action: { NotificationCenter.default.post(name: .openScreenShare, object: nil) }
            )
            
        case .general:
            return RouteResult(handled: false, response: nil, action: nil)
        }
    }
    
    // MARK: - Medication Routing
    
    private func routeToMedication(_ query: String) -> RouteResult {
        let response = medicationService.handleQuery(query)
        return RouteResult(handled: true, response: response, action: nil)
    }
    
    // MARK: - Nutrition Routing
    
    private func routeToNutrition(_ query: String) -> RouteResult {
        let response = nutritionService.handleQuery(query)
        return RouteResult(handled: true, response: response, action: nil)
    }
    
    // MARK: - Symptom Routing
    
    private func routeToSymptom(_ query: String) -> RouteResult {
        let lowercased = query.lowercased()
        
        // Check if this is starting a symptom logging flow
        let logKeywords = ["log", "track", "record", "add", "i have", "i'm feeling", "i feel"]
        if logKeywords.contains(where: { lowercased.contains($0) }) {
            // Extract symptom if mentioned
            let symptomResult = symptomService.processVoiceInput(query)
            return RouteResult(handled: true, response: symptomResult, action: nil)
        }
        
        // Otherwise, query symptoms
        let response = symptomService.handleQuery(query)
        return RouteResult(handled: true, response: response, action: nil)
    }
    
    // MARK: - Report Routing
    
    private func routeToReport(_ query: String) -> RouteResult {
        let lowercased = query.lowercased()
        
        // Determine report period
        var days = 7
        if lowercased.contains("month") || lowercased.contains("30") {
            days = 30
        } else if lowercased.contains("two week") || lowercased.contains("14") {
            days = 14
        }
        
        // Generate voice summary
        let response = reportService.generateVoiceSummary(days: days)
        return RouteResult(handled: true, response: response, action: nil)
    }
    
    // MARK: - Confirm Actions
    
    func confirmMedicationTaken(_ medicationName: String) -> String {
        // Find medication by name
        let medications = HealthDataManager.shared.getMedications()
        if let med = medications.first(where: { $0.name.lowercased() == medicationName.lowercased() }) {
            medicationService.logDose(medicationId: med.id, taken: true, notes: "Confirmed via voice")
            return "Great, I've logged that you took your \(med.name)."
        }
        return "I couldn't find a medication called \(medicationName). Would you like to add it?"
    }
    
    func logMealViaVoice(description: String) -> String {
        // Quick log meal from voice description
        let mealType = nutritionService.inferMealType()
        nutritionService.logMeal(
            description: description,
            mealType: mealType,
            calories: nil,
            protein: nil,
            carbs: nil,
            fat: nil
        )
        return "I've logged your \(mealType.rawValue): \(description). I'll estimate the nutrition for you."
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let openScreenShare = Notification.Name("openScreenShare")
}
