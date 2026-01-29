/**
 * NutritionService.swift
 *
 * REDI NUTRITION TRACKING SERVICE
 * 
 * Manages:
 * - Meal logging with AI food recognition
 * - Calorie and macro tracking
 * - Daily/weekly nutrition goals
 * - Voice query handling
 *
 * Created: Jan 29, 2026
 */

import Foundation
import UIKit

class NutritionService: ObservableObject {
    static let shared = NutritionService()
    
    @Published var todaysMeals: [MealLog] = []
    @Published var dailyCalories: Int = 0
    @Published var dailyProtein: Double = 0
    @Published var dailyCarbs: Double = 0
    @Published var dailyFat: Double = 0
    
    // Goals (customizable)
    var calorieGoal: Int = 2000
    var proteinGoal: Double = 50
    var carbGoal: Double = 250
    var fatGoal: Double = 65
    
    private let dataManager = HealthDataManager.shared
    
    private init() {
        loadTodaysMeals()
    }
    
    // MARK: - Data Loading
    
    func loadTodaysMeals() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        
        todaysMeals = dataManager.getMealLogs(from: today, to: tomorrow)
        calculateDailyTotals()
    }
    
    private func calculateDailyTotals() {
        dailyCalories = 0
        dailyProtein = 0
        dailyCarbs = 0
        dailyFat = 0
        
        for meal in todaysMeals {
            if let calories = meal.totalCalories {
                dailyCalories += calories
            }
            for food in meal.foods {
                if let protein = food.protein { dailyProtein += protein }
                if let carbs = food.carbs { dailyCarbs += carbs }
                if let fat = food.fat { dailyFat += fat }
            }
        }
    }
    
    // MARK: - Meal Logging
    
    func logMeal(description: String, mealType: MealType, calories: Int?, protein: Double?, carbs: Double?, fat: Double?, imageData: Data? = nil) {
        let food = FoodItem(
            id: UUID().uuidString,
            name: description,
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat,
            servingSize: nil
        )
        
        let meal = MealLog(
            id: UUID().uuidString,
            timestamp: Date(),
            mealType: mealType,
            foods: [food],
            totalCalories: calories,
            notes: nil,
            imageData: imageData
        )
        
        dataManager.saveMealLog(meal)
        loadTodaysMeals()
    }
    
    func logMealWithFoods(mealType: MealType, foods: [FoodItem], notes: String? = nil) {
        let totalCalories = foods.compactMap { $0.calories }.reduce(0, +)
        
        let meal = MealLog(
            id: UUID().uuidString,
            timestamp: Date(),
            mealType: mealType,
            foods: foods,
            totalCalories: totalCalories > 0 ? totalCalories : nil,
            notes: notes,
            imageData: nil
        )
        
        dataManager.saveMealLog(meal)
        loadTodaysMeals()
    }
    
    // MARK: - AI Food Analysis (placeholder for OpenAI Vision)
    
    func analyzeImage(_ image: UIImage, completion: @escaping (Result<[FoodItem], Error>) -> Void) {
        // TODO: Integrate with OpenAI Vision API
        // For now, return placeholder
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let placeholder = FoodItem(
                id: UUID().uuidString,
                name: "Analyzed meal",
                calories: 450,
                protein: 25,
                carbs: 45,
                fat: 18,
                servingSize: "1 serving"
            )
            completion(.success([placeholder]))
        }
    }
    
    // MARK: - Meal Type Inference
    
    func inferMealType() -> MealType {
        let hour = Calendar.current.component(.hour, from: Date())
        
        switch hour {
        case 5..<11:
            return .breakfast
        case 11..<15:
            return .lunch
        case 15..<18:
            return .snack
        case 18..<22:
            return .dinner
        default:
            return .snack
        }
    }
    
    // MARK: - Statistics
    
    func getWeeklyAverage() -> (calories: Int, protein: Double, carbs: Double, fat: Double) {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: today) else {
            return (0, 0, 0, 0)
        }
        
        let meals = dataManager.getMealLogs(from: weekAgo, to: Date())
        
        var totalCalories = 0
        var totalProtein: Double = 0
        var totalCarbs: Double = 0
        var totalFat: Double = 0
        
        for meal in meals {
            if let cal = meal.totalCalories { totalCalories += cal }
            for food in meal.foods {
                if let p = food.protein { totalProtein += p }
                if let c = food.carbs { totalCarbs += c }
                if let f = food.fat { totalFat += f }
            }
        }
        
        return (
            calories: totalCalories / 7,
            protein: totalProtein / 7,
            carbs: totalCarbs / 7,
            fat: totalFat / 7
        )
    }
    
    func getCaloriesRemaining() -> Int {
        return max(0, calorieGoal - dailyCalories)
    }
    
    func getProgressPercentage() -> Double {
        guard calorieGoal > 0 else { return 0 }
        return min(1.0, Double(dailyCalories) / Double(calorieGoal))
    }
    
    // MARK: - Voice Query Handling
    
    func handleQuery(_ query: String) -> String {
        let lowercased = query.lowercased()
        
        // "How many calories have I eaten?"
        if lowercased.contains("how many calorie") || lowercased.contains("calorie count") {
            return describeCalorieStatus()
        }
        
        // "What have I eaten today?"
        if lowercased.contains("what have i eaten") || lowercased.contains("what did i eat") {
            return describeTodaysMeals()
        }
        
        // "How much protein?"
        if lowercased.contains("protein") {
            return describeProteinStatus()
        }
        
        // "What should I eat?"
        if lowercased.contains("should i eat") || lowercased.contains("can i eat") {
            return suggestMeal()
        }
        
        // "Log my meal" / "I ate..."
        if lowercased.contains("log") || lowercased.contains("i ate") || lowercased.contains("i had") {
            return "I can help you log that meal. What did you eat? You can describe it or take a photo."
        }
        
        // Default
        return "I can help you track your nutrition. Ask me how many calories you've eaten, what you've had today, or tell me to log a meal."
    }
    
    private func describeCalorieStatus() -> String {
        loadTodaysMeals()
        
        let remaining = getCaloriesRemaining()
        let percentage = Int(getProgressPercentage() * 100)
        
        if dailyCalories == 0 {
            return "You haven't logged any meals today. Your goal is \(calorieGoal) calories."
        }
        
        var response = "You've eaten \(dailyCalories) calories today, which is \(percentage)% of your \(calorieGoal) calorie goal."
        
        if remaining > 0 {
            response += " You have \(remaining) calories remaining."
        } else {
            response += " You've reached your calorie goal for today."
        }
        
        return response
    }
    
    private func describeTodaysMeals() -> String {
        loadTodaysMeals()
        
        if todaysMeals.isEmpty {
            return "You haven't logged any meals today yet."
        }
        
        var meals: [String] = []
        for meal in todaysMeals {
            let foodNames = meal.foods.map { $0.name }.joined(separator: ", ")
            let calories = meal.totalCalories.map { "\($0) cal" } ?? "unknown calories"
            meals.append("\(meal.mealType.rawValue): \(foodNames) (\(calories))")
        }
        
        return "Today you've had: \(meals.joined(separator: "; ")). Total: \(dailyCalories) calories."
    }
    
    private func describeProteinStatus() -> String {
        loadTodaysMeals()
        
        let percentage = proteinGoal > 0 ? Int((dailyProtein / proteinGoal) * 100) : 0
        
        return "You've had \(Int(dailyProtein))g of protein today, which is \(percentage)% of your \(Int(proteinGoal))g goal."
    }
    
    private func suggestMeal() -> String {
        loadTodaysMeals()
        
        let remaining = getCaloriesRemaining()
        let proteinRemaining = max(0, proteinGoal - dailyProtein)
        
        if remaining < 200 {
            return "You're close to your calorie goal. If you're still hungry, consider a light snack like vegetables or a small piece of fruit."
        }
        
        if proteinRemaining > 20 {
            return "You have \(remaining) calories remaining and could use more protein. Consider lean protein like chicken, fish, eggs, or Greek yogurt."
        }
        
        let mealType = inferMealType()
        return "You have \(remaining) calories remaining. A balanced \(mealType.rawValue) would fit well here."
    }
}
