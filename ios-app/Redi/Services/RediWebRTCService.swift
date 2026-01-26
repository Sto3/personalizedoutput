/**
 * RediWebRTCService.swift
 *
 * WebRTC-based connection to OpenAI Realtime API for Redi.
 * 
 * ARCHITECTURE (matches ChatGPT per webrtcHacks research):
 * - Audio track with AEC for voice
 * - Video track at 1 FPS for vision (OpenAI takes snapshots)
 * - Data channel for events only (NOT for images!)
 * - Proactive check timer for autonomous interjection
 *
 * LATENCY OPTIMIZATIONS (targeting sub-800ms voice-to-voice):
 * 1. Server in Virginia (us-east) - closest to OpenAI
 * 2. WebRTC direct connection - no server relay for media
 * 3. 5ms audio buffer - minimum latency
 * 4. Aggressive VAD - 300ms silence detection
 * 5. Eager ICE gathering - faster connection setup
 * 6. Streaming audio - no buffering
 *
 * Created: Jan 25, 2026
 * Updated: Jan 26, 2026 - Fixed prompt leak, added proactive coaching
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
    
    // MARK: - Latency Tracking
    
    private var connectionStartTime: Date?
    private var lastSpeechEndTime: Date?
    private var lastResponseStartTime: Date?
    
    // MARK: - Callbacks
    
    var onSessionReady: (() -> Void)?
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onPlaybackStarted: (() -> Void)?
    var onPlaybackEnded: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onLatencyMeasured: ((Int) -> Void)?  // milliseconds from speech end to response start
    
    // MARK: - WebRTC Components
    
    private var peerConnection: RTCPeerConnection?
    private var dataChannel: RTCDataChannel?
    private var localAudioTrack: RTCAudioTrack?
    private var localVideoTrack: RTCVideoTrack?
    private var videoCapturer: RTCCameraVideoCapturer?
    
    // WebRTC factory - shared instance with audio processing
    private static var factoryInitialized = false
    private var factory: RTCPeerConnectionFactory?
    
    // MARK: - Session State
    
    private var sessionConfigured = false
    private var responseInProgress = false
    private var userRecentlySpeaking = false
    private var lastUserSpeechTime: Date = .distantPast
    
    // MARK: - Proactive Check Timer (for autonomous interjection)
    
    private var proactiveTimer: Timer?
    private var proactiveIntervalSeconds: TimeInterval = 5.0
    private var currentMode: String = "general"
    
    // MARK: - Configuration
    
    private var ephemeralToken: String?
    private let tokenURL = URL(string: "https://redialways.com/api/redi/webrtc/token")!
    private let openAICallsURL = URL(string: "https://api.openai.com/v1/realtime/calls")!
    
    // Video configuration
    private let videoWidth: Int32 = 1920
    private let videoHeight: Int32 = 1080
    private let videoFPS: Int = 1
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        if !RediWebRTCService.factoryInitialized {
            RTCInitializeSSL()
            RediWebRTCService.factoryInitialized = true
            print("[RediWebRTC] 🚀 WebRTC SSL initialized")
        }
        
        print("[RediWebRTC] 🚀 Service initialized (latency-optimized)")
    }
    
    deinit {
        disconnect()
    }
    
    // MARK: - Connection Management
    
    func connect(mode: String = "general") async throws {
        guard !isConnecting else {
            print("[RediWebRTC] Already connecting, ignoring")
            return
        }
        
        connectionStartTime = Date()
        
        await MainActor.run {
            isConnecting = true
            error = nil
            sessionConfigured = false
            responseInProgress = false
            currentMode = mode
        }
        
        print("[RediWebRTC] 🔗 Starting WebRTC connection (mode: \(mode))...")
        
        do {
            // Step 1: Configure audio session FIRST
            print("[RediWebRTC] 🔊 Configuring low-latency audio session...")
            configureAudioSession()
            
            // Step 2: Get ephemeral token
            print("[RediWebRTC] 📝 Requesting ephemeral token...")
            let tokenResponse = try await fetchEphemeralToken(mode: mode)
            self.ephemeralToken = tokenResponse.token
            print("[RediWebRTC] ✅ Got token (expires: \(tokenResponse.expiresAt))")
            
            // Step 3: Setup peer connection
            print("[RediWebRTC] 🔧 Creating peer connection...")
            setupPeerConnection()
            
            // Step 4: Setup local audio
            print("[RediWebRTC] 🎤 Setting up audio with AEC...")
            setupLocalAudio()
            
            // Step 5: Setup local video
            print("[RediWebRTC] 📹 Setting up video track...")
            setupLocalVideo()
            
            guard let pc = peerConnection else {
                throw WebRTCError.peerConnectionFailed
            }
            
            // Step 6: Create data channel
            print("[RediWebRTC] 📡 Creating data channel...")
            let dcConfig = RTCDataChannelConfiguration()
            dcConfig.isOrdered = true
            if let dc = pc.dataChannel(forLabel: "oai-events", configuration: dcConfig) {
                dataChannel = dc
                dc.delegate = self
            }
            
            // Step 7: Create SDP offer
            print("[RediWebRTC] 📤 Creating SDP offer...")
            let offerConstraints = RTCMediaConstraints(
                mandatoryConstraints: [
                    "OfferToReceiveAudio": "true",
                    "OfferToReceiveVideo": "false"
                ],
                optionalConstraints: ["IceRestart": "false"]
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
            
            // Step 8: Set local description
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
            
            print("[RediWebRTC] 📄 SDP contains video: \(localSdp.contains("m=video"))")
            
            // Step 9: Send offer to OpenAI
            print("[RediWebRTC] 📨 Sending offer to OpenAI...")
            let answerSdp = try await sendOfferToOpenAI(localSdp: localSdp)
            
            // Step 10: Set remote description
            print("[RediWebRTC] 📥 Setting remote description...")
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
            print("[RediWebRTC] ✅ WebRTC connected in \(Int(connectionTime))ms!")
            
            await MainActor.run {
                isConnecting = false
                isConnected = true
                isVideoEnabled = true
            }
            
            startVideoCapture()
            
        } catch {
            print("[RediWebRTC] ❌ Connection failed: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
                isConnecting = false
                isConnected = false
            }
            throw error
        }
    }
    
    func disconnect() {
        print("[RediWebRTC] 🔌 Disconnecting...")
        
        stopProactiveTimer()
        videoCapturer?.stopCapture()
        videoCapturer = nil
        dataChannel?.close()
        dataChannel = nil
        peerConnection?.close()
        peerConnection = nil
        localAudioTrack = nil
        localVideoTrack = nil
        factory = nil
        ephemeralToken = nil
        sessionConfigured = false
        responseInProgress = false
        
        DispatchQueue.main.async {
            self.isConnected = false
            self.isConnecting = false
            self.isVideoEnabled = false
            self.connectionState = .closed
        }
    }
    
    // MARK: - Video Setup
    
    private func setupLocalVideo() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        let videoSource = factory.videoSource()
        let capturer = RTCCameraVideoCapturer(delegate: videoSource)
        self.videoCapturer = capturer
        
        let videoTrack = factory.videoTrack(with: videoSource, trackId: "local_video")
        pc.add(videoTrack, streamIds: ["local_stream"])
        localVideoTrack = videoTrack
        
        print("[RediWebRTC] ✅ Video track added")
    }
    
    private func startVideoCapture() {
        guard let capturer = videoCapturer,
              let camera = findBackCamera() else {
            print("[RediWebRTC] ⚠️ Cannot start video capture - no camera")
            return
        }
        
        let format = selectCameraFormat(for: camera)
        capturer.startCapture(with: camera, format: format, fps: videoFPS)
        print("[RediWebRTC] 📹 Video capture started at \(videoFPS) FPS")
    }
    
    private func findBackCamera() -> AVCaptureDevice? {
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInDualCamera, .builtInTripleCamera],
            mediaType: .video,
            position: .back
        )
        return discoverySession.devices.first
    }
    
    private func selectCameraFormat(for device: AVCaptureDevice) -> AVCaptureDevice.Format {
        let formats = RTCCameraVideoCapturer.supportedFormats(for: device)
        var selectedFormat = formats.first!
        var currentDiff = Int.max
        
        for format in formats {
            let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
            let diff = abs(Int(dimensions.width) - Int(videoWidth)) + abs(Int(dimensions.height) - Int(videoHeight))
            if diff < currentDiff {
                selectedFormat = format
                currentDiff = diff
            }
        }
        
        let dims = CMVideoFormatDescriptionGetDimensions(selectedFormat.formatDescription)
        print("[RediWebRTC] 📹 Camera format: \(dims.width)x\(dims.height)")
        return selectedFormat
    }
    
    // MARK: - Proactive Check Timer (Autonomous Interjection)
    
    func startProactiveTimer() {
        stopProactiveTimer()
        proactiveIntervalSeconds = getProactiveInterval(for: currentMode)
        
        print("[RediWebRTC] ⏱️ Proactive timer: every \(proactiveIntervalSeconds)s (\(currentMode) mode)")
        
        DispatchQueue.main.async { [weak self] in
            self?.proactiveTimer = Timer.scheduledTimer(withTimeInterval: self?.proactiveIntervalSeconds ?? 5.0, repeats: true) { [weak self] _ in
                self?.performProactiveCheck()
            }
        }
    }
    
    func stopProactiveTimer() {
        proactiveTimer?.invalidate()
        proactiveTimer = nil
    }
    
    private func getProactiveInterval(for mode: String) -> TimeInterval {
        switch mode {
        case "driving": return 3.0   // Safety critical
        case "cooking": return 4.0   // Food can burn
        case "sports", "workout": return 2.0  // Form feedback during reps
        case "meeting": return 10.0  // Minimal interruption
        case "studying": return 6.0  // Let them think
        default: return 5.0          // General
        }
    }
    
    /// Perform a proactive check - model will speak if it sees something noteworthy
    private func performProactiveCheck() {
        // Don't check if user recently spoke or response in progress
        let timeSinceUserSpoke = Date().timeIntervalSince(lastUserSpeechTime)
        guard timeSinceUserSpoke > 2.0 && !responseInProgress else { return }
        
        // Send proactive check prompt - model knows to stay silent if nothing noteworthy
        // This is a hidden prompt that the model will NOT read aloud
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
        
        // Send optimized VAD settings for faster turn detection
        send(message: [
            "type": "session.update",
            "session": [
                "turn_detection": [
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 200,
                    "silence_duration_ms": 300,  // Fast turn detection
                    "create_response": true,
                    "interrupt_response": true
                ],
                "input_audio_transcription": [
                    "model": "whisper-1"
                ]
            ]
        ])
        
        print("[RediWebRTC] 🔧 Session configured (VAD: 300ms silence)")
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
    
    private func fetchEphemeralToken(mode: String) async throws -> TokenResponse {
        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 5
        
        let body = ["mode": mode]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw WebRTCError.tokenFetchFailed
        }
        
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }
    
    // MARK: - Audio Session (LATENCY OPTIMIZED)
    
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
            )
            
            try audioSession.setPreferredSampleRate(48000)
            try audioSession.setPreferredIOBufferDuration(0.005)  // 5ms buffer
            
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            
            print("[RediWebRTC] ✅ Audio: \(audioSession.ioBufferDuration * 1000)ms buffer")
            
        } catch {
            print("[RediWebRTC] ⚠️ Audio session error: \(error)")
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
        print("[RediWebRTC] ✅ Peer connection created")
    }
    
    // MARK: - Audio Track
    
    private func setupLocalAudio() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        let audioConstraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "googEchoCancellation": "true",
                "googAutoGainControl": "true",
                "googNoiseSuppression": "true",
                "googHighpassFilter": "true",
                "googTypingNoiseDetection": "true"
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
        
        print("[RediWebRTC] ✅ Audio track with AEC")
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
        if enabled {
            startVideoCapture()
        } else {
            videoCapturer?.stopCapture()
        }
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

// MARK: - RTCPeerConnectionDelegate

extension RediWebRTCService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        print("[RediWebRTC] Signaling: \(stateChanged.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("[RediWebRTC] 🔊 Remote stream added")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        print("[RediWebRTC] ICE: \(newState.rawValue)")
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
        print("[RediWebRTC] 📡 Data channel opened")
        dataChannel.delegate = self
        self.dataChannel = dataChannel
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCPeerConnectionState) {
        print("[RediWebRTC] Connection: \(stateChanged.rawValue)")
        DispatchQueue.main.async { self.connectionState = stateChanged }
    }
}

// MARK: - RTCDataChannelDelegate

extension RediWebRTCService: RTCDataChannelDelegate {
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        if dataChannel.readyState == .open {
            print("[RediWebRTC] ✅ Data channel ready")
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
        case "session.created":
            print("[RediWebRTC] 📋 Session created")
            
        case "session.updated":
            print("[RediWebRTC] ✅ Session ready")
            
        case "response.created":
            responseInProgress = true
            lastResponseStartTime = Date()
            
            // Measure latency
            if let speechEnd = lastSpeechEndTime {
                let latencyMs = Int(Date().timeIntervalSince(speechEnd) * 1000)
                print("[RediWebRTC] ⚡ LATENCY: \(latencyMs)ms")
                onLatencyMeasured?(latencyMs)
            }
            
            onPlaybackStarted?()
            
        case "response.done":
            responseInProgress = false
            onPlaybackEnded?()
            
        case "response.audio_transcript.done":
            if let transcript = eventDict["transcript"] as? String, !transcript.isEmpty {
                print("[RediWebRTC] 🤖 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "assistant")
            }
            
        case "conversation.item.input_audio_transcription.completed":
            if let transcript = eventDict["transcript"] as? String {
                print("[RediWebRTC] 📝 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "user")
                lastUserSpeechTime = Date()
            }
            
        case "input_audio_buffer.speech_started":
            userRecentlySpeaking = true
            lastUserSpeechTime = Date()
            
        case "input_audio_buffer.speech_stopped":
            userRecentlySpeaking = false
            lastSpeechEndTime = Date()
            
        case "error":
            if let errorInfo = eventDict["error"] as? [String: Any],
               let errorMessage = errorInfo["message"] as? String {
                print("[RediWebRTC] ❌ \(errorMessage)")
                error = errorMessage
            }
            
        default:
            break
        }
    }
}
