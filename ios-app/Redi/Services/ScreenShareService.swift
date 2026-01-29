/**
 * ScreenShareService.swift
 *
 * REDI SCREEN SHARING - iOS WebRTC Receiver
 * 
 * Receives screen share from computer via WebRTC.
 * Flow:
 * 1. Connect to signaling server, receive pairing code
 * 2. Wait for computer to connect with code
 * 3. Exchange WebRTC signaling (offer/answer/ICE)
 * 4. Receive video stream from computer
 * 5. Extract frames for AI vision processing
 *
 * Created: Jan 26, 2026
 */

import Foundation
import WebRTC
import Combine
import UIKit

class ScreenShareService: NSObject, ObservableObject {
    // MARK: - Published State
    
    @Published var connectionState: ConnectionState = .disconnected
    @Published var pairingCode: String?
    @Published var latestFrame: UIImage?
    @Published var error: String?
    
    enum ConnectionState {
        case disconnected
        case waitingForCode
        case waitingForComputer
        case connecting
        case connected
        case error
    }
    
    // MARK: - WebSocket
    
    private var webSocket: URLSessionWebSocketTask?
    private let signalingURL = URL(string: "wss://redialways.com/ws/screen")!
    
    // MARK: - WebRTC
    
    private var factory: RTCPeerConnectionFactory?
    private var peerConnection: RTCPeerConnection?
    private var remoteVideoTrack: RTCVideoTrack?
    private var videoRenderer: FrameCaptureRenderer?
    
    private static var rtcInitialized = false
    
    // MARK: - Frame Processing
    
    private var lastFrameTime: Date = .distantPast
    private let frameInterval: TimeInterval = 0.5 // 2 FPS for AI processing
    
    // MARK: - Callbacks
    
    var onFrameReceived: ((UIImage) -> Void)?
    
    // MARK: - Init
    
    override init() {
        super.init()
        
        if !ScreenShareService.rtcInitialized {
            RTCInitializeSSL()
            ScreenShareService.rtcInitialized = true
        }
        
        setupFactory()
    }
    
    private func setupFactory() {
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        factory = RTCPeerConnectionFactory(encoderFactory: encoderFactory, decoderFactory: decoderFactory)
    }
    
    // MARK: - Start Pairing
    
    func startPairing() {
        guard connectionState == .disconnected else { return }
        
        connectionState = .waitingForCode
        error = nil
        
        // Connect to signaling server as phone
        var request = URLRequest(url: signalingURL)
        request.url = URL(string: "\(signalingURL)?role=phone&name=Redi")
        
        webSocket = URLSession.shared.webSocketTask(with: request)
        webSocket?.resume()
        receiveMessage()
        
        print("[ScreenShare] Connecting to signaling server...")
    }
    
    // MARK: - Stop
    
    func stop() {
        // Close WebRTC
        if let renderer = videoRenderer {
            remoteVideoTrack?.remove(renderer)
        }
        remoteVideoTrack = nil
        videoRenderer = nil
        peerConnection?.close()
        peerConnection = nil
        
        // Close WebSocket
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        
        // Reset state
        DispatchQueue.main.async {
            self.connectionState = .disconnected
            self.pairingCode = nil
            self.latestFrame = nil
        }
        
        print("[ScreenShare] Stopped")
    }
    
    // MARK: - WebSocket Message Handling
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                self.handleMessage(message)
                self.receiveMessage() // Continue receiving
                
            case .failure(let error):
                print("[ScreenShare] WebSocket error: \(error)")
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                    self.connectionState = .error
                }
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
                DispatchQueue.main.async {
                    self.pairingCode = code
                    self.connectionState = .waitingForComputer
                }
                print("[ScreenShare] Pairing code: \(code)")
            }
            
        case "paired":
            DispatchQueue.main.async {
                self.connectionState = .connecting
            }
            setupPeerConnection()
            print("[ScreenShare] Computer paired")
            
        case "offer":
            if let offerDict = json["offer"] as? [String: Any],
               let sdp = offerDict["sdp"] as? String {
                handleOffer(sdp)
            }
            
        case "ice-candidate":
            if let candidateDict = json["candidate"] as? [String: Any],
               let sdp = candidateDict["candidate"] as? String,
               let sdpMLineIndex = candidateDict["sdpMLineIndex"] as? Int32,
               let sdpMid = candidateDict["sdpMid"] as? String {
                let candidate = RTCIceCandidate(sdp: sdp, sdpMLineIndex: sdpMLineIndex, sdpMid: sdpMid)
                peerConnection?.add(candidate) { error in
                    if let error = error {
                        print("[ScreenShare] ICE error: \(error)")
                    }
                }
            }
            
        case "error":
            if let msg = json["message"] as? String {
                DispatchQueue.main.async {
                    self.error = msg
                    self.connectionState = .error
                }
            }
            
        case "disconnected":
            DispatchQueue.main.async {
                self.stop()
            }
            
        default:
            break
        }
    }
    
    // MARK: - WebRTC Setup
    
    private func setupPeerConnection() {
        guard let factory = factory else { return }
        
        let config = RTCConfiguration()
        config.iceServers = [
            RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"]),
            RTCIceServer(urlStrings: ["stun:stun1.l.google.com:19302"])
        ]
        config.sdpSemantics = .unifiedPlan
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )
        
        peerConnection = factory.peerConnection(with: config, constraints: constraints, delegate: self)
        
        // Create frame renderer
        videoRenderer = FrameCaptureRenderer { [weak self] frame in
            self?.handleVideoFrame(frame)
        }
    }
    
    // MARK: - Handle Offer
    
    private func handleOffer(_ sdp: String) {
        guard let pc = peerConnection else { return }
        
        let offer = RTCSessionDescription(type: .offer, sdp: sdp)
        
        pc.setRemoteDescription(offer) { [weak self] error in
            if let error = error {
                print("[ScreenShare] Set remote description error: \(error)")
                return
            }
            self?.createAnswer()
        }
    }
    
    private func createAnswer() {
        guard let pc = peerConnection else { return }
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: ["OfferToReceiveVideo": "true"],
            optionalConstraints: nil
        )
        
        pc.answer(for: constraints) { [weak self] answer, error in
            if let error = error {
                print("[ScreenShare] Create answer error: \(error)")
                return
            }
            
            guard let answer = answer else { return }
            
            pc.setLocalDescription(answer) { error in
                if let error = error {
                    print("[ScreenShare] Set local description error: \(error)")
                    return
                }
                
                self?.sendAnswer(answer)
            }
        }
    }
    
    // MARK: - Send Messages
    
    private func sendAnswer(_ answer: RTCSessionDescription) {
        let message: [String: Any] = [
            "type": "answer",
            "answer": [
                "type": "answer",
                "sdp": answer.sdp
            ]
        ]
        sendMessage(message)
    }
    
    private func sendIceCandidate(_ candidate: RTCIceCandidate) {
        let message: [String: Any] = [
            "type": "ice-candidate",
            "candidate": [
                "candidate": candidate.sdp,
                "sdpMLineIndex": candidate.sdpMLineIndex,
                "sdpMid": candidate.sdpMid ?? ""
            ]
        ]
        sendMessage(message)
    }
    
    private func sendMessage(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let text = String(data: data, encoding: .utf8) else { return }
        
        webSocket?.send(.string(text)) { error in
            if let error = error {
                print("[ScreenShare] Send error: \(error)")
            }
        }
    }
    
    // MARK: - Video Frame Handling
    
    private func handleVideoFrame(_ frame: RTCVideoFrame) {
        let now = Date()
        guard now.timeIntervalSince(lastFrameTime) >= frameInterval else { return }
        lastFrameTime = now
        
        // Convert RTCVideoFrame to UIImage
        guard let image = imageFromVideoFrame(frame) else { return }
        
        DispatchQueue.main.async {
            self.latestFrame = image
            self.onFrameReceived?(image)
        }
    }
    
    private func imageFromVideoFrame(_ frame: RTCVideoFrame) -> UIImage? {
        guard let buffer = frame.buffer as? RTCI420Buffer else { return nil }
        
        let width = Int(buffer.width)
        let height = Int(buffer.height)
        
        // Create CGImage from I420 buffer
        // This is a simplified conversion - production might need more sophisticated handling
        let rgbData = convertI420ToRGB(buffer)
        
        guard let provider = CGDataProvider(data: rgbData as CFData),
              let cgImage = CGImage(
                width: width,
                height: height,
                bitsPerComponent: 8,
                bitsPerPixel: 24,
                bytesPerRow: width * 3,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue),
                provider: provider,
                decode: nil,
                shouldInterpolate: true,
                intent: .defaultIntent
              ) else { return nil }
        
        return UIImage(cgImage: cgImage)
    }
    
    private func convertI420ToRGB(_ buffer: RTCI420Buffer) -> Data {
        let width = Int(buffer.width)
        let height = Int(buffer.height)
        var rgbData = Data(count: width * height * 3)
        
        rgbData.withUnsafeMutableBytes { rgbPtr in
            guard let rgb = rgbPtr.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
            
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
                    
                    // YUV to RGB conversion
                    var r = yValue + (359 * vValue) / 256
                    var g = yValue - (88 * uValue) / 256 - (183 * vValue) / 256
                    var b = yValue + (454 * uValue) / 256
                    
                    r = max(0, min(255, r))
                    g = max(0, min(255, g))
                    b = max(0, min(255, b))
                    
                    let pixelIndex = (y * width + x) * 3
                    rgb[pixelIndex] = UInt8(r)
                    rgb[pixelIndex + 1] = UInt8(g)
                    rgb[pixelIndex + 2] = UInt8(b)
                }
            }
        }
        
        return rgbData
    }
}

// MARK: - RTCPeerConnectionDelegate

extension ScreenShareService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange state: RTCSignalingState) {
        print("[ScreenShare] Signaling state: \(state.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("[ScreenShare] Stream added with \(stream.videoTracks.count) video tracks")
        
        if let videoTrack = stream.videoTracks.first {
            remoteVideoTrack = videoTrack
            if let renderer = videoRenderer {
                videoTrack.add(renderer)
            }
            
            DispatchQueue.main.async {
                self.connectionState = .connected
            }
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        print("[ScreenShare] Stream removed")
    }
    
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        print("[ScreenShare] Should negotiate")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange state: RTCIceConnectionState) {
        print("[ScreenShare] ICE state: \(state.rawValue)")
        
        switch state {
        case .connected, .completed:
            DispatchQueue.main.async {
                self.connectionState = .connected
            }
        case .failed, .disconnected:
            DispatchQueue.main.async {
                self.connectionState = .error
                self.error = "Connection lost"
            }
        default:
            break
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange state: RTCIceGatheringState) {
        print("[ScreenShare] ICE gathering: \(state.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        sendIceCandidate(candidate)
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
}

// MARK: - Frame Capture Renderer

class FrameCaptureRenderer: NSObject, RTCVideoRenderer {
    private let onFrame: (RTCVideoFrame) -> Void
    
    init(onFrame: @escaping (RTCVideoFrame) -> Void) {
        self.onFrame = onFrame
        super.init()
    }
    
    func setSize(_ size: CGSize) {}
    
    func renderFrame(_ frame: RTCVideoFrame?) {
        guard let frame = frame else { return }
        onFrame(frame)
    }
}
