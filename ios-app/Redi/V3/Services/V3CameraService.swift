/**
 * V3CameraService.swift
 *
 * Camera service wrapper for V3 - bridges to main CameraService.
 * FIXED: Now properly calls setupSnapshotCallback on init.
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
    
    // MARK: - Private
    private var snapshotCancellable: AnyCancellable?
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    override init() {
        super.init()
        setupBridge()
        setupSnapshotCallback()  // CRITICAL: Must setup callback!
    }
    
    private func setupBridge() {
        // Bridge CameraService publishers to V3 interface
        cameraService.$isRunning
            .receive(on: DispatchQueue.main)
            .assign(to: &$isRunning)
        
        cameraService.$previewLayer
            .receive(on: DispatchQueue.main)
            .sink { [weak self] layer in
                self?.previewLayer = layer
                if layer != nil {
                    print("[V3Camera] Preview layer ready")
                }
            }
            .store(in: &cancellables)
    }
    
    /// CRITICAL: Setup callback to forward snapshots to onFrameCaptured
    private func setupSnapshotCallback() {
        snapshotCancellable = cameraService.snapshotCaptured
            .sink { [weak self] data in
                let sizeKB = data.count / 1024
                print("[V3Camera] Snapshot captured: \(sizeKB)KB")
                self?.onFrameCaptured?(data)
            }
    }
    
    // MARK: - V3 Interface Methods
    
    func startCapture() {
        print("[V3Camera] Starting capture...")
        cameraService.start()
        // Start periodic snapshots using RediConfig settings
        cameraService.startPeriodicSnapshots(intervalMs: Int(RediConfig.Camera.staticFrameInterval * 1000))
    }
    
    func stopCapture() {
        print("[V3Camera] Stopping capture...")
        cameraService.stop()
        cameraService.stopSnapshotTimer()
    }
    
    /// Capture a frame immediately and return via callback
    func captureFrameNow(completion: @escaping (Data) -> Void) {
        print("[V3Camera] Capturing frame NOW...")
        cameraService.captureSnapshot()
        
        // Wait for the next snapshot from the publisher
        var oneTimeCancellable: AnyCancellable?
        oneTimeCancellable = cameraService.snapshotCaptured
            .first()
            .sink { data in
                let sizeKB = data.count / 1024
                print("[V3Camera] Immediate frame captured: \(sizeKB)KB")
                completion(data)
                oneTimeCancellable?.cancel()
            }
    }
}
