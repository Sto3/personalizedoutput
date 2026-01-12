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
    @State private var showSubscriptions = false
    @State private var showingSubscriptionSheet = false
    @State private var showingCodeEntry = false
    @State private var testCode = ""

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

                    // Try Redi button (for new users)
                    tryRediButton

                    // Have a code? button
                    haveCodeButton

                    // Subscriptions toggle
                    subscriptionsSection

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
                    .onLongPressGesture(minimumDuration: 2) {
                        // Long press for 2 seconds = admin bypass
                        showingAdminBypass = true
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
        Task {
            // Call backend with test mode to create a real session
            do {
                let session = try await createTestSession()
                await MainActor.run {
                    appState.currentSession = session
                }
            } catch {
                print("[Admin Bypass] Failed to create test session: \(error)")
                // Fallback to local session if backend fails
                let testSession = RediSession(
                    id: "test-\(UUID().uuidString.prefix(8))",
                    mode: viewModel.config.mode,
                    sensitivity: viewModel.config.sensitivity,
                    voiceGender: viewModel.config.voiceGender,
                    durationMinutes: 15,
                    expiresAt: Date().addingTimeInterval(15 * 60),
                    status: .active,
                    websocketUrl: "wss://personalizedoutput.com/ws/redi?sessionId=test-\(UUID().uuidString.prefix(8))",
                    joinCode: generateJoinCode(),
                    isHost: true,
                    participantCount: 1,
                    maxParticipants: 5,
                    audioOutputMode: .hostOnly
                )
                await MainActor.run {
                    appState.currentSession = testSession
                }
            }
        }
    }

    private func createTestSession() async throws -> RediSession {
        let baseURL = "https://personalizedoutput.com"
        let url = URL(string: "\(baseURL)/api/redi/session/test")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        let userId = UserDefaults.standard.string(forKey: "redi_user_id") ?? UUID().uuidString
        UserDefaults.standard.set(userId, forKey: "redi_user_id")

        let body: [String: Any] = [
            "userId": userId,
            "deviceId": deviceId,
            "mode": viewModel.config.mode.rawValue,
            "voiceGender": viewModel.config.voiceGender.rawValue,
            "sensitivity": viewModel.config.sensitivity,
            "testMode": true
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(RediSession.self, from: data)
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
                        Text("Unlimited minutes")
                            .font(.caption)
                            .foregroundColor(.cyan)
                    } else {
                        Text("\(subscription.sessionsRemaining) min remaining")
                            .font(.caption)
                            .foregroundColor(subscription.sessionsRemaining <= 15 ? .orange : .cyan)
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

            // Low minutes warning
            if !subscription.isUnlimited && subscription.sessionsRemaining <= 15 {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Running low on minutes!")
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

    // MARK: - Try Redi Button

    private var tryRediButton: some View {
        Button {
            Task {
                await viewModel.purchaseTrySession()
            }
        } label: {
            HStack {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    VStack(spacing: 4) {
                        Text("Try Redi")
                            .font(.headline)
                        Text("15 minutes")
                            .font(.caption)
                            .opacity(0.8)
                    }
                    Spacer()
                    Text(viewModel.trySessionPriceDisplay())
                        .font(.title2)
                        .fontWeight(.bold)
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

    // MARK: - Have a Code Button

    private var haveCodeButton: some View {
        Button(action: { showingCodeEntry = true }) {
            Text("Have a code?")
                .font(.subheadline)
                .foregroundColor(.cyan)
        }
        .sheet(isPresented: $showingCodeEntry) {
            codeEntrySheet
        }
    }

    private var codeEntrySheet: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "ticket.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.cyan)

                    Text("Enter Code")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Enter your promotional or test code")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.top, 40)

                TextField("CODE", text: $testCode)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .onChange(of: testCode) { newValue in
                        testCode = newValue.uppercased()
                    }

                Spacer()

                Button(action: { redeemCode() }) {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Redeem Code")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(testCode.count >= 4 ? Color.cyan : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(testCode.count < 4 || viewModel.isLoading)
                .padding()
            }
            .background(Color.black.ignoresSafeArea())
            .navigationBarItems(
                trailing: Button("Cancel") {
                    showingCodeEntry = false
                    testCode = ""
                }
                .foregroundColor(.cyan)
            )
        }
        .preferredColorScheme(.dark)
    }

    private func redeemCode() {
        Task {
            do {
                let session = try await redeemTestCode(testCode)
                await MainActor.run {
                    showingCodeEntry = false
                    testCode = ""
                    appState.currentSession = session
                }
            } catch {
                await MainActor.run {
                    viewModel.error = "Invalid code. Please try again."
                }
            }
        }
    }

    private func redeemTestCode(_ code: String) async throws -> RediSession {
        let baseURL = "https://personalizedoutput.com"
        let url = URL(string: "\(baseURL)/api/redi/session/test")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        let userId = UserDefaults.standard.string(forKey: "redi_user_id") ?? UUID().uuidString
        UserDefaults.standard.set(userId, forKey: "redi_user_id")

        let body: [String: Any] = [
            "code": code,
            "userId": userId,
            "deviceId": deviceId,
            "mode": viewModel.config.mode.rawValue,
            "voiceGender": viewModel.config.voiceGender.rawValue,
            "sensitivity": viewModel.config.sensitivity
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(RediSession.self, from: data)
    }

    // MARK: - Subscriptions Section

    private var subscriptionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: { withAnimation { showSubscriptions.toggle() } }) {
                HStack {
                    Text("Subscriptions")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                    Text("Save with monthly plans")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Image(systemName: showSubscriptions ? "chevron.up" : "chevron.down")
                        .foregroundColor(.gray)
                }
            }

            if showSubscriptions {
                VStack(spacing: 12) {
                    // Monthly Plan
                    subscriptionCard(
                        title: "Monthly",
                        price: viewModel.monthlyPriceDisplay(),
                        description: "120 minutes per month",
                        features: ["Roll over unused time", "All modes included"],
                        action: {
                            Task { await viewModel.purchaseSubscription(tier: .regular) }
                        }
                    )

                    // Unlimited Plan
                    subscriptionCard(
                        title: "Unlimited",
                        price: viewModel.unlimitedPriceDisplay(),
                        description: "Unlimited minutes",
                        features: ["No limits", "Priority support"],
                        isFeatured: true,
                        action: {
                            Task { await viewModel.purchaseSubscription(tier: .unlimited) }
                        }
                    )
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }

    private func subscriptionCard(
        title: String,
        price: String,
        description: String,
        features: [String],
        isFeatured: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(title)
                                .font(.headline)
                                .foregroundColor(.white)
                            if isFeatured {
                                Text("Best Value")
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.purple)
                                    .foregroundColor(.white)
                                    .cornerRadius(4)
                            }
                        }
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text(price)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        Text("/month")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }

                HStack(spacing: 12) {
                    ForEach(features, id: \.self) { feature in
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark")
                                .font(.caption2)
                                .foregroundColor(.cyan)
                            Text(feature)
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                    }
                }
            }
            .padding()
            .background(isFeatured ? Color.purple.opacity(0.2) : Color.white.opacity(0.05))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isFeatured ? Color.purple : Color.gray.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(10)
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


// MARK: - Preview

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
            .environmentObject(AppState())
    }
}
