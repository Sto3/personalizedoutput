/**
 * DualCameraService.swift
 *
 * REDI DUAL CAMERA SERVICE
 * 
 * Captures from both front and back cameras simultaneously:
 * - Uses AVCaptureMultiCamSession (iOS 13+, iPhone XS+)
 * - 5 FPS capture rate
 * - I420 to RGB conversion
 * - Graceful fallback for unsupported devices
 *
 * Created: Jan 29, 2026
 */

import Foundation
import AVFoundation
import UIKit

protocol DualCameraDelegate: AnyObject {
    func dualCamera(_ service: DualCameraService, didCaptureFront image: UIImage)
    func dualCamera(_ service: DualCameraService, didCaptureBack image: UIImage)
}

class DualCameraService: NSObject, ObservableObject {
    static let shared = DualCameraService()
    
    weak var delegate: DualCameraDelegate?
    
    @Published var isSupported = false
    @Published var isRunning = false
    @Published var latestFrontFrame: UIImage?
    @Published var latestBackFrame: UIImage?
    
    private var multiCamSession: AVCaptureMultiCamSession?
    private var frontOutput: AVCaptureVideoDataOutput?
    private var backOutput: AVCaptureVideoDataOutput?
    
    private let sessionQueue = DispatchQueue(label: "com.redi.dualcamera.session")
    private let frontOutputQueue = DispatchQueue(label: "com.redi.dualcamera.front")
    private let backOutputQueue = DispatchQueue(label: "com.redi.dualcamera.back")
    
    private var lastFrontCaptureTime = Date.distantPast
    private var lastBackCaptureTime = Date.distantPast
    private let captureInterval: TimeInterval = 0.2 // 5 FPS
    
    private override init() {
        super.init()
        checkSupport()
    }
    
    // MARK: - Support Check
    
    private func checkSupport() {
        // AVCaptureMultiCamSession requires iOS 13+ and specific hardware
        if #available(iOS 13.0, *) {
            isSupported = AVCaptureMultiCamSession.isMultiCamSupported
        } else {
            isSupported = false
        }
        
        print("[DualCamera] Multi-cam supported: \(isSupported)")
    }
    
    // MARK: - Session Management
    
    func startCapture() {
        guard isSupported else {
            print("[DualCamera] Multi-cam not supported on this device")
            return
        }
        
        sessionQueue.async { [weak self] in
            self?.setupSession()
            self?.multiCamSession?.startRunning()
            
            DispatchQueue.main.async {
                self?.isRunning = true
            }
        }
    }
    
    func stopCapture() {
        sessionQueue.async { [weak self] in
            self?.multiCamSession?.stopRunning()
            
            DispatchQueue.main.async {
                self?.isRunning = false
            }
        }
    }
    
    @available(iOS 13.0, *)
    private func setupSession() {
        guard multiCamSession == nil else { return }
        
        let session = AVCaptureMultiCamSession()
        
        // Configure front camera
        guard let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let frontInput = try? AVCaptureDeviceInput(device: frontDevice) else {
            print("[DualCamera] Failed to setup front camera")
            return
        }
        
        // Configure back camera
        guard let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backDevice) else {
            print("[DualCamera] Failed to setup back camera")
            return
        }
        
        session.beginConfiguration()
        
        // Add inputs
        if session.canAddInput(frontInput) {
            session.addInputWithNoConnections(frontInput)
        }
        if session.canAddInput(backInput) {
            session.addInputWithNoConnections(backInput)
        }
        
        // Setup front output
        let frontOutput = AVCaptureVideoDataOutput()
        frontOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        frontOutput.setSampleBufferDelegate(self, queue: frontOutputQueue)
        frontOutput.alwaysDiscardsLateVideoFrames = true
        
        if session.canAddOutput(frontOutput) {
            session.addOutputWithNoConnections(frontOutput)
        }
        
        // Setup back output
        let backOutput = AVCaptureVideoDataOutput()
        backOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        backOutput.setSampleBufferDelegate(self, queue: backOutputQueue)
        backOutput.alwaysDiscardsLateVideoFrames = true
        
        if session.canAddOutput(backOutput) {
            session.addOutputWithNoConnections(backOutput)
        }
        
        // Create connections
        if let frontPort = frontInput.ports(for: .video, sourceDeviceType: frontDevice.deviceType, sourceDevicePosition: .front).first {
            let connection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
            connection.videoOrientation = .portrait
            connection.isVideoMirrored = true
            if session.canAddConnection(connection) {
                session.addConnection(connection)
            }
        }
        
        if let backPort = backInput.ports(for: .video, sourceDeviceType: backDevice.deviceType, sourceDevicePosition: .back).first {
            let connection = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
            connection.videoOrientation = .portrait
            if session.canAddConnection(connection) {
                session.addConnection(connection)
            }
        }
        
        session.commitConfiguration()
        
        self.multiCamSession = session
        self.frontOutput = frontOutput
        self.backOutput = backOutput
        
        print("[DualCamera] Session configured successfully")
    }
    
    // MARK: - Frame Conversion
    
    private func imageFromSampleBuffer(_ sampleBuffer: CMSampleBuffer) -> UIImage? {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return nil
        }
        
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            return nil
        }
        
        return UIImage(cgImage: cgImage)
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension DualCameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = Date()
        
        // Determine which camera this is from
        let isFront = (output === frontOutput)
        let lastCapture = isFront ? lastFrontCaptureTime : lastBackCaptureTime
        
        // Rate limit to 5 FPS
        guard now.timeIntervalSince(lastCapture) >= captureInterval else {
            return
        }
        
        // Update last capture time
        if isFront {
            lastFrontCaptureTime = now
        } else {
            lastBackCaptureTime = now
        }
        
        // Convert to image
        guard let image = imageFromSampleBuffer(sampleBuffer) else {
            return
        }
        
        // Deliver to delegate and published properties
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            if isFront {
                self.latestFrontFrame = image
                self.delegate?.dualCamera(self, didCaptureFront: image)
            } else {
                self.latestBackFrame = image
                self.delegate?.dualCamera(self, didCaptureBack: image)
            }
        }
    }
}
