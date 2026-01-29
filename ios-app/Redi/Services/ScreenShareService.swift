/**
 * ScreenShareService.swift
 *
 * REDI SCREEN SHARE SERVICE
 * 
 * Manages WebRTC connection for desktop screen sharing:
 * - WebSocket signaling
 * - Pairing code generation
 * - WebRTC peer connection
 * - Frame extraction
 *
 * Created: Jan 29, 2026
 */

import Foundation
import WebRTC
import UIKit

enum ScreenShareState {
    case disconnected
    case connecting
    case waitingForComputer
    case connected
    case error(String)
}

class ScreenShareService: NSObject, ObservableObject {
    static let shared = ScreenShareService()
    
    @Published var connectionState: ScreenShareState = .disconnected
    @Published var pairingCode: String = ""
    @Published var latestFrame: UIImage?
    
    private var webSocket: URLSessionWebSocketTask?
    private var peerConnection: RTCPeerConnection?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    
    private let serverURL = "wss://personalizedoutput.onrender.com/ws/screen"
    
    private override init() {
        super.init()
        setupWebRTC()
    }
    
    // MARK: - WebRTC Setup
    
    private func setupWebRTC() {
        RTCInitializeSSL()
        
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        
        peerConnectionFactory = RTCPeerConnectionFactory(
            encoderFactory: encoderFactory,
            decoderFactory: decoderFactory
        )
    }
    
    // MARK: - Connection Management
    
    func connect() {
        guard connectionState == .disconnected || connectionState == .error("") else {
            return
        }
        
        DispatchQueue.main.async {
            self.connectionState = .connecting
        }
        
        // Connect as 'phone' role to get pairing code
        let urlString = "\(serverURL)?role=phone&name=Redi"
        guard let url = URL(string: urlString) else {
            DispatchQueue.main.async {
                self.connectionState = .error("Invalid server URL")
            }
            return
        }
        
        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        
        receiveMessage()
    }
    
    func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        
        peerConnection?.close()
        peerConnection = nil
        
        DispatchQueue.main.async {
            self.connectionState = .disconnected
            self.pairingCode = ""
            self.latestFrame = nil
        }
    }
    
    // MARK: - WebSocket Communication
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                
                // Continue receiving
                self?.receiveMessage()
                
            case .failure(let error):
                print("[ScreenShare] WebSocket error: \(error)")
                DispatchQueue.main.async {
                    self?.connectionState = .error(error.localizedDescription)
                }
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
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
            }
            
        case "paired":
            DispatchQueue.main.async {
                self.connectionState = .connected
            }
            
        case "offer":
            if let offer = json["offer"] as? [String: Any] {
                handleOffer(offer)
            }
            
        case "ice-candidate":
            if let candidate = json["candidate"] as? [String: Any] {
                handleIceCandidate(candidate)
            }
            
        case "disconnected":
            DispatchQueue.main.async {
                self.connectionState = .disconnected
                self.pairingCode = ""
            }
            
        case "error":
            let message = json["message"] as? String ?? "Unknown error"
            DispatchQueue.main.async {
                self.connectionState = .error(message)
            }
            
        default:
            break
        }
    }
    
    private func sendMessage(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let text = String(data: data, encoding: .utf8) else {
            return
        }
        
        webSocket?.send(.string(text)) { error in
            if let error = error {
                print("[ScreenShare] Send error: \(error)")
            }
        }
    }
    
    // MARK: - WebRTC Signaling
    
    private func handleOffer(_ offer: [String: Any]) {
        guard let sdp = offer["sdp"] as? String,
              let factory = peerConnectionFactory else {
            return
        }
        
        // Create peer connection
        let config = RTCConfiguration()
        config.iceServers = [
            RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"]),
            RTCIceServer(urlStrings: ["stun:stun1.l.google.com:19302"])
        ]
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: nil
        )
        
        peerConnection = factory.peerConnection(
            with: config,
            constraints: constraints,
            delegate: self
        )
        
        // Set remote description (the offer)
        let sessionDescription = RTCSessionDescription(type: .offer, sdp: sdp)
        peerConnection?.setRemoteDescription(sessionDescription) { [weak self] error in
            if let error = error {
                print("[ScreenShare] Set remote description error: \(error)")
                return
            }
            
            // Create answer
            self?.createAnswer()
        }
    }
    
    private func createAnswer() {
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveVideo": "true",
                "OfferToReceiveAudio": "false"
            ],
            optionalConstraints: nil
        )
        
        peerConnection?.answer(for: constraints) { [weak self] answer, error in
            if let error = error {
                print("[ScreenShare] Create answer error: \(error)")
                return
            }
            
            guard let answer = answer else { return }
            
            self?.peerConnection?.setLocalDescription(answer) { error in
                if let error = error {
                    print("[ScreenShare] Set local description error: \(error)")
                    return
                }
                
                // Send answer to computer
                self?.sendMessage([
                    "type": "answer",
                    "answer": [
                        "type": "answer",
                        "sdp": answer.sdp
                    ]
                ])
            }
        }
    }
    
    private func handleIceCandidate(_ candidate: [String: Any]) {
        guard let sdpMid = candidate["sdpMid"] as? String,
              let sdpMLineIndex = candidate["sdpMLineIndex"] as? Int32,
              let sdp = candidate["candidate"] as? String else {
            return
        }
        
        let iceCandidate = RTCIceCandidate(
            sdp: sdp,
            sdpMLineIndex: sdpMLineIndex,
            sdpMid: sdpMid
        )
        
        peerConnection?.add(iceCandidate) { error in
            if let error = error {
                print("[ScreenShare] Add ICE candidate error: \(error)")
            }
        }
    }
}

// MARK: - RTCPeerConnectionDelegate

extension ScreenShareService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        print("[ScreenShare] Signaling state: \(stateChanged.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("[ScreenShare] Stream added with \(stream.videoTracks.count) video tracks")
        
        if let videoTrack = stream.videoTracks.first {
            // Add renderer to capture frames
            let renderer = FrameCaptureRenderer { [weak self] image in
                DispatchQueue.main.async {
                    self?.latestFrame = image
                }
            }
            videoTrack.add(renderer)
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
        
        DispatchQueue.main.async {
            switch newState {
            case .connected, .completed:
                self.connectionState = .connected
            case .disconnected, .failed, .closed:
                self.connectionState = .disconnected
            default:
                break
            }
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        print("[ScreenShare] ICE gathering state: \(newState.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        // Send ICE candidate to computer
        sendMessage([
            "type": "ice-candidate",
            "candidate": [
                "candidate": candidate.sdp,
                "sdpMid": candidate.sdpMid ?? "",
                "sdpMLineIndex": candidate.sdpMLineIndex
            ]
        ])
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
    private let onFrame: (UIImage) -> Void
    private var frameCount = 0
    private let captureInterval = 30 // Capture every 30 frames (~2 FPS at 60fps source)
    
    init(onFrame: @escaping (UIImage) -> Void) {
        self.onFrame = onFrame
        super.init()
    }
    
    func setSize(_ size: CGSize) {
        // Not needed for frame capture
    }
    
    func renderFrame(_ frame: RTCVideoFrame?) {
        frameCount += 1
        
        // Only capture periodically
        guard frameCount % captureInterval == 0,
              let frame = frame else {
            return
        }
        
        // Convert frame to UIImage
        guard let buffer = frame.buffer as? RTCCVPixelBuffer else { return }
        let pixelBuffer = buffer.pixelBuffer
        
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        let image = UIImage(cgImage: cgImage)
        
        onFrame(image)
    }
}
