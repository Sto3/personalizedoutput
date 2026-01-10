/**
 * HomeViewModel.swift
 *
 * Manages state and logic for the home/configuration screen.
 */

import Foundation
import Combine
import UIKit

class HomeViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var config = SessionConfig.default
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var userSubscription: UserSubscription?

    // MARK: - Private Properties

    private let apiService = APIService()
    private var cancellables = Set<AnyCancellable>()
    private let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    // MARK: - Actions

    func startCheckout() {
        isLoading = true
        error = nil

        apiService.createCheckout(config: config)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            } receiveValue: { checkoutURL in
                // Open checkout URL in Safari/WebView
                if let url = URL(string: checkoutURL) {
                    UIApplication.shared.open(url)
                }
            }
            .store(in: &cancellables)
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

    func loadSubscriptionStatus() {
        // Load subscription status from UserDefaults or API
        // For now, check if we have a stored userId
        guard let userId = UserDefaults.standard.string(forKey: "redi_user_id") else {
            userSubscription = nil
            return
        }

        apiService.getSubscriptionBalance(userId: userId)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { [weak self] subscription in
                self?.userSubscription = subscription
            }
            .store(in: &cancellables)
    }

    func startSubscription(tier: SubscriptionTier) {
        isLoading = true
        error = nil

        let userId = UserDefaults.standard.string(forKey: "redi_user_id") ?? UUID().uuidString
        UserDefaults.standard.set(userId, forKey: "redi_user_id")

        apiService.createSubscriptionCheckout(tier: tier, userId: userId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            } receiveValue: { checkoutURL in
                if let url = URL(string: checkoutURL) {
                    UIApplication.shared.open(url)
                }
            }
            .store(in: &cancellables)
    }

    func startSubscriptionSession() {
        guard let userId = UserDefaults.standard.string(forKey: "redi_user_id") else {
            error = "No subscription found"
            return
        }

        isLoading = true
        error = nil

        apiService.startSubscriptionSession(userId: userId, config: config, deviceId: deviceId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            } receiveValue: { [weak self] session in
                // Navigate to session - this would be handled by AppState in the actual app
                NotificationCenter.default.post(name: .rediSessionStarted, object: session)
                self?.loadSubscriptionStatus() // Refresh balance
            }
            .store(in: &cancellables)
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let rediSessionStarted = Notification.Name("rediSessionStarted")
}

// MARK: - API Service

class APIService {
    private let baseURL = "https://personalizedoutput.com"

    func createCheckout(config: SessionConfig) -> AnyPublisher<String, Error> {
        let url = URL(string: "\(baseURL)/api/redi/checkout")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "duration": config.durationMinutes,
            "mode": config.mode.rawValue,
            "voiceGender": config.voiceGender.rawValue,
            "sensitivity": config.sensitivity
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response in
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    throw URLError(.badServerResponse)
                }

                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let checkoutURL = json?["checkoutUrl"] as? String else {
                    throw URLError(.cannotParseResponse)
                }

                return checkoutURL
            }
            .eraseToAnyPublisher()
    }

    func createSession(checkoutSessionId: String) -> AnyPublisher<RediSession, Error> {
        let url = URL(string: "\(baseURL)/api/redi/session")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["checkoutSessionId": checkoutSessionId]
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

    func getConfig() -> AnyPublisher<AppConfig, Error> {
        let url = URL(string: "\(baseURL)/api/redi/config")!

        return URLSession.shared.dataTaskPublisher(for: url)
            .tryMap { data, _ in
                try JSONDecoder().decode(AppConfig.self, from: data)
            }
            .eraseToAnyPublisher()
    }

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

    func getSubscriptionBalance(userId: String) -> AnyPublisher<UserSubscription, Error> {
        let url = URL(string: "\(baseURL)/api/redi/subscription/balance?userId=\(userId)")!

        return URLSession.shared.dataTaskPublisher(for: url)
            .tryMap { data, response in
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    throw URLError(.badServerResponse)
                }

                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(UserSubscription.self, from: data)
            }
            .eraseToAnyPublisher()
    }

    func createSubscriptionCheckout(tier: SubscriptionTier, userId: String) -> AnyPublisher<String, Error> {
        let url = URL(string: "\(baseURL)/api/redi/subscribe")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "tier": tier.rawValue,
            "userId": userId
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response in
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    throw URLError(.badServerResponse)
                }

                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let checkoutURL = json?["checkoutUrl"] as? String else {
                    throw URLError(.cannotParseResponse)
                }

                return checkoutURL
            }
            .eraseToAnyPublisher()
    }

    func startSubscriptionSession(userId: String, config: SessionConfig, deviceId: String) -> AnyPublisher<RediSession, Error> {
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
}
