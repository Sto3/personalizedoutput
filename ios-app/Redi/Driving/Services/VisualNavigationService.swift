/**
 * VisualNavigationService.swift
 *
 * Provides landmark-based navigation hints using GPT-4o vision.
 * When a turn is approaching, captures a frame and asks the AI
 * to identify helpful landmarks ("turn at the gas station").
 *
 * This transforms generic "Turn right in 400 feet" into
 * human-like "Turn right at the Shell station ahead".
 */

import Foundation
import AVFoundation
import UIKit

class VisualNavigationService: NSObject, ObservableObject {
    @Published var isAnalyzing = false
    @Published var lastLandmarkHint: String?

    private let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let processingQueue = DispatchQueue(label: "visual.navigation", qos: .userInitiated)

    private var currentFrame: Data?
    private var frameTimestamp: Date = .distantPast
    private var isCapturing = false

    // Callback for landmark hints
    var onLandmarkHintReady: ((String) -> Void)?

    // Rate limiting - don't analyze too frequently
    private var lastAnalysisTime: Date = .distantPast
    private let minAnalysisInterval: TimeInterval = 10.0  // At least 10 seconds between analyses

    override init() {
        super.init()
        setupCamera()
    }

    private func setupCamera() {
        captureSession.sessionPreset = .hd1280x720  // Good quality, not too heavy

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: .back) else {
            print("[VisualNav] No back camera available")
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if captureSession.canAddInput(input) {
                captureSession.addInput(input)
            }

            videoOutput.setSampleBufferDelegate(self, queue: processingQueue)
            videoOutput.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            videoOutput.alwaysDiscardsLateVideoFrames = true

            if captureSession.canAddOutput(videoOutput) {
                captureSession.addOutput(videoOutput)
            }

            print("[VisualNav] Camera setup complete")
        } catch {
            print("[VisualNav] Camera setup error: \(error)")
        }
    }

    // MARK: - Public Methods

    func startCapture() {
        guard !isCapturing else { return }
        processingQueue.async { [weak self] in
            self?.captureSession.startRunning()
            DispatchQueue.main.async {
                self?.isCapturing = true
            }
        }
        print("[VisualNav] Started capture")
    }

    func stopCapture() {
        guard isCapturing else { return }
        processingQueue.async { [weak self] in
            self?.captureSession.stopRunning()
            DispatchQueue.main.async {
                self?.isCapturing = false
            }
        }
        print("[VisualNav] Stopped capture")
    }

    /// Analyze the current road view for landmarks relevant to an upcoming maneuver.
    /// - Parameter instruction: The navigation instruction (e.g., "Turn right in 400 feet")
    func analyzeForLandmarks(instruction: String) {
        // Rate limiting
        guard Date().timeIntervalSince(lastAnalysisTime) > minAnalysisInterval else {
            print("[VisualNav] Skipping analysis - too soon since last")
            return
        }

        // Need a recent frame
        guard let frame = currentFrame,
              Date().timeIntervalSince(frameTimestamp) < 2.0 else {
            print("[VisualNav] No recent frame available")
            return
        }

        lastAnalysisTime = Date()

        DispatchQueue.main.async {
            self.isAnalyzing = true
        }

        // Send to backend for vision analysis
        Task {
            do {
                let hint = try await fetchLandmarkHint(frame: frame, instruction: instruction)

                DispatchQueue.main.async {
                    self.isAnalyzing = false
                    self.lastLandmarkHint = hint
                    self.onLandmarkHintReady?(hint)
                }
            } catch {
                print("[VisualNav] Analysis error: \(error)")
                DispatchQueue.main.async {
                    self.isAnalyzing = false
                }
            }
        }
    }

    // MARK: - Backend API

    private func fetchLandmarkHint(frame: Data, instruction: String) async throws -> String {
        let baseURL = "https://personalizedoutput.com"
        let url = URL(string: "\(baseURL)/api/redi/visual-navigation")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10  // Quick timeout for driving context

        let body: [String: Any] = [
            "frame": frame.base64EncodedString(),
            "instruction": instruction,
            "context": "driving"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let hint = json["hint"] as? String else {
            throw URLError(.cannotParseResponse)
        }

        return hint
    }

    // MARK: - Frame Compression

    private func compressFrame(_ image: UIImage) -> Data? {
        // Resize to reasonable size for API
        let maxDimension: CGFloat = 512
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, true, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return resized?.jpegData(compressionQuality: 0.7)
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension VisualNavigationService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput,
                      didOutput sampleBuffer: CMSampleBuffer,
                      from connection: AVCaptureConnection) {

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        // Only capture frames periodically (every ~1 second) to save resources
        guard Date().timeIntervalSince(frameTimestamp) > 1.0 else { return }

        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()

        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        let image = UIImage(cgImage: cgImage)

        if let frameData = compressFrame(image) {
            currentFrame = frameData
            frameTimestamp = Date()
        }
    }
}
