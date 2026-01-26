/**
 * RediWebRTCService.swift
 *
 * REDI FOR ANYTHING - Production Version
 * 
 * Camera Preview: Uses RTCEAGLVideoView (OpenGL) to display frames.
 * Simpler and more compatible than Metal approach.
 *
 * Updated: Jan 26, 2026
 */

import Foundation
import AVFoundation
import Combine
import WebRTC

class RediWebRTCService: NSObject, ObservableObject {
    // MARK: - Published Properties
    
    @Published var isConnected = false
    @Published var isConnecting = false
    @Published var connectionState: RTCPeerConnectionState = .new
    @Published var error: String?
    @Published var isVideoEnabled = false
    @Published var sensitivity: Int = 5
    @Published var isActivated = false
    @Published var memoryEnabled = true
    @Published var hasVideoPreview = false
    
    // MARK: - Video Preview (OpenGL-based)
    
    private var _previewView: RTCEAGLVideoView?
    var previewView: RTCEAGLVideoView? { _previewView }
    
    // MARK: - Latency Tracking
    
    private var connectionStartTime: Date?
    private var lastSpeechEndTime: Date?
    
    // MARK: - Callbacks
    
    var onSessionReady: (() -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?
    var onPlaybackStarted: (() -> Void)?
    var onPlaybackEnded: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onLatencyMeasured: ((Int) -> Void)?
    
    // MARK: - WebRTC Components
    
    private var peerConnection: RTCPeerConnection?
    private var dataChannel: RTCDataChannel?
    private var localAudioTrack: RTCAudioTrack?
    private var localVideoTrack: RTCVideoTrack?
    private var videoCapturer: RTCCameraVideoCapturer?
    private var videoSource: RTCVideoSource?
    
    private static var factoryInitialized = false
    private var factory: RTCPeerConnectionFactory?
    
    // MARK: - Session State
    
    private var sessionConfigured = false
    private var responseInProgress = false
    private var lastUserSpeechTime: Date = .distantPast
    private var sessionStartTime: Date?
    private var userHasSpoken = false
    
    // MARK: - Proactive Check Timer
    
    private var proactiveTimer: Timer?
    
    // MARK: - Configuration
    
    private var ephemeralToken: String?
    private let tokenURL = URL(string: "https://redialways.com/api/redi/webrtc/token")!
    private let openAICallsURL = URL(string: "https://api.openai.com/v1/realtime/calls")!
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        if !RediWebRTCService.factoryInitialized {
            RTCInitializeSSL()
            RediWebRTCService.factoryInitialized = true
        }
        
        print("[Redi] \u{1F680} Initialized")
    }
    
    deinit {
        disconnect()
    }
    
    // MARK: - Sensitivity Control
    
    private func getProactiveInterval() -> TimeInterval {
        let intervals: [Int: TimeInterval] = [
            1: 15.0, 2: 12.0, 3: 9.0, 4: 7.0, 5: 5.0,
            6: 4.0, 7: 3.5, 8: 3.0, 9: 2.5, 10: 2.0
        ]
        return intervals[sensitivity] ?? 5.0
    }
    
    func setSensitivity(_ newValue: Int) {
        let clamped = max(1, min(10, newValue))
        sensitivity = clamped
        if isActivated { startProactiveTimer() }
        print("[Redi] Sensitivity: \(clamped)/10")
    }
    
    func setMemoryEnabled(_ enabled: Bool) {
        memoryEnabled = enabled
        print("[Redi] Memory: \(enabled ? "ON" : "OFF")")
    }
    
    // MARK: - Connection Management
    
    func connect() async throws {
        guard !isConnecting else { return }
        
        connectionStartTime = Date()
        sessionStartTime = Date()
        
        await MainActor.run {
            isConnecting = true
            error = nil
            sessionConfigured = false
            responseInProgress = false
            isActivated = false
            userHasSpoken = false
        }
        
        print("[Redi] Connecting...")
        
        do {
            configureAudioSession()
            
            let tokenResponse = try await fetchEphemeralToken()
            self.ephemeralToken = tokenResponse.token
            print("[Redi] Token acquired")
            
            setupPeerConnection()
            setupLocalAudio()
            setupCamera()
            
            guard let pc = peerConnection else {
                throw WebRTCError.peerConnectionFailed
            }
            
            let dcConfig = RTCDataChannelConfiguration()
            dcConfig.isOrdered = true
            if let dc = pc.dataChannel(forLabel: "oai-events", configuration: dcConfig) {
                dataChannel = dc
                dc.delegate = self
            }
            
            let offerConstraints = RTCMediaConstraints(
                mandatoryConstraints: ["OfferToReceiveAudio": "true", "OfferToReceiveVideo": "false"],
                optionalConstraints: nil
            )
            
            let offer = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<RTCSessionDescription, Error>) in
                pc.offer(for: offerConstraints) { sdp, err in
                    if let err = err { cont.resume(throwing: err) }
                    else if let sdp = sdp { cont.resume(returning: sdp) }
                    else { cont.resume(throwing: WebRTCError.offerCreationFailed) }
                }
            }
            
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
                pc.setLocalDescription(offer) { err in
                    if let err = err { cont.resume(throwing: err) }
                    else { cont.resume() }
                }
            }
            
            guard let localSdp = pc.localDescription?.sdp else {
                throw WebRTCError.offerCreationFailed
            }
            
            let answerSdp = try await sendOfferToOpenAI(localSdp: localSdp)
            let answer = RTCSessionDescription(type: .answer, sdp: answerSdp)
            
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
                pc.setRemoteDescription(answer) { err in
                    if let err = err { cont.resume(throwing: err) }
                    else { cont.resume() }
                }
            }
            
            let connectionTime = Date().timeIntervalSince(connectionStartTime!) * 1000
            print("[Redi] Connected in \(Int(connectionTime))ms")
            
            await MainActor.run {
                isConnecting = false
                isConnected = true
                isVideoEnabled = true
            }
            
            startCamera()
            
        } catch {
            print("[Redi] Connection failed: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
                isConnecting = false
                isConnected = false
            }
            throw error
        }
    }
    
    func disconnect() {
        print("[Redi] Disconnecting...")
        
        stopProactiveTimer()
        stopCamera()
        
        // Remove renderer
        if let view = _previewView {
            localVideoTrack?.remove(view)
        }
        _previewView = nil
        
        dataChannel?.close()
        dataChannel = nil
        peerConnection?.close()
        peerConnection = nil
        localAudioTrack = nil
        localVideoTrack = nil
        videoSource = nil
        factory = nil
        ephemeralToken = nil
        sessionConfigured = false
        responseInProgress = false
        sessionStartTime = nil
        userHasSpoken = false
        
        DispatchQueue.main.async {
            self.isConnected = false
            self.isConnecting = false
            self.isVideoEnabled = false
            self.isActivated = false
            self.connectionState = .closed
            self.hasVideoPreview = false
        }
    }
    
    // MARK: - Camera Setup
    
    private func setupCamera() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        let source = factory.videoSource()
        self.videoSource = source
        
        let capturer = RTCCameraVideoCapturer(delegate: source)
        self.videoCapturer = capturer
        
        let videoTrack = factory.videoTrack(with: source, trackId: "local_video")
        pc.add(videoTrack, streamIds: ["local_stream"])
        localVideoTrack = videoTrack
        
        // Create preview view on main thread
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let view = RTCEAGLVideoView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
            view.delegate = self
            self._previewView = view
            videoTrack.add(view)
            self.hasVideoPreview = true
            print("[Redi] Preview view created and attached")
        }
        
        print("[Redi] Camera setup complete")
    }
    
    private func startCamera() {
        guard let capturer = videoCapturer,
              let camera = findCamera(position: .back) else {
            print("[Redi] Cannot start camera")
            return
        }
        
        let format = selectFormat(for: camera, targetWidth: 1280)
        capturer.startCapture(with: camera, format: format, fps: 15)
        
        print("[Redi] Camera started: 1280x720 @ 15 FPS")
    }
    
    private func stopCamera() {
        videoCapturer?.stopCapture()
        videoCapturer = nil
    }
    
    // MARK: - Camera Helpers
    
    private func findCamera(position: AVCaptureDevice.Position) -> AVCaptureDevice? {
        AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInDualCamera, .builtInTripleCamera],
            mediaType: .video,
            position: position
        ).devices.first
    }
    
    private func selectFormat(for device: AVCaptureDevice, targetWidth: Int32) -> AVCaptureDevice.Format {
        let formats = RTCCameraVideoCapturer.supportedFormats(for: device)
        return formats.first { format in
            let dims = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
            return dims.width == targetWidth
        } ?? formats.first!
    }
    
    // MARK: - Proactive Timer
    
    func startProactiveTimer() {
        stopProactiveTimer()
        let interval = getProactiveInterval()
        DispatchQueue.main.async { [weak self] in
            self?.proactiveTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
                self?.performProactiveCheck()
            }
        }
    }
    
    func stopProactiveTimer() {
        proactiveTimer?.invalidate()
        proactiveTimer = nil
    }
    
    private func performProactiveCheck() {
        guard isActivated else { return }
        guard Date().timeIntervalSince(lastUserSpeechTime) > 2.0, !responseInProgress else { return }
        
        send(message: [
            "type": "conversation.item.create",
            "item": [
                "type": "message",
                "role": "user",
                "content": [["type": "input_text", "text": "[PROACTIVE_CHECK]"]]
            ]
        ])
        send(message: ["type": "response.create"])
    }
    
    // MARK: - Session Configuration
    
    private func configureSession() {
        guard !sessionConfigured, let dc = dataChannel, dc.readyState == .open else { return }
        
        send(message: [
            "type": "session.update",
            "session": [
                "turn_detection": [
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 200,
                    "silence_duration_ms": 300,
                    "create_response": true,
                    "interrupt_response": true
                ],
                "input_audio_transcription": ["model": "whisper-1"]
            ]
        ])
        
        sessionConfigured = true
        print("[Redi] Ready (say 'Hey Redi')")
    }
    
    // MARK: - Activation
    
    private func activateRedi() {
        guard !isActivated else { return }
        DispatchQueue.main.async { self.isActivated = true }
        startProactiveTimer()
        print("[Redi] ACTIVATED")
    }
    
    // MARK: - Token
    
    struct TokenResponse: Codable {
        let token: String
        let expiresAt: Int
        let model: String?
        let voice: String?
        let connectionInfo: ConnectionInfo?
        struct ConnectionInfo: Codable {
            let callsEndpoint: String?
            let dataChannelName: String?
        }
    }
    
    private func fetchEphemeralToken() async throws -> TokenResponse {
        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 5
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "sensitivity": sensitivity,
            "memoryEnabled": memoryEnabled
        ])
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw WebRTCError.tokenFetchFailed
        }
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }
    
    // MARK: - Audio Session
    
    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .videoChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.overrideOutputAudioPort(.speaker)
            try session.setPreferredSampleRate(48000)
            try session.setPreferredIOBufferDuration(0.005)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("[Redi] Audio error: \(error)")
        }
    }
    
    // MARK: - Peer Connection
    
    private func setupPeerConnection() {
        factory = RTCPeerConnectionFactory(
            encoderFactory: RTCDefaultVideoEncoderFactory(),
            decoderFactory: RTCDefaultVideoDecoderFactory()
        )
        
        let config = RTCConfiguration()
        config.sdpSemantics = .unifiedPlan
        config.continualGatheringPolicy = .gatherContinually
        config.bundlePolicy = .maxBundle
        config.rtcpMuxPolicy = .require
        
        peerConnection = factory?.peerConnection(
            with: config,
            constraints: RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]),
            delegate: self
        )
    }
    
    // MARK: - Audio Track
    
    private func setupLocalAudio() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "googEchoCancellation": "true",
                "googAutoGainControl": "true",
                "googNoiseSuppression": "true",
                "googHighpassFilter": "true"
            ],
            optionalConstraints: ["googEchoCancellation2": "true", "googDAEchoCancellation": "true"]
        )
        
        let source = factory.audioSource(with: constraints)
        let track = factory.audioTrack(with: source, trackId: "local_audio")
        pc.add(track, streamIds: ["local_stream"])
        localAudioTrack = track
    }
    
    // MARK: - SDP Exchange
    
    private func sendOfferToOpenAI(localSdp: String) async throws -> String {
        guard let token = ephemeralToken else { throw WebRTCError.noToken }
        
        var request = URLRequest(url: openAICallsURL)
        request.httpMethod = "POST"
        request.setValue("application/sdp", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = localSdp.data(using: .utf8)
        request.timeoutInterval = 10
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
              let sdp = String(data: data, encoding: .utf8) else {
            throw WebRTCError.sdpExchangeFailed
        }
        return sdp
    }
    
    // MARK: - Sending
    
    func send(message: [String: Any]) {
        guard let dc = dataChannel, dc.readyState == .open,
              let data = try? JSONSerialization.data(withJSONObject: message) else { return }
        dc.sendData(RTCDataBuffer(data: data, isBinary: false))
    }
    
    func setMicMuted(_ muted: Bool) { localAudioTrack?.isEnabled = !muted }
    func setVideoEnabled(_ enabled: Bool) {
        localVideoTrack?.isEnabled = enabled
        DispatchQueue.main.async { self.isVideoEnabled = enabled }
    }
    
    // MARK: - Errors
    
    enum WebRTCError: Error, LocalizedError {
        case tokenFetchFailed, peerConnectionFailed, offerCreationFailed
        case noToken, sdpExchangeFailed, invalidSDP, dataChannelFailed, noCameraAvailable
        var errorDescription: String? {
            switch self {
            case .tokenFetchFailed: return "Token failed"
            case .peerConnectionFailed: return "Connection failed"
            case .offerCreationFailed: return "Offer failed"
            case .noToken: return "No token"
            case .sdpExchangeFailed: return "SDP failed"
            case .invalidSDP: return "Invalid SDP"
            case .dataChannelFailed: return "Channel failed"
            case .noCameraAvailable: return "No camera"
            }
        }
    }
}

// MARK: - RTCPeerConnectionDelegate

extension RediWebRTCService: RTCPeerConnectionDelegate {
    func peerConnection(_ pc: RTCPeerConnection, didChange state: RTCSignalingState) {}
    func peerConnection(_ pc: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    func peerConnection(_ pc: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ pc: RTCPeerConnection) {}
    func peerConnection(_ pc: RTCPeerConnection, didChange state: RTCIceConnectionState) {
        DispatchQueue.main.async {
            self.isConnected = (state == .connected || state == .completed)
        }
    }
    func peerConnection(_ pc: RTCPeerConnection, didChange state: RTCIceGatheringState) {}
    func peerConnection(_ pc: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {}
    func peerConnection(_ pc: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    func peerConnection(_ pc: RTCPeerConnection, didOpen dc: RTCDataChannel) {
        dc.delegate = self
        self.dataChannel = dc
    }
    func peerConnection(_ pc: RTCPeerConnection, didChange state: RTCPeerConnectionState) {
        DispatchQueue.main.async { self.connectionState = state }
    }
}

// MARK: - RTCDataChannelDelegate

extension RediWebRTCService: RTCDataChannelDelegate {
    func dataChannelDidChangeState(_ dc: RTCDataChannel) {
        if dc.readyState == .open {
            configureSession()
            DispatchQueue.main.async { self.onSessionReady?() }
        }
    }
    
    func dataChannel(_ dc: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard let msg = String(data: buffer.data, encoding: .utf8) else { return }
        DispatchQueue.main.async { self.handleEvent(msg) }
    }
    
    private func handleEvent(_ json: String) {
        guard let data = json.data(using: .utf8),
              let evt = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = evt["type"] as? String else { return }
        
        switch type {
        case "response.created":
            responseInProgress = true
            if let end = lastSpeechEndTime {
                let ms = Int(Date().timeIntervalSince(end) * 1000)
                onLatencyMeasured?(ms)
            }
            onPlaybackStarted?()
            
        case "response.done":
            responseInProgress = false
            onPlaybackEnded?()
            
        case "response.audio_transcript.done":
            if let text = evt["transcript"] as? String, !text.isEmpty, text != "." {
                onTranscriptReceived?(text, "assistant")
                let lower = text.lowercased()
                if lower.contains("ready to help") || lower.contains("here to help") {
                    activateRedi()
                }
            }
            
        case "conversation.item.input_audio_transcription.completed":
            if let text = evt["transcript"] as? String {
                onTranscriptReceived?(text, "user")
                lastUserSpeechTime = Date()
                userHasSpoken = true
            }
            
        case "input_audio_buffer.speech_started":
            lastUserSpeechTime = Date()
            
        case "input_audio_buffer.speech_stopped":
            lastSpeechEndTime = Date()
            
        case "error":
            if let info = evt["error"] as? [String: Any], let msg = info["message"] as? String {
                error = msg
            }
            
        default: break
        }
    }
}

// MARK: - RTCVideoViewDelegate

extension RediWebRTCService: RTCVideoViewDelegate {
    func videoView(_ videoView: RTCVideoRenderer, didChangeVideoSize size: CGSize) {
        print("[Redi] Video size changed: \(size)")
    }
}
