/**
 * ScreenShareService.swift
 *
 * REDI SCREEN SHARE SERVICE - SECURE VERSION
 * 
 * Security Features:
 * - 8-character alphanumeric codes
 * - Connection approval required before video starts
 * - Device info shown before approval
 * - 5-minute code expiration
 *
 * Created: Jan 29, 2026
 * Updated: Feb 1, 2026 - Security hardening
 */

import Foundation
import WebRTC
import UIKit

class ScreenShareService: NSObject, ObservableObject {
    static let shared = ScreenShareService()
    
    // MARK: - Published State
    
    enum ConnectionState: Equatable {
        case disconnected
        case connecting
        case waitingForPeer
        case pendingApproval
        case connected
        case error(String)
    }
    
    struct ComputerInfo: Equatable {
        let ip: String
        let browser: String
        let os: String
    }
    
    @Published var connectionState: ConnectionState = .disconnected
    @Published var pairingCode: String?
    @Published var codeExpiresIn: Int = 0 // seconds
    @Published var latestFrame: Data?
    @Published var pendingComputerInfo: ComputerInfo?
    
    // MARK: - Private Properties
    
    private var webSocket: URLSessionWebSocketTask?
    private var peerConnection: RTCPeerConnection?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    private var frameRenderer: FrameCaptureRenderer?
    private var expirationTimer: Timer?
    
    private let serverURL = "wss://personalizedoutput.onrender.com/ws/screen"
    
    // MARK: - WebRTC Configuration
    
    private lazy var rtcConfig: RTCConfiguration = {
        let config = RTCConfiguration()
        config.iceServers = [
            RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"]),
            RTCIceServer(urlStrings: ["stun:stun1.l.google.com:19302"])
        ]
        config.sdpSemantics = .unifiedPlan
        config.continualGatheringPolicy = .gatherContinually
        return config
    }()
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        initializeWebRTC()
    }
    
    private func initializeWebRTC() {
        RTCInitializeSSL()
        
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        peerConnectionFactory = RTCPeerConnectionFactory(
            encoderFactory: encoderFactory,
            decoderFactory: decoderFactory
        )
    }
    
    // MARK: - Public Methods
    
    func connect() {
        guard connectionState == .disconnected || isErrorState else { return }
        
        DispatchQueue.main.async {
            self.connectionState = .connecting
        }
        
        // Connect as "phone" role
        let urlString = "\(serverURL)?role=phone&name=Redi"
        guard let url = URL(string: urlString) else {
            setError("Invalid server URL")
            return
        }
        
        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        
        receiveMessage()
        
        print("[ScreenShare] 🔐 Connecting to secure server...")
    }
    
    func disconnect() {
        expirationTimer?.invalidate()
        expirationTimer = nil
        
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        
        peerConnection?.close()
        peerConnection = nil
        
        DispatchQueue.main.async {
            self.connectionState = .disconnected
            self.pairingCode = nil
            self.codeExpiresIn = 0
            self.latestFrame = nil
            self.pendingComputerInfo = nil
        }
        
        print("[ScreenShare] Disconnected")
    }
    
    /// Approve a pending connection request
    func approveConnection() {
        sendJSON(["type": "approve"])
        DispatchQueue.main.async {
            self.pendingComputerInfo = nil
        }
        print("[ScreenShare] ✅ Connection approved by user")
    }
    
    /// Reject a pending connection request
    func rejectConnection() {
        sendJSON(["type": "reject"])
        DispatchQueue.main.async {
            self.connectionState = .waitingForPeer
            self.pendingComputerInfo = nil
        }
        print("[ScreenShare] ❌ Connection rejected by user")
    }
    
    // MARK: - WebSocket Message Handling
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage() // Continue listening
                
            case .failure(let error):
                print("[ScreenShare] WebSocket error: \(error)")
                self?.setError("Connection lost")
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        guard case .string(let text) = message,
              let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }
        
        print("[ScreenShare] Received: \(type)")
        
        switch type {
        case "code":
            if let code = json["code"] as? String {
                let expiresIn = json["expiresIn"] as? Int ?? 300
                DispatchQueue.main.async {
                    self.pairingCode = code
                    self.codeExpiresIn = expiresIn
                    self.connectionState = .waitingForPeer
                }
                startExpirationTimer(seconds: expiresIn)
            }
            
        case "approval_request":
            // Computer wants to connect - show approval dialog
            if let info = json["computerInfo"] as? [String: Any] {
                let computerInfo = ComputerInfo(
                    ip: info["ip"] as? String ?? "Unknown",
                    browser: info["browser"] as? String ?? "Unknown",
                    os: info["os"] as? String ?? "Unknown"
                )
                DispatchQueue.main.async {
                    self.pendingComputerInfo = computerInfo
                    self.connectionState = .pendingApproval
                }
            }
            
        case "paired":
            print("[ScreenShare] ✅ Paired with computer")
            DispatchQueue.main.async {
                self.connectionState = .connected
            }
            
        case "offer":
            handleOffer(json)
            
        case "ice-candidate":
            handleIceCandidate(json)
            
        case "disconnected":
            DispatchQueue.main.async {
                self.connectionState = .waitingForPeer
                self.pendingComputerInfo = nil
            }
            
        case "error":
            if let message = json["message"] as? String {
                setError(message)
            }
            
        default:
            break
        }
    }
    
    // MARK: - Expiration Timer
    
    private func startExpirationTimer(seconds: Int) {
        expirationTimer?.invalidate()
        
        var remaining = seconds
        expirationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            remaining -= 1
            DispatchQueue.main.async {
                self?.codeExpiresIn = remaining
            }
            
            if remaining <= 0 {
                timer.invalidate()
                self?.setError("Code expired. Please try again.")
            }
        }
    }
    
    // MARK: - WebRTC Signaling
    
    private func handleOffer(_ json: [String: Any]) {
        guard let offerDict = json["offer"] as? [String: Any],
              let sdp = offerDict["sdp"] as? String else {
            return
        }
        
        // Create peer connection
        setupPeerConnection()
        
        // Set remote description
        let offer = RTCSessionDescription(type: .offer, sdp: sdp)
        peerConnection?.setRemoteDescription(offer) { [weak self] error in
            if let error = error {
                print("[ScreenShare] Failed to set offer: \(error)")
                return
            }
            
            // Create answer
            self?.createAnswer()
        }
    }
    
    private func createAnswer() {
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: nil
        )
        
        peerConnection?.answer(for: constraints) { [weak self] answer, error in
            guard let answer = answer else {
                print("[ScreenShare] Failed to create answer: \(error?.localizedDescription ?? "unknown")")
                return
            }
            
            self?.peerConnection?.setLocalDescription(answer) { error in
                if let error = error {
                    print("[ScreenShare] Failed to set local description: \(error)")
                    return
                }
                
                // Send answer to server
                self?.sendAnswer(answer)
            }
        }
    }
    
    private func sendAnswer(_ answer: RTCSessionDescription) {
        let message: [String: Any] = [
            "type": "answer",
            "answer": [
                "type": "answer",
                "sdp": answer.sdp
            ]
        ]
        
        sendJSON(message)
    }
    
    private func handleIceCandidate(_ json: [String: Any]) {
        guard let candidateDict = json["candidate"] as? [String: Any],
              let sdp = candidateDict["candidate"] as? String,
              let sdpMLineIndex = candidateDict["sdpMLineIndex"] as? Int32,
              let sdpMid = candidateDict["sdpMid"] as? String else {
            return
        }
        
        let candidate = RTCIceCandidate(
            sdp: sdp,
            sdpMLineIndex: sdpMLineIndex,
            sdpMid: sdpMid
        )
        
        // Add ICE candidate (no completion handler in this WebRTC version)
        peerConnection?.add(candidate)
    }
    
    // MARK: - Peer Connection Setup
    
    private func setupPeerConnection() {
        guard let factory = peerConnectionFactory else { return }
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )
        
        peerConnection = factory.peerConnection(
            with: rtcConfig,
            constraints: constraints,
            delegate: self
        )
    }
    
    // MARK: - Helpers
    
    private func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            return
        }
        
        webSocket?.send(.string(string)) { error in
            if let error = error {
                print("[ScreenShare] Send error: \(error)")
            }
        }
    }
    
    private func setError(_ message: String) {
        DispatchQueue.main.async {
            self.connectionState = .error(message)
            self.pendingComputerInfo = nil
        }
    }
    
    private var isErrorState: Bool {
        if case .error = connectionState { return true }
        return false
    }
}

// MARK: - RTCPeerConnectionDelegate

extension ScreenShareService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        print("[ScreenShare] Signaling state: \(stateChanged.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("[ScreenShare] Stream added")
        
        // Get video track
        if let videoTrack = stream.videoTracks.first {
            DispatchQueue.main.async {
                self.connectionState = .connected
            }
            
            // Setup frame capture
            frameRenderer = FrameCaptureRenderer { [weak self] frameData in
                self?.latestFrame = frameData
            }
            
            videoTrack.add(frameRenderer!)
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        print("[ScreenShare] Stream removed")
    }
    
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        print("[ScreenShare] Should negotiate")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        print("[ScreenShare] ICE connection state: \(newState.rawValue)")
        
        switch newState {
        case .connected, .completed:
            DispatchQueue.main.async {
                self.connectionState = .connected
            }
        case .disconnected, .failed:
            DispatchQueue.main.async {
                self.connectionState = .waitingForPeer
            }
        default:
            break
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        print("[ScreenShare] ICE gathering state: \(newState.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        // Send ICE candidate to server
        let message: [String: Any] = [
            "type": "ice-candidate",
            "candidate": [
                "candidate": candidate.sdp,
                "sdpMLineIndex": candidate.sdpMLineIndex,
                "sdpMid": candidate.sdpMid ?? ""
            ]
        ]
        
        sendJSON(message)
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {
        print("[ScreenShare] ICE candidates removed")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        print("[ScreenShare] Data channel opened")
    }
}

// MARK: - Frame Capture Renderer

class FrameCaptureRenderer: NSObject, RTCVideoRenderer {
    private var lastCaptureTime: Date = .distantPast
    private let captureInterval: TimeInterval = 0.5 // 2 FPS
    private let onFrame: (Data) -> Void
    
    init(onFrame: @escaping (Data) -> Void) {
        self.onFrame = onFrame
        super.init()
    }
    
    func setSize(_ size: CGSize) {
        // Not needed for our use case
    }
    
    func renderFrame(_ frame: RTCVideoFrame?) {
        guard let frame = frame else { return }
        
        // Throttle frame capture
        let now = Date()
        guard now.timeIntervalSince(lastCaptureTime) >= captureInterval else { return }
        lastCaptureTime = now
        
        // Convert frame to JPEG
        if let imageData = convertFrameToJPEG(frame) {
            DispatchQueue.main.async {
                self.onFrame(imageData)
            }
        }
    }
    
    private func convertFrameToJPEG(_ frame: RTCVideoFrame) -> Data? {
        guard let buffer = frame.buffer as? RTCI420Buffer else { return nil }
        
        let width = Int(buffer.width)
        let height = Int(buffer.height)
        
        // Create RGB buffer
        var rgbData = [UInt8](repeating: 0, count: width * height * 4)
        
        // Convert I420 to RGBA
        let yPlane = buffer.dataY
        let uPlane = buffer.dataU
        let vPlane = buffer.dataV
        
        for y in 0..<height {
            for x in 0..<width {
                let yIndex = y * Int(buffer.strideY) + x
                let uvIndex = (y / 2) * Int(buffer.strideU) + (x / 2)
                
                let yValue = Int(yPlane[yIndex])
                let uValue = Int(uPlane[uvIndex]) - 128
                let vValue = Int(vPlane[uvIndex]) - 128
                
                var r = yValue + Int(1.402 * Double(vValue))
                var g = yValue - Int(0.344 * Double(uValue)) - Int(0.714 * Double(vValue))
                var b = yValue + Int(1.772 * Double(uValue))
                
                r = max(0, min(255, r))
                g = max(0, min(255, g))
                b = max(0, min(255, b))
                
                let pixelIndex = (y * width + x) * 4
                rgbData[pixelIndex] = UInt8(r)
                rgbData[pixelIndex + 1] = UInt8(g)
                rgbData[pixelIndex + 2] = UInt8(b)
                rgbData[pixelIndex + 3] = 255
            }
        }
        
        // Create CGImage
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
        
        guard let provider = CGDataProvider(data: Data(rgbData) as CFData),
              let cgImage = CGImage(
                width: width,
                height: height,
                bitsPerComponent: 8,
                bitsPerPixel: 32,
                bytesPerRow: width * 4,
                space: colorSpace,
                bitmapInfo: bitmapInfo,
                provider: provider,
                decode: nil,
                shouldInterpolate: false,
                intent: .defaultIntent
              ) else {
            return nil
        }
        
        // Convert to JPEG
        let uiImage = UIImage(cgImage: cgImage)
        return uiImage.jpegData(compressionQuality: 0.8)
    }
}
