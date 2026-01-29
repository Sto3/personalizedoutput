/**
 * AddMedicationView.swift
 *
 * REDI ADD MEDICATION VIEW
 * 
 * Form to add new medications with:
 * - Name and dosage
 * - Schedule times
 * - Instructions
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct AddMedicationView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var medicationService = MedicationService.shared
    
    @State private var name = ""
    @State private var dosage = ""
    @State private var instructions = ""
    @State private var scheduleTimes: [Date] = [Date()]
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Medication Details")) {
                    TextField("Medication Name", text: $name)
                    TextField("Dosage (e.g., 10mg)", text: $dosage)
                    TextField("Instructions (optional)", text: $instructions)
                }
                
                Section(header: Text("Schedule")) {
                    ForEach(scheduleTimes.indices, id: \.self) { index in
                        HStack {
                            DatePicker(
                                "Time \(index + 1)",
                                selection: $scheduleTimes[index],
                                displayedComponents: .hourAndMinute
                            )
                            
                            if scheduleTimes.count > 1 {
                                Button(action: {
                                    scheduleTimes.remove(at: index)
                                }) {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundColor(.red)
                                }
                            }
                        }
                    }
                    
                    Button(action: {
                        scheduleTimes.append(Date())
                    }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add Another Time")
                        }
                    }
                }
                
                Section {
                    Text("You'll receive reminders at each scheduled time.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Add Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveMedication()
                    }
                    .disabled(name.isEmpty || dosage.isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private func saveMedication() {
        medicationService.addMedication(
            name: name,
            dosage: dosage,
            instructions: instructions.isEmpty ? nil : instructions,
            scheduleTimes: scheduleTimes
        )
        dismiss()
    }
}

#Preview {
    AddMedicationView()
}
