/**
 * RediWebRTCService.swift
 *
 * WebRTC-based connection to OpenAI Realtime API for Redi.
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
    private var audioTrack: RTCAudioTrack?
    private var localAudioTrack: RTCAudioTrack?
    
    // WebRTC factory (singleton)
    private static let factory: RTCPeerConnectionFactory = {
        RTCInitializeSSL()
        let videoEncoderFactory = RTCDefaultVideoEncoderFactory()
        let videoDecoderFactory = RTCDefaultVideoDecoderFactory()
        return RTCPeerConnectionFactory(
            encoderFactory: videoEncoderFactory,
            decoderFactory: videoDecoderFactory
        )
    }()
    
    // MARK: - Configuration
    
    private var ephemeralToken: String?
    private let tokenURL = URL(string: "https://redialways.com/api/redi/webrtc/token")!
    private let openAICallsURL = URL(string: "https://api.openai.com/v1/realtime/calls")!
    
    // MARK: - Audio
    
    private var audioSession: AVAudioSession {
        AVAudioSession.sharedInstance()
    }
    
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
        }
        
        print("[RediWebRTC] 🔗 Starting WebRTC connection...")
        
        do {
            // Step 1: Get ephemeral token
            print("[RediWebRTC] 📝 Requesting ephemeral token...")
            let tokenResponse = try await fetchEphemeralToken(mode: mode)
            self.ephemeralToken = tokenResponse.token
            print("[RediWebRTC] ✅ Got token (expires: \(tokenResponse.expiresAt))")
            
            // Step 2: Configure audio session for WebRTC
            try configureAudioSession()
            
            // Step 3: Create peer connection
            print("[RediWebRTC] 🔧 Creating peer connection...")
            try createPeerConnection()
            
            // Step 4: Add local audio track (microphone)
            print("[RediWebRTC] 🎤 Adding audio track...")
            addLocalAudioTrack()
            
            // Step 5: Create data channel for events
            print("[RediWebRTC] 📡 Creating data channel...")
            createDataChannel()
            
            // Step 6: Create SDP offer
            print("[RediWebRTC] 📤 Creating SDP offer...")
            let offer = try await createOffer()
            
            // Step 7: Set local description
            guard let pc = peerConnection else {
                throw WebRTCError.peerConnectionFailed
            }
            try await pc.setLocalDescription(offer)
            
            // Step 8: Send offer to OpenAI and get answer
            print("[RediWebRTC] 📨 Sending offer to OpenAI...")
            let answer = try await sendOfferToOpenAI(offer: offer)
            
            // Step 9: Set remote description
            print("[RediWebRTC] 📥 Setting remote description...")
            try await pc.setRemoteDescription(answer)
            
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
        audioTrack = nil
        ephemeralToken = nil
        
        DispatchQueue.main.async {
            self.isConnected = false
            self.isConnecting = false
            self.connectionState = .closed
        }
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
    
    private func configureAudioSession() throws {
        try audioSession.setCategory(
            .playAndRecord,
            mode: .voiceChat,  // Enables hardware echo cancellation
            options: [.defaultToSpeaker, .allowBluetooth]
        )
        try audioSession.setActive(true)
        print("[RediWebRTC] ✅ Audio session configured with echo cancellation")
    }
    
    // MARK: - Peer Connection
    
    private func createPeerConnection() throws {
        let config = RTCConfiguration()
        config.sdpSemantics = .unifiedPlan
        
        // Use Google's STUN servers for NAT traversal
        config.iceServers = [
            RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"]),
            RTCIceServer(urlStrings: ["stun:stun1.l.google.com:19302"])
        ]
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )
        
        // GoogleWebRTC's peerConnection returns non-optional RTCPeerConnection
        let pc = Self.factory.peerConnection(
            with: config,
            constraints: constraints,
            delegate: self
        )
        
        self.peerConnection = pc
    }
    
    // MARK: - Audio Track
    
    private func addLocalAudioTrack() {
        let audioConstraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: [
                "googEchoCancellation": "true",
                "googAutoGainControl": "true",
                "googNoiseSuppression": "true",
                "googHighpassFilter": "true"
            ]
        )
        
        let audioSource = Self.factory.audioSource(with: audioConstraints)
        let newAudioTrack = Self.factory.audioTrack(with: audioSource, trackId: "audio0")
        newAudioTrack.isEnabled = true
        
        self.localAudioTrack = newAudioTrack
        
        // Add track to peer connection
        peerConnection?.add(newAudioTrack, streamIds: ["stream0"])
    }
    
    // MARK: - Data Channel
    
    private func createDataChannel() {
        let config = RTCDataChannelConfiguration()
        config.isOrdered = true
        
        guard let pc = peerConnection,
              let dc = pc.dataChannel(forLabel: "oai-events", configuration: config) else {
            print("[RediWebRTC] ⚠️ Failed to create data channel")
            return
        }
        
        dc.delegate = self
        self.dataChannel = dc
    }
    
    // MARK: - SDP Offer/Answer
    
    private func createOffer() async throws -> RTCSessionDescription {
        guard let pc = peerConnection else {
            throw WebRTCError.peerConnectionFailed
        }
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveAudio": "true",
                "OfferToReceiveVideo": "false"
            ],
            optionalConstraints: nil
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            pc.offer(for: constraints) { sdp, offerError in
                if let offerError = offerError {
                    continuation.resume(throwing: offerError)
                } else if let sdp = sdp {
                    continuation.resume(returning: sdp)
                } else {
                    continuation.resume(throwing: WebRTCError.offerCreationFailed)
                }
            }
        }
    }
    
    private func sendOfferToOpenAI(offer: RTCSessionDescription) async throws -> RTCSessionDescription {
        guard let token = ephemeralToken else {
            throw WebRTCError.noToken
        }
        
        var request = URLRequest(url: openAICallsURL)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/sdp", forHTTPHeaderField: "Content-Type")
        request.httpBody = offer.sdp.data(using: .utf8)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            print("[RediWebRTC] ❌ OpenAI returned status: \(statusCode)")
            throw WebRTCError.sdpExchangeFailed
        }
        
        guard let sdpString = String(data: data, encoding: .utf8) else {
            throw WebRTCError.invalidSDP
        }
        
        return RTCSessionDescription(type: .answer, sdp: sdpString)
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
    }
    
    /// Send a camera frame to OpenAI
    func sendFrame(_ frameData: Data) {
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
        print("[RediWebRTC] 🔊 Remote stream added")
        
        // Handle incoming audio
        if let remoteAudioTrack = stream.audioTracks.first {
            self.audioTrack = remoteAudioTrack
            remoteAudioTrack.isEnabled = true
            print("[RediWebRTC] ✅ Remote audio track enabled")
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
                self.onSessionReady?()
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
        print("[RediWebRTC] ICE candidate generated")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {
        print("[RediWebRTC] ICE candidates removed")
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen remoteDataChannel: RTCDataChannel) {
        print("[RediWebRTC] 📡 Data channel opened: \(remoteDataChannel.label)")
        remoteDataChannel.delegate = self
        self.dataChannel = remoteDataChannel
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
            DispatchQueue.main.async {
                self.onSessionReady?()
            }
        }
    }
    
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard !buffer.isBinary,
              let message = try? JSONSerialization.jsonObject(with: buffer.data) as? [String: Any],
              let type = message["type"] as? String else {
            return
        }
        
        DispatchQueue.main.async {
            self.handleDataChannelMessage(type: type, message: message)
        }
    }
    
    private func handleDataChannelMessage(type: String, message: [String: Any]) {
        switch type {
        case "response.created":
            print("[RediWebRTC] 🎙️ Response started")
            onPlaybackStarted?()
            
        case "response.done":
            print("[RediWebRTC] ✅ Response complete")
            onPlaybackEnded?()
            
        case "response.audio_transcript.done":
            if let transcript = message["transcript"] as? String {
                print("[RediWebRTC] 🤖 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "assistant")
            }
            
        case "conversation.item.input_audio_transcription.completed":
            if let transcript = message["transcript"] as? String {
                print("[RediWebRTC] 📝 \"\(transcript)\"")
                onTranscriptReceived?(transcript, "user")
            }
            
        case "input_audio_buffer.speech_started":
            print("[RediWebRTC] 🎤 User speaking...")
            
        case "input_audio_buffer.speech_stopped":
            print("[RediWebRTC] 🎤 User stopped")
            onRequestFrame?()
            
        case "error":
            if let errorInfo = message["error"] as? [String: Any],
               let errorMessage = errorInfo["message"] as? String {
                print("[RediWebRTC] ❌ Error: \(errorMessage)")
                error = errorMessage
            }
            
        default:
            if type.hasPrefix("response.") || type.hasPrefix("conversation.") {
                print("[RediWebRTC] 📨 \(type)")
            }
        }
    }
}
