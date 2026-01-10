/**
 * SessionViewModel.swift
 *
 * Manages the active Redi session, coordinating all services.
 */

import Foundation
import Combine

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
    let webSocketService: WebSocketService

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
    }

    // MARK: - Session Control

    func startSession() {
        // Connect WebSocket
        webSocketService.connect(sessionId: session.id)

        // Start camera
        cameraService.start()

        // Start audio recording
        audioService.startRecording()

        // Setup periodic snapshots if mode uses them
        let interval = session.mode.snapshotIntervalMs
        if interval > 0 {
            cameraService.startPeriodicSnapshots(intervalMs: interval)
        }

        // Start motion detection if mode uses it
        if session.mode.usesMotionDetection {
            motionService.startMonitoring()
        }

        // Start countdown timer
        startTimer()
    }

    func endSession() {
        // Stop timer
        timer?.invalidate()
        timer = nil

        // Stop services
        cameraService.stop()
        audioService.cleanup()
        motionService.stopMonitoring()

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
