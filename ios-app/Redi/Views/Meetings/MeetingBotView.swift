/**
 * MeetingBotView.swift
 *
 * UI for sending Redi to join a meeting (Zoom, Teams, Google Meet).
 * Shows live transcript and bot status.
 */

import SwiftUI

struct MeetingBotView: View {
    @State private var meetingUrl = ""
    @State private var detectedPlatform = ""
    @State private var botId: String?
    @State private var botStatus = "idle"
    @State private var transcript: [(speaker: String, text: String)] = []
    @State private var isJoining = false
    @State private var pollingTimer: Timer?

    var userName: String = "User"

    var rediDisplayName: String {
        "\(userName) / Redi"
    }

    private let cyanGlow = Color(red: 0, green: 0.83, blue: 1)

    var body: some View {
        VStack(spacing: 20) {
            // Meeting URL input
            VStack(alignment: .leading, spacing: 6) {
                Text("Paste meeting link")
                    .font(.system(size: 14, design: .serif))
                    .foregroundColor(.gray)
                TextField("https://zoom.us/j/...", text: $meetingUrl)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .onChange(of: meetingUrl) { _ in detectPlatform() }
            }
            .padding(.horizontal)

            // Detected platform badge
            if !detectedPlatform.isEmpty {
                HStack {
                    Image(systemName: platformIcon)
                        .foregroundColor(cyanGlow)
                    Text(platformLabel)
                        .font(.subheadline)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.gray.opacity(0.2))
                .cornerRadius(8)
            }

            // Join / Status
            if botId == nil {
                Button(action: joinMeeting) {
                    HStack {
                        if isJoining { ProgressView().tint(.black) }
                        Text("Send Redi to Meeting")
                            .font(.system(size: 18, weight: .semibold, design: .serif))
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(meetingUrl.isEmpty ? Color.gray : cyanGlow)
                    .foregroundColor(.black)
                    .cornerRadius(12)
                }
                .disabled(meetingUrl.isEmpty || isJoining)
                .padding(.horizontal)

                Text("Redi will join as \"\(rediDisplayName)\"")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                VStack(spacing: 12) {
                    HStack {
                        Circle()
                            .fill(botStatus == "in_meeting" ? Color.green : Color.yellow)
                            .frame(width: 8, height: 8)
                        Text(botStatus == "in_meeting" ? "Redi is in the meeting" : "Joining...")
                            .font(.subheadline)
                            .foregroundColor(.white)
                        Spacer()
                        Button("Leave") { leaveMeeting() }
                            .foregroundColor(.red)
                    }
                    .padding(.horizontal)

                    // Live transcript
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 8) {
                            ForEach(transcript.indices, id: \.self) { i in
                                VStack(alignment: .leading) {
                                    Text(transcript[i].speaker)
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(cyanGlow)
                                    Text(transcript[i].text)
                                        .font(.body)
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }

            Spacer()
        }
        .padding(.top)
        .navigationTitle("Meeting Assistant")
        .onDisappear {
            pollingTimer?.invalidate()
            pollingTimer = nil
        }
    }

    var platformIcon: String {
        switch detectedPlatform {
        case "zoom": return "video.fill"
        case "teams": return "person.3.fill"
        case "google_meet": return "video.badge.checkmark"
        default: return "questionmark.circle"
        }
    }

    var platformLabel: String {
        switch detectedPlatform {
        case "zoom": return "Zoom"
        case "teams": return "Microsoft Teams"
        case "google_meet": return "Google Meet"
        default: return "Unknown"
        }
    }

    private func detectPlatform() {
        if meetingUrl.contains("zoom.us") { detectedPlatform = "zoom" }
        else if meetingUrl.contains("teams.microsoft.com") || meetingUrl.contains("teams.live.com") { detectedPlatform = "teams" }
        else if meetingUrl.contains("meet.google.com") { detectedPlatform = "google_meet" }
        else { detectedPlatform = "" }
    }

    private func joinMeeting() {
        isJoining = true
        guard let url = URL(string: "https://redialways.com/api/meetings/bot/join") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "meetingUrl": meetingUrl,
            "platform": detectedPlatform,
            "userName": rediDisplayName,
            "userId": "current_user_id"
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, _ in
            DispatchQueue.main.async {
                isJoining = false
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let id = json["botId"] as? String {
                    botId = id
                    botStatus = "joining"
                    startPollingStatus()
                }
            }
        }.resume()
    }

    private func leaveMeeting() {
        guard let id = botId else { return }
        guard let url = URL(string: "https://redialways.com/api/meetings/bot/\(id)/leave") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async {
                pollingTimer?.invalidate()
                pollingTimer = nil
                botId = nil
                botStatus = "idle"
            }
        }.resume()
    }

    private func startPollingStatus() {
        pollingTimer?.invalidate()
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            guard let id = self.botId else {
                self.pollingTimer?.invalidate()
                self.pollingTimer = nil
                return
            }

            if let url = URL(string: "https://redialways.com/api/meetings/bot/\(id)/status") {
                URLSession.shared.dataTask(with: url) { data, _, _ in
                    if let data = data,
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let status = json["status"] as? String {
                        DispatchQueue.main.async { self.botStatus = status }
                        if status == "ended" {
                            DispatchQueue.main.async {
                                self.pollingTimer?.invalidate()
                                self.pollingTimer = nil
                            }
                        }
                    }
                }.resume()
            }

            if let url = URL(string: "https://redialways.com/api/meetings/bot/\(id)/transcript") {
                URLSession.shared.dataTask(with: url) { data, _, _ in
                    if let data = data,
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let items = json["transcript"] as? [[String: Any]] {
                        let parsed = items.compactMap { item -> (speaker: String, text: String)? in
                            guard let speaker = item["speaker"] as? String,
                                  let text = item["text"] as? String else { return nil }
                            return (speaker, text)
                        }
                        DispatchQueue.main.async { self.transcript = parsed }
                    }
                }.resume()
            }
        }
    }
}
