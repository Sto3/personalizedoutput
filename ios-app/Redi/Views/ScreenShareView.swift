/**
 * ScreenShareView.swift
 *
 * REDI SCREEN SHARE VIEW
 * 
 * UI for desktop screen sharing:
 * - Display pairing code
 * - Connection status
 * - Screen preview
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct ScreenShareView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var screenShareService = ScreenShareService.shared
    
    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "display")
                        .font(.system(size: 48))
                        .foregroundColor(.cyan)
                    
                    Text("Share Computer Screen")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("Let Redi see your computer screen")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 32)
                
                // Status-based content
                switch screenShareService.connectionState {
                case .disconnected:
                    disconnectedView
                    
                case .connecting:
                    connectingView
                    
                case .waitingForComputer:
                    waitingForComputerView
                    
                case .connected:
                    connectedView
                    
                case .error(let message):
                    errorView(message: message)
                }
                
                Spacer()
                
                // Instructions
                instructionsView
            }
            .padding()
            .navigationTitle("Screen Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        screenShareService.disconnect()
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - State Views
    
    private var disconnectedView: some View {
        VStack(spacing: 16) {
            Button(action: {
                screenShareService.connect()
            }) {
                Text("Get Pairing Code")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.cyan)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
    }
    
    private var connectingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Connecting...")
                .foregroundColor(.secondary)
        }
    }
    
    private var waitingForComputerView: some View {
        VStack(spacing: 24) {
            // Pairing code display
            VStack(spacing: 8) {
                Text("Your Pairing Code")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text(screenShareService.pairingCode)
                    .font(.system(size: 48, weight: .bold, design: .monospaced))
                    .tracking(8)
                    .foregroundColor(.cyan)
            }
            .padding(24)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(16)
            
            Text("Enter this code on your computer at:")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text("redialways.com/screen")
                .font(.headline)
                .foregroundColor(.cyan)
            
            // Timer
            Text("Code expires in 10 minutes")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    private var connectedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.green)
            
            Text("Connected!")
                .font(.headline)
            
            Text("Redi can now see your computer screen")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Button(action: {
                screenShareService.disconnect()
            }) {
                Text("Disconnect")
                    .foregroundColor(.red)
            }
            .padding(.top, 16)
        }
    }
    
    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.orange)
            
            Text("Connection Error")
                .font(.headline)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: {
                screenShareService.connect()
            }) {
                Text("Try Again")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 12)
                    .background(Color.cyan)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
    }
    
    private var instructionsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("How it works")
                .font(.headline)
            
            InstructionRow(number: 1, text: "Get a pairing code above")
            InstructionRow(number: 2, text: "Go to redialways.com/screen on your computer")
            InstructionRow(number: 3, text: "Enter the 6-digit code")
            InstructionRow(number: 4, text: "Select which screen to share")
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

struct InstructionRow: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.cyan)
                .clipShape(Circle())
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    ScreenShareView()
}
