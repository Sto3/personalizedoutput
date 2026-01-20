# REDI PROJECT - COMPLETE TRANSFER DOCUMENT
## Session: January 20, 2026
## Purpose: Full context for next Claude session to continue without loss

---

# CRITICAL: READ THIS FIRST

**DO NOT just verify code looks correct. VERIFY THE LIVE SYSTEM.**

We have been through 30+ cycles of:
1. Check code → "looks right!"
2. Declare victory
3. Test app → still broken
4. Repeat

**Break the pattern. Check Render logs FIRST.**

---

# WHAT WAS JUST FIXED (Jan 20, 2026)

## Commit: 83842fff77db15df71f91a7f7cda25946be4bd6e

### Bugs Fixed in rediV6Server.ts:

1. **Wrong Model URL**
   - BEFORE: `gpt-4o-realtime-preview-2024-12-17` (old preview)
   - AFTER: `gpt-realtime` (GA model, same as working V3/V5)

2. **Wrong Image Format**
   - BEFORE: `{ type: 'input_image', image: base64String }`
   - AFTER: `{ type: 'input_image', image_url: 'data:image/jpeg;base64,...' }`

3. **Missing Text Context with Image**
   - BEFORE: Image sent alone
   - AFTER: Image sent with `input_text` context (matching V3/V5)

4. **Wrong Image Injection Timing**
   - BEFORE: On `speech_stopped` (before transcript)
   - AFTER: On `transcript.completed` (after knowing what user said)

### What This Should Fix:
- Redi speaking Spanish (system prompt now applied)
- Redi hallucinating vision (images now actually sent to OpenAI)
- No response to visual questions (images now in correct format)

---

# DEPLOYMENT STATUS

- **Fix pushed to:** `main` branch
- **Render auto-deploy:** Should trigger within 2-3 minutes
- **What to look for in logs:**
  ```
  [Redi V6] Starting V6 Server (FIXED Jan 20 2026)
  [Redi V6] Model: gpt-realtime (GA)
  [Redi V6] Image format: data URI with image_url
  ```

---

# VERIFICATION STEPS FOR NEXT SESSION

## Step 1: Check Render Logs
Look for these log patterns:

**Good (V6 working):**
```
[Redi V6] 🔌 New connection: xxx from xxx
[Redi V6] ✅ Connected to OpenAI for session xxx
[Redi V6] ✅ Session configured successfully
[Redi V6] 📷 Injecting image: XXkb, age XXXms
[Redi V6] 🖼️ SENDING IMAGE TO OPENAI (format: image_url with data URI)
[Redi V6] ✅ IMAGE ACCEPTED BY OPENAI
```

**Bad (still broken):**
```
[Redi V6] ❌ OpenAI Error: Unknown parameter
[Redi V5] New connection  (should be V6!)
No V6 connection logs at all
```

## Step 2: Test on iOS
1. Make sure TestFlight has latest build (V5Config points to `?v=6`)
2. Open app, speak to Redi
3. Ask "what do you see?" while camera is active
4. Redi should describe ACTUAL camera content, not hallucinate

## Step 3: If Still Broken
Check these potential issues:
- iOS app might be old build (still pointing to v=5)
- Render might not have redeployed
- OpenAI might reject the session config (check for errors)

---

# THE ARCHITECTURE (MEMORIZE THIS)

## What Uses Which Version:

| Component | Version | Location | Notes |
|-----------|---------|----------|-------|
| V3MainView.swift | V3 | ios-app/Redi/Services/V3/ | UI - DON'T TOUCH |
| V3CameraService.swift | V3 | ios-app/Redi/Services/V3/ | Camera - DON'T TOUCH |
| V5WebSocketService.swift | V5 | ios-app/Redi/Services/V5/ | Network layer |
| V5AudioService.swift | V5 | ios-app/Redi/Services/V5/ | Audio handling |
| V5Config.swift | V5 | ios-app/Redi/Services/V5/ | Points to `?v=6` |
| rediV6Server.ts | V6 | src/websocket/ | Server - JUST FIXED |

## Files That DO NOT EXIST (Never Create):
- ❌ V5MainView
- ❌ V5CameraService
- ❌ V6MainView
- ❌ V6CameraService
- ❌ V6SessionManager

---

# VERSION HISTORY

| Version | Problem It Solved | Key Fix |
|---------|-------------------|---------|
| V3 | Baseline | Working vision, chipmunk voice |
| V4 | Chipmunk voice | Audio format: string 'pcm16' not object |
| V5 | Driving mode | Safety prompts, but had `modalities` bug |
| V6 | V5 API rejection | Removed `modalities`, correct session format |
| V6-FIX | Images not working | Correct model + image_url format |

---

# COMMON MISTAKES TO AVOID

1. **Blanket V3→V5 rename** - Breaks build (V5MainView doesn't exist)
2. **Creating V5/V6 view files** - Only SERVICES version up
3. **Declaring "looks correct"** - VERIFY LIVE SYSTEM
4. **Assuming deploy happened** - CHECK RENDER LOGS
5. **Touching V3MainView** - It works, leave it alone

---

# RENDER MCP SETUP (FOR NEXT SESSION)

To get Render log access, add to Claude Desktop config:

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "render": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote", "https://mcp.render.com/mcp"],
      "env": {
        "RENDER_API_KEY": "YOUR_NEW_KEY_HERE"
      }
    }
  }
}
```

**Note:** Regenerate API key after setup (old one exposed in chat history).

---

# GITHUB ACCESS

Claude has full read/write access to `Sto3/personalizedoutput`:
- Can read files
- Can create branches
- Can push commits directly to main
- Can create PRs

**Workflow:** Claude reasons → Creates exact changes → Pushes directly

---

# KEY FILES QUICK REFERENCE

## Server
- `src/server.ts` - Main entry, inits V3/V5/V6
- `src/websocket/rediV6Server.ts` - V6 server (JUST FIXED)
- `src/websocket/rediV5Server.ts` - V5 server (has modalities bug, not used)
- `src/websocket/rediV3Server.ts` - V3 server (backup)

## iOS
- `ios-app/Redi/Services/V5/V5Config.swift` - Server URL config
- `ios-app/Redi/Services/V5/V5WebSocketService.swift` - WebSocket client
- `ios-app/Redi/Services/V3/V3MainView.swift` - UI (don't touch)

---

# SYMPTOMS → CAUSES REFERENCE

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Redi speaks Spanish | System prompt rejected | Check session.update format |
| Redi hallucinates vision | Images not sent | Check image format |
| "Unknown parameter" | `modalities` in config | Remove it |
| No V6 logs | Init not called | Check server.ts |
| iOS won't connect | Wrong URL | Check V5Config.swift |

---

# IMMEDIATE NEXT STEPS

1. **Wait 2-3 min** for Render to redeploy
2. **Check Render logs** for `[Redi V6] Starting V6 Server (FIXED Jan 20 2026)`
3. **Test iOS app** - ask "what do you see?"
4. **If working:** 🎉
5. **If not:** Check logs for specific errors, continue debugging

---

# CONTACT POINTS

- **Repository:** https://github.com/Sto3/personalizedoutput
- **Production Domain:** redialways.com
- **Server Hosting:** Render
- **iOS Distribution:** TestFlight

---

# END OF TRANSFER DOCUMENT

This document should give the next Claude session everything needed to:
1. Understand the project
2. Know what was just fixed
3. Verify the fix worked
4. Continue debugging if needed

Good luck! 🚀
