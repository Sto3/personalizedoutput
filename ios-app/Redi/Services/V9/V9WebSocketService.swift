/**
 * V9WebSocketService.swift
 *
 * WebSocket client for V9 Three-Brain architecture.
 *
 * Protocol differences from V5:
 * - Audio sent as BINARY data (raw PCM16), not base64 JSON
 * - Frames sent as JSON: { "type": "frame", "data": "<base64>" }
 * - Config includes voice selection
 * - Receives brain indicator with each response
 */

import Foundation
import Combine

class V9WebSocketService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?

    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected
    @Published var currentBrain: String = ""  // "fast", "voice", or "deep"
    @Published var lastLatencyMs: Int = 0

    enum ConnectionState: Equatable {
        case disconnected, connecting, connected, error(String)

        static func == (lhs: ConnectionState, rhs: ConnectionState) -> Bool {
            switch (lhs, rhs) {
            case (.disconnected, .disconnected), (.connecting, .connecting), (.connected, .connected):
                return true
            case (.error(let a), .error(let b)):
                return a == b
            default:
                return false
            }
        }
    }

    // Callbacks (V3MainView uses these names)
    var onTranscript: ((String, String) -> Void)?  // (text, role)
    var onPlaybackStarted: (() -> Void)?
    var onPlaybackEnded: (() -> Void)?
    var onSessionReady: (() -> Void)?
    var onBrainUsed: ((String) -> Void)?
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, Bool) -> Void)?  // (text, isFinal)
    var onResponseReceived: ((String, String, Int) -> Void)?  // (text, brain, latencyMs)
    var onError: ((String) -> Void)?
    var onAudioDone: (() -> Void)?

    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isManualDisconnect = false
    private var keepAliveTimer: Timer?

    func connect() {
        guard connectionState != .connecting else { return }
        isManualDisconnect = false
        connectionState = .connecting

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: V9Config.serverURL)
        webSocket?.resume()

        receiveMessage()
        startKeepAlive()

        print("[V9WS] Connecting to \(V9Config.serverURL)")
    }

    func disconnect() {
        isManualDisconnect = true
        keepAliveTimer?.invalidate()
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
        connectionState = .disconnected
    }

    // MARK: - Send Methods

    /// Send raw PCM16 audio bytes (binary, not JSON)
    func sendAudio(_ audioData: Data) {
        webSocket?.send(.data(audioData)) { error in
            if let error = error {
                print("[V9WS] Audio send error: \(error)")
            }
        }
    }

    /// Send camera frame as base64 JPEG
    func sendFrame(_ frameData: Data) {
        let msg: [String: Any] = [
            "type": "frame",
            "data": frameData.base64EncodedString()
        ]
        sendJSON(msg)
    }

    /// Send session configuration including voice preference
    func sendConfig(drivingMode: Bool = false, voiceOnly: Bool = false, memory: String = "", voice: String = "") {
        var msg: [String: Any] = [
            "type": "config",
            "drivingMode": drivingMode,
            "voiceOnly": voiceOnly,
            "memory": memory
        ]
        if !voice.isEmpty {
            msg["voice"] = voice
        }
        sendJSON(msg)
    }

    /// Signal barge-in (user started speaking while Redi was responding)
    func sendBargeIn() {
        sendJSON(["type": "barge_in"])
    }

    // MARK: - Internal (accessible to other services like ObserveModeService)

    func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else { return }
        webSocket?.send(.string(string)) { error in
            if let error = error {
                print("[V9WS] JSON send error: \(error)")
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
                print("[V9WS] Receive error: \(error)")
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
                case "session_ready":
                    let sessionId = json["sessionId"] as? String ?? ""
                    self?.isConnected = true
                    self?.connectionState = .connected
                    self?.reconnectAttempts = 0
                    self?.onSessionReady?()
                    print("[V9WS] Session ready: \(sessionId)")

                case "transcript":
                    let text = json["text"] as? String ?? ""
                    let isFinal = json["isFinal"] as? Bool ?? false
                    let role = json["role"] as? String ?? "user"
                    self?.onTranscriptReceived?(text, isFinal)
                    if isFinal { self?.onTranscript?(text, role) }

                case "response":
                    let text = json["text"] as? String ?? ""
                    let brain = json["brain"] as? String ?? "unknown"
                    let latencyMs = json["latencyMs"] as? Int ?? 0
                    self?.currentBrain = brain
                    self?.lastLatencyMs = latencyMs
                    self?.onResponseReceived?(text, brain, latencyMs)
                    self?.onTranscript?(text, "assistant")
                    self?.onBrainUsed?(brain)
                    self?.onPlaybackStarted?()

                case "audio":
                    if let b64 = json["data"] as? String, let audioData = Data(base64Encoded: b64) {
                        self?.onAudioReceived?(audioData)
                    }

                case "audio_done":
                    self?.onAudioDone?()
                    self?.onPlaybackEnded?()

                case "error":
                    let msg = json["message"] as? String ?? "Unknown error"
                    self?.onError?(msg)

                default:
                    print("[V9WS] Unknown message type: \(type)")
                }
            }

        case .data(let data):
            // Binary audio data from server
            DispatchQueue.main.async { [weak self] in
                self?.onAudioReceived?(data)
            }

        @unknown default:
            break
        }
    }

    private func startKeepAlive() {
        keepAliveTimer?.invalidate()
        keepAliveTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.webSocket?.sendPing { error in
                if let error = error {
                    print("[V9WS] Ping failed: \(error)")
                }
            }
        }
    }

    private func attemptReconnect() {
        guard !isManualDisconnect, reconnectAttempts < maxReconnectAttempts else {
            DispatchQueue.main.async {
                self.connectionState = .error("Connection lost")
                self.isConnected = false
            }
            return
        }
        reconnectAttempts += 1
        let delay = Double(min(reconnectAttempts * 2, 10))  // 2, 4, 6, 8, 10 seconds
        print("[V9WS] Reconnecting in \(delay)s (attempt \(reconnectAttempts))")
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}
