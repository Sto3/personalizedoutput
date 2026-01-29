/**
 * LogMealView.swift
 *
 * REDI LOG MEAL VIEW
 * 
 * Quick meal logging with:
 * - Camera-based food recognition (AI)
 * - Manual entry mode
 * - Meal type selection
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct LogMealView: View {
    @Environment(\.dismiss) private var dismiss
    
    @State private var description = ""
    @State private var mealType: MealType
    @State private var calories: String = ""
    @State private var protein: String = ""
    @State private var carbs: String = ""
    @State private var fat: String = ""
    @State private var useCamera = false
    @State private var isAnalyzing = false
    
    private let service = NutritionService.shared
    
    init() {
        _mealType = State(initialValue: NutritionService.shared.inferMealType())
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("What did you eat?")) {
                    TextField("Describe your meal", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                Section(header: Text("Meal Type")) {
                    Picker("Type", selection: $mealType) {
                        ForEach(MealType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                
                Section(header: Text("Nutrition (Optional)")) {
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
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        Text("Carbs (g)")
                        Spacer()
                        TextField("0", text: $carbs)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        Text("Fat (g)")
                        Spacer()
                        TextField("0", text: $fat)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                }
                
                Section {
                    Text("Leave nutrition blank and Redi will estimate based on your description.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Log Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveMeal()
                    }
                    .disabled(description.isEmpty)
                }
            }
        }
    }
    
    private func saveMeal() {
        service.logMeal(
            description: description,
            mealType: mealType,
            calories: Int(calories),
            protein: Double(protein),
            carbs: Double(carbs),
            fat: Double(fat)
        )
        dismiss()
    }
}

#Preview {
    LogMealView()
}
