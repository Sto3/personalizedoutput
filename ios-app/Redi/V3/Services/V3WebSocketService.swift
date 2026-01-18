/**
 * Redi V3 WebSocketService
 *
 * Military-Grade Connection Management:
 * - Persistent WebSocket connection to V3 backend
 * - Graceful reconnection with exponential backoff
 * - Audio buffering during connectivity drops
 * - Handles gym basements, outdoor dead zones
 */

import Foundation
import Combine

class V3WebSocketService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private let serverURL: URL

    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected
    @Published var isReconnecting = false

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
    var onReconnected: (() -> Void)?  // Called when reconnection succeeds
    var onMicMuteChanged: ((Bool) -> Void)?  // Called when server requests mic mute/unmute (echo suppression)
    var onStopAudio: (() -> Void)?  // Called when server requests immediate audio stop (barge-in)
    var onRequestFrame: (() -> Void)?  // Called when server needs a fresh frame for visual context

    // Reconnection management
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isManualDisconnect = false

    // Audio buffering during reconnection
    private var audioBuffer: [Data] = []
    private let audioBufferLock = NSLock()
    private let maxBufferedAudioChunks = 100  // ~2 seconds at 50 chunks/sec

    // Heartbeat for connection health
    private var heartbeatTimer: Timer?
    private var lastPongTime: Date = Date()
    private let heartbeatInterval: TimeInterval = 10.0
    private let connectionTimeoutInterval: TimeInterval = 30.0

    init(serverURL: URL = V3Config.serverURL) {
        self.serverURL = serverURL
    }

    private var isConnecting = false

    func connect() {
        guard connectionState != .connecting, !isConnecting else { return }
        isConnecting = true
        isManualDisconnect = false

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

        // Start receiving messages immediately
        receiveMessage()

        // Send a ping to verify connection
        webSocket?.sendPing { [weak self] error in
            guard let self = self else { return }
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
                self.handleReconnectSuccess()
            }
        }
    }

    func disconnect() {
        isConnecting = false
        isManualDisconnect = true
        stopHeartbeat()

        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        session = nil
        reconnectAttempts = maxReconnectAttempts  // Prevent auto-reconnect

        // Clear audio buffer
        audioBufferLock.lock()
        audioBuffer.removeAll()
        audioBufferLock.unlock()

        DispatchQueue.main.async { [weak self] in
            self?.isConnected = false
            self?.isReconnecting = false
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
        // If reconnecting, buffer audio instead of dropping it
        if isReconnecting {
            bufferAudio(audioData)
            return
        }

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

    func sendMode(_ mode: String) {
        let message: [String: Any] = [
            "type": "mode",
            "mode": mode
        ]
        sendJSON(message)
    }

    // MARK: - Audio Buffering

    private func bufferAudio(_ audioData: Data) {
        audioBufferLock.lock()
        defer { audioBufferLock.unlock() }

        audioBuffer.append(audioData)

        // Limit buffer size to prevent memory issues
        if audioBuffer.count > maxBufferedAudioChunks {
            audioBuffer.removeFirst()
        }
    }

    private func flushAudioBuffer() {
        audioBufferLock.lock()
        let bufferedChunks = audioBuffer
        audioBuffer.removeAll()
        audioBufferLock.unlock()

        guard !bufferedChunks.isEmpty else { return }
        print("[V3WebSocket] Flushing \(bufferedChunks.count) buffered audio chunks")

        for chunk in bufferedChunks {
            let message: [String: Any] = [
                "type": "audio",
                "data": chunk.base64EncodedString()
            ]
            sendJSON(message)
        }
    }

    // MARK: - Reconnection Management

    private func handleReconnectSuccess() {
        let wasReconnecting = isReconnecting

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.isConnected = true
            self.isReconnecting = false
            self.connectionState = .connected
            self.reconnectAttempts = 0
            self.lastPongTime = Date()
        }

        // Start heartbeat
        startHeartbeat()

        // Flush buffered audio
        if wasReconnecting {
            print("[V3WebSocket] Reconnection successful, flushing buffer")
            flushAudioBuffer()
            onReconnected?()
        }
    }

    private func attemptReconnect() {
        guard !isManualDisconnect else { return }
        guard reconnectAttempts < maxReconnectAttempts else {
            print("[V3WebSocket] Max reconnect attempts reached")
            DispatchQueue.main.async { [weak self] in
                self?.connectionState = .error("Connection lost. Please restart session.")
            }
            return
        }

        reconnectAttempts += 1

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        let delay = pow(2.0, Double(reconnectAttempts - 1))

        print("[V3WebSocket] Reconnecting in \(delay)s (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")

        DispatchQueue.main.async { [weak self] in
            self?.isReconnecting = true
            self?.connectionState = .connecting
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self, !self.isManualDisconnect else { return }
            self.connect()
        }
    }

    // MARK: - Heartbeat

    private func startHeartbeat() {
        stopHeartbeat()

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.heartbeatTimer = Timer.scheduledTimer(withTimeInterval: self.heartbeatInterval, repeats: true) { [weak self] _ in
                self?.sendHeartbeat()
            }
        }
    }

    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }

    private func sendHeartbeat() {
        // Check if connection seems dead
        let timeSinceLastPong = Date().timeIntervalSince(lastPongTime)
        if timeSinceLastPong > connectionTimeoutInterval {
            print("[V3WebSocket] Connection timeout (no pong for \(Int(timeSinceLastPong))s)")
            handleConnectionLost()
            return
        }

        webSocket?.sendPing { [weak self] error in
            if let error = error {
                print("[V3WebSocket] Heartbeat ping failed: \(error.localizedDescription)")
                self?.handleConnectionLost()
            } else {
                self?.lastPongTime = Date()
            }
        }
    }

    private func handleConnectionLost() {
        guard !isManualDisconnect else { return }

        stopHeartbeat()
        webSocket?.cancel(with: .abnormalClosure, reason: nil)
        webSocket = nil

        DispatchQueue.main.async { [weak self] in
            self?.isConnected = false
            self?.connectionState = .error("Connection lost")
        }

        attemptReconnect()
    }

    // MARK: - Message Handling

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
        // Update last pong time on any message (connection is alive)
        lastPongTime = Date()

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
                print("[V3WebSocket] Received audio chunk: \(audioData.count) bytes")
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

        case "pong":
            // Heartbeat response
            lastPongTime = Date()

        case "mute_mic":
            // Echo suppression: server is telling us to mute/unmute mic
            // This prevents Redi from hearing its own voice through the speaker
            if let muted = json["muted"] as? Bool {
                print("[V3WebSocket] Mic mute request: \(muted ? "MUTE" : "UNMUTE")")
                DispatchQueue.main.async { [weak self] in
                    self?.onMicMuteChanged?(muted)
                }
            }

        case "stop_audio":
            // Barge-in: user interrupted, stop playing Redi's audio immediately
            print("[V3WebSocket] Stop audio request (barge-in)")
            DispatchQueue.main.async { [weak self] in
                self?.onStopAudio?()
            }

        case "request_frame":
            // Server needs a fresh frame for visual context
            print("[V3WebSocket] Fresh frame requested")
            DispatchQueue.main.async { [weak self] in
                self?.onRequestFrame?()
            }

        default:
            print("[V3WebSocket] Unknown message type: \(type)")
        }
    }
}
