/**
 * Redi V5 WebSocketService
 * ========================
 * 
 * CLEAN VERSION - WebSocket connection to V5 backend
 * 
 * Features:
 * - Persistent connection with reconnection
 * - Audio buffering during drops
 * - Echo suppression coordination
 */

import Foundation
import Combine

class V5WebSocketService: ObservableObject {
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
    var onTranscriptReceived: ((String, String) -> Void)?
    var onSessionReady: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onReconnected: (() -> Void)?
    var onMicMuteChanged: ((Bool) -> Void)?
    var onStopAudio: (() -> Void)?
    var onRequestFrame: (() -> Void)?
    
    // Reconnection
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isManualDisconnect = false
    
    // Audio buffering
    private var audioBuffer: [Data] = []
    private let audioBufferLock = NSLock()
    private let maxBufferedChunks = 100
    
    // Heartbeat
    private var heartbeatTimer: Timer?
    private var lastPongTime: Date = Date()
    private let heartbeatInterval: TimeInterval = 10.0
    private let connectionTimeout: TimeInterval = 30.0
    
    // Debugging
    private var messagesSent = 0
    private var messagesReceived = 0
    
    init(serverURL: URL = V5Config.serverURL) {
        self.serverURL = serverURL
        print("[V5WS] Initialized with URL: \(serverURL)")
    }
    
    private var isConnecting = false
    
    func connect() {
        guard connectionState != .connecting, !isConnecting else { return }
        isConnecting = true
        isManualDisconnect = false
        
        DispatchQueue.main.async {
            self.connectionState = .connecting
        }
        print("[V5WS] Connecting to \(serverURL)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        config.waitsForConnectivity = true
        
        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: serverURL)
        webSocket?.resume()
        
        receiveMessage()
        
        webSocket?.sendPing { [weak self] error in
            guard let self = self else { return }
            self.isConnecting = false
            
            if let error = error {
                print("[V5WS] ❌ Connection failed: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isConnected = false
                    self.connectionState = .error(error.localizedDescription)
                    self.onError?(error)
                }
                self.attemptReconnect()
            } else {
                print("[V5WS] ✅ Connection verified")
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
        reconnectAttempts = maxReconnectAttempts
        
        audioBufferLock.lock()
        audioBuffer.removeAll()
        audioBufferLock.unlock()
        
        DispatchQueue.main.async { [weak self] in
            self?.isConnected = false
            self?.isReconnecting = false
            self?.connectionState = .disconnected
            print("[V5WS] Disconnected (sent: \(self?.messagesSent ?? 0), received: \(self?.messagesReceived ?? 0))")
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
        if audioBuffer.count > maxBufferedChunks {
            audioBuffer.removeFirst()
        }
    }
    
    private func flushAudioBuffer() {
        audioBufferLock.lock()
        let buffered = audioBuffer
        audioBuffer.removeAll()
        audioBufferLock.unlock()
        
        guard !buffered.isEmpty else { return }
        print("[V5WS] Flushing \(buffered.count) buffered audio chunks")
        
        for chunk in buffered {
            let message: [String: Any] = [
                "type": "audio",
                "data": chunk.base64EncodedString()
            ]
            sendJSON(message)
        }
    }
    
    // MARK: - Reconnection
    
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
        
        startHeartbeat()
        
        if wasReconnecting {
            print("[V5WS] Reconnection successful")
            flushAudioBuffer()
            onReconnected?()
        }
    }
    
    private func attemptReconnect() {
        guard !isManualDisconnect else { return }
        guard reconnectAttempts < maxReconnectAttempts else {
            print("[V5WS] Max reconnect attempts reached")
            DispatchQueue.main.async { [weak self] in
                self?.connectionState = .error("Connection lost. Please restart.")
            }
            return
        }
        
        reconnectAttempts += 1
        let delay = pow(2.0, Double(reconnectAttempts - 1))
        
        print("[V5WS] Reconnecting in \(delay)s (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")
        
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
            self.heartbeatTimer = Timer.scheduledTimer(
                withTimeInterval: self.heartbeatInterval,
                repeats: true
            ) { [weak self] _ in
                self?.sendHeartbeat()
            }
        }
    }
    
    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }
    
    private func sendHeartbeat() {
        let timeSinceLastPong = Date().timeIntervalSince(lastPongTime)
        if timeSinceLastPong > connectionTimeout {
            print("[V5WS] Connection timeout")
            handleConnectionLost()
            return
        }
        
        webSocket?.sendPing { [weak self] error in
            if let error = error {
                print("[V5WS] Heartbeat failed: \(error.localizedDescription)")
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
            print("[V5WS] Failed to serialize message")
            return
        }
        
        messagesSent += 1
        
        webSocket?.send(.string(string)) { [weak self] error in
            if let error = error {
                print("[V5WS] Send error: \(error)")
                self?.onError?(error)
            }
        }
    }
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage()
                
            case .failure(let error):
                print("[V5WS] Receive error: \(error)")
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
        lastPongTime = Date()
        messagesReceived += 1
        
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("[V5WS] Failed to parse message")
                return
            }
            handleJSONMessage(json)
            
        case .data(let data):
            DispatchQueue.main.async { [weak self] in
                self?.onAudioReceived?(data)
            }
            
        @unknown default:
            print("[V5WS] Unknown message type")
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
            print("[V5WS] ✅ Session ready")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.isConnected = true
                self.isReconnecting = false
                self.connectionState = .connected
                self.onSessionReady?()
            }
            
        case "error":
            let errorMsg = json["message"] as? String ?? "Unknown error"
            print("[V5WS] Server error: \(errorMsg)")
            DispatchQueue.main.async { [weak self] in
                self?.connectionState = .error(errorMsg)
            }
            
        case "pong":
            lastPongTime = Date()
            
        case "mute_mic":
            if let muted = json["muted"] as? Bool {
                print("[V5WS] Mic mute: \(muted)")
                DispatchQueue.main.async { [weak self] in
                    self?.onMicMuteChanged?(muted)
                }
            }
            
        case "stop_audio":
            print("[V5WS] Stop audio (barge-in)")
            DispatchQueue.main.async { [weak self] in
                self?.onStopAudio?()
            }
            
        case "request_frame":
            print("[V5WS] Frame requested")
            DispatchQueue.main.async { [weak self] in
                self?.onRequestFrame?()
            }
            
        default:
            print("[V5WS] Unknown message type: \(type)")
        }
    }
}
