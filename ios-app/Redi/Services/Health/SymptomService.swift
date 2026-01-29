/**
 * SymptomService.swift
 *
 * REDI SYMPTOM TRACKING SERVICE
 * 
 * Manages:
 * - Voice-based symptom logging
 * - Severity tracking (1-10 scale)
 * - Pattern detection
 * - Voice query handling
 *
 * Created: Jan 29, 2026
 */

import Foundation

class SymptomService: ObservableObject {
    static let shared = SymptomService()
    
    @Published var recentSymptoms: [SymptomEntry] = []
    @Published var isLoggingSymptom = false
    @Published var currentSymptomDraft: SymptomDraft?
    
    private let dataManager = HealthDataManager.shared
    
    // Common symptom keywords for detection
    private let symptomKeywords: [String: String] = [
        "headache": "Headache",
        "head hurts": "Headache",
        "migraine": "Migraine",
        "nausea": "Nausea",
        "nauseous": "Nausea",
        "sick to my stomach": "Nausea",
        "tired": "Fatigue",
        "fatigue": "Fatigue",
        "exhausted": "Fatigue",
        "dizzy": "Dizziness",
        "lightheaded": "Dizziness",
        "pain": "Pain",
        "hurts": "Pain",
        "ache": "Pain",
        "sore": "Soreness",
        "congested": "Congestion",
        "stuffy": "Congestion",
        "cough": "Cough",
        "coughing": "Cough",
        "fever": "Fever",
        "hot": "Fever",
        "chills": "Chills",
        "anxiety": "Anxiety",
        "anxious": "Anxiety",
        "stressed": "Stress",
        "insomnia": "Insomnia",
        "can't sleep": "Insomnia"
    ]
    
    private init() {
        loadRecentSymptoms()
    }
    
    // MARK: - Data Loading
    
    func loadRecentSymptoms() {
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -7, to: endDate) else { return }
        
        recentSymptoms = dataManager.getSymptomEntries(from: startDate, to: endDate)
    }
    
    // MARK: - Symptom Logging
    
    struct SymptomDraft {
        var name: String
        var severity: Int?
        var location: String?
        var associatedSymptoms: [String]
        var notes: String?
    }
    
    func startLoggingSymptom(_ symptomName: String) {
        currentSymptomDraft = SymptomDraft(
            name: symptomName,
            severity: nil,
            location: nil,
            associatedSymptoms: [],
            notes: nil
        )
        isLoggingSymptom = true
    }
    
    func setSeverity(_ severity: Int) {
        currentSymptomDraft?.severity = severity
    }
    
    func setLocation(_ location: String) {
        currentSymptomDraft?.location = location
    }
    
    func addAssociatedSymptom(_ symptom: String) {
        currentSymptomDraft?.associatedSymptoms.append(symptom)
    }
    
    func finishLogging() -> SymptomEntry? {
        guard let draft = currentSymptomDraft else { return nil }
        
        let entry = SymptomEntry(
            id: UUID().uuidString,
            timestamp: Date(),
            symptomName: draft.name,
            severity: draft.severity ?? 5,
            location: draft.location,
            associatedSymptoms: draft.associatedSymptoms,
            notes: draft.notes
        )
        
        dataManager.saveSymptomEntry(entry)
        
        currentSymptomDraft = nil
        isLoggingSymptom = false
        loadRecentSymptoms()
        
        return entry
    }
    
    func cancelLogging() {
        currentSymptomDraft = nil
        isLoggingSymptom = false
    }
    
    func logSymptomDirectly(name: String, severity: Int, location: String? = nil, notes: String? = nil) {
        let entry = SymptomEntry(
            id: UUID().uuidString,
            timestamp: Date(),
            symptomName: name,
            severity: severity,
            location: location,
            associatedSymptoms: [],
            notes: notes
        )
        
        dataManager.saveSymptomEntry(entry)
        loadRecentSymptoms()
    }
    
    // MARK: - Voice Processing
    
    func processVoiceInput(_ input: String) -> String {
        let lowercased = input.lowercased()
        
        // Detect symptom from keywords
        var detectedSymptom: String? = nil
        for (keyword, symptomName) in symptomKeywords {
            if lowercased.contains(keyword) {
                detectedSymptom = symptomName
                break
            }
        }
        
        // Extract severity if mentioned
        var severity: Int? = nil
        let severityPatterns = [
            ("really bad", 8), ("terrible", 9), ("awful", 9), ("severe", 8),
            ("pretty bad", 7), ("moderate", 5), ("mild", 3), ("slight", 2),
            ("a little", 2), ("minor", 2)
        ]
        
        for (pattern, value) in severityPatterns {
            if lowercased.contains(pattern) {
                severity = value
                break
            }
        }
        
        // Also check for numeric severity ("6 out of 10")
        if let range = lowercased.range(of: "\\d+\\s*(out of|/|of)\\s*10", options: .regularExpression) {
            let match = String(lowercased[range])
            if let number = Int(match.components(separatedBy: CharacterSet.decimalDigits.inverted).first ?? "") {
                severity = min(10, max(1, number))
            }
        }
        
        // If we detected a symptom, log it
        if let symptom = detectedSymptom {
            let actualSeverity = severity ?? 5
            logSymptomDirectly(name: symptom, severity: actualSeverity, notes: "Logged via voice: \(input)")
            
            var response = "I've logged your \(symptom.lowercased()) with a severity of \(actualSeverity) out of 10."
            
            // Check for patterns
            let patterns = detectPatterns(for: symptom)
            if !patterns.isEmpty {
                response += " " + patterns
            }
            
            return response
        }
        
        // Couldn't detect specific symptom
        return "I heard that you're not feeling well. Can you tell me more specifically what's bothering you? For example, 'I have a headache' or 'I'm feeling nauseous'."
    }
    
    // MARK: - Pattern Detection
    
    func detectPatterns(for symptomName: String) -> String {
        let calendar = Calendar.current
        let now = Date()
        guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) else { return "" }
        
        let recentOccurrences = dataManager.getSymptomEntries(from: weekAgo, to: now)
            .filter { $0.symptomName.lowercased() == symptomName.lowercased() }
        
        if recentOccurrences.count >= 3 {
            let avgSeverity = recentOccurrences.reduce(0) { $0 + $1.severity } / recentOccurrences.count
            return "I've noticed you've had \(symptomName.lowercased()) \(recentOccurrences.count) times this week with an average severity of \(avgSeverity). You might want to mention this to your doctor."
        }
        
        return ""
    }
    
    // MARK: - Voice Query Handling
    
    func handleQuery(_ query: String) -> String {
        let lowercased = query.lowercased()
        
        // "What symptoms have I had?"
        if lowercased.contains("what symptom") || lowercased.contains("my symptoms") {
            return describeRecentSymptoms()
        }
        
        // "How often have I had headaches?"
        if lowercased.contains("how often") || lowercased.contains("how many times") {
            // Try to extract the symptom
            for (keyword, symptomName) in symptomKeywords {
                if lowercased.contains(keyword) {
                    return describeSymptomFrequency(symptomName)
                }
            }
            return describeRecentSymptoms()
        }
        
        // "Any patterns?"
        if lowercased.contains("pattern") || lowercased.contains("trend") {
            return describePatterns()
        }
        
        // Default
        return "I can help you track symptoms. Tell me what you're feeling, like 'I have a headache' or ask about your symptom history."
    }
    
    private func describeRecentSymptoms() -> String {
        loadRecentSymptoms()
        
        if recentSymptoms.isEmpty {
            return "You haven't logged any symptoms in the past week. That's great news!"
        }
        
        // Group by symptom name
        var symptomCounts: [String: Int] = [:]
        for entry in recentSymptoms {
            symptomCounts[entry.symptomName, default: 0] += 1
        }
        
        let descriptions = symptomCounts.map { "\($0.key) (\($0.value) time\($0.value == 1 ? "" : "s"))" }
        
        return "In the past week, you've logged: \(descriptions.joined(separator: ", "))."
    }
    
    private func describeSymptomFrequency(_ symptomName: String) -> String {
        loadRecentSymptoms()
        
        let occurrences = recentSymptoms.filter { $0.symptomName.lowercased() == symptomName.lowercased() }
        
        if occurrences.isEmpty {
            return "You haven't logged any \(symptomName.lowercased()) in the past week."
        }
        
        let avgSeverity = occurrences.reduce(0) { $0 + $1.severity } / occurrences.count
        
        return "You've had \(symptomName.lowercased()) \(occurrences.count) time\(occurrences.count == 1 ? "" : "s") this week with an average severity of \(avgSeverity) out of 10."
    }
    
    private func describePatterns() -> String {
        loadRecentSymptoms()
        
        if recentSymptoms.count < 3 {
            return "I don't have enough data yet to detect patterns. Keep logging symptoms and I'll let you know if I notice anything."
        }
        
        // Check for recurring symptoms
        var symptomCounts: [String: Int] = [:]
        for entry in recentSymptoms {
            symptomCounts[entry.symptomName, default: 0] += 1
        }
        
        let recurring = symptomCounts.filter { $0.value >= 3 }.keys
        
        if recurring.isEmpty {
            return "I haven't detected any recurring patterns in your symptoms this week."
        }
        
        return "You've had recurring \(recurring.joined(separator: " and ")) this week. You might want to discuss this with your doctor."
    }
}
