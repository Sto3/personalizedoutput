/**
 * NutritionService.swift
 *
 * REDI HEALTH - Meal/Nutrition Tracking
 * 
 * Features:
 * - AI-powered food recognition from camera
 * - Nutritional estimation
 * - Daily/weekly tracking
 * - Voice logging
 *
 * Created: Jan 26, 2026
 */

import Foundation
import UIKit
import Combine

class NutritionService: ObservableObject {
    static let shared = NutritionService()
    
    // MARK: - Published
    
    @Published var todaysMeals: [MealLog] = []
    @Published var dailyTotals: NutritionTotals = .zero
    @Published var isAnalyzing = false
    
    // MARK: - Dependencies
    
    private let dataManager = HealthDataManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Goals (configurable)
    
    var dailyCalorieGoal: Int = 2000
    var dailyProteinGoal: Double = 50  // grams
    
    // MARK: - Init
    
    private init() {
        // Refresh when meals change
        dataManager.$mealLogs
            .sink { [weak self] _ in
                self?.refreshToday()
            }
            .store(in: &cancellables)
        
        refreshToday()
    }
    
    // MARK: - Refresh
    
    func refreshToday() {
        todaysMeals = dataManager.getMeals(on: Date())
        dailyTotals = dataManager.dailyNutrition(on: Date())
    }
    
    // MARK: - Analyze Food Image
    
    /// Analyzes a food image and returns nutrition estimate
    /// This would integrate with OpenAI Vision API in production
    func analyzeImage(_ image: UIImage) async -> NutritionEstimate? {
        await MainActor.run { isAnalyzing = true }
        defer { Task { @MainActor in isAnalyzing = false } }
        
        // In production, this sends to OpenAI Vision with prompt:
        // "Analyze this food image. Estimate each item, portion, and macros."
        // For now, return a placeholder that demonstrates the flow
        
        // Simulate API delay
        try? await Task.sleep(nanoseconds: 1_500_000_000)
        
        // Placeholder response - in production, parse OpenAI JSON response
        return NutritionEstimate(
            items: [
                FoodItem(name: "grilled chicken breast", portion: "6 oz", calories: 280, protein: 52, carbs: 0, fat: 6),
                FoodItem(name: "brown rice", portion: "1 cup", calories: 215, protein: 5, carbs: 45, fat: 2),
                FoodItem(name: "steamed broccoli", portion: "1 cup", calories: 55, protein: 4, carbs: 11, fat: 0)
            ],
            totals: NutritionTotals(calories: 550, protein: 61, carbs: 56, fat: 8, fiber: 6),
            confidence: 0.85
        )
    }
    
    // MARK: - Log Meal
    
    func logMeal(type: MealLog.MealType, items: [FoodItem], totals: NutritionTotals, image: UIImage? = nil, notes: String? = nil) {
        let meal = MealLog(
            id: UUID(),
            timestamp: Date(),
            mealType: type,
            items: items,
            totals: totals,
            imageData: image?.jpegData(compressionQuality: 0.6),
            notes: notes
        )
        
        dataManager.logMeal(meal)
        refreshToday()
    }
    
    func logMealFromEstimate(_ estimate: NutritionEstimate, type: MealLog.MealType, image: UIImage? = nil) {
        logMeal(type: type, items: estimate.items, totals: estimate.totals, image: image)
    }
    
    // MARK: - Quick Log (no image)
    
    func quickLog(description: String, calories: Int, type: MealLog.MealType) {
        let item = FoodItem(name: description, portion: "1 serving", calories: calories)
        let totals = NutritionTotals(calories: calories, protein: 0, carbs: 0, fat: 0, fiber: 0)
        logMeal(type: type, items: [item], totals: totals)
    }
    
    // MARK: - Queries
    
    func caloriesRemaining() -> Int {
        max(0, dailyCalorieGoal - dailyTotals.calories)
    }
    
    func mealsLogged() -> Int {
        todaysMeals.count
    }
    
    func weeklyAverage() -> NutritionTotals {
        let calendar = Calendar.current
        var totals: [NutritionTotals] = []
        
        for daysAgo in 0..<7 {
            if let date = calendar.date(byAdding: .day, value: -daysAgo, to: Date()) {
                totals.append(dataManager.dailyNutrition(on: date))
            }
        }
        
        let count = Double(totals.count)
        return NutritionTotals(
            calories: Int(Double(totals.map { $0.calories }.reduce(0, +)) / count),
            protein: totals.map { $0.protein }.reduce(0, +) / count,
            carbs: totals.map { $0.carbs }.reduce(0, +) / count,
            fat: totals.map { $0.fat }.reduce(0, +) / count,
            fiber: totals.map { $0.fiber }.reduce(0, +) / count
        )
    }
    
    // MARK: - Voice Handling
    
    func handleQuery(_ query: String) -> String {
        let lower = query.lowercased()
        
        // "How many calories today?"
        if lower.contains("calorie") && lower.contains("today") {
            let remaining = caloriesRemaining()
            return "You've had \(dailyTotals.calories) calories today. \(remaining) remaining of your \(dailyCalorieGoal) goal."
        }
        
        // "What did I eat today?"
        if (lower.contains("what") || lower.contains("show")) && lower.contains("eat") && lower.contains("today") {
            if todaysMeals.isEmpty {
                return "I don't have any meals logged for today yet."
            }
            let meals = todaysMeals.map { meal in
                let items = meal.items.map { $0.name }.joined(separator: ", ")
                return "\(meal.mealType.displayName): \(items)"
            }.joined(separator: ". ")
            return meals
        }
        
        // "Log my [meal]"
        if lower.contains("log") && (lower.contains("meal") || lower.contains("food") || lower.contains("breakfast") || lower.contains("lunch") || lower.contains("dinner") || lower.contains("snack")) {
            return "Show me what you're eating and I'll analyze it, or tell me what it is."
        }
        
        // "How much protein?"
        if lower.contains("protein") {
            return "You've had \(Int(dailyTotals.protein))g of protein today."
        }
        
        return "I can help track your meals. Try: 'How many calories today?' or 'Log my lunch'"
    }
    
    /// Infer meal type from current time
    func inferMealType() -> MealLog.MealType {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<11: return .breakfast
        case 11..<15: return .lunch
        case 15..<18: return .snack
        default: return .dinner
        }
    }
}

// MARK: - Nutrition Estimate (from AI)

struct NutritionEstimate {
    var items: [FoodItem]
    var totals: NutritionTotals
    var confidence: Double  // 0-1
    
    var description: String {
        let itemList = items.map { "\($0.name) (\($0.portion))" }.joined(separator: ", ")
        return "I see \(itemList) — about \(totals.calories) calories, \(Int(totals.protein))g protein."
    }
}
