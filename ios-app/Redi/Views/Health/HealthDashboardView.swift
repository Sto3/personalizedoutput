/**
 * HealthDashboardView.swift
 *
 * REDI HEALTH DASHBOARD
 * 
 * Central hub for health tracking:
 * - Today's medications
 * - Nutrition summary
 * - Recent symptoms
 * - Quick actions
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct HealthDashboardView: View {
    @StateObject private var medicationService = MedicationService.shared
    @StateObject private var nutritionService = NutritionService.shared
    @StateObject private var symptomService = SymptomService.shared
    
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
            medicationService.loadTodaysDoses()
            nutritionService.loadTodaysMeals()
            symptomService.loadRecentSymptoms()
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today, \(formattedDate)")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(greetingMessage)
                .font(.title2)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }
    
    private var greetingMessage: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 {
            return "Good morning!"
        } else if hour < 17 {
            return "Good afternoon!"
        } else {
            return "Good evening!"
        }
    }
    
    // MARK: - Quick Actions
    
    private var quickActionsSection: some View {
        HStack(spacing: 12) {
            QuickActionButton(
                title: "Log Meal",
                icon: "fork.knife",
                color: .orange
            ) {
                showLogMeal = true
            }
            
            QuickActionButton(
                title: "Log Symptom",
                icon: "heart.text.square",
                color: .red
            ) {
                showLogSymptom = true
            }
            
            QuickActionButton(
                title: "Add Med",
                icon: "pills",
                color: .blue
            ) {
                showAddMedication = true
            }
        }
    }
    
    // MARK: - Medications Section
    
    private var medicationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Medications")
                    .font(.headline)
                Spacer()
                if !medicationService.medications.isEmpty {
                    Text("\(Int(medicationService.calculateAdherence() * 100))% adherence")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if medicationService.medications.isEmpty {
                EmptyStateCard(
                    icon: "pills",
                    title: "No medications",
                    subtitle: "Add your medications to track adherence",
                    action: { showAddMedication = true }
                )
            } else {
                ForEach(medicationService.medications.filter { $0.isActive }) { medication in
                    MedicationCard(
                        medication: medication,
                        isTaken: medicationService.todaysDoses.contains { $0.medicationId == medication.id && $0.taken }
                    ) {
                        medicationService.logDose(medicationId: medication.id, taken: true)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    // MARK: - Nutrition Section
    
    private var nutritionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Nutrition")
                    .font(.headline)
                Spacer()
                Button("Log Meal") {
                    showLogMeal = true
                }
                .font(.caption)
            }
            
            HStack(spacing: 16) {
                NutritionRing(
                    value: nutritionService.dailyCalories,
                    goal: nutritionService.calorieGoal,
                    label: "Calories",
                    color: .orange
                )
                
                NutritionRing(
                    value: nutritionService.dailyProtein,
                    goal: nutritionService.proteinGoal,
                    label: "Protein",
                    color: .blue
                )
                
                VStack(alignment: .leading, spacing: 8) {
                    NutritionStat(label: "Carbs", value: "\(nutritionService.dailyCarbs)g")
                    NutritionStat(label: "Fat", value: "\(nutritionService.dailyFat)g")
                    NutritionStat(label: "Meals", value: "\(nutritionService.todaysMeals.count)")
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    // MARK: - Symptoms Section
    
    private var symptomsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Symptoms")
                    .font(.headline)
                Spacer()
                Button("Log") {
                    showLogSymptom = true
                }
                .font(.caption)
            }
            
            if symptomService.recentSymptoms.isEmpty {
                Text("No symptoms logged this week")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(symptomService.recentSymptoms.prefix(3)) { symptom in
                    SymptomRow(symptom: symptom)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
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
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
}

struct EmptyStateCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
    }
}

struct MedicationCard: View {
    let medication: Medication
    let isTaken: Bool
    let onTake: () -> Void
    
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
            
            if isTaken {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title2)
            } else {
                Button(action: onTake) {
                    Text("Take")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(20)
                }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct NutritionRing: View {
    let value: Int
    let goal: Int
    let label: String
    let color: Color
    
    var progress: Double {
        guard goal > 0 else { return 0 }
        return min(Double(value) / Double(goal), 1.0)
    }
    
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(value)")
                    .font(.caption)
                    .fontWeight(.bold)
            }
            .frame(width: 60, height: 60)
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

struct NutritionStat: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

struct SymptomRow: View {
    let symptom: SymptomEntry
    
    var body: some View {
        HStack {
            Circle()
                .fill(severityColor)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(symptom.symptomName)
                    .font(.subheadline)
                Text(formattedDate)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("\(symptom.severity)/10")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
    
    private var severityColor: Color {
        if symptom.severity >= 7 {
            return .red
        } else if symptom.severity >= 4 {
            return .orange
        } else {
            return .green
        }
    }
    
    private var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: symptom.timestamp, relativeTo: Date())
    }
}

#Preview {
    NavigationView {
        HealthDashboardView()
    }
}
