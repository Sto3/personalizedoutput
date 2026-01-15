/**
 * Redi V3 WebSocketService
 *
 * Handles persistent WebSocket connection to V3 backend.
 * Routes audio, frames, and messages between iOS and OpenAI Realtime API.
 */

import Foundation
import Combine

class V3WebSocketService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private let serverURL: URL

    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected

    enum ConnectionState: Equatable {
        case disconnected
        case connecting
        case connected
        case error(String)

        static func == (lhs: ConnectionState, rhs: ConnectionState) -> Bool {
            switch (lhs, rhs) {
            case (.disconnected, .disconnected): return true
            case (.connecting, .connecting): return true
            case (.connected, .connected): return true
            case (.error(let a), .error(let b)): return a == b
            default: return false
            }
        }
    }

    // Callbacks
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onSessionReady: (() -> Void)?
    var onError: ((Error) -> Void)?

    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 3

    init(serverURL: URL = V3Config.serverURL) {
        self.serverURL = serverURL
    }

    private var isConnecting = false

    func connect() {
        guard connectionState != .connecting, !isConnecting else { return }
        isConnecting = true

        DispatchQueue.main.async {
            self.connectionState = .connecting
        }
        print("[V3WebSocket] Connecting to \(serverURL)")

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        config.waitsForConnectivity = true

        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: serverURL)
        webSocket?.resume()

        // Start receiving messages immediately (they'll queue until connection ready)
        receiveMessage()

        // Send a ping to verify connection is actually established
        webSocket?.sendPing { [weak self] error in
            guard let self = self else { return }

            // Check if we were disconnected while waiting for ping
            guard self.webSocket != nil else {
                self.isConnecting = false
                return
            }

            if let error = error {
                print("[V3WebSocket] Connection failed: \(error.localizedDescription)")
                self.isConnecting = false
                DispatchQueue.main.async {
                    self.isConnected = false
                    self.connectionState = .error(error.localizedDescription)
                    self.onError?(error)
                }
                self.attemptReconnect()
            } else {
                print("[V3WebSocket] Connection verified via ping")
                self.isConnecting = false
                DispatchQueue.main.async {
                    self.isConnected = true
                    self.connectionState = .connected
                    self.reconnectAttempts = 0
                }
            }
        }
    }

    func disconnect() {
        isConnecting = false
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        session = nil
        reconnectAttempts = maxReconnectAttempts  // Prevent auto-reconnect

        DispatchQueue.main.async { [weak self] in
            self?.isConnected = false
            self?.connectionState = .disconnected
            print("[V3WebSocket] Disconnected")
        }
    }

    // MARK: - Send Methods

    func sendFrame(_ frameData: Data) {
        let message: [String: Any] = [
            "type": "frame",
            "data": frameData.base64EncodedString(),
            "timestamp": Date().timeIntervalSince1970
        ]
        sendJSON(message)
    }

    func sendAudio(_ audioData: Data) {
        let message: [String: Any] = [
            "type": "audio",
            "data": audioData.base64EncodedString()
        ]
        sendJSON(message)
    }

    func sendUserMessage(_ text: String) {
        let message: [String: Any] = [
            "type": "user_message",
            "text": text
        ]
        sendJSON(message)
    }

    func sendSensitivity(_ value: Double) {
        let message: [String: Any] = [
            "type": "sensitivity",
            "value": value
        ]
        sendJSON(message)
    }

    // MARK: - Private Methods

    private func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            print("[V3WebSocket] Failed to serialize message")
            return
        }

        webSocket?.send(.string(string)) { [weak self] error in
            if let error = error {
                print("[V3WebSocket] Send error: \(error)")
                self?.onError?(error)
            }
        }
    }

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage()  // Continue listening

            case .failure(let error):
                print("[V3WebSocket] Receive error: \(error)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                    self?.connectionState = .error(error.localizedDescription)
                    self?.onError?(error)
                }
                self?.attemptReconnect()
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("[V3WebSocket] Failed to parse message")
                return
            }

            handleJSONMessage(json)

        case .data(let data):
            // Binary data - assume it's audio
            DispatchQueue.main.async { [weak self] in
                self?.onAudioReceived?(data)
            }

        @unknown default:
            print("[V3WebSocket] Unknown message type")
        }
    }

    private func handleJSONMessage(_ json: [String: Any]) {
        guard let type = json["type"] as? String else { return }

        switch type {
        case "audio":
            if let audioBase64 = json["data"] as? String,
               let audioData = Data(base64Encoded: audioBase64) {
                DispatchQueue.main.async { [weak self] in
                    self?.onAudioReceived?(audioData)
                }
            }

        case "transcript":
            if let text = json["text"] as? String,
               let role = json["role"] as? String {
                DispatchQueue.main.async { [weak self] in
                    self?.onTranscriptReceived?(text, role)
                }
            }

        case "session_ready":
            print("[V3WebSocket] Session ready")
            DispatchQueue.main.async { [weak self] in
                self?.onSessionReady?()
            }

        case "error":
            let errorMsg = json["message"] as? String ?? "Unknown error"
            print("[V3WebSocket] Server error: \(errorMsg)")
            DispatchQueue.main.async { [weak self] in
                self?.connectionState = .error(errorMsg)
            }

        default:
            print("[V3WebSocket] Unknown message type: \(type)")
        }
    }

    private func attemptReconnect() {
        guard reconnectAttempts < maxReconnectAttempts else {
            print("[V3WebSocket] Max reconnect attempts reached")
            return
        }

        reconnectAttempts += 1
        let delay = Double(reconnectAttempts) * 2.0

        print("[V3WebSocket] Reconnecting in \(delay)s (attempt \(reconnectAttempts))")

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}
