/**
 * Redi V5 MainView
 *
 * Primary UI for Redi V5 (OpenAI Realtime API - DEFINITIVE VERSION):
 * - Full screen camera preview (landscape + portrait)
 * - Start/Stop session button
 * - Sensitivity slider
 * - Transcript display
 * - Fixed audio format (pcm16 string)
 * - Fixed vision (manual response trigger)
 * - Driving mode safety
 */

import SwiftUI

struct V5MainView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var cameraService = V3CameraService()  // Reuse V3 camera (works fine)
    @StateObject private var audioService = V5AudioService()    // V5 audio (fixed)
    @StateObject private var webSocketService = V5WebSocketService()  // V5 websocket (fixed)

    @State private var isSessionActive = false
    @State private var lastTranscript = ""
    @State private var lastRole = ""
    @State private var sensitivity: Double = 0.5
    @State private var isConnecting = false
    @State private var isSessionReady = false

    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    private var isLandscape: Bool {
        verticalSizeClass == .compact
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Camera preview (full screen background)
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

                        Text("Redi V5")
                            .font(isLandscape ? .title : .largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text("OpenAI Realtime - Definitive")
                            .font(.subheadline)
                            .foregroundColor(.gray)
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
            if isSessionActive {
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
            // Back button to exit V5
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 28))
                .foregroundColor(.white.opacity(0.8))
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
                .onTapGesture {
                    print("[V5MainView] X button tapped")
                    exitV5()
                }

            Circle()
                .fill(statusColor)
                .frame(width: 12, height: 12)

            Text(statusText)
                .font(.caption)
                .foregroundColor(.white)

            Spacer()

            if isSessionActive && isSessionReady {
                Text("V5 Active")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.3))
                    .cornerRadius(8)
                    .foregroundColor(.green)
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
                Text(isSessionActive ? "Tap to stop" : "Tap to start")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
    }

    private var statusColor: Color {
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

    private var statusText: String {
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

    private func toggleSession() {
        print("[V5MainView] Toggle: isSessionActive=\(isSessionActive)")
        if isSessionActive {
            stopSession()
        } else {
            startSession()
        }
    }

    private func startSession() {
        print("[V5MainView] Starting session...")
        isConnecting = true
        isSessionReady = false

        webSocketService.connect()
        cameraService.startCapture()
        audioService.startRecording()

        isSessionActive = true
        isConnecting = false
    }

    private func stopSession() {
        print("[V5MainView] Stopping session...")
        cameraService.stopCapture()
        audioService.stopRecording()
        webSocketService.disconnect()
        audioService.cleanup()

        isSessionActive = false
        isSessionReady = false
        lastTranscript = ""
    }

    private func exitV5() {
        stopSession()
        appState.useV5 = false
    }

    private func setupCallbacks() {
        // Camera frames -> Server
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            webSocketService?.sendFrame(frameData)
        }

        // Audio -> Server
        audioService.onAudioCaptured = { [weak webSocketService] audioData in
            webSocketService?.sendAudio(audioData)
        }

        // Server audio -> Speaker
        webSocketService.onAudioReceived = { [weak audioService] audioData in
            audioService?.playAudio(audioData)
        }

        // Server transcripts -> UI
        webSocketService.onTranscriptReceived = { text, role in
            withAnimation {
                lastTranscript = text
                lastRole = role
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                if lastTranscript == text {
                    withAnimation {
                        lastTranscript = ""
                    }
                }
            }
        }

        // Session ready
        webSocketService.onSessionReady = {
            isSessionReady = true
            print("[V5MainView] Session ready - OpenAI connected!")
        }

        // Errors
        webSocketService.onError = { error in
            print("[V5MainView] Error: \(error.localizedDescription)")
        }

        // Echo suppression
        webSocketService.onMicMuteChanged = { [weak audioService] muted in
            audioService?.isMicMuted = muted
        }

        // Barge-in
        webSocketService.onStopAudio = { [weak audioService] in
            audioService?.stopAudio()
        }

        // Fresh frame request
        webSocketService.onRequestFrame = { [weak cameraService, weak webSocketService] in
            cameraService?.captureFrameNow { frameData in
                webSocketService?.sendFrame(frameData)
            }
        }
    }
}

#Preview {
    V5MainView()
        .environmentObject(AppState())
}
