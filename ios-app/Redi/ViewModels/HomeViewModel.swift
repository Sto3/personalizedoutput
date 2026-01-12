/**
 * HomeViewModel.swift
 *
 * Manages state and logic for the home/configuration screen.
 * Uses StoreKit 2 for In-App Purchases (Apple requirement for iOS).
 */

import Foundation
import Combine
import UIKit
import StoreKit

@MainActor
class HomeViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var config = SessionConfig.default
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var userSubscription: UserSubscription?
    @Published var purchaseSuccess: Bool = false

    // MARK: - Private Properties

    private let apiService = APIService()
    private var cancellables = Set<AnyCancellable>()
    private let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    // StoreKit service for In-App Purchases
    private let storeKit = StoreKitService.shared

    // MARK: - Actions

    /// Purchase "Try Redi" (15 min) using StoreKit
    func purchaseTrySession() async {
        isLoading = true
        error = nil
        purchaseSuccess = false

        guard let product = storeKit.product(for: .trySession) else {
            error = "Product not available. Please try again."
            isLoading = false
            return
        }

        do {
            let transaction = try await storeKit.purchase(product)

            if let transaction = transaction {
                // Purchase successful - create session on backend
                await createSessionFromPurchase(
                    transactionId: String(transaction.id),
                    productId: transaction.productID
                )
            } else {
                // User cancelled or pending
                isLoading = false
            }
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    /// Purchase a subscription using StoreKit
    func purchaseSubscription(tier: SubscriptionTier) async {
        isLoading = true
        error = nil
        purchaseSuccess = false

        let rediProduct: RediProduct
        switch tier {
        case .starter, .regular:
            // Map old tiers to monthly
            rediProduct = .monthly
        case .unlimited:
            rediProduct = .unlimited
        }

        guard let product = storeKit.product(for: rediProduct) else {
            error = "Subscription not available. Please try again."
            isLoading = false
            return
        }

        do {
            let transaction = try await storeKit.purchase(product)

            if transaction != nil {
                // Subscription successful - refresh status
                await loadSubscriptionStatus()
                purchaseSuccess = true
            }
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    /// Create a session on the backend after successful Apple purchase
    private func createSessionFromPurchase(transactionId: String, productId: String) async {
        let userId = UserDefaults.standard.string(forKey: "redi_user_id") ?? UUID().uuidString
        UserDefaults.standard.set(userId, forKey: "redi_user_id")

        do {
            let session = try await apiService.createSessionFromApplePurchase(
                transactionId: transactionId,
                productId: productId,
                userId: userId,
                deviceId: deviceId,
                config: config
            )

            // Navigate to session
            NotificationCenter.default.post(name: .rediSessionStarted, object: session)
            purchaseSuccess = true
            isLoading = false
        } catch {
            self.error = "Failed to start session: \(error.localizedDescription)"
            isLoading = false
        }
    }

    func joinSession(code: String, completion: @escaping (Result<RediSession, Error>) -> Void) {
        isLoading = true
        error = nil

        apiService.joinSession(joinCode: code, deviceId: deviceId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] result in
                self?.isLoading = false
                if case .failure(let error) = result {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                }
            } receiveValue: { session in
                completion(.success(session))
            }
            .store(in: &cancellables)
    }

    func loadSubscriptionStatus() async {
        // Check StoreKit for active subscriptions
        await storeKit.updatePurchasedProducts()

        // Also check server for subscription balance
        guard let userId = UserDefaults.standard.string(forKey: "redi_user_id") else {
            userSubscription = nil
            return
        }

        do {
            userSubscription = try await apiService.getSubscriptionBalanceAsync(userId: userId)
        } catch {
            print("[HomeViewModel] Failed to load subscription status: \(error)")
        }
    }

    /// Start a session using subscription balance
    func startSubscriptionSession() async {
        guard storeKit.hasActiveSubscription else {
            error = "No active subscription found"
            return
        }

        guard let userId = UserDefaults.standard.string(forKey: "redi_user_id") else {
            error = "Please sign in to use your subscription"
            return
        }

        isLoading = true
        error = nil

        do {
            let session = try await apiService.startSubscriptionSessionAsync(
                userId: userId,
                config: config,
                deviceId: deviceId
            )

            // Navigate to session
            NotificationCenter.default.post(name: .rediSessionStarted, object: session)
            await loadSubscriptionStatus() // Refresh balance
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    /// Restore previous purchases
    func restorePurchases() async {
        isLoading = true
        await storeKit.restorePurchases()
        await loadSubscriptionStatus()
        isLoading = false
    }

    /// Get price display for Try Redi
    func trySessionPriceDisplay() -> String {
        if let product = storeKit.product(for: .trySession) {
            return product.displayPrice
        }
        return "$9.00"
    }

    /// Get subscription price display
    func subscriptionPriceDisplay(for tier: SubscriptionTier) -> String {
        let rediProduct: RediProduct
        switch tier {
        case .starter, .regular:
            rediProduct = .monthly
        case .unlimited:
            rediProduct = .unlimited
        }

        if let product = storeKit.product(for: rediProduct) {
            return product.displayPrice
        }

        // Fallback to hardcoded prices
        switch tier {
        case .starter, .regular: return "$59.00"
        case .unlimited: return "$99.00"
        }
    }

    /// Get monthly subscription price
    func monthlyPriceDisplay() -> String {
        if let product = storeKit.product(for: .monthly) {
            return product.displayPrice
        }
        return "$59.00"
    }

    /// Get unlimited subscription price
    func unlimitedPriceDisplay() -> String {
        if let product = storeKit.product(for: .unlimited) {
            return product.displayPrice
        }
        return "$99.00"
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let rediSessionStarted = Notification.Name("rediSessionStarted")
}

// MARK: - API Service

class APIService {
    private let baseURL = "https://personalizedoutput.com"

    // MARK: - Apple In-App Purchase Session Creation

    /// Create a session from an Apple In-App Purchase
    func createSessionFromApplePurchase(
        transactionId: String,
        productId: String,
        userId: String,
        deviceId: String,
        config: SessionConfig
    ) async throws -> RediSession {
        let url = URL(string: "\(baseURL)/api/redi/session/apple")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "transactionId": transactionId,
            "productId": productId,
            "userId": userId,
            "deviceId": deviceId,
            "mode": config.mode.rawValue,
            "voiceGender": config.voiceGender.rawValue,
            "sensitivity": config.sensitivity
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(RediSession.self, from: data)
    }

    // MARK: - Subscription Management (Async)

    func getSubscriptionBalanceAsync(userId: String) async throws -> UserSubscription {
        let url = URL(string: "\(baseURL)/api/redi/subscription/balance?userId=\(userId)")!

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(UserSubscription.self, from: data)
    }

    func startSubscriptionSessionAsync(
        userId: String,
        config: SessionConfig,
        deviceId: String
    ) async throws -> RediSession {
        let url = URL(string: "\(baseURL)/api/redi/session/start")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "userId": userId,
            "deviceId": deviceId,
            "duration": config.durationMinutes,
            "mode": config.mode.rawValue,
            "voiceGender": config.voiceGender.rawValue,
            "sensitivity": config.sensitivity
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(RediSession.self, from: data)
    }

    // MARK: - Session Join

    func joinSession(joinCode: String, deviceId: String) -> AnyPublisher<RediSession, Error> {
        let url = URL(string: "\(baseURL)/api/redi/session/join")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "joinCode": joinCode,
            "deviceId": deviceId
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response in
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    throw URLError(.badServerResponse)
                }

                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(RediSession.self, from: data)
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Config

    func getConfig() -> AnyPublisher<AppConfig, Error> {
        let url = URL(string: "\(baseURL)/api/redi/config")!

        return URLSession.shared.dataTaskPublisher(for: url)
            .tryMap { data, _ in
                try JSONDecoder().decode(AppConfig.self, from: data)
            }
            .eraseToAnyPublisher()
    }
}
