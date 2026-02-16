/**
 * OnboardingView.swift
 *
 * First-launch onboarding flow for Redi
 * Requests permissions: Microphone, Camera, Notifications, Siri, Health (optional)
 * Shows AI disclaimer before completing
 */

import SwiftUI
import AVFoundation
import UserNotifications

struct OnboardingView: View {
    @Binding var isComplete: Bool
    @State private var currentPage = 0

    private let cyanGlow = Color(hex: "00D4FF")
    private let magentaGlow = Color(hex: "FF00AA")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress dots
                HStack(spacing: 8) {
                    ForEach(0..<6) { index in
                        Circle()
                            .fill(index <= currentPage ? cyanGlow : Color.white.opacity(0.2))
                            .frame(width: 8, height: 8)
                    }
                }
                .padding(.top, 60)
                .padding(.bottom, 40)

                // Page content
                TabView(selection: $currentPage) {
                    welcomePage.tag(0)
                    microphonePage.tag(1)
                    cameraPage.tag(2)
                    notificationPage.tag(3)
                    alwaysOnPage.tag(4)
                    disclaimerPage.tag(5)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Welcome Page

    private var welcomePage: some View {
        VStack(spacing: 24) {
            Spacer()

            // Logo
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [cyanGlow.opacity(0.2), magentaGlow.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 120, height: 120)

                Text("R")
                    .font(.custom("Bodoni 72", size: 56))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [cyanGlow, magentaGlow],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }

            Text("Welcome to Redi")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text("Your AI assistant that sees, hears,\nand helps with anything.")
                .font(.system(size: 17))
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Spacer()

            continueButton {
                withAnimation { currentPage = 1 }
            }
            .padding(.bottom, 60)
        }
        .padding(.horizontal, 40)
    }

    // MARK: - Microphone Permission

    private var microphonePage: some View {
        permissionPage(
            icon: "mic.fill",
            iconColor: .cyan,
            title: "Microphone Access",
            description: "Redi needs to hear you to have a conversation. Audio is processed in real-time and never stored.",
            action: {
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    DispatchQueue.main.async {
                        withAnimation { currentPage = 2 }
                    }
                }
            }
        )
    }

    // MARK: - Camera Permission

    private var cameraPage: some View {
        permissionPage(
            icon: "camera.fill",
            iconColor: .green,
            title: "Camera Access",
            description: "Redi can see what you see to help with visual tasks. Camera frames are analyzed and immediately discarded.",
            action: {
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        withAnimation { currentPage = 3 }
                    }
                }
            }
        )
    }

    // MARK: - Notification Permission

    private var notificationPage: some View {
        permissionPage(
            icon: "bell.fill",
            iconColor: .orange,
            title: "Notifications",
            description: "Get reminders, medication alerts, and proactive suggestions from Redi even when the app is closed.",
            action: {
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
                    DispatchQueue.main.async {
                        withAnimation { currentPage = 4 }  // Go to Always On page
                    }
                }
            }
        )
    }

    // MARK: - Always On Introduction Page

    private var alwaysOnPage: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "wave.3.right.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.cyan)

            Text("Always On Mode")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text("Redi can run in the background while you go about your day \u{2014} listening, watching your screen, and speaking up only when it has something genuinely useful to offer.")
                .font(.system(size: 17))
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal)

            Text("It's like having a brilliant friend in the room who knows when to chime in. And it costs less than a coffee for a full day.")
                .font(.system(size: 17))
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal)

            Text("You can try it anytime from the session menu.")
                .font(.caption)
                .foregroundColor(.white.opacity(0.4))

            Spacer()

            continueButton {
                withAnimation { currentPage = 5 }
            }
            .padding(.bottom, 60)
        }
        .padding(.horizontal, 40)
    }

    // MARK: - AI Disclaimer Page

    private var disclaimerPage: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "shield.checkered")
                .font(.system(size: 48))
                .foregroundColor(.yellow)

            Text("Before You Begin")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            VStack(alignment: .leading, spacing: 16) {
                disclaimerItem(icon: "brain.head.profile", text: "Redi is an AI assistant. It can make mistakes.")
                disclaimerItem(icon: "pills.fill", text: "Never rely solely on Redi for medical decisions.")
                disclaimerItem(icon: "lock.shield.fill", text: "Conversations are processed by AI services and not stored permanently on our servers.")
                disclaimerItem(icon: "hand.raised.fill", text: "You control what Redi can access in Settings at any time.")
            }
            .padding(.horizontal, 20)

            Spacer()

            Button(action: {
                UserDefaults.standard.set(true, forKey: "onboarding_complete")
                withAnimation { isComplete = true }
            }) {
                Text("I Understand — Let's Go")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        LinearGradient(
                            colors: [cyanGlow, magentaGlow],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(16)
            }
            .padding(.bottom, 60)
        }
        .padding(.horizontal, 40)
    }

    // MARK: - Helpers

    private func permissionPage(icon: String, iconColor: Color, title: String, description: String, action: @escaping () -> Void) -> some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(iconColor.opacity(0.15))
                    .frame(width: 100, height: 100)

                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundColor(iconColor)
            }

            Text(title)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text(description)
                .font(.system(size: 17))
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Spacer()

            continueButton(action: action)

            Button("Skip") {
                withAnimation { currentPage += 1 }
            }
            .font(.system(size: 15))
            .foregroundColor(.white.opacity(0.5))
            .padding(.bottom, 60)
        }
        .padding(.horizontal, 40)
    }

    private func continueButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text("Continue")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    LinearGradient(
                        colors: [cyanGlow, magentaGlow],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(16)
        }
    }

    private func disclaimerItem(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.yellow.opacity(0.8))
                .frame(width: 24)

            Text(text)
                .font(.system(size: 15))
                .foregroundColor(.white.opacity(0.8))
                .lineSpacing(2)
        }
    }
}

struct OnboardingView_Previews: PreviewProvider {
    static var previews: some View {
        OnboardingView(isComplete: .constant(false))
    }
}
