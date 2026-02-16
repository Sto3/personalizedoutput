/**
 * MemoryLayerView.swift
 *
 * Individual memory layer detail view with editing.
 */

import SwiftUI

struct MemoryLayerView: View {
    let layer: MemoryView.MemoryLayer
    @State private var content: String = ""
    @State private var isEditing = false

    var wordCount: Int {
        content.split(separator: " ").count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            VStack(alignment: .leading, spacing: 4) {
                Text(layer.name)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Text(layer.description)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            // Word count
            if layer.wordBudget > 0 {
                HStack {
                    Text("\(wordCount) / \(layer.wordBudget) words")
                        .font(.caption)
                        .foregroundColor(wordCount > layer.wordBudget ? .red : .cyan)
                    Spacer()
                    if isEditing {
                        Button("Save") { saveContent() }
                            .foregroundColor(.cyan)
                        Button("Cancel") {
                            content = layer.content
                            isEditing = false
                        }
                        .foregroundColor(.gray)
                    } else {
                        Button("Edit") { isEditing = true }
                            .foregroundColor(.cyan)
                    }
                }
            }

            // Content
            if isEditing {
                TextEditor(text: $content)
                    .font(.body)
                    .foregroundColor(.white)
                    .frame(minHeight: 200)
                    .padding(8)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(8)
            } else {
                ScrollView {
                    Text(content.isEmpty ? "No data in this layer yet." : content)
                        .font(.body)
                        .foregroundColor(content.isEmpty ? .gray : .white)
                }
            }

            Spacer()
        }
        .padding()
        .navigationTitle("Layer \(layer.id)")
        .onAppear { content = layer.content }
    }

    private func saveContent() {
        isEditing = false
        // PUT /api/memory/layer/:layerNum with new content
        guard let url = URL(string: "https://redialways.com/api/memory/layer/\(layer.id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["content": content])
        URLSession.shared.dataTask(with: request) { _, _, _ in }.resume()
    }
}
