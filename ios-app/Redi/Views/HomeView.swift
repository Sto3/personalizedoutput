/**
 * HomeView.swift
 *
 * Main landing screen for Redi. Users configure their session and purchase.
 */

import SwiftUI
import UIKit

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = HomeViewModel()
    @State private var showingJoinSheet = false
    @State private var joinCode = ""
    @State private var joinError: String?
    @State private var isJoining = false
    @State private var purchaseType: PurchaseType = .oneTime
    @State private var selectedTier: SubscriptionTier = .regular
    @State private var showingSubscriptionSheet = false

    // Admin bypass: tap logo 5 times quickly
    @State private var logoTapCount = 0
    @State private var lastTapTime = Date()
    @State private var showingAdminBypass = false
    @State private var showingHistory = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection

                    // Subscription status (if subscribed)
                    if let subscription = viewModel.userSubscription, subscription.hasSubscription {
                        subscriptionStatusCard(subscription)
                    }

                    // Mode Selection
                    modeSelectionSection

                    // Voice Selection
                    voiceSelectionSection

                    // Sensitivity Slider
                    sensitivitySection

                    // Purchase Type Selector
                    purchaseTypeSelector

                    // Pricing based on purchase type
                    if purchaseType == .oneTime {
                        durationSection
                        startButton
                    } else {
                        subscriptionTiersSection
                        subscribeButton
                    }

                    // Join Session Button
                    joinSessionButton

                    Spacer(minLength: 50)
                }
                .padding()
            }
            .background(Color.black.ignoresSafeArea())
            .navigationBarHidden(true)
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showingJoinSheet) {
            joinSessionSheet
        }
        .alert("Admin Test Mode", isPresented: $showingAdminBypass) {
            Button("Start Free Session") {
                startFreeSession()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Start a free test session without payment? This bypasses Stripe checkout for testing.")
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "Unknown error")
        }
        .task {
            await viewModel.loadSubscriptionStatus()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            HStack {
                Spacer()

                Text("Redi")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.cyan, Color.purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .onTapGesture {
                        handleLogoTap()
                    }

                Spacer()

                // History button
                Button(action: {
                    showingHistory = true
                }) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.title2)
                        .foregroundColor(.gray)
                }
                .padding(.trailing, 8)
            }

            Text("PRESENT. ACTIVE. ALWAYS READY.")
                .font(.caption)
                .tracking(2)
                .foregroundColor(.gray)
        }
        .padding(.top, 40)
        .sheet(isPresented: $showingHistory) {
            HistoryView()
        }
    }

    // MARK: - Admin Bypass Logic

    private func handleLogoTap() {
        let now = Date()
        let timeSinceLastTap = now.timeIntervalSince(lastTapTime)

        // Reset if more than 1 second since last tap
        if timeSinceLastTap > 1.0 {
            logoTapCount = 1
        } else {
            logoTapCount += 1
        }

        lastTapTime = now

        // Unlock admin bypass after 5 rapid taps
        if logoTapCount >= 5 {
            logoTapCount = 0
            #if DEBUG
            showingAdminBypass = true
            #else
            // In release, only allow for specific device (your test device)
            let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? ""
            // Add your device ID here for production testing
            let allowedDevices = ["YOUR_DEVICE_ID_HERE"]
            if allowedDevices.contains(deviceId) {
                showingAdminBypass = true
            }
            #endif
        }
    }

    private func startFreeSession() {
        // Create a free test session directly
        let testSession = RediSession(
            id: "test-\(UUID().uuidString.prefix(8))",
            mode: viewModel.config.mode,
            sensitivity: viewModel.config.sensitivity,
            voiceGender: viewModel.config.voiceGender,
            durationMinutes: viewModel.config.durationMinutes,
            expiresAt: Date().addingTimeInterval(Double(viewModel.config.durationMinutes * 60)),
            status: .active,
            websocketUrl: "/ws/redi?sessionId=test",
            joinCode: generateJoinCode(),
            isHost: true,
            participantCount: 1,
            maxParticipants: 5,
            audioOutputMode: .hostOnly
        )
        appState.currentSession = testSession
    }

    private func generateJoinCode() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<6).map { _ in chars.randomElement()! })
    }

    // MARK: - Mode Selection

    private var modeSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What are you doing?")
                .font(.headline)
                .foregroundColor(.white)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(RediMode.allCases, id: \.self) { mode in
                    ModeCard(
                        mode: mode,
                        isSelected: viewModel.config.mode == mode
                    ) {
                        viewModel.config.mode = mode
                    }
                }
            }
        }
    }

    // MARK: - Voice Selection

    private var voiceSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Voice")
                .font(.headline)
                .foregroundColor(.white)

            HStack(spacing: 12) {
                ForEach(VoiceGender.allCases, id: \.self) { gender in
                    VoiceCard(
                        gender: gender,
                        isSelected: viewModel.config.voiceGender == gender
                    ) {
                        viewModel.config.voiceGender = gender
                    }
                }
            }
        }
    }

    // MARK: - Sensitivity Slider

    private var sensitivitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("How active should Redi be?")
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                Text(sensitivityLabel)
                    .font(.caption)
                    .foregroundColor(.cyan)
            }

            HStack {
                Image(systemName: "speaker.slash.fill")
                    .foregroundColor(.gray)

                Slider(value: $viewModel.config.sensitivity, in: 0...1)
                    .accentColor(.cyan)

                Image(systemName: "speaker.wave.3.fill")
                    .foregroundColor(.cyan)
            }

            Text(sensitivityDescription)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }

    private var sensitivityLabel: String {
        if viewModel.config.sensitivity < 0.33 {
            return "Passive"
        } else if viewModel.config.sensitivity < 0.67 {
            return "Balanced"
        } else {
            return "Active"
        }
    }

    private var sensitivityDescription: String {
        if viewModel.config.sensitivity < 0.33 {
            return "Redi only speaks when asked or spots a clear error"
        } else if viewModel.config.sensitivity < 0.67 {
            return "Redi speaks during natural pauses when helpful"
        } else {
            return "Redi is proactive with suggestions and observations"
        }
    }

    // MARK: - Subscription Status Card

    private func subscriptionStatusCard(_ subscription: UserSubscription) -> some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text(subscription.tierName ?? "Subscriber")
                            .font(.headline)
                            .foregroundColor(.white)
                    }

                    if subscription.isUnlimited {
                        Text("Unlimited sessions")
                            .font(.caption)
                            .foregroundColor(.cyan)
                    } else {
                        Text("\(subscription.sessionsRemaining) sessions remaining")
                            .font(.caption)
                            .foregroundColor(subscription.sessionsRemaining <= 1 ? .orange : .cyan)
                    }
                }

                Spacer()

                if subscription.canStartSession {
                    Button {
                        Task {
                            await viewModel.startSubscriptionSession()
                        }
                    } label: {
                        Text("Quick Start")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.cyan)
                            .foregroundColor(.black)
                            .cornerRadius(20)
                    }
                }
            }

            // Low sessions warning
            if !subscription.isUnlimited && subscription.sessionsRemaining <= 1 {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Running low on sessions. Consider upgrading!")
                        .font(.caption)
                        .foregroundColor(.orange)
                    Spacer()
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.cyan.opacity(0.5), lineWidth: 1)
        )
        .cornerRadius(12)
    }

    // MARK: - Purchase Type Selector

    private var purchaseTypeSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Purchase Option")
                .font(.headline)
                .foregroundColor(.white)

            HStack(spacing: 0) {
                Button(action: { purchaseType = .oneTime }) {
                    Text("One-Time")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(purchaseType == .oneTime ? Color.cyan : Color.clear)
                        .foregroundColor(purchaseType == .oneTime ? .black : .white)
                }

                Button(action: { purchaseType = .subscription }) {
                    VStack(spacing: 2) {
                        Text("Subscribe")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text("Save up to 40%")
                            .font(.caption2)
                            .opacity(0.8)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(purchaseType == .subscription ? Color.purple : Color.clear)
                    .foregroundColor(purchaseType == .subscription ? .white : .white)
                }
            }
            .background(Color.white.opacity(0.1))
            .cornerRadius(8)
        }
    }

    // MARK: - Duration Selection (One-Time)

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Session Length")
                .font(.headline)
                .foregroundColor(.white)

            HStack(spacing: 8) {
                DurationCard(
                    minutes: 20,
                    price: 14,
                    isSelected: viewModel.config.durationMinutes == 20
                ) {
                    viewModel.config.durationMinutes = 20
                }

                DurationCard(
                    minutes: 30,
                    price: 26,
                    isSelected: viewModel.config.durationMinutes == 30
                ) {
                    viewModel.config.durationMinutes = 30
                }

                DurationCard(
                    minutes: 60,
                    price: 49,
                    isSelected: viewModel.config.durationMinutes == 60,
                    isFeatured: true
                ) {
                    viewModel.config.durationMinutes = 60
                }
            }
        }
    }

    // MARK: - Subscription Tiers Section

    private var subscriptionTiersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Choose Your Plan")
                .font(.headline)
                .foregroundColor(.white)

            VStack(spacing: 12) {
                ForEach(SubscriptionTier.allCases, id: \.self) { tier in
                    SubscriptionTierCard(
                        tier: tier,
                        isSelected: selectedTier == tier,
                        isRecommended: tier == .regular
                    ) {
                        selectedTier = tier
                    }
                }
            }
        }
    }

    // MARK: - Subscribe Button

    private var subscribeButton: some View {
        Button {
            Task {
                await viewModel.purchaseSubscription(tier: selectedTier)
            }
        } label: {
            HStack {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Subscribe to \(selectedTier.displayName)")
                        .font(.headline)
                    Text(viewModel.subscriptionPriceDisplay(for: selectedTier))
                        .font(.headline)
                        .opacity(0.8)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.purple, Color.pink],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(viewModel.isLoading)
    }

    // MARK: - Start Button (One-Time)

    private var startButton: some View {
        Button {
            Task {
                await viewModel.purchaseSession()
            }
        } label: {
            HStack {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Start \(viewModel.config.durationMinutes) Min Session")
                        .font(.headline)
                    Text(viewModel.priceDisplay(for: viewModel.config.durationMinutes))
                        .font(.headline)
                        .opacity(0.8)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.cyan, Color.purple],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(viewModel.isLoading)
    }

    // MARK: - Join Session Button

    private var joinSessionButton: some View {
        Button(action: {
            showingJoinSheet = true
            joinCode = ""
            joinError = nil
        }) {
            HStack {
                Image(systemName: "person.badge.plus")
                Text("Join Existing Session")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.white.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.cyan.opacity(0.5), lineWidth: 1)
            )
            .foregroundColor(.cyan)
            .cornerRadius(12)
        }
    }

    // MARK: - Join Session Sheet

    private var joinSessionSheet: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.cyan, Color.purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )

                    Text("Join a Session")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Enter the 6-character code from the host's screen")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)

                // Code Entry
                VStack(spacing: 12) {
                    TextField("XXXXXX", text: $joinCode)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .padding()
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(12)
                        .onChange(of: joinCode) { newValue in
                            // Limit to 6 characters and uppercase
                            joinCode = String(newValue.uppercased().prefix(6))
                            joinError = nil
                        }

                    if let error = joinError {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
                .padding(.horizontal)

                Spacer()

                // Join Button
                Button(action: {
                    joinSession()
                }) {
                    HStack {
                        if isJoining {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "arrow.right.circle.fill")
                            Text("Join Session")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(joinCode.count == 6 ? Color.cyan : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(joinCode.count != 6 || isJoining)
                .padding()
            }
            .background(Color.black.ignoresSafeArea())
            .navigationBarItems(
                trailing: Button("Cancel") {
                    showingJoinSheet = false
                }
                .foregroundColor(.cyan)
            )
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Join Session Action

    private func joinSession() {
        guard joinCode.count == 6 else { return }

        isJoining = true
        joinError = nil

        viewModel.joinSession(code: joinCode) { result in
            DispatchQueue.main.async {
                isJoining = false

                switch result {
                case .success(let session):
                    appState.currentSession = session
                    showingJoinSheet = false
                case .failure(let error):
                    joinError = error.localizedDescription
                }
            }
        }
    }
}

// MARK: - Supporting Views

struct ModeCard: View {
    let mode: RediMode
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: mode.icon)
                    .font(.title2)

                Text(mode.displayName)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isSelected ? Color.cyan.opacity(0.2) : Color.white.opacity(0.05))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.cyan : Color.clear, lineWidth: 2)
            )
            .cornerRadius(12)
            .foregroundColor(isSelected ? .cyan : .white)
        }
    }
}

struct VoiceCard: View {
    let gender: VoiceGender
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: gender == .male ? "person.fill" : "person.fill")
                Text(gender.displayName)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isSelected ? Color.cyan.opacity(0.2) : Color.white.opacity(0.05))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.cyan : Color.clear, lineWidth: 2)
            )
            .cornerRadius(12)
            .foregroundColor(isSelected ? .cyan : .white)
        }
    }
}

struct DurationCard: View {
    let minutes: Int
    let price: Int
    let isSelected: Bool
    var isFeatured: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                if isFeatured {
                    Text("Best Value")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.purple)
                        .cornerRadius(4)
                }

                Text("\(minutes) min")
                    .font(.headline)

                Text("$\(price)")
                    .font(.title)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isSelected ? Color.cyan.opacity(0.2) : Color.white.opacity(0.05))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.cyan : Color.clear, lineWidth: 2)
            )
            .cornerRadius(12)
            .foregroundColor(isSelected ? .cyan : .white)
        }
    }
}

struct SubscriptionTierCard: View {
    let tier: SubscriptionTier
    let isSelected: Bool
    var isRecommended: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(tier.displayName)
                                .font(.headline)
                                .foregroundColor(.white)

                            if isRecommended {
                                Text("Recommended")
                                    .font(.caption2)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.purple)
                                    .foregroundColor(.white)
                                    .cornerRadius(4)
                            }
                        }

                        Text(tier.isUnlimited ? "Unlimited sessions" : "\(tier.sessionsIncluded) sessions/month")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text("$\(tier.priceMonthly)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(isSelected ? .purple : .white)
                        Text("/month")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }

                // Features list
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(tier.features.prefix(3), id: \.self) { feature in
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.purple)
                            Text(feature)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }

                // Per-session cost callout
                if !tier.isUnlimited {
                    let perSession = tier.priceMonthly / tier.sessionsIncluded
                    Text("Only $\(perSession)/session")
                        .font(.caption)
                        .foregroundColor(.cyan)
                        .padding(.top, 4)
                }
            }
            .padding()
            .background(isSelected ? Color.purple.opacity(0.2) : Color.white.opacity(0.05))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.purple : Color.clear, lineWidth: 2)
            )
            .cornerRadius(12)
        }
    }
}

// MARK: - Preview

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
            .environmentObject(AppState())
    }
}
