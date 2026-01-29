/**
 * AddMedicationView.swift
 *
 * REDI HEALTH - Add New Medication
 *
 * Created: Jan 26, 2026
 */

import SwiftUI

struct AddMedicationView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var medicationService = MedicationService.shared
    
    @State private var name = ""
    @State private var dosage = ""
    @State private var instructions = ""
    @State private var times: [ScheduleTime] = []
    @State private var showingAddTime = false
    
    var body: some View {
        NavigationView {
            Form {
                Section("Medication Details") {
                    TextField("Name (e.g., Metformin)", text: $name)
                    TextField("Dosage (e.g., 500mg)", text: $dosage)
                    TextField("Instructions (optional)", text: $instructions)
                }
                
                Section("Schedule") {
                    ForEach(times.indices, id: \.self) { index in
                        HStack {
                            Text(times[index].displayTime)
                            Spacer()
                            Button(action: { times.remove(at: index) }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    Button(action: { showingAddTime = true }) {
                        Label("Add Time", systemImage: "plus.circle")
                    }
                }
                
                Section {
                    Button(action: save) {
                        Text("Add Medication")
                            .frame(maxWidth: .infinity)
                            .foregroundColor(.white)
                    }
                    .listRowBackground(Color.cyan)
                    .disabled(name.isEmpty || dosage.isEmpty || times.isEmpty)
                }
            }
            .navigationTitle("Add Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showingAddTime) {
                TimePickerSheet { time in
                    times.append(time)
                }
            }
        }
    }
    
    private func save() {
        medicationService.addMedication(
            name: name,
            dosage: dosage,
            times: times,
            instructions: instructions.isEmpty ? nil : instructions
        )
        dismiss()
    }
}

struct TimePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTime = Date()
    let onSave: (ScheduleTime) -> Void
    
    var body: some View {
        NavigationView {
            VStack {
                DatePicker("", selection: $selectedTime, displayedComponents: .hourAndMinute)
                    .datePickerStyle(.wheel)
                    .labelsHidden()
                
                Spacer()
            }
            .navigationTitle("Select Time")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let calendar = Calendar.current
                        let time = ScheduleTime(
                            hour: calendar.component(.hour, from: selectedTime),
                            minute: calendar.component(.minute, from: selectedTime),
                            daysOfWeek: [] // Every day
                        )
                        onSave(time)
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    AddMedicationView()
}
