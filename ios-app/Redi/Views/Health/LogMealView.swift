/**
 * LogMealView.swift
 *
 * REDI LOG MEAL VIEW
 * 
 * Log meals with:
 * - Camera analysis or manual entry
 * - Meal type selection
 * - Nutrition info
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct LogMealView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var nutritionService = NutritionService.shared
    
    @State private var description = ""
    @State private var selectedMealType: MealType
    @State private var calories = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var showCamera = false
    @State private var isAnalyzing = false
    
    init() {
        _selectedMealType = State(initialValue: NutritionService.shared.inferMealType())
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("What did you eat?")) {
                    TextField("Describe your meal", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                    
                    Picker("Meal Type", selection: $selectedMealType) {
                        ForEach(MealType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                }
                
                Section(header: Text("Quick Entry")) {
                    Button(action: { showCamera = true }) {
                        HStack {
                            Image(systemName: "camera.fill")
                            Text("Analyze with Camera")
                        }
                    }
                    .disabled(isAnalyzing)
                    
                    if isAnalyzing {
                        HStack {
                            ProgressView()
                            Text("Analyzing...")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section(header: Text("Nutrition (optional)")) {
                    HStack {
                        Text("Calories")
                        Spacer()
                        TextField("0", text: $calories)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        Text("Protein (g)")
                        Spacer()
                        TextField("0", text: $protein)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        Text("Carbs (g)")
                        Spacer()
                        TextField("0", text: $carbs)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        Text("Fat (g)")
                        Spacer()
                        TextField("0", text: $fat)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                }
                
                Section {
                    Text("Tip: Just describe what you ate and Redi can help estimate nutrition during your conversation.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Log Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveMeal()
                    }
                    .disabled(description.isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private func saveMeal() {
        nutritionService.logMeal(
            description: description,
            mealType: selectedMealType,
            calories: Int(calories),
            protein: Int(protein),
            carbs: Int(carbs),
            fat: Int(fat)
        )
        dismiss()
    }
}

#Preview {
    LogMealView()
}
