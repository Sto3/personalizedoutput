/**
 * ScreenShareService.swift
 *
 * REDI SCREEN SHARE SERVICE - SECURE VERSION
 *
 * Handles WebRTC-based screen sharing from computer to phone.
 * Computer shares screen via redialways.com/screen -> WebRTC -> this service -> frames.
 *
 * Frame forwarding:
 * - onFrameReceived callback allows V9 pipeline to consume frames
 * - Frames captured every 3 seconds as JPEG (quality 0.6)
 *
 * Created: Jan 29, 2026
 * Updated: Feb 21, 2026 - Fixed WebRTC API compat, delegate retention, access control
 */

import Foundation
import SwiftUI
import WebRTC
import Combine

// MARK: - Connection State

enum ScreenShareConnectionState: Equatable {
    case disconnected
    case connecting
    case waitingForPeer
    case pendingApproval
    case connected
    case error(String)
    
    static func == (lhs: ScreenShareConnectionState, rhs: ScreenShareConnectionState) -> Bool {
        switch (lhs, rhs) {
        case (.disconnected, .disconnected): return true
        case (.connecting, .connecting): return true
        case (.waitingForPeer, .waitingForPeer): return true
        case (.pendingApproval, .pendingApproval): return true
        case (.connected, .connected): return true
        case (.error(let a), .error(let b)): return a == b
        default: return false
        }
    }
}

// MARK: - Computer Info

struct ComputerInfo {
    let browser: String
    let os: String
    let ip: String
}

// MARK: - Frame Capture Renderer

class FrameCaptureRenderer: NSObject, RTCVideoRenderer {
    var onFrame: ((Data) -> Void)?
    private var lastCaptureTime: Date = .distantPast
    private let captureInterval: TimeInterval = 3.0
    private let jpegQuality: CGFloat = 0.6
    
    func setSize(_ size: CGSize) {}
    
    func renderFrame(_ frame: RTCVideoFrame?) {
        guard let frame = frame else { return }
        let now = Date()
        guard now.timeIntervalSince(lastCaptureTime) >= captureInterval else { return }
        lastCaptureTime = now
        guard let buffer = frame.buffer as? RTCCVPixelBuffer else { return }
        let pixelBuffer = buffer.pixelBuffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        let uiImage = UIImage(cgImage: cgImage)
        guard let jpegData = uiImage.jpegData(compressionQuality: jpegQuality) else { return }
        DispatchQueue.main.async { self.onFrame?(jpegData) }
    }
}

// MARK: - WebRTC Delegate (moved outside ScreenShareService for access control)

class ScreenShareWebRTCDelegate: NSObject, RTCPeerConnectionDelegate {
    weak var service: ScreenShareService?
    let renderer: FrameCaptureRenderer
    
    init(service: ScreenShareService, renderer: FrameCaptureRenderer) {
        self.service = service
        self.renderer = renderer
    }
    
    func peerConnection(_ pc: RTCPeerConnection, didChange s: RTCSignalingState) {}
    func peerConnection(_ pc: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        if let vt = stream.videoTracks.first {
            vt.add(renderer)
            DispatchQueue.main.async { self.service?.connectionState = .connected }
        }
    }
    func peerConnection(_ pc: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ pc: RTCPeerConnection) {}
    func peerConnection(_ pc: RTCPeerConnection, didChange s: RTCIceConnectionState) {
        if s == .disconnected || s == .failed {
            DispatchQueue.main.async { self.service?.connectionState = .disconnected; self.service?.latestFrame = nil }
        }
    }
    func peerConnection(_ pc: RTCPeerConnection, didChange s: RTCIceGatheringState) {}
    func peerConnection(_ pc: RTCPeerConnection, didGenerate c: RTCIceCandidate) {
        service?.sendSignalingMessage(["type": "ice_candidate", "candidate": c.sdp, "sdpMid": c.sdpMid ?? "", "sdpMLineIndex": c.sdpMLineIndex])
    }
    func peerConnection(_ pc: RTCPeerConnection, didRemove c: [RTCIceCandidate]) {}
    func peerConnection(_ pc: RTCPeerConnection, didOpen dc: RTCDataChannel) {}
}

// MARK: - Screen Share Service

class ScreenShareService: ObservableObject {
    static let shared = ScreenShareService()
    
    @Published var connectionState: ScreenShareConnectionState = .disconnected
    @Published var pairingCode: String? = nil
    @Published var codeExpiresIn: Int = 300
    @Published var pendingComputerInfo: ComputerInfo? = nil
    @Published var latestFrame: Data? = nil
    
    var onFrameReceived: ((Data) -> Void)?
    
    var isReceivingFrames: Bool {
        if case .connected = connectionState { return latestFrame != nil }
        return false
    }
    
    private var webSocket: URLSessionWebSocketTask?
    private var peerConnection: RTCPeerConnection?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    private var frameRenderer: FrameCaptureRenderer?
    private var webrtcDelegate: ScreenShareWebRTCDelegate?  // Strong reference to prevent deallocation
    private var codeTimer: Timer?
    private var urlSession: URLSession?
    private let serverURL = "wss://redialways.com/ws/screen"
    
    private init() { setupWebRTC() }
    
    private func setupWebRTC() {
        RTCInitializeSSL()
        let ef = RTCDefaultVideoEncoderFactory()
        let df = RTCDefaultVideoDecoderFactory()
        peerConnectionFactory = RTCPeerConnectionFactory(encoderFactory: ef, decoderFactory: df)
    }
    
    func connect() {
        DispatchQueue.main.async { self.connectionState = .connecting }
        let url = URL(string: "\(serverURL)?role=phone")!
        urlSession = URLSession(configuration: .default)
        webSocket = urlSession?.webSocketTask(with: url)
        webSocket?.resume()
        receiveMessage()
    }
    
    func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        peerConnection?.close()
        peerConnection = nil
        webrtcDelegate = nil
        codeTimer?.invalidate()
        codeTimer = nil
        frameRenderer = nil
        DispatchQueue.main.async {
            self.connectionState = .disconnected
            self.pairingCode = nil
            self.pendingComputerInfo = nil
            self.latestFrame = nil
            self.onFrameReceived = nil
        }
    }
    
    func approveConnection() {
        sendSignalingMessage(["type": "approve"])
        DispatchQueue.main.async { self.connectionState = .connected }
    }
    
    func rejectConnection() {
        sendSignalingMessage(["type": "reject"])
        DispatchQueue.main.async { self.connectionState = .waitingForPeer; self.pendingComputerInfo = nil }
    }
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text): self.handleSignalingMessage(text)
                case .data(let data): if let text = String(data: data, encoding: .utf8) { self.handleSignalingMessage(text) }
                @unknown default: break
                }
                self.receiveMessage()
            case .failure(let error):
                DispatchQueue.main.async { self.connectionState = .error(error.localizedDescription) }
            }
        }
    }
    
    private func handleSignalingMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }
        switch type {
        case "pairing_code":
            if let code = json["code"] as? String {
                DispatchQueue.main.async { self.pairingCode = code; self.connectionState = .waitingForPeer; self.startCodeTimer() }
            }
        case "peer_connected":
            let browser = (json["browser"] as? String) ?? "Unknown"
            let os = (json["os"] as? String) ?? "Unknown"
            let ip = (json["ip"] as? String) ?? "Unknown"
            DispatchQueue.main.async { self.pendingComputerInfo = ComputerInfo(browser: browser, os: os, ip: ip); self.connectionState = .pendingApproval }
        case "offer":
            if let sdp = json["sdp"] as? String { handleOffer(sdp: sdp) }
        case "ice_candidate":
            if let candidate = json["candidate"] as? String, let sdpMid = json["sdpMid"] as? String, let idx = json["sdpMLineIndex"] as? Int {
                // Fix: No completionHandler — newer WebRTC pod API
                peerConnection?.add(RTCIceCandidate(sdp: candidate, sdpMLineIndex: Int32(idx), sdpMid: sdpMid))
            }
        case "peer_disconnected":
            DispatchQueue.main.async { self.connectionState = .disconnected; self.latestFrame = nil; self.pendingComputerInfo = nil }
        default: break
        }
    }
    
    /// Internal access so the delegate can call it for ICE candidates
    func sendSignalingMessage(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message), let text = String(data: data, encoding: .utf8) else { return }
        webSocket?.send(.string(text)) { _ in }
    }
    
    private func handleOffer(sdp: String) {
        guard let factory = peerConnectionFactory else { return }
        let config = RTCConfiguration()
        config.iceServers = [RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"])]
        config.sdpSemantics = .unifiedPlan
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: ["DtlsSrtpKeyAgreement": "true"])
        peerConnection = factory.peerConnection(with: config, constraints: constraints, delegate: nil)
        let renderer = FrameCaptureRenderer()
        renderer.onFrame = { [weak self] frameData in self?.latestFrame = frameData; self?.onFrameReceived?(frameData) }
        self.frameRenderer = renderer
        // Fix: Store strong reference to delegate so it doesn't get deallocated
        let delegate = ScreenShareWebRTCDelegate(service: self, renderer: renderer)
        self.webrtcDelegate = delegate
        peerConnection?.delegate = delegate
        let sd = RTCSessionDescription(type: .offer, sdp: sdp)
        peerConnection?.setRemoteDescription(sd) { [weak self] error in
            if error != nil { return }
            let ac = RTCMediaConstraints(mandatoryConstraints: ["OfferToReceiveVideo": "true"], optionalConstraints: nil)
            self?.peerConnection?.answer(for: ac) { [weak self] answer, _ in
                guard let answer = answer else { return }
                self?.peerConnection?.setLocalDescription(answer) { _ in
                    self?.sendSignalingMessage(["type": "answer", "sdp": answer.sdp])
                }
            }
        }
    }
    
    private func startCodeTimer() {
        codeExpiresIn = 300
        codeTimer?.invalidate()
        codeTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            DispatchQueue.main.async {
                self?.codeExpiresIn -= 1
                if (self?.codeExpiresIn ?? 0) <= 0 {
                    self?.codeTimer?.invalidate()
                    if case .waitingForPeer = self?.connectionState { self?.connectionState = .error("Pairing code expired") }
                }
            }
        }
    }
}
