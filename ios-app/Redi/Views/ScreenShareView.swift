/**
 * ScreenShareView.swift
 *
 * REDI SCREEN SHARE VIEW
 * 
 * UI for initiating desktop screen sharing:
 * - Display pairing code
 * - Show connection status
 * - Preview shared screen
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct ScreenShareView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var service = ScreenShareService.shared
    
    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                // Status icon
                statusIcon
                
                // Main content based on state
                switch service.connectionState {
                case .disconnected:
                    disconnectedView
                case .connecting:
                    connectingView
                case .waitingForPeer:
                    waitingView
                case .connected:
                    connectedView
                case .error(let message):
                    errorView(message: message)
                }
                
                Spacer()
            }
            .padding(32)
            .navigationTitle("Screen Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        service.disconnect()
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - Status Icon
    
    private var statusIcon: some View {
        ZStack {
            Circle()
                .fill(statusColor.opacity(0.1))
                .frame(width: 120, height: 120)
            
            Image(systemName: statusIconName)
                .font(.system(size: 48))
                .foregroundColor(statusColor)
        }
    }
    
    private var statusColor: Color {
        switch service.connectionState {
        case .disconnected: return .gray
        case .connecting, .waitingForPeer: return .orange
        case .connected: return .green
        case .error: return .red
        }
    }
    
    private var statusIconName: String {
        switch service.connectionState {
        case .disconnected: return "display"
        case .connecting: return "wifi"
        case .waitingForPeer: return "qrcode"
        case .connected: return "checkmark.circle.fill"
        case .error: return "exclamationmark.triangle.fill"
        }
    }
    
    // MARK: - Disconnected View
    
    private var disconnectedView: some View {
        VStack(spacing: 24) {
            Text("Share Your Computer Screen")
                .font(.title2)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
            
            Text("Let Redi see your screen to help with tasks, troubleshooting, or learning.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: { service.connect() }) {
                Text("Get Pairing Code")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.cyan)
                    .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Connecting View
    
    private var connectingView: some View {
        VStack(spacing: 24) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Connecting to server...")
                .font(.headline)
        }
    }
    
    // MARK: - Waiting View
    
    private var waitingView: some View {
        VStack(spacing: 24) {
            Text("Enter this code on your computer")
                .font(.headline)
            
            // Pairing code display
            HStack(spacing: 8) {
                ForEach(Array(service.pairingCode ?? "------"), id: \.self) { char in
                    Text(String(char))
                        .font(.system(size: 36, weight: .bold, design: .monospaced))
                        .frame(width: 44, height: 56)
                        .background(Color(.systemGray5))
                        .cornerRadius(8)
                }
            }
            
            VStack(spacing: 8) {
                Text("Go to:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text("redialways.com/screen")
                    .font(.headline)
                    .foregroundColor(.cyan)
            }
            
            Text("Code expires in 10 minutes")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Connected View
    
    private var connectedView: some View {
        VStack(spacing: 24) {
            Text("Screen Connected!")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Redi can now see your computer screen.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            // Screen preview placeholder
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray5))
                .aspectRatio(16/9, contentMode: .fit)
                .overlay(
                    VStack {
                        Image(systemName: "display")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                        Text("Screen Preview")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                )
            
            Button(role: .destructive, action: { service.disconnect() }) {
                Text("Stop Sharing")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .foregroundColor(.red)
                    .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Error View
    
    private func errorView(message: String) -> some View {
        VStack(spacing: 24) {
            Text("Connection Error")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: { service.connect() }) {
                Text("Try Again")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.cyan)
                    .cornerRadius(12)
            }
        }
    }
}

#Preview {
    ScreenShareView()
}
