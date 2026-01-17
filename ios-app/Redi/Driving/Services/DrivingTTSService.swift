/**
 * DrivingTTSService.swift
 *
 * On-device text-to-speech using AVSpeechSynthesizer.
 * Runs entirely FREE - no cloud API calls.
 * Used for driving mode alerts and navigation instructions.
 *
 * NOTE: This is separate from Services/LocalTTSService.swift
 * which is used as a fallback for cloud TTS. This service is
 * specifically optimized for driving mode with:
 * - Priority interrupt support
 * - Audio session configured for voice prompts
 * - Pause/resume support
 */

import AVFoundation

class DrivingTTSService: NSObject, ObservableObject {
    @Published var isSpeaking = false

    private let synthesizer = AVSpeechSynthesizer()
    private var currentUtterance: AVSpeechUtterance?

    // Callbacks
    var onSpeechStarted: (() -> Void)?
    var onSpeechFinished: (() -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
        setupAudioSession()
    }

    private func setupAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .voicePrompt, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
            try audioSession.setActive(true)
        } catch {
            print("[DrivingTTS] Audio session setup error: \(error)")
        }
    }

    // MARK: - Public Methods

    func speak(_ text: String, priority: Bool = false) {
        if priority && synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        let utterance = AVSpeechUtterance(string: text)

        // Configure voice for driving - clear, not too fast
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.52  // Slightly faster than default for driving context
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0
        utterance.preUtteranceDelay = 0.1
        utterance.postUtteranceDelay = 0.2

        currentUtterance = utterance
        synthesizer.speak(utterance)

        print("[DrivingTTS] Speaking: \(text)")
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    func pause() {
        synthesizer.pauseSpeaking(at: .word)
    }

    func resume() {
        synthesizer.continueSpeaking()
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension DrivingTTSService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = true
        }
        onSpeechStarted?()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
        onSpeechFinished?()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
        onSpeechFinished?()
    }
}
