/**
 * RediWebRTCViewModel - ViewModel for WebRTC-based Redi sessions
 * 
 * This ViewModel manages the WebRTC connection to OpenAI's Realtime API
 * with built-in echo cancellation.
 * 
 * Usage:
 * ```swift
 * @StateObject private var viewModel = RediWebRTCViewModel()
 * 
 * // Connect
 * Task {
 *     try await viewModel.connect(mode: "general")
 * }
 * 
 * // Disconnect
 * viewModel.disconnect()
 * ```
 */

import Foundation
import SwiftUI
import Combine

@MainActor
class RediWebRTCViewModel: ObservableObject {
    
    // MARK: - Published State
    
    @Published var isConnected = false
    @Published var isAssistantSpeaking = false
    @Published var connectionStatus: String = "Disconnected"
    @Published var lastUserTranscript: String = ""
    @Published var lastAssistantTranscript: String = ""
    @Published var errorMessage: String?
    @Published var transcripts: [TranscriptItem] = []
    
    struct TranscriptItem: Identifiable {
        let id = UUID()
        let text: String
        let role: String
        let timestamp: Date
    }
    
    // MARK: - Services
    
    private let webRTCService = RediWebRTCService()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Camera Integration (optional)
    
    var onFrameRequest: (() -> String?)?  // Returns base64 image
    
    // MARK: - Initialization
    
    init() {
        setupBindings()
    }
    
    private func setupBindings() {
        // Bind WebRTC service state to view model
        webRTCService.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnected)
        
        webRTCService.$isAssistantSpeaking
            .receive(on: DispatchQueue.main)
            .assign(to: &$isAssistantSpeaking)
        
        webRTCService.$connectionStatus
            .receive(on: DispatchQueue.main)
            .map { $0.rawValue }
            .assign(to: &$connectionStatus)
        
        // Handle transcripts
        webRTCService.onTranscript = { [weak self] text, role in
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
        
        // Handle errors
        webRTCService.onError = { [weak self] error in
            Task { @MainActor in
                self?.errorMessage = error
            }
        }
    }
    
    // MARK: - Public Methods
    
    /// Connect to OpenAI Realtime API via WebRTC
    func connect(mode: String = "general", voice: String = "alloy") async throws {
        errorMessage = nil
        try await webRTCService.connect(mode: mode, voice: voice)
    }
    
    /// Disconnect from WebRTC
    func disconnect() {
        webRTCService.disconnect()
        transcripts.removeAll()
    }
    
    /// Send a text message
    func sendText(_ text: String) {
        webRTCService.sendText(text)
    }
    
    /// Send a camera frame with optional prompt
    func sendFrame(prompt: String? = nil) {
        guard let frame = onFrameRequest?() else {
            print("[WebRTC ViewModel] No frame available")
            return
        }
        webRTCService.sendFrame(frame, withPrompt: prompt)
    }
    
    /// Request assistant to describe what it sees
    func describeScene() {
        guard let frame = onFrameRequest?() else {
            print("[WebRTC ViewModel] No frame available")
            return
        }
        webRTCService.sendFrame(frame, withPrompt: "Briefly describe what you see.")
    }
    
    /// Cancel current response (barge-in)
    func cancelResponse() {
        webRTCService.cancelResponse()
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
