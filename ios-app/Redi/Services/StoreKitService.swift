/**
 * StoreKitService.swift
 *
 * Handles In-App Purchases using StoreKit 2 for Redi sessions and subscriptions.
 * Apple requires IAP for digital goods on iOS - Stripe cannot be used.
 */

import Foundation
import StoreKit

// Product identifiers - Updated pricing model
enum RediProduct: String, CaseIterable {
    // Try session (one-time)
    case trySession = "com.personalizedoutput.redi.try"  // $9 for 15 min

    // Subscriptions (auto-renewable)
    case monthly = "com.personalizedoutput.redi.monthly"      // $59/mo - 120 min pool
    case unlimited = "com.personalizedoutput.redi.unlimited"  // $99/mo - unlimited

    // Time extensions (consumables)
    case extend5 = "com.personalizedoutput.redi.extend5"    // $4 for 5 min
    case extend10 = "com.personalizedoutput.redi.extend10"  // $7 for 10 min
    case extend15 = "com.personalizedoutput.redi.extend15"  // $10 for 15 min

    // Overage (for subscribers who ran out of minutes)
    case overage = "com.personalizedoutput.redi.overage"    // $10 for 15 min

    var isSubscription: Bool {
        switch self {
        case .monthly, .unlimited:
            return true
        default:
            return false
        }
    }

    var isExtension: Bool {
        switch self {
        case .extend5, .extend10, .extend15, .overage:
            return true
        default:
            return false
        }
    }

    var minutesProvided: Int {
        switch self {
        case .trySession: return 15
        case .extend5: return 5
        case .extend10: return 10
        case .extend15, .overage: return 15
        case .monthly: return 120  // Monthly pool
        case .unlimited: return -1  // Unlimited
        }
    }

    var displayName: String {
        switch self {
        case .trySession: return "Try Redi (15 min)"
        case .monthly: return "Monthly (120 min)"
        case .unlimited: return "Unlimited"
        case .extend5: return "+5 Minutes"
        case .extend10: return "+10 Minutes"
        case .extend15: return "+15 Minutes"
        case .overage: return "Extra Time (15 min)"
        }
    }

    var priceDisplay: String {
        switch self {
        case .trySession: return "$9"
        case .monthly: return "$59/mo"
        case .unlimited: return "$99/mo"
        case .extend5: return "$4"
        case .extend10: return "$7"
        case .extend15, .overage: return "$10"
        }
    }
}

@MainActor
class StoreKitService: ObservableObject {
    static let shared = StoreKitService()

    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []
    @Published var isLoading = false
    @Published var error: String?

    // Subscription status
    @Published var activeSubscription: Product?
    @Published var subscriptionStatus: Product.SubscriptionInfo.Status?

    private var updateListenerTask: Task<Void, Error>?

    init() {
        // Start listening for transaction updates
        updateListenerTask = listenForTransactions()

        // Load products on init
        Task {
            await loadProducts()
            await updatePurchasedProducts()
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // MARK: - Load Products

    func loadProducts() async {
        isLoading = true
        error = nil

        do {
            let productIDs = RediProduct.allCases.map { $0.rawValue }
            let storeProducts = try await Product.products(for: Set(productIDs))

            // Sort products: sessions first, then subscriptions
            products = storeProducts.sorted { p1, p2 in
                let isP1Session = !RediProduct(rawValue: p1.id)!.isSubscription
                let isP2Session = !RediProduct(rawValue: p2.id)!.isSubscription
                if isP1Session != isP2Session {
                    return isP1Session
                }
                return p1.price < p2.price
            }

            print("[StoreKit] Loaded \(products.count) products")
        } catch {
            print("[StoreKit] Failed to load products: \(error)")
            self.error = "Failed to load products. Please check your connection."
        }

        isLoading = false
    }

    // MARK: - Purchase

    func purchase(_ product: Product) async throws -> Transaction? {
        isLoading = true
        error = nil

        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)

                // Validate with our server
                let validated = await validateWithServer(transaction: transaction)

                if validated {
                    await transaction.finish()
                    await updatePurchasedProducts()
                    isLoading = false
                    return transaction
                } else {
                    error = "Server validation failed"
                    isLoading = false
                    return nil
                }

            case .userCancelled:
                print("[StoreKit] User cancelled purchase")
                isLoading = false
                return nil

            case .pending:
                print("[StoreKit] Purchase pending (ask to buy, etc.)")
                error = "Purchase is pending approval"
                isLoading = false
                return nil

            @unknown default:
                isLoading = false
                return nil
            }
        } catch {
            print("[StoreKit] Purchase failed: \(error)")
            self.error = "Purchase failed: \(error.localizedDescription)"
            isLoading = false
            throw error
        }
    }

    // MARK: - Restore Purchases

    func restorePurchases() async {
        isLoading = true
        error = nil

        do {
            try await AppStore.sync()
            await updatePurchasedProducts()
            print("[StoreKit] Restored purchases")
        } catch {
            print("[StoreKit] Restore failed: \(error)")
            self.error = "Failed to restore purchases"
        }

        isLoading = false
    }

    // MARK: - Transaction Listener

    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)

                    // Validate with server
                    let validated = await self.validateWithServer(transaction: transaction)

                    if validated {
                        await transaction.finish()
                        await self.updatePurchasedProducts()
                    }
                } catch {
                    print("[StoreKit] Transaction verification failed: \(error)")
                }
            }
        }
    }

    // MARK: - Update Purchased Products

    func updatePurchasedProducts() async {
        var purchased: Set<String> = []
        var currentSubscription: Product?
        var currentStatus: Product.SubscriptionInfo.Status?

        // Check for active subscriptions
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                if transaction.revocationDate == nil {
                    purchased.insert(transaction.productID)

                    // Check if this is a subscription
                    if let product = products.first(where: { $0.id == transaction.productID }),
                       product.type == .autoRenewable {
                        currentSubscription = product

                        // Get subscription status
                        if let status = try? await product.subscription?.status.first {
                            currentStatus = status
                        }
                    }
                }
            } catch {
                print("[StoreKit] Error checking entitlement: \(error)")
            }
        }

        purchasedProductIDs = purchased
        activeSubscription = currentSubscription
        subscriptionStatus = currentStatus
    }

    // MARK: - Server Validation

    private func validateWithServer(transaction: Transaction) async -> Bool {
        // Get the JWS representation for server validation
        guard let jwsRepresentation = transaction.jwsRepresentation else {
            print("[StoreKit] No JWS representation available")
            return true  // Fall back to trusting Apple's verification
        }

        let baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://personalizedoutput.com"
        guard let url = URL(string: "\(baseURL)/api/redi/validate-receipt") else {
            print("[StoreKit] Invalid validation URL")
            return true
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "receiptData": jwsRepresentation,
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": transaction.originalID != nil ? String(transaction.originalID) : String(transaction.id),
            "userId": UserDefaults.standard.string(forKey: "redi_user_id") ?? UUID().uuidString,
            "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                return true
            }

            if httpResponse.statusCode == 200 {
                print("[StoreKit] Server validation successful")
                return true
            } else {
                print("[StoreKit] Server validation failed with status \(httpResponse.statusCode)")
                // Still return true to not block the purchase - server can reconcile later
                return true
            }
        } catch {
            print("[StoreKit] Server validation error: \(error)")
            // Don't block purchase on network errors - server can reconcile later
            return true
        }
    }

    // MARK: - Helpers

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Product Helpers

    func product(for rediProduct: RediProduct) -> Product? {
        products.first { $0.id == rediProduct.rawValue }
    }

    /// Get the Try Session product
    func trySessionProduct() -> Product? {
        product(for: .trySession)
    }

    /// Get subscription products (monthly and unlimited)
    func subscriptionProducts() -> [Product] {
        products.filter { product in
            guard let rediProduct = RediProduct(rawValue: product.id) else { return false }
            return rediProduct.isSubscription
        }
    }

    /// Get extension products for adding time during a session
    func extensionProducts() -> [Product] {
        products.filter { product in
            guard let rediProduct = RediProduct(rawValue: product.id) else { return false }
            return rediProduct.isExtension && rediProduct != .overage
        }.sorted { $0.price < $1.price }
    }

    /// Get overage product (for subscribers who ran out of minutes)
    func overageProduct() -> Product? {
        product(for: .overage)
    }

    var hasActiveSubscription: Bool {
        activeSubscription != nil
    }

    var isUnlimitedSubscriber: Bool {
        guard let subscription = activeSubscription,
              let rediProduct = RediProduct(rawValue: subscription.id) else {
            return false
        }
        return rediProduct == .unlimited
    }
}

// MARK: - Errors

enum StoreKitError: Error, LocalizedError {
    case failedVerification
    case productNotFound
    case purchaseFailed

    var errorDescription: String? {
        switch self {
        case .failedVerification:
            return "Transaction verification failed"
        case .productNotFound:
            return "Product not found"
        case .purchaseFailed:
            return "Purchase failed"
        }
    }
}

// MARK: - Product Extensions

extension Product {
    var rediProduct: RediProduct? {
        RediProduct(rawValue: id)
    }

    var sessionDuration: Int {
        rediProduct?.sessionDuration ?? 30
    }
}
