/**
 * AddMedicationView.swift
 *
 * REDI ADD MEDICATION VIEW
 * 
 * Form for adding new medications with:
 * - Name and dosage
 * - Instructions
 * - Multiple schedule times
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct AddMedicationView: View {
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var dosage = ""
    @State private var instructions = ""
    @State private var scheduleTimes: [Date] = [Date()]
    
    private let service = MedicationService.shared
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Medication Details")) {
                    TextField("Name", text: $name)
                    TextField("Dosage (e.g., 10mg)", text: $dosage)
                    TextField("Instructions (optional)", text: $instructions)
                }
                
                Section(header: Text("Schedule")) {
                    ForEach(scheduleTimes.indices, id: \.self) { index in
                        DatePicker(
                            "Time \(index + 1)",
                            selection: $scheduleTimes[index],
                            displayedComponents: .hourAndMinute
                        )
                    }
                    
                    Button(action: addTime) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add Another Time")
                        }
                    }
                    
                    if scheduleTimes.count > 1 {
                        Button(role: .destructive, action: removeLastTime) {
                            HStack {
                                Image(systemName: "minus.circle.fill")
                                Text("Remove Last Time")
                            }
                        }
                    }
                }
                
                Section {
                    Text("You'll receive a reminder at each scheduled time.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Add Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveMedication()
                    }
                    .disabled(name.isEmpty || dosage.isEmpty)
                }
            }
        }
    }
    
    private func addTime() {
        scheduleTimes.append(Date())
    }
    
    private func removeLastTime() {
        if scheduleTimes.count > 1 {
            scheduleTimes.removeLast()
        }
    }
    
    private func saveMedication() {
        service.addMedication(
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
