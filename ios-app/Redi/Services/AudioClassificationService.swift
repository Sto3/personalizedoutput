/**
 * AudioClassificationService.swift
 *
 * Audio Classification using Apple's SoundAnalysis Framework
 *
 * Classifies environmental sounds to understand context:
 * - Cooking sounds (sizzling, chopping, running water)
 * - Gym sounds (weights, exercise machines)
 * - Music (instruments, singing)
 * - Baby sounds (crying, cooing)
 * - Speech detection
 * - And 300+ other sound categories
 *
 * Uses Apple's built-in sound classifier (similar to YAMNet)
 * which runs entirely on-device with no API calls.
 */

import Foundation
import SoundAnalysis
import AVFoundation
import Combine

// MARK: - Audio Event Model

/// Represents a classified audio event
struct AudioEvent: Codable {
    let label: String
    let confidence: Float
    let timestamp: TimeInterval
    let category: String

    init(label: String, confidence: Float, category: String = "other") {
        self.label = label
        self.confidence = confidence
        self.timestamp = Date().timeIntervalSince1970 * 1000
        self.category = category
    }
}

// MARK: - Sound Category Mapping

/// Maps sound classifications to higher-level categories
private let soundCategoryMapping: [String: String] = [
    // Cooking/Kitchen
    "sizzle": "cooking",
    "frying": "cooking",
    "chopping": "cooking",
    "blender": "cooking",
    "microwave": "cooking",
    "water_tap_faucet": "cooking",
    "dishes_pots_pans": "cooking",
    "boiling": "cooking",

    // Gym/Exercise
    "weights": "gym",
    "exercise_machine": "gym",
    "treadmill": "gym",
    "grunting": "gym",
    "heavy_breathing": "gym",

    // Music
    "guitar": "music",
    "piano": "music",
    "drum": "music",
    "violin": "music",
    "singing": "music",
    "music": "music",
    "musical_instrument": "music",

    // Baby/Childcare
    "baby_crying": "baby",
    "child_crying": "baby",
    "baby_laughter": "baby",
    "child_speech": "baby",

    // Speech
    "speech": "speech",
    "conversation": "speech",
    "male_speech": "speech",
    "female_speech": "speech",

    // Alerts/Warnings
    "alarm": "alert",
    "siren": "alert",
    "smoke_detector": "alert",
    "glass_breaking": "alert",
    "doorbell": "alert",

    // Nature/Outdoors
    "bird": "outdoors",
    "dog_bark": "outdoors",
    "cat_meow": "outdoors",
    "rain": "outdoors",
    "thunder": "outdoors",
    "wind": "outdoors",

    // Vehicles/Traffic
    "car": "traffic",
    "car_horn": "traffic",
    "engine": "traffic",
    "traffic": "traffic"
]

/// Maps sound categories to suggested Redi modes
private let categoryToMode: [String: RediMode] = [
    "cooking": .cooking,
    "gym": .sports,
    "music": .music,
    "baby": .monitoring,
    "speech": .general
]

// MARK: - Audio Classification Service

class AudioClassificationService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var detectedSounds: [AudioEvent] = []
    @Published var dominantSound: String?
    @Published var speechDetected: Bool = false
    @Published var isRunning: Bool = false

    // MARK: - Publishers

    let audioEventsUpdated = PassthroughSubject<[AudioEvent], Never>()
    let significantSoundDetected = PassthroughSubject<AudioEvent, Never>()

    // MARK: - Private Properties

    private var analyzer: SNAudioStreamAnalyzer?
    private var classificationRequest: SNClassifySoundRequest?
    private let analysisQueue = DispatchQueue(label: "audio.classification", qos: .userInitiated)

    // Configuration
    private let confidenceThreshold: Float = 0.3
    private let maxEvents: Int = 10

    // Audio format
    private var audioFormat: AVAudioFormat?

    // MARK: - Initialization

    override init() {
        super.init()
    }

    // MARK: - Start/Stop

    /// Start audio classification with the given audio format
    func start(audioFormat: AVAudioFormat) {
        guard !isRunning else { return }

        self.audioFormat = audioFormat

        do {
            // Create the audio stream analyzer
            analyzer = SNAudioStreamAnalyzer(format: audioFormat)

            // Create a sound classification request using Apple's built-in classifier
            classificationRequest = try SNClassifySoundRequest(classifierIdentifier: .version1)
            classificationRequest?.windowDuration = CMTime(seconds: 1.0, preferredTimescale: 1)
            classificationRequest?.overlapFactor = 0.5

            // Add the request to the analyzer
            if let request = classificationRequest {
                try analyzer?.add(request, withObserver: self)
            }

            isRunning = true
            print("[AudioClassification] Started with format: \(audioFormat)")

        } catch {
            print("[AudioClassification] Failed to start: \(error)")
        }
    }

    /// Stop audio classification
    func stop() {
        analyzer?.removeAllRequests()
        analyzer = nil
        isRunning = false

        DispatchQueue.main.async { [weak self] in
            self?.detectedSounds = []
            self?.dominantSound = nil
            self?.speechDetected = false
        }

        print("[AudioClassification] Stopped")
    }

    // MARK: - Audio Processing

    /// Analyze an audio buffer for sound classification
    func analyzeBuffer(_ buffer: AVAudioPCMBuffer) {
        guard isRunning, let analyzer = analyzer else { return }

        analysisQueue.async {
            analyzer.analyze(buffer, atAudioFramePosition: AVAudioFramePosition(buffer.frameLength))
        }
    }

    /// Analyze raw audio data
    func analyzeAudioData(_ data: Data, sampleRate: Double = 16000) {
        guard isRunning else { return }

        // Convert data to audio buffer
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = data.toAudioBuffer(format: format) else {
            return
        }

        analyzeBuffer(buffer)
    }

    // MARK: - Utility

    /// Get the suggested mode based on audio context
    func getSuggestedMode() -> RediMode? {
        guard let dominant = dominantSound,
              let category = soundCategoryMapping[dominant.lowercased()] ?? soundCategoryMapping.first(where: { dominant.lowercased().contains($0.key) })?.value,
              let mode = categoryToMode[category] else {
            return nil
        }
        return mode
    }

    /// Check if a specific sound type is detected
    func isSoundDetected(_ soundType: String) -> Bool {
        return detectedSounds.contains {
            $0.label.lowercased().contains(soundType.lowercased()) && $0.confidence > confidenceThreshold
        }
    }

    /// Get the current audio context summary
    func getAudioContext() -> [String: Any] {
        return [
            "dominantSound": dominantSound ?? "none",
            "speechDetected": speechDetected,
            "soundCount": detectedSounds.count,
            "topSounds": detectedSounds.prefix(5).map { ["label": $0.label, "confidence": $0.confidence] }
        ]
    }
}

// MARK: - SNResultsObserving

extension AudioClassificationService: SNResultsObserving {
    func request(_ request: SNRequest, didProduce result: SNResult) {
        guard let classificationResult = result as? SNClassificationResult else { return }

        // Filter and map classifications
        let events = classificationResult.classifications
            .filter { $0.confidence > Double(confidenceThreshold) }
            .prefix(maxEvents)
            .map { classification -> AudioEvent in
                let label = classification.identifier
                let category = soundCategoryMapping[label.lowercased()] ?? "other"
                return AudioEvent(
                    label: label,
                    confidence: Float(classification.confidence),
                    category: category
                )
            }

        let eventsArray = Array(events)

        // Update on main thread
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.detectedSounds = eventsArray
            self.audioEventsUpdated.send(eventsArray)

            // Update dominant sound
            if let topSound = eventsArray.first {
                self.dominantSound = topSound.label

                // Emit significant sound if confidence is high
                if topSound.confidence > 0.6 {
                    self.significantSoundDetected.send(topSound)
                }
            }

            // Check for speech
            self.speechDetected = eventsArray.contains {
                $0.label.lowercased().contains("speech") ||
                $0.label.lowercased().contains("conversation") ||
                $0.label.lowercased().contains("talking")
            }
        }
    }

    func request(_ request: SNRequest, didFailWithError error: Error) {
        print("[AudioClassification] Request failed: \(error)")
    }

    func requestDidComplete(_ request: SNRequest) {
        // Request completed (usually when analyzer is stopped)
    }
}

// MARK: - Data Extension for Audio Buffer

private extension Data {
    func toAudioBuffer(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let frameCount = UInt32(self.count) / format.streamDescription.pointee.mBytesPerFrame
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            return nil
        }

        buffer.frameLength = frameCount

        // Copy data to buffer
        self.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
            if let floatData = buffer.floatChannelData?[0] {
                // Assuming 16-bit PCM input, convert to float
                let int16Ptr = bytes.bindMemory(to: Int16.self)
                for i in 0..<Int(frameCount) {
                    floatData[i] = Float(int16Ptr[i]) / 32768.0
                }
            }
        }

        return buffer
    }
}
