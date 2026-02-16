/**
 * VoiceSelectionView.swift
 *
 * Voice picker for Redi settings.
 * Fetches available voices from server and allows selection.
 */

import SwiftUI

struct VoiceSelectionView: View {
    @State private var voices: [VoiceOption] = []
    @State private var selectedVoiceId: String = UserDefaults.standard.string(forKey: "rediVoiceId") ?? ""
    @State private var isLoading = true

    struct VoiceOption: Codable, Identifiable {
        let id: String
        let name: String
        let description: String
        let gender: String
    }

    var body: some View {
        List {
            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else {
                Section(header: Text("Male Voices")) {
                    ForEach(voices.filter { $0.gender == "male" }) { voice in
                        VoiceRow(voice: voice, isSelected: voice.id == selectedVoiceId) {
                            selectedVoiceId = voice.id
                            UserDefaults.standard.set(voice.id, forKey: "rediVoiceId")
                            UserDefaults.standard.set(voice.name, forKey: "rediVoiceName")
                        }
                    }
                }
                Section(header: Text("Female Voices")) {
                    ForEach(voices.filter { $0.gender == "female" }) { voice in
                        VoiceRow(voice: voice, isSelected: voice.id == selectedVoiceId) {
                            selectedVoiceId = voice.id
                            UserDefaults.standard.set(voice.id, forKey: "rediVoiceId")
                            UserDefaults.standard.set(voice.name, forKey: "rediVoiceName")
                        }
                    }
                }
            }
        }
        .navigationTitle("Redi's Voice")
        .onAppear { fetchVoices() }
    }

    private func fetchVoices() {
        guard let url = URL(string: "https://redialways.com/api/voices") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data,
                  let response = try? JSONDecoder().decode([String: [VoiceOption]].self, from: data),
                  let voiceList = response["voices"] else { return }
            DispatchQueue.main.async {
                self.voices = voiceList
                self.isLoading = false
            }
        }.resume()
    }
}

struct VoiceRow: View {
    let voice: VoiceSelectionView.VoiceOption
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading) {
                    Text(voice.name)
                        .font(.headline)
                        .foregroundColor(.white)
                    Text(voice.description)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.cyan)
                }
            }
        }
    }
}
