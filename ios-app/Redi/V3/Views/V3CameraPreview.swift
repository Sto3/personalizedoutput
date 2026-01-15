/**
 * Redi V3 CameraPreview
 *
 * SwiftUI wrapper for AVCaptureVideoPreviewLayer.
 */

import SwiftUI
import AVFoundation

struct V3CameraPreview: UIViewRepresentable {
    let cameraService: V3CameraService

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            if let previewLayer = cameraService.previewLayer {
                // Remove existing sublayers
                uiView.layer.sublayers?.forEach { $0.removeFromSuperlayer() }

                // Add preview layer
                previewLayer.frame = uiView.bounds
                uiView.layer.addSublayer(previewLayer)
            }
        }
    }
}
