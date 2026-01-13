/**
 * SceneUnderstandingService.swift
 *
 * Autonomous Scene Understanding for Redi
 *
 * Analyzes camera frames and audio to understand:
 * - Environment type (kitchen, gym, office, etc.)
 * - Current activity (cooking, exercising, reading, etc.)
 * - Detected objects (barbell, stove, guitar, etc.)
 * - Suggested mode for optimal assistance
 *
 * This enables "Use Redi for Anything" - where Redi figures out
 * what the user is doing and adapts automatically.
 */

import Foundation
import UIKit
import Vision
import AVFoundation
import CoreML
import Combine

// MARK: - Context Hypothesis

/// The output of scene analysis - what Redi thinks is happening
struct ContextHypothesis: Codable {
    let environment: String           // "kitchen", "gym", "office", "outdoors", "living_room"
    let activity: String              // "cooking", "exercising", "reading", "playing_music"
    let confidence: Float             // 0.0-1.0 overall confidence
    let suggestedMode: RediMode       // Best mode for this context
    let detectedObjects: [String]     // ["barbell", "stove", "guitar"]
    let detectedScene: String?        // Scene classification result
    let timestamp: TimeInterval

    init(
        environment: String = "unknown",
        activity: String = "unknown",
        confidence: Float = 0.0,
        suggestedMode: RediMode = .general,
        detectedObjects: [String] = [],
        detectedScene: String? = nil
    ) {
        self.environment = environment
        self.activity = activity
        self.confidence = confidence
        self.suggestedMode = suggestedMode
        self.detectedObjects = detectedObjects
        self.detectedScene = detectedScene
        self.timestamp = Date().timeIntervalSince1970 * 1000
    }
}

// MARK: - Scene Understanding Service

class SceneUnderstandingService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var currentHypothesis: ContextHypothesis = ContextHypothesis()
    @Published var isAnalyzing: Bool = false
    @Published var suggestedMode: RediMode = .general
    @Published var modeConfidence: Float = 0.0

    // MARK: - Publishers

    /// Emitted when initial analysis completes (first 3-5 seconds)
    let contextHypothesisReady = PassthroughSubject<ContextHypothesis, Never>()

    /// Emitted on continuous updates (every 10-15 seconds)
    let contextUpdated = PassthroughSubject<ContextHypothesis, Never>()

    /// Emitted when mode should change
    let modeChangeRecommended = PassthroughSubject<RediMode, Never>()

    // MARK: - Private Properties

    // Vision requests
    private var classifyImageRequest: VNClassifyImageRequest?
    private var detectObjectsRequest: VNRecognizeAnimalsRequest?  // Built-in for some objects

    // Processing
    private let processingQueue = DispatchQueue(label: "scene.understanding", qos: .userInitiated)
    private var frameBuffer: [VNClassificationObservation] = []
    private var objectBuffer: [String] = []

    // Timing
    private var analysisTimer: Timer?
    private var initialAnalysisComplete: Bool = false
    private var frameCount: Int = 0
    private let initialAnalysisFrames = 10  // Analyze 10 frames in first 3-5 seconds

    // Mode switching hysteresis
    private var pendingMode: RediMode?
    private var pendingModeCount: Int = 0
    private let requiredConsecutiveDetections = 2

    // MARK: - Object-to-Mode Mapping

    /// Maps detected objects to suggested modes
    private let objectModeMapping: [String: RediMode] = [
        // Gym/Sports
        "barbell": .sports, "dumbbell": .sports, "treadmill": .sports,
        "yoga mat": .sports, "basketball": .sports, "tennis racket": .sports,
        "weight": .sports, "exercise": .sports, "gym": .sports,

        // Music
        "guitar": .music, "piano": .music, "violin": .music,
        "drum": .music, "microphone": .music, "keyboard": .music,
        "saxophone": .music, "trumpet": .music, "flute": .music,

        // Studying
        "book": .studying, "laptop": .studying, "notebook": .studying,
        "pen": .studying, "whiteboard": .studying, "desk": .studying,
        "computer": .studying, "monitor": .studying, "textbook": .studying,

        // Kitchen/Cooking
        "stove": .cooking, "pot": .cooking, "pan": .cooking,
        "knife": .cooking, "cutting board": .cooking, "oven": .cooking,
        "refrigerator": .cooking, "blender": .cooking, "spatula": .cooking,
        "kitchen": .cooking, "food": .cooking,

        // Baby/Monitoring
        "crib": .monitoring, "baby bottle": .monitoring, "baby": .monitoring,
        "stroller": .monitoring, "pacifier": .monitoring,

        // Assembly
        "screwdriver": .assembly, "wrench": .assembly, "hammer": .assembly,
        "tool": .assembly, "furniture": .assembly, "screw": .assembly,

        // Meeting
        "presentation": .meeting, "projector": .meeting, "conference": .meeting
    ]

    /// Maps scene classifications to suggested modes
    private let sceneModeMapping: [String: RediMode] = [
        "gym": .sports,
        "fitness": .sports,
        "weight room": .sports,
        "kitchen": .cooking,
        "restaurant kitchen": .cooking,
        "office": .studying,
        "library": .studying,
        "classroom": .studying,
        "music studio": .music,
        "recording studio": .music,
        "concert hall": .music,
        "nursery": .monitoring,
        "bedroom": .monitoring,
        "workshop": .assembly,
        "garage": .assembly,
        "conference room": .meeting,
        "auditorium": .meeting,
        "living room": .general,
        "outdoor": .general
    ]

    // MARK: - Initialization

    override init() {
        super.init()
        setupVisionRequests()
    }

    private func setupVisionRequests() {
        // Scene/Image classification
        classifyImageRequest = VNClassifyImageRequest { [weak self] request, error in
            if let error = error {
                print("[SceneUnderstanding] Classification error: \(error)")
                return
            }
            self?.processClassificationResults(request.results as? [VNClassificationObservation])
        }

        print("[SceneUnderstanding] Vision requests configured")
    }

    // MARK: - Session Management

    /// Start initial intensive analysis (first 3-5 seconds)
    func startInitialAnalysis() {
        isAnalyzing = true
        initialAnalysisComplete = false
        frameCount = 0
        frameBuffer.removeAll()
        objectBuffer.removeAll()

        print("[SceneUnderstanding] Starting initial analysis")
    }

    /// Switch to continuous lightweight monitoring
    func startContinuousMonitoring(intervalSeconds: TimeInterval = 12) {
        DispatchQueue.main.async { [weak self] in
            self?.analysisTimer?.invalidate()
            self?.analysisTimer = Timer.scheduledTimer(
                withTimeInterval: intervalSeconds,
                repeats: true
            ) { [weak self] _ in
                self?.isAnalyzing = true
                self?.frameCount = 0
            }
        }

        print("[SceneUnderstanding] Continuous monitoring started (every \(intervalSeconds)s)")
    }

    func stop() {
        analysisTimer?.invalidate()
        analysisTimer = nil
        isAnalyzing = false

        print("[SceneUnderstanding] Stopped")
    }

    // MARK: - Frame Processing

    /// Process a camera frame for scene understanding
    func processFrame(_ pixelBuffer: CVPixelBuffer) {
        guard isAnalyzing else { return }

        // Create handler on current thread before async to avoid sendability issues
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])

        processingQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                if let classifyRequest = self.classifyImageRequest {
                    try handler.perform([classifyRequest])
                }
            } catch {
                print("[SceneUnderstanding] Frame processing error: \(error)")
            }

            self.frameCount += 1

            // Check if initial analysis is complete
            if !self.initialAnalysisComplete && self.frameCount >= self.initialAnalysisFrames {
                self.completeInitialAnalysis()
            }
        }
    }

    /// Process a UIImage for scene understanding
    func processImage(_ image: UIImage) {
        guard let cgImage = image.cgImage else { return }

        processingQueue.async { [weak self] in
            guard let self = self else { return }

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

            do {
                if let classifyRequest = self.classifyImageRequest {
                    try handler.perform([classifyRequest])
                }
            } catch {
                print("[SceneUnderstanding] Image processing error: \(error)")
            }
        }
    }

    // MARK: - Result Processing

    private func processClassificationResults(_ results: [VNClassificationObservation]?) {
        guard let observations = results else { return }

        // Get high-confidence classifications
        let relevant = observations.filter { $0.confidence > 0.1 }

        // Add to buffer for averaging
        frameBuffer.append(contentsOf: relevant.prefix(5))

        // Extract detected objects/scenes
        for observation in relevant.prefix(10) {
            let label = observation.identifier.lowercased()
            objectBuffer.append(label)
        }
    }

    private func completeInitialAnalysis() {
        initialAnalysisComplete = true
        isAnalyzing = false

        // Build hypothesis from buffered observations
        let hypothesis = buildHypothesis()

        DispatchQueue.main.async { [weak self] in
            self?.currentHypothesis = hypothesis
            self?.suggestedMode = hypothesis.suggestedMode
            self?.modeConfidence = hypothesis.confidence
            self?.contextHypothesisReady.send(hypothesis)
        }

        // Start continuous monitoring
        startContinuousMonitoring()

        print("[SceneUnderstanding] Initial analysis complete: \(hypothesis.suggestedMode) (\(Int(hypothesis.confidence * 100))%)")
    }

    // MARK: - Hypothesis Building

    private func buildHypothesis() -> ContextHypothesis {
        // Count mode votes from detected objects
        var modeVotes: [RediMode: Int] = [:]
        var detectedObjects: Set<String> = []
        var detectedScene: String?
        var environment = "unknown"
        var activity = "unknown"

        // Process object detections
        for label in objectBuffer {
            detectedObjects.insert(label)

            // Check object mapping
            if let mode = objectModeMapping[label] {
                modeVotes[mode, default: 0] += 1
            }

            // Check scene mapping
            for (sceneKey, mode) in sceneModeMapping {
                if label.contains(sceneKey) {
                    modeVotes[mode, default: 0] += 2  // Scenes get more weight
                    detectedScene = sceneKey
                }
            }
        }

        // Process classification observations
        for observation in frameBuffer {
            let label = observation.identifier.lowercased()

            // Check scene mapping
            for (sceneKey, mode) in sceneModeMapping {
                if label.contains(sceneKey) {
                    modeVotes[mode, default: 0] += Int(observation.confidence * 5)
                    detectedScene = sceneKey
                    environment = sceneKey
                }
            }

            // Check object mapping
            for (objectKey, mode) in objectModeMapping {
                if label.contains(objectKey) {
                    modeVotes[mode, default: 0] += Int(observation.confidence * 3)
                }
            }
        }

        // Determine winning mode
        let sortedVotes = modeVotes.sorted { $0.value > $1.value }
        let winningMode = sortedVotes.first?.key ?? .general
        let totalVotes = modeVotes.values.reduce(0, +)

        // Calculate confidence
        let confidence: Float
        if totalVotes > 0 {
            let winningVotes = Float(sortedVotes.first?.value ?? 0)
            confidence = min(1.0, winningVotes / Float(max(1, totalVotes)) + 0.3)
        } else {
            confidence = 0.3  // Low confidence, use general
        }

        // Determine activity based on mode
        activity = activityForMode(winningMode)

        return ContextHypothesis(
            environment: environment,
            activity: activity,
            confidence: confidence,
            suggestedMode: winningMode,
            detectedObjects: Array(detectedObjects),
            detectedScene: detectedScene
        )
    }

    private func activityForMode(_ mode: RediMode) -> String {
        switch mode {
        case .general: return "general_activity"
        case .cooking: return "cooking"
        case .studying: return "studying"
        case .meeting: return "presenting"
        case .sports: return "exercising"
        case .music: return "playing_music"
        case .assembly: return "building"
        case .monitoring: return "monitoring"
        }
    }

    // MARK: - Mode Switching with Hysteresis

    /// Evaluate if mode should switch based on new hypothesis
    func evaluateModeSwitch(newHypothesis: ContextHypothesis) {
        // Only consider switching if high confidence
        guard newHypothesis.confidence > 0.75 else { return }

        // Don't switch to the same mode
        guard newHypothesis.suggestedMode != suggestedMode else {
            pendingMode = nil
            pendingModeCount = 0
            return
        }

        // Hysteresis: require consecutive detections
        if newHypothesis.suggestedMode == pendingMode {
            pendingModeCount += 1

            if pendingModeCount >= requiredConsecutiveDetections {
                // Confirmed switch
                let newMode = newHypothesis.suggestedMode

                DispatchQueue.main.async { [weak self] in
                    self?.suggestedMode = newMode
                    self?.modeConfidence = newHypothesis.confidence
                    self?.currentHypothesis = newHypothesis
                    self?.modeChangeRecommended.send(newMode)
                }

                pendingMode = nil
                pendingModeCount = 0

                print("[SceneUnderstanding] Mode switch confirmed: \(newMode)")
            }
        } else {
            // New candidate mode
            pendingMode = newHypothesis.suggestedMode
            pendingModeCount = 1
        }
    }

    // MARK: - Manual Override

    /// Force a specific mode (user selected a specialized mode)
    func setFixedMode(_ mode: RediMode) {
        DispatchQueue.main.async { [weak self] in
            self?.suggestedMode = mode
            self?.modeConfidence = 1.0
        }
        stop()  // Stop analysis when mode is fixed

        print("[SceneUnderstanding] Mode fixed to: \(mode)")
    }

    /// Resume autonomous detection
    func resumeAutonomousDetection() {
        startInitialAnalysis()

        print("[SceneUnderstanding] Resuming autonomous detection")
    }
}
