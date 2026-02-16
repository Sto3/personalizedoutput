/**
 * MemoryView.swift
 *
 * User-facing memory management screen.
 * Shows all 5 memory layers, allows editing and deletion.
 */

import SwiftUI

struct MemoryView: View {
    @State private var layers: [MemoryLayer] = []
    @State private var isLoading = true
    @State private var showDeleteConfirmation = false

    struct MemoryLayer: Identifiable {
        let id: Int
        let name: String
        let description: String
        var content: String
        let wordBudget: Int
    }

    var body: some View {
        List {
            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else {
                Section(header: Text("What Redi Knows About You")) {
                    ForEach(layers) { layer in
                        NavigationLink(destination: MemoryLayerView(layer: layer)) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(layer.name)
                                        .font(.headline)
                                        .foregroundColor(.white)
                                    Text(layer.description)
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Text("\(layer.content.split(separator: " ").count)/\(layer.wordBudget)")
                                    .font(.caption2)
                                    .foregroundColor(.cyan)
                            }
                        }
                    }
                }

                Section {
                    Button("Export Memory (JSON)") { exportMemory() }
                        .foregroundColor(.cyan)

                    Button("Delete All Memory") { showDeleteConfirmation = true }
                        .foregroundColor(.red)
                }
            }
        }
        .navigationTitle("Memory")
        .onAppear { fetchLayers() }
        .alert("Delete All Memory?", isPresented: $showDeleteConfirmation) {
            Button("Delete", role: .destructive) { deleteAllMemory() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This cannot be undone. Redi will forget everything about you.")
        }
    }

    private func fetchLayers() {
        // Populate with layer structure
        layers = [
            MemoryLayer(id: 1, name: "Session Buffer", description: "Current session raw data", content: "", wordBudget: 0),
            MemoryLayer(id: 2, name: "Key Facts", description: "Important facts about you", content: "", wordBudget: 500),
            MemoryLayer(id: 3, name: "Patterns", description: "Emotional and relational patterns", content: "", wordBudget: 300),
            MemoryLayer(id: 4, name: "Identity", description: "Core values and identity", content: "", wordBudget: 500),
            MemoryLayer(id: 5, name: "Foundation", description: "Foundational context", content: "", wordBudget: 200)
        ]

        guard let url = URL(string: "https://redialways.com/api/memory/layers") else {
            isLoading = false
            return
        }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async { isLoading = false }
            // Parse server response and update layers
        }.resume()
    }

    private func exportMemory() {
        guard let url = URL(string: "https://redialways.com/api/memory/export") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data else { return }
            // Share via UIActivityViewController
            DispatchQueue.main.async {
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("redi_memory.json")
                try? data.write(to: tempURL)
                // Present share sheet
            }
        }.resume()
    }

    private func deleteAllMemory() {
        guard let url = URL(string: "https://redialways.com/api/memory") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async {
                layers = layers.map { var l = $0; l.content = ""; return l }
            }
        }.resume()
    }
}
