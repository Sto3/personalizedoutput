/**
 * CameraService.swift
 *
 * Handles camera capture for snapshots and video clips.
 * Supports both periodic snapshots and motion-triggered capture.
 */

import AVFoundation
import UIKit
import Combine

class CameraService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isRunning: Bool = false
    @Published var previewLayer: AVCaptureVideoPreviewLayer?
    @Published var lastSnapshot: UIImage?
    @Published var error: String?

    // MARK: - Publishers

    let snapshotCaptured = PassthroughSubject<Data, Never>()
    let motionClipCaptured = PassthroughSubject<([Data], Int), Never>()

    // MARK: - Private Properties

    private let captureSession = AVCaptureSession()
    private var videoOutput: AVCaptureVideoDataOutput?
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private let processingQueue = DispatchQueue(label: "camera.processing.queue")

    // Snapshot timing
    private var snapshotTimer: Timer?
    private var snapshotIntervalMs: Int = 8000

    // Motion clip capture
    private var isCapturingClip: Bool = false
    private var clipFrames: [Data] = []
    private var clipStartTime: Date?
    private var clipDurationMs: Int = 3000

    // MARK: - Initialization

    override init() {
        super.init()
        setupCaptureSession()
    }

    // MARK: - Setup

    private func setupCaptureSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            self.captureSession.beginConfiguration()
            self.captureSession.sessionPreset = .medium

            // Add video input
            guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let videoInput = try? AVCaptureDeviceInput(device: videoDevice),
                  self.captureSession.canAddInput(videoInput) else {
                DispatchQueue.main.async {
                    self.error = "Unable to access camera"
                }
                return
            }

            self.captureSession.addInput(videoInput)

            // Add video output
            let videoOutput = AVCaptureVideoDataOutput()
            videoOutput.setSampleBufferDelegate(self, queue: self.processingQueue)
            videoOutput.alwaysDiscardsLateVideoFrames = true

            if self.captureSession.canAddOutput(videoOutput) {
                self.captureSession.addOutput(videoOutput)
                self.videoOutput = videoOutput
            }

            self.captureSession.commitConfiguration()

            // Create preview layer
            DispatchQueue.main.async {
                let preview = AVCaptureVideoPreviewLayer(session: self.captureSession)
                preview.videoGravity = .resizeAspectFill
                self.previewLayer = preview
            }
        }
    }

    // MARK: - Session Control

    func start() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.captureSession.isRunning else { return }
            self.captureSession.startRunning()

            DispatchQueue.main.async {
                self.isRunning = true
            }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self = self, self.captureSession.isRunning else { return }
            self.captureSession.stopRunning()

            DispatchQueue.main.async {
                self.isRunning = false
            }
        }

        stopSnapshotTimer()
    }

    // MARK: - Snapshot Capture

    func startPeriodicSnapshots(intervalMs: Int) {
        snapshotIntervalMs = intervalMs
        stopSnapshotTimer()

        guard intervalMs > 0 else { return }

        DispatchQueue.main.async { [weak self] in
            self?.snapshotTimer = Timer.scheduledTimer(
                withTimeInterval: Double(intervalMs) / 1000.0,
                repeats: true
            ) { [weak self] _ in
                self?.captureSnapshot()
            }
        }
    }

    func stopSnapshotTimer() {
        snapshotTimer?.invalidate()
        snapshotTimer = nil
    }

    func captureSnapshot() {
        // Snapshot will be captured on next frame in delegate
        // Flag is checked in the delegate method
    }

    // MARK: - Motion Clip Capture

    func startMotionClipCapture(durationMs: Int = 3000) {
        guard !isCapturingClip else { return }

        clipDurationMs = durationMs
        clipFrames = []
        clipStartTime = Date()
        isCapturingClip = true

        print("[Camera] Started motion clip capture (\(durationMs)ms)")
    }

    // MARK: - Camera Switching

    func switchCamera() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            self.captureSession.beginConfiguration()

            // Remove existing input
            if let currentInput = self.captureSession.inputs.first as? AVCaptureDeviceInput {
                self.captureSession.removeInput(currentInput)

                // Get new camera
                let newPosition: AVCaptureDevice.Position = currentInput.device.position == .back ? .front : .back

                if let newDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: newPosition),
                   let newInput = try? AVCaptureDeviceInput(device: newDevice),
                   self.captureSession.canAddInput(newInput) {
                    self.captureSession.addInput(newInput)
                }
            }

            self.captureSession.commitConfiguration()
        }
    }

    // MARK: - Image Compression

    private func compressImage(_ image: UIImage, quality: CGFloat = 0.6, maxDimension: CGFloat = 720) -> Data? {
        // Resize if needed
        var processedImage = image
        let size = image.size

        if max(size.width, size.height) > maxDimension {
            let scale = maxDimension / max(size.width, size.height)
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)

            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            processedImage = UIGraphicsGetImageFromCurrentImageContext() ?? image
            UIGraphicsEndImageContext()
        }

        return processedImage.jpegData(compressionQuality: quality)
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()

        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        let image = UIImage(cgImage: cgImage)

        // Handle periodic snapshot
        if snapshotTimer != nil {
            if let compressedData = compressImage(image) {
                DispatchQueue.main.async { [weak self] in
                    self?.lastSnapshot = image
                }
                snapshotCaptured.send(compressedData)
            }
            // Reset timer flag handled by timer itself
        }

        // Handle motion clip capture
        if isCapturingClip, let startTime = clipStartTime {
            let elapsed = Date().timeIntervalSince(startTime) * 1000

            if elapsed < Double(clipDurationMs) {
                // Capture frame (limit to ~10 fps for clip)
                if clipFrames.count < Int(Double(clipDurationMs) / 100) {
                    if let frameData = compressImage(image, quality: 0.5) {
                        clipFrames.append(frameData)
                    }
                }
            } else {
                // Clip complete
                isCapturingClip = false
                let duration = Int(elapsed)
                let frames = clipFrames

                clipFrames = []
                clipStartTime = nil

                print("[Camera] Motion clip captured: \(frames.count) frames, \(duration)ms")
                motionClipCaptured.send((frames, duration))
            }
        }
    }
}
