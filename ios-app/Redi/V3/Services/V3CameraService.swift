/**
 * V3CameraService.swift
 *
 * DEPRECATED - This file redirects to CameraService.
 * The version-specific camera services are no longer needed.
 * All camera functionality is now in ios-app/Redi/Services/CameraService.swift
 */

import AVFoundation
import UIKit
import Combine

/// Camera service for Redi - captures high-quality frames for AI vision
/// This is now an alias to the main CameraService with added V3-compatible interface
class V3CameraService: NSObject, ObservableObject {
    // MARK: - Delegate to main CameraService
    private let cameraService = CameraService()
    
    // MARK: - Published Properties (bridged from CameraService)
    @Published var isRunning = false
    @Published var previewLayer: AVCaptureVideoPreviewLayer?
    @Published var motionDetected = false
    
    // MARK: - V3 Interface Callbacks
    var onFrameCaptured: ((Data) -> Void)?
    
    // MARK: - Initialization
    override init() {
        super.init()
        setupBridge()
    }
    
    private func setupBridge() {
        // Bridge CameraService publishers to V3 interface
        cameraService.$isRunning
            .receive(on: DispatchQueue.main)
            .assign(to: &$isRunning)
        
        cameraService.$previewLayer
            .receive(on: DispatchQueue.main)
            .assign(to: &$previewLayer)
    }
    
    // MARK: - V3 Interface Methods
    
    func startCapture() {
        cameraService.start()
        // Start periodic snapshots using RediConfig settings
        cameraService.startPeriodicSnapshots(intervalMs: Int(RediConfig.Camera.staticFrameInterval * 1000))
    }
    
    func stopCapture() {
        cameraService.stop()
        cameraService.stopSnapshotTimer()
    }
    
    /// Capture a frame immediately and return via callback
    func captureFrameNow(completion: @escaping (Data) -> Void) {
        cameraService.captureSnapshot()
        // The snapshot will be sent via snapshotCaptured publisher
        // For immediate callback, we store it
        var cancellable: AnyCancellable?
        cancellable = cameraService.snapshotCaptured
            .first()
            .sink { data in
                completion(data)
                cancellable?.cancel()
            }
    }
    
    // MARK: - Setup Snapshot Callback
    
    private var snapshotCancellable: AnyCancellable?
    
    func setupSnapshotCallback() {
        snapshotCancellable = cameraService.snapshotCaptured
            .sink { [weak self] data in
                self?.onFrameCaptured?(data)
            }
    }
}
