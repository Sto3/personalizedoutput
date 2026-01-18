#!/bin/bash
# create-audit-zip.sh
# Creates a zip file for Claude chat audit that includes:
# 1. Source code
# 2. TypeScript compilation output (with any errors)
# 3. Test output (if tests exist)
# 4. iOS build output (optional)

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="/tmp/redi-audit-$TIMESTAMP"
ZIP_NAME="redi-audit-$TIMESTAMP.zip"

echo "🔍 Creating audit package..."
mkdir -p "$OUTPUT_DIR"

# === 1. RUN TYPESCRIPT BUILD AND CAPTURE OUTPUT ===
echo "📦 Running TypeScript build..."
cd /Users/matthewriley/PersonalizedOutput

# Run build and capture both stdout and stderr
npm run build > "$OUTPUT_DIR/BUILD_OUTPUT.txt" 2>&1 || true

# Check if build succeeded
if grep -q "error TS" "$OUTPUT_DIR/BUILD_OUTPUT.txt"; then
    echo "❌ TypeScript errors found - included in BUILD_OUTPUT.txt"
else
    echo "✅ TypeScript build passed"
fi

# === 2. RUN TESTS (if they exist) ===
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "🧪 Running tests..."
    npm test > "$OUTPUT_DIR/TEST_OUTPUT.txt" 2>&1 || true

    if grep -qE "(FAIL|Error|failed)" "$OUTPUT_DIR/TEST_OUTPUT.txt"; then
        echo "❌ Test failures found - included in TEST_OUTPUT.txt"
    else
        echo "✅ Tests passed"
    fi
else
    echo "⏭️ No tests configured, skipping"
fi

# === 3. COPY RELEVANT SOURCE FILES ===
echo "📁 Copying source files..."

# Backend TypeScript
mkdir -p "$OUTPUT_DIR/src"
cp -r src/lib "$OUTPUT_DIR/src/" 2>/dev/null || true
cp -r src/websocket "$OUTPUT_DIR/src/" 2>/dev/null || true
cp -r src/api "$OUTPUT_DIR/src/" 2>/dev/null || true

# Config files
cp tsconfig.json "$OUTPUT_DIR/" 2>/dev/null || true
cp package.json "$OUTPUT_DIR/" 2>/dev/null || true

# iOS files (Redi-specific)
mkdir -p "$OUTPUT_DIR/ios-app/Redi"
cp -r ios-app/Redi/Models "$OUTPUT_DIR/ios-app/Redi/" 2>/dev/null || true
cp -r ios-app/Redi/Services "$OUTPUT_DIR/ios-app/Redi/" 2>/dev/null || true
cp -r ios-app/Redi/ViewModels "$OUTPUT_DIR/ios-app/Redi/" 2>/dev/null || true
cp -r ios-app/Redi/V3 "$OUTPUT_DIR/ios-app/Redi/" 2>/dev/null || true
cp -r ios-app/Redi/Driving "$OUTPUT_DIR/ios-app/Redi/" 2>/dev/null || true

# === 4. iOS BUILD (optional - takes longer) ===
if [ "$1" == "--ios" ]; then
    echo "🍎 Running iOS build (this may take a minute)..."
    cd /Users/matthewriley/PersonalizedOutput/ios-app

    xcodebuild -project Redi/Redi.xcodeproj \
        -scheme Redi \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        build 2>&1 | tee "$OUTPUT_DIR/IOS_BUILD_OUTPUT.txt" | grep -E "(error:|warning:|BUILD)" || true

    if grep -q "BUILD FAILED" "$OUTPUT_DIR/IOS_BUILD_OUTPUT.txt"; then
        echo "❌ iOS build failed - errors in IOS_BUILD_OUTPUT.txt"
    else
        echo "✅ iOS build passed"
    fi

    cd /Users/matthewriley/PersonalizedOutput
fi

# === 5. CREATE SUMMARY FILE ===
echo "📝 Creating summary..."
cat > "$OUTPUT_DIR/AUDIT_SUMMARY.md" << 'SUMMARY'
# Redi Audit Package

## Files Included

### Build Output
- `BUILD_OUTPUT.txt` - TypeScript compilation output (check for `error TS` lines)
- `TEST_OUTPUT.txt` - Test results (if tests ran)
- `IOS_BUILD_OUTPUT.txt` - iOS build output (if --ios flag used)

### Source Code
- `src/` - Backend TypeScript source
- `ios-app/` - iOS Swift source

## How to Audit

1. **First check BUILD_OUTPUT.txt** for any TypeScript errors
2. **Check TEST_OUTPUT.txt** for test failures
3. **Review source code** for:
   - Missing switch cases (search for `switch` and verify all RediMode cases)
   - Type mismatches
   - Consistency across files

## Common Issues to Look For

- `Record<RediMode, ...>` missing modes
- Switch statements missing cases (especially 'driving')
- Property name mismatches (e.g., `detectedObjects` vs `objects`)
- Import errors

SUMMARY

# === 6. CREATE ZIP ===
echo "🗜️ Creating zip file..."
cd /tmp
zip -r "$ZIP_NAME" "redi-audit-$TIMESTAMP" -x "*.DS_Store"

# Move to Desktop
mv "$ZIP_NAME" ~/Desktop/

echo ""
echo "✅ Audit package created: ~/Desktop/$ZIP_NAME"
echo ""
echo "Contents:"
ls -la "$OUTPUT_DIR"
echo ""
echo "To include iOS build, run: ./scripts/create-audit-zip.sh --ios"
