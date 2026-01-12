/**
 * HistoryView.swift
 *
 * Shows user's session history and stats.
 */

import SwiftUI

struct HistoryView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = HistoryViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Stats summary
                    if let stats = viewModel.stats {
                        statsSection(stats)
                    }

                    // Session history
                    historySection
                }
                .padding()
            }
            .background(Color.black.ignoresSafeArea())
            .navigationTitle("Session History")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    dismiss()
                }
                .foregroundColor(.cyan)
            )
            .onAppear {
                viewModel.loadHistory()
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Stats Section

    private func statsSection(_ stats: SessionStats) -> some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                statCard(
                    value: "\(stats.totalSessions)",
                    label: "Sessions",
                    icon: "sparkles"
                )

                statCard(
                    value: "\(stats.totalMinutes)",
                    label: "Minutes",
                    icon: "clock.fill"
                )
            }

            HStack(spacing: 16) {
                statCard(
                    value: "\(stats.averageSessionLength)",
                    label: "Avg Length",
                    icon: "chart.bar.fill"
                )

                if let favorite = stats.favoriteMode {
                    statCard(
                        value: getModeShortName(favorite),
                        label: "Favorite",
                        icon: "star.fill"
                    )
                } else {
                    statCard(
                        value: "-",
                        label: "Favorite",
                        icon: "star.fill"
                    )
                }
            }
        }
    }

    private func statCard(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundColor(.cyan)
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
            }
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }

    // MARK: - History Section

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Sessions")
                .font(.headline)
                .foregroundColor(.white)

            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if viewModel.history.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.history) { entry in
                        sessionRow(entry)
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.badge.questionmark")
                .font(.system(size: 40))
                .foregroundColor(.gray)

            Text("No sessions yet")
                .font(.headline)
                .foregroundColor(.gray)

            Text("Your completed sessions will appear here")
                .font(.caption)
                .foregroundColor(.gray.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func sessionRow(_ entry: SessionHistoryEntry) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: getModeIcon(entry.mode))
                    .foregroundColor(.cyan)

                Text(entry.modeDisplayName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                Text(entry.formattedDate)
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            // Summary
            if let summary = entry.aiSummary {
                Text(summary)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.9))
            }

            // Stats row
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                    Text(entry.formattedDuration)
                }

                if entry.aiResponsesCount > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.left.fill")
                        Text("\(entry.aiResponsesCount)")
                    }
                }

                if entry.snapshotsAnalyzed > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "camera.fill")
                        Text("\(entry.snapshotsAnalyzed)")
                    }
                }

                if entry.motionClipsAnalyzed > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "figure.run")
                        Text("\(entry.motionClipsAnalyzed)")
                    }
                }
            }
            .font(.caption)
            .foregroundColor(.gray)

            // Key feedback (if any)
            if let feedback = entry.keyFeedback, !feedback.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(feedback.prefix(2), id: \.self) { point in
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text(point)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }

    // MARK: - Helpers

    private func getModeIcon(_ mode: String) -> String {
        let icons: [String: String] = [
            "studying": "book.fill",
            "meeting": "person.2.fill",
            "sports": "figure.run",
            "music": "music.note",
            "assembly": "wrench.and.screwdriver.fill",
            "monitoring": "eye.fill"
        ]
        return icons[mode] ?? "sparkles"
    }

    private func getModeShortName(_ mode: String) -> String {
        let names: [String: String] = [
            "studying": "Study",
            "meeting": "Meeting",
            "sports": "Sports",
            "music": "Music",
            "assembly": "DIY",
            "monitoring": "Watch"
        ]
        return names[mode] ?? mode.capitalized
    }
}

// MARK: - ViewModel

class HistoryViewModel: ObservableObject {
    @Published var history: [SessionHistoryEntry] = []
    @Published var stats: SessionStats?
    @Published var isLoading = false

    private let apiService = APIService()

    func loadHistory() {
        guard let userId = UserDefaults.standard.string(forKey: "redi_user_id") else {
            return
        }

        isLoading = true

        // Load history and stats in parallel
        Task {
            async let historyTask = fetchHistory(userId: userId)
            async let statsTask = fetchStats(userId: userId)

            let (fetchedHistory, fetchedStats) = await (historyTask, statsTask)

            await MainActor.run {
                self.history = fetchedHistory
                self.stats = fetchedStats
                self.isLoading = false
            }
        }
    }

    private func fetchHistory(userId: String) async -> [SessionHistoryEntry] {
        guard let url = URL(string: "https://personalizedoutput.com/api/redi/history?userId=\(userId)") else {
            return []
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)

            struct Response: Codable {
                let history: [SessionHistoryEntry]
            }

            let response = try JSONDecoder.rediDecoder.decode(Response.self, from: data)
            return response.history
        } catch {
            print("[History] Failed to fetch history: \(error)")
            return []
        }
    }

    private func fetchStats(userId: String) async -> SessionStats? {
        guard let url = URL(string: "https://personalizedoutput.com/api/redi/history/stats?userId=\(userId)") else {
            return nil
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoder = JSONDecoder()
            return try decoder.decode(SessionStats.self, from: data)
        } catch {
            print("[History] Failed to fetch stats: \(error)")
            return nil
        }
    }
}

// MARK: - Preview

struct HistoryView_Previews: PreviewProvider {
    static var previews: some View {
        HistoryView()
    }
}
