/**
 * UsageDashboardView.swift
 *
 * Real-time usage tracking to prevent bill shock.
 * Shows credit balance, usage breakdown, and purchase options.
 */

import SwiftUI

struct UsageDashboardView: View {
    @StateObject private var iapService = IAPService.shared
    @State private var usageData: [UsageEntry] = []
    @State private var isLoading = true

    struct UsageEntry: Identifiable {
        let id = UUID()
        let date: String
        let duration: Int  // minutes
        let mode: String
        let credits: Double
        let brain: String
    }

    private var balanceColor: Color {
        if iapService.creditBalance > 20 { return .green }
        if iapService.creditBalance > 10 { return .yellow }
        return .red
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Credit balance card
                VStack(spacing: 8) {
                    Text("\(iapService.creditBalance)")
                        .font(.system(size: 56, weight: .bold, design: .rounded))
                        .foregroundColor(balanceColor)
                    Text("Credits Remaining")
                        .font(.subheadline)
                        .foregroundColor(.gray)

                    if iapService.creditBalance <= 10 {
                        Text("Low balance - purchase more credits")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
                .padding(.vertical, 24)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.05))
                )
                .padding(.horizontal)

                // Purchase buttons
                VStack(alignment: .leading, spacing: 12) {
                    Text("Purchase Credits")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal)

                    ForEach(iapService.products, id: \.id) { product in
                        Button(action: {
                            Task { try? await iapService.purchase(product) }
                        }) {
                            HStack {
                                Text(product.displayName)
                                    .foregroundColor(.white)
                                Spacer()
                                Text(product.displayPrice)
                                    .foregroundColor(.cyan)
                                    .fontWeight(.semibold)
                            }
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.white.opacity(0.05))
                            )
                        }
                        .padding(.horizontal)
                    }
                }

                // Usage history
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Usage")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal)

                    if usageData.isEmpty {
                        Text("No usage data yet")
                            .foregroundColor(.gray)
                            .padding(.horizontal)
                    } else {
                        ForEach(usageData) { entry in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(entry.date)
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                    Text("\(entry.duration)min \(entry.mode)")
                                        .font(.subheadline)
                                        .foregroundColor(.white)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text(String(format: "%.1f cr", entry.credits))
                                        .font(.subheadline)
                                        .foregroundColor(.cyan)
                                    Text(entry.brain)
                                        .font(.caption2)
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Usage & Credits")
        .onAppear {
            Task {
                await iapService.loadProducts()
                await iapService.fetchBalance()
            }
        }
    }
}
