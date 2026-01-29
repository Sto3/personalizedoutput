/**
 * SymptomService.swift
 *
 * REDI SYMPTOM TRACKING SERVICE
 * 
 * Manages:
 * - Voice-based symptom logging
 * - Severity tracking (1-10)
 * - Pattern detection
 * - Natural language extraction
 *
 * Created: Jan 29, 2026
 */

import Foundation

class SymptomService: ObservableObject {
    static let shared = SymptomService()
    
    @Published var recentSymptoms: [SymptomEntry] = []
    @Published var isLogging: Bool = false
    @Published var currentLoggingState: LoggingState = .idle
    
    // State machine for voice logging
    enum LoggingState {
        case idle
        case awaitingSymptom
        case awaitingSeverity(symptom: String)
        case awaitingDetails(symptom: String, severity: Int)
        case complete
    }
    
    private let dataManager = HealthDataManager.shared
    
    // Common symptoms for detection
    private let knownSymptoms = [
        "headache", "migraine", "nausea", "fatigue", "tired",
        "dizziness", "dizzy", "pain", "ache", "fever",
        "cough", "sore throat", "congestion", "runny nose",
        "stomach ache", "cramps", "bloating", "heartburn",
        "insomnia", "anxiety", "stress", "depression"
    ]
    
    private init() {
        loadRecentSymptoms()
    }
    
    // MARK: - Data Loading
    
    func loadRecentSymptoms() {
        let calendar = Calendar.current
        guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: Date()) else { return }
        recentSymptoms = dataManager.getSymptoms(from: weekAgo, to: Date())
    }
    
    // MARK: - Symptom Logging
    
    func logSymptom(name: String, severity: Int, notes: String? = nil, associatedSymptoms: [String]? = nil) {
        let entry = SymptomEntry(
            id: UUID().uuidString,
            timestamp: Date(),
            symptom: name.lowercased().capitalized,
            severity: min(10, max(1, severity)),
            notes: notes,
            associatedSymptoms: associatedSymptoms
        )
        
        dataManager.saveSymptom(entry)
        loadRecentSymptoms()
    }
    
    // MARK: - Voice Input Processing
    
    func processVoiceInput(_ input: String) -> String {
        let lowercased = input.lowercased()
        
        switch currentLoggingState {
        case .idle:
            // Try to extract symptom from natural language
            if let symptom = extractSymptom(from: lowercased) {
                // Check if severity is also mentioned
                if let severity = extractSeverity(from: lowercased) {
                    logSymptom(name: symptom, severity: severity)
                    return "I've logged your \(symptom) with a severity of \(severity) out of 10. Feel better soon!"
                }
                currentLoggingState = .awaitingSeverity(symptom: symptom)
                return "I'll log that \(symptom). On a scale of 1 to 10, how severe is it?"
            }
            
            // Start logging flow
            currentLoggingState = .awaitingSymptom
            return "What symptom are you experiencing?"
            
        case .awaitingSymptom:
            if let symptom = extractSymptom(from: lowercased) ?? extractAnySymptom(from: input) {
                currentLoggingState = .awaitingSeverity(symptom: symptom)
                return "Got it, \(symptom). On a scale of 1 to 10, how severe is it?"
            }
            return "I didn't catch that. What symptom are you experiencing? For example: headache, nausea, fatigue."
            
        case .awaitingSeverity(let symptom):
            if let severity = extractSeverity(from: lowercased) {
                logSymptom(name: symptom, severity: severity)
                currentLoggingState = .idle
                return "I've logged your \(symptom) with a severity of \(severity) out of 10. Take care!"
            }
            return "Please give me a number from 1 to 10, where 1 is mild and 10 is severe."
            
        case .awaitingDetails(let symptom, let severity):
            logSymptom(name: symptom, severity: severity, notes: input)
            currentLoggingState = .idle
            return "I've logged your \(symptom) with your notes. Feel better soon!"
            
        case .complete:
            currentLoggingState = .idle
            return "Symptom logged. Is there anything else I can help with?"
        }
    }
    
    private func extractSymptom(from text: String) -> String? {
        for symptom in knownSymptoms {
            if text.contains(symptom) {
                return symptom
            }
        }
        return nil
    }
    
    private func extractAnySymptom(from text: String) -> String? {
        // Try to extract a noun as the symptom
        let words = text.components(separatedBy: .whitespaces)
        if let first = words.first, words.count <= 3 {
            return first.capitalized
        }
        return text.trimmingCharacters(in: .whitespacesAndNewlines).capitalized
    }
    
    private func extractSeverity(from text: String) -> Int? {
        // Look for numbers 1-10
        let pattern = #"\b([1-9]|10)\b"#
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text) {
            return Int(text[range])
        }
        
        // Look for words
        if text.contains("mild") || text.contains("slight") { return 3 }
        if text.contains("moderate") || text.contains("medium") { return 5 }
        if text.contains("severe") || text.contains("bad") || text.contains("terrible") { return 8 }
        if text.contains("worst") || text.contains("unbearable") { return 10 }
        
        return nil
    }
    
    func cancelLogging() {
        currentLoggingState = .idle
        isLogging = false
    }
    
    // MARK: - Pattern Detection
    
    func detectPatterns(days: Int = 30) -> [SymptomPattern] {
        let calendar = Calendar.current
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: Date()) else { return [] }
        
        let symptoms = dataManager.getSymptoms(from: startDate, to: Date())
        
        // Group by symptom name
        var symptomGroups: [String: [SymptomEntry]] = [:]
        for entry in symptoms {
            let key = entry.symptom.lowercased()
            if symptomGroups[key] == nil {
                symptomGroups[key] = []
            }
            symptomGroups[key]?.append(entry)
        }
        
        var patterns: [SymptomPattern] = []
        
        for (name, entries) in symptomGroups {
            guard entries.count >= 3 else { continue }
            
            let avgSeverity = Double(entries.map { $0.severity }.reduce(0, +)) / Double(entries.count)
            let frequency = Double(entries.count) / Double(days) * 7 // per week
            
            // Check for time patterns
            let hours = entries.map { calendar.component(.hour, from: $0.timestamp) }
            let avgHour = hours.reduce(0, +) / hours.count
            var timePattern: String? = nil
            
            if avgHour >= 6 && avgHour <= 10 {
                timePattern = "morning"
            } else if avgHour >= 18 && avgHour <= 22 {
                timePattern = "evening"
            }
            
            let pattern = SymptomPattern(
                symptomName: name.capitalized,
                occurrences: entries.count,
                averageSeverity: avgSeverity,
                frequencyPerWeek: frequency,
                timePattern: timePattern,
                trend: calculateTrend(entries: entries)
            )
            patterns.append(pattern)
        }
        
        return patterns.sorted { $0.occurrences > $1.occurrences }
    }
    
    private func calculateTrend(entries: [SymptomEntry]) -> SymptomTrend {
        guard entries.count >= 2 else { return .stable }
        
        let sorted = entries.sorted { $0.timestamp < $1.timestamp }
        let firstHalf = sorted.prefix(sorted.count / 2)
        let secondHalf = sorted.suffix(sorted.count / 2)
        
        let firstAvg = Double(firstHalf.map { $0.severity }.reduce(0, +)) / Double(firstHalf.count)
        let secondAvg = Double(secondHalf.map { $0.severity }.reduce(0, +)) / Double(secondHalf.count)
        
        if secondAvg > firstAvg + 1 {
            return .worsening
        } else if secondAvg < firstAvg - 1 {
            return .improving
        }
        return .stable
    }
    
    // MARK: - Voice Query Handling
    
    func handleQuery(_ query: String) -> String {
        let lowercased = query.lowercased()
        
        // "What symptoms have I had?"
        if lowercased.contains("what symptom") || lowercased.contains("my symptom") {
            return describeRecentSymptoms()
        }
        
        // "Any patterns?"
        if lowercased.contains("pattern") || lowercased.contains("trend") {
            return describePatterns()
        }
        
        // "How often do I get headaches?"
        if let symptom = extractSymptom(from: lowercased) {
            return describeSpecificSymptom(symptom)
        }
        
        // Default
        return "I can help you track symptoms. Tell me what you're experiencing, or ask about your symptom history."
    }
    
    private func describeRecentSymptoms() -> String {
        loadRecentSymptoms()
        
        if recentSymptoms.isEmpty {
            return "You haven't logged any symptoms in the past week."
        }
        
        let uniqueSymptoms = Set(recentSymptoms.map { $0.symptom })
        let avgSeverity = Double(recentSymptoms.map { $0.severity }.reduce(0, +)) / Double(recentSymptoms.count)
        
        return "In the past week, you've logged \(recentSymptoms.count) symptom\(recentSymptoms.count == 1 ? "" : "s"): \(uniqueSymptoms.joined(separator: ", ")). Average severity: \(String(format: "%.1f", avgSeverity)) out of 10."
    }
    
    private func describePatterns() -> String {
        let patterns = detectPatterns()
        
        if patterns.isEmpty {
            return "I don't see any significant patterns yet. Keep logging symptoms and I'll identify trends over time."
        }
        
        var descriptions: [String] = []
        for pattern in patterns.prefix(3) {
            var desc = "\(pattern.symptomName) occurs about \(String(format: "%.1f", pattern.frequencyPerWeek)) times per week"
            if let time = pattern.timePattern {
                desc += ", usually in the \(time)"
            }
            if pattern.trend == .worsening {
                desc += " and is getting worse"
            } else if pattern.trend == .improving {
                desc += " and is improving"
            }
            descriptions.append(desc)
        }
        
        return "Here are some patterns I've noticed: \(descriptions.joined(separator: ". "))."
    }
    
    private func describeSpecificSymptom(_ symptom: String) -> String {
        let calendar = Calendar.current
        guard let monthAgo = calendar.date(byAdding: .day, value: -30, to: Date()) else {
            return "I couldn't check your history."
        }
        
        let allSymptoms = dataManager.getSymptoms(from: monthAgo, to: Date())
        let matches = allSymptoms.filter { $0.symptom.lowercased() == symptom.lowercased() }
        
        if matches.isEmpty {
            return "You haven't logged any \(symptom) in the past month."
        }
        
        let avgSeverity = Double(matches.map { $0.severity }.reduce(0, +)) / Double(matches.count)
        
        return "In the past month, you've had \(matches.count) episode\(matches.count == 1 ? "" : "s") of \(symptom) with an average severity of \(String(format: "%.1f", avgSeverity)) out of 10."
    }
}

// MARK: - Supporting Types

struct SymptomPattern {
    let symptomName: String
    let occurrences: Int
    let averageSeverity: Double
    let frequencyPerWeek: Double
    let timePattern: String?
    let trend: SymptomTrend
}

enum SymptomTrend {
    case improving
    case stable
    case worsening
}
