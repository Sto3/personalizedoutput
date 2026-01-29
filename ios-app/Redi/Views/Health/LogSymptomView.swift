/**
 * LogSymptomView.swift
 *
 * REDI HEALTH - Log Symptom
 *
 * Created: Jan 26, 2026
 */

import SwiftUI

struct LogSymptomView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var symptomService = SymptomService.shared
    
    @State private var symptom = ""
    @State private var severity: Double = 5
    @State private var selectedSymptom: String?
    @State private var associatedSymptoms: Set<String> = []
    @State private var notes = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("What are you experiencing?") {
                    TextField("Describe symptom", text: $symptom)
                    
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(SymptomService.commonSymptoms.prefix(12), id: \.self) { s in
                            Button(action: { selectSymptom(s) }) {
                                Text(s.capitalized)
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(symptom.lowercased() == s ? Color.cyan : Color(.systemGray5))
                                    .foregroundColor(symptom.lowercased() == s ? .white : .primary)
                                    .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                Section("Severity: \(Int(severity))/10") {
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
                
                Section("Associated symptoms (optional)") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 8) {
                        ForEach(SymptomService.commonSymptoms.filter { $0 != symptom.lowercased() }.prefix(8), id: \.self) { s in
                            Button(action: { toggleAssociated(s) }) {
                                Text(s.capitalized)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(associatedSymptoms.contains(s) ? Color.orange : Color(.systemGray5))
                                    .foregroundColor(associatedSymptoms.contains(s) ? .white : .primary)
                                    .cornerRadius(6)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                Section("Notes (optional)") {
                    TextField("Any additional details", text: $notes, axis: .vertical)
                        .lineLimit(3)
                }
                
                Section {
                    Button(action: save) {
                        Text("Log Symptom")
                            .frame(maxWidth: .infinity)
                            .foregroundColor(.white)
                    }
                    .listRowBackground(Color.cyan)
                    .disabled(symptom.isEmpty)
                }
            }
            .navigationTitle("Log Symptom")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
    
    private func selectSymptom(_ s: String) {
        symptom = s
    }
    
    private func toggleAssociated(_ s: String) {
        if associatedSymptoms.contains(s) {
            associatedSymptoms.remove(s)
        } else {
            associatedSymptoms.insert(s)
        }
    }
    
    private func save() {
        let entry = SymptomEntry(
            symptom: symptom,
            severity: Int(severity),
            associated: Array(associatedSymptoms),
            notes: notes.isEmpty ? nil : notes
        )
        HealthDataManager.shared.logSymptom(entry)
        dismiss()
    }
}

#Preview {
    LogSymptomView()
}
