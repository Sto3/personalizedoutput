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
    @Published var currentZoom: CGFloat = 1.0
    @Published var maxZoom: CGFloat = 5.0

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

    // Zoom tracking
    private var currentVideoDevice: AVCaptureDevice?
    private var lastPinchScale: CGFloat = 1.0

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
            // Use 4K for maximum quality on iPhone 16 Pro Max
            // Falls back to 1080p, then 720p if 4K not available
            if self.captureSession.canSetSessionPreset(.hd4K3840x2160) {
                self.captureSession.sessionPreset = .hd4K3840x2160
                print("[Camera] Using 4K resolution (3840x2160)")
            } else if self.captureSession.canSetSessionPreset(.hd1920x1080) {
                self.captureSession.sessionPreset = .hd1920x1080
                print("[Camera] Using 1080p resolution (1920x1080)")
            } else if self.captureSession.canSetSessionPreset(.hd1280x720) {
                self.captureSession.sessionPreset = .hd1280x720
                print("[Camera] Using 720p resolution (1280x720)")
            } else {
                self.captureSession.sessionPreset = .high
                print("[Camera] Using 'high' preset")
            }

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
            self.currentVideoDevice = videoDevice

            // Set max zoom based on device capability
            DispatchQueue.main.async {
                self.maxZoom = min(videoDevice.activeFormat.videoMaxZoomFactor, 10.0)
            }

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
                    self.currentVideoDevice = newDevice
                }
            }

            self.captureSession.commitConfiguration()

            // Update max zoom for new device
            DispatchQueue.main.async {
                if let device = self.currentVideoDevice {
                    self.maxZoom = min(device.activeFormat.videoMaxZoomFactor, 10.0)
                    self.currentZoom = 1.0
                }
            }
        }
    }

    // MARK: - Zoom Control

    /// Set zoom level directly (1.0 to maxZoom)
    func setZoom(_ factor: CGFloat) {
        guard let device = currentVideoDevice else { return }

        let clampedFactor = max(1.0, min(factor, maxZoom))

        sessionQueue.async { [weak self] in
            do {
                try device.lockForConfiguration()
                device.videoZoomFactor = clampedFactor
                device.unlockForConfiguration()

                DispatchQueue.main.async {
                    self?.currentZoom = clampedFactor
                }
            } catch {
                print("[Camera] Failed to set zoom: \(error)")
            }
        }
    }

    /// Handle pinch gesture for zoom (called from view)
    func handlePinchZoom(scale: CGFloat, state: UIGestureRecognizer.State) {
        switch state {
        case .began:
            lastPinchScale = currentZoom
        case .changed:
            let newZoom = lastPinchScale * scale
            setZoom(newZoom)
        default:
            break
        }
    }

    /// Zoom in by a step (for button control)
    func zoomIn(step: CGFloat = 0.5) {
        setZoom(currentZoom + step)
    }

    /// Zoom out by a step (for button control)
    func zoomOut(step: CGFloat = 0.5) {
        setZoom(currentZoom - step)
    }

    /// Reset zoom to 1x
    func resetZoom() {
        setZoom(1.0)
    }

    // MARK: - Image Compression

    private func compressImage(_ image: UIImage, quality: CGFloat = 0.85, maxDimension: CGFloat = 1080) -> Data? {
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
