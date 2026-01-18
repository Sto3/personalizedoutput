/**
 * Redi V3 CameraService
 *
 * Military-Grade Camera Capture:
 * - 4K/60 HDR source for maximum detail
 * - Smart frame rate: 5 sec when static, 4fps on motion
 * - Compressed to 512px for efficient AI transmission
 *
 * The high-quality source gives us better results after compression,
 * especially in challenging lighting conditions.
 */

import AVFoundation
import UIKit
import Accelerate

class V3CameraService: NSObject, ObservableObject {
    private let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let processingQueue = DispatchQueue(label: "v3.camera.processing", qos: .userInitiated)

    @Published var isRunning = false
    @Published var previewLayer: AVCaptureVideoPreviewLayer?
    @Published var motionDetected = false  // For UI indicator

    var onFrameCaptured: ((Data) -> Void)?

    // Smart Frame Rate: adapts based on motion
    private var lastFrameTime: Date = .distantPast
    private let staticFrameInterval: TimeInterval = 5.0   // 5 sec when static
    private let motionFrameInterval: TimeInterval = 0.25  // 4 FPS on motion

    // Motion detection
    private var lastFramePixels: [UInt8]?
    private let motionThreshold: Float = 0.08  // 8% pixel change = motion
    private var consecutiveMotionFrames = 0
    private let motionConfirmFrames = 2  // Need 2 consecutive detections
    private var consecutiveStaticFrames = 0
    private let staticConfirmFrames = 8  // Need 8 consecutive static for cooldown

    // Shared CIContext for efficient image processing
    private let ciContext = CIContext(options: [
        .useSoftwareRenderer: false,
        .highQualityDownsample: true
    ])

    override init() {
        super.init()
        setupCamera()
    }

    private func setupCamera() {
        // Use 4K for maximum source detail
        // Even though we compress to 512px, higher source = better quality after compression
        captureSession.sessionPreset = .hd4K3840x2160

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: .back) else {
            print("[V3Camera] No back camera available, falling back to front")
            setupFrontCamera()
            return
        }

        configureCamera(camera)
    }

    private func setupFrontCamera() {
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: .front) else {
            print("[V3Camera] No camera available")
            return
        }

        configureCamera(camera)
    }

    private func configureCamera(_ camera: AVCaptureDevice) {
        do {
            try camera.lockForConfiguration()

            // Enable HDR for better dynamic range (especially for gyms, outdoors)
            if camera.activeFormat.isVideoHDRSupported {
                camera.automaticallyAdjustsVideoHDREnabled = true
                print("[V3Camera] HDR enabled")
            }

            // Set 60fps for smooth motion capture (helps with motion blur)
            // Find a format that supports 60fps
            var best60fpsFormat: AVCaptureDevice.Format?
            var best60fpsRange: AVFrameRateRange?

            for format in camera.formats {
                for range in format.videoSupportedFrameRateRanges {
                    if range.maxFrameRate >= 60 {
                        if best60fpsFormat == nil ||
                           CMVideoFormatDescriptionGetDimensions(format.formatDescription).width >
                           CMVideoFormatDescriptionGetDimensions(best60fpsFormat!.formatDescription).width {
                            best60fpsFormat = format
                            best60fpsRange = range
                        }
                    }
                }
            }

            if let format = best60fpsFormat, let range = best60fpsRange {
                camera.activeFormat = format
                camera.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 60)
                camera.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 60)
                print("[V3Camera] 60fps enabled at \(CMVideoFormatDescriptionGetDimensions(format.formatDescription))")
            } else {
                // Fallback to 30fps
                camera.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 30)
                camera.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 30)
                print("[V3Camera] 60fps not available, using 30fps")
            }

            // Optimize for low light
            if camera.isLowLightBoostSupported {
                camera.automaticallyEnablesLowLightBoostWhenAvailable = true
                print("[V3Camera] Low light boost enabled")
            }

            camera.unlockForConfiguration()

            // Setup input/output
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

            // Create preview layer
            let layer = AVCaptureVideoPreviewLayer(session: captureSession)
            layer.videoGravity = .resizeAspectFill

            DispatchQueue.main.async {
                self.previewLayer = layer
            }

            print("[V3Camera] Camera setup complete (4K/60 HDR optimized)")

        } catch {
            print("[V3Camera] Camera setup error: \(error)")
        }
    }

    func startCapture() {
        guard !isRunning else { return }

        processingQueue.async { [weak self] in
            self?.captureSession.startRunning()
            DispatchQueue.main.async {
                self?.isRunning = true
                print("[V3Camera] Capture started")
            }
        }
    }

    func stopCapture() {
        guard isRunning else { return }

        processingQueue.async { [weak self] in
            self?.captureSession.stopRunning()
            DispatchQueue.main.async {
                self?.isRunning = false
                print("[V3Camera] Capture stopped")
            }
        }
    }

    // MARK: - On-Demand Frame Capture

    /// Callback for immediate frame capture request
    private var pendingFrameCallback: ((Data) -> Void)?

    /// Capture a frame immediately and return via callback (for visual context requests)
    func captureFrameNow(completion: @escaping (Data) -> Void) {
        guard isRunning else {
            print("[V3Camera] Cannot capture frame - not running")
            return
        }
        pendingFrameCallback = completion
        print("[V3Camera] 📸 Fresh frame requested")
    }

    // MARK: - Motion Detection

    /// Sample pixels from frame for motion detection (fast, ~100 pixels)
    private func getPixelSample(from buffer: CVPixelBuffer) -> [UInt8] {
        let width = CVPixelBufferGetWidth(buffer)
        let height = CVPixelBufferGetHeight(buffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)

        guard let baseAddress = CVPixelBufferGetBaseAddress(buffer) else {
            return []
        }

        // Sample ~100 pixels in a grid pattern
        let sampleCount = 10
        let xStep = width / sampleCount
        let yStep = height / sampleCount

        var samples: [UInt8] = []
        samples.reserveCapacity(sampleCount * sampleCount)

        for y in stride(from: yStep/2, to: height, by: yStep) {
            for x in stride(from: xStep/2, to: width, by: xStep) {
                let offset = y * bytesPerRow + x * 4  // BGRA = 4 bytes
                // Get luminance approximation (just use green channel, fastest)
                let pixel = baseAddress.load(fromByteOffset: offset + 1, as: UInt8.self)
                samples.append(pixel)
            }
        }

        return samples
    }

    /// Calculate difference between two pixel samples (0.0-1.0)
    private func calculateDifference(current: [UInt8], last: [UInt8]) -> Float {
        guard current.count == last.count, !current.isEmpty else { return 0 }

        var diffSum: Int = 0
        for i in 0..<current.count {
            diffSum += abs(Int(current[i]) - Int(last[i]))
        }

        // Normalize to 0-1 range (max diff per pixel = 255)
        return Float(diffSum) / Float(current.count * 255)
    }

    // MARK: - Frame Compression

    private func compressFrame(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = V3Config.Camera.maxDimension
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, true, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return resized?.jpegData(compressionQuality: V3Config.Camera.compressionQuality)
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension V3CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput,
                      didOutput sampleBuffer: CMSampleBuffer,
                      from connection: AVCaptureConnection) {

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        // Lock the pixel buffer
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        // Motion detection
        let currentPixels = getPixelSample(from: pixelBuffer)
        var isMotionFrame = false

        if let last = lastFramePixels {
            let diff = calculateDifference(current: currentPixels, last: last)

            if diff > motionThreshold {
                consecutiveMotionFrames += 1
                consecutiveStaticFrames = 0

                if consecutiveMotionFrames >= motionConfirmFrames {
                    isMotionFrame = true
                    if !motionDetected {
                        DispatchQueue.main.async { [weak self] in
                            self?.motionDetected = true
                        }
                    }
                }
            } else {
                consecutiveStaticFrames += 1
                consecutiveMotionFrames = 0

                if consecutiveStaticFrames >= staticConfirmFrames && motionDetected {
                    DispatchQueue.main.async { [weak self] in
                        self?.motionDetected = false
                    }
                }
            }
        }
        lastFramePixels = currentPixels

        // Check if there's a pending on-demand request (bypass rate limiting)
        let hasPendingRequest = pendingFrameCallback != nil

        // Smart rate limiting based on motion (skip if on-demand request)
        let now = Date()
        if !hasPendingRequest {
            let interval = motionDetected ? motionFrameInterval : staticFrameInterval
            guard now.timeIntervalSince(lastFrameTime) >= interval else { return }
        }
        lastFrameTime = now

        // Create UIImage from pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let rect = CGRect(x: 0, y: 0, width: width, height: height)

        guard let cgImage = ciContext.createCGImage(ciImage, from: rect) else { return }
        let image = UIImage(cgImage: cgImage)

        if let frameData = compressFrame(image) {
            // Check for pending on-demand frame request first
            if let callback = pendingFrameCallback {
                pendingFrameCallback = nil
                print("[V3Camera] 📸 Fresh frame captured and sent")
                callback(frameData)
            }

            // Also send via regular callback
            onFrameCaptured?(frameData)
        }
    }
}
