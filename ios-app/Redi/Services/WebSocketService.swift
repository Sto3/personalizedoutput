/**
 * WebSocketService.swift
 *
 * Handles real-time WebSocket communication with the Redi backend.
 */

import Foundation
import Combine
import UIKit

class WebSocketService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isConnected: Bool = false
    @Published var lastTranscript: TranscriptChunk?
    @Published var lastVisualAnalysis: VisualAnalysis?
    @Published var lastAIResponse: AIResponse?
    @Published var remainingSeconds: Int = 0
    @Published var error: String?

    // MARK: - Publishers

    let audioReceived = PassthroughSubject<Data, Never>()
    let transcriptReceived = PassthroughSubject<TranscriptChunk, Never>()
    let aiResponseReceived = PassthroughSubject<AIResponse, Never>()
    let visualAnalysisReceived = PassthroughSubject<VisualAnalysis, Never>()

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private var pingTimer: Timer?
    private let baseURL: String
    private var sessionId: String?

    // MARK: - Initialization

    init(baseURL: String = "wss://personalizedoutput.com") {
        self.baseURL = baseURL
        super.init()
    }

    // MARK: - Connection Management

    func connect(sessionId: String, deviceId: String? = nil) {
        self.sessionId = sessionId

        // Get device ID - use provided or fall back to device identifier
        let actualDeviceId = deviceId ?? UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

        guard let url = URL(string: "\(baseURL)/ws/redi?sessionId=\(sessionId)&deviceId=\(actualDeviceId)") else {
            error = "Invalid WebSocket URL"
            return
        }

        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()

        receiveMessage()
        startPingTimer()

        print("[WebSocket] Connecting to \(url)")
    }

    func disconnect() {
        pingTimer?.invalidate()
        pingTimer = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        print("[WebSocket] Disconnected")
    }

    // MARK: - Sending Messages

    func sendAudioChunk(_ audioData: Data, format: String = "pcm", sampleRate: Int = 16000) {
        let base64Audio = audioData.base64EncodedString()

        let payload: [String: Any] = [
            "audio": base64Audio,
            "format": format,
            "sampleRate": sampleRate
        ]

        sendMessage(type: .audioChunk, payload: payload)
    }

    func sendSnapshot(_ imageData: Data, width: Int, height: Int) {
        let base64Image = imageData.base64EncodedString()

        let payload: [String: Any] = [
            "image": base64Image,
            "width": width,
            "height": height
        ]

        sendMessage(type: .snapshot, payload: payload)
    }

    func sendMotionClip(frames: [Data], duration: Int) {
        let base64Frames = frames.map { $0.base64EncodedString() }

        let payload: [String: Any] = [
            "frames": base64Frames,
            "duration": duration
        ]

        sendMessage(type: .motionClip, payload: payload)
    }

    func updateSensitivity(_ sensitivity: Double) {
        sendMessage(type: .sensitivityUpdate, payload: ["sensitivity": sensitivity])
    }

    func updateAudioOutputMode(_ mode: AudioOutputMode) {
        sendMessage(type: .audioOutputModeChanged, payload: ["mode": mode.rawValue])
    }

    func endSession() {
        sendMessage(type: .sessionEnd, payload: nil)
        disconnect()
    }

    // MARK: - Private Methods

    private func sendMessage(type: WSMessageType, payload: [String: Any]?) {
        guard let sessionId = sessionId else { return }

        var message: [String: Any] = [
            "type": type.rawValue,
            "sessionId": sessionId,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000)
        ]

        if let payload = payload {
            message["payload"] = payload
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: message)
            if let string = String(data: data, encoding: .utf8) {
                webSocketTask?.send(.string(string)) { error in
                    if let error = error {
                        print("[WebSocket] Send error: \(error)")
                    }
                }
            }
        } catch {
            print("[WebSocket] Serialization error: \(error)")
        }
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue receiving
                self.receiveMessage()

            case .failure(let error):
                print("[WebSocket] Receive error: \(error)")
                DispatchQueue.main.async {
                    self.isConnected = false
                    self.error = error.localizedDescription
                }
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let type = json?["type"] as? String,
                  let messageType = WSMessageType(rawValue: type) else {
                return
            }

            let payload = json?["payload"] as? [String: Any]

            DispatchQueue.main.async {
                self.processMessage(type: messageType, payload: payload)
            }
        } catch {
            print("[WebSocket] Parse error: \(error)")
        }
    }

    private func processMessage(type: WSMessageType, payload: [String: Any]?) {
        switch type {
        case .sessionStart:
            isConnected = true
            if let remaining = payload?["remainingSeconds"] as? Int {
                remainingSeconds = remaining
            }

        case .transcript:
            if let text = payload?["text"] as? String {
                let chunk = TranscriptChunk(
                    text: text,
                    isFinal: payload?["isFinal"] as? Bool ?? false,
                    confidence: payload?["confidence"] as? Double ?? 0,
                    timestamp: payload?["timestamp"] as? Int ?? 0
                )
                lastTranscript = chunk
                transcriptReceived.send(chunk)
            }

        case .aiResponse:
            if let text = payload?["text"] as? String {
                let response = AIResponse(
                    text: text,
                    isStreaming: payload?["isStreaming"] as? Bool ?? false,
                    isFinal: payload?["isFinal"] as? Bool ?? true
                )
                lastAIResponse = response
                aiResponseReceived.send(response)
            }

        case .voiceAudio:
            if let audioBase64 = payload?["audio"] as? String,
               let audioData = Data(base64Encoded: audioBase64) {
                audioReceived.send(audioData)
            }

        case .visualAnalysis:
            if let description = payload?["description"] as? String {
                let analysis = VisualAnalysis(
                    description: description,
                    detectedObjects: payload?["detectedObjects"] as? [String] ?? [],
                    textContent: payload?["textContent"] as? [String] ?? [],
                    suggestions: payload?["suggestions"] as? [String] ?? [],
                    timestamp: payload?["timestamp"] as? Int ?? 0
                )
                lastVisualAnalysis = analysis
                visualAnalysisReceived.send(analysis)
            }

        case .pong:
            if let remaining = payload?["remainingSeconds"] as? Int {
                remainingSeconds = remaining
            }

        case .error:
            if let errorMsg = payload?["message"] as? String {
                error = errorMsg
            }

        default:
            break
        }
    }

    private func startPingTimer() {
        pingTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.sendMessage(type: .ping, payload: nil)
        }
    }
}

// MARK: - URLSessionWebSocketDelegate

extension WebSocketService: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        print("[WebSocket] Connected")
        DispatchQueue.main.async {
            self.isConnected = true
        }
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        print("[WebSocket] Closed with code: \(closeCode)")
        DispatchQueue.main.async {
            self.isConnected = false
        }
    }
}
