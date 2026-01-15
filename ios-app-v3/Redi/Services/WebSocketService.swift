/**
 * Redi V3 WebSocketService
 *
 * Handles persistent WebSocket connection to backend server.
 * Routes audio, frames, and messages between iOS and server.
 */

import Foundation
import Combine

class WebSocketService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private let serverURL: URL

    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected

    enum ConnectionState {
        case disconnected
        case connecting
        case connected
        case error(String)
    }

    // Callbacks
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onSessionReady: (() -> Void)?
    var onError: ((Error) -> Void)?

    private var cancellables = Set<AnyCancellable>()
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 3

    init(serverURL: URL = Config.serverURL) {
        self.serverURL = serverURL
    }

    func connect() {
        guard connectionState != .connecting else { return }

        connectionState = .connecting
        print("[WebSocket] Connecting to \(serverURL)")

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300

        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: serverURL)
        webSocket?.resume()

        // Start receiving messages
        receiveMessage()

        // Connection established
        DispatchQueue.main.async { [weak self] in
            self?.isConnected = true
            self?.connectionState = .connected
            self?.reconnectAttempts = 0
            print("[WebSocket] Connected")
        }
    }

    func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        session = nil

        DispatchQueue.main.async { [weak self] in
            self?.isConnected = false
            self?.connectionState = .disconnected
            print("[WebSocket] Disconnected")
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
            print("[WebSocket] Failed to serialize message")
            return
        }

        webSocket?.send(.string(string)) { [weak self] error in
            if let error = error {
                print("[WebSocket] Send error: \(error)")
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
                print("[WebSocket] Receive error: \(error)")
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
                print("[WebSocket] Failed to parse message")
                return
            }

            handleJSONMessage(json)

        case .data(let data):
            // Binary data - assume it's audio
            DispatchQueue.main.async { [weak self] in
                self?.onAudioReceived?(data)
            }

        @unknown default:
            print("[WebSocket] Unknown message type")
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
            print("[WebSocket] Session ready")
            DispatchQueue.main.async { [weak self] in
                self?.onSessionReady?()
            }

        case "error":
            let errorMsg = json["message"] as? String ?? "Unknown error"
            print("[WebSocket] Server error: \(errorMsg)")
            DispatchQueue.main.async { [weak self] in
                self?.connectionState = .error(errorMsg)
            }

        default:
            print("[WebSocket] Unknown message type: \(type)")
        }
    }

    private func attemptReconnect() {
        guard reconnectAttempts < maxReconnectAttempts else {
            print("[WebSocket] Max reconnect attempts reached")
            return
        }

        reconnectAttempts += 1
        let delay = Double(reconnectAttempts) * 2.0  // Exponential backoff

        print("[WebSocket] Reconnecting in \(delay) seconds (attempt \(reconnectAttempts))")

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}
