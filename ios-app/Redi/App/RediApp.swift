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
    
    // Version toggles for admin testing
    @Published var useV8: Bool = false  // V8: Two-Brain - Together AI (fast) + GPT-4o (deep)
    @Published var useV7: Bool = false  // V7: Production - state machine, barge-in handling
    @Published var useV6: Bool = false  // V6: Stable fallback
    @Published var useV5: Bool = false  // V5: Routes to V6/V7 based on config
    @Published var useV3: Bool = false  // V3: Legacy backup

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
    
    /// Clear all version flags - call before setting a specific version
    func clearAllVersionFlags() {
        useV8 = false
        useV7 = false
        useV6 = false
        useV5 = false
        useV3 = false
    }
    
    /// Start a specific version (clears others first)
    func startVersion(_ version: RediServerVersion) {
        clearAllVersionFlags()
        switch version {
        case .v7:
            useV7 = true
        case .v8:
            useV8 = true
        }
        print("[AppState] Starting \(version.displayName)")
    }
    
    /// Start V3 legacy mode
    func startV3() {
        clearAllVersionFlags()
        useV3 = true
        print("[AppState] Starting V3 Legacy")
    }
    
    /// Start V6 stable mode
    func startV6() {
        clearAllVersionFlags()
        useV6 = true
        print("[AppState] Starting V6 Stable")
    }
}

/// Root content view with navigation
struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.useV8 {
                // V8: Two-Brain - Together AI for speed, GPT-4o for depth
                // Uses RediConfig which connects to ?v=8 endpoint
                V3MainView()
            } else if appState.useV7 {
                // V7: Production - state machine, barge-in, fresh frame requests
                // Uses V5 services which connect to ?v=7 endpoint
                V3MainView()
            } else if appState.useV6 {
                // V6: Stable fallback - correct OpenAI format
                // Need to temporarily change config to use v=6
                V3MainView()
            } else if appState.useV5 {
                // V5: Default path - routes based on V5Config (currently ?v=7)
                V3MainView()
            } else if appState.useV3 {
                // V3: Legacy backup only
                V3MainView()
            } else if !appState.hasCompletedOnboarding {
                OnboardingView()
            } else if let session = appState.currentSession {
                // Route driving mode to dedicated DrivingView (90% on-device)
                if session.mode == .driving {
                    DrivingView()
                } else {
                    SessionView(session: session)
                }
            } else {
                HomeView()
            }
        }
    }
}
