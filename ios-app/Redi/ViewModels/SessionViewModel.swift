/**
 * SessionViewModel.swift
 *
 * Manages the active Redi session, coordinating all services.
 */

import Foundation
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

    // MARK: - Services

    let cameraService = CameraService()
    let audioService = AudioService()
    let motionService = MotionService()
    let perceptionService = PerceptionService()  // Military-grade perception
    let webSocketService: WebSocketService

    // MARK: - Military-Grade Mode

    /// Enable military-grade architecture (structured perception data vs raw frames)
    /// Set to true for 10x faster, more reliable responses
    @Published var useMilitaryGrade: Bool = true

    /// Rep counter from perception service
    @Published var repCount: Int = 0

    /// Current movement phase
    @Published var movementPhase: String = "rest"

    // MARK: - Autonomous Mode Detection

    /// Whether Redi is in autonomous mode (figuring out what user is doing)
    @Published var isAutonomousMode: Bool = false

    /// The currently detected/active mode (may differ from session.mode if autonomous)
    @Published var detectedMode: RediMode = .general

    /// Confidence in the detected mode (0-1)
    @Published var modeConfidence: Float = 0.0

    /// Human-readable description of what Redi thinks user is doing
    @Published var detectedActivity: String?

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
        self.webSocketService = WebSocketService()

        setupBindings()
    }

    // MARK: - Setup

    private func setupBindings() {
        // WebSocket bindings
        webSocketService.$remainingSeconds
            .receive(on: DispatchQueue.main)
            .assign(to: &$remainingSeconds)

        webSocketService.transcriptReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] chunk in
                self?.currentTranscript = chunk.text
                // Clear after delay if final
                if chunk.isFinal {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        if self?.currentTranscript == chunk.text {
                            self?.currentTranscript = nil
                        }
                    }
                }
            }
            .store(in: &cancellables)

        webSocketService.aiResponseReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.currentAIResponse = response.text
                // Clear after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    if self?.currentAIResponse == response.text {
                        self?.currentAIResponse = nil
                    }
                }
            }
            .store(in: &cancellables)

        webSocketService.visualAnalysisReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] analysis in
                // Show brief summary
                self?.currentVisualContext = analysis.description.prefix(100).description
            }
            .store(in: &cancellables)

        webSocketService.audioReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] audioData in
                self?.audioService.playAudio(audioData)
            }
            .store(in: &cancellables)

        // Audio capture binding
        audioService.audioChunkCaptured
            .sink { [weak self] audioData in
                self?.webSocketService.sendAudioChunk(audioData)
            }
            .store(in: &cancellables)

        // Camera snapshot binding
        cameraService.snapshotCaptured
            .sink { [weak self] imageData in
                guard let self = self else { return }
                self.webSocketService.sendSnapshot(imageData, width: 720, height: 1280)
            }
            .store(in: &cancellables)

        // Motion clip binding
        cameraService.motionClipCaptured
            .sink { [weak self] (frames, duration) in
                self?.webSocketService.sendMotionClip(frames: frames, duration: duration)
            }
            .store(in: &cancellables)

        // Motion detection binding
        motionService.significantMotionDetected
            .sink { [weak self] in
                self?.cameraService.startMotionClipCapture()
            }
            .store(in: &cancellables)

        // MARK: - Military-Grade Perception Bindings

        // Perception packet → WebSocket (structured data)
        perceptionService.perceptionCaptured
            .sink { [weak self] packet in
                guard let self = self, self.useMilitaryGrade else { return }
                self.webSocketService.sendPerception(packet)
            }
            .store(in: &cancellables)

        // Rep counter updates
        perceptionService.repCompleted
            .receive(on: DispatchQueue.main)
            .sink { [weak self] count in
                self?.repCount = count
            }
            .store(in: &cancellables)

        // Movement phase updates
        perceptionService.$movementPhase
            .receive(on: DispatchQueue.main)
            .map { $0.rawValue }
            .assign(to: &$movementPhase)

        // Form alerts
        perceptionService.formAlert
            .receive(on: DispatchQueue.main)
            .sink { [weak self] alertType in
                // Could show UI alert or just let backend handle it
                print("[Session] Form alert: \(alertType)")
            }
            .store(in: &cancellables)

        // MARK: - Autonomous Mode Detection Bindings

        // Mode changes from perception service
        perceptionService.modeChanged
            .receive(on: DispatchQueue.main)
            .sink { [weak self] newMode in
                guard let self = self, self.isAutonomousMode else { return }
                self.detectedMode = newMode
                // Notify backend of mode change
                self.webSocketService.sendModeChange(newMode)
                print("[Session] Mode changed to: \(newMode)")
            }
            .store(in: &cancellables)

        // Mode confidence updates
        perceptionService.$modeConfidence
            .receive(on: DispatchQueue.main)
            .assign(to: &$modeConfidence)

        // Detected mode updates
        perceptionService.$currentMode
            .receive(on: DispatchQueue.main)
            .assign(to: &$detectedMode)

        // Context hypothesis updates (what user is doing)
        perceptionService.$contextHypothesis
            .receive(on: DispatchQueue.main)
            .compactMap { $0?.activity }
            .assign(to: &$detectedActivity)
    }

    // MARK: - Session Control

    func startSession() {
        // IMPORTANT: Start countdown timer FIRST (most critical for UX)
        startTimer()

        // Connect WebSocket (async, non-blocking)
        // Skip WebSocket for test sessions
        if !session.id.hasPrefix("test-") {
            webSocketService.connect(sessionId: session.id)
        }

        // Request camera permission and start
        requestCameraAndStart()

        // Request microphone permission and start
        requestMicrophoneAndStart()

        // Start motion detection if mode uses it
        if session.mode.usesMotionDetection {
            motionService.startMonitoring()
        }

        // Start military-grade perception if enabled
        if useMilitaryGrade {
            let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

            // Determine if autonomous mode (user selected "Use Redi for Anything")
            let autonomous = session.mode == .general
            isAutonomousMode = autonomous
            detectedMode = session.mode

            perceptionService.start(
                sessionId: session.id,
                deviceId: deviceId,
                mode: session.mode,
                autonomous: autonomous,
                intervalMs: 500  // 2 FPS for perception
            )

            if autonomous {
                print("[Session] Military-grade perception started in AUTONOMOUS mode")
            } else {
                print("[Session] Military-grade perception started in \(session.mode) mode")
            }
        }
    }

    private func requestCameraAndStart() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            guard granted else {
                print("[Session] Camera permission denied")
                return
            }

            DispatchQueue.main.async {
                self?.cameraService.start()

                // Setup periodic snapshots if mode uses them
                if let interval = self?.session.mode.snapshotIntervalMs, interval > 0 {
                    self?.cameraService.startPeriodicSnapshots(intervalMs: interval)
                }
            }
        }
    }

    private func requestMicrophoneAndStart() {
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
            guard granted else {
                print("[Session] Microphone permission denied")
                return
            }

            DispatchQueue.main.async {
                self?.audioService.startRecording()
            }
        }
    }

    func endSession() {
        // Stop timer
        timer?.invalidate()
        timer = nil

        // Stop services
        cameraService.stop()
        audioService.cleanup()
        motionService.stopMonitoring()

        // Stop military-grade perception
        if useMilitaryGrade {
            perceptionService.stop()
            print("[Session] Military-grade perception stopped")
        }

        // Disconnect WebSocket
        webSocketService.endSession()
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
            let interval = session.mode.snapshotIntervalMs
            if interval > 0 {
                cameraService.startPeriodicSnapshots(intervalMs: interval)
            }
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
        webSocketService.updateSensitivity(sensitivity)
    }

    func updateAudioOutputMode(_ mode: AudioOutputMode) {
        session.audioOutputMode = mode
        webSocketService.updateAudioOutputMode(mode)
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
