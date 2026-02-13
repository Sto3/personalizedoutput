/**
 * ObserveModeService — Redi "Always On" Passive Observation
 * ==========================================================
 * Redi runs in the background, listening and/or watching,
 * only interjecting when it has something genuinely useful.
 *
 * Three modes:
 * - audio_only: Listen to ambient audio, speak up when useful (~$0.36/hr)
 * - screen_ocr: Read screen text + listen (~$0.54/hr)
 * - screen_vision: Full visual understanding + listen (~$1.80/hr)
 */

import Foundation
import Combine
import AVFoundation
import UIKit

class ObserveModeService: ObservableObject {
    @Published var isObserving = false
    @Published var observeType: ObserveType = .audioOnly
    @Published var sensitivity: Sensitivity = .medium
    @Published var interjectionCount = 0
    @Published var durationMinutes = 0
    @Published var costPerMinute: Double = 0.1
    @Published var lastInterjection: String = ""

    enum ObserveType: String, CaseIterable {
        case audioOnly = "audio_only"
        case screenOCR = "screen_ocr"
        case screenVision = "screen_vision"

        var displayName: String {
            switch self {
            case .audioOnly: return "Listen Only"
            case .screenOCR: return "Screen + Listen"
            case .screenVision: return "Full Vision"
            }
        }

        var icon: String {
            switch self {
            case .audioOnly: return "ear"
            case .screenOCR: return "rectangle.and.text.magnifyingglass"
            case .screenVision: return "eye"
            }
        }

        var description: String {
            switch self {
            case .audioOnly: return "Redi listens to what's happening and speaks up when useful. Lowest cost."
            case .screenOCR: return "Redi reads your screen text and listens. Great for desk work, coding, email."
            case .screenVision: return "Redi sees your screen visually and listens. For design work, photos, visual tasks."
            }
        }

        var costPerHourEstimate: String {
            switch self {
            case .audioOnly: return "~$0.36/hr"
            case .screenOCR: return "~$0.54/hr"
            case .screenVision: return "~$1.80/hr"
            }
        }
    }

    enum Sensitivity: String, CaseIterable {
        case low, medium, high

        var displayName: String {
            switch self {
            case .low: return "Minimal"
            case .medium: return "Balanced"
            case .high: return "Active"
            }
        }

        var description: String {
            switch self {
            case .low: return "Only critical or time-sensitive things"
            case .medium: return "Useful suggestions and relevant info"
            case .high: return "Anything that might help"
            }
        }
    }

    private var webSocketService: V9WebSocketService?
    private var durationTimer: Timer?
    private var screenCaptureTimer: Timer?
    private var backgroundAudioPlayer: AVAudioPlayer?

    // MARK: - Start/Stop

    func startObserving(webSocket: V9WebSocketService) {
        self.webSocketService = webSocket

        // Send observe_start to server
        let msg: [String: Any] = [
            "type": "observe_start",
            "observeType": observeType.rawValue,
            "sensitivity": sensitivity.rawValue,
        ]
        webSocket.sendJSON(msg)

        isObserving = true
        durationMinutes = 0
        interjectionCount = 0

        // Start duration counter
        durationTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.durationMinutes += 1
        }

        // Start screen capture if needed
        if observeType != .audioOnly {
            startScreenCapture()
        }

        // Keep audio session active for continuous listening
        configureAudioForObservation()
        startBackgroundKeepAlive()
    }

    func stopObserving() {
        webSocketService?.sendJSON(["type": "observe_stop"])

        isObserving = false
        durationTimer?.invalidate()
        screenCaptureTimer?.invalidate()
        durationTimer = nil
        screenCaptureTimer = nil
        stopBackgroundKeepAlive()
    }

    // MARK: - Handle Interjections from Server

    func handleInterjection(text: String) {
        lastInterjection = text
        interjectionCount += 1

        // Haptic feedback to get attention
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }

    // MARK: - Screen Capture for Observation

    private func startScreenCapture() {
        let interval: TimeInterval = observeType == .screenOCR ? 10.0 : 5.0

        screenCaptureTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.captureAndProcessScreen()
        }
    }

    private func captureAndProcessScreen() {
        // This uses ReplayKit or the phone camera depending on what's being observed
        // For screen share: use PhoneScreenShareService to get frames
        // For camera: use V3CameraService to get frames

        // OCR path (screen_ocr):
        // 1. Capture frame from active screen share
        // 2. OCRService.extractText(from: frame) { text in
        //      webSocketService?.sendJSON(["type": "observe_screen", "content": text, "isOCR": true])
        //    }

        // Vision path (screen_vision):
        // 1. Capture frame
        // 2. webSocketService?.sendFrame(frameData)  // Uses normal vision pipeline
    }

    // MARK: - Audio Configuration

    private func configureAudioForObservation() {
        // Audio session should capture ambient audio (not just close-talk)
        // Use a wider pickup pattern if available
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            try session.setMode(.default)  // .default has wider pickup than .voiceChat
            try session.setActive(true)
        } catch {
            print("[ObserveMode] Audio session error: \(error)")
        }
    }

    // MARK: - Background Keep-Alive

    // Keep app alive in background by maintaining an active audio session
    // iOS allows apps with active audio sessions to run in background

    private func startBackgroundKeepAlive() {
        guard let silenceURL = Bundle.main.url(forResource: "silence", withExtension: "wav") else {
            // If no silence file, just rely on the recording session to keep alive
            print("[ObserveMode] No silence.wav found — relying on active recording session")
            return
        }

        do {
            backgroundAudioPlayer = try AVAudioPlayer(contentsOf: silenceURL)
            backgroundAudioPlayer?.numberOfLoops = -1  // Loop forever
            backgroundAudioPlayer?.volume = 0.0         // Silent
            backgroundAudioPlayer?.play()
        } catch {
            print("[ObserveMode] Background audio error: \(error)")
        }
    }

    private func stopBackgroundKeepAlive() {
        backgroundAudioPlayer?.stop()
        backgroundAudioPlayer = nil
    }
}
