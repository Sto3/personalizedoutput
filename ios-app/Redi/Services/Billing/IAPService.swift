/**
 * IAPService.swift
 *
 * StoreKit 2 integration for credit purchases.
 * Product IDs must match App Store Connect configuration.
 */

import StoreKit

class IAPService: ObservableObject {
    static let shared = IAPService()

    @Published var products: [Product] = []
    @Published var purchaseInProgress = false
    @Published var creditBalance: Int = 0

    private let productIDs = [
        "com.redi.credits.5",
        "com.redi.credits.15",
        "com.redi.credits.25",
        "com.redi.credits.50",
        "com.redi.plus.monthly"
    ]

    func loadProducts() async {
        do {
            products = try await Product.products(for: Set(productIDs))
                .sorted { $0.price < $1.price }
        } catch {
            print("[IAP] Failed to load products: \(error)")
        }
    }

    func purchase(_ product: Product) async throws -> Transaction? {
        purchaseInProgress = true
        defer { purchaseInProgress = false }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await validateWithServer(transaction)
            await transaction.finish()
            return transaction

        case .userCancelled:
            return nil

        case .pending:
            return nil

        @unknown default:
            return nil
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    private func validateWithServer(_ transaction: Transaction) async {
        guard let url = URL(string: "https://redialways.com/api/billing/purchase") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalId": String(transaction.originalID)
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let _ = try? await URLSession.shared.data(for: request)
    }

    func fetchBalance() async {
        guard let url = URL(string: "https://redialways.com/api/billing/balance") else { return }
        if let (data, _) = try? await URLSession.shared.data(from: url),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let balance = json["balance"] as? Int {
            await MainActor.run { creditBalance = balance }
        }
    }

    enum StoreError: Error {
        case failedVerification
    }
}
