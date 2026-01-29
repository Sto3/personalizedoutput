/**
 * HealthReportService.swift
 *
 * REDI HEALTH - Doctor Visit Reports
 * 
 * Generates comprehensive health summaries combining:
 * - Medication adherence
 * - Symptom patterns
 * - Nutrition data
 *
 * Created: Jan 26, 2026
 */

import Foundation
import UIKit

class HealthReportService {
    static let shared = HealthReportService()
    
    private let dataManager = HealthDataManager.shared
    private let medicationService = MedicationService.shared
    private let nutritionService = NutritionService.shared
    private let symptomService = SymptomService.shared
    
    private init() {}
    
    // MARK: - Generate Report
    
    func generateReport(days: Int = 30) -> HealthReport {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate)!
        
        return HealthReport(
            startDate: startDate,
            endDate: endDate,
            medications: generateMedicationReport(days: days),
            symptoms: generateSymptomReport(days: days),
            nutrition: generateNutritionReport(days: days),
            insights: generateInsights(days: days)
        )
    }
    
    // MARK: - Medication Report
    
    private func generateMedicationReport(days: Int) -> [MedicationReportItem] {
        dataManager.medications.filter { $0.isActive }.map { med in
            let rate = dataManager.adherenceRate(for: med.id, days: days)
            let logs = dataManager.medicationLogs.filter { $0.medicationId == med.id }
            let missedLogs = logs.filter { $0.status == .missed }
            let missedDates = missedLogs.map { $0.scheduledTime }
            
            // Calculate average time deviation
            let takenLogs = logs.filter { $0.status == .taken && $0.takenTime != nil }
            var avgDeviation: TimeInterval = 0
            if !takenLogs.isEmpty {
                let deviations = takenLogs.compactMap { log -> TimeInterval? in
                    guard let taken = log.takenTime else { return nil }
                    return abs(taken.timeIntervalSince(log.scheduledTime))
                }
                avgDeviation = deviations.reduce(0, +) / Double(deviations.count)
            }
            
            return MedicationReportItem(
                medication: med,
                adherenceRate: rate,
                dosesTaken: takenLogs.count,
                dosesExpected: logs.count,
                missedDates: missedDates,
                avgTimeDeviation: avgDeviation
            )
        }
    }
    
    // MARK: - Symptom Report
    
    private func generateSymptomReport(days: Int) -> SymptomReportSection {
        let entries = dataManager.getSymptoms(last: days)
        let frequency = dataManager.symptomFrequency(last: days)
        
        let symptomDetails = frequency.map { item -> SymptomDetail in
            let relevantEntries = entries.filter { $0.symptom.lowercased() == item.symptom }
            let hours = relevantEntries.map { Calendar.current.component(.hour, from: $0.timestamp) }
            
            var timePattern: String?
            let morningCount = hours.filter { $0 >= 6 && $0 < 12 }.count
            let afternoonCount = hours.filter { $0 >= 12 && $0 < 18 }.count
            let eveningCount = hours.filter { $0 >= 18 || $0 < 6 }.count
            
            let total = hours.count
            if total > 0 {
                if Double(morningCount) / Double(total) > 0.5 {
                    timePattern = "Mostly morning"
                } else if Double(afternoonCount) / Double(total) > 0.5 {
                    timePattern = "Mostly afternoon"
                } else if Double(eveningCount) / Double(total) > 0.5 {
                    timePattern = "Mostly evening"
                }
            }
            
            return SymptomDetail(
                symptom: item.symptom.capitalized,
                occurrences: item.count,
                avgSeverity: item.avgSeverity,
                timePattern: timePattern
            )
        }
        
        return SymptomReportSection(
            totalEntries: entries.count,
            details: symptomDetails
        )
    }
    
    // MARK: - Nutrition Report
    
    private func generateNutritionReport(days: Int) -> NutritionReportSection {
        let calendar = Calendar.current
        var dailyTotals: [NutritionTotals] = []
        var mealsLogged = 0
        var mealsExpected = 0
        
        for daysAgo in 0..<days {
            if let date = calendar.date(byAdding: .day, value: -daysAgo, to: Date()) {
                let meals = dataManager.getMeals(on: date)
                dailyTotals.append(dataManager.dailyNutrition(on: date))
                mealsLogged += meals.count
                mealsExpected += 3 // Assume 3 meals/day
            }
        }
        
        let avgCalories = dailyTotals.isEmpty ? 0 :
            dailyTotals.map { $0.calories }.reduce(0, +) / dailyTotals.count
        let avgProtein = dailyTotals.isEmpty ? 0 :
            dailyTotals.map { $0.protein }.reduce(0, +) / Double(dailyTotals.count)
        let avgCarbs = dailyTotals.isEmpty ? 0 :
            dailyTotals.map { $0.carbs }.reduce(0, +) / Double(dailyTotals.count)
        
        return NutritionReportSection(
            avgDailyCalories: avgCalories,
            avgDailyProtein: avgProtein,
            avgDailyCarbs: avgCarbs,
            mealsLogged: mealsLogged,
            mealsExpected: mealsExpected
        )
    }
    
    // MARK: - Insights
    
    private func generateInsights(days: Int) -> [String] {
        var insights: [String] = []
        
        // Medication insights
        let medReport = medicationService.adherenceReport(days: days)
        for item in medReport {
            if item.rate < 0.8 {
                insights.append("\(item.medication.name) adherence is below 80% — consider setting additional reminders.")
            }
        }
        
        // Symptom insights
        let symptomFreq = dataManager.symptomFrequency(last: days)
        if let top = symptomFreq.first, top.count >= 4 {
            insights.append("Recurring \(top.symptom) (\(top.count) times) warrants medical attention.")
        }
        
        // Correlation insights
        // Check if symptoms correlate with missed medications
        let missedMedDates = dataManager.medicationLogs
            .filter { $0.status == .missed }
            .map { Calendar.current.startOfDay(for: $0.scheduledTime) }
        
        let symptomDates = dataManager.getSymptoms(last: days)
            .map { Calendar.current.startOfDay(for: $0.timestamp) }
        
        let overlap = Set(missedMedDates).intersection(Set(symptomDates))
        if overlap.count > 2 {
            insights.append("Some symptoms correlate with missed medication doses.")
        }
        
        return insights
    }
    
    // MARK: - Text Report
    
    func generateTextReport(days: Int = 30) -> String {
        let report = generateReport(days: days)
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        
        var text = """
        HEALTH SUMMARY REPORT
        Period: \(dateFormatter.string(from: report.startDate)) - \(dateFormatter.string(from: report.endDate))
        Generated: \(dateFormatter.string(from: Date()))
        
        ══════════════════════════════════════════
        MEDICATION ADHERENCE
        ══════════════════════════════════════════
        """
        
        for item in report.medications {
            let pct = Int(item.adherenceRate * 100)
            text += "\n\(item.medication.name) \(item.medication.dosage)"
            text += "\n  Adherence: \(pct)% (\(item.dosesTaken)/\(item.dosesExpected) doses)"
            if !item.missedDates.isEmpty {
                let missed = item.missedDates.prefix(3).map { dateFormatter.string(from: $0) }.joined(separator: ", ")
                text += "\n  Missed: \(missed)"
            }
            text += "\n"
        }
        
        text += "\n══════════════════════════════════════════\n"
        text += "SYMPTOMS REPORTED\n"
        text += "══════════════════════════════════════════\n"
        
        for detail in report.symptoms.details {
            text += "\n\(detail.symptom): \(detail.occurrences) occurrence\(detail.occurrences == 1 ? "" : "s")"
            text += "\n  Severity: avg \(String(format: "%.1f", detail.avgSeverity))/10"
            if let pattern = detail.timePattern {
                text += "\n  Pattern: \(pattern)"
            }
        }
        
        text += "\n\n══════════════════════════════════════════\n"
        text += "NUTRITION SUMMARY\n"
        text += "══════════════════════════════════════════\n"
        text += "\nAvg daily calories: \(report.nutrition.avgDailyCalories)"
        text += "\nAvg daily protein: \(Int(report.nutrition.avgDailyProtein))g"
        text += "\nMeals logged: \(report.nutrition.mealsLogged)/\(report.nutrition.mealsExpected) (\(Int(Double(report.nutrition.mealsLogged)/Double(max(1,report.nutrition.mealsExpected))*100))%)"
        
        if !report.insights.isEmpty {
            text += "\n\n══════════════════════════════════════════\n"
            text += "NOTES FOR PHYSICIAN\n"
            text += "══════════════════════════════════════════\n"
            for insight in report.insights {
                text += "\n• \(insight)"
            }
        }
        
        return text
    }
    
    // MARK: - Voice Summary
    
    func generateVoiceSummary(days: Int = 7) -> String {
        let report = generateReport(days: days)
        
        var summary = "Here's your health summary for the past \(days) days. "
        
        // Medications
        if !report.medications.isEmpty {
            let avgAdherence = report.medications.map { $0.adherenceRate }.reduce(0, +) / Double(report.medications.count)
            summary += "Your medication adherence is \(Int(avgAdherence * 100))%. "
        }
        
        // Symptoms
        if report.symptoms.totalEntries > 0 {
            summary += "You reported \(report.symptoms.totalEntries) symptom\(report.symptoms.totalEntries == 1 ? "" : "s"). "
            if let top = report.symptoms.details.first {
                summary += "\(top.symptom) was most common. "
            }
        }
        
        // Nutrition
        if report.nutrition.avgDailyCalories > 0 {
            summary += "Average daily intake was \(report.nutrition.avgDailyCalories) calories. "
        }
        
        // Key insight
        if let insight = report.insights.first {
            summary += insight
        }
        
        return summary
    }
}

// MARK: - Report Data Structures

struct HealthReport {
    let startDate: Date
    let endDate: Date
    let medications: [MedicationReportItem]
    let symptoms: SymptomReportSection
    let nutrition: NutritionReportSection
    let insights: [String]
}

struct MedicationReportItem {
    let medication: Medication
    let adherenceRate: Double
    let dosesTaken: Int
    let dosesExpected: Int
    let missedDates: [Date]
    let avgTimeDeviation: TimeInterval
}

struct SymptomReportSection {
    let totalEntries: Int
    let details: [SymptomDetail]
}

struct SymptomDetail {
    let symptom: String
    let occurrences: Int
    let avgSeverity: Double
    let timePattern: String?
}

struct NutritionReportSection {
    let avgDailyCalories: Int
    let avgDailyProtein: Double
    let avgDailyCarbs: Double
    let mealsLogged: Int
    let mealsExpected: Int
}
