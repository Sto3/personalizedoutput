/**
 * Redi V3 MainView
 *
 * Primary UI for Redi - "Redi for Anything"
 * 
 * - Full screen camera preview
 * - Start/Stop session button  
 * - Sensitivity slider (1-10)
 * - Transcript display
 *
 * Jan 26, 2026: 
 * - "Redi for Anything" - no more modes, one adaptive AI
 * - Fixed camera freeze by not starting V3CameraService in WebRTC mode
 * - WebRTC uses its own camera via RTCCameraVideoCapturer
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
    @State private var sensitivity: Double = 5.0  // 1-10 scale, default balanced
    @State private var isConnecting = false
    @State private var isSessionReady = false
    @State private var cancellables = Set<AnyCancellable>()
    @State private var useWebRTC = false

    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    private var isLandscape: Bool {
        verticalSizeClass == .compact
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Camera preview
                // For WebRTC: Shows black initially, but Redi still sees via WebRTC video track
                // TODO: Route WebRTC video to preview for visual feedback
                if !useWebRTC {
                    V3CameraPreview(cameraService: cameraService)
                        .ignoresSafeArea()
                } else {
                    // WebRTC mode - show dark background
                    // (Redi can still see via the WebRTC video track)
                    Color.black
                        .ignoresSafeArea()
                    
                    // Show "Redi is watching" indicator
                    if isSessionActive && webRTCService.isVideoEnabled {
                        VStack {
                            Spacer()
                            HStack {
                                Spacer()
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(Color.green)
                                        .frame(width: 8, height: 8)
                                    Text("Redi can see")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.8))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(16)
                                .padding()
                            }
                        }
                    }
                }

                // Dark overlay when not active
                if !isSessionActive {
                    Color.black.opacity(0.6)
                        .ignoresSafeArea()

                    VStack(spacing: 20) {
                        Image(systemName: "eye.circle.fill")
                            .font(.system(size: isLandscape ? 50 : 80))
                            .foregroundColor(.green.opacity(0.8))

                        Text("Redi")
                            .font(isLandscape ? .title : .largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text("for Anything")
                            .font(.title2)
                            .foregroundColor(.green)
                    }
                }

                // Main UI overlay
                if isLandscape {
                    landscapeLayout(geometry: geometry)
                } else {
                    portraitLayout(geometry: geometry)
                }
            }
        }
        .onAppear {
            // No callbacks to setup initially - done at session start
        }
        .onChange(of: sensitivity) { newValue in
            // Update sensitivity in real-time
            let intValue = Int(newValue)
            if isSessionActive && useWebRTC {
                webRTCService.setSensitivity(intValue)
            } else if isSessionActive {
                webSocketService.sendSensitivity(newValue / 10.0)  // Convert to 0-1 for legacy
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
            VStack {
                Spacer()
                transcriptView
                    .frame(maxWidth: geometry.size.width * 0.5)
                Spacer()
            }
            .padding(.leading)

            Spacer()

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
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 28))
                .foregroundColor(.white.opacity(0.8))
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
                .onTapGesture {
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
                    if useWebRTC && webRTCService.isVideoEnabled {
                        Image(systemName: "video.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                    
                    Text("Sensitivity: \(Int(sensitivity))")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.3))
                        .cornerRadius(8)
                        .foregroundColor(.green)
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
                    Image(systemName: lastRole == "user" ? "person.fill" : "eye.fill")
                        .foregroundColor(lastRole == "user" ? .blue : .green)

                    Text(lastRole == "user" ? "You" : "Redi")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Text(lastTranscript)
                    .font(.body)
                    .lineLimit(4)  // Allow slightly longer transcripts
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
            // Sensitivity slider
            if isSessionActive && !compact {
                VStack(spacing: 8) {
                    Text("Sensitivity: \(Int(sensitivity))")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))

                    HStack {
                        Text("🤫")
                            .font(.caption)

                        Slider(value: $sensitivity, in: 1...10, step: 1)
                            .accentColor(.green)
                            .frame(maxWidth: 200)

                        Text("💬")
                            .font(.caption)
                    }
                    
                    Text(sensitivityLabel)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                }
                .padding(.horizontal, 40)
            }

            // Start/Stop button
            ZStack {
                Circle()
                    .fill(isSessionActive ? Color.red.opacity(0.6) : Color.green)
                    .frame(width: compact ? 60 : 80, height: compact ? 60 : 80)
                    .shadow(color: (isSessionActive ? Color.red : Color.green).opacity(0.5), radius: 10)

                if isConnecting {
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
                Text(isSessionActive ? "Tap to stop" : "Redi for Anything")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
    }
    
    private var sensitivityLabel: String {
        let level = Int(sensitivity)
        switch level {
        case 1...2: return "Minimal - only critical"
        case 3...4: return "Reserved - significant only"
        case 5...6: return "Balanced - helpful engagement"
        case 7...8: return "Engaged - active coaching"
        case 9...10: return "Maximum - constant companion"
        default: return ""
        }
    }

    private var statusColor: Color {
        if useWebRTC {
            return isSessionReady ? .green : (isConnecting ? .yellow : .gray)
        } else {
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
                return webRTCService.isVideoEnabled ? "Redi is watching" : "Ready"
            } else if isConnecting {
                return "Connecting..."
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
                return "Reconnecting..."
            }
        }
    }

    private func toggleSession() {
        if isSessionActive {
            stopSession()
        } else {
            startSession()
        }
    }

    private func startSession() {
        print("[Redi] Starting session (sensitivity: \(Int(sensitivity)))...")
        isConnecting = true
        isSessionReady = false
        
        useWebRTC = RediConfig.isWebRTCEnabled
        print("[Redi] Using \(useWebRTC ? "WebRTC 🚀" : "WebSocket")")

        if useWebRTC {
            startWebRTCSession()
        } else {
            startWebSocketSession()
            // Only start preview camera for WebSocket mode
            cameraService.startCapture()
        }
        
        isSessionActive = true
    }
    
    private func startWebRTCSession() {
        print("[Redi] 🚀 Starting WebRTC session...")
        
        // Set initial sensitivity
        webRTCService.setSensitivity(Int(sensitivity))
        
        webRTCService.onSessionReady = {
            DispatchQueue.main.async {
                self.isSessionReady = true
                self.isConnecting = false
                print("[Redi] ✅ WebRTC ready - Redi is watching!")
            }
        }
        
        webRTCService.onTranscriptReceived = { text, role in
            self.handleTranscript(text: text, role: role)
        }
        
        webRTCService.onPlaybackStarted = {
            print("[Redi] 🔊 Speaking (AEC active)")
        }
        
        webRTCService.onPlaybackEnded = {
            print("[Redi] 🔇 Done speaking")
        }
        
        webRTCService.onLatencyMeasured = { ms in
            print("[Redi] ⚡ Latency: \(ms)ms")
        }
        
        webRTCService.onError = { error in
            print("[Redi] ❌ Error: \(error.localizedDescription)")
            DispatchQueue.main.async {
                // Fall back to WebSocket
                self.useWebRTC = false
                self.cameraService.startCapture()
                self.startWebSocketSession()
            }
        }
        
        Task {
            do {
                try await webRTCService.connect()
                print("[Redi] ✅ Connected!")
            } catch {
                print("[Redi] ❌ Connection failed: \(error)")
                await MainActor.run {
                    self.useWebRTC = false
                    self.cameraService.startCapture()
                    self.startWebSocketSession()
                }
            }
        }
    }
    
    private func startWebSocketSession() {
        print("[Redi] Starting WebSocket session...")
        
        setupWebSocketCallbacks()
        webSocketService.connect()
        audioService.startRecording()
        
        audioService.audioCaptured
            .sink { [weak webSocketService] audioData in
                webSocketService?.sendAudio(audioData)
            }
            .store(in: &cancellables)
        
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            webSocketService?.sendFrame(frameData)
        }
    }

    private func stopSession() {
        print("[Redi] Stopping session...")

        if useWebRTC {
            webRTCService.disconnect()
        } else {
            cameraService.stopCapture()
            audioService.stopRecording()
            webSocketService.disconnect()
            audioService.cleanup()
        }

        isSessionActive = false
        isSessionReady = false
        lastTranscript = ""
        useWebRTC = false
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

            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                if self.lastTranscript == text {
                    withAnimation {
                        self.lastTranscript = ""
                    }
                }
            }
        }
    }
    
    private func setupWebSocketCallbacks() {
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            webSocketService?.sendFrame(frameData)
        }

        webSocketService.onAudioReceived = { [weak audioService] audioData in
            audioService?.playAudio(audioData)
        }
        
        webSocketService.onAudioDone = { [weak audioService] in
            audioService?.flushAudio()
        }

        webSocketService.onTranscriptReceived = { text, role in
            self.handleTranscript(text: text, role: role)
        }

        webSocketService.onSessionReady = {
            self.isSessionReady = true
            self.isConnecting = false
        }

        webSocketService.onError = { error in
            print("[Redi] WebSocket error: \(error.localizedDescription)")
        }

        webSocketService.onMicMuteChanged = { [weak audioService] muted in
            audioService?.setMuted(muted)
        }

        webSocketService.onStopAudio = { [weak audioService] in
            audioService?.stopPlayback()
        }

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
