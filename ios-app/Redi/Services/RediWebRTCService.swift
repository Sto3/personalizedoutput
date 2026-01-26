/**
 * RediWebRTCService.swift
 *
 * REDI FOR ANYTHING - One adaptive AI, no modes needed
 * 
 * Created: Jan 25, 2026
 * Updated: Jan 26, 2026 - Camera preview fix + balanced instructions
 */

import Foundation
import AVFoundation
import Combine
import WebRTC

// MARK: - Video Frame Delegate Protocol

protocol RediVideoFrameDelegate: AnyObject {
    func didCaptureVideoFrame(_ sampleBuffer: CMSampleBuffer)
}

class RediWebRTCService: NSObject, ObservableObject {
    // MARK: - Published Properties
    
    @Published var isConnected = false
    @Published var isConnecting = false
    @Published var connectionState: RTCPeerConnectionState = .new
    @Published var error: String?
    @Published var isVideoEnabled = false
    @Published var sensitivity: Int = 5  // 1-10 scale
    
    // MARK: - Video Preview
    
    /// Delegate to receive video frames for preview
    weak var videoFrameDelegate: RediVideoFrameDelegate?
    
    /// The capture session - can be used for preview layer
    private(set) var captureSession: AVCaptureSession?
    
    // MARK: - Latency Tracking
    
    private var connectionStartTime: Date?
    private var lastSpeechEndTime: Date?
    
    // MARK: - Callbacks
    
    var onSessionReady: (() -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onPlaybackStarted: (() -> Void)?
    var onPlaybackEnded: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onLatencyMeasured: ((Int) -> Void)?
    
    // MARK: - WebRTC Components
    
    private var peerConnection: RTCPeerConnection?
    private var dataChannel: RTCDataChannel?
    private var localAudioTrack: RTCAudioTrack?
    private var localVideoTrack: RTCVideoTrack?
    private var videoSource: RTCVideoSource?
    
    private static var factoryInitialized = false
    private var factory: RTCPeerConnectionFactory?
    
    // MARK: - Camera Capture
    
    private var captureDevice: AVCaptureDevice?
    private var videoOutput: AVCaptureVideoDataOutput?
    private let captureQueue = DispatchQueue(label: "com.redi.capture", qos: .userInteractive)
    
    // MARK: - Session State
    
    private var sessionConfigured = false
    private var responseInProgress = false
    private var lastUserSpeechTime: Date = .distantPast
    private var sessionStartTime: Date?
    
    // MARK: - Proactive Check Timer
    
    private var proactiveTimer: Timer?
    
    // MARK: - Configuration
    
    private var ephemeralToken: String?
    private let tokenURL = URL(string: "https://redialways.com/api/redi/webrtc/token")!
    private let openAICallsURL = URL(string: "https://api.openai.com/v1/realtime/calls")!
    
    private let videoWidth: Int32 = 1920
    private let videoHeight: Int32 = 1080
    private let videoFPS: Int = 1  // Low FPS for OpenAI (they take snapshots)
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        if !RediWebRTCService.factoryInitialized {
            RTCInitializeSSL()
            RediWebRTCService.factoryInitialized = true
        }
        
        print("[Redi] \u{1F680} Redi for Anything - initialized")
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
        
        if isConnected {
            startProactiveTimer()
        }
        
        print("[Redi] \u{1F39A}\u{FE0F} Sensitivity: \(clamped)/10")
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
        }
        
        print("[Redi] \u{1F517} Connecting...")
        
        do {
            configureAudioSession()
            
            let tokenResponse = try await fetchEphemeralToken()
            self.ephemeralToken = tokenResponse.token
            print("[Redi] \u{2705} Token acquired")
            
            setupPeerConnection()
            setupLocalAudio()
            setupLocalVideo()
            
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
                mandatoryConstraints: [
                    "OfferToReceiveAudio": "true",
                    "OfferToReceiveVideo": "false"
                ],
                optionalConstraints: nil
            )
            
            let offer = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<RTCSessionDescription, Error>) in
                pc.offer(for: offerConstraints) { sdp, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let sdp = sdp {
                        continuation.resume(returning: sdp)
                    } else {
                        continuation.resume(throwing: WebRTCError.offerCreationFailed)
                    }
                }
            }
            
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                pc.setLocalDescription(offer) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
            
            guard let localSdp = pc.localDescription?.sdp else {
                throw WebRTCError.offerCreationFailed
            }
            
            let answerSdp = try await sendOfferToOpenAI(localSdp: localSdp)
            
            let answer = RTCSessionDescription(type: .answer, sdp: answerSdp)
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                pc.setRemoteDescription(answer) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
            
            let connectionTime = Date().timeIntervalSince(connectionStartTime!) * 1000
            print("[Redi] \u{2705} Connected in \(Int(connectionTime))ms")
            
            await MainActor.run {
                isConnecting = false
                isConnected = true
                isVideoEnabled = true
            }
            
            startCameraCapture()
            
        } catch {
            print("[Redi] \u{274C} Connection failed: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
                isConnecting = false
                isConnected = false
            }
            throw error
        }
    }
    
    func disconnect() {
        print("[Redi] \u{1F50C} Disconnecting...")
        
        stopProactiveTimer()
        stopCameraCapture()
        
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
        
        DispatchQueue.main.async {
            self.isConnected = false
            self.isConnecting = false
            self.isVideoEnabled = false
            self.connectionState = .closed
        }
    }
    
    // MARK: - Camera Setup (Unified for Preview + WebRTC)
    
    private func setupLocalVideo() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        // Create video source for WebRTC
        videoSource = factory.videoSource()
        
        guard let source = videoSource else { return }
        
        let videoTrack = factory.videoTrack(with: source, trackId: "local_video")
        pc.add(videoTrack, streamIds: ["local_stream"])
        localVideoTrack = videoTrack
    }
    
    private func startCameraCapture() {
        // Create AVCaptureSession that feeds BOTH preview AND WebRTC
        let session = AVCaptureSession()
        session.sessionPreset = .hd1920x1080
        
        // Find back camera
        guard let camera = findBackCamera() else {
            print("[Redi] \u{26A0}\u{FE0F} No camera available")
            return
        }
        captureDevice = camera
        
        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if session.canAddInput(input) {
                session.addInput(input)
            }
            
            // Video output - feeds frames to WebRTC and preview delegate
            let output = AVCaptureVideoDataOutput()
            output.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
            ]
            output.setSampleBufferDelegate(self, queue: captureQueue)
            output.alwaysDiscardsLateVideoFrames = true
            
            if session.canAddOutput(output) {
                session.addOutput(output)
            }
            videoOutput = output
            
            // Configure frame rate
            try camera.lockForConfiguration()
            camera.activeVideoMinFrameDuration = CMTime(value: 1, timescale: Int32(videoFPS))
            camera.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: Int32(videoFPS))
            camera.unlockForConfiguration()
            
        } catch {
            print("[Redi] \u{274C} Camera setup error: \(error)")
            return
        }
        
        captureSession = session
        
        // Start capture on background thread
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
            print("[Redi] \u{1F4F9} Camera active")
        }
    }
    
    private func stopCameraCapture() {
        captureSession?.stopRunning()
        captureSession = nil
        videoOutput = nil
        captureDevice = nil
    }
    
    private func findBackCamera() -> AVCaptureDevice? {
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInDualCamera, .builtInTripleCamera],
            mediaType: .video,
            position: .back
        )
        return discoverySession.devices.first
    }
    
    // MARK: - Proactive Check Timer
    
    func startProactiveTimer() {
        stopProactiveTimer()
        
        let interval = getProactiveInterval()
        print("[Redi] \u{23F1}\u{FE0F} Proactive checks every \(interval)s")
        
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
        let timeSinceUserSpoke = Date().timeIntervalSince(lastUserSpeechTime)
        guard timeSinceUserSpoke > 2.0 && !responseInProgress else { return }
        
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
        guard !sessionConfigured else { return }
        guard let dc = dataChannel, dc.readyState == .open else { return }
        
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
                "input_audio_transcription": [
                    "model": "whisper-1"
                ]
            ]
        ])
        
        print("[Redi] \u{2705} Session configured")
        sessionConfigured = true
        startProactiveTimer()
    }
    
    // MARK: - Token Fetching
    
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
        
        let body: [String: Any] = ["sensitivity": sensitivity]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw WebRTCError.tokenFetchFailed
        }
        
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }
    
    // MARK: - Audio Session
    
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
            )
            
            try audioSession.setPreferredSampleRate(48000)
            try audioSession.setPreferredIOBufferDuration(0.005)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            
        } catch {
            print("[Redi] \u{26A0}\u{FE0F} Audio session error: \(error)")
        }
    }
    
    // MARK: - Peer Connection
    
    private func setupPeerConnection() {
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        
        factory = RTCPeerConnectionFactory(
            encoderFactory: encoderFactory,
            decoderFactory: decoderFactory
        )
        
        let config = RTCConfiguration()
        config.sdpSemantics = .unifiedPlan
        config.continualGatheringPolicy = .gatherContinually
        config.bundlePolicy = .maxBundle
        config.rtcpMuxPolicy = .require
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )
        
        peerConnection = factory?.peerConnection(with: config, constraints: constraints, delegate: self)
    }
    
    // MARK: - Audio Track
    
    private func setupLocalAudio() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        let audioConstraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "googEchoCancellation": "true",
                "googAutoGainControl": "true",
                "googNoiseSuppression": "true",
                "googHighpassFilter": "true"
            ],
            optionalConstraints: [
                "googEchoCancellation2": "true",
                "googDAEchoCancellation": "true"
            ]
        )
        
        let audioSource = factory.audioSource(with: audioConstraints)
        let audioTrack = factory.audioTrack(with: audioSource, trackId: "local_audio")
        
        pc.add(audioTrack, streamIds: ["local_stream"])
        localAudioTrack = audioTrack
    }
    
    // MARK: - SDP Exchange
    
    private func sendOfferToOpenAI(localSdp: String) async throws -> String {
        guard let token = ephemeralToken else {
            throw WebRTCError.noToken
        }
        
        var request = URLRequest(url: openAICallsURL)
        request.httpMethod = "POST"
        request.setValue("application/sdp", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = localSdp.data(using: .utf8)
        request.timeoutInterval = 10
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw WebRTCError.sdpExchangeFailed
        }
        
        guard let answerSdp = String(data: data, encoding: .utf8) else {
            throw WebRTCError.invalidSDP
        }
        
        return answerSdp
    }
    
    // MARK: - Sending Data
    
    func send(message: [String: Any]) {
        guard let dc = dataChannel, dc.readyState == .open else { return }
        guard let jsonData = try? JSONSerialization.data(withJSONObject: message) else { return }
        
        let buffer = RTCDataBuffer(data: jsonData, isBinary: false)
        dc.sendData(buffer)
    }
    
    func setMicMuted(_ muted: Bool) {
        localAudioTrack?.isEnabled = !muted
    }
    
    func setVideoEnabled(_ enabled: Bool) {
        localVideoTrack?.isEnabled = enabled
        DispatchQueue.main.async { self.isVideoEnabled = enabled }
    }
    
    // MARK: - Error Types
    
    enum WebRTCError: Error, LocalizedError {
        case tokenFetchFailed
        case peerConnectionFailed
        case offerCreationFailed
        case noToken
        case sdpExchangeFailed
        case invalidSDP
        case dataChannelFailed
        case noCameraAvailable
        
        var errorDescription: String? {
            switch self {
            case .tokenFetchFailed: return "Token fetch failed"
            case .peerConnectionFailed: return "Peer connection failed"
            case .offerCreationFailed: return "Offer creation failed"
            case .noToken: return "No token"
            case .sdpExchangeFailed: return "SDP exchange failed"
            case .invalidSDP: return "Invalid SDP"
            case .dataChannelFailed: return "Data channel failed"
            case .noCameraAvailable: return "No camera"
            }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension RediWebRTCService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        // Send frame to preview delegate
        videoFrameDelegate?.didCaptureVideoFrame(sampleBuffer)
        
        // Convert to RTCVideoFrame and send to WebRTC
        guard let videoSource = videoSource,
              let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let timestampNs = Int64(CMTimeGetSeconds(timestamp) * 1_000_000_000)
        
        let rtcPixelBuffer = RTCCVPixelBuffer(pixelBuffer: pixelBuffer)
        let rtcFrame = RTCVideoFrame(
            buffer: rtcPixelBuffer,
            rotation: ._90,  // Portrait orientation
            timeStampNs: timestampNs
        )
        
        videoSource.capturer(RTCVideoCapturer(), didCapture: rtcFrame)
    }
}

// MARK: - RTCPeerConnectionDelegate

extension RediWebRTCService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("[Redi] \u{1F50A} Audio stream connected")
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        DispatchQueue.main.async {
            switch newState {
            case .connected, .completed: self.isConnected = true
            case .disconnected, .failed: self.isConnected = false
            default: break
            }
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        dataChannel.delegate = self
        self.dataChannel = dataChannel
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCPeerConnectionState) {
        DispatchQueue.main.async { self.connectionState = stateChanged }
    }
}

// MARK: - RTCDataChannelDelegate

extension RediWebRTCService: RTCDataChannelDelegate {
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        if dataChannel.readyState == .open {
            print("[Redi] \u{2705} Ready")
            configureSession()
            DispatchQueue.main.async { self.onSessionReady?() }
        }
    }
    
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard let message = String(data: buffer.data, encoding: .utf8) else { return }
        DispatchQueue.main.async { self.handleIncomingJSON(message) }
    }
    
    private func handleIncomingJSON(_ jsonString: String) {
        guard let data = jsonString.data(using: .utf8),
              let eventDict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let eventType = eventDict["type"] as? String else { return }
        
        switch eventType {
        case "response.created":
            responseInProgress = true
            
            if let speechEnd = lastSpeechEndTime {
                let latencyMs = Int(Date().timeIntervalSince(speechEnd) * 1000)
                print("[Redi] \u{26A1} \(latencyMs)ms")
                onLatencyMeasured?(latencyMs)
            }
            
            onPlaybackStarted?()
            
        case "response.done":
            responseInProgress = false
            onPlaybackEnded?()
            
        case "response.audio_transcript.done":
            if let transcript = eventDict["transcript"] as? String {
                // Filter out silent responses (just ".")
                if !transcript.isEmpty && transcript != "." {
                    print("[Redi] \u{1F916} \"\(transcript)\"")
                    onTranscriptReceived?(transcript, "assistant")
                }
            }
            
        case "conversation.item.input_audio_transcription.completed":
            if let transcript = eventDict["transcript"] as? String {
                print("[Redi] \u{1F4DD} \"\(transcript)\"")
                onTranscriptReceived?(transcript, "user")
                lastUserSpeechTime = Date()
            }
            
        case "input_audio_buffer.speech_started":
            lastUserSpeechTime = Date()
            
        case "input_audio_buffer.speech_stopped":
            lastSpeechEndTime = Date()
            
        case "error":
            if let errorInfo = eventDict["error"] as? [String: Any],
               let errorMessage = errorInfo["message"] as? String {
                print("[Redi] \u{274C} \(errorMessage)")
                error = errorMessage
            }
            
        default:
            break
        }
    }
}
