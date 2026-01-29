/**
 * HealthReportService.swift
 *
 * REDI HEALTH REPORT SERVICE
 * 
 * Generates comprehensive reports for doctor visits:
 * - Medication adherence summary
 * - Symptom patterns and trends
 * - Nutrition overview
 * - Exportable text format
 *
 * Created: Jan 29, 2026
 */

import Foundation

class HealthReportService: ObservableObject {
    static let shared = HealthReportService()
    
    private let dataManager = HealthDataManager.shared
    private let medicationService = MedicationService.shared
    private let symptomService = SymptomService.shared
    private let nutritionService = NutritionService.shared
    
    private init() {}
    
    // MARK: - Report Generation
    
    struct HealthReport {
        let generatedAt: Date
        let periodStart: Date
        let periodEnd: Date
        let medications: MedicationSummary
        let symptoms: SymptomSummary
        let nutrition: NutritionSummary
        let insights: [String]
    }
    
    struct MedicationSummary {
        let medications: [MedicationInfo]
        let overallAdherence: Double
        let missedDoses: Int
    }
    
    struct MedicationInfo {
        let name: String
        let dosage: String
        let adherenceRate: Double
    }
    
    struct SymptomSummary {
        let totalEntries: Int
        let uniqueSymptoms: [String]
        let patterns: [SymptomPattern]
        let mostFrequent: String?
        let mostSevere: String?
    }
    
    struct NutritionSummary {
        let avgDailyCalories: Int
        let avgProtein: Double
        let avgCarbs: Double
        let avgFat: Double
        let mealsLogged: Int
    }
    
    func generateReport(days: Int = 30) -> HealthReport {
        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -days, to: endDate)!
        
        // Medication summary
        let medications = generateMedicationSummary(from: startDate, to: endDate, days: days)
        
        // Symptom summary
        let symptoms = generateSymptomSummary(from: startDate, to: endDate)
        
        // Nutrition summary
        let nutrition = generateNutritionSummary(from: startDate, to: endDate, days: days)
        
        // Generate insights
        let insights = generateInsights(medications: medications, symptoms: symptoms, nutrition: nutrition)
        
        return HealthReport(
            generatedAt: Date(),
            periodStart: startDate,
            periodEnd: endDate,
            medications: medications,
            symptoms: symptoms,
            nutrition: nutrition,
            insights: insights
        )
    }
    
    private func generateMedicationSummary(from startDate: Date, to endDate: Date, days: Int) -> MedicationSummary {
        let medications = dataManager.getMedications()
        let logs = dataManager.getMedicationLogs(from: startDate, to: endDate)
        
        var medicationInfos: [MedicationInfo] = []
        var totalExpected = 0
        var totalTaken = 0
        
        for med in medications where med.isActive {
            let dosesPerDay = med.schedule.filter { $0.enabled }.count
            let expected = dosesPerDay * days
            let taken = logs.filter { $0.medicationId == med.id && $0.taken }.count
            let adherence = expected > 0 ? Double(taken) / Double(expected) : 1.0
            
            medicationInfos.append(MedicationInfo(
                name: med.name,
                dosage: med.dosage,
                adherenceRate: adherence
            ))
            
            totalExpected += expected
            totalTaken += taken
        }
        
        let overallAdherence = totalExpected > 0 ? Double(totalTaken) / Double(totalExpected) : 1.0
        
        return MedicationSummary(
            medications: medicationInfos,
            overallAdherence: overallAdherence,
            missedDoses: totalExpected - totalTaken
        )
    }
    
    private func generateSymptomSummary(from startDate: Date, to endDate: Date) -> SymptomSummary {
        let symptoms = dataManager.getSymptoms(from: startDate, to: endDate)
        let patterns = symptomService.detectPatterns(days: Int(endDate.timeIntervalSince(startDate) / 86400))
        
        let uniqueSymptoms = Array(Set(symptoms.map { $0.symptom }))
        
        // Find most frequent
        var frequency: [String: Int] = [:]
        var severity: [String: [Int]] = [:]
        
        for entry in symptoms {
            frequency[entry.symptom, default: 0] += 1
            severity[entry.symptom, default: []].append(entry.severity)
        }
        
        let mostFrequent = frequency.max(by: { $0.value < $1.value })?.key
        
        // Find most severe (average severity > 7)
        var mostSevere: String? = nil
        var highestAvg: Double = 0
        for (symptom, severities) in severity {
            let avg = Double(severities.reduce(0, +)) / Double(severities.count)
            if avg > highestAvg && avg >= 7 {
                highestAvg = avg
                mostSevere = symptom
            }
        }
        
        return SymptomSummary(
            totalEntries: symptoms.count,
            uniqueSymptoms: uniqueSymptoms,
            patterns: patterns,
            mostFrequent: mostFrequent,
            mostSevere: mostSevere
        )
    }
    
    private func generateNutritionSummary(from startDate: Date, to endDate: Date, days: Int) -> NutritionSummary {
        let meals = dataManager.getMealLogs(from: startDate, to: endDate)
        
        var totalCalories = 0
        var totalProtein: Double = 0
        var totalCarbs: Double = 0
        var totalFat: Double = 0
        
        for meal in meals {
            if let cal = meal.totalCalories { totalCalories += cal }
            for food in meal.foods {
                if let p = food.protein { totalProtein += p }
                if let c = food.carbs { totalCarbs += c }
                if let f = food.fat { totalFat += f }
            }
        }
        
        return NutritionSummary(
            avgDailyCalories: days > 0 ? totalCalories / days : 0,
            avgProtein: days > 0 ? totalProtein / Double(days) : 0,
            avgCarbs: days > 0 ? totalCarbs / Double(days) : 0,
            avgFat: days > 0 ? totalFat / Double(days) : 0,
            mealsLogged: meals.count
        )
    }
    
    private func generateInsights(medications: MedicationSummary, symptoms: SymptomSummary, nutrition: NutritionSummary) -> [String] {
        var insights: [String] = []
        
        // Medication insights
        if medications.overallAdherence < 0.8 {
            insights.append("Medication adherence is below 80%. Discuss strategies to improve compliance with your doctor.")
        } else if medications.overallAdherence >= 0.95 {
            insights.append("Excellent medication adherence at \(Int(medications.overallAdherence * 100))%.")
        }
        
        // Symptom insights
        if let mostFrequent = symptoms.mostFrequent {
            insights.append("\(mostFrequent) was your most frequently reported symptom.")
        }
        
        if let mostSevere = symptoms.mostSevere {
            insights.append("\(mostSevere) had consistently high severity ratings - consider discussing this with your doctor.")
        }
        
        for pattern in symptoms.patterns.prefix(2) {
            if pattern.trend == .worsening {
                insights.append("\(pattern.symptomName) appears to be getting worse over time.")
            }
        }
        
        // Nutrition insights
        if nutrition.avgDailyCalories < 1500 {
            insights.append("Average calorie intake is low at \(nutrition.avgDailyCalories) calories/day.")
        }
        
        if nutrition.avgProtein < 40 {
            insights.append("Protein intake may be insufficient at \(Int(nutrition.avgProtein))g/day average.")
        }
        
        return insights
    }
    
    // MARK: - Export Formats
    
    func generateTextReport(days: Int = 30) -> String {
        let report = generateReport(days: days)
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        
        var text = """
        HEALTH REPORT
        Generated: \(dateFormatter.string(from: report.generatedAt))
        Period: \(dateFormatter.string(from: report.periodStart)) to \(dateFormatter.string(from: report.periodEnd))
        
        ═══════════════════════════════════════
        MEDICATIONS
        ═══════════════════════════════════════
        Overall Adherence: \(Int(report.medications.overallAdherence * 100))%
        Missed Doses: \(report.medications.missedDoses)
        
        """
        
        for med in report.medications.medications {
            text += "• \(med.name) (\(med.dosage)): \(Int(med.adherenceRate * 100))% adherence\n"
        }
        
        text += """
        
        ═══════════════════════════════════════
        SYMPTOMS
        ═══════════════════════════════════════
        Total Entries: \(report.symptoms.totalEntries)
        Unique Symptoms: \(report.symptoms.uniqueSymptoms.joined(separator: ", "))
        
        """
        
        if let mostFrequent = report.symptoms.mostFrequent {
            text += "Most Frequent: \(mostFrequent)\n"
        }
        
        if let mostSevere = report.symptoms.mostSevere {
            text += "Highest Severity: \(mostSevere)\n"
        }
        
        text += """
        
        ═══════════════════════════════════════
        NUTRITION (Daily Averages)
        ═══════════════════════════════════════
        Calories: \(report.nutrition.avgDailyCalories)
        Protein: \(Int(report.nutrition.avgProtein))g
        Carbs: \(Int(report.nutrition.avgCarbs))g
        Fat: \(Int(report.nutrition.avgFat))g
        Meals Logged: \(report.nutrition.mealsLogged)
        
        ═══════════════════════════════════════
        INSIGHTS
        ═══════════════════════════════════════
        """
        
        for insight in report.insights {
            text += "• \(insight)\n"
        }
        
        return text
    }
    
    // MARK: - Voice Summary
    
    func generateVoiceSummary(days: Int = 7) -> String {
        let report = generateReport(days: days)
        
        var parts: [String] = []
        
        // Medication summary
        let adherencePercent = Int(report.medications.overallAdherence * 100)
        if report.medications.medications.isEmpty {
            parts.append("No medications are being tracked.")
        } else if adherencePercent >= 90 {
            parts.append("Great job with your medications! You've maintained \(adherencePercent)% adherence.")
        } else {
            parts.append("Your medication adherence is at \(adherencePercent)% with \(report.medications.missedDoses) missed doses.")
        }
        
        // Symptom summary
        if report.symptoms.totalEntries == 0 {
            parts.append("No symptoms were logged this period.")
        } else {
            parts.append("You logged \(report.symptoms.totalEntries) symptom entries.")
            if let frequent = report.symptoms.mostFrequent {
                parts.append("\(frequent) was most common.")
            }
        }
        
        // Key insight
        if let firstInsight = report.insights.first {
            parts.append(firstInsight)
        }
        
        return parts.joined(separator: " ")
    }
}
