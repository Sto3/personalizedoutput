/**
 * DualCameraService.swift
 *
 * REDI - Dual Camera Mode
 * 
 * Captures both front and back cameras simultaneously using AVCaptureMultiCamSession.
 * Use cases: Driving (road + driver), Cooking (task + user), Medication (pill + face)
 *
 * Requirements:
 * - iOS 13+
 * - iPhone XS or later (multi-camera hardware)
 *
 * Created: Jan 26, 2026
 */

import Foundation
import AVFoundation
import UIKit
import Combine

class DualCameraService: NSObject, ObservableObject {
    // MARK: - Published Properties
    
    @Published var backFrame: UIImage?
    @Published var frontFrame: UIImage?
    @Published var isRunning = false
    @Published var isSupported = false
    @Published var error: String?
    
    // MARK: - Camera Session
    
    private var multiCamSession: AVCaptureMultiCamSession?
    private var backCameraInput: AVCaptureDeviceInput?
    private var frontCameraInput: AVCaptureDeviceInput?
    private var backVideoOutput: AVCaptureVideoDataOutput?
    private var frontVideoOutput: AVCaptureVideoDataOutput?
    
    private let backCameraQueue = DispatchQueue(label: "redi.dualcam.back", qos: .userInteractive)
    private let frontCameraQueue = DispatchQueue(label: "redi.dualcam.front", qos: .userInteractive)
    
    // MARK: - Frame Processing
    
    private var lastBackFrameTime: Date = .distantPast
    private var lastFrontFrameTime: Date = .distantPast
    private let frameInterval: TimeInterval = 0.2 // 5 FPS per camera
    
    // MARK: - Callbacks
    
    var onDualFrames: ((UIImage, UIImage) -> Void)?
    
    // MARK: - Init
    
    override init() {
        super.init()
        checkSupport()
    }
    
    // MARK: - Support Check
    
    func checkSupport() -> Bool {
        isSupported = AVCaptureMultiCamSession.isMultiCamSupported
        if !isSupported {
            print("[DualCam] Multi-camera not supported on this device")
        }
        return isSupported
    }
    
    // MARK: - Setup
    
    func setup() throws {
        guard AVCaptureMultiCamSession.isMultiCamSupported else {
            throw DualCameraError.notSupported
        }
        
        multiCamSession = AVCaptureMultiCamSession()
        guard let session = multiCamSession else {
            throw DualCameraError.sessionCreationFailed
        }
        
        session.beginConfiguration()
        
        // Setup back camera
        guard let backCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw DualCameraError.backCameraUnavailable
        }
        
        let backInput = try AVCaptureDeviceInput(device: backCamera)
        guard session.canAddInput(backInput) else {
            throw DualCameraError.backCameraUnavailable
        }
        session.addInputWithNoConnections(backInput)
        backCameraInput = backInput
        
        // Setup front camera
        guard let frontCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) else {
            throw DualCameraError.frontCameraUnavailable
        }
        
        let frontInput = try AVCaptureDeviceInput(device: frontCamera)
        guard session.canAddInput(frontInput) else {
            throw DualCameraError.frontCameraUnavailable
        }
        session.addInputWithNoConnections(frontInput)
        frontCameraInput = frontInput
        
        // Setup back camera output
        let backOutput = AVCaptureVideoDataOutput()
        backOutput.setSampleBufferDelegate(self, queue: backCameraQueue)
        backOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        backOutput.alwaysDiscardsLateVideoFrames = true
        
        guard session.canAddOutput(backOutput) else {
            throw DualCameraError.outputSetupFailed
        }
        session.addOutputWithNoConnections(backOutput)
        backVideoOutput = backOutput
        
        // Setup front camera output
        let frontOutput = AVCaptureVideoDataOutput()
        frontOutput.setSampleBufferDelegate(self, queue: frontCameraQueue)
        frontOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        frontOutput.alwaysDiscardsLateVideoFrames = true
        
        guard session.canAddOutput(frontOutput) else {
            throw DualCameraError.outputSetupFailed
        }
        session.addOutputWithNoConnections(frontOutput)
        frontVideoOutput = frontOutput
        
        // Create connections
        guard let backPort = backInput.ports(for: .video, sourceDeviceType: backCamera.deviceType, sourceDevicePosition: .back).first else {
            throw DualCameraError.connectionFailed
        }
        let backConnection = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
        guard session.canAddConnection(backConnection) else {
            throw DualCameraError.connectionFailed
        }
        session.addConnection(backConnection)
        backConnection.videoOrientation = .portrait
        
        guard let frontPort = frontInput.ports(for: .video, sourceDeviceType: frontCamera.deviceType, sourceDevicePosition: .front).first else {
            throw DualCameraError.connectionFailed
        }
        let frontConnection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
        guard session.canAddConnection(frontConnection) else {
            throw DualCameraError.connectionFailed
        }
        session.addConnection(frontConnection)
        frontConnection.videoOrientation = .portrait
        frontConnection.isVideoMirrored = true
        
        session.commitConfiguration()
        
        print("[DualCam] Setup complete")
    }
    
    // MARK: - Start/Stop
    
    func start() {
        guard let session = multiCamSession, !session.isRunning else { return }
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            session.startRunning()
            DispatchQueue.main.async {
                self?.isRunning = true
                print("[DualCam] Started")
            }
        }
    }
    
    func stop() {
        guard let session = multiCamSession, session.isRunning else { return }
        
        session.stopRunning()
        DispatchQueue.main.async { [weak self] in
            self?.isRunning = false
            self?.backFrame = nil
            self?.frontFrame = nil
            print("[DualCam] Stopped")
        }
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        stop()
        multiCamSession = nil
        backCameraInput = nil
        frontCameraInput = nil
        backVideoOutput = nil
        frontVideoOutput = nil
    }
    
    // MARK: - Errors
    
    enum DualCameraError: Error, LocalizedError {
        case notSupported
        case sessionCreationFailed
        case backCameraUnavailable
        case frontCameraUnavailable
        case outputSetupFailed
        case connectionFailed
        
        var errorDescription: String? {
            switch self {
            case .notSupported: return "Multi-camera not supported on this device"
            case .sessionCreationFailed: return "Failed to create camera session"
            case .backCameraUnavailable: return "Back camera unavailable"
            case .frontCameraUnavailable: return "Front camera unavailable"
            case .outputSetupFailed: return "Failed to setup video output"
            case .connectionFailed: return "Failed to connect cameras"
            }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension DualCameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = Date()
        
        // Determine which camera
        let isBack = output == backVideoOutput
        
        // Rate limit
        if isBack {
            guard now.timeIntervalSince(lastBackFrameTime) >= frameInterval else { return }
            lastBackFrameTime = now
        } else {
            guard now.timeIntervalSince(lastFrontFrameTime) >= frameInterval else { return }
            lastFrontFrameTime = now
        }
        
        // Convert to UIImage
        guard let image = imageFromSampleBuffer(sampleBuffer) else { return }
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            if isBack {
                self.backFrame = image
            } else {
                self.frontFrame = image
            }
            
            // If we have both frames, trigger callback
            if let back = self.backFrame, let front = self.frontFrame {
                self.onDualFrames?(back, front)
            }
        }
    }
    
    private func imageFromSampleBuffer(_ sampleBuffer: CMSampleBuffer) -> UIImage? {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return nil }
        
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return nil }
        
        return UIImage(cgImage: cgImage)
    }
}
