/**
 * AlwaysOnExplainerView — Value Communication for Always On
 * ===========================================================
 * Shows users WHY Always On is transformative with real examples.
 * Accessible from Settings and from the observe mode option.
 */

import SwiftUI

struct AlwaysOnExplainerView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Hero
                VStack(spacing: 12) {
                    Image(systemName: "wave.3.right.circle.fill")
                        .font(.system(size: 70))
                        .foregroundColor(.cyan)

                    Text("Always On")
                        .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 32))

                    Text("Your brilliant friend in the room who knows when to chime in")
                        .font(.body)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 20)

                // The pitch
                VStack(alignment: .leading, spacing: 16) {
                    Text("Most people don't know half of what Redi can do. Always On fixes that.")
                        .font(.body)
                        .foregroundColor(.white)

                    Text("Turn it on, and Redi quietly observes your day \u{2014} listening to conversations, reading your screen, watching what you're working on. It stays silent until it spots something where it can genuinely help. Then it speaks up, briefly, with exactly what you need.")
                        .font(.body)
                        .foregroundColor(.gray)
                }
                .padding(.horizontal)

                // Real examples
                VStack(alignment: .leading, spacing: 20) {
                    Text("Real Moments Where Redi Steps In")
                        .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 18))

                    ExampleRow(
                        icon: "exclamationmark.triangle",
                        scenario: "You're coding and there's a bug you haven't noticed",
                        rediSays: "Quick heads up \u{2014} that variable on line 23 is null when the array is empty."
                    )

                    ExampleRow(
                        icon: "calendar",
                        scenario: "You're booking a trip and forget about a conflict",
                        rediSays: "Just so you know \u{2014} you have Emma's recital that Saturday. Want me to look at the following weekend instead?"
                    )

                    ExampleRow(
                        icon: "cart",
                        scenario: "You're browsing a product online",
                        rediSays: "That same blender is $40 cheaper on Amazon right now. Want me to pull up the link?"
                    )

                    ExampleRow(
                        icon: "person.2",
                        scenario: "You're in a meeting and someone mentions a deadline",
                        rediSays: "I'll add that March 15th deadline to your calendar. Also, that conflicts with your dentist appointment."
                    )

                    ExampleRow(
                        icon: "fork.knife",
                        scenario: "You're cooking and step away",
                        rediSays: "Hey \u{2014} it's been 12 minutes. Your pasta timer should be going off soon."
                    )

                    ExampleRow(
                        icon: "envelope",
                        scenario: "You're reading an email that needs a response",
                        rediSays: "Want me to draft a reply? Based on your last few emails with them, I know your tone."
                    )

                    ExampleRow(
                        icon: "heart",
                        scenario: "You've been working for 3 hours without a break",
                        rediSays: "You've been locked in for a while. Quick stretch? Your Apple Watch says your stand ring is behind today."
                    )
                }
                .padding(.horizontal)

                // Cost section
                VStack(spacing: 12) {
                    Text("Surprisingly Affordable")
                        .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 18))

                    HStack(spacing: 20) {
                        CostBadge(mode: "Listen", cost: "$0.36/hr", icon: "ear")
                        CostBadge(mode: "Screen", cost: "$0.54/hr", icon: "rectangle.and.text.magnifyingglass")
                    }

                    Text("An entire workday of Redi observing costs less than a coffee.")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding()
                .background(Color.cyan.opacity(0.05))
                .cornerRadius(12)
                .padding(.horizontal)

                // Privacy assurance
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "lock.shield.fill")
                            .foregroundColor(.cyan)
                        Text("Private by Design")
                            .font(.headline)
                    }

                    Text("Nothing is recorded. Nothing is stored. Nothing is shared. Redi processes everything in real-time and forgets it instantly \u{2014} the only things that stick are useful facts that go into your personal memory, which you control completely.")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(Color.cyan.opacity(0.03))
                .cornerRadius(12)
                .padding(.horizontal)

                // CTA
                Button(action: { dismiss() }) {
                    Text("Got It")
                        .font(.custom("BodoniSvtyTwoSCITCTT-Book", size: 18))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.cyan)
                        .foregroundColor(.black)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom, 30)
            }
        }
        .background(Color(red: 0.04, green: 0.04, blue: 0.04))
    }
}

struct ExampleRow: View {
    let icon: String
    let scenario: String
    let rediSays: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: icon)
                    .foregroundColor(.gray)
                    .frame(width: 20)
                Text(scenario)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "bubble.left.fill")
                    .foregroundColor(.cyan)
                    .frame(width: 20)
                Text(rediSays)
                    .font(.subheadline)
                    .italic()
                    .foregroundColor(.white)
            }
        }
        .padding(12)
        .background(Color.white.opacity(0.03))
        .cornerRadius(8)
    }
}

struct CostBadge: View {
    let mode: String
    let cost: String
    let icon: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.cyan)
            Text(mode)
                .font(.caption)
                .fontWeight(.semibold)
            Text(cost)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(Color.white.opacity(0.05))
        .cornerRadius(8)
    }
}
