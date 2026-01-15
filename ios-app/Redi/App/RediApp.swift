/**
 * RediApp.swift
 *
 * Main entry point for the Redi iOS application.
 */

import SwiftUI

@main
struct RediApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

/// Global application state
class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentSession: RediSession?
    @Published var hasCompletedOnboarding: Bool {
        didSet {
            UserDefaults.standard.set(hasCompletedOnboarding, forKey: "hasCompletedOnboarding")
        }
    }
    @Published var useV3: Bool = false  // Toggle for V3 (OpenAI Realtime)

    private var sessionObserver: NSObjectProtocol?

    init() {
        self.hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")

        // Listen for session started notifications
        sessionObserver = NotificationCenter.default.addObserver(
            forName: .rediSessionStarted,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let session = notification.object as? RediSession {
                self?.currentSession = session
            }
        }
    }

    deinit {
        if let observer = sessionObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}

/// Root content view with navigation
struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.useV3 {
                // V3: OpenAI Realtime API - Clean rebuild
                V3MainView()
            } else if !appState.hasCompletedOnboarding {
                OnboardingView()
            } else if let session = appState.currentSession {
                SessionView(session: session)
            } else {
                HomeView()
            }
        }
    }
}
