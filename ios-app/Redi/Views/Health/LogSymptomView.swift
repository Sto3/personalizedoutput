/**
 * LogSymptomView.swift
 *
 * REDI LOG SYMPTOM VIEW
 * 
 * Quick symptom logging with:
 * - Common symptom picker
 * - Severity slider (1-10)
 * - Optional notes
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct LogSymptomView: View {
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedSymptom = ""
    @State private var customSymptom = ""
    @State private var severity: Double = 5
    @State private var notes = ""
    
    private let service = SymptomService.shared
    
    private let commonSymptoms = [
        "Headache", "Fatigue", "Nausea", "Dizziness",
        "Stomach Ache", "Back Pain", "Anxiety", "Insomnia",
        "Congestion", "Cough", "Sore Throat", "Fever"
    ]
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Symptom")) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(commonSymptoms, id: \.self) { symptom in
                                Button(action: {
                                    selectedSymptom = symptom
                                    customSymptom = ""
                                }) {
                                    Text(symptom)
                                        .font(.subheadline)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(selectedSymptom == symptom ? Color.blue : Color(.systemGray5))
                                        .foregroundColor(selectedSymptom == symptom ? .white : .primary)
                                        .cornerRadius(20)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    
                    TextField("Or type a symptom", text: $customSymptom)
                        .onChange(of: customSymptom) { newValue in
                            if !newValue.isEmpty {
                                selectedSymptom = ""
                            }
                        }
                }
                
                Section(header: Text("Severity")) {
                    VStack(spacing: 16) {
                        HStack {
                            Text("Mild")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("Severe")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Slider(value: $severity, in: 1...10, step: 1)
                                .tint(severityColor)
                            
                            Text("\(Int(severity))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(severityColor)
                                .frame(width: 40)
                        }
                    }
                }
                
                Section(header: Text("Notes (Optional)")) {
                    TextField("Any additional details", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("Log Symptom")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveSymptom()
                    }
                    .disabled(symptomName.isEmpty)
                }
            }
        }
    }
    
    private var symptomName: String {
        if !customSymptom.isEmpty {
            return customSymptom
        }
        return selectedSymptom
    }
    
    private var severityColor: Color {
        switch Int(severity) {
        case 1...3: return .green
        case 4...6: return .orange
        default: return .red
        }
    }
    
    private func saveSymptom() {
        service.logSymptom(
            name: symptomName,
            severity: Int(severity),
            notes: notes.isEmpty ? nil : notes
        )
        dismiss()
    }
}

#Preview {
    LogSymptomView()
}
