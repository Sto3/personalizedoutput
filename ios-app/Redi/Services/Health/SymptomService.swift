/**
 * SymptomService.swift
 *
 * REDI HEALTH - Symptom Tracking
 * 
 * Features:
 * - Voice-based symptom logging
 * - Severity tracking
 * - Pattern detection
 * - Correlation with medications/meals
 *
 * Created: Jan 26, 2026
 */

import Foundation
import Combine

class SymptomService: ObservableObject {
    static let shared = SymptomService()
    
    // MARK: - Published
    
    @Published var recentSymptoms: [SymptomEntry] = []
    @Published var loggingState: LoggingState = .idle
    @Published var currentEntry: PartialSymptomEntry?
    
    // MARK: - Dependencies
    
    private let dataManager = HealthDataManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Logging State Machine
    
    enum LoggingState {
        case idle
        case awaitingSymptom
        case awaitingSeverity
        case awaitingAssociated
        case confirming
    }
    
    struct PartialSymptomEntry {
        var symptom: String?
        var severity: Int?
        var associatedSymptoms: [String] = []
        var triggers: [String] = []
    }
    
    // MARK: - Common Symptoms
    
    static let commonSymptoms = [
        "headache", "dizziness", "nausea", "fatigue", "pain",
        "anxiety", "insomnia", "shortness of breath", "chest pain",
        "stomach ache", "back pain", "joint pain", "muscle ache",
        "cough", "sore throat", "fever", "chills", "rash"
    ]
    
    // MARK: - Init
    
    private init() {
        dataManager.$symptomEntries
            .sink { [weak self] _ in
                self?.refreshRecent()
            }
            .store(in: &cancellables)
        
        refreshRecent()
    }
    
    // MARK: - Refresh
    
    func refreshRecent() {
        recentSymptoms = dataManager.getSymptoms(last: 7)
            .sorted { $0.timestamp > $1.timestamp }
    }
    
    // MARK: - Quick Log
    
    func quickLog(symptom: String, severity: Int, associated: [String] = []) {
        let entry = SymptomEntry(
            symptom: symptom,
            severity: severity,
            associated: associated
        )
        dataManager.logSymptom(entry)
        refreshRecent()
    }
    
    // MARK: - Voice Interaction State Machine
    
    func handleVoiceInput(_ text: String) -> String {
        let lower = text.lowercased()
        
        switch loggingState {
        case .idle:
            // Check if user is reporting a symptom
            if let symptom = extractSymptom(from: lower) {
                currentEntry = PartialSymptomEntry(symptom: symptom)
                loggingState = .awaitingSeverity
                return "I'm sorry to hear that. On a scale of 1 to 10, how severe is the \(symptom)?"
            }
            
            // Check for queries
            return handleQuery(lower)
            
        case .awaitingSeverity:
            if let severity = extractNumber(from: lower) {
                currentEntry?.severity = severity
                loggingState = .awaitingAssociated
                return "Got it, \(severity) out of 10. Any other symptoms along with it?"
            }
            return "Please give me a number from 1 to 10."
            
        case .awaitingAssociated:
            let associated = extractSymptoms(from: lower)
            currentEntry?.associatedSymptoms = associated
            loggingState = .confirming
            return generateConfirmation()
            
        case .confirming:
            if isAffirmative(lower) {
                saveCurrentEntry()
                let pattern = checkForPatterns()
                loggingState = .idle
                currentEntry = nil
                return "Logged. \(pattern ?? "Feel better soon!")"
            } else if isNegative(lower) {
                loggingState = .idle
                currentEntry = nil
                return "Okay, cancelled."
            }
            return "Should I log this? Say yes or no."
            
        default:
            loggingState = .idle
            return "Let's start over. What symptom are you experiencing?"
        }
    }
    
    func cancelLogging() {
        loggingState = .idle
        currentEntry = nil
    }
    
    // MARK: - Query Handling
    
    private func handleQuery(_ query: String) -> String {
        // "How have I been feeling?"
        if query.contains("how") && (query.contains("feeling") || query.contains("been")) {
            let recent = dataManager.getSymptoms(last: 7)
            if recent.isEmpty {
                return "No symptoms logged in the past week. That's good!"
            }
            
            let freq = dataManager.symptomFrequency(last: 7)
            if let top = freq.first {
                return "In the past week, you've reported \(top.symptom) \(top.count) time\(top.count == 1 ? "" : "s") with average severity \(String(format: "%.1f", top.avgSeverity))/10."
            }
            return "You've logged \(recent.count) symptom\(recent.count == 1 ? "" : "s") this week."
        }
        
        // "Any patterns?"
        if query.contains("pattern") {
            if let pattern = checkForPatterns() {
                return pattern
            }
            return "I haven't detected any clear patterns yet. Keep logging symptoms and I'll watch for trends."
        }
        
        // Start logging flow
        if query.contains("log") || query.contains("report") || query.contains("track") {
            loggingState = .awaitingSymptom
            return "What symptom are you experiencing?"
        }
        
        return "I can help track symptoms. Say something like 'I'm feeling dizzy' or 'log a symptom'."
    }
    
    // MARK: - Extraction Helpers
    
    private func extractSymptom(from text: String) -> String? {
        // Check for trigger phrases
        let triggers = ["feeling", "have", "experiencing", "got", "suffering"]
        let hasТrigger = triggers.contains { text.contains($0) }
        
        // Find matching symptom
        for symptom in Self.commonSymptoms {
            if text.contains(symptom) {
                return symptom
            }
        }
        
        // If trigger word but no common symptom, extract noun
        if hasТrigger {
            // Simple extraction - take word after trigger
            for trigger in triggers {
                if let range = text.range(of: trigger) {
                    let after = text[range.upperBound...].trimmingCharacters(in: .whitespaces)
                    let words = after.split(separator: " ")
                    if let first = words.first {
                        let word = String(first).trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
                        if word.count > 2 && !isStopWord(word) {
                            return word
                        }
                    }
                }
            }
        }
        
        return nil
    }
    
    private func extractSymptoms(from text: String) -> [String] {
        var found: [String] = []
        for symptom in Self.commonSymptoms {
            if text.contains(symptom) {
                found.append(symptom)
            }
        }
        
        // "none" or "no" = no associated symptoms
        if text.contains("none") || text == "no" || text.contains("that's it") {
            return []
        }
        
        return found
    }
    
    private func extractNumber(from text: String) -> Int? {
        // Direct number
        let numbers = text.components(separatedBy: CharacterSet.decimalDigits.inverted)
            .compactMap { Int($0) }
            .filter { $0 >= 1 && $0 <= 10 }
        if let num = numbers.first {
            return num
        }
        
        // Word numbers
        let wordNumbers = ["one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                          "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10]
        for (word, num) in wordNumbers {
            if text.contains(word) {
                return num
            }
        }
        
        return nil
    }
    
    private func isAffirmative(_ text: String) -> Bool {
        ["yes", "yeah", "yep", "correct", "right", "sure", "ok", "okay", "log it", "save"].contains { text.contains($0) }
    }
    
    private func isNegative(_ text: String) -> Bool {
        ["no", "nope", "cancel", "stop", "never mind", "forget it"].contains { text.contains($0) }
    }
    
    private func isStopWord(_ word: String) -> Bool {
        ["a", "an", "the", "is", "am", "are", "very", "really", "bit", "little", "some"].contains(word)
    }
    
    // MARK: - Confirmation
    
    private func generateConfirmation() -> String {
        guard let entry = currentEntry, let symptom = entry.symptom, let severity = entry.severity else {
            return "Something went wrong. Let's start over."
        }
        
        var msg = "So you have \(symptom) at \(severity)/10"
        if !entry.associatedSymptoms.isEmpty {
            msg += " with \(entry.associatedSymptoms.joined(separator: " and "))"
        }
        msg += ". Should I log this?"
        return msg
    }
    
    // MARK: - Save
    
    private func saveCurrentEntry() {
        guard let partial = currentEntry,
              let symptom = partial.symptom,
              let severity = partial.severity else { return }
        
        let entry = SymptomEntry(
            symptom: symptom,
            severity: severity,
            associated: partial.associatedSymptoms,
            triggers: partial.triggers
        )
        
        dataManager.logSymptom(entry)
        refreshRecent()
    }
    
    // MARK: - Pattern Detection
    
    func checkForPatterns() -> String? {
        let freq = dataManager.symptomFrequency(last: 14)
        
        // Check for recurring symptom
        if let top = freq.first, top.count >= 3 {
            // Check time patterns
            let entries = dataManager.getSymptoms(last: 14).filter { $0.symptom.lowercased() == top.symptom }
            let hours = entries.map { Calendar.current.component(.hour, from: $0.timestamp) }
            
            // Afternoon pattern (12-18)
            let afternoonCount = hours.filter { $0 >= 12 && $0 < 18 }.count
            if Double(afternoonCount) / Double(hours.count) > 0.6 {
                return "I've noticed your \(top.symptom) tends to occur in the afternoon. This has happened \(top.count) times in the past 2 weeks."
            }
            
            // Morning pattern (6-11)
            let morningCount = hours.filter { $0 >= 6 && $0 < 11 }.count
            if Double(morningCount) / Double(hours.count) > 0.6 {
                return "Your \(top.symptom) seems to occur mostly in the morning. Worth mentioning to your doctor."
            }
            
            // Just frequency
            return "This is the \(ordinal(top.count)) time you've reported \(top.symptom) in 2 weeks."
        }
        
        return nil
    }
    
    private func ordinal(_ n: Int) -> String {
        let suffix: String
        switch n % 10 {
        case 1 where n % 100 != 11: suffix = "st"
        case 2 where n % 100 != 12: suffix = "nd"
        case 3 where n % 100 != 13: suffix = "rd"
        default: suffix = "th"
        }
        return "\(n)\(suffix)"
    }
}
