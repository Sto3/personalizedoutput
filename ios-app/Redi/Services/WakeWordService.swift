/**
 * WakeWordService.swift
 *
 * Detects "Hey Redi" or "Redi" wake phrases to auto-start sessions.
 * Uses Apple's Speech framework for on-device recognition.
 */

import Foundation
import Speech
import AVFoundation

@MainActor
class WakeWordService: ObservableObject {
    static let shared = WakeWordService()

    @Published var isListening = false
    @Published var detectedWakeWord = false
    @Published var error: String?

    // Wake phrases to detect
    private let wakePhrases = ["hey redi", "hey ready", "redi", "ready"]

    private var audioEngine: AVAudioEngine?
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?

    // Callback when wake word is detected
    var onWakeWordDetected: (() -> Void)?

    private init() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    }

    // MARK: - Authorization

    func requestAuthorization() async -> Bool {
        // Request speech recognition authorization
        let speechStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }

        guard speechStatus == .authorized else {
            error = "Speech recognition not authorized"
            return false
        }

        // Request microphone authorization
        let micStatus = await AVAudioApplication.requestRecordPermission()

        guard micStatus else {
            error = "Microphone access not authorized"
            return false
        }

        return true
    }

    // MARK: - Start/Stop Listening

    func startListening() async {
        guard !isListening else { return }

        // Check authorization
        let authorized = await requestAuthorization()
        guard authorized else { return }

        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            error = "Speech recognizer not available"
            return
        }

        do {
            try await startRecognition()
            isListening = true
            error = nil
            print("[WakeWord] Started listening for wake word")
        } catch {
            self.error = "Failed to start: \(error.localizedDescription)"
            print("[WakeWord] Failed to start: \(error)")
        }
    }

    func stopListening() {
        recognitionTask?.cancel()
        recognitionTask = nil

        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        isListening = false
        print("[WakeWord] Stopped listening")
    }

    // MARK: - Recognition

    private func startRecognition() async throws {
        // Cancel any existing task
        recognitionTask?.cancel()
        recognitionTask = nil

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        // Create audio engine
        audioEngine = AVAudioEngine()
        guard let audioEngine = audioEngine else {
            throw WakeWordError.audioEngineUnavailable
        }

        let inputNode = audioEngine.inputNode

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw WakeWordError.requestCreationFailed
        }

        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = true  // Privacy: on-device only

        // Start recognition task
        guard let recognizer = speechRecognizer else {
            throw WakeWordError.recognizerUnavailable
        }

        recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                let transcription = result.bestTranscription.formattedString.lowercased()

                // Check for wake phrases
                for phrase in self.wakePhrases {
                    if transcription.contains(phrase) {
                        Task { @MainActor in
                            self.handleWakeWordDetected()
                        }
                        return
                    }
                }
            }

            if let error = error {
                print("[WakeWord] Recognition error: \(error)")

                // Restart listening if it was an interruption
                if (error as NSError).code == 1 || (error as NSError).code == 203 {
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 500_000_000)  // 0.5s delay
                        if self.isListening {
                            try? await self.startRecognition()
                        }
                    }
                }
            }
        }

        // Install audio tap
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()
    }

    private func handleWakeWordDetected() {
        guard !detectedWakeWord else { return }

        detectedWakeWord = true
        print("[WakeWord] Wake word detected!")

        // Provide haptic feedback
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)

        // Stop listening and trigger callback
        stopListening()
        onWakeWordDetected?()

        // Reset detection flag after a delay
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)  // 2s cooldown
            detectedWakeWord = false
        }
    }
}

// MARK: - Errors

enum WakeWordError: Error, LocalizedError {
    case audioEngineUnavailable
    case requestCreationFailed
    case recognizerUnavailable
    case notAuthorized

    var errorDescription: String? {
        switch self {
        case .audioEngineUnavailable:
            return "Audio engine not available"
        case .requestCreationFailed:
            return "Failed to create recognition request"
        case .recognizerUnavailable:
            return "Speech recognizer not available"
        case .notAuthorized:
            return "Speech recognition not authorized"
        }
    }
}

// MARK: - Wake Word Handler Protocol

protocol WakeWordHandler {
    func onWakeWordDetected() async
}

/**
 * Usage example:
 *
 * class MyViewController: UIViewController, WakeWordHandler {
 *     let wakeWordService = WakeWordService.shared
 *
 *     override func viewDidLoad() {
 *         super.viewDidLoad()
 *         wakeWordService.onWakeWordDetected = { [weak self] in
 *             Task {
 *                 await self?.onWakeWordDetected()
 *             }
 *         }
 *     }
 *
 *     func onWakeWordDetected() async {
 *         // Check subscription status and start session
 *         let balance = await checkMinuteBalance()
 *         if balance.canStart {
 *             await startSession()
 *         } else if balance.hasSubscription {
 *             // Prompt for overage purchase
 *             showOveragePrompt()
 *         } else {
 *             // Prompt for try purchase
 *             showTryPrompt()
 *         }
 *     }
 * }
 */
