/**
 * HealthDashboardView.swift
 *
 * REDI HEALTH - Main Dashboard
 * 
 * Central hub for all health features:
 * - Today's medications
 * - Nutrition summary
 * - Recent symptoms
 * - Quick actions
 *
 * Created: Jan 26, 2026
 */

import SwiftUI

struct HealthDashboardView: View {
    @StateObject private var medicationService = MedicationService.shared
    @StateObject private var nutritionService = NutritionService.shared
    @StateObject private var symptomService = SymptomService.shared
    
    @State private var showingAddMedication = false
    @State private var showingLogMeal = false
    @State private var showingLogSymptom = false
    @State private var showingReport = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Today's Medications
                    medicationsSection
                    
                    // Nutrition Summary
                    nutritionSection
                    
                    // Recent Symptoms
                    symptomsSection
                    
                    // Quick Actions
                    quickActionsSection
                }
                .padding()
            }
            .navigationTitle("Health")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingReport = true }) {
                        Image(systemName: "doc.text")
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddMedication) {
            AddMedicationView()
        }
        .sheet(isPresented: $showingLogMeal) {
            LogMealView()
        }
        .sheet(isPresented: $showingLogSymptom) {
            LogSymptomView()
        }
        .sheet(isPresented: $showingReport) {
            HealthReportView()
        }
    }
    
    // MARK: - Medications Section
    
    private var medicationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Medications", systemImage: "pills")
                    .font(.headline)
                Spacer()
                Button(action: { showingAddMedication = true }) {
                    Image(systemName: "plus.circle")
                }
            }
            
            if medicationService.todaysSchedule.isEmpty {
                Text("No medications scheduled")
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(medicationService.todaysSchedule) { dose in
                    MedicationDoseRow(dose: dose) {
                        medicationService.logDoseTaken(medication: dose.medication)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    // MARK: - Nutrition Section
    
    private var nutritionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Today's Nutrition", systemImage: "fork.knife")
                    .font(.headline)
                Spacer()
                Button(action: { showingLogMeal = true }) {
                    Image(systemName: "plus.circle")
                }
            }
            
            HStack(spacing: 20) {
                NutritionStatView(
                    label: "Calories",
                    value: "\(nutritionService.dailyTotals.calories)",
                    goal: "\(nutritionService.dailyCalorieGoal)",
                    color: .orange
                )
                
                NutritionStatView(
                    label: "Protein",
                    value: "\(Int(nutritionService.dailyTotals.protein))g",
                    goal: "\(Int(nutritionService.dailyProteinGoal))g",
                    color: .blue
                )
                
                NutritionStatView(
                    label: "Meals",
                    value: "\(nutritionService.mealsLogged())",
                    goal: "3",
                    color: .green
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    // MARK: - Symptoms Section
    
    private var symptomsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Recent Symptoms", systemImage: "heart.text.square")
                    .font(.headline)
                Spacer()
                Button(action: { showingLogSymptom = true }) {
                    Image(systemName: "plus.circle")
                }
            }
            
            if symptomService.recentSymptoms.isEmpty {
                Text("No symptoms logged recently")
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(symptomService.recentSymptoms.prefix(3)) { entry in
                    SymptomRow(entry: entry)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    // MARK: - Quick Actions
    
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
            
            HStack(spacing: 12) {
                QuickActionButton(title: "Log Meal", icon: "camera", color: .orange) {
                    showingLogMeal = true
                }
                
                QuickActionButton(title: "Add Symptom", icon: "plus.circle", color: .red) {
                    showingLogSymptom = true
                }
                
                QuickActionButton(title: "Report", icon: "doc.text", color: .blue) {
                    showingReport = true
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

// MARK: - Supporting Views

struct MedicationDoseRow: View {
    let dose: MedicationService.ScheduledDose
    let onTaken: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(dose.medication.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(dose.medication.dosage)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(formatTime(dose.scheduledTime))
                .font(.caption)
                .foregroundColor(.secondary)
            
            statusView
        }
        .padding(.vertical, 4)
    }
    
    @ViewBuilder
    private var statusView: some View {
        switch dose.status {
        case .taken(let time):
            Label(formatTime(time), systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundColor(.green)
        case .due:
            Button(action: onTaken) {
                Text("Take")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color.cyan)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        case .missed:
            Label("Missed", systemImage: "exclamationmark.circle")
                .font(.caption)
                .foregroundColor(.red)
        case .skipped:
            Label("Skipped", systemImage: "minus.circle")
                .font(.caption)
                .foregroundColor(.orange)
        case .upcoming:
            Text("Upcoming")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct NutritionStatView: View {
    let label: String
    let value: String
    let goal: String
    let color: Color
    
    var body: some View {
        VStack {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text("of \(goal)")
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct SymptomRow: View {
    let entry: SymptomEntry
    
    var body: some View {
        HStack {
            Circle()
                .fill(severityColor)
                .frame(width: 8, height: 8)
            
            Text(entry.symptom.capitalized)
                .font(.subheadline)
            
            Spacer()
            
            Text("\(entry.severity)/10")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(formatDate(entry.timestamp))
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 2)
    }
    
    private var severityColor: Color {
        switch entry.severity {
        case 1...3: return .green
        case 4...6: return .yellow
        case 7...10: return .red
        default: return .gray
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(color.opacity(0.1))
            .cornerRadius(8)
        }
    }
}

#Preview {
    HealthDashboardView()
}
