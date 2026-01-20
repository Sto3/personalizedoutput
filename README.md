# Redi V6 Deployment

## INSTRUCTIONS FOR CLAUDE CODE

Run this ONE command from the repo root:

```bash
chmod +x deploy-v6.sh && ./deploy-v6.sh
```

That's it. Do not modify anything. Just run the script.

## What This Does

1. Copies `rediV6Server.ts` to `src/websocket/`
2. Adds V6 import and init to `src/server.ts`
3. Creates `ios-app/Redi/Services/V6/V6Config.swift`
4. Updates V5Config to point to V6 endpoint (for testing)
5. Commits and pushes to trigger Render deploy

## After Deployment

1. Wait 2-3 min for Render to rebuild
2. Check Render logs for: `[Redi V6] WebSocket server initialized`
3. Clean build iOS in Xcode: `Cmd+Shift+K` then `Cmd+R`
4. Test - ask Redi "what do you see?"

## What's Different in V6

- Correct OpenAI Realtime API format (no more "Unknown parameter" errors)
- Image injection happens when user stops speaking
- Cleaner, minimal code (~250 lines vs 800+)
- Better logging to trace issues
