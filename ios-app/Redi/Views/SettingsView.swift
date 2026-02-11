/**
 * SettingsView.swift
 *
 * Full Settings screen for Redi
 * Sections: Account, V9 Toggle, Voice, Memory, Redi Reaches Out,
 * Screen Share, Meeting Assistant, Server Version, Privacy, About
 */

import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    @State private var selectedVersion: RediServerVersion = RediConfig.serverVersion
    @State private var showScreenShare = false
    @State private var reachOutEnabled = UserDefaults.standard.bool(forKey: "redi_reach_out")

    var body: some View {
        NavigationView {
            List {
                // Account & Credits
                Section {
                    NavigationLink {
                        UsageDashboardView()
                    } label: {
                        HStack {
                            Image(systemName: "creditcard.fill")
                                .foregroundColor(.cyan)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Credits & Usage")
                                    .foregroundColor(.white)
                                Text("View balance and purchase credits")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                } header: {
                    Text("Account")
                }

                // V9 Architecture Toggle
                Section {
                    Toggle(isOn: $appState.useV9) {
                        HStack {
                            Image(systemName: "brain.head.profile")
                                .foregroundColor(.purple)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Three-Brain (V9)")
                                    .foregroundColor(.white)
                                Text("Cerebras + Haiku + GPT-4o pipeline")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .tint(.purple)
                } header: {
                    Text("AI Architecture")
                } footer: {
                    Text("V9 uses three specialized AIs for faster, smarter responses. Reconnect after changing.")
                        .foregroundColor(.gray)
                }

                // Voice Selection
                Section {
                    NavigationLink {
                        VoiceSelectionView()
                    } label: {
                        HStack {
                            Image(systemName: "waveform")
                                .foregroundColor(.cyan)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Voice")
                                    .foregroundColor(.white)
                                let savedVoice = UserDefaults.standard.string(forKey: "redi_selected_voice") ?? "Brian"
                                Text("Current: \(savedVoice)")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                } header: {
                    Text("Voice")
                }

                // Memory
                Section {
                    NavigationLink {
                        MemoryView()
                    } label: {
                        HStack {
                            Image(systemName: "brain")
                                .foregroundColor(.green)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Memory")
                                    .foregroundColor(.white)
                                Text("View and manage what Redi remembers")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                } header: {
                    Text("Memory")
                }

                // Redi Reaches Out
                Section {
                    Toggle(isOn: $reachOutEnabled) {
                        HStack {
                            Image(systemName: "phone.arrow.down.left.fill")
                                .foregroundColor(.orange)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Redi Reaches Out")
                                    .foregroundColor(.white)
                                Text("Let Redi call you with reminders")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .tint(.orange)
                    .onChange(of: reachOutEnabled) { newValue in
                        UserDefaults.standard.set(newValue, forKey: "redi_reach_out")
                    }
                } header: {
                    Text("Proactive Features")
                } footer: {
                    Text("When enabled, Redi can initiate calls for medication reminders, calendar alerts, and check-ins.")
                        .foregroundColor(.gray)
                }

                // Screen Share
                Section {
                    Button(action: { showScreenShare = true }) {
                        HStack {
                            Image(systemName: "display")
                                .foregroundColor(.cyan)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Share Computer Screen")
                                    .foregroundColor(.white)
                                Text("Let Redi see your desktop")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.gray)
                                .font(.caption)
                        }
                    }
                } header: {
                    Text("Screen Share")
                }

                // Meeting Assistant
                Section {
                    NavigationLink {
                        MeetingBotView()
                    } label: {
                        HStack {
                            Image(systemName: "video.fill")
                                .foregroundColor(.blue)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Meeting Assistant")
                                    .foregroundColor(.white)
                                Text("Zoom, Teams, Google Meet bot")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                } header: {
                    Text("Meetings")
                }

                // Server Version (for advanced users)
                Section {
                    ForEach(RediServerVersion.allCases, id: \.self) { version in
                        Button(action: {
                            selectedVersion = version
                            RediConfig.serverVersion = version
                        }) {
                            HStack {
                                Image(systemName: version.icon)
                                    .foregroundColor(selectedVersion == version ? .cyan : .gray)
                                    .frame(width: 30)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(version.displayName)
                                        .foregroundColor(.white)
                                        .fontWeight(selectedVersion == version ? .semibold : .regular)
                                    Text(version.description)
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                if selectedVersion == version {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.cyan)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Server Version")
                } footer: {
                    Text("Changes take effect on next session.")
                        .foregroundColor(.gray)
                }

                // Connection Info
                Section {
                    HStack {
                        Text("Current Endpoint")
                            .foregroundColor(.gray)
                        Spacer()
                        Text(RediConfig.serverURL.absoluteString)
                            .font(.caption)
                            .foregroundColor(.cyan)
                    }
                } header: {
                    Text("Connection Info")
                }

                // Privacy
                Section {
                    NavigationLink {
                        AIDisclaimer()
                    } label: {
                        HStack {
                            Image(systemName: "shield.checkered")
                                .foregroundColor(.yellow)
                                .frame(width: 30)
                            Text("AI Disclaimer & Privacy")
                                .foregroundColor(.white)
                        }
                    }
                } header: {
                    Text("Privacy")
                }

                // About
                Section {
                    HStack {
                        Text("App Version")
                            .foregroundColor(.white)
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                            .foregroundColor(.gray)
                    }
                    HStack {
                        Text("Build")
                            .foregroundColor(.white)
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                            .foregroundColor(.gray)
                    }
                } header: {
                    Text("About")
                }
            }
            .listStyle(InsetGroupedListStyle())
            .modifier(ScrollContentBackgroundModifier())
            .background(Color.black)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.cyan)
                }
            }
            .sheet(isPresented: $showScreenShare) {
                ScreenShareView()
            }
        }
        .preferredColorScheme(.dark)
    }
}

// iOS 15 compatible modifier for hiding scroll background
struct ScrollContentBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 16.0, *) {
            content.scrollContentBackground(.hidden)
        } else {
            content
        }
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(AppState.shared)
    }
}
