/**
 * Redi V3 CameraService
 *
 * Captures camera frames at 2 FPS and compresses them for transmission.
 * Frames are resized to 512px max dimension for efficient AI analysis.
 */

import AVFoundation
import UIKit

class V3CameraService: NSObject, ObservableObject {
    private let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let processingQueue = DispatchQueue(label: "v3.camera.processing", qos: .userInitiated)

    @Published var isRunning = false
    @Published var previewLayer: AVCaptureVideoPreviewLayer?

    var onFrameCaptured: ((Data) -> Void)?

    // Rate limiting: 2 FPS for AI analysis
    private var lastFrameTime: Date = .distantPast
    private let minimumFrameInterval: TimeInterval = 0.5  // 2 FPS

    override init() {
        super.init()
        setupCamera()
    }

    private func setupCamera() {
        captureSession.sessionPreset = .hd1280x720

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: .back) else {
            print("[V3Camera] No back camera available")
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

            // Create preview layer
            let layer = AVCaptureVideoPreviewLayer(session: captureSession)
            layer.videoGravity = .resizeAspectFill

            DispatchQueue.main.async {
                self.previewLayer = layer
            }

            print("[V3Camera] Camera setup complete")

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

extension V3CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput,
                      didOutput sampleBuffer: CMSampleBuffer,
                      from connection: AVCaptureConnection) {

        // Rate limit to 2 FPS
        let now = Date()
        guard now.timeIntervalSince(lastFrameTime) >= minimumFrameInterval else { return }
        lastFrameTime = now

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        // Lock the pixel buffer
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        // Create UIImage directly from pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext(options: [.useSoftwareRenderer: false])

        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let rect = CGRect(x: 0, y: 0, width: width, height: height)

        guard let cgImage = context.createCGImage(ciImage, from: rect) else { return }

        let image = UIImage(cgImage: cgImage)

        if let frameData = compressFrame(image) {
            onFrameCaptured?(frameData)
        }
    }
}
