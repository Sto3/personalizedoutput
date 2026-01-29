/**
 * DualCameraService.swift
 *
 * REDI DUAL CAMERA SERVICE
 * 
 * Captures from both front and back cameras simultaneously
 * using AVCaptureMultiCamSession (iOS 13+, iPhone XS+).
 *
 * Features:
 * - Simultaneous front/back capture
 * - 5 FPS capture rate for AI processing
 * - Graceful fallback to single camera
 * - Frame conversion to JPEG/RGB
 *
 * Created: Jan 29, 2026
 */

import Foundation
import AVFoundation
import UIKit

class DualCameraService: NSObject, ObservableObject {
    static let shared = DualCameraService()
    
    // MARK: - Published Properties
    
    @Published var frontFrame: Data?
    @Published var backFrame: Data?
    @Published var isRunning = false
    @Published var isDualSupported = false
    
    // MARK: - Private Properties
    
    private var multiCamSession: AVCaptureMultiCamSession?
    private var singleSession: AVCaptureSession?
    
    private var frontOutput: AVCaptureVideoDataOutput?
    private var backOutput: AVCaptureVideoDataOutput?
    
    private let captureQueue = DispatchQueue(label: "com.redi.dualcamera", qos: .userInteractive)
    private let processingQueue = DispatchQueue(label: "com.redi.frameprocessing", qos: .utility)
    
    private var lastFrontCapture: Date = .distantPast
    private var lastBackCapture: Date = .distantPast
    private let captureInterval: TimeInterval = 0.2 // 5 FPS
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        checkDualCameraSupport()
    }
    
    private func checkDualCameraSupport() {
        // MultiCam requires iOS 13+ and specific hardware
        if #available(iOS 13.0, *) {
            isDualSupported = AVCaptureMultiCamSession.isMultiCamSupported
        } else {
            isDualSupported = false
        }
        
        print("[DualCamera] Dual camera supported: \(isDualSupported)")
    }
    
    // MARK: - Public Methods
    
    func start() {
        guard !isRunning else { return }
        
        captureQueue.async { [weak self] in
            guard let self = self else { return }
            
            if self.isDualSupported {
                self.setupMultiCamSession()
            } else {
                self.setupSingleSession()
            }
        }
    }
    
    func stop() {
        captureQueue.async { [weak self] in
            self?.multiCamSession?.stopRunning()
            self?.singleSession?.stopRunning()
            
            DispatchQueue.main.async {
                self?.isRunning = false
                self?.frontFrame = nil
                self?.backFrame = nil
            }
        }
    }
    
    // MARK: - Multi-Camera Setup
    
    @available(iOS 13.0, *)
    private func setupMultiCamSession() {
        let session = AVCaptureMultiCamSession()
        
        // Configure front camera
        guard let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let frontInput = try? AVCaptureDeviceInput(device: frontDevice) else {
            print("[DualCamera] Failed to get front camera")
            setupSingleSession()
            return
        }
        
        // Configure back camera
        guard let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backDevice) else {
            print("[DualCamera] Failed to get back camera")
            setupSingleSession()
            return
        }
        
        session.beginConfiguration()
        
        // Add front camera
        if session.canAddInput(frontInput) {
            session.addInputWithNoConnections(frontInput)
        }
        
        let frontOutput = AVCaptureVideoDataOutput()
        frontOutput.setSampleBufferDelegate(self, queue: processingQueue)
        frontOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        
        if session.canAddOutput(frontOutput) {
            session.addOutputWithNoConnections(frontOutput)
            self.frontOutput = frontOutput
        }
        
        // Connect front camera
        if let frontPort = frontInput.ports(for: .video, sourceDeviceType: .builtInWideAngleCamera, sourceDevicePosition: .front).first {
            let frontConnection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
            if session.canAddConnection(frontConnection) {
                session.addConnection(frontConnection)
                frontConnection.videoOrientation = .portrait
                frontConnection.isVideoMirrored = true
            }
        }
        
        // Add back camera
        if session.canAddInput(backInput) {
            session.addInputWithNoConnections(backInput)
        }
        
        let backOutput = AVCaptureVideoDataOutput()
        backOutput.setSampleBufferDelegate(self, queue: processingQueue)
        backOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        
        if session.canAddOutput(backOutput) {
            session.addOutputWithNoConnections(backOutput)
            self.backOutput = backOutput
        }
        
        // Connect back camera
        if let backPort = backInput.ports(for: .video, sourceDeviceType: .builtInWideAngleCamera, sourceDevicePosition: .back).first {
            let backConnection = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
            if session.canAddConnection(backConnection) {
                session.addConnection(backConnection)
                backConnection.videoOrientation = .portrait
            }
        }
        
        session.commitConfiguration()
        
        self.multiCamSession = session
        session.startRunning()
        
        DispatchQueue.main.async {
            self.isRunning = true
        }
        
        print("[DualCamera] Multi-cam session started")
    }
    
    // MARK: - Single Camera Fallback
    
    private func setupSingleSession() {
        let session = AVCaptureSession()
        session.sessionPreset = .medium
        
        // Use back camera as default
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device) else {
            print("[DualCamera] Failed to setup single camera")
            return
        }
        
        if session.canAddInput(input) {
            session.addInput(input)
        }
        
        let output = AVCaptureVideoDataOutput()
        output.setSampleBufferDelegate(self, queue: processingQueue)
        output.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        
        if session.canAddOutput(output) {
            session.addOutput(output)
            self.backOutput = output
        }
        
        self.singleSession = session
        session.startRunning()
        
        DispatchQueue.main.async {
            self.isRunning = true
        }
        
        print("[DualCamera] Single camera session started (fallback)")
    }
    
    // MARK: - Frame Conversion
    
    private func convertToJPEG(_ sampleBuffer: CMSampleBuffer) -> Data? {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return nil
        }
        
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            return nil
        }
        
        let uiImage = UIImage(cgImage: cgImage)
        return uiImage.jpegData(compressionQuality: 0.7)
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension DualCameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = Date()
        
        // Determine which camera this is from
        let isFront = output == frontOutput
        
        // Throttle capture rate
        if isFront {
            guard now.timeIntervalSince(lastFrontCapture) >= captureInterval else { return }
            lastFrontCapture = now
        } else {
            guard now.timeIntervalSince(lastBackCapture) >= captureInterval else { return }
            lastBackCapture = now
        }
        
        // Convert to JPEG
        guard let jpegData = convertToJPEG(sampleBuffer) else { return }
        
        // Update published property on main thread
        DispatchQueue.main.async {
            if isFront {
                self.frontFrame = jpegData
            } else {
                self.backFrame = jpegData
            }
        }
    }
}
