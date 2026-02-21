/**
 * ObserveModeView — Always On Mode UI
 * =====================================
 * Configuration screen for starting observation mode,
 * and active observation view with interjection display.
 */

import SwiftUI

struct ObserveModeView: View {
    @StateObject private var observeService = ObserveModeService()
    @EnvironmentObject var webSocketService: V9WebSocketService
    @AppStorage("alwaysOnPrivacyAccepted") private var privacyAccepted = false
    @State private var showPrivacySheet = false
    @State private var privacyConfirmed = false
    @State private var showExplainer = false

    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                observeIcon

                Text(observeService.isObserving ? "Redi is Observing" : "Always On Mode")
                    .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 24))

                if observeService.isObserving {
                    Text("\(observeService.durationMinutes)min \u{00B7} \(observeService.interjectionCount) interjections")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }

            if !observeService.isObserving {
                // Configuration before starting
                VStack(spacing: 20) {
                    // Observe type picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("What should Redi observe?")
                            .font(.subheadline)
                            .foregroundColor(.gray)

                        ForEach(ObserveModeService.ObserveType.allCases, id: \.rawValue) { type in
                            Button(action: { observeService.observeType = type }) {
                                HStack {
                                    Image(systemName: type.icon)
                                        .frame(width: 30)
                                        .foregroundColor(.cyan)
                                    VStack(alignment: .leading) {
                                        Text(type.displayName)
                                            .font(.headline)
                                        Text(type.description)
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    Text(type.costPerHourEstimate)
                                        .font(.caption)
                                        .foregroundColor(.cyan)
                                    if observeService.observeType == type {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.cyan)
                                    }
                                }
                                .padding(12)
                                .background(observeService.observeType == type ? Color.cyan.opacity(0.1) : Color.clear)
                                .cornerRadius(10)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Sensitivity picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("How often should Redi speak up?")
                            .font(.subheadline)
                            .foregroundColor(.gray)

                        Picker("Sensitivity", selection: $observeService.sensitivity) {
                            ForEach(ObserveModeService.Sensitivity.allCases, id: \.rawValue) { level in
                                Text(level.displayName).tag(level)
                            }
                        }
                        .pickerStyle(.segmented)

                        Text(observeService.sensitivity.description)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }

                    // Explanation
                    Text("Redi will listen in the background and only speak when it has something genuinely useful to offer — a reminder, a suggestion, a correction, or an answer to something you're working on.")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding()

                // Start button
                Button(action: {
                    if privacyAccepted {
                        observeService.startObserving(webSocket: webSocketService)
                    } else {
                        showPrivacySheet = true
                    }
                }) {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Start Observing")
                            .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 18))
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.cyan)
                    .foregroundColor(.black)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .sheet(isPresented: $showPrivacySheet) {
                    AlwaysOnPrivacySheet(
                        isPresented: $showPrivacySheet,
                        userAccepted: $privacyConfirmed,
                        observeType: observeService.observeType
                    )
                }
                .onChange(of: privacyConfirmed) { confirmed in
                    if confirmed {
                        observeService.startObserving(webSocket: webSocketService)
                    }
                }

                // Learn more link
                Button(action: { showExplainer = true }) {
                    Text("Learn more about Always On")
                        .font(.caption)
                        .foregroundColor(.cyan.opacity(0.7))
                }
                .sheet(isPresented: $showExplainer) {
                    AlwaysOnExplainerView()
                }

            } else {
                // Active observation view
                Spacer()

                // Last interjection
                if !observeService.lastInterjection.isEmpty {
                    VStack(spacing: 8) {
                        Text("Last interjection:")
                            .font(.caption)
                            .foregroundColor(.gray)
                        Text(observeService.lastInterjection)
                            .font(.body)
                            .padding()
                            .background(Color.cyan.opacity(0.1))
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)
                }

                // Subtle pulse animation showing Redi is listening
                Circle()
                    .fill(Color.cyan.opacity(0.15))
                    .frame(width: 120, height: 120)
                    .overlay(
                        Circle()
                            .fill(Color.cyan.opacity(0.3))
                            .frame(width: 80, height: 80)
                    )
                    .overlay(
                        Image(systemName: observeService.observeType.icon)
                            .font(.system(size: 30))
                            .foregroundColor(.cyan)
                    )

                Spacer()

                // Stop button
                Button(action: {
                    observeService.stopObserving()
                }) {
                    HStack {
                        Image(systemName: "stop.fill")
                        Text("Stop Observing")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
            }
        }
        .padding()
    }

    // MARK: - iOS 16/17 compatible icon

    @ViewBuilder
    private var observeIcon: some View {
        if #available(iOS 17.0, *) {
            Image(systemName: observeService.isObserving ? "wave.3.right.circle.fill" : "wave.3.right.circle")
                .font(.system(size: 60))
                .foregroundColor(observeService.isObserving ? .cyan : .gray)
                .symbolEffect(.pulse, isActive: observeService.isObserving)
        } else {
            Image(systemName: observeService.isObserving ? "wave.3.right.circle.fill" : "wave.3.right.circle")
                .font(.system(size: 60))
                .foregroundColor(observeService.isObserving ? .cyan : .gray)
        }
    }
}
