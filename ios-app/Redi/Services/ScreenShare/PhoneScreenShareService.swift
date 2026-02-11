/**
 * PhoneScreenShareService.swift
 *
 * ReplayKit-based screen capture for sharing the phone's own screen.
 * Throttles to ~1 frame per 3 seconds for cost savings.
 */

import ReplayKit
import UIKit

class PhoneScreenShareService: ObservableObject {
    @Published var isSharing = false
    private let recorder = RPScreenRecorder.shared()

    var onFrameCaptured: ((Data) -> Void)?

    private var lastCaptureTime: Date = .distantPast
    private let captureInterval: TimeInterval = 3.0

    func startCapture() {
        guard recorder.isAvailable else {
            print("[ScreenShare] Screen recording not available")
            return
        }

        recorder.startCapture { [weak self] sampleBuffer, bufferType, error in
            guard error == nil else {
                print("[ScreenShare] Capture error: \(error!)")
                return
            }

            if bufferType == .video {
                self?.processVideoFrame(sampleBuffer)
            }
        } completionHandler: { [weak self] error in
            if let error = error {
                print("[ScreenShare] Start error: \(error)")
            } else {
                DispatchQueue.main.async {
                    self?.isSharing = true
                }
                print("[ScreenShare] Started")
            }
        }
    }

    func stopCapture() {
        recorder.stopCapture { [weak self] error in
            DispatchQueue.main.async {
                self?.isSharing = false
            }
            print("[ScreenShare] Stopped")
        }
    }

    private func processVideoFrame(_ sampleBuffer: CMSampleBuffer) {
        // Throttle to captureInterval
        let now = Date()
        guard now.timeIntervalSince(lastCaptureTime) >= captureInterval else { return }
        lastCaptureTime = now

        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()

        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        let uiImage = UIImage(cgImage: cgImage)

        // Downscale for cost savings
        let maxDim: CGFloat = 640
        let scale = min(maxDim / uiImage.size.width, maxDim / uiImage.size.height, 1.0)
        let newSize = CGSize(width: uiImage.size.width * scale, height: uiImage.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, true, 1.0)
        uiImage.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        if let jpegData = resized?.jpegData(compressionQuality: 0.7) {
            onFrameCaptured?(jpegData)
        }
    }
}
