#!/bin/bash

# =============================================================================
# Redi Logo Installation Script
# =============================================================================

SOURCE_DIR="$HOME/Desktop/ClaudeKnowledge"
PROJECT_DIR="/Users/matthewriley/PersonalizedOutput/ios-app/Redi"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "Redi Logo Installation Script"
echo "=========================================="
echo ""
echo "Source: $SOURCE_DIR"
echo "Target: $PROJECT_DIR"
echo ""

# Create target directories
mkdir -p "$PROJECT_DIR/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$PROJECT_DIR/Assets.xcassets/SplashImage.imageset"

SUCCESS=true

# Copy app icons
echo "Copying app icons..."
if [ -f "$SOURCE_DIR/redi_app_icon_1024.png" ]; then
    cp "$SOURCE_DIR/redi_app_icon_1024.png" "$PROJECT_DIR/Assets.xcassets/AppIcon.appiconset/"
    echo -e "${GREEN}  ✓ App icon (dark) copied${NC}"
else
    echo -e "${RED}  ✗ redi_app_icon_1024.png not found${NC}"
    SUCCESS=false
fi

if [ -f "$SOURCE_DIR/redi_app_icon_1024_light.png" ]; then
    cp "$SOURCE_DIR/redi_app_icon_1024_light.png" "$PROJECT_DIR/Assets.xcassets/AppIcon.appiconset/"
    echo -e "${GREEN}  ✓ App icon (light) copied${NC}"
else
    echo -e "${RED}  ✗ redi_app_icon_1024_light.png not found${NC}"
    SUCCESS=false
fi

# Copy splash screen images
echo "Copying splash screen images..."
if [ -f "$SOURCE_DIR/redi_splash_dark.png" ]; then
    cp "$SOURCE_DIR/redi_splash_dark.png" "$PROJECT_DIR/Assets.xcassets/SplashImage.imageset/"
    echo -e "${GREEN}  ✓ Dark splash image copied${NC}"
else
    echo -e "${RED}  ✗ redi_splash_dark.png not found${NC}"
    SUCCESS=false
fi

if [ -f "$SOURCE_DIR/redi_splash_light.png" ]; then
    cp "$SOURCE_DIR/redi_splash_light.png" "$PROJECT_DIR/Assets.xcassets/SplashImage.imageset/"
    echo -e "${GREEN}  ✓ Light splash image copied${NC}"
else
    echo -e "${RED}  ✗ redi_splash_light.png not found${NC}"
    SUCCESS=false
fi

echo ""
if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}All images copied successfully!${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo ""
    echo "Next: Open Xcode and build!"
else
    echo -e "${RED}Some files were missing. Check the source folder.${NC}"
fi
