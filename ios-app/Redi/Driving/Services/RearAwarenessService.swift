/**
 * RearAwarenessService.swift
 *
 * Uses camera to monitor rear windshield for:
 * - Tailgating vehicles
 * - Emergency vehicles (red/blue lights)
 * - Fast-approaching vehicles
 *
 * Runs entirely on-device using Vision framework.
 *
 * CAMERA POSITION NOTE:
 * Currently uses FRONT camera. This works in two scenarios:
 * 1. Phone mounted on dashboard facing driver - camera can see rear-view mirror reflection
 * 2. Phone positioned to capture rear windshield in background of frame
 *
 * For production, consider:
 * - Using BACK camera with phone mounted facing rear
 * - Adding camera position preference in settings
 * - Using both cameras if device supports it
 */

import AVFoundation
import Vision
import UIKit
import CoreImage

class RearAwarenessService: NSObject, ObservableObject {
    @Published var isTailgating: Bool = false
    @Published var emergencyVehicleDetected: Bool = false
    @Published var fastApproachDetected: Bool = false
    @Published var isMonitoring: Bool = false

    private var captureSession: AVCaptureSession?
    private var videoOutput: AVCaptureVideoDataOutput?
    private let processingQueue = DispatchQueue(label: "rear.awareness", qos: .userInitiated)

    // Analysis state
    private var previousFrameVehicleSize: CGFloat = 0
    private var vehicleSizeHistory: [CGFloat] = []
    private var redBlueHistory: [(red: Int, blue: Int)] = []

    // Thresholds
    private let tailgatingThreshold: CGFloat = 0.25  // Vehicle takes up 25%+ of rear view
    private let approachRateThreshold: CGFloat = 0.03  // Growing 3%+ per second
    private let emergencyColorThreshold: Int = 50  // Bright red/blue pixel count

    // Callbacks
    var onTailgatingDetected: (() -> Void)?
    var onEmergencyVehicleDetected: (() -> Void)?
    var onFastApproachDetected: (() -> Void)?
    var onAlertCleared: (() -> Void)?

    // Cooldowns
    private var lastTailgatingAlert: Date = .distantPast
    private var lastEmergencyAlert: Date = .distantPast
    private var lastApproachAlert: Date = .distantPast
    private let alertCooldown: TimeInterval = 15.0

    // Frame rate control
    private var lastAnalysisTime: Date = .distantPast
    private let analysisInterval: TimeInterval = 0.5  // Analyze 2 FPS

    func startMonitoring() {
        setupCamera()
        isMonitoring = true
    }

    func stopMonitoring() {
        captureSession?.stopRunning()
        captureSession = nil
        isMonitoring = false
        isTailgating = false
        emergencyVehicleDetected = false
        fastApproachDetected = false
        print("[RearAwareness] Stopped monitoring")
    }

    private func setupCamera() {
        captureSession = AVCaptureSession()
        captureSession?.sessionPreset = .hd1280x720  // Don't need 4K for rear analysis

        // CAMERA POSITION: Using front camera
        // This assumes phone is dash-mounted facing driver, capturing rear-view mirror reflection
        // For a rear-facing mount, change to .back
        // TODO: Add user preference for camera position based on mount type
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: .front) else {
            print("[RearAwareness] Front camera not available")
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if captureSession?.canAddInput(input) == true {
                captureSession?.addInput(input)
            }

            videoOutput = AVCaptureVideoDataOutput()
            videoOutput?.setSampleBufferDelegate(self, queue: processingQueue)
            videoOutput?.alwaysDiscardsLateVideoFrames = true
            videoOutput?.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]

            if captureSession?.canAddOutput(videoOutput!) == true {
                captureSession?.addOutput(videoOutput!)
            }

            DispatchQueue.global(qos: .userInitiated).async {
                self.captureSession?.startRunning()
            }

            print("[RearAwareness] Started monitoring")

        } catch {
            print("[RearAwareness] Camera setup error: \(error)")
        }
    }

    private func analyzeFrame(_ pixelBuffer: CVPixelBuffer) {
        // Rate limit analysis
        let now = Date()
        guard now.timeIntervalSince(lastAnalysisTime) >= analysisInterval else { return }
        lastAnalysisTime = now

        // Analyze upper portion of frame (rear windshield area when phone mounted on dash)
        checkForEmergencyLights(pixelBuffer)
        checkForVehicles(pixelBuffer)
    }

    private func checkForEmergencyLights(_ pixelBuffer: CVPixelBuffer) {
        // Lock the pixel buffer
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)

        guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else { return }

        let buffer = baseAddress.assumingMemoryBound(to: UInt8.self)

        // Sample the upper portion of the frame
        var redCount = 0
        var blueCount = 0
        let sampleHeight = height / 3  // Top third

        // Sample every 10th pixel for performance
        for y in stride(from: 0, to: sampleHeight, by: 10) {
            for x in stride(from: 0, to: width, by: 10) {
                let offset = y * bytesPerRow + x * 4

                let b = buffer[offset]
                let g = buffer[offset + 1]
                let r = buffer[offset + 2]

                // Detect bright red (emergency lights)
                if r > 200 && g < 100 && b < 100 {
                    redCount += 1
                }

                // Detect bright blue (police lights)
                if b > 200 && g < 100 && r < 100 {
                    blueCount += 1
                }
            }
        }

        // Track history for flashing detection
        redBlueHistory.append((red: redCount, blue: blueCount))
        if redBlueHistory.count > 6 {  // 3 seconds of history at 2 FPS
            redBlueHistory.removeFirst()
        }

        // Check for flashing pattern (alternating high/low counts)
        let hasFlashing = detectFlashingPattern()

        if hasFlashing && !emergencyVehicleDetected {
            if Date().timeIntervalSince(lastEmergencyAlert) > alertCooldown {
                DispatchQueue.main.async {
                    self.emergencyVehicleDetected = true
                }
                lastEmergencyAlert = Date()
                onEmergencyVehicleDetected?()
            }
        } else if !hasFlashing && emergencyVehicleDetected {
            DispatchQueue.main.async {
                self.emergencyVehicleDetected = false
            }
        }
    }

    private func detectFlashingPattern() -> Bool {
        guard redBlueHistory.count >= 4 else { return false }

        // Look for alternating pattern in red or blue
        var flashCount = 0
        for i in 1..<redBlueHistory.count {
            let prevRed = redBlueHistory[i-1].red
            let currRed = redBlueHistory[i].red
            let prevBlue = redBlueHistory[i-1].blue
            let currBlue = redBlueHistory[i].blue

            // Significant change indicates a flash
            if abs(currRed - prevRed) > emergencyColorThreshold ||
               abs(currBlue - prevBlue) > emergencyColorThreshold {
                flashCount += 1
            }
        }

        // At least 2 flashes in our window suggests emergency lights
        return flashCount >= 2
    }

    private func checkForVehicles(_ pixelBuffer: CVPixelBuffer) {
        // Use Vision framework for rectangle detection (simplified vehicle detection)
        let request = VNDetectRectanglesRequest { [weak self] request, error in
            guard let self = self,
                  let results = request.results as? [VNRectangleObservation] else {
                return
            }

            // Find largest rectangle (likely a vehicle)
            let largest = results.max { $0.boundingBox.width * $0.boundingBox.height <
                                        $1.boundingBox.width * $1.boundingBox.height }

            guard let vehicleRect = largest else {
                self.vehicleSizeHistory.append(0)
                return
            }

            let vehicleSize = vehicleRect.boundingBox.width * vehicleRect.boundingBox.height

            // Track history for approach detection
            self.vehicleSizeHistory.append(vehicleSize)
            if self.vehicleSizeHistory.count > 10 {
                self.vehicleSizeHistory.removeFirst()
            }

            // Check for tailgating
            if vehicleSize > self.tailgatingThreshold {
                if Date().timeIntervalSince(self.lastTailgatingAlert) > self.alertCooldown {
                    DispatchQueue.main.async {
                        self.isTailgating = true
                    }
                    self.lastTailgatingAlert = Date()
                    self.onTailgatingDetected?()
                }
            } else {
                DispatchQueue.main.async {
                    self.isTailgating = false
                }
            }

            // Check for fast approach
            self.checkForFastApproach()

            self.previousFrameVehicleSize = vehicleSize
        }

        request.minimumSize = 0.1
        request.maximumObservations = 5

        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
        try? handler.perform([request])
    }

    private func checkForFastApproach() {
        guard vehicleSizeHistory.count >= 4 else { return }

        // Calculate growth rate over recent frames
        let recentHistory = Array(vehicleSizeHistory.suffix(4))
        let growthRate = (recentHistory.last ?? 0) - (recentHistory.first ?? 0)

        if growthRate > approachRateThreshold && !fastApproachDetected {
            if Date().timeIntervalSince(lastApproachAlert) > alertCooldown {
                DispatchQueue.main.async {
                    self.fastApproachDetected = true
                }
                lastApproachAlert = Date()
                onFastApproachDetected?()

                // Auto-clear after 3 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    self.fastApproachDetected = false
                }
            }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension RearAwarenessService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput,
                      didOutput sampleBuffer: CMSampleBuffer,
                      from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        analyzeFrame(pixelBuffer)
    }
}
