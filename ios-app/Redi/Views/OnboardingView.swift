/**
 * OnboardingView.swift
 *
 * First-time user onboarding explaining what Redi does
 * and requesting camera/microphone permissions.
 */

import SwiftUI
import AVFoundation

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @State private var currentPage = 0
    @State private var cameraPermission: AVAuthorizationStatus = .notDetermined
    @State private var micPermission: AVAuthorizationStatus = .notDetermined

    private let pages = [
        OnboardingPage(
            icon: "sparkles",
            title: "Meet Redi",
            description: "An AI presence that's always with you. No prompting required - just presence.",
            color: .cyan
        ),
        OnboardingPage(
            icon: "eye.fill",
            title: "Redi Sees",
            description: "Point your camera at what you're working on. Redi understands the context.",
            color: .purple
        ),
        OnboardingPage(
            icon: "ear.fill",
            title: "Redi Listens",
            description: "Speak naturally. Redi hears when you're stuck or could use help.",
            color: .blue
        ),
        OnboardingPage(
            icon: "waveform",
            title: "Redi Speaks",
            description: "When Redi has something valuable to add, it speaks up naturally.",
            color: .green
        )
    ]

    var body: some View {
        VStack {
            // Page indicator
            HStack(spacing: 8) {
                ForEach(0..<pages.count, id: \.self) { index in
                    Circle()
                        .fill(index == currentPage ? Color.cyan : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.top, 40)

            // Page content
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    pageView(pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))

            // Bottom section
            VStack(spacing: 20) {
                if currentPage == pages.count - 1 {
                    // Permissions section
                    permissionsSection
                } else {
                    // Next button
                    Button(action: {
                        withAnimation {
                            currentPage += 1
                        }
                    }) {
                        Text("Next")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.cyan)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                }
            }
            .padding(.horizontal, 30)
            .padding(.bottom, 50)
        }
        .background(Color.black.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .onAppear {
            checkPermissions()
        }
    }

    private func pageView(_ page: OnboardingPage) -> some View {
        VStack(spacing: 30) {
            Spacer()

            Image(systemName: page.icon)
                .font(.system(size: 80))
                .foregroundColor(page.color)

            Text(page.title)
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text(page.description)
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.gray)
                .padding(.horizontal, 40)

            Spacer()
        }
    }

    private var permissionsSection: some View {
        VStack(spacing: 16) {
            // Camera permission
            PermissionRow(
                icon: "camera.fill",
                title: "Camera Access",
                status: cameraPermission,
                action: requestCameraPermission
            )

            // Microphone permission
            PermissionRow(
                icon: "mic.fill",
                title: "Microphone Access",
                status: micPermission,
                action: requestMicPermission
            )

            // Get Started button (only if permissions granted)
            if cameraPermission == .authorized && micPermission == .authorized {
                Button(action: {
                    appState.hasCompletedOnboarding = true
                }) {
                    Text("Get Started")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [.cyan, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
            }
        }
    }

    private func checkPermissions() {
        cameraPermission = AVCaptureDevice.authorizationStatus(for: .video)
        micPermission = AVCaptureDevice.authorizationStatus(for: .audio)
    }

    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                cameraPermission = granted ? .authorized : .denied
            }
        }
    }

    private func requestMicPermission() {
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            DispatchQueue.main.async {
                micPermission = granted ? .authorized : .denied
            }
        }
    }
}

// MARK: - Supporting Types

struct OnboardingPage {
    let icon: String
    let title: String
    let description: String
    let color: Color
}

struct PermissionRow: View {
    let icon: String
    let title: String
    let status: AVAuthorizationStatus
    let action: () -> Void

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .frame(width: 40)
                .foregroundColor(.cyan)

            Text(title)
                .font(.body)
                .foregroundColor(.white)

            Spacer()

            if status == .authorized {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else if status == .denied {
                Button("Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .font(.caption)
                .foregroundColor(.orange)
            } else {
                Button("Allow") {
                    action()
                }
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.cyan)
                .foregroundColor(.white)
                .cornerRadius(6)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }
}

// MARK: - Preview

struct OnboardingView_Previews: PreviewProvider {
    static var previews: some View {
        OnboardingView()
            .environmentObject(AppState())
    }
}
