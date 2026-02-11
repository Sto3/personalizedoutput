/**
 * AIDisclaimer.swift
 *
 * AI disclaimer component shown in onboarding, home, and settings.
 */

import SwiftUI

struct AIDisclaimer: View {
    var body: some View {
        Text("Redi is an AI assistant and may make mistakes. Always verify important information.")
            .font(.system(size: 11, design: .serif))
            .foregroundColor(.gray.opacity(0.6))
            .multilineTextAlignment(.center)
            .padding(.horizontal)
    }
}
