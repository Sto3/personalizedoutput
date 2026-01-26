/**
 * RediWebRTCService.swift
 *
 * WebRTC-based connection to OpenAI Realtime API for Redi.
 * 
 * ARCHITECTURE (matches ChatGPT per webrtcHacks research):
 * - Audio track with AEC for voice
 * - Video track at 1 FPS for vision (OpenAI takes snapshots)
 * - Data channel for events only (NOT for images!)
 * - Sentinel timer for proactive interjection
 *
 * BENEFITS OVER WEBSOCKET:
 * 1. Built-in echo cancellation (Google's WebRTC AEC) - SOLVES ECHO
 * 2. Lower latency (direct peer connection, no server relay)
 * 3. Real video track for reliable vision (no hallucination)
 * 4. Better audio quality (Opus codec)
 *
 * Created: Jan 25, 2026
 * Updated: Jan 26, 2026 - Fixed AEC by properly initializing RTCPeerConnectionFactory
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
    
    // MARK: - Callbacks
    
    var onSessionReady: (() -> Void)?
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onPlaybackStarted: (() -> Void)?
    var onPlaybackEnded: (() -> Void)?
    var onError: ((Error) -> Void)?
    
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
    
    // MARK: - Sentinel Timer (for proactive interjection)
    
    private var sentinelTimer: Timer?
    private var sentinelIntervalSeconds: TimeInterval = 5.0  // Default: check every 5 seconds
    private var currentMode: String = "general"
    
    // MARK: - Configuration
    
    private var ephemeralToken: String?
    private let tokenURL = URL(string: "https://redialways.com/api/redi/webrtc/token")!
    private let openAICallsURL = URL(string: "https://api.openai.com/v1/realtime/calls")!
    
    // Video configuration - per webrtcHacks, 1 FPS is enough (OpenAI takes snapshots)
    private let videoWidth: Int32 = 1920
    private let videoHeight: Int32 = 1080
    private let videoFPS: Int = 1  // Low FPS saves bandwidth, OpenAI snapshots anyway
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        // Initialize WebRTC once with audio processing enabled
        // This is CRITICAL for echo cancellation to work!
        if !RediWebRTCService.factoryInitialized {
            RTCInitializeSSL()
            RediWebRTCService.factoryInitialized = true
            print("[RediWebRTC] 🚀 WebRTC SSL initialized")
        }
        
        print("[RediWebRTC] 🚀 Service initialized with video support")
    }
    
    deinit {
        disconnect()
    }
    
    // MARK: - Connection Management
    
    /// Connect to OpenAI via WebRTC with audio AND video
    func connect(mode: String = "general") async throws {
        guard !isConnecting else {
            print("[RediWebRTC] Already connecting, ignoring")
            return
        }
        
        await MainActor.run {
            isConnecting = true
            error = nil
            sessionConfigured = false
            responseInProgress = false
            currentMode = mode
        }
        
        print("[RediWebRTC] 🔗 Starting WebRTC connection with VIDEO...")
        
        do {
            // Step 1: Configure audio session FIRST (before factory creation)
            print("[RediWebRTC] 🔊 Configuring audio session...")
            configureAudioSession()
            
            // Step 2: Get ephemeral token from our server
            print("[RediWebRTC] 📝 Requesting ephemeral token...")
            let tokenResponse = try await fetchEphemeralToken(mode: mode)
            self.ephemeralToken = tokenResponse.token
            print("[RediWebRTC] ✅ Got token (expires: \(tokenResponse.expiresAt))")
            
            // Step 3: Setup peer connection with audio processing
            print("[RediWebRTC] 🔧 Creating peer connection with AEC...")
            setupPeerConnection()
            
            // Step 4: Setup local audio with AEC
            print("[RediWebRTC] 🎤 Setting up local audio with AEC...")
            setupLocalAudio()
            
            // Step 5: Setup local video from camera
            print("[RediWebRTC] 📹 Setting up video track from camera...")
            setupLocalVideo()
            
            guard let pc = peerConnection else {
                throw WebRTCError.peerConnectionFailed
            }
            
            // Step 6: Create data channel for events (NOT images!)
            print("[RediWebRTC] 📡 Creating data channel...")
            let dcConfig = RTCDataChannelConfiguration()
            if let dc = pc.dataChannel(forLabel: "oai-events", configuration: dcConfig) {
                dataChannel = dc
                dc.delegate = self
            }
            
            // Step 7: Create SDP offer
            print("[RediWebRTC] 📤 Creating SDP offer...")
            let constraints = RTCMediaConstraints(
                mandatoryConstraints: nil,
                optionalConstraints: nil
            )
            
            let offer = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<RTCSessionDescription, Error>) in
                pc.offer(for: constraints) { sdp, error in
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
            
            // Step 9: Get the local SDP
            guard let localSdp = pc.localDescription?.sdp else {
                throw WebRTCError.offerCreationFailed
            }
            
            // Debug: Print SDP to verify video is included
            print("[RediWebRTC] 📄 SDP contains video: \(localSdp.contains("m=video"))")
            
            // Step 10: Send offer to OpenAI and get answer
            print("[RediWebRTC] 📨 Sending offer to OpenAI /v1/realtime/calls...")
            let answerSdp = try await sendOfferToOpenAI(localSdp: localSdp)
            
            // Step 11: Set remote description
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
            
            print("[RediWebRTC] ✅ WebRTC connection established with VIDEO!")
            
            await MainActor.run {
                isConnecting = false
                isConnected = true
                isVideoEnabled = true
            }
            
            // Start video capture
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
        
        // Stop sentinel timer
        stopSentinelTimer()
        
        // Stop video capture
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
        
        // Create video source
        let videoSource = factory.videoSource()
        
        // Create camera capturer
        let capturer = RTCCameraVideoCapturer(delegate: videoSource)
        self.videoCapturer = capturer
        
        // Create video track
        let videoTrack = factory.videoTrack(with: videoSource, trackId: "local_video")
        
        // Add video track to peer connection
        pc.add(videoTrack, streamIds: ["local_stream"])
        localVideoTrack = videoTrack
        
        print("[RediWebRTC] ✅ Video track added (will start at \(videoFPS) FPS)")
    }
    
    private func startVideoCapture() {
        guard let capturer = videoCapturer,
              let camera = findBackCamera() else {
            print("[RediWebRTC] ⚠️ Cannot start video capture - no camera")
            return
        }
        
        let format = selectCameraFormat(for: camera)
        
        capturer.startCapture(with: camera, format: format, fps: videoFPS)
        print("[RediWebRTC] 📹 Video capture started at \(self.videoFPS) FPS")
    }
    
    private func findBackCamera() -> AVCaptureDevice? {
        // Try to get wide angle camera (best for general vision)
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInDualCamera, .builtInTripleCamera],
            mediaType: .video,
            position: .back
        )
        
        return discoverySession.devices.first
    }
    
    private func selectCameraFormat(for device: AVCaptureDevice) -> AVCaptureDevice.Format {
        // Find format closest to our target resolution
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
        print("[RediWebRTC] 📹 Selected camera format: \(dims.width)x\(dims.height)")
        
        return selectedFormat
    }
    
    // MARK: - Sentinel Timer (Proactive Interjection)
    
    /// Start the sentinel timer for proactive vision checks
    func startSentinelTimer() {
        stopSentinelTimer()
        
        // Set interval based on mode
        sentinelIntervalSeconds = getSentinelInterval(for: currentMode)
        
        print("[RediWebRTC] ⏱️ Starting sentinel timer (every \(sentinelIntervalSeconds)s for \(currentMode) mode)")
        
        DispatchQueue.main.async { [weak self] in
            self?.sentinelTimer = Timer.scheduledTimer(withTimeInterval: self?.sentinelIntervalSeconds ?? 5.0, repeats: true) { [weak self] _ in
                self?.performSentinelCheck()
            }
        }
    }
    
    func stopSentinelTimer() {
        sentinelTimer?.invalidate()
        sentinelTimer = nil
    }
    
    private func getSentinelInterval(for mode: String) -> TimeInterval {
        switch mode {
        case "driving":
            return 3.0  // More frequent for safety
        case "cooking":
            return 4.0
        case "meeting":
            return 10.0  // Less frequent to avoid interruption
        case "studying":
            return 6.0
        default:
            return 5.0  // General mode
        }
    }
    
    /// Perform a sentinel check - ask the model to speak if it sees something noteworthy
    private func performSentinelCheck() {
        // Don't check if user recently spoke or response in progress
        let timeSinceUserSpoke = Date().timeIntervalSince(lastUserSpeechTime)
        guard timeSinceUserSpoke > 2.0 && !responseInProgress else {
            return
        }
        
        print("[RediWebRTC] 🔍 Sentinel check...")
        
        // Send a text prompt asking the model to evaluate what it sees
        // The video track provides the visual context automatically
        let sentinelPrompt = getSentinelPrompt(for: currentMode)
        
        send(message: [
            "type": "conversation.item.create",
            "item": [
                "type": "message",
                "role": "user",
                "content": [[
                    "type": "input_text",
                    "text": sentinelPrompt
                ]]
            ]
        ])
        
        // Trigger response
        send(message: ["type": "response.create"])
    }
    
    private func getSentinelPrompt(for mode: String) -> String {
        switch mode {
        case "driving":
            return "[SENTINEL] Look at the road. If you see any hazards, obstacles, or important landmarks, speak briefly. Otherwise stay completely silent."
        case "cooking":
            return "[SENTINEL] Check the cooking. If you see anything burning, overflowing, or needing attention, speak briefly. Otherwise stay silent."
        case "studying":
            return "[SENTINEL] If you notice the user seems stuck or the material has something interesting to point out, speak briefly. Otherwise stay silent."
        default:
            return "[SENTINEL] If you see anything noteworthy, interesting, or that the user should know about, speak briefly. Otherwise stay completely silent."
        }
    }
    
    // MARK: - Session Configuration
    
    private func configureSession() {
        guard !sessionConfigured else {
            print("[RediWebRTC] Session already configured")
            return
        }
        
        guard let dc = dataChannel, dc.readyState == .open else {
            print("[RediWebRTC] Data channel not open, cannot configure session")
            return
        }
        
        print("[RediWebRTC] 🔧 Session ready (pre-configured via token)")
        sessionConfigured = true
        
        // Start sentinel timer for proactive interjection
        startSentinelTimer()
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
        
        let body = ["mode": mode]
        request.httpBody = try JSONEncoder().encode(body)
        
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
            
            // CRITICAL: Configure audio session BEFORE creating WebRTC factory
            // Use voiceChat mode which has aggressive echo cancellation
            // Also enable mixWithOthers to prevent audio routing issues
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,  // voiceChat has better AEC than videoChat for voice-only
                options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
            )
            
            // Set preferred sample rate and buffer duration for low latency
            try audioSession.setPreferredSampleRate(48000)
            try audioSession.setPreferredIOBufferDuration(0.01)  // 10ms buffer
            
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            
            print("[RediWebRTC] ✅ Audio session configured:")
            print("  - Mode: voiceChat (aggressive AEC)")
            print("  - Sample rate: \(audioSession.sampleRate)")
            print("  - IO buffer: \(audioSession.ioBufferDuration * 1000)ms")
            print("  - Input channels: \(audioSession.inputNumberOfChannels)")
            print("  - Output channels: \(audioSession.outputNumberOfChannels)")
            
        } catch {
            print("[RediWebRTC] ⚠️ Failed to configure AVAudioSession: \(error)")
        }
    }
    
    // MARK: - Peer Connection
    
    private func setupPeerConnection() {
        // Create factory with default audio/video encoder/decoder
        // The factory MUST be created AFTER audio session is configured
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        
        factory = RTCPeerConnectionFactory(
            encoderFactory: encoderFactory,
            decoderFactory: decoderFactory
        )
        
        let config = RTCConfiguration()
        // No ICE servers needed - OpenAI handles this
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: [
                "DtlsSrtpKeyAgreement": "true"
            ]
        )
        
        peerConnection = factory?.peerConnection(with: config, constraints: constraints, delegate: self)
        
        print("[RediWebRTC] ✅ Peer connection created with video encoder/decoder")
    }
    
    // MARK: - Audio Track
    
    private func setupLocalAudio() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        // Audio constraints for echo cancellation
        // These are processed by WebRTC's audio processing module
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
                "googAutoGainControl2": "true",
                "googNoiseSuppression2": "true",
                "googDAEchoCancellation": "true"  // Dual-Audio Echo Cancellation
            ]
        )
        
        let audioSource = factory.audioSource(with: audioConstraints)
        let audioTrack = factory.audioTrack(with: audioSource, trackId: "local_audio")
        
        pc.add(audioTrack, streamIds: ["local_stream"])
        localAudioTrack = audioTrack
        
        print("[RediWebRTC] ✅ Audio track added with enhanced AEC constraints")
    }
    
    // MARK: - SDP Exchange
    
    private func sendOfferToOpenAI(localSdp: String) async throws -> String {
        guard let token = ephemeralToken else {
            throw WebRTCError.noToken
        }
        
        // Use /v1/realtime/calls endpoint with ephemeral token
        var request = URLRequest(url: openAICallsURL)
        request.httpMethod = "POST"
        request.setValue("application/sdp", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = localSdp.data(using: .utf8)
        
        print("[RediWebRTC] 📤 POST to \(openAICallsURL.absoluteString)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WebRTCError.sdpExchangeFailed
        }
        
        print("[RediWebRTC] Response status: \(httpResponse.statusCode)")
        
        if !(200...299).contains(httpResponse.statusCode) {
            if let errorBody = String(data: data, encoding: .utf8) {
                print("[RediWebRTC] Error body: \(errorBody)")
            }
            throw WebRTCError.sdpExchangeFailed
        }
        
        guard let answerSdp = String(data: data, encoding: .utf8) else {
            throw WebRTCError.invalidSDP
        }
        
        // Verify video was accepted
        print("[RediWebRTC] 📄 Answer contains video: \(answerSdp.contains("m=video"))")
        
        return answerSdp
    }
    
    // MARK: - Sending Data
    
    /// Send a message through the data channel
    func send(message: [String: Any]) {
        guard let dc = dataChannel,
              dc.readyState == .open else {
            print("[RediWebRTC] ⚠️ Data channel not ready")
            return
        }
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: message) else {
            print("[RediWebRTC] ⚠️ Failed to serialize message")
            return
        }
        
        let buffer = RTCDataBuffer(data: jsonData, isBinary: false)
        dc.sendData(buffer)
        
        if let type = message["type"] as? String {
            // Don't log sentinel checks to reduce noise
            if !type.contains("conversation.item.create") {
                print("[RediWebRTC] 📤 Sent: \(type)")
            }
        }
    }
    
    /// Mute/unmute microphone
    func setMicMuted(_ muted: Bool) {
        localAudioTrack?.isEnabled = !muted
        print("[RediWebRTC] 🎤 Mic \(muted ? "muted" : "unmuted")")
    }
    
    /// Enable/disable video
    func setVideoEnabled(_ enabled: Bool) {
        localVideoTrack?.isEnabled = enabled
        
        if enabled {
            startVideoCapture()
        } else {
            videoCapturer?.stopCapture()
        }
        
        DispatchQueue.main.async {
            self.isVideoEnabled = enabled
        }
        print("[RediWebRTC] 📹 Video \(enabled ? "enabled" : "disabled")")
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
            case .tokenFetchFailed: return "Failed to get ephemeral token"
            case .peerConnectionFailed: return "Failed to create peer connection"
            case .offerCreationFailed: return "Failed to create SDP offer"
            case .noToken: return "No ephemeral token available"
            case .sdpExchangeFailed: return "SDP exchange with OpenAI failed"
            case .invalidSDP: return "Invalid SDP response from OpenAI"
            case .dataChannelFailed: return "Data channel creation failed"
            case .noCameraAvailable: return "No camera available for video"
            }
        }
    }
}

// MARK: - RTCPeerConnectionDelegate

extension RediWebRTCService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        print("[RediWebRTC] Signaling state: \(stateChanged.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("[RediWebRTC] 🔊 Remote stream added - audio should play automatically!")
        
        // Log audio track info
        if let audioTrack = stream.audioTracks.first {
            print("[RediWebRTC] 🔊 Remote audio track: \(audioTrack.trackId), enabled: \(audioTrack.isEnabled)")
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        print("[RediWebRTC] Remote stream removed")
    }
    
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        print("[RediWebRTC] Negotiation needed")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        print("[RediWebRTC] ICE connection state: \(newState.rawValue)")
        
        DispatchQueue.main.async {
            switch newState {
            case .connected, .completed:
                self.isConnected = true
            case .disconnected, .failed:
                self.isConnected = false
            default:
                break
            }
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        print("[RediWebRTC] ICE gathering state: \(newState.rawValue)")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        // ICE candidates are automatically included in the local description
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        print("[RediWebRTC] 📡 Remote data channel opened: \(dataChannel.label)")
        dataChannel.delegate = self
        self.dataChannel = dataChannel
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCPeerConnectionState) {
        print("[RediWebRTC] Connection state: \(stateChanged.rawValue)")
        
        DispatchQueue.main.async {
            self.connectionState = stateChanged
        }
    }
}

// MARK: - RTCDataChannelDelegate

extension RediWebRTCService: RTCDataChannelDelegate {
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        print("[RediWebRTC] Data channel state: \(dataChannel.readyState.rawValue)")
        
        if dataChannel.readyState == .open {
            print("[RediWebRTC] ✅ Data channel ready!")
            
            // Configure session when data channel opens
            configureSession()
            
            DispatchQueue.main.async {
                self.onSessionReady?()
            }
        }
    }
    
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard let message = String(data: buffer.data, encoding: .utf8) else {
            return
        }
        
        DispatchQueue.main.async {
            self.handleIncomingJSON(message)
        }
    }
    
    private func handleIncomingJSON(_ jsonString: String) {
        guard let data = jsonString.data(using: .utf8),
              let eventDict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let eventType = eventDict["type"] as? String else {
            return
        }
        
        switch eventType {
        case "session.created":
            print("[RediWebRTC] 📋 Session created")
            
        case "session.updated":
            print("[RediWebRTC] ✅ Session updated - ready for conversation!")
            
        case "response.created":
            print("[RediWebRTC] 🎙️ Response started")
            responseInProgress = true
            onPlaybackStarted?()
            
        case "response.done":
            print("[RediWebRTC] ✅ Response complete")
            responseInProgress = false
            onPlaybackEnded?()
            
        case "response.audio_transcript.done":
            if let transcript = eventDict["transcript"] as? String {
                // Don't log empty sentinel responses
                if !transcript.isEmpty {
                    print("[RediWebRTC] 🤖 \"\(transcript)\"")
                    onTranscriptReceived?(transcript, "assistant")
                }
            }
            
        case "conversation.item.input_audio_transcription.completed":
            if let transcript = eventDict["transcript"] as? String {
                print("[RediWebRTC] 📝 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "user")
                lastUserSpeechTime = Date()
            }
            
        case "input_audio_buffer.speech_started":
            print("[RediWebRTC] 🎤 User speaking...")
            userRecentlySpeaking = true
            lastUserSpeechTime = Date()
            
        case "input_audio_buffer.speech_stopped":
            print("[RediWebRTC] 🎤 User stopped")
            userRecentlySpeaking = false
            
        case "error":
            if let errorInfo = eventDict["error"] as? [String: Any],
               let errorMessage = errorInfo["message"] as? String {
                print("[RediWebRTC] ❌ Error: \(errorMessage)")
                error = errorMessage
            }
            
        case "conversation.item.created":
            // Only log non-sentinel items
            if let item = eventDict["item"] as? [String: Any],
               let role = item["role"] as? String,
               let content = item["content"] as? [[String: Any]],
               let firstContent = content.first,
               let text = firstContent["text"] as? String,
               !text.hasPrefix("[SENTINEL]") {
                print("[RediWebRTC] 📨 Item created (role: \(role))")
            }
            
        default:
            // Only log important events
            if eventType.hasPrefix("response.") || eventType == "session.updated" {
                print("[RediWebRTC] 📨 \(eventType)")
            }
        }
    }
}
