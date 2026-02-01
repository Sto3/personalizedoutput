/**
 * SettingsView.swift
 *
 * Settings screen for Redi - includes server version toggle, screen share, and more.
 */

import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedVersion: RediServerVersion = RediConfig.serverVersion
    @State private var showScreenShare = false
    
    var body: some View {
        NavigationView {
            List {
                // Screen Share Section
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
                } footer: {
                    Text("Share your computer screen so Redi can help with tasks.")
                        .foregroundColor(.gray)
                }
                
                // Server Version Section
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
                    Text("Changes take effect on next session. V7 is stable, V8 is experimental.")
                        .foregroundColor(.gray)
                }
                
                // Current Connection Info
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
                
                // About Section
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
    }
}
