#!/bin/bash
# Redi V3 Backend Deployment Helper
# This script helps deploy the V3 backend to Render

echo "================================================"
echo "       Redi V3 Backend Deployment Helper        "
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Run this script from the backend-v3 directory"
    exit 1
fi

# Check for required environment variable
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not set in environment"
    echo "You'll need to set this in Render dashboard"
    echo ""
fi

echo "Deployment Options:"
echo ""
echo "1. RENDER DASHBOARD (Recommended):"
echo "   a. Go to https://dashboard.render.com/new/web"
echo "   b. Connect your GitHub repo: Sto3/personalizedoutput"
echo "   c. Select branch: v3-rebuild"
echo "   d. Set Root Directory: backend-v3"
echo "   e. Build Command: npm install && npm run build"
echo "   f. Start Command: npm start"
echo "   g. Add Environment Variable: OPENAI_API_KEY"
echo ""
echo "2. RENDER BLUEPRINT (One-Click):"
echo "   a. Go to https://dashboard.render.com/blueprints"
echo "   b. Click 'New Blueprint Instance'"
echo "   c. Select your repo and branch v3-rebuild"
echo "   d. It will auto-detect render.yaml in backend-v3/"
echo ""
echo "After deployment, update ios-app/Redi/V3/Config/V3Config.swift"
echo "with your new Render URL (e.g., wss://redi-v3.onrender.com)"
echo ""
echo "================================================"
