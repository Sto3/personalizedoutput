/**
 * RediWatchApp.swift
 *
 * Apple Watch companion app for Redi.
 * Voice-only sessions, credit balance, and quick-start.
 *
 * NOTE: This requires a new watchOS App target in Xcode.
 * Perse must add target: File > New > Target > watchOS App.
 */

import SwiftUI

@main
struct RediWatchApp: App {
    var body: some Scene {
        WindowGroup {
            WatchHomeView()
        }
    }
}

// MARK: - Home View

struct WatchHomeView: View {
    @State private var creditBalance: Int = 0
    @State private var lastSuggestion: String = "Tap to talk to Redi"
    @State private var isSessionActive = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Logo
                Text("REDI")
                    .font(.system(size: 20, weight: .bold, design: .serif))
                    .foregroundColor(.cyan)

                // Quick start button
                Button(action: { isSessionActive.toggle() }) {
                    VStack(spacing: 6) {
                        Image(systemName: isSessionActive ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(isSessionActive ? .red : .cyan)

                        Text(isSessionActive ? "End Session" : "Start Session")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.1))
                    )
                }
                .buttonStyle(.plain)

                // Credit balance
                HStack {
                    Text("Credits")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                    Spacer()
                    Text("\(creditBalance)")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.cyan)
                }
                .padding(.horizontal, 8)

                // Last suggestion
                Text(lastSuggestion)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
            }
            .padding()
        }
    }
}
