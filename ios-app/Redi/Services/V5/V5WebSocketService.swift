import Foundation
import Combine

class V5WebSocketService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private let serverURL: URL

    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected

    enum ConnectionState: Equatable {
        case disconnected, connecting, connected, error(String)
    }

    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?
    var onSessionReady: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onMicMuteChanged: ((Bool) -> Void)?
    var onStopAudio: (() -> Void)?
    var onRequestFrame: (() -> Void)?

    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isManualDisconnect = false

    init(serverURL: URL = V5Config.serverURL) {
        self.serverURL = serverURL
        print("[V5WS] URL: \(serverURL)")
    }

    func connect() {
        guard connectionState != .connecting else { return }
        isManualDisconnect = false
        connectionState = .connecting
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: serverURL)
        webSocket?.resume()
        receiveMessage()
        webSocket?.sendPing { [weak self] error in
            if let error = error {
                self?.connectionState = .error(error.localizedDescription)
                self?.attemptReconnect()
            } else {
                self?.isConnected = true
                self?.connectionState = .connected
                self?.reconnectAttempts = 0
            }
        }
    }

    func disconnect() {
        isManualDisconnect = true
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
        connectionState = .disconnected
    }

    func sendFrame(_ frameData: Data) {
        sendJSON(["type": "frame", "data": frameData.base64EncodedString(), "timestamp": Date().timeIntervalSince1970])
    }

    func sendAudio(_ audioData: Data) {
        sendJSON(["type": "audio", "data": audioData.base64EncodedString()])
    }

    func sendMode(_ mode: String) {
        sendJSON(["type": "mode", "mode": mode])
    }

    func sendSensitivity(_ value: Double) {
        sendJSON(["type": "sensitivity", "value": value])
    }

    private func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else { return }
        webSocket?.send(.string(string)) { _ in }
    }

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage()
            case .failure:
                self?.attemptReconnect()
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else { return }
            DispatchQueue.main.async { [weak self] in
                switch type {
                case "audio":
                    if let b64 = json["data"] as? String, let audioData = Data(base64Encoded: b64) {
                        self?.onAudioReceived?(audioData)
                    }
                case "transcript":
                    if let text = json["text"] as? String, let role = json["role"] as? String {
                        self?.onTranscriptReceived?(text, role)
                    }
                case "session_ready":
                    self?.isConnected = true
                    self?.connectionState = .connected
                    self?.onSessionReady?()
                case "mute_mic":
                    if let muted = json["muted"] as? Bool { self?.onMicMuteChanged?(muted) }
                case "stop_audio":
                    self?.onStopAudio?()
                case "request_frame":
                    self?.onRequestFrame?()
                case "error":
                    if let msg = json["message"] as? String { self?.connectionState = .error(msg) }
                default: break
                }
            }
        case .data(let data):
            DispatchQueue.main.async { [weak self] in self?.onAudioReceived?(data) }
        @unknown default: break
        }
    }

    private func attemptReconnect() {
        guard !isManualDisconnect, reconnectAttempts < maxReconnectAttempts else { return }
        reconnectAttempts += 1
        let delay = pow(2.0, Double(reconnectAttempts - 1))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}
