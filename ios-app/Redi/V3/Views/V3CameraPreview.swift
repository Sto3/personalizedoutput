/**
 * Redi V3 CameraPreview
 *
 * SwiftUI wrapper for AVCaptureVideoPreviewLayer.
 * FIXED: Preview layer now properly updates when camera starts.
 * FIXED: Renamed class to V3CameraPreviewUIView to avoid conflict with SessionView
 */

import SwiftUI
import AVFoundation

struct V3CameraPreview: UIViewRepresentable {
    @ObservedObject var cameraService: V3CameraService

    func makeUIView(context: Context) -> V3CameraPreviewUIView {
        let view = V3CameraPreviewUIView()
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: V3CameraPreviewUIView, context: Context) {
        // Update preview layer when it becomes available
        uiView.setPreviewLayer(cameraService.previewLayer)
    }
    
    static func dismantleUIView(_ uiView: V3CameraPreviewUIView, coordinator: ()) {
        uiView.removePreviewLayer()
    }
}

/// Custom UIView that properly handles AVCaptureVideoPreviewLayer
/// Named V3CameraPreviewUIView to avoid conflict with CameraPreviewUIView in SessionView
class V3CameraPreviewUIView: UIView {
    private var currentPreviewLayer: AVCaptureVideoPreviewLayer?
    
    override class var layerClass: AnyClass {
        return AVCaptureVideoPreviewLayer.self
    }
    
    func setPreviewLayer(_ previewLayer: AVCaptureVideoPreviewLayer?) {
        // Don't do anything if it's the same layer
        if currentPreviewLayer === previewLayer {
            // Just update frame
            currentPreviewLayer?.frame = bounds
            return
        }
        
        // Remove old layer
        removePreviewLayer()
        
        // Add new layer
        guard let previewLayer = previewLayer else { return }
        
        previewLayer.videoGravity = .resizeAspectFill
        previewLayer.frame = bounds
        layer.insertSublayer(previewLayer, at: 0)
        currentPreviewLayer = previewLayer
        
        print("[V3CameraPreview] Preview layer set: \(bounds)")
    }
    
    func removePreviewLayer() {
        currentPreviewLayer?.removeFromSuperlayer()
        currentPreviewLayer = nil
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        currentPreviewLayer?.frame = bounds
    }
}
