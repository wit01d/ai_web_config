#!/bin/bash
# Build script for Chrome extension (MV3)
# Creates a distributable zip file for Chrome Web Store or manual installation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/dist/chrome"
OUTPUT_FILE="$SCRIPT_DIR/dist/ai-thinking-toggle-chrome.zip"

echo "Building Chrome extension..."

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy Chrome-specific files
echo "Copying Chrome-specific files..."
cp "$SCRIPT_DIR/chrome/manifest.json" "$BUILD_DIR/"
cp "$SCRIPT_DIR/chrome/background.js" "$BUILD_DIR/"

# Copy shared files
echo "Copying shared files..."
cp "$SCRIPT_DIR/popup.html" "$BUILD_DIR/"
cp "$SCRIPT_DIR/popup.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/cookie-manager.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/captcha-solver.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/logic.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/claude.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/grok.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/deepseek.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/chatgpt.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/gemini.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/googleaistudio.js" "$BUILD_DIR/"

# Copy directories
echo "Copying icons and libraries..."
cp -r "$SCRIPT_DIR/icons" "$BUILD_DIR/"
cp -r "$SCRIPT_DIR/lib" "$BUILD_DIR/"

# Create zip for Chrome Web Store
echo "Creating zip archive..."
rm -f "$OUTPUT_FILE"
cd "$BUILD_DIR"
zip -r "$OUTPUT_FILE" . -x "*.DS_Store" -x "*__MACOSX*"
cd "$SCRIPT_DIR"

# Show build info
echo ""
echo "Build complete!"
echo "  Output directory: $BUILD_DIR"
echo "  Zip file: $OUTPUT_FILE"
echo ""
echo "To install in Chrome:"
echo "  1. Go to chrome://extensions"
echo "  2. Enable 'Developer mode'"
echo "  3. Click 'Load unpacked' and select: $BUILD_DIR"
echo "  Or drag the zip file to the extensions page"
