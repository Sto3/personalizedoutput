# Fix: Barge-in killing vision responses

## Problem
GPT-4o Mini vision queries take ~2 seconds to process.
During this time, Deepgram's SpeechStarted event fires on ambient noise,
triggering pre-TTS barge-in which cancels the response before TTS can play.

## Root Cause (from Render logs)
```
[V9] Route: VISION | "Can you see my screen?" | Screen share — GPT-4o Mini (auto)
[V9] BARGE-IN (pre-TTS)          ← ambient noise during 2s processing
[V9] VISION (4o-mini): 1815ms    ← response comes back but isResponding=false
```

## Fix Applied
1. Removed pre-TTS barge-in from SpeechStarted handler
2. Wake word detection now resets the awake window timer
3. Awake window extended from 30s to 45s

## Date: Feb 27, 2026
