/**
 * RediWebRTCViewModel - ViewModel for WebRTC-based Redi sessions
 * 
 * This ViewModel manages the WebRTC connection to OpenAI's Realtime API
 * with built-in echo cancellation.
 * 
 * IMPORTANT: This ViewModel is aligned with the actual RediWebRTCService API.
 * The service handles camera via WebRTC video track (not manual frame sending).
 * Audio goes through WebRTC audio track with hardware echo cancellation.
 * The data channel handles events (transcripts, session control).
 * 
 * Usage:
 * ```swift
 * @StateObject private var viewModel = RediWebRTCViewModel()
 * 
 * // Connect
 * Task {
 *     try await viewModel.connect()
 * }
 * 
 * // Disconnect
 * viewModel.disconnect()
 * ```
 *
 * Updated: Feb 20, 2026 - Aligned with production RediWebRTCService API
 */

import Foundation
import SwiftUI
import Combine

@MainActor
class RediWebRTCViewModel: ObservableObject {
    
    // MARK: - Published State
    
    @Published var isConnected = false
    @Published var isConnecting = false
    @Published var isActivated = false
    @Published var connectionStatus: String = "Disconnected"
    @Published var lastUserTranscript: String = ""
    @Published var lastAssistantTranscript: String = ""
    @Published var errorMessage: String?
    @Published var transcripts: [TranscriptItem] = []
    @Published var latencyMs: Int?
    
    struct TranscriptItem: Identifiable {
        let id = UUID()
        let text: String
        let role: String
        let timestamp: Date
    }
    
    // MARK: - Services
    
    let webRTCService = RediWebRTCService()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupBindings()
    }
    
    private func setupBindings() {
        // Bind WebRTC service published state to view model
        webRTCService.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnected)
        
        webRTCService.$isConnecting
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnecting)
        
        webRTCService.$isActivated
            .receive(on: DispatchQueue.main)
            .assign(to: &$isActivated)
        
        // Map connection state to readable string
        webRTCService.$connectionState
            .receive(on: DispatchQueue.main)
            .map { state -> String in
                switch state {
                case .new: return "Initializing"
                case .connecting: return "Connecting"
                case .connected: return "Connected"
                case .disconnected: return "Disconnected"
                case .failed: return "Failed"
                case .closed: return "Closed"
                @unknown default: return "Unknown"
                }
            }
            .assign(to: &$connectionStatus)
        
        // Handle transcripts via callback
        webRTCService.onTranscriptReceived = { [weak self] text, role in
            Task { @MainActor in
                let item = TranscriptItem(text: text, role: role, timestamp: Date())
                self?.transcripts.append(item)
                
                if role == "user" {
                    self?.lastUserTranscript = text
                } else {
                    self?.lastAssistantTranscript = text
                }
            }
        }
        
        // Handle errors via callback
        webRTCService.onError = { [weak self] error in
            Task { @MainActor in
                self?.errorMessage = error.localizedDescription
            }
        }
        
        // Handle latency measurements
        webRTCService.onLatencyMeasured = { [weak self] ms in
            Task { @MainActor in
                self?.latencyMs = ms
            }
        }
    }
    
    // MARK: - Public Methods
    
    /// Connect to OpenAI Realtime API via WebRTC
    /// Camera and audio are handled by WebRTC tracks (no manual sending needed)
    func connect() async throws {
        errorMessage = nil
        try await webRTCService.connect()
    }
    
    /// Disconnect from WebRTC
    func disconnect() {
        webRTCService.disconnect()
        transcripts.removeAll()
        latencyMs = nil
    }
    
    /// Send a text message via data channel
    func sendText(_ text: String) {
        webRTCService.send(message: [
            "type": "conversation.item.create",
            "item": [
                "type": "message",
                "role": "user",
                "content": [["type": "input_text", "text": text]]
            ]
        ])
        webRTCService.send(message: ["type": "response.create"])
    }
    
    /// Cancel current response (barge-in)
    func cancelResponse() {
        webRTCService.send(message: ["type": "response.cancel"])
    }
    
    /// Set microphone muted state
    func setMicMuted(_ muted: Bool) {
        webRTCService.setMicMuted(muted)
    }
    
    /// Set camera enabled/disabled
    func setVideoEnabled(_ enabled: Bool) {
        webRTCService.setVideoEnabled(enabled)
    }
    
    /// Update sensitivity (1-10)
    func setSensitivity(_ value: Int) {
        webRTCService.setSensitivity(value)
    }
    
    /// Clear transcript history
    func clearTranscripts() {
        transcripts.removeAll()
        lastUserTranscript = ""
        lastAssistantTranscript = ""
    }
}

// MARK: - Preview Provider

#if DEBUG
extension RediWebRTCViewModel {
    static var preview: RediWebRTCViewModel {
        let vm = RediWebRTCViewModel()
        vm.isConnected = true
        vm.connectionStatus = "Connected"
        vm.transcripts = [
            TranscriptItem(text: "Hello Redi!", role: "user", timestamp: Date()),
            TranscriptItem(text: "Hi there! How can I help you today?", role: "assistant", timestamp: Date())
        ]
        return vm
    }
}
#endif
