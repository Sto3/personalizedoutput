/**
 * HealthReportService.swift
 *
 * REDI HEALTH REPORT SERVICE
 * 
 * Generates comprehensive health reports for doctor visits:
 * - Medication adherence summary
 * - Symptom patterns
 * - Nutrition overview
 * - Export to PDF/text
 *
 * Created: Jan 29, 2026
 */

import Foundation
import UIKit

class HealthReportService: ObservableObject {
    static let shared = HealthReportService()
    
    private let dataManager = HealthDataManager.shared
    private let medicationService = MedicationService.shared
    private let nutritionService = NutritionService.shared
    private let symptomService = SymptomService.shared
    
    private init() {}
    
    // MARK: - Report Generation
    
    struct HealthReport {
        let generatedAt: Date
        let periodStart: Date
        let periodEnd: Date
        
        // Medications
        let medications: [Medication]
        let adherencePercentage: Double
        let missedDoses: Int
        let medicationLogs: [MedicationLog]
        
        // Symptoms
        let symptoms: [SymptomEntry]
        let symptomSummary: [String: Int] // symptom name -> count
        let avgSymptomSeverity: Double
        
        // Nutrition
        let avgDailyCalories: Int
        let avgDailyProtein: Int
        let mealsLogged: Int
    }
    
    func generateReport(days: Int = 30) -> HealthReport {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate)!
        
        // Gather medication data
        let medications = dataManager.getMedications().filter { $0.isActive }
        let medicationLogs = dataManager.getMedicationLogs(from: startDate, to: endDate)
        let adherence = medicationService.calculateAdherence(days: days)
        let missed = medicationService.getMissedDoses(days: days)
        
        // Gather symptom data
        let symptoms = dataManager.getSymptomEntries(from: startDate, to: endDate)
        var symptomCounts: [String: Int] = [:]
        var totalSeverity = 0
        for symptom in symptoms {
            symptomCounts[symptom.symptomName, default: 0] += 1
            totalSeverity += symptom.severity
        }
        let avgSeverity = symptoms.isEmpty ? 0 : Double(totalSeverity) / Double(symptoms.count)
        
        // Gather nutrition data
        let meals = dataManager.getMealLogs(from: startDate, to: endDate)
        let totalCalories = meals.reduce(0) { $0 + ($1.totalCalories ?? 0) }
        let totalProtein = meals.reduce(0) { $0 + ($1.totalProtein ?? 0) }
        let daysWithMeals = Set(meals.map { Calendar.current.startOfDay(for: $0.timestamp) }).count
        
        return HealthReport(
            generatedAt: Date(),
            periodStart: startDate,
            periodEnd: endDate,
            medications: medications,
            adherencePercentage: adherence,
            missedDoses: missed,
            medicationLogs: medicationLogs,
            symptoms: symptoms,
            symptomSummary: symptomCounts,
            avgSymptomSeverity: avgSeverity,
            avgDailyCalories: daysWithMeals > 0 ? totalCalories / daysWithMeals : 0,
            avgDailyProtein: daysWithMeals > 0 ? totalProtein / daysWithMeals : 0,
            mealsLogged: meals.count
        )
    }
    
    // MARK: - Text Report
    
    func generateTextReport(days: Int = 30) -> String {
        let report = generateReport(days: days)
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        
        var text = """
        =====================================
        REDI HEALTH REPORT
        =====================================
        
        Period: \(dateFormatter.string(from: report.periodStart)) to \(dateFormatter.string(from: report.periodEnd))
        Generated: \(dateFormatter.string(from: report.generatedAt))
        
        
        MEDICATIONS
        -----------
        """
        
        if report.medications.isEmpty {
            text += "\nNo medications tracked.\n"
        } else {
            text += "\nCurrent Medications:\n"
            for med in report.medications {
                text += "  • \(med.name) - \(med.dosage)\n"
            }
            text += "\nAdherence: \(Int(report.adherencePercentage * 100))%\n"
            text += "Missed Doses: \(report.missedDoses)\n"
        }
        
        text += "\n\nSYMPTOMS\n--------\n"
        
        if report.symptoms.isEmpty {
            text += "No symptoms logged.\n"
        } else {
            text += "Summary:\n"
            for (symptom, count) in report.symptomSummary.sorted(by: { $0.value > $1.value }) {
                text += "  • \(symptom): \(count) occurrence\(count == 1 ? "" : "s")\n"
            }
            text += "\nAverage Severity: \(String(format: "%.1f", report.avgSymptomSeverity))/10\n"
            
            // Recent symptoms detail
            text += "\nRecent Symptoms:\n"
            let recentSymptoms = report.symptoms.prefix(10)
            for symptom in recentSymptoms {
                let date = dateFormatter.string(from: symptom.timestamp)
                text += "  \(date): \(symptom.symptomName) (\(symptom.severity)/10)\n"
            }
        }
        
        text += "\n\nNUTRITION\n---------\n"
        text += "Meals Logged: \(report.mealsLogged)\n"
        text += "Average Daily Calories: \(report.avgDailyCalories)\n"
        text += "Average Daily Protein: \(report.avgDailyProtein)g\n"
        
        text += "\n\n=====================================\n"
        text += "Generated by Redi Health Tracking\n"
        text += "=====================================\n"
        
        return text
    }
    
    // MARK: - Voice Summary
    
    func generateVoiceSummary(days: Int = 7) -> String {
        let report = generateReport(days: days)
        
        var summary = "Here's your health summary for the past \(days) days. "
        
        // Medications
        if !report.medications.isEmpty {
            let adherencePercent = Int(report.adherencePercentage * 100)
            summary += "Your medication adherence is \(adherencePercent) percent"
            if report.missedDoses > 0 {
                summary += " with \(report.missedDoses) missed dose\(report.missedDoses == 1 ? "" : "s")"
            }
            summary += ". "
        }
        
        // Symptoms
        if !report.symptoms.isEmpty {
            let topSymptom = report.symptomSummary.max(by: { $0.value < $1.value })
            if let top = topSymptom {
                summary += "Your most frequent symptom was \(top.key.lowercased()) which you experienced \(top.value) time\(top.value == 1 ? "" : "s"). "
            }
        } else {
            summary += "You haven't logged any symptoms, which is good! "
        }
        
        // Nutrition
        if report.mealsLogged > 0 {
            summary += "You logged \(report.mealsLogged) meals with an average of \(report.avgDailyCalories) calories per day. "
        }
        
        summary += "Would you like me to generate a detailed report for your doctor?"
        
        return summary
    }
    
    // MARK: - Export
    
    func shareReport(days: Int = 30) -> URL? {
        let text = generateTextReport(days: days)
        
        let fileName = "redi_health_report_\(Int(Date().timeIntervalSince1970)).txt"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        
        do {
            try text.write(to: tempURL, atomically: true, encoding: .utf8)
            return tempURL
        } catch {
            print("[HealthReport] Failed to write report: \(error)")
            return nil
        }
    }
}
