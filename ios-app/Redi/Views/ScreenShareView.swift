/**
 * ScreenShareView.swift
 *
 * REDI SCREEN SHARE VIEW - SECURE VERSION
 * 
 * Security UI Features:
 * - Shows device info before approval
 * - Approve/Reject buttons for incoming connections
 * - Countdown timer for code expiration
 * - Clear status indicators
 *
 * Created: Jan 29, 2026
 * Updated: Feb 1, 2026 - Security hardening
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
                case .pendingApproval:
                    approvalView
                case .connected:
                    connectedView
                case .error(let message):
                    errorView(message: message)
                }
                
                Spacer()
            }
            .padding(32)
            .background(Color(.systemBackground))
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
        case .pendingApproval: return .yellow
        case .connected: return .green
        case .error: return .red
        }
    }
    
    private var statusIconName: String {
        switch service.connectionState {
        case .disconnected: return "display"
        case .connecting: return "wifi"
        case .waitingForPeer: return "qrcode"
        case .pendingApproval: return "person.fill.questionmark"
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
            
            // Security info
            VStack(alignment: .leading, spacing: 8) {
                securityFeature(icon: "lock.shield", text: "Encrypted connection")
                securityFeature(icon: "checkmark.circle", text: "You approve each connection")
                securityFeature(icon: "clock", text: "Codes expire in 5 minutes")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
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
    
    private func securityFeature(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.green)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Connecting View
    
    private var connectingView: some View {
        VStack(spacing: 24) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Connecting to secure server...")
                .font(.headline)
        }
    }
    
    // MARK: - Waiting View
    
    private var waitingView: some View {
        VStack(spacing: 24) {
            Text("Enter this code on your computer")
                .font(.headline)
            
            // Pairing code display (8 characters now)
            HStack(spacing: 6) {
                ForEach(Array(service.pairingCode ?? "--------").prefix(8), id: \.self) { char in
                    Text(String(char))
                        .font(.system(size: 28, weight: .bold, design: .monospaced))
                        .frame(width: 36, height: 48)
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
            
            // Countdown timer
            HStack {
                Image(systemName: "clock")
                    .foregroundColor(service.codeExpiresIn < 60 ? .red : .orange)
                Text("Expires in \(formatTime(service.codeExpiresIn))")
                    .font(.subheadline)
                    .foregroundColor(service.codeExpiresIn < 60 ? .red : .secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            .cornerRadius(20)
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }
    
    // MARK: - Approval View (NEW - Security Feature)
    
    private var approvalView: some View {
        VStack(spacing: 24) {
            Text("Connection Request")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("A computer wants to share its screen")
                .font(.body)
                .foregroundColor(.secondary)
            
            // Device info card
            if let info = service.pendingComputerInfo {
                VStack(alignment: .leading, spacing: 12) {
                    deviceInfoRow(icon: "desktopcomputer", label: "Browser", value: info.browser)
                    deviceInfoRow(icon: "laptopcomputer", label: "System", value: info.os)
                    deviceInfoRow(icon: "network", label: "IP Address", value: info.ip)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            
            // Warning
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Only approve if you recognize this device")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Approve/Reject buttons
            HStack(spacing: 16) {
                Button(action: { service.rejectConnection() }) {
                    Text("Reject")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .foregroundColor(.red)
                        .cornerRadius(12)
                }
                
                Button(action: { service.approveConnection() }) {
                    Text("Approve")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
            }
        }
    }
    
    private func deviceInfoRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.cyan)
                .frame(width: 24)
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
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
            
            // Privacy reminder
            HStack {
                Image(systemName: "eye.fill")
                    .foregroundColor(.cyan)
                Text("Screen frames are sent to OpenAI for AI analysis")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)
            
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
