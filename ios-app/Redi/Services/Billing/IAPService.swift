/**
 * IAPService.swift
 *
 * In-App Purchase service stub for Redi.
 * Handles credit balance, product loading, and purchases.
 *
 * TODO: Wire up to actual StoreKit 2 and server-side credit tracking.
 *
 * Created: Feb 21, 2026
 */

import Foundation
import StoreKit

@MainActor
class IAPService: ObservableObject {
    static let shared = IAPService()
    
    @Published var creditBalance: Int = 0
    @Published var products: [Product] = []
    @Published var isPurchasing = false
    
    private init() {}
    
    // MARK: - Product Loading
    
    func loadProducts() async {
        do {
            let productIds: Set<String> = [
                "com.personalizedoutput.redi.credits.3",
                "com.personalizedoutput.redi.credits.9",
                "com.personalizedoutput.redi.credits.19",
                "com.personalizedoutput.redi.credits.39",
                "com.personalizedoutput.redi.credits.69",
                "com.personalizedoutput.redi.plus"
            ]
            products = try await Product.products(for: productIds)
                .sorted { $0.price < $1.price }
            print("[IAPService] Loaded \(products.count) products")
        } catch {
            print("[IAPService] Failed to load products: \(error)")
        }
    }
    
    // MARK: - Purchase
    
    func purchase(_ product: Product) async throws {
        isPurchasing = true
        defer { isPurchasing = false }
        
        let result = try await product.purchase()
        
        switch result {
        case .success(let verification):
            switch verification {
            case .verified(let transaction):
                await transaction.finish()
                // TODO: Send receipt to server, server credits the account
                print("[IAPService] Purchase verified: \(product.id)")
                await fetchBalance()
            case .unverified(_, let error):
                print("[IAPService] Unverified purchase: \(error)")
            }
        case .pending:
            print("[IAPService] Purchase pending")
        case .userCancelled:
            print("[IAPService] Purchase cancelled")
        @unknown default:
            break
        }
    }
    
    // MARK: - Balance
    
    func fetchBalance() async {
        // TODO: Fetch from server API
        // For now, stub with 0
        print("[IAPService] Balance fetched: \(creditBalance)")
    }
}
