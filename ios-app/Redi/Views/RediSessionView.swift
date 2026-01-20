/**
 * RediSessionView.swift
 *
 * Main session view for Redi.
 * Uses production services (RediWebSocketService, RediAudioService).
 * NO VERSION NUMBERS - this is the production view.
 */

import SwiftUI
import AVFoundation

struct RediSessionView: View {
    // MARK: - Services
    
    @StateObject private var cameraService = CameraService()
    @StateObject private var audioService = RediAudioService()
    @StateObject private var webSocketService = RediWebSocketService()
    
    // MARK: - State
    
    @State private var isConnected = false
    @State private var isConnecting = false
    @State private var currentTranscript: String?
    @State private var currentResponse: String?
    @State private var errorMessage: String?
    @State private var isMuted = false
    @State private var currentMode: RediMode = .general
    
    // MARK: - Environment
    
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - Body
    
    var body: some View {
        ZStack {
            // Camera preview
            CameraPreviewView(previewLayer: cameraService.previewLayer)
                .ignoresSafeArea()
            
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
                    
                    // Connection status
                    HStack(spacing: 8) {
                        Circle()
                            .fill(isConnected ? Color.green : (isConnecting ? Color.yellow : Color.red))
                            .frame(width: 12, height: 12)
                        Text(isConnected ? "Connected" : (isConnecting ? "Connecting..." : "Disconnected"))
                            .font(.caption)
                            .foregroundColor(.white)
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
                            Image(systemName: currentMode.iconName)
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
        
        // Setup WebSocket callbacks
        setupWebSocketCallbacks()
        
        // Connect to server
        isConnecting = true
        webSocketService.connect()
        
        // Start camera
        cameraService.start()
        cameraService.startPeriodicSnapshots(intervalMs: Int(RediConfig.Camera.staticFrameInterval * 1000))
        
        // Start audio
        audioService.startRecording()
        
        // Setup bindings
        setupServiceBindings()
    }
    
    private func endSession() {
        print("[RediSession] Ending session...")
        webSocketService.disconnect()
        cameraService.stop()
        audioService.cleanup()
    }
    
    private func setupWebSocketCallbacks() {
        webSocketService.onSessionReady = { [self] in
            DispatchQueue.main.async {
                self.isConnected = true
                self.isConnecting = false
                self.errorMessage = nil
            }
        }
        
        webSocketService.onAudioReceived = { [self] data in
            self.audioService.playAudio(data)
        }
        
        webSocketService.onTranscriptReceived = { [self] text, role in
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
        
        webSocketService.onMicMuteChanged = { [self] muted in
            self.audioService.setMuted(muted)
        }
        
        webSocketService.onStopAudio = { [self] in
            self.audioService.stopPlayback()
        }
        
        webSocketService.onRequestFrame = { [self] in
            // Server requested a fresh frame
            self.cameraService.captureSnapshot()
        }
        
        webSocketService.onError = { [self] error in
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
    
    @State private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Actions
    
    private func toggleMute() {
        isMuted.toggle()
        audioService.setMuted(isMuted)
    }
    
    private func changeMode(_ mode: RediMode) {
        currentMode = mode
        webSocketService.sendMode(mode.rawValue)
    }
}

// MARK: - Camera Preview

struct CameraPreviewView: UIViewRepresentable {
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

// MARK: - Mode Extension

extension RediMode {
    var displayName: String {
        switch self {
        case .general: return "General"
        case .cooking: return "Cooking"
        case .studying: return "Studying"
        case .meeting: return "Meeting"
        case .sports: return "Sports"
        case .music: return "Music"
        case .assembly: return "Assembly"
        case .monitoring: return "Monitoring"
        case .driving: return "Driving"
        }
    }
    
    var iconName: String {
        switch self {
        case .general: return "sparkles"
        case .cooking: return "fork.knife"
        case .studying: return "book"
        case .meeting: return "person.3"
        case .sports: return "sportscourt"
        case .music: return "music.note"
        case .assembly: return "wrench.and.screwdriver"
        case .monitoring: return "eye"
        case .driving: return "car"
        }
    }
}

#Preview {
    RediSessionView()
}
