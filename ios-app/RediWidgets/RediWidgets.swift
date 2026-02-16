/**
 * RediWidgets.swift
 *
 * Widget Extension for Redi.
 * Lock Screen: circular logo, rectangular with next event.
 * Home Screen: small (balance), medium (balance + summary), large (full dashboard).
 *
 * NOTE: This file requires a new Widget Extension target in Xcode.
 * Perse must add target manually: File > New > Target > Widget Extension.
 */

import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct RediProvider: TimelineProvider {
    func placeholder(in context: Context) -> RediEntry {
        RediEntry(date: Date(), creditBalance: 100, lastSuggestion: "Ready when you are.", nextEvent: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (RediEntry) -> Void) {
        let entry = RediEntry(date: Date(), creditBalance: 100, lastSuggestion: "Ready when you are.", nextEvent: nil)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RediEntry>) -> Void) {
        let balance = UserDefaults(suiteName: "group.com.redi.shared")?.integer(forKey: "creditBalance") ?? 0
        let suggestion = UserDefaults(suiteName: "group.com.redi.shared")?.string(forKey: "lastSuggestion") ?? "Tap to start a session"
        let event = UserDefaults(suiteName: "group.com.redi.shared")?.string(forKey: "nextEvent")

        let entry = RediEntry(date: Date(), creditBalance: balance, lastSuggestion: suggestion, nextEvent: event)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct RediEntry: TimelineEntry {
    let date: Date
    let creditBalance: Int
    let lastSuggestion: String
    let nextEvent: String?
}

// MARK: - Small Widget (2x2)

struct RediSmallWidgetView: View {
    let entry: RediEntry

    var body: some View {
        VStack(spacing: 8) {
            Text("REDI")
                .font(.system(size: 16, weight: .bold, design: .serif))
                .foregroundColor(.cyan)

            Text("\(entry.creditBalance)")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text("credits")
                .font(.system(size: 11))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

// MARK: - Medium Widget (4x2)

struct RediMediumWidgetView: View {
    let entry: RediEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left: balance
            VStack(spacing: 4) {
                Text("REDI")
                    .font(.system(size: 14, weight: .bold, design: .serif))
                    .foregroundColor(.cyan)
                Text("\(entry.creditBalance)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text("credits")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
            }
            .frame(width: 80)

            // Right: suggestion
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.lastSuggestion)
                    .font(.system(size: 13))
                    .foregroundColor(.white)
                    .lineLimit(2)

                if let event = entry.nextEvent {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.system(size: 10))
                            .foregroundColor(.cyan)
                        Text(event)
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Text("Tap to start session")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.cyan)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

// MARK: - Lock Screen Circular Widget

struct RediCircularWidgetView: View {
    let entry: RediEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            Text("R")
                .font(.system(size: 22, weight: .bold, design: .serif))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Lock Screen Rectangular Widget

struct RediRectangularWidgetView: View {
    let entry: RediEntry

    var body: some View {
        HStack {
            Text("REDI")
                .font(.system(size: 12, weight: .bold, design: .serif))
            Spacer()
            if let event = entry.nextEvent {
                Text(event)
                    .font(.system(size: 11))
                    .lineLimit(1)
            } else {
                Text("\(entry.creditBalance) cr")
                    .font(.system(size: 11))
            }
        }
    }
}

// MARK: - Widget Configuration

struct RediWidget: Widget {
    let kind: String = "RediWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RediProvider()) { entry in
            if #available(iOS 17.0, *) {
                RediMediumWidgetView(entry: entry)
                    .containerBackground(.black, for: .widget)
            } else {
                RediMediumWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Redi")
        .description("Quick access to Redi sessions and credit balance.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

// MARK: - Widget Bundle

@main
struct RediWidgetBundle: WidgetBundle {
    var body: some Widget {
        RediWidget()
    }
}
