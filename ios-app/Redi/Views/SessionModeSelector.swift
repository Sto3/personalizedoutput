/**
 * SessionModeSelector.swift
 *
 * Pre-session modal for selecting Redi session mode.
 * Uses RediMode from Models.swift.
 */

import SwiftUI

struct SessionModeSelector: View {
    @Binding var isPresented: Bool
    var onSelect: (RediMode) -> Void

    @State private var selectedMode: RediMode = .general

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

                // 2x2 grid of modes
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(RediMode.allCases, id: \.self) { mode in
                        Button(action: { selectedMode = mode }) {
                            VStack(spacing: 10) {
                                Image(systemName: mode.icon)
                                    .font(.system(size: 28))
                                    .foregroundColor(selectedMode == mode ? cyanGlow : .white.opacity(0.5))

                                Text(mode.displayName)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(selectedMode == mode ? .white : .white.opacity(0.5))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.8)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(selectedMode == mode ? 0.1 : 0.04))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(
                                                selectedMode == mode ? cyanGlow : Color.white.opacity(0.08),
                                                lineWidth: selectedMode == mode ? 2 : 1
                                            )
                                    )
                            )
                        }
                    }
                }
                .padding(.horizontal)

                // Join button
                Button(action: {
                    isPresented = false
                    onSelect(selectedMode)
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
