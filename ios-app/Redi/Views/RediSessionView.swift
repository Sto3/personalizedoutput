/**
 * RediSessionView.swift
 *
 * Main session view for Redi.
 * Supports both WebRTC and WebSocket (V7) connections.
 * 
 * WebRTC is preferred for:
 * - Built-in echo cancellation (hardware AEC)
 * - Lower latency (direct peer connection)
 * - Better audio quality (Opus codec)
 * - Camera via WebRTC video track (no manual frame sending)
 * 
 * Updated: Feb 20, 2026 - Aligned with production RediWebRTCService API
 */

import SwiftUI
import AVFoundation
import Combine

struct RediSessionView: View {
    // MARK: - Services
    
    @StateObject private var cameraService = CameraService()
    @StateObject private var audioService = RediAudioService()
    
    // WebSocket service (V7 fallback)
    @StateObject private var webSocketService = RediWebSocketService()
    
    // WebRTC service (preferred - handles its own camera & audio)
    @StateObject private var webRTCService = RediWebRTCService()
    
    // MARK: - State
    
    @State private var isConnected = false
    @State private var isConnecting = false
    @State private var currentTranscript: String?
    @State private var currentResponse: String?
    @State private var errorMessage: String?
    @State private var isMuted = false
    @State private var currentMode: RediMode = .general
    @State private var cancellables = Set<AnyCancellable>()
    @State private var useWebRTC = false  // Will be set based on config
    
    // MARK: - Environment
    
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - Body
    
    var body: some View {
        ZStack {
            // Camera preview
            // When using WebRTC, camera is handled by the service's video track
            // When using WebSocket, use CameraService preview
            if !useWebRTC {
                RediCameraPreviewView(previewLayer: cameraService.previewLayer)
                    .ignoresSafeArea()
            } else {
                Color.black.ignoresSafeArea()
            }
            
            // Overlay content
            VStack {
                // Top bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    // Connection status with mode indicator
                    HStack(spacing: 8) {
                        Circle()
                            .fill(isConnected ? Color.green : (isConnecting ? Color.yellow : Color.red))
                            .frame(width: 12, height: 12)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(isConnected ? "Connected" : (isConnecting ? "Connecting..." : "Disconnected"))
                                .font(.caption)
                                .foregroundColor(.white)
                            Text(useWebRTC ? "WebRTC" : "WebSocket")
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(16)
                }
                .padding()
                
                Spacer()
                
                // Transcript/Response display
                VStack(spacing: 12) {
                    if let transcript = currentTranscript {
                        Text(transcript)
                            .font(.body)
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(12)
                    }
                    
                    if let response = currentResponse {
                        Text(response)
                            .font(.body)
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.blue.opacity(0.6))
                            .cornerRadius(12)
                    }
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
                
                // Bottom controls
                HStack(spacing: 40) {
                    // Mute button
                    Button(action: toggleMute) {
                        Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .frame(width: 60, height: 60)
                            .background(isMuted ? Color.red : Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                    
                    // Mode selector
                    Menu {
                        ForEach(RediMode.allCases, id: \.self) { mode in
                            Button(action: { changeMode(mode) }) {
                                HStack {
                                    Text(mode.displayName)
                                    if mode == currentMode {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        VStack {
                            Image(systemName: currentMode.icon)
                                .font(.title2)
                            Text(currentMode.displayName)
                                .font(.caption)
                        }
                        .foregroundColor(.white)
                        .frame(width: 80, height: 60)
                        .background(Color.black.opacity(0.5))
                        .cornerRadius(12)
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .onAppear(perform: startSession)
        .onDisappear(perform: endSession)
    }
    
    // MARK: - Session Management
    
    private func startSession() {
        print("[RediSession] Starting session...")
        
        // Check if WebRTC is enabled in config
        useWebRTC = RediConfig.isWebRTCEnabled
        print("[RediSession] Using \(useWebRTC ? "WebRTC" : "WebSocket (V7)")")
        
        if useWebRTC {
            startWebRTCSession()
        } else {
            startWebSocketSession()
        }
    }
    
    private func startWebRTCSession() {
        print("[RediSession] \u{1F680} Starting WebRTC session...")
        
        isConnecting = true
        
        // Setup WebRTC callbacks BEFORE connecting
        webRTCService.onSessionReady = {
            DispatchQueue.main.async {
                self.isConnected = true
                self.isConnecting = false
                self.errorMessage = nil
                print("[RediSession] \u2705 WebRTC session ready!")
            }
        }
        
        webRTCService.onTranscriptReceived = { text, role in
            self.handleTranscript(text: text, role: role)
        }
        
        webRTCService.onPlaybackStarted = {
            // WebRTC handles echo cancellation internally via hardware AEC
            print("[RediSession] \u{1F50A} WebRTC playback started")
        }
        
        webRTCService.onPlaybackEnded = {
            print("[RediSession] \u{1F507} WebRTC playback ended")
        }
        
        webRTCService.onError = { error in
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                print("[RediSession] \u274C WebRTC error: \(error.localizedDescription)")
            }
        }
        
        // Note: WebRTC handles camera via its own video track
        // No need to manually send frames - the service sets up
        // RTCCameraVideoCapturer which streams directly to OpenAI
        
        // Connect!
        Task {
            do {
                try await webRTCService.connect()
                print("[RediSession] \u2705 WebRTC connected!")
            } catch {
                await MainActor.run {
                    print("[RediSession] \u274C WebRTC failed: \(error.localizedDescription)")
                    errorMessage = "WebRTC failed, trying WebSocket..."
                    isConnecting = false
                    
                    // Fall back to WebSocket if WebRTC fails
                    print("[RediSession] \u{1F504} Falling back to WebSocket")
                    useWebRTC = false
                    startWebSocketSession()
                }
            }
        }
    }
    
    private func startWebSocketSession() {
        print("[RediSession] Starting WebSocket session...")
        
        // Setup WebSocket callbacks
        setupWebSocketCallbacks()
        
        // Connect to server
        isConnecting = true
        webSocketService.connect()
        
        // Start audio (WebSocket needs explicit audio handling)
        audioService.startRecording()
        
        // Start camera (WebSocket needs manual frame capture)
        cameraService.start()
        cameraService.startPeriodicSnapshots(intervalMs: Int(RediConfig.Camera.staticFrameInterval * 1000))
        
        // Setup bindings
        setupServiceBindings()
    }
    
    private func endSession() {
        print("[RediSession] Ending session...")
        
        if useWebRTC {
            webRTCService.disconnect()
        } else {
            webSocketService.disconnect()
            audioService.cleanup()
            cameraService.stop()
        }
    }
    
    private func setupWebSocketCallbacks() {
        webSocketService.onSessionReady = {
            DispatchQueue.main.async {
                self.isConnected = true
                self.isConnecting = false
                self.errorMessage = nil
            }
        }
        
        webSocketService.onAudioReceived = { data in
            self.audioService.playAudio(data)
        }
        
        webSocketService.onTranscriptReceived = { text, role in
            self.handleTranscript(text: text, role: role)
        }
        
        webSocketService.onMicMuteChanged = { muted in
            self.audioService.setMuted(muted)
        }
        
        webSocketService.onStopAudio = {
            self.audioService.stopPlayback()
        }
        
        webSocketService.onRequestFrame = {
            // Server requested a fresh frame
            self.cameraService.captureSnapshot()
        }
        
        webSocketService.onError = { error in
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isConnected = false
                self.isConnecting = false
            }
        }
    }
    
    private func setupServiceBindings() {
        // Audio capture -> WebSocket
        audioService.audioCaptured
            .sink { [weak webSocketService] data in
                webSocketService?.sendAudio(data)
            }
            .store(in: &cancellables)
        
        // Camera snapshots -> WebSocket
        cameraService.snapshotCaptured
            .sink { [weak webSocketService] data in
                webSocketService?.sendFrame(data)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Shared Handlers
    
    private func handleTranscript(text: String, role: String) {
        DispatchQueue.main.async {
            if role == "user" {
                self.currentTranscript = text
                // Clear after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    if self.currentTranscript == text {
                        self.currentTranscript = nil
                    }
                }
            } else {
                self.currentResponse = text
                // Clear after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    if self.currentResponse == text {
                        self.currentResponse = nil
                    }
                }
            }
        }
    }
    
    // MARK: - Actions
    
    private func toggleMute() {
        isMuted.toggle()
        
        if useWebRTC {
            webRTCService.setMicMuted(isMuted)
        } else {
            audioService.setMuted(isMuted)
        }
    }
    
    private func changeMode(_ mode: RediMode) {
        currentMode = mode
        
        if useWebRTC {
            // WebRTC: Mode is set at connection time via session config
            // Would need to reconnect to change mode
            print("[RediSession] Mode change requires reconnect in WebRTC mode")
        } else {
            webSocketService.sendMode(mode.rawValue)
        }
    }
}

// MARK: - Redi Camera Preview (unique name to avoid conflict)

struct RediCameraPreviewView: UIViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer?
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .black
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            uiView.layer.sublayers?.forEach { $0.removeFromSuperlayer() }
            
            if let layer = previewLayer {
                layer.frame = uiView.bounds
                uiView.layer.addSublayer(layer)
            }
        }
    }
}

#Preview {
    RediSessionView()
}
