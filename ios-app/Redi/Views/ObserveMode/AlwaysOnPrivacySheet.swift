/**
 * AlwaysOnPrivacySheet — Privacy Disclosure for Always On Mode
 * ==============================================================
 * Shown the FIRST time a user activates Always On.
 * Clear, honest, and reassuring — never buried in fine print.
 * After acceptance, stored in AppStorage so it only shows once.
 */

import SwiftUI

struct AlwaysOnPrivacySheet: View {
    @Binding var isPresented: Bool
    @Binding var userAccepted: Bool
    @AppStorage("alwaysOnPrivacyAccepted") private var previouslyAccepted = false

    let observeType: ObserveModeService.ObserveType

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                Image(systemName: "shield.checkered")
                    .font(.system(size: 50))
                    .foregroundColor(.cyan)

                Text("Before You Turn On Always On")
                    .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 24))
                    .multilineTextAlignment(.center)

                Text("Transparency is core to how Redi works. Here's exactly what happens in this mode:")
                    .font(.body)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)

                // What Redi CAN hear/see
                VStack(alignment: .leading, spacing: 16) {
                    PrivacyRow(
                        icon: "ear",
                        title: "What Redi Hears",
                        detail: observeType == .audioOnly
                            ? "Redi listens to ambient audio through your phone mic — conversations nearby, music, TV, anything audible. Redi processes this to find moments where it can help."
                            : "Redi listens to ambient audio through your phone mic while also reading your screen.",
                        isActive: true
                    )

                    if observeType != .audioOnly {
                        PrivacyRow(
                            icon: "rectangle.and.text.magnifyingglass",
                            title: "What Redi Sees",
                            detail: observeType == .screenOCR
                                ? "Redi reads the TEXT on your screen — emails, code, documents, web pages. It does NOT take screenshots or see images. Text is extracted on your device before anything is sent."
                                : "Redi sees your screen visually, including images and layout. Screen frames are sent to our servers for processing.",
                            isActive: true
                        )
                    }
                }
                .padding()
                .background(Color.cyan.opacity(0.05))
                .cornerRadius(12)

                // What Redi does NOT do
                VStack(alignment: .leading, spacing: 16) {
                    Text("What Redi Does NOT Do")
                        .font(.headline)
                        .foregroundColor(.white)

                    PrivacyRow(
                        icon: "xmark.circle",
                        title: "No Recording",
                        detail: "Redi does NOT record or store audio or video. Everything is processed in real-time and discarded. There is no playback, no archive, no tape.",
                        isActive: false
                    )

                    PrivacyRow(
                        icon: "xmark.circle",
                        title: "No Third-Party Sharing",
                        detail: "Your conversations and screen content are never shared with advertisers, data brokers, or anyone else. Ever.",
                        isActive: false
                    )

                    PrivacyRow(
                        icon: "xmark.circle",
                        title: "No Background Uploads",
                        detail: "When you stop Always On, ALL processing stops instantly. Nothing continues in the background.",
                        isActive: false
                    )

                    PrivacyRow(
                        icon: "xmark.circle",
                        title: "No Password/Financial Capture",
                        detail: "Redi automatically strips sensitive data like passwords, credit card numbers, and SSNs before processing. This is enforced at the server level.",
                        isActive: false
                    )
                }
                .padding()
                .background(Color.red.opacity(0.03))
                .cornerRadius(12)

                // What Redi DOES remember
                VStack(alignment: .leading, spacing: 12) {
                    Text("What Redi Remembers")
                        .font(.headline)
                        .foregroundColor(.white)

                    Text("Redi may learn useful facts from observation — like your preferences, routines, or things you mentioned needing help with. These go into your personal memory, which you can view, edit, or delete anytime in Settings > Memory.")
                        .font(.body)
                        .foregroundColor(.gray)
                }
                .padding()
                .background(Color.cyan.opacity(0.03))
                .cornerRadius(12)

                // You're always in control
                VStack(alignment: .leading, spacing: 12) {
                    Text("You're Always in Control")
                        .font(.headline)
                        .foregroundColor(.white)

                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "hand.raised.fill")
                            .foregroundColor(.cyan)
                        Text("Stop anytime with one tap. Adjust sensitivity anytime. Delete your memory anytime. This is YOUR assistant — it works for you.")
                            .font(.body)
                            .foregroundColor(.gray)
                    }
                }
                .padding()
                .background(Color.cyan.opacity(0.03))
                .cornerRadius(12)

                // Accept button
                Button(action: {
                    previouslyAccepted = true
                    userAccepted = true
                    isPresented = false
                }) {
                    Text("I Understand \u{2014} Turn On Always On")
                        .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 16))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.cyan)
                        .foregroundColor(.black)
                        .cornerRadius(12)
                }

                Button("Not Right Now") {
                    isPresented = false
                }
                .foregroundColor(.gray)
                .padding(.bottom, 20)
            }
            .padding(24)
        }
        .background(Color(red: 0.04, green: 0.04, blue: 0.04))
    }
}

struct PrivacyRow: View {
    let icon: String
    let title: String
    let detail: String
    let isActive: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(isActive ? .cyan : .red.opacity(0.6))
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(detail)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
}
