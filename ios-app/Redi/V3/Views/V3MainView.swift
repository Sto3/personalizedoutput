/**
 * Redi V3 MainView
 *
 * Primary UI for Redi V3 (OpenAI Realtime API):
 * - Full screen camera preview (landscape + portrait)
 * - Start/Stop session button
 * - Sensitivity slider
 * - Transcript display
 * - ~500ms voice-to-voice latency
 * 
 * Jan 25, 2026: Added WebRTC support for echo-free audio!
 * When V7 WebRTC is selected, uses direct connection to OpenAI.
 * 
 * Jan 26, 2026: Updated for video track - no more data channel images!
 * Video is streamed directly via WebRTC video track.
 */

import SwiftUI
import Combine

struct V3MainView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var cameraService = V3CameraService()
    @StateObject private var audioService = V5AudioService()
    @StateObject private var webSocketService = V5WebSocketService()
    @StateObject private var webRTCService = RediWebRTCService()

    @State private var isSessionActive = false
    @State private var lastTranscript = ""
    @State private var lastRole = ""
    @State private var sensitivity: Double = 0.5
    @State private var isConnecting = false
    @State private var isSessionReady = false
    @State private var cancellables = Set<AnyCancellable>()
    @State private var useWebRTC = false  // Determined at session start

    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    private var isLandscape: Bool {
        verticalSizeClass == .compact
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Camera preview (full screen background)
                // NOTE: For WebRTC, video goes directly to OpenAI via video track
                // The preview here is just for the user to see what Redi sees
                V3CameraPreview(cameraService: cameraService)
                    .ignoresSafeArea()

                // Dark overlay when not active
                if !isSessionActive {
                    Color.black.opacity(0.6)
                        .ignoresSafeArea()

                    VStack(spacing: 20) {
                        Image(systemName: "waveform.circle.fill")
                            .font(.system(size: isLandscape ? 50 : 80))
                            .foregroundColor(.green.opacity(0.8))

                        Text("Redi V3")
                            .font(isLandscape ? .title : .largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text(RediConfig.serverVersion.displayName)
                            .font(.subheadline)
                            .foregroundColor(RediConfig.isWebRTCEnabled ? .green : .gray)
                    }
                }

                // Main UI overlay - adapts to orientation
                if isLandscape {
                    landscapeLayout(geometry: geometry)
                } else {
                    portraitLayout(geometry: geometry)
                }
            }
        }
        .onAppear {
            setupCallbacks()
        }
        .onChange(of: sensitivity) { newValue in
            if isSessionActive && !useWebRTC {
                webSocketService.sendSensitivity(newValue)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: lastTranscript)
    }

    // MARK: - Portrait Layout

    @ViewBuilder
    private func portraitLayout(geometry: GeometryProxy) -> some View {
        VStack {
            statusBar
            Spacer()
            transcriptView
            controlsView(compact: false)
                .padding(.bottom, 50)
        }
    }

    // MARK: - Landscape Layout

    @ViewBuilder
    private func landscapeLayout(geometry: GeometryProxy) -> some View {
        HStack {
            // Left side - transcript
            VStack {
                Spacer()
                transcriptView
                    .frame(maxWidth: geometry.size.width * 0.5)
                Spacer()
            }
            .padding(.leading)

            Spacer()

            // Right side - controls
            VStack {
                statusBar
                Spacer()
                controlsView(compact: true)
                Spacer()
            }
            .padding(.trailing)
        }
    }

    // MARK: - Shared Components

    private var statusBar: some View {
        HStack {
            // Back button to exit V3 - using onTapGesture to avoid SwiftUI auto-trigger bug
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 28))
                .foregroundColor(.white.opacity(0.8))
                .frame(width: 44, height: 44)  // Larger tap target
                .contentShape(Rectangle())
                .onTapGesture {
                    print("[V3MainView] X button tapped")
                    exitV3()
                }

            Circle()
                .fill(statusColor)
                .frame(width: 12, height: 12)

            Text(statusText)
                .font(.caption)
                .foregroundColor(.white)

            Spacer()

            if isSessionActive && isSessionReady {
                HStack(spacing: 4) {
                    // Show video indicator for WebRTC
                    if useWebRTC && webRTCService.isVideoEnabled {
                        Image(systemName: "video.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                    
                    Text(useWebRTC ? "WebRTC" : "WebSocket")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(useWebRTC ? Color.green.opacity(0.3) : Color.orange.opacity(0.3))
                        .cornerRadius(8)
                        .foregroundColor(useWebRTC ? .green : .orange)
                }
            }
        }
        .padding()
    }

    @ViewBuilder
    private var transcriptView: some View {
        if !lastTranscript.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: lastRole == "user" ? "person.fill" : "waveform")
                        .foregroundColor(lastRole == "user" ? .blue : .green)

                    Text(lastRole == "user" ? "You" : "Redi")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Text(lastTranscript)
                    .font(.body)
                    .lineLimit(3)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.black.opacity(0.8))
            .foregroundColor(.white)
            .cornerRadius(12)
            .padding(.horizontal)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    @ViewBuilder
    private func controlsView(compact: Bool) -> some View {
        VStack(spacing: compact ? 12 : 20) {
            // Sensitivity slider (only shown when active)
            if isSessionActive && !compact {
                VStack(spacing: 8) {
                    Text("Sensitivity")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))

                    HStack {
                        Image(systemName: "speaker.fill")
                            .foregroundColor(.white.opacity(0.5))
                            .font(.caption)

                        Slider(value: $sensitivity, in: 0...1)
                            .accentColor(.green)
                            .frame(maxWidth: 200)

                        Image(systemName: "speaker.wave.3.fill")
                            .foregroundColor(.white.opacity(0.5))
                            .font(.caption)
                    }
                }
                .padding(.horizontal, 40)
            }

            // Start/Stop button - using onTapGesture to avoid SwiftUI button re-render triggers
            ZStack {
                Circle()
                    .fill(isSessionActive ? Color.red.opacity(0.6) : Color.green)
                    .frame(width: compact ? 60 : 80, height: compact ? 60 : 80)
                    .shadow(color: (isSessionActive ? Color.red : Color.green).opacity(0.5), radius: 10)

                if isConnecting {
                    // Only show loading during initial connection
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: isSessionActive ? "stop.fill" : "play.fill")
                        .foregroundColor(.white)
                        .font(compact ? .title2 : .title)
                }
            }
            .contentShape(Circle())
            .onTapGesture {
                guard !isConnecting else { return }
                toggleSession()
            }

            if !compact {
                Text(isSessionActive ? "Tap to stop" : "Tap to start")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
    }

    private var statusColor: Color {
        if useWebRTC {
            // WebRTC status
            return isSessionReady ? .green : (isConnecting ? .yellow : .gray)
        } else {
            // WebSocket status
            switch webSocketService.connectionState {
            case .connected:
                return isSessionReady ? .green : .yellow
            case .connecting:
                return .yellow
            case .disconnected:
                return .gray
            case .error:
                return .red
            }
        }
    }

    private var statusText: String {
        if useWebRTC {
            if isSessionReady {
                return webRTCService.isVideoEnabled ? "WebRTC + Video Ready" : "WebRTC Ready"
            } else if isConnecting {
                return "Connecting WebRTC..."
            } else {
                return "Not connected"
            }
        } else {
            switch webSocketService.connectionState {
            case .connected:
                return isSessionReady ? "Ready" : "Initializing..."
            case .connecting:
                return "Connecting..."
            case .disconnected:
                return "Not connected"
            case .error:
                // Suppress error details in UI - just show reconnecting
                return "Reconnecting..."
            }
        }
    }

    private func toggleSession() {
        print("[V3MainView] Toggle: isSessionActive=\(isSessionActive)")
        if isSessionActive {
            stopSession()
        } else {
            startSession()
        }
    }

    private func startSession() {
        print("[V3MainView] Starting session...")
        isConnecting = true
        isSessionReady = false
        
        // Check if WebRTC is enabled
        useWebRTC = RediConfig.isWebRTCEnabled
        print("[V3MainView] Using \(useWebRTC ? "WebRTC 🚀" : "WebSocket")")

        if useWebRTC {
            startWebRTCSession()
        } else {
            startWebSocketSession()
        }

        // Start camera for local preview
        // NOTE: For WebRTC, the actual video sent to OpenAI comes from
        // RTCCameraVideoCapturer, not from this preview camera.
        // This is just so the user can see what Redi sees.
        cameraService.startCapture()
        
        isSessionActive = true
    }
    
    private func startWebRTCSession() {
        print("[V3MainView] 🚀 Starting WebRTC session with VIDEO TRACK...")
        
        // Setup WebRTC callbacks BEFORE connecting
        webRTCService.onSessionReady = {
            DispatchQueue.main.async {
                self.isSessionReady = true
                self.isConnecting = false
                print("[V3MainView] ✅ WebRTC session ready with video!")
            }
        }
        
        webRTCService.onTranscriptReceived = { text, role in
            self.handleTranscript(text: text, role: role)
        }
        
        webRTCService.onPlaybackStarted = {
            // WebRTC handles echo cancellation internally - no need to mute mic!
            print("[V3MainView] 🔊 WebRTC playback started (AEC active)")
        }
        
        webRTCService.onPlaybackEnded = {
            print("[V3MainView] 🔇 WebRTC playback ended")
        }
        
        // NOTE: We no longer use onRequestFrame or sendFrame for WebRTC!
        // Video is sent directly via the WebRTC video track.
        // The Sentinel timer in RediWebRTCService handles proactive interjection.
        
        webRTCService.onError = { error in
            print("[V3MainView] ❌ WebRTC error: \(error.localizedDescription)")
            DispatchQueue.main.async {
                // Fall back to WebSocket if WebRTC fails
                print("[V3MainView] 🔄 Falling back to WebSocket...")
                self.useWebRTC = false
                self.startWebSocketSession()
            }
        }
        
        // Connect!
        Task {
            do {
                try await webRTCService.connect(mode: "general")
                print("[V3MainView] ✅ WebRTC connected with video track!")
            } catch {
                print("[V3MainView] ❌ WebRTC connection failed: \(error.localizedDescription)")
                await MainActor.run {
                    // Fall back to WebSocket
                    self.useWebRTC = false
                    self.startWebSocketSession()
                }
            }
        }
    }
    
    private func startWebSocketSession() {
        print("[V3MainView] Starting WebSocket session...")
        
        // Setup WebSocket callbacks
        setupWebSocketCallbacks()
        
        // Connect to server
        webSocketService.connect()

        // Start audio (WebSocket needs explicit audio handling)
        audioService.startRecording()
        
        // Audio -> Server (using Combine publisher)
        audioService.audioCaptured
            .sink { [weak webSocketService] audioData in
                webSocketService?.sendAudio(audioData)
            }
            .store(in: &cancellables)
        
        // Camera frames -> Server (WebSocket needs continuous frames for V7 fresh-frame logic)
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            print("[DEBUG] Frame captured, sending to websocket: \(frameData.count) bytes")
            webSocketService?.sendFrame(frameData)
        }
    }

    private func stopSession() {
        // DEBUG: Print stack trace to find what's calling stopSession
        print("[V3MainView] Stopping session... STACK TRACE:")
        Thread.callStackSymbols.prefix(10).forEach { print("  \($0)") }

        cameraService.stopCapture()
        
        if useWebRTC {
            webRTCService.disconnect()
        } else {
            audioService.stopRecording()
            webSocketService.disconnect()
            audioService.cleanup()
        }

        isSessionActive = false
        isSessionReady = false
        lastTranscript = ""
        useWebRTC = false
        
        // Clear subscriptions
        cancellables.removeAll()
    }

    private func exitV3() {
        stopSession()
        appState.useV3 = false
    }
    
    private func handleTranscript(text: String, role: String) {
        DispatchQueue.main.async {
            withAnimation {
                self.lastTranscript = text
                self.lastRole = role
            }

            // Clear transcript after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                if self.lastTranscript == text {
                    withAnimation {
                        self.lastTranscript = ""
                    }
                }
            }
        }
    }

    private func setupCallbacks() {
        // Only setup WebSocket callbacks here - WebRTC callbacks are setup in startWebRTCSession
    }
    
    private func setupWebSocketCallbacks() {
        // Camera frames -> Server
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            print("[DEBUG] Frame captured, sending to websocket: \(frameData.count) bytes")
            webSocketService?.sendFrame(frameData)
        }

        // Server audio -> Speaker
        webSocketService.onAudioReceived = { [weak audioService] audioData in
            audioService?.playAudio(audioData)
        }
        
        // Server signals audio stream complete -> Flush remaining audio
        webSocketService.onAudioDone = { [weak audioService] in
            audioService?.flushAudio()
        }

        // Server transcripts -> UI
        webSocketService.onTranscriptReceived = { text, role in
            self.handleTranscript(text: text, role: role)
        }

        // Session ready
        webSocketService.onSessionReady = {
            self.isSessionReady = true
            self.isConnecting = false
            print("[V3MainView] Session ready - OpenAI connected!")
        }

        // Errors - log but don't show to user (handled gracefully)
        webSocketService.onError = { error in
            print("[V3MainView] Error (suppressed): \(error.localizedDescription)")
        }

        // Echo suppression: server tells us when to mute/unmute mic
        // This prevents Redi from hearing its own voice through the speaker
        webSocketService.onMicMuteChanged = { [weak audioService] muted in
            audioService?.setMuted(muted)
        }

        // Barge-in: server tells us to stop audio when user interrupts
        webSocketService.onStopAudio = { [weak audioService] in
            audioService?.stopPlayback()
        }

        // Fresh frame request: server needs a fresh frame for visual context
        webSocketService.onRequestFrame = { [weak cameraService, weak webSocketService] in
            cameraService?.captureFrameNow { frameData in
                webSocketService?.sendFrame(frameData)
            }
        }
    }
}

#Preview {
    V3MainView()
        .environmentObject(AppState())
}
