/**
 * NutritionService.swift
 *
 * REDI NUTRITION TRACKING SERVICE
 * 
 * Manages:
 * - Meal logging with AI food recognition
 * - Calorie and macro tracking
 * - Daily/weekly nutrition summaries
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
    @Published var dailyProtein: Int = 0
    @Published var dailyCarbs: Int = 0
    @Published var dailyFat: Int = 0
    
    // Goals
    @Published var calorieGoal: Int = 2000
    @Published var proteinGoal: Int = 150
    
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
        dailyCalories = todaysMeals.reduce(0) { $0 + ($1.totalCalories ?? 0) }
        dailyProtein = todaysMeals.reduce(0) { $0 + ($1.totalProtein ?? 0) }
        dailyCarbs = todaysMeals.reduce(0) { $0 + ($1.totalCarbs ?? 0) }
        dailyFat = todaysMeals.reduce(0) { $0 + ($1.totalFat ?? 0) }
    }
    
    // MARK: - Meal Logging
    
    func logMeal(description: String, mealType: MealType, calories: Int?, protein: Int?, carbs: Int?, fat: Int?, imageData: Data? = nil) {
        let foodItem = FoodItem(
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
            foods: [foodItem],
            notes: nil,
            imageData: imageData
        )
        
        dataManager.saveMealLog(meal)
        loadTodaysMeals()
    }
    
    func logMealWithFoods(mealType: MealType, foods: [FoodItem], notes: String? = nil, imageData: Data? = nil) {
        let meal = MealLog(
            id: UUID().uuidString,
            timestamp: Date(),
            mealType: mealType,
            foods: foods,
            notes: notes,
            imageData: imageData
        )
        
        dataManager.saveMealLog(meal)
        loadTodaysMeals()
    }
    
    func deleteMeal(_ meal: MealLog) {
        dataManager.deleteMealLog(meal.id)
        loadTodaysMeals()
    }
    
    // MARK: - AI Food Analysis
    
    func analyzeImage(_ image: UIImage, completion: @escaping ([FoodItem]) -> Void) {
        // TODO: Connect to OpenAI Vision API
        // For now, return placeholder
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let placeholder = FoodItem(
                id: UUID().uuidString,
                name: "Analyzed food",
                calories: 350,
                protein: 25,
                carbs: 30,
                fat: 12,
                servingSize: "1 serving"
            )
            completion([placeholder])
        }
    }
    
    // MARK: - Meal Type Inference
    
    func inferMealType() -> MealType {
        let hour = Calendar.current.component(.hour, from: Date())
        
        switch hour {
        case 5..<11:
            return .breakfast
        case 11..<14:
            return .lunch
        case 14..<17:
            return .snack
        case 17..<21:
            return .dinner
        default:
            return .snack
        }
    }
    
    // MARK: - Statistics
    
    func getWeeklyStats() -> (avgCalories: Int, avgProtein: Int, totalMeals: Int) {
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -7, to: endDate) else {
            return (0, 0, 0)
        }
        
        let meals = dataManager.getMealLogs(from: startDate, to: endDate)
        
        let totalCalories = meals.reduce(0) { $0 + ($1.totalCalories ?? 0) }
        let totalProtein = meals.reduce(0) { $0 + ($1.totalProtein ?? 0) }
        
        return (
            avgCalories: meals.isEmpty ? 0 : totalCalories / 7,
            avgProtein: meals.isEmpty ? 0 : totalProtein / 7,
            totalMeals: meals.count
        )
    }
    
    func getCaloriesRemaining() -> Int {
        return max(0, calorieGoal - dailyCalories)
    }
    
    func getProteinRemaining() -> Int {
        return max(0, proteinGoal - dailyProtein)
    }
    
    // MARK: - Voice Query Handling
    
    func handleQuery(_ query: String) -> String {
        let lowercased = query.lowercased()
        
        // "How many calories have I eaten today?"
        if lowercased.contains("calorie") && (lowercased.contains("today") || lowercased.contains("eaten") || lowercased.contains("had")) {
            return describeCalorieProgress()
        }
        
        // "What did I eat today?"
        if lowercased.contains("what") && lowercased.contains("eat") {
            return describeTodaysMeals()
        }
        
        // "How much protein?"
        if lowercased.contains("protein") {
            return describeProteinProgress()
        }
        
        // "Am I on track?"
        if lowercased.contains("track") || lowercased.contains("doing") {
            return describeOverallProgress()
        }
        
        // "What should I eat?"
        if lowercased.contains("should") && lowercased.contains("eat") {
            return suggestNextMeal()
        }
        
        // Default
        return "I can help you track your nutrition. Ask me how many calories you've eaten, what you ate today, or if you're on track with your goals."
    }
    
    private func describeCalorieProgress() -> String {
        loadTodaysMeals()
        
        let remaining = getCaloriesRemaining()
        let progress = Double(dailyCalories) / Double(calorieGoal) * 100
        
        if dailyCalories == 0 {
            return "You haven't logged any meals today yet. Your goal is \(calorieGoal) calories."
        }
        
        var response = "You've had \(dailyCalories) calories today, which is \(Int(progress))% of your \(calorieGoal) calorie goal."
        
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
            return "You haven't logged any meals today. Would you like to log something?"
        }
        
        var mealDescriptions: [String] = []
        
        for meal in todaysMeals {
            let foods = meal.foods.map { $0.name }.joined(separator: ", ")
            mealDescriptions.append("\(meal.mealType.rawValue): \(foods)")
        }
        
        return "Today you've had: \(mealDescriptions.joined(separator: "; "))."
    }
    
    private func describeProteinProgress() -> String {
        loadTodaysMeals()
        
        let remaining = getProteinRemaining()
        
        if dailyProtein == 0 {
            return "You haven't logged any protein today. Your goal is \(proteinGoal) grams."
        }
        
        var response = "You've had \(dailyProtein) grams of protein today out of your \(proteinGoal) gram goal."
        
        if remaining > 0 {
            response += " You need \(remaining) more grams."
        } else {
            response += " Great job hitting your protein goal!"
        }
        
        return response
    }
    
    private func describeOverallProgress() -> String {
        loadTodaysMeals()
        
        let calorieProgress = Double(dailyCalories) / Double(calorieGoal) * 100
        let proteinProgress = Double(dailyProtein) / Double(proteinGoal) * 100
        
        let timeProgress = Double(Calendar.current.component(.hour, from: Date())) / 24.0 * 100
        
        if calorieProgress > timeProgress + 20 {
            return "You're a bit ahead on calories today at \(Int(calorieProgress))%. Consider lighter options for your remaining meals."
        } else if calorieProgress < timeProgress - 20 {
            return "You're a bit behind on your nutrition today. Make sure to get enough fuel!"
        } else {
            return "You're right on track! \(Int(calorieProgress))% of calories and \(Int(proteinProgress))% of protein for the day."
        }
    }
    
    private func suggestNextMeal() -> String {
        loadTodaysMeals()
        
        let mealType = inferMealType()
        let caloriesRemaining = getCaloriesRemaining()
        let proteinRemaining = getProteinRemaining()
        
        var suggestion = "For \(mealType.rawValue), "
        
        if proteinRemaining > 30 {
            suggestion += "try something high in protein like chicken, fish, or tofu. "
        }
        
        if caloriesRemaining < 400 {
            suggestion += "Go for something light like a salad or soup."
        } else if caloriesRemaining > 800 {
            suggestion += "You have room for a substantial meal."
        } else {
            suggestion += "A balanced meal of about \(caloriesRemaining / 2) calories would be perfect."
        }
        
        return suggestion
    }
}

// MARK: - Meal Type Enum

enum MealType: String, Codable, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"
}
