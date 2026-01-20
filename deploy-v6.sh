#!/bin/bash
#
# REDI V6 DEPLOYMENT
# ==================
# Run this EXACTLY as-is. Do not modify anything.
#

set -e

echo "=========================================="
echo "REDI V6 DEPLOYMENT"
echo "=========================================="

# Step 1: Copy V6 server file
echo "Step 1: Deploying V6 server..."
cp rediV6Server.ts src/websocket/rediV6Server.ts
echo "  ✅ Server file copied"

# Step 2: Add V6 to server.ts imports and init
echo "Step 2: Adding V6 to server.ts..."

# Check if already imported
if grep -q "rediV6Server" src/server.ts; then
    echo "  ℹ️  V6 already imported"
else
    # Add import after V5 import
    sed -i.bak "/rediV5Server/a\\
import { initRediV6, closeRediV6 } from './websocket/rediV6Server';" src/server.ts
    rm -f src/server.ts.bak
    echo "  ✅ Import added"
fi

# Check if already initialized
if grep -q "initRediV6" src/server.ts; then
    echo "  ℹ️  V6 already initialized"
else
    # Add init after V5 init
    sed -i.bak "/initRediV5/a\\
  initRediV6(server);" src/server.ts
    rm -f src/server.ts.bak
    echo "  ✅ Init added"
fi

# Step 3: Create iOS V6 folder and config
echo "Step 3: Creating iOS V6 files..."
mkdir -p ios-app/Redi/Services/V6
cp V6Config.swift ios-app/Redi/Services/V6/V6Config.swift
echo "  ✅ V6Config.swift created"

# Step 4: Update V5Config to point to V6 (quick test)
echo "Step 4: Updating V5Config to use V6 endpoint..."
sed -i.bak 's|wss://redialways.com/ws/redi?v=5|wss://redialways.com/ws/redi?v=6|g' ios-app/Redi/Services/V5/V5Config.swift
rm -f ios-app/Redi/Services/V5/V5Config.swift.bak
echo "  ✅ V5Config now points to V6"

# Step 5: Commit and push
echo "Step 5: Committing..."
git add -A
git commit -m "Deploy Redi V6 - clean implementation"
git push

echo ""
echo "=========================================="
echo "✅ V6 DEPLOYED"
echo "=========================================="
echo ""
echo "Wait 2-3 minutes for Render to rebuild."
echo "Then rebuild iOS app in Xcode and test."
echo ""
echo "Server should show:"
echo "  [Redi V6] WebSocket server initialized on /ws/redi?v=6"
echo ""
