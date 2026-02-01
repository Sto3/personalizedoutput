/**
 * RediTabView.swift
 *
 * REDI MAIN NAVIGATION
 * 
 * Tab-based navigation with:
 * - Redi (main AI assistant)
 * - Health (dashboard)
 * - Settings
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct RediTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Main Redi AI View
            V3MainView()
                .tabItem {
                    Image(systemName: "waveform.circle.fill")
                    Text("Redi")
                }
                .tag(0)
            
            // Health Dashboard
            NavigationView {
                HealthDashboardView()
            }
            .tabItem {
                Image(systemName: "heart.fill")
                Text("Health")
            }
            .tag(1)
            
            // Settings
            NavigationView {
                SettingsView()
            }
            .tabItem {
                Image(systemName: "gearshape.fill")
                Text("Settings")
            }
            .tag(2)
        }
        .accentColor(.cyan)
    }
}

// MARK: - Placeholder Views for Settings subviews

struct NotificationSettingsView: View {
    @AppStorage("medicationReminders") private var medicationReminders = true
    @AppStorage("mealReminders") private var mealReminders = false
    @AppStorage("reminderSound") private var reminderSound = "default"
    
    var body: some View {
        List {
            Section(header: Text("Reminders")) {
                Toggle("Medication Reminders", isOn: $medicationReminders)
                Toggle("Meal Logging Reminders", isOn: $mealReminders)
            }
            
            Section(header: Text("Sound")) {
                Picker("Reminder Sound", selection: $reminderSound) {
                    Text("Default").tag("default")
                    Text("Gentle").tag("gentle")
                    Text("Urgent").tag("urgent")
                    Text("Silent").tag("silent")
                }
            }
        }
        .navigationTitle("Notifications")
    }
}

struct HealthDataExportView: View {
    @State private var exportPeriod = "30"
    @State private var includeSymptoms = true
    @State private var includeMedications = true
    @State private var includeNutrition = true
    @State private var isExporting = false
    
    var body: some View {
        List {
            Section(header: Text("Export Period")) {
                Picker("Period", selection: $exportPeriod) {
                    Text("Last 7 Days").tag("7")
                    Text("Last 30 Days").tag("30")
                    Text("Last 90 Days").tag("90")
                    Text("All Time").tag("all")
                }
            }
            
            Section(header: Text("Include Data")) {
                Toggle("Medications & Adherence", isOn: $includeMedications)
                Toggle("Symptoms", isOn: $includeSymptoms)
                Toggle("Nutrition", isOn: $includeNutrition)
            }
            
            Section {
                Button(action: exportData) {
                    HStack {
                        Spacer()
                        if isExporting {
                            ProgressView()
                                .padding(.trailing, 8)
                        }
                        Text(isExporting ? "Exporting..." : "Export as PDF")
                            .fontWeight(.semibold)
                        Spacer()
                    }
                }
                .disabled(isExporting)
            }
        }
        .navigationTitle("Export Data")
    }
    
    private func exportData() {
        isExporting = true
        // TODO: Implement actual export
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isExporting = false
        }
    }
}

#Preview {
    RediTabView()
}
