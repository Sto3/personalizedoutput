/**
 * LogSymptomView.swift
 *
 * REDI LOG SYMPTOM VIEW
 * 
 * Log symptoms with:
 * - Symptom picker
 * - Severity slider (1-10)
 * - Associated symptoms
 * - Notes
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct LogSymptomView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var symptomService = SymptomService.shared
    
    @State private var selectedSymptom = "Headache"
    @State private var customSymptom = ""
    @State private var severity = 5.0
    @State private var location = ""
    @State private var notes = ""
    @State private var showCustomInput = false
    
    let commonSymptoms = [
        "Headache", "Migraine", "Nausea", "Fatigue", "Dizziness",
        "Pain", "Soreness", "Congestion", "Cough", "Fever",
        "Chills", "Anxiety", "Stress", "Insomnia", "Other"
    ]
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Symptom")) {
                    Picker("Select Symptom", selection: $selectedSymptom) {
                        ForEach(commonSymptoms, id: \.self) { symptom in
                            Text(symptom).tag(symptom)
                        }
                    }
                    .onChange(of: selectedSymptom) { newValue in
                        showCustomInput = (newValue == "Other")
                    }
                    
                    if showCustomInput {
                        TextField("Describe your symptom", text: $customSymptom)
                    }
                }
                
                Section(header: Text("Severity: \(Int(severity))/10")) {
                    Slider(value: $severity, in: 1...10, step: 1)
                    
                    HStack {
                        Text("Mild")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("Severe")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Section(header: Text("Details (optional)")) {
                    TextField("Location (e.g., left temple)", text: $location)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                Section {
                    Text("Tracking symptoms helps identify patterns over time.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Log Symptom")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveSymptom()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private func saveSymptom() {
        let symptomName = showCustomInput ? customSymptom : selectedSymptom
        symptomService.logSymptomDirectly(
            name: symptomName,
            severity: Int(severity),
            location: location.isEmpty ? nil : location,
            notes: notes.isEmpty ? nil : notes
        )
        dismiss()
    }
}

#Preview {
    LogSymptomView()
}
