/**
 * ScreenShareView.swift
 *
 * REDI SCREEN SHARING - iOS UI
 * 
 * Shows pairing code and connection status.
 * Displays received screen frames.
 *
 * Created: Jan 26, 2026
 */

import SwiftUI

struct ScreenShareView: View {
    @StateObject private var screenService = ScreenShareService()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                switch screenService.connectionState {
                case .disconnected:
                    startView
                    
                case .waitingForCode:
                    loadingView("Getting pairing code...")
                    
                case .waitingForComputer:
                    codeView
                    
                case .connecting:
                    loadingView("Connecting to computer...")
                    
                case .connected:
                    connectedView
                    
                case .error:
                    errorView
                }
            }
            .navigationTitle("Screen Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        screenService.stop()
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - Start View
    
    private var startView: some View {
        VStack(spacing: 32) {
            Image(systemName: "display")
                .font(.system(size: 80))
                .foregroundColor(.cyan)
            
            Text("Share Your Computer Screen")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.white)
            
            Text("Let Redi see what's on your computer to help with desktop tasks.")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Button(action: { screenService.startPairing() }) {
                Text("Start Pairing")
                    .font(.headline)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(colors: [.cyan, .green], startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(12)
            }
            .padding(.horizontal, 40)
        }
    }
    
    // MARK: - Code View
    
    private var codeView: some View {
        VStack(spacing: 32) {
            Text("Enter this code on your computer")
                .font(.headline)
                .foregroundColor(.white)
            
            if let code = screenService.pairingCode {
                HStack(spacing: 12) {
                    ForEach(Array(code), id: \.self) { digit in
                        Text(String(digit))
                            .font(.system(size: 40, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .frame(width: 48, height: 56)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }
            
            VStack(spacing: 8) {
                Text("On your computer, go to:")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                
                Text("redialways.com/screen")
                    .font(.headline)
                    .foregroundColor(.cyan)
            }
            
            Text("Code expires in 10 minutes")
                .font(.caption)
                .foregroundColor(.gray)
            
            Button(action: { screenService.stop() }) {
                Text("Cancel")
                    .foregroundColor(.red)
            }
            .padding(.top, 20)
        }
    }
    
    // MARK: - Connected View
    
    private var connectedView: some View {
        VStack {
            // Status bar
            HStack {
                Circle()
                    .fill(Color.green)
                    .frame(width: 8, height: 8)
                Text("Connected")
                    .font(.caption)
                    .foregroundColor(.green)
                Spacer()
            }
            .padding()
            
            // Screen preview
            if let frame = screenService.latestFrame {
                Image(uiImage: frame)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .cornerRadius(8)
                    .padding()
            } else {
                VStack {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Receiving screen...")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .padding(.top)
                }
                .frame(maxHeight: .infinity)
            }
            
            Spacer()
            
            // Stop button
            Button(action: { screenService.stop() }) {
                Text("Disconnect")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .cornerRadius(12)
            }
            .padding()
        }
    }
    
    // MARK: - Loading View
    
    private func loadingView(_ text: String) -> some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.cyan)
            
            Text(text)
                .foregroundColor(.gray)
        }
    }
    
    // MARK: - Error View
    
    private var errorView: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 60))
                .foregroundColor(.red)
            
            Text("Connection Failed")
                .font(.headline)
                .foregroundColor(.white)
            
            if let error = screenService.error {
                Text(error)
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: { screenService.startPairing() }) {
                Text("Try Again")
                    .font(.headline)
                    .foregroundColor(.black)
                    .padding(.horizontal, 40)
                    .padding(.vertical, 12)
                    .background(Color.cyan)
                    .cornerRadius(8)
            }
            .padding(.top)
        }
    }
}

#Preview {
    ScreenShareView()
}
