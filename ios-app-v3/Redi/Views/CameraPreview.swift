/**
 * Redi V3 CameraPreview
 *
 * SwiftUI wrapper for AVCaptureVideoPreviewLayer.
 */

import SwiftUI
import AVFoundation

struct CameraPreview: UIViewRepresentable {
    let cameraService: CameraService

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black

        if let previewLayer = cameraService.previewLayer {
            previewLayer.frame = view.bounds
            view.layer.addSublayer(previewLayer)
        }

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            cameraService.previewLayer?.frame = uiView.bounds
        }
    }
}
