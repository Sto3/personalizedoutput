/**
 * LocalTTSService.swift
 *
 * MILITARY-GRADE FALLBACK: Local text-to-speech using iOS AVSpeechSynthesizer.
 * Used when cloud TTS (ElevenLabs) is unavailable.
 *
 * Quality is slightly lower than ElevenLabs, but ensures Redi can ALWAYS speak.
 * This is graceful degradation - users should barely notice the difference.
 */

import AVFoundation
import Combine

class LocalTTSService: NSObject, ObservableObject {
    // MARK: - Properties

    @Published var isSpeaking: Bool = false

    private let synthesizer = AVSpeechSynthesizer()
    private var currentUtterance: AVSpeechUtterance?

    // Voice settings (match Redi's personality - mature, calm, professional)
    private var voiceIdentifier: String = "com.apple.ttsbundle.Samantha-compact"  // Default female
    private var speechRate: Float = 0.52  // Slightly slower than default for clarity
    private var pitchMultiplier: Float = 0.95  // Slightly lower for maturity
    private var volume: Float = 1.0

    // Completion callback
    var onSpeechFinished: (() -> Void)?

    // MARK: - Initialization

    override init() {
        super.init()
        synthesizer.delegate = self
        selectBestVoice()
    }

    // MARK: - Voice Selection

    /// Select the best available voice for Redi's personality
    private func selectBestVoice() {
        // Prefer premium/enhanced voices if available
        let preferredVoices = [
            "com.apple.voice.premium.en-US.Zoe",      // Premium female (if downloaded)
            "com.apple.voice.enhanced.en-US.Samantha", // Enhanced female
            "com.apple.voice.enhanced.en-US.Allison",  // Enhanced female
            "com.apple.ttsbundle.Samantha-compact",    // Default female
        ]

        let availableVoices = AVSpeechSynthesisVoice.speechVoices()

        for preferredId in preferredVoices {
            if let voice = availableVoices.first(where: { $0.identifier == preferredId }) {
                voiceIdentifier = voice.identifier
                print("[LocalTTS] Selected voice: \(voice.name) (\(voice.identifier))")
                return
            }
        }

        // Fallback to any English female voice
        if let englishVoice = availableVoices.first(where: {
            $0.language.starts(with: "en") && $0.gender == .female
        }) {
            voiceIdentifier = englishVoice.identifier
            print("[LocalTTS] Fallback voice: \(englishVoice.name)")
        }
    }

    // MARK: - Public API

    /// Speak text using local iOS TTS
    /// - Parameters:
    ///   - text: The text to speak
    ///   - completion: Optional callback when speech finishes
    func speak(_ text: String, completion: (() -> Void)? = nil) {
        // Stop any current speech
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        onSpeechFinished = completion

        let utterance = AVSpeechUtterance(string: text)

        // Apply voice settings
        if let voice = AVSpeechSynthesisVoice(identifier: voiceIdentifier) {
            utterance.voice = voice
        } else if let defaultVoice = AVSpeechSynthesisVoice(language: "en-US") {
            utterance.voice = defaultVoice
        }

        utterance.rate = speechRate
        utterance.pitchMultiplier = pitchMultiplier
        utterance.volume = volume

        // Add slight pre/post delay for natural feel
        utterance.preUtteranceDelay = 0.1
        utterance.postUtteranceDelay = 0.1

        currentUtterance = utterance

        DispatchQueue.main.async {
            self.isSpeaking = true
        }

        synthesizer.speak(utterance)
        print("[LocalTTS] Speaking: \"\(text.prefix(50))...\"")
    }

    /// Stop any current speech
    func stop() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
    }

    /// Update voice gender (to match user preference)
    func setVoiceGender(_ gender: VoiceGender) {
        let availableVoices = AVSpeechSynthesisVoice.speechVoices()
        let targetGender: AVSpeechSynthesisVoiceGender = gender == .female ? .female : .male

        // Prefer premium/enhanced voices
        let premiumVoice = availableVoices.first {
            $0.language.starts(with: "en") &&
            $0.gender == targetGender &&
            ($0.identifier.contains("premium") || $0.identifier.contains("enhanced"))
        }

        if let voice = premiumVoice {
            voiceIdentifier = voice.identifier
            print("[LocalTTS] Updated to \(gender) voice: \(voice.name)")
            return
        }

        // Fallback to any matching gender voice
        if let voice = availableVoices.first(where: {
            $0.language.starts(with: "en") && $0.gender == targetGender
        }) {
            voiceIdentifier = voice.identifier
            print("[LocalTTS] Updated to \(gender) voice: \(voice.name)")
        }
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension LocalTTSService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = true
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.onSpeechFinished?()
            self.onSpeechFinished = nil
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
    }
}
