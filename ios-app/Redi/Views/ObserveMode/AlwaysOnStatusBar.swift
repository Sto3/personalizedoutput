/**
 * AlwaysOnStatusBar — Persistent Indicator When Observing
 * ========================================================
 * A small bar at the top of the app showing Always On is active.
 * Users should ALWAYS know Redi is listening — no hidden surveillance.
 * Pulsing cyan dot + "Always On" + duration + one-tap stop button.
 */

import SwiftUI

struct AlwaysOnStatusBar: View {
    @ObservedObject var observeService: ObserveModeService

    var body: some View {
        if observeService.isObserving {
            HStack(spacing: 8) {
                // Pulsing dot
                Circle()
                    .fill(Color.cyan)
                    .frame(width: 8, height: 8)
                    .modifier(PulseAnimation())

                Image(systemName: observeService.observeType.icon)
                    .font(.caption)
                    .foregroundColor(.cyan)

                Text("Always On")
                    .font(.caption)
                    .foregroundColor(.cyan)

                Text("\u{00B7}")
                    .foregroundColor(.gray)

                Text("\(observeService.durationMinutes)m")
                    .font(.caption)
                    .foregroundColor(.gray)

                Spacer()

                Button(action: { observeService.stopObserving() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .background(Color.cyan.opacity(0.08))
            .cornerRadius(20)
            .padding(.horizontal)
        }
    }
}

struct PulseAnimation: ViewModifier {
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .opacity(isPulsing ? 0.4 : 1.0)
            .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: isPulsing)
            .onAppear { isPulsing = true }
    }
}
