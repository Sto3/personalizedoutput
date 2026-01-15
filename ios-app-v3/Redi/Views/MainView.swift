/**
 * Redi V3 MainView
 *
 * Primary UI for Redi:
 * - Full screen camera preview
 * - Start/Stop session button
 * - Sensitivity slider
 * - Transcript display
 */

import SwiftUI

struct MainView: View {
    @StateObject private var cameraService = CameraService()
    @StateObject private var audioService = AudioService()
    @StateObject private var webSocketService = WebSocketService()

    @State private var isSessionActive = false
    @State private var lastTranscript = ""
    @State private var lastRole = ""
    @State private var sensitivity: Double = 0.5
    @State private var isConnecting = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            // Camera preview (full screen background)
            CameraPreview(cameraService: cameraService)
                .ignoresSafeArea()

            // Dark overlay when not active
            if !isSessionActive {
                Color.black.opacity(0.6)
                    .ignoresSafeArea()
            }

            // Main UI overlay
            VStack {
                // Status bar
                HStack {
                    // Connection indicator
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)

                    Text(statusText)
                        .font(.caption)
                        .foregroundColor(.white)

                    Spacer()
                }
                .padding()

                Spacer()

                // Transcript display
                if !lastTranscript.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(lastRole == "user" ? "You:" : "Redi:")
                            .font(.caption)
                            .foregroundColor(.gray)

                        Text(lastTranscript)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.7))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding(.horizontal)
                }

                // Error message
                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.black.opacity(0.8))
                        .cornerRadius(8)
                        .padding(.horizontal)
                }

                // Controls
                VStack(spacing: 20) {
                    // Sensitivity slider (only shown when active)
                    if isSessionActive {
                        VStack(spacing: 8) {
                            Text("Interjection Sensitivity")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))

                            HStack {
                                Text("Quiet")
                                    .font(.caption2)
                                    .foregroundColor(.white.opacity(0.5))

                                Slider(value: $sensitivity, in: 0...1)
                                    .accentColor(.green)

                                Text("Active")
                                    .font(.caption2)
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                        .padding(.horizontal, 40)
                    }

                    // Start/Stop button
                    Button(action: toggleSession) {
                        ZStack {
                            Circle()
                                .fill(isSessionActive ? Color.red : Color.green)
                                .frame(width: 80, height: 80)

                            if isConnecting {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: isSessionActive ? "stop.fill" : "play.fill")
                                    .foregroundColor(.white)
                                    .font(.title)
                            }
                        }
                    }
                    .disabled(isConnecting)

                    Text(isSessionActive ? "Tap to stop" : "Tap to start")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.bottom, 50)
            }
        }
        .onAppear {
            setupCallbacks()
        }
        .onChange(of: sensitivity) { newValue in
            webSocketService.sendSensitivity(newValue)
        }
    }

    private var statusColor: Color {
        switch webSocketService.connectionState {
        case .connected:
            return .green
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
            return "Connected"
        case .connecting:
            return "Connecting..."
        case .disconnected:
            return "Not connected"
        case .error(let msg):
            return "Error: \(msg)"
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
        isConnecting = true
        errorMessage = nil

        // Connect to server
        webSocketService.connect()

        // Start camera and audio
        cameraService.startCapture()
        audioService.startRecording()

        isSessionActive = true
        isConnecting = false
    }

    private func stopSession() {
        cameraService.stopCapture()
        audioService.stopRecording()
        webSocketService.disconnect()

        isSessionActive = false
        lastTranscript = ""
    }

    private func setupCallbacks() {
        // Camera frames → Server
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            webSocketService?.sendFrame(frameData)
        }

        // Audio → Server
        audioService.onAudioCaptured = { [weak webSocketService] audioData in
            webSocketService?.sendAudio(audioData)
        }

        // Server audio → Speaker
        webSocketService.onAudioReceived = { [weak audioService] audioData in
            audioService?.playAudio(audioData)
        }

        // Server transcripts → UI
        webSocketService.onTranscriptReceived = { text, role in
            lastTranscript = text
            lastRole = role

            // Clear transcript after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                if lastTranscript == text {
                    lastTranscript = ""
                }
            }
        }

        // Session ready
        webSocketService.onSessionReady = {
            print("[MainView] Session ready!")
        }

        // Errors
        webSocketService.onError = { error in
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    MainView()
}
