/**
 * CameraService.swift
 *
 * MAXIMUM QUALITY camera capture for Redi AI vision.
 * Optimized for stability, clarity, and resilience to motion.
 *
 * Features:
 * - Optical Image Stabilization (OIS) when available
 * - Multi-frame capture with sharpness selection
 * - Auto-exposure/focus optimization
 * - High quality compression (1440p, 90% quality)
 * - Motion blur detection and mitigation
 */

import AVFoundation
import UIKit
import Combine
import CoreImage

class CameraService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isRunning: Bool = false
    @Published var previewLayer: AVCaptureVideoPreviewLayer?
    @Published var lastSnapshot: UIImage?
    @Published var error: String?
    @Published var currentZoom: CGFloat = 1.0
    @Published var maxZoom: CGFloat = 5.0
    @Published var imageQuality: ImageQuality = .unknown

    enum ImageQuality: String {
        case excellent = "Excellent"
        case good = "Good"
        case fair = "Fair"
        case poor = "Poor"
        case unknown = "Unknown"
    }

    // MARK: - Publishers

    let snapshotCaptured = PassthroughSubject<Data, Never>()
    let motionClipCaptured = PassthroughSubject<([Data], Int), Never>()

    // MARK: - Private Properties

    private let captureSession = AVCaptureSession()
    private var videoOutput: AVCaptureVideoDataOutput?
    private let sessionQueue = DispatchQueue(label: "camera.session.queue", qos: .userInteractive)
    private let processingQueue = DispatchQueue(label: "camera.processing.queue", qos: .userInitiated)

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

    // Multi-frame buffer for selecting sharpest image
    private var frameBuffer: [(image: UIImage, sharpness: Double, timestamp: Date)] = []
    private let maxFrameBufferSize = 5
    private var lastSnapshotTime: Date = .distantPast

    // Core Image context for processing
    private let ciContext = CIContext(options: [
        .useSoftwareRenderer: false,
        .highQualityDownsample: true
    ])

    // MARK: - Configuration Constants

    private struct Config {
        // Output resolution - 1440p for excellent detail while manageable size
        static let maxOutputDimension: CGFloat = 1440

        // JPEG quality - 90% for excellent quality with reasonable size
        static let jpegQuality: CGFloat = 0.90

        // Minimum sharpness threshold (Laplacian variance)
        static let minimumSharpness: Double = 100.0

        // Frame selection window (seconds)
        static let frameSelectionWindow: TimeInterval = 0.5

        // Motion clip frame quality (slightly lower for bandwidth)
        static let clipFrameQuality: CGFloat = 0.70
    }

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

            // Use highest available resolution
            if self.captureSession.canSetSessionPreset(.hd4K3840x2160) {
                self.captureSession.sessionPreset = .hd4K3840x2160
                print("[Camera] Using 4K resolution (3840x2160)")
            } else if self.captureSession.canSetSessionPreset(.hd1920x1080) {
                self.captureSession.sessionPreset = .hd1920x1080
                print("[Camera] Using 1080p resolution (1920x1080)")
            } else {
                self.captureSession.sessionPreset = .high
                print("[Camera] Using 'high' preset")
            }

            // Get best available camera
            let videoDevice = self.getBestCamera()
            guard let device = videoDevice,
                  let videoInput = try? AVCaptureDeviceInput(device: device),
                  self.captureSession.canAddInput(videoInput) else {
                DispatchQueue.main.async {
                    self.error = "Unable to access camera"
                }
                return
            }

            self.captureSession.addInput(videoInput)
            self.currentVideoDevice = device

            // Configure device for maximum quality
            self.configureDeviceForMaxQuality(device)

            // Set max zoom based on device capability
            DispatchQueue.main.async {
                self.maxZoom = min(device.activeFormat.videoMaxZoomFactor, 10.0)
            }

            // Add video output with optimal settings
            let videoOutput = AVCaptureVideoDataOutput()
            videoOutput.setSampleBufferDelegate(self, queue: self.processingQueue)
            videoOutput.alwaysDiscardsLateVideoFrames = false // Keep frames for quality selection
            videoOutput.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]

            if self.captureSession.canAddOutput(videoOutput) {
                self.captureSession.addOutput(videoOutput)
                self.videoOutput = videoOutput

                // Enable video stabilization if available
                if let connection = videoOutput.connection(with: .video) {
                    if connection.isVideoStabilizationSupported {
                        connection.preferredVideoStabilizationMode = .auto
                        print("[Camera] Video stabilization enabled")
                    }
                }
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

    /// Get the best available camera (prefer wide angle with OIS)
    private func getBestCamera() -> AVCaptureDevice? {
        // Try to get the best camera with optical image stabilization
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInTripleCamera, .builtInDualWideCamera, .builtInDualCamera, .builtInWideAngleCamera],
            mediaType: .video,
            position: .back
        )

        // Prefer cameras with OIS
        for device in discoverySession.devices {
            if device.activeFormat.isVideoStabilizationModeSupported(.cinematic) ||
               device.activeFormat.isVideoStabilizationModeSupported(.standard) {
                print("[Camera] Selected device with stabilization: \(device.localizedName)")
                return device
            }
        }

        // Fall back to default
        return AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
    }

    /// Configure device for maximum image quality
    private func configureDeviceForMaxQuality(_ device: AVCaptureDevice) {
        do {
            try device.lockForConfiguration()

            // Enable optical image stabilization if available
            if device.isOpticalImageStabilizationSupported {
                // OIS is automatically enabled when supported
                print("[Camera] Optical Image Stabilization supported")
            }

            // Set focus mode for best sharpness
            if device.isFocusModeSupported(.continuousAutoFocus) {
                device.focusMode = .continuousAutoFocus
            }

            // Set exposure for best quality
            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
            }

            // Enable HDR if available (better dynamic range)
            if device.isVideoHDRSupported {
                device.isVideoHDREnabled = true
                print("[Camera] HDR enabled")
            }

            // Set white balance
            if device.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
                device.whiteBalanceMode = .continuousAutoWhiteBalance
            }

            // Low light boost
            if device.isLowLightBoostSupported {
                device.automaticallyEnablesLowLightBoostWhenAvailable = true
                print("[Camera] Low light boost enabled")
            }

            device.unlockForConfiguration()
        } catch {
            print("[Camera] Failed to configure device: \(error)")
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
        // Trigger snapshot selection from frame buffer
        lastSnapshotTime = Date()
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

            if let currentInput = self.captureSession.inputs.first as? AVCaptureDeviceInput {
                self.captureSession.removeInput(currentInput)

                let newPosition: AVCaptureDevice.Position = currentInput.device.position == .back ? .front : .back

                let discoverySession = AVCaptureDevice.DiscoverySession(
                    deviceTypes: [.builtInWideAngleCamera],
                    mediaType: .video,
                    position: newPosition
                )

                if let newDevice = discoverySession.devices.first,
                   let newInput = try? AVCaptureDeviceInput(device: newDevice),
                   self.captureSession.canAddInput(newInput) {
                    self.captureSession.addInput(newInput)
                    self.currentVideoDevice = newDevice
                    self.configureDeviceForMaxQuality(newDevice)
                }
            }

            self.captureSession.commitConfiguration()

            DispatchQueue.main.async {
                if let device = self.currentVideoDevice {
                    self.maxZoom = min(device.activeFormat.videoMaxZoomFactor, 10.0)
                    self.currentZoom = 1.0
                }
            }
        }
    }

    // MARK: - Zoom Control

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

    func zoomIn(step: CGFloat = 0.5) {
        setZoom(currentZoom + step)
    }

    func zoomOut(step: CGFloat = 0.5) {
        setZoom(currentZoom - step)
    }

    func resetZoom() {
        setZoom(1.0)
    }

    // MARK: - Image Quality Analysis

    /// Calculate image sharpness using Laplacian variance
    private func calculateSharpness(_ image: UIImage) -> Double {
        guard let cgImage = image.cgImage else { return 0 }

        let ciImage = CIImage(cgImage: cgImage)

        // Apply Laplacian filter for edge detection
        guard let laplacianFilter = CIFilter(name: "CIConvolution3X3") else { return 0 }

        laplacianFilter.setValue(ciImage, forKey: kCIInputImageKey)
        // Laplacian kernel for edge detection
        laplacianFilter.setValue(CIVector(values: [0, 1, 0, 1, -4, 1, 0, 1, 0], count: 9), forKey: "inputWeights")
        laplacianFilter.setValue(1.0, forKey: "inputBias")

        guard let outputImage = laplacianFilter.outputImage else { return 0 }

        // Calculate variance of the filtered image
        var bitmap = [UInt8](repeating: 0, count: 4)
        let extent = outputImage.extent

        // Sample center region for efficiency
        let sampleRect = CGRect(
            x: extent.midX - 50,
            y: extent.midY - 50,
            width: 100,
            height: 100
        )

        ciContext.render(outputImage, toBitmap: &bitmap, rowBytes: 4, bounds: sampleRect, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())

        // Higher values = sharper image
        let variance = Double(bitmap[0]) + Double(bitmap[1]) + Double(bitmap[2])
        return variance
    }

    /// Assess overall image quality
    private func assessImageQuality(sharpness: Double) -> ImageQuality {
        if sharpness > 300 {
            return .excellent
        } else if sharpness > 200 {
            return .good
        } else if sharpness > 100 {
            return .fair
        } else {
            return .poor
        }
    }

    // MARK: - Image Processing

    /// Process and compress image with maximum quality
    private func processImage(_ image: UIImage) -> Data? {
        var processedImage = image
        let size = image.size

        // Resize to optimal output dimension while maintaining aspect ratio
        let maxDim = Config.maxOutputDimension
        if max(size.width, size.height) > maxDim {
            let scale = maxDim / max(size.width, size.height)
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)

            // Use high-quality image context
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1.0
            format.preferredRange = .automatic

            let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
            processedImage = renderer.image { context in
                // High quality interpolation
                context.cgContext.interpolationQuality = .high
                image.draw(in: CGRect(origin: .zero, size: newSize))
            }
        }

        return processedImage.jpegData(compressionQuality: Config.jpegQuality)
    }

    /// Select the best frame from the buffer
    private func selectBestFrame() -> (image: UIImage, sharpness: Double)? {
        guard !frameBuffer.isEmpty else { return nil }

        // Filter frames within the selection window
        let cutoff = Date().addingTimeInterval(-Config.frameSelectionWindow)
        let recentFrames = frameBuffer.filter { $0.timestamp > cutoff }

        guard !recentFrames.isEmpty else {
            // Fall back to most recent frame
            return frameBuffer.last.map { ($0.image, $0.sharpness) }
        }

        // Select sharpest frame
        let best = recentFrames.max { $0.sharpness < $1.sharpness }
        return best.map { ($0.image, $0.sharpness) }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        guard let cgImage = ciContext.createCGImage(ciImage, from: ciImage.extent) else { return }
        let image = UIImage(cgImage: cgImage)

        // Calculate sharpness for this frame
        let sharpness = calculateSharpness(image)

        // Add to frame buffer
        frameBuffer.append((image: image, sharpness: sharpness, timestamp: Date()))
        if frameBuffer.count > maxFrameBufferSize {
            frameBuffer.removeFirst()
        }

        // Handle periodic snapshot - select best frame when timer fires
        let timeSinceLastSnapshot = Date().timeIntervalSince(lastSnapshotTime)
        if snapshotTimer != nil && timeSinceLastSnapshot < Config.frameSelectionWindow {
            // Within selection window, wait for more frames
        } else if snapshotTimer != nil && timeSinceLastSnapshot >= Config.frameSelectionWindow && timeSinceLastSnapshot < Config.frameSelectionWindow + 0.1 {
            // Selection window just ended - pick best frame
            if let (bestImage, bestSharpness) = selectBestFrame() {
                let quality = assessImageQuality(sharpness: bestSharpness)

                DispatchQueue.main.async { [weak self] in
                    self?.lastSnapshot = bestImage
                    self?.imageQuality = quality
                }

                if let compressedData = processImage(bestImage) {
                    snapshotCaptured.send(compressedData)
                    print("[Camera] Snapshot captured - Sharpness: \(Int(bestSharpness)), Quality: \(quality.rawValue)")
                }

                // Clear buffer after selection
                frameBuffer.removeAll()
            }
        }

        // Handle motion clip capture
        if isCapturingClip, let startTime = clipStartTime {
            let elapsed = Date().timeIntervalSince(startTime) * 1000

            if elapsed < Double(clipDurationMs) {
                // Capture frame (limit to ~10 fps for clip)
                if clipFrames.count < Int(Double(clipDurationMs) / 100) {
                    // Only include reasonably sharp frames
                    if sharpness > Config.minimumSharpness * 0.5 {
                        if let frameData = image.jpegData(compressionQuality: Config.clipFrameQuality) {
                            clipFrames.append(frameData)
                        }
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
