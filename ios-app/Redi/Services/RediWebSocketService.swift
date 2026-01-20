/**
 * RediWebSocketService.swift
 *
 * Production WebSocket service for Redi.
 * Connects to the Redi server and handles real-time communication.
 * NO VERSION NUMBERS - this is the production service.
 */

import Foundation
import Combine

class RediWebSocketService: ObservableObject {
    // MARK: - Published Properties
    
    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected
    
    enum ConnectionState: Equatable {
        case disconnected
        case connecting
        case connected
        case error(String)
    }
    
    // MARK: - Callbacks
    
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onSessionReady: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onMicMuteChanged: ((Bool) -> Void)?
    var onStopAudio: (() -> Void)?
    var onRequestFrame: (() -> Void)?
    
    // MARK: - Private Properties
    
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private let serverURL: URL
    
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isManualDisconnect = false
    
    // MARK: - Initialization
    
    init(serverURL: URL = RediConfig.serverURL) {
        self.serverURL = serverURL
        print("[RediWS] Initialized with URL: \(serverURL)")
    }
    
    // MARK: - Connection Management
    
    func connect() {
        guard connectionState != .connecting else {
            print("[RediWS] Already connecting, ignoring")
            return
        }
        
        isManualDisconnect = false
        connectionState = .connecting
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
        
        webSocket = session?.webSocketTask(with: serverURL)
        webSocket?.resume()
        
        receiveMessage()
        
        // Send ping to verify connection
        webSocket?.sendPing { [weak self] error in
            DispatchQueue.main.async {
                if let error = error {
                    print("[RediWS] ❌ Connection failed: \(error.localizedDescription)")
                    self?.connectionState = .error(error.localizedDescription)
                    self?.attemptReconnect()
                } else {
                    print("[RediWS] ✅ Connected to server")
                    self?.isConnected = true
                    self?.connectionState = .connected
                    self?.reconnectAttempts = 0
                }
            }
        }
    }
    
    func disconnect() {
        print("[RediWS] Disconnecting...")
        isManualDisconnect = true
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
        connectionState = .disconnected
    }
    
    // MARK: - Sending Messages
    
    /// Send a camera frame to the server
    func sendFrame(_ frameData: Data) {
        let sizeKB = frameData.count / 1024
        print("[RediWS] 📷 Sending frame: \(sizeKB)KB")
        
        sendJSON([
            "type": "frame",
            "data": frameData.base64EncodedString(),
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    /// Send audio data to the server
    func sendAudio(_ audioData: Data) {
        sendJSON([
            "type": "audio",
            "data": audioData.base64EncodedString()
        ])
    }
    
    /// Send mode change to the server
    func sendMode(_ mode: String) {
        print("[RediWS] 🎯 Sending mode: \(mode)")
        sendJSON(["type": "mode", "mode": mode])
    }
    
    /// Send sensitivity change to the server
    func sendSensitivity(_ value: Double) {
        print("[RediWS] 📊 Sending sensitivity: \(value)")
        sendJSON(["type": "sensitivity", "value": value])
    }
    
    // MARK: - Private Methods
    
    private func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            print("[RediWS] ❌ JSON serialization failed")
            return
        }
        
        webSocket?.send(.string(string)) { error in
            if let error = error {
                print("[RediWS] ❌ Send error: \(error.localizedDescription)")
            }
        }
    }
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage()  // Continue receiving
                
            case .failure(let error):
                print("[RediWS] ❌ Receive error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self?.attemptReconnect()
                }
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else {
                return
            }
            
            DispatchQueue.main.async { [weak self] in
                self?.processMessage(type: type, json: json)
            }
            
        case .data(let data):
            // Binary audio data
            DispatchQueue.main.async { [weak self] in
                self?.onAudioReceived?(data)
            }
            
        @unknown default:
            break
        }
    }
    
    private func processMessage(type: String, json: [String: Any]) {
        switch type {
        case "audio":
            if let b64 = json["data"] as? String,
               let audioData = Data(base64Encoded: b64) {
                onAudioReceived?(audioData)
            }
            
        case "transcript":
            if let text = json["text"] as? String,
               let role = json["role"] as? String {
                onTranscriptReceived?(text, role)
            }
            
        case "session_ready":
            print("[RediWS] ✅ Session ready")
            isConnected = true
            connectionState = .connected
            onSessionReady?()
            
        case "mute_mic":
            if let muted = json["muted"] as? Bool {
                onMicMuteChanged?(muted)
            }
            
        case "stop_audio":
            onStopAudio?()
            
        case "request_frame":
            print("[RediWS] 📷 Server requested frame")
            onRequestFrame?()
            
        case "error":
            if let msg = json["message"] as? String {
                print("[RediWS] ❌ Server error: \(msg)")
                connectionState = .error(msg)
            }
            
        default:
            print("[RediWS] Unknown message type: \(type)")
        }
    }
    
    private func attemptReconnect() {
        guard !isManualDisconnect else {
            print("[RediWS] Manual disconnect, not reconnecting")
            return
        }
        
        guard reconnectAttempts < maxReconnectAttempts else {
            print("[RediWS] ❌ Max reconnect attempts (\(maxReconnectAttempts)) reached")
            connectionState = .error("Connection failed after \(maxReconnectAttempts) attempts")
            return
        }
        
        reconnectAttempts += 1
        let delay = pow(2.0, Double(reconnectAttempts - 1))
        print("[RediWS] ⏳ Reconnecting in \(delay)s (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}
