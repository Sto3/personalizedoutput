/**
 * SessionExtensionOverlay.swift
 *
 * Overlay that appears when session is about to end (2 min remaining).
 * Offers options to extend: +5 ($4), +10 ($7), +15 ($10), or End session.
 */

import SwiftUI
import StoreKit

struct SessionExtensionOverlay: View {
    @Binding var isPresented: Bool
    @Binding var remainingSeconds: Int
    let sessionId: String
    let onExtend: (RediProduct) async -> Bool
    let onEnd: () -> Void

    @StateObject private var storeKit = StoreKitService.shared
    @State private var isProcessing = false
    @State private var selectedExtension: RediProduct?
    @State private var error: String?

    var body: some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Warning icon and message
                VStack(spacing: 12) {
                    Image(systemName: "clock.badge.exclamationmark.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.orange, .red],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )

                    Text("Session Ending Soon")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("\(remainingSeconds / 60):\(String(format: "%02d", remainingSeconds % 60)) remaining")
                        .font(.title)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                        .monospacedDigit()
                }
                .padding(.top, 20)

                Text("Add more time?")
                    .font(.headline)
                    .foregroundColor(.gray)

                // Extension options
                VStack(spacing: 12) {
                    ForEach([RediProduct.extend5, .extend10, .extend15], id: \.self) { product in
                        ExtensionButton(
                            product: product,
                            storeKitProduct: storeKit.product(for: product),
                            isSelected: selectedExtension == product,
                            isProcessing: isProcessing && selectedExtension == product
                        ) {
                            Task {
                                await purchaseExtension(product)
                            }
                        }
                    }
                }
                .padding(.horizontal)

                if let error = error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal)
                }

                // End session button
                Button(action: {
                    onEnd()
                    isPresented = false
                }) {
                    Text("End Session")
                        .font(.headline)
                        .foregroundColor(.gray)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.top, 8)

                Spacer()
            }
            .padding()
        }
        .transition(.opacity)
    }

    private func purchaseExtension(_ product: RediProduct) async {
        guard !isProcessing else { return }

        isProcessing = true
        selectedExtension = product
        error = nil

        let success = await onExtend(product)

        if success {
            isPresented = false
        } else {
            error = "Failed to extend session. Please try again."
        }

        isProcessing = false
        selectedExtension = nil
    }
}

struct ExtensionButton: View {
    let product: RediProduct
    let storeKitProduct: Product?
    let isSelected: Bool
    let isProcessing: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.displayName)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text("\(product.minutesProvided) more minutes")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                if isProcessing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(storeKitProduct?.displayPrice ?? product.priceDisplay)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.cyan)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.cyan.opacity(0.2) : Color.white.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.cyan : Color.clear, lineWidth: 2)
            )
        }
        .disabled(isProcessing)
    }
}

// MARK: - Session Extension Manager

class SessionExtensionManager: ObservableObject {
    @Published var showExtensionOverlay = false
    @Published var remainingSeconds: Int = 0

    private var warningPlayed = false
    private let warningThreshold = 120  // 2 minutes

    /// Call this periodically to check if warning should be shown
    func checkTimeRemaining(_ seconds: Int) {
        remainingSeconds = seconds

        if seconds <= warningThreshold && seconds > 0 && !warningPlayed {
            showExtensionOverlay = true
            warningPlayed = true
            playWarningChime()
        }
    }

    /// Reset for a new session
    func reset() {
        showExtensionOverlay = false
        warningPlayed = false
        remainingSeconds = 0
    }

    /// Called when extension is purchased - reset warning flag
    func extensionPurchased() {
        warningPlayed = false
        showExtensionOverlay = false
    }

    private func playWarningChime() {
        // Play subtle chime sound
        // In production, use AVFoundation to play a custom chime
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.warning)
        #endif
    }
}

// MARK: - Preview

struct SessionExtensionOverlay_Previews: PreviewProvider {
    static var previews: some View {
        SessionExtensionOverlay(
            isPresented: .constant(true),
            remainingSeconds: .constant(90),
            sessionId: "test-session",
            onExtend: { _ in true },
            onEnd: {}
        )
    }
}
