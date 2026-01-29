/**
 * LogMealView.swift
 *
 * REDI HEALTH - Log Meal
 * 
 * Options:
 * - Camera analysis (AI-powered)
 * - Quick log (manual entry)
 *
 * Created: Jan 26, 2026
 */

import SwiftUI

struct LogMealView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var nutritionService = NutritionService.shared
    
    @State private var selectedTab = 0
    @State private var mealType: MealLog.MealType
    
    // Quick log
    @State private var description = ""
    @State private var calories = ""
    
    init() {
        _mealType = State(initialValue: NutritionService.shared.inferMealType())
    }
    
    var body: some View {
        NavigationView {
            VStack {
                Picker("Method", selection: $selectedTab) {
                    Text("Camera").tag(0)
                    Text("Quick Log").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()
                
                if selectedTab == 0 {
                    cameraView
                } else {
                    quickLogView
                }
            }
            .navigationTitle("Log Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
    
    // MARK: - Camera View
    
    private var cameraView: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: "camera.viewfinder")
                .font(.system(size: 80))
                .foregroundColor(.cyan)
            
            Text("Point camera at your food")
                .font(.headline)
            
            Text("Redi will analyze and estimate nutrition")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            mealTypePicker
            
            Button(action: analyzeWithCamera) {
                Label("Take Photo", systemImage: "camera.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.cyan)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
    }
    
    // MARK: - Quick Log View
    
    private var quickLogView: some View {
        Form {
            Section("Meal Details") {
                TextField("What did you eat?", text: $description)
                TextField("Estimated calories", text: $calories)
                    .keyboardType(.numberPad)
            }
            
            Section {
                mealTypePicker
            }
            
            Section {
                Button(action: quickLog) {
                    Text("Log Meal")
                        .frame(maxWidth: .infinity)
                        .foregroundColor(.white)
                }
                .listRowBackground(Color.cyan)
                .disabled(description.isEmpty || calories.isEmpty)
            }
        }
    }
    
    private var mealTypePicker: some View {
        Picker("Meal Type", selection: $mealType) {
            ForEach(MealLog.MealType.allCases, id: \.self) { type in
                Text(type.displayName).tag(type)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
    }
    
    // MARK: - Actions
    
    private func analyzeWithCamera() {
        // In production, this would:
        // 1. Open camera
        // 2. Capture image
        // 3. Send to NutritionService.analyzeImage()
        // 4. Show results for confirmation
        // 5. Log meal
        
        // For now, show placeholder
        dismiss()
    }
    
    private func quickLog() {
        guard let cal = Int(calories) else { return }
        nutritionService.quickLog(description: description, calories: cal, type: mealType)
        dismiss()
    }
}

#Preview {
    LogMealView()
}
