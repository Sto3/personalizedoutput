/**
 * V3MainView.swift
 *
 * REDI FOR ANYTHING - Production UI
 * Camera preview now works with WebRTC
 *
 * Updated: Jan 26, 2026
 */

import SwiftUI
import AVFoundation

struct V3MainView: View {
    @StateObject private var webrtcService = RediWebRTCService()
    @State private var isActive = false
    @State private var sensitivity: Double = 5
    @State private var statusText = "Ready"
    @State private var transcriptLines: [(String, String)] = []  // (text, role)
    @State private var latency: Int = 0
    
    var body: some View {
        ZStack {
            // Camera Preview
            CameraPreviewView(session: webrtcService.captureSession)
                .ignoresSafeArea()
            
            // Dark overlay when inactive
            if !isActive {
                Color.black.opacity(0.7)
                    .ignoresSafeArea()
            }
            
            // UI Overlay
            VStack {
                // Top bar
                HStack {
                    // Status indicator
                    HStack(spacing: 8) {
                        Circle()
                            .fill(isActive ? Color.green : Color.gray)
                            .frame(width: 10, height: 10)
                        Text(statusText)
                            .font(.caption)
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(20)
                    
                    Spacer()
                    
                    // Latency (when active)
                    if isActive && latency > 0 {
                        Text("\(latency)ms")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.black.opacity(0.3))
                            .cornerRadius(10)
                    }
                }
                .padding(.horizontal)
                .padding(.top, 60)
                
                Spacer()
                
                // Transcript area (last 3 lines)
                if !transcriptLines.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(transcriptLines.suffix(3), id: \.0) { line in
                            HStack {
                                if line.1 == "assistant" {
                                    Image(systemName: "sparkles")
                                        .foregroundColor(.cyan)
                                        .font(.caption)
                                }
                                Text(line.0)
                                    .font(.subheadline)
                                    .foregroundColor(line.1 == "assistant" ? .white : .white.opacity(0.7))
                                    .lineLimit(2)
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                // Sensitivity slider (when inactive)
                if !isActive {
                    VStack(spacing: 8) {
                        Text("Sensitivity")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                        
                        HStack {
                            Text("\u{1F910}")
                            Slider(value: $sensitivity, in: 1...10, step: 1)
                                .accentColor(.cyan)
                                .onChange(of: sensitivity) { newValue in
                                    webrtcService.setSensitivity(Int(newValue))
                                }
                            Text("\u{1F4AC}")
                        }
                        .padding(.horizontal, 40)
                        
                        Text(sensitivityLabel)
                            .font(.caption2)
                            .foregroundColor(.cyan)
                    }
                    .padding()
                    .background(Color.black.opacity(0.4))
                    .cornerRadius(16)
                    .padding(.horizontal, 40)
                }
                
                // Main button
                Button(action: toggleSession) {
                    ZStack {
                        Circle()
                            .fill(isActive ? Color.red : Color.cyan)
                            .frame(width: 80, height: 80)
                        
                        if webrtcService.isConnecting {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: isActive ? "stop.fill" : "play.fill")
                                .font(.system(size: 30))
                                .foregroundColor(.white)
                        }
                    }
                }
                .disabled(webrtcService.isConnecting)
                .padding(.bottom, 20)
                
                // Branding
                Text("Redi for Anything")
                    .font(.headline)
                    .foregroundColor(.white)
                
                Text("Sensitivity: \(Int(sensitivity))/10")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
                    .padding(.bottom, 40)
            }
        }
        .onAppear {
            setupCallbacks()
        }
    }
    
    private var sensitivityLabel: String {
        switch Int(sensitivity) {
        case 1...2: return "Minimal - Only critical issues"
        case 3...4: return "Reserved - Significant observations"
        case 5...6: return "Balanced - Helpful engagement"
        case 7...8: return "Engaged - Active feedback"
        case 9...10: return "Maximum - Constant companion"
        default: return "Balanced"
        }
    }
    
    private func toggleSession() {
        if isActive {
            webrtcService.disconnect()
            isActive = false
            statusText = "Ready"
            transcriptLines = []
        } else {
            Task {
                do {
                    try await webrtcService.connect()
                    isActive = true
                    statusText = "Listening..."
                } catch {
                    statusText = "Connection failed"
                }
            }
        }
    }
    
    private func setupCallbacks() {
        webrtcService.onTranscriptReceived = { text, role in
            transcriptLines.append((text, role))
            // Keep only last 10
            if transcriptLines.count > 10 {
                transcriptLines.removeFirst()
            }
        }
        
        webrtcService.onLatencyMeasured = { ms in
            latency = ms
        }
        
        webrtcService.onPlaybackStarted = {
            statusText = "Speaking..."
        }
        
        webrtcService.onPlaybackEnded = {
            statusText = "Listening..."
        }
    }
}

// MARK: - Camera Preview View

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession?
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        // Remove old preview layers
        uiView.layer.sublayers?.filter { $0 is AVCaptureVideoPreviewLayer }.forEach { $0.removeFromSuperlayer() }
        
        guard let session = session else { return }
        
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        previewLayer.frame = uiView.bounds
        
        // Auto-resize with view
        previewLayer.frame = UIScreen.main.bounds
        
        uiView.layer.insertSublayer(previewLayer, at: 0)
    }
}

#Preview {
    V3MainView()
}
