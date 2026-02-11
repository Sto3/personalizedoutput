/**
 * MultiPhoneService.swift
 *
 * Allow up to 5 phones to join a shared Redi session.
 * Uses 6-digit pairing code system.
 */

import Foundation

class MultiPhoneService: ObservableObject {
    @Published var isHosting = false
    @Published var isJoined = false
    @Published var pairingCode: String = ""
    @Published var connectedDevices: Int = 0
    @Published var sessionId: String = ""

    private let maxDevices = 5

    func createSession() {
        pairingCode = String(format: "%06d", Int.random(in: 100000...999999))

        guard let url = URL(string: "https://redialways.com/api/sessions/multi/create") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["code": pairingCode])

        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let sid = json["sessionId"] as? String else { return }
            DispatchQueue.main.async {
                self?.sessionId = sid
                self?.isHosting = true
                self?.connectedDevices = 1
            }
        }.resume()
    }

    func joinSession(code: String) {
        guard let url = URL(string: "https://redialways.com/api/sessions/multi/join") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["code": code])

        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let sid = json["sessionId"] as? String else { return }
            DispatchQueue.main.async {
                self?.sessionId = sid
                self?.pairingCode = code
                self?.isJoined = true
            }
        }.resume()
    }

    func leaveSession() {
        isHosting = false
        isJoined = false
        pairingCode = ""
        sessionId = ""
        connectedDevices = 0
    }
}
