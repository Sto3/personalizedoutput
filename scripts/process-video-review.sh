#!/bin/bash
# Process screen recording: extract audio, transcribe, and extract frames
# Usage: ./process-screen-recording.sh /path/to/video.mov

VIDEO_PATH="$1"
OUTPUT_DIR="/tmp/video-review"

if [ -z "$VIDEO_PATH" ]; then
    echo "Usage: $0 /path/to/video.mov"
    exit 1
fi

if [ ! -f "$VIDEO_PATH" ]; then
    echo "Error: File not found: $VIDEO_PATH"
    exit 1
fi

# Create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "=== Processing: $VIDEO_PATH ==="
echo ""

# Get video duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_PATH" 2>/dev/null)
echo "Duration: ${DURATION}s"
echo ""

# Extract audio
echo "1. Extracting audio..."
ffmpeg -i "$VIDEO_PATH" -vn -acodec pcm_s16le -ar 16000 -ac 1 "$OUTPUT_DIR/audio.wav" -y 2>/dev/null
echo "   Done: $OUTPUT_DIR/audio.wav"
echo ""

# Transcribe with Whisper
echo "2. Transcribing with Whisper (this may take a moment)..."
~/.local/bin/whisper "$OUTPUT_DIR/audio.wav" --model base --output_dir "$OUTPUT_DIR" --output_format txt --language en 2>/dev/null
echo "   Done!"
echo ""

# Extract frames (1 frame every 3 seconds)
echo "3. Extracting frames (1 every 3 seconds)..."
ffmpeg -i "$VIDEO_PATH" -vf "fps=1/3" "$OUTPUT_DIR/frame_%03d.png" -y 2>/dev/null
FRAME_COUNT=$(ls "$OUTPUT_DIR"/frame_*.png 2>/dev/null | wc -l)
echo "   Extracted $FRAME_COUNT frames"
echo ""

# Show results
echo "=== RESULTS ==="
echo ""
echo "Transcript:"
echo "----------------------------------------"
cat "$OUTPUT_DIR/audio.txt" 2>/dev/null || echo "(No speech detected)"
echo "----------------------------------------"
echo ""
echo "Frames saved to: $OUTPUT_DIR/frame_*.png"
echo ""
echo "To view frames: open $OUTPUT_DIR"
