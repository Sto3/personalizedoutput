/**
 * SessionModeSelector.swift
 *
 * Pre-session modal for selecting Redi session mode.
 * Zoom-style interface with 2x2 grid of mode options.
 */

import SwiftUI

struct SessionModeSelector: View {
    @Binding var selectedMode: RediSessionMode
    @Binding var isPresented: Bool
    @State private var setAsDefault = false
    var onJoin: () -> Void

    private let cyanGlow = Color(hex: "00D4FF")
    private let magentaGlow = Color(hex: "FF00AA")

    var body: some View {
        ZStack {
            Color.black.opacity(0.85)
                .ignoresSafeArea()
                .onTapGesture { isPresented = false }

            VStack(spacing: 24) {
                Text("Start Session")
                    .font(.system(size: 28, weight: .bold, design: .serif))
                    .foregroundColor(.white)

                // 2x2 grid of active modes
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(RediSessionMode.activeModes, id: \.self) { mode in
                        ModeButton(
                            mode: mode,
                            isSelected: selectedMode == mode,
                            cyanGlow: cyanGlow
                        ) {
                            selectedMode = mode
                        }
                    }
                }
                .padding(.horizontal)

                Divider()
                    .background(Color.white.opacity(0.2))
                    .padding(.vertical, 4)

                Text("Always On")
                    .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 16))
                    .foregroundColor(.gray)

                Text("Redi observes in the background and speaks up when useful")
                    .font(.caption)
                    .foregroundColor(.gray.opacity(0.7))

                // Always On mode buttons (horizontal)
                HStack(spacing: 12) {
                    AlwaysOnModeButton(
                        icon: "ear",
                        title: "Listen",
                        cost: "~$0.36/hr",
                        isSelected: selectedMode == .alwaysOnAudio,
                        cyanGlow: cyanGlow,
                        action: { selectedMode = .alwaysOnAudio }
                    )
                    AlwaysOnModeButton(
                        icon: "rectangle.and.text.magnifyingglass",
                        title: "Screen",
                        cost: "~$0.54/hr",
                        isSelected: selectedMode == .alwaysOnScreen,
                        cyanGlow: cyanGlow,
                        action: { selectedMode = .alwaysOnScreen }
                    )
                }
                .padding(.horizontal)

                // Set as default toggle
                Toggle(isOn: $setAsDefault) {
                    Text("Set as default")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.6))
                }
                .tint(cyanGlow)
                .padding(.horizontal, 40)

                // Join button
                Button(action: {
                    if setAsDefault {
                        RediSessionMode.defaultMode = selectedMode
                    }
                    isPresented = false
                    onJoin()
                }) {
                    Text("Join")
                        .font(.system(size: 18, weight: .semibold, design: .serif))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            LinearGradient(
                                colors: [cyanGlow, magentaGlow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.black)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)
            }
            .padding(.vertical, 32)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 24)
        }
    }
}

struct AlwaysOnModeButton: View {
    let icon: String
    let title: String
    let cost: String
    let isSelected: Bool
    let cyanGlow: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? cyanGlow : .white.opacity(0.5))

                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(isSelected ? .white : .white.opacity(0.5))

                Text(cost)
                    .font(.system(size: 10))
                    .foregroundColor(cyanGlow.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(isSelected ? 0.1 : 0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isSelected ? cyanGlow : Color.white.opacity(0.08), lineWidth: isSelected ? 2 : 1)
                    )
            )
        }
    }
}

struct ModeButton: View {
    let mode: RediSessionMode
    let isSelected: Bool
    let cyanGlow: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 10) {
                Image(systemName: mode.icon)
                    .font(.system(size: 28))
                    .foregroundColor(isSelected ? cyanGlow : .white.opacity(0.5))

                Text(mode.rawValue)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(isSelected ? .white : .white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(isSelected ? 0.1 : 0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isSelected ? cyanGlow : Color.white.opacity(0.08), lineWidth: isSelected ? 2 : 1)
                    )
            )
        }
    }
}
