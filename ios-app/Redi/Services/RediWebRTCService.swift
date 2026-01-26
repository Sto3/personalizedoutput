/**
 * RediWebRTCService.swift
 *
 * WebRTC-based connection to OpenAI Realtime API for Redi.
 * Based on working example: https://github.com/PallavAg/VoiceModeWebRTCSwift
 *
 * BENEFITS OVER WEBSOCKET:
 * 1. Built-in echo cancellation (Google's WebRTC AEC) - SOLVES ECHO PROBLEM
 * 2. Lower latency (direct peer connection, no server relay)
 * 3. Better audio quality (Opus codec support)
 * 4. More reliable turn detection
 *
 * ARCHITECTURE:
 * 1. iOS requests ephemeral token from our server
 * 2. iOS establishes WebRTC peer connection directly to OpenAI
 * 3. Audio flows directly between iOS and OpenAI (no server in the middle)
 * 4. Data channel used for events (transcripts, session control)
 *
 * IMPORTANT: After running `pod install`, open Redi.xcworkspace (NOT .xcodeproj)
 *
 * Created: Jan 25, 2026
 * Updated: Jan 26, 2026 - Fixed endpoint to use /v1/realtime/calls
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
    
    // MARK: - Callbacks
    
    var onSessionReady: (() -> Void)?
    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?  // (text, role)
    var onPlaybackStarted: (() -> Void)?
    var onPlaybackEnded: (() -> Void)?
    var onRequestFrame: (() -> Void)?
    var onError: ((Error) -> Void)?
    
    // MARK: - WebRTC Components
    
    private var peerConnection: RTCPeerConnection?
    private var dataChannel: RTCDataChannel?
    private var localAudioTrack: RTCAudioTrack?
    
    // Track if session is configured
    private var sessionConfigured = false
    
    // Track if response is in progress (to throttle frames)
    private var responseInProgress = false
    
    // WebRTC factory - create fresh each time like the working example
    private var factory: RTCPeerConnectionFactory?
    
    // MARK: - Configuration
    
    private var ephemeralToken: String?
    private let tokenURL = URL(string: "https://redialways.com/api/redi/webrtc/token")!
    
    // OpenAI WebRTC endpoint - use /calls for ephemeral tokens
    private let openAICallsURL = URL(string: "https://api.openai.com/v1/realtime/calls")!
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        print("[RediWebRTC] 🚀 Service initialized")
    }
    
    deinit {
        disconnect()
    }
    
    // MARK: - Connection Management
    
    /// Connect to OpenAI via WebRTC
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
        }
        
        print("[RediWebRTC] 🔗 Starting WebRTC connection...")
        
        do {
            // Step 1: Get ephemeral token from our server
            print("[RediWebRTC] 📝 Requesting ephemeral token...")
            let tokenResponse = try await fetchEphemeralToken(mode: mode)
            self.ephemeralToken = tokenResponse.token
            print("[RediWebRTC] ✅ Got token (expires: \(tokenResponse.expiresAt))")
            
            // Step 2: Setup peer connection (creates factory)
            print("[RediWebRTC] 🔧 Creating peer connection...")
            setupPeerConnection()
            
            // Step 3: Setup local audio
            print("[RediWebRTC] 🎤 Setting up local audio...")
            setupLocalAudio()
            
            // Step 4: Configure audio session for WebRTC
            print("[RediWebRTC] 🔊 Configuring audio session...")
            configureAudioSession()
            
            guard let pc = peerConnection else {
                throw WebRTCError.peerConnectionFailed
            }
            
            // Step 5: Create data channel for events
            print("[RediWebRTC] 📡 Creating data channel...")
            let dcConfig = RTCDataChannelConfiguration()
            if let dc = pc.dataChannel(forLabel: "oai-events", configuration: dcConfig) {
                dataChannel = dc
                dc.delegate = self
            }
            
            // Step 6: Create SDP offer
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
            
            // Step 7: Set local description
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                pc.setLocalDescription(offer) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
            
            // Step 8: Get the local SDP (may have ICE candidates added)
            guard let localSdp = pc.localDescription?.sdp else {
                throw WebRTCError.offerCreationFailed
            }
            
            // Step 9: Send offer to OpenAI and get answer
            print("[RediWebRTC] 📨 Sending offer to OpenAI /v1/realtime/calls...")
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
            
            print("[RediWebRTC] ✅ WebRTC connection established!")
            
            await MainActor.run {
                isConnecting = false
                isConnected = true
            }
            
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
        
        dataChannel?.close()
        dataChannel = nil
        
        peerConnection?.close()
        peerConnection = nil
        
        localAudioTrack = nil
        factory = nil
        ephemeralToken = nil
        sessionConfigured = false
        responseInProgress = false
        
        DispatchQueue.main.async {
            self.isConnected = false
            self.isConnecting = false
            self.connectionState = .closed
        }
    }
    
    // MARK: - Session Configuration
    
    /// Configure the OpenAI session - called when data channel opens
    /// Note: Session is pre-configured via the token, but we can update it here
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
        
        // The session is already configured via the token endpoint
        // We just need to wait for it to be ready
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
            // Use videoChat mode like the working example - better for WebRTC
            try audioSession.setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setMode(.videoChat)  // Key for WebRTC!
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("[RediWebRTC] ✅ Audio session configured (videoChat mode)")
        } catch {
            print("[RediWebRTC] ⚠️ Failed to configure AVAudioSession: \(error)")
        }
    }
    
    // MARK: - Peer Connection
    
    private func setupPeerConnection() {
        let config = RTCConfiguration()
        // Simple config like the working example
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        
        // Create factory fresh
        factory = RTCPeerConnectionFactory()
        
        peerConnection = factory?.peerConnection(with: config, constraints: constraints, delegate: self)
    }
    
    // MARK: - Audio Track
    
    private func setupLocalAudio() {
        guard let pc = peerConnection, let factory = factory else { return }
        
        // Put echo cancellation in MANDATORY constraints like working example
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "googEchoCancellation": "true",
                "googAutoGainControl": "true",
                "googNoiseSuppression": "true",
                "googHighpassFilter": "true"
            ],
            optionalConstraints: nil
        )
        
        let audioSource = factory.audioSource(with: constraints)
        let audioTrack = factory.audioTrack(with: audioSource, trackId: "local_audio")
        
        pc.add(audioTrack, streamIds: ["local_stream"])
        localAudioTrack = audioTrack
        
        print("[RediWebRTC] ✅ Local audio track added")
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
        
        // Log response details for debugging
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
            print("[RediWebRTC] 📤 Sent: \(type)")
        }
    }
    
    /// Send a camera frame to OpenAI
    func sendFrame(_ frameData: Data) {
        // Throttle frames during response
        guard !responseInProgress else {
            return
        }
        
        let base64 = frameData.base64EncodedString()
        
        send(message: [
            "type": "conversation.item.create",
            "item": [
                "type": "message",
                "role": "user",
                "content": [
                    [
                        "type": "input_image",
                        "image_url": "data:image/jpeg;base64,\(base64)"
                    ]
                ]
            ]
        ])
    }
    
    /// Mute/unmute microphone
    func setMicMuted(_ muted: Bool) {
        localAudioTrack?.isEnabled = !muted
        print("[RediWebRTC] 🎤 Mic \(muted ? "muted" : "unmuted")")
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
        
        var errorDescription: String? {
            switch self {
            case .tokenFetchFailed: return "Failed to get ephemeral token"
            case .peerConnectionFailed: return "Failed to create peer connection"
            case .offerCreationFailed: return "Failed to create SDP offer"
            case .noToken: return "No ephemeral token available"
            case .sdpExchangeFailed: return "SDP exchange with OpenAI failed"
            case .invalidSDP: return "Invalid SDP response from OpenAI"
            case .dataChannelFailed: return "Data channel creation failed"
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
                print("[RediWebRTC] 🤖 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "assistant")
            }
            
        case "conversation.item.input_audio_transcription.completed":
            if let transcript = eventDict["transcript"] as? String {
                print("[RediWebRTC] 📝 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "user")
            }
            
        case "input_audio_buffer.speech_started":
            print("[RediWebRTC] 🎤 User speaking...")
            
        case "input_audio_buffer.speech_stopped":
            print("[RediWebRTC] 🎤 User stopped")
            onRequestFrame?()
            
        case "error":
            if let errorInfo = eventDict["error"] as? [String: Any],
               let errorMessage = errorInfo["message"] as? String {
                print("[RediWebRTC] ❌ Error: \(errorMessage)")
                error = errorMessage
            }
            
        case "conversation.item.created":
            // Log but don't spam
            if let item = eventDict["item"] as? [String: Any],
               let role = item["role"] as? String {
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
