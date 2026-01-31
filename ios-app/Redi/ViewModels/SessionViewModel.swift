/**
 * SessionViewModel.swift
 *
 * Manages the active Redi session, coordinating all services.
 * CRITICAL: Uses RediWebSocketService to connect to V7 server.
 * 
 * OPTIMIZATION (Jan 24, 2026): Pre-establish WebSocket connection
 * - Connection starts immediately when SessionViewModel is created
 * - Saves ~100-200ms on first voice interaction
 */

import Foundation
import UIKit
import Combine
import AVFoundation

class SessionViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var session: RediSession
    @Published var remainingSeconds: Int
    @Published var sensitivity: Double
    @Published var isMuted: Bool = false
    @Published var isPaused: Bool = false
    @Published var showingSensitivitySlider: Bool = false
    @Published var showingEndAlert: Bool = false
    @Published var showingAudioSettings: Bool = false

    @Published var currentTranscript: String?
    @Published var currentAIResponse: String?
    @Published var currentVisualContext: String?
    
    // MARK: - Autonomous Mode Properties (required by SessionView)
    
    @Published var isAutonomousMode: Bool = false
    @Published var detectedMode: RediMode = .general
    @Published var detectedActivity: String? = nil
    @Published var modeConfidence: Double = 0.0
    @Published var modeComfort: Double = 0.5
    @Published var frequencyPreference: Double = 0.5

    // MARK: - Services

    let cameraService = CameraService()
    let audioService = AudioService()
    let motionService = MotionService()
    
    // CRITICAL: Use RediWebSocketService (connects to V7 server at redialways.com)
    // NOT WebSocketService (which connects to wrong server personalizedoutput.com)
    let webSocketService: RediWebSocketService

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()
    private var timer: Timer?
    private var snapshotTimer: Timer?

    // MARK: - Computed Properties

    var formattedTime: String {
        let minutes = remainingSeconds / 60
        let seconds = remainingSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var sensitivityLabel: String {
        if sensitivity < 0.33 {
            return "Passive"
        } else if sensitivity < 0.67 {
            return "Balanced"
        } else {
            return "Active"
        }
    }

    var sensitivityDescription: String {
        if sensitivity < 0.33 {
            return "Redi only speaks when asked or spots a clear error"
        } else if sensitivity < 0.67 {
            return "Redi speaks during natural pauses when helpful"
        } else {
            return "Redi is proactive with suggestions and observations"
        }
    }

    // MARK: - Initialization

    init(session: RediSession) {
        self.session = session
        self.remainingSeconds = session.remainingSeconds
        self.sensitivity = session.sensitivity
        
        // Initialize RediWebSocketService - uses RediConfig.serverURL
        self.webSocketService = RediWebSocketService()
        
        print("[Session] Initialized with RediWebSocketService")
        print("[Session] Server URL: \(RediConfig.serverURL)")

        setupBindings()
        
        // ═══════════════════════════════════════════════════════════════════════
        // OPTIMIZATION: Pre-establish WebSocket connection immediately!
        // This saves ~100-200ms on first voice interaction by establishing
        // the TCP connection and OpenAI session BEFORE the user starts speaking.
        // ═══════════════════════════════════════════════════════════════════════
        if !session.id.hasPrefix("test-") {
            print("[Session] 🚀 PRE-ESTABLISHING connection to: \(RediConfig.serverURL)")
            webSocketService.connect()
        }
    }

    // MARK: - Setup

    private func setupBindings() {
        // MARK: - RediWebSocketService Bindings
        
        // Audio received from server
        webSocketService.onAudioReceived = { [weak self] audioData in
            self?.audioService.playAudio(audioData)
        }
        
        // Transcript received (user or assistant)
        webSocketService.onTranscriptReceived = { [weak self] text, role in
            DispatchQueue.main.async {
                if role == "user" {
                    self?.currentTranscript = text
                    // Clear after delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        if self?.currentTranscript == text {
                            self?.currentTranscript = nil
                        }
                    }
                } else {
                    self?.currentAIResponse = text
                    // Clear after delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                        if self?.currentAIResponse == text {
                            self?.currentAIResponse = nil
                        }
                    }
                }
            }
        }
        
        // Session ready
        webSocketService.onSessionReady = { [weak self] in
            print("[Session] ✅ WebSocket session ready")
            // Send initial frame immediately when session is ready
            self?.captureAndSendFrame()
        }
        
        // Mic mute control from server
        webSocketService.onMicMuteChanged = { [weak self] muted in
            DispatchQueue.main.async {
                if muted {
                    self?.audioService.stopRecording()
                } else {
                    self?.audioService.startRecording()
                }
            }
        }
        
        // Stop audio playback (barge-in)
        webSocketService.onStopAudio = { [weak self] in
            self?.audioService.stopPlayback()
        }
        
        // Server requests fresh frame - CRITICAL for vision!
        webSocketService.onRequestFrame = { [weak self] in
            print("[Session] 📷 Server requested fresh frame")
            self?.captureAndSendFrame()
        }
        
        // MARK: - Audio Service Bindings
        
        // Audio capture -> send to server
        audioService.audioChunkCaptured
            .sink { [weak self] audioData in
                self?.webSocketService.sendAudio(audioData)
            }
            .store(in: &cancellables)

        // MARK: - Camera Service Bindings
        
        // Camera snapshot -> send to server (full quality, no downscaling!)
        cameraService.snapshotCaptured
            .sink { [weak self] imageData in
                guard let self = self else { return }
                let sizeKB = imageData.count / 1024
                print("[Session] 📷 Sending frame: \(sizeKB)KB")
                self.webSocketService.sendFrame(imageData)
            }
            .store(in: &cancellables)

        // Motion clip capture (if needed)
        cameraService.motionClipCaptured
            .sink { (frames, duration) in
                // Motion clips not currently used in V7
                print("[Session] Motion clip captured: \(frames.count) frames")
            }
            .store(in: &cancellables)

        // Motion detection -> trigger camera
        motionService.significantMotionDetected
            .sink { [weak self] in
                self?.cameraService.startMotionClipCapture()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Frame Capture
    
    /// Capture and send a frame immediately
    private func captureAndSendFrame() {
        cameraService.captureSnapshot()
    }

    // MARK: - Session Control

    func startSession() {
        print("[Session] 🚀 Starting session...")
        
        // IMPORTANT: Start countdown timer FIRST (most critical for UX)
        startTimer()

        // WebSocket should already be connected (pre-established in init)
        // But reconnect if not connected
        if !webSocketService.isConnected && !session.id.hasPrefix("test-") {
            print("[Session] WebSocket not connected, reconnecting...")
            webSocketService.connect()
        } else if session.id.hasPrefix("test-") {
            print("[Session] Test session - skipping WebSocket")
        } else {
            print("[Session] ✅ WebSocket already connected (pre-established)")
        }

        // Request camera permission and start
        requestCameraAndStart()

        // Request microphone permission and start
        requestMicrophoneAndStart()

        // Start motion detection if mode uses it
        if session.mode.usesMotionDetection {
            motionService.startMonitoring()
        }
    }

    private func requestCameraAndStart() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            guard granted else {
                print("[Session] ❌ Camera permission denied")
                return
            }

            DispatchQueue.main.async {
                self?.cameraService.start()

                // Setup periodic snapshots - 5 second interval for background updates
                // Server will request fresh frames when needed for responses
                self?.cameraService.startPeriodicSnapshots(intervalMs: 5000)
                print("[Session] ✅ Camera started with 5s periodic snapshots")
            }
        }
    }

    private func requestMicrophoneAndStart() {
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
            guard granted else {
                print("[Session] ❌ Microphone permission denied")
                return
            }

            DispatchQueue.main.async {
                self?.audioService.startRecording()
                print("[Session] ✅ Microphone started")
            }
        }
    }

    func endSession() {
        print("[Session] Ending session...")
        
        // Stop timer
        timer?.invalidate()
        timer = nil

        // Stop services
        cameraService.stop()
        audioService.cleanup()
        motionService.stopMonitoring()

        // Disconnect WebSocket
        webSocketService.disconnect()
        
        print("[Session] Session ended")
    }

    func toggleMute() {
        isMuted.toggle()

        if isMuted {
            audioService.stopRecording()
        } else {
            audioService.startRecording()
        }
    }

    func togglePause() {
        isPaused.toggle()

        if isPaused {
            cameraService.stopSnapshotTimer()
            audioService.stopRecording()
            motionService.stopMonitoring()
        } else {
            cameraService.startPeriodicSnapshots(intervalMs: 5000)
            audioService.startRecording()
            if session.mode.usesMotionDetection {
                motionService.startMonitoring()
            }
        }
    }

    func switchCamera() {
        cameraService.switchCamera()
    }

    func updateSensitivity() {
        webSocketService.sendSensitivity(sensitivity)
    }
    
    // MARK: - Autonomous Mode Methods (required by SessionView)
    
    func updateAudioOutputMode(_ mode: AudioOutputMode) {
        session.audioOutputMode = mode
        // TODO: Send to server if needed
    }
    
    func updateAutonomousSettings() {
        // Stub - autonomous mode settings
    }

    // MARK: - Private Methods

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            if self.remainingSeconds > 0 {
                self.remainingSeconds -= 1
            } else {
                self.endSession()
            }
        }
    }
}
