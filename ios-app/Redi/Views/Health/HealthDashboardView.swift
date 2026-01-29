/**
 * HealthDashboardView.swift
 *
 * REDI HEALTH DASHBOARD
 * 
 * Central hub for all health features:
 * - Today's medications with status
 * - Nutrition summary
 * - Recent symptoms
 * - Quick action buttons
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct HealthDashboardView: View {
    @ObservedObject private var medicationService = MedicationService.shared
    @ObservedObject private var nutritionService = NutritionService.shared
    @ObservedObject private var symptomService = SymptomService.shared
    
    @State private var showAddMedication = false
    @State private var showLogMeal = false
    @State private var showLogSymptom = false
    @State private var showHealthReport = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection
                
                // Quick Actions
                quickActionsSection
                
                // Today's Medications
                medicationsSection
                
                // Nutrition Summary
                nutritionSection
                
                // Recent Symptoms
                symptomsSection
                
                Spacer(minLength: 100)
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Health")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showHealthReport = true }) {
                    Image(systemName: "doc.text")
                }
            }
        }
        .sheet(isPresented: $showAddMedication) {
            AddMedicationView()
        }
        .sheet(isPresented: $showLogMeal) {
            LogMealView()
        }
        .sheet(isPresented: $showLogSymptom) {
            LogSymptomView()
        }
        .sheet(isPresented: $showHealthReport) {
            HealthReportView()
        }
        .onAppear {
            refreshData()
        }
    }
    
    // MARK: - Header
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Good \(timeOfDay)!")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(dateString)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var timeOfDay: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Morning"
        case 12..<17: return "Afternoon"
        case 17..<21: return "Evening"
        default: return "Night"
        }
    }
    
    private var dateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }
    
    // MARK: - Quick Actions
    
    private var quickActionsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                QuickActionButton(
                    title: "Log Meal",
                    icon: "fork.knife",
                    color: .green
                ) {
                    showLogMeal = true
                }
                
                QuickActionButton(
                    title: "Log Symptom",
                    icon: "heart.text.square",
                    color: .orange
                ) {
                    showLogSymptom = true
                }
                
                QuickActionButton(
                    title: "Add Medication",
                    icon: "pills",
                    color: .blue
                ) {
                    showAddMedication = true
                }
                
                QuickActionButton(
                    title: "Generate Report",
                    icon: "doc.text",
                    color: .purple
                ) {
                    showHealthReport = true
                }
            }
            .padding(.horizontal, 4)
        }
    }
    
    // MARK: - Medications Section
    
    private var medicationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's Medications")
                    .font(.headline)
                Spacer()
                if !medicationService.medications.isEmpty {
                    Text("\(Int(medicationService.calculateAdherence(days: 7) * 100))% this week")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if medicationService.medications.isEmpty {
                EmptyStateCard(
                    icon: "pills",
                    message: "No medications added yet",
                    action: "Add Medication"
                ) {
                    showAddMedication = true
                }
            } else {
                ForEach(medicationService.medications.filter { $0.isActive }) { medication in
                    MedicationCard(medication: medication)
                }
            }
        }
    }
    
    // MARK: - Nutrition Section
    
    private var nutritionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's Nutrition")
                    .font(.headline)
                Spacer()
                Text("\(nutritionService.getCaloriesRemaining()) cal remaining")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            VStack(spacing: 16) {
                // Calorie progress
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("\(nutritionService.dailyCalories)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("/ \(nutritionService.calorieGoal) cal")
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    
                    ProgressView(value: nutritionService.getProgressPercentage())
                        .tint(.green)
                }
                
                // Macros
                HStack(spacing: 20) {
                    MacroView(name: "Protein", value: Int(nutritionService.dailyProtein), unit: "g", color: .red)
                    MacroView(name: "Carbs", value: Int(nutritionService.dailyCarbs), unit: "g", color: .orange)
                    MacroView(name: "Fat", value: Int(nutritionService.dailyFat), unit: "g", color: .yellow)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Symptoms Section
    
    private var symptomsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Symptoms")
                .font(.headline)
            
            if symptomService.recentSymptoms.isEmpty {
                EmptyStateCard(
                    icon: "heart.text.square",
                    message: "No symptoms logged recently",
                    action: "Log Symptom"
                ) {
                    showLogSymptom = true
                }
            } else {
                ForEach(symptomService.recentSymptoms.prefix(3)) { symptom in
                    SymptomRow(symptom: symptom)
                }
            }
        }
    }
    
    // MARK: - Helpers
    
    private func refreshData() {
        medicationService.loadMedications()
        medicationService.loadTodaysDoses()
        nutritionService.loadTodaysMeals()
        symptomService.loadRecentSymptoms()
    }
}

// MARK: - Supporting Views

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(width: 90, height: 80)
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
}

struct EmptyStateCard: View {
    let icon: String
    let message: String
    let action: String
    let onTap: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundColor(.gray)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Button(action, action: onTap)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct MedicationCard: View {
    let medication: Medication
    @ObservedObject private var service = MedicationService.shared
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(medication.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(medication.dosage)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            ForEach(medication.schedule.filter { $0.enabled }) { time in
                let taken = service.isDoseTakenToday(medicationId: medication.id, scheduleTime: time)
                Button(action: {
                    if !taken {
                        service.logDose(medicationId: medication.id, taken: true)
                    }
                }) {
                    VStack(spacing: 2) {
                        Image(systemName: taken ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(taken ? .green : .gray)
                        Text(time.timeString)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .disabled(taken)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct MacroView: View {
    let name: String
    let value: Int
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)\(unit)")
                .font(.subheadline)
                .fontWeight(.semibold)
            Text(name)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct SymptomRow: View {
    let symptom: SymptomEntry
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(symptom.symptom)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(timeAgo)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            HStack(spacing: 4) {
                Text("\(symptom.severity)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(severityColor)
                Text("/10")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
    
    private var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: symptom.timestamp, relativeTo: Date())
    }
    
    private var severityColor: Color {
        switch symptom.severity {
        case 1...3: return .green
        case 4...6: return .orange
        default: return .red
        }
    }
}

#Preview {
    NavigationView {
        HealthDashboardView()
    }
}
