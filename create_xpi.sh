#!/bin/bash
# create_xpi.sh - Package the Firefox extension as an XPI file

set -e

EXTENSION_NAME="ai-thinking-toggle"
VERSION="1.1.0"
OUTPUT_FILE="${EXTENSION_NAME}-${VERSION}.xpi"

echo "🔧 Packaging ${EXTENSION_NAME} v${VERSION}..."

# Files to include in the extension
FILES=(
    "manifest.json"
    "background.js"
    "cookie-manager.js"
    "captcha-solver.js"
    "logic.js"
    "claude.js"
    "grok.js"
    "deepseek.js"
    "chatgpt.js"
    "gemini.js"
    "googleaistudio.js"
    "popup.html"
    "popup.js"
)

# Create icons directory if it doesn't exist
mkdir -p icons

# Check for required files
echo "📋 Checking required files..."
MISSING_FILES=()
for file in "${FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        MISSING_FILES+=("$file")
    fi
done

# Create placeholder files for handlers that don't exist yet
HANDLER_FILES=("grok.js" "deepseek.js" "chatgpt.js" "gemini.js" "googleaistudio.js" "captcha-solver.js")
for handler in "${HANDLER_FILES[@]}"; do
    if [[ ! -f "$handler" ]]; then
        echo "📝 Creating placeholder: $handler"
        echo "// ${handler} - Placeholder handler" > "$handler"
        echo "// TODO: Implement platform-specific automation" >> "$handler"
        echo "console.log('[${handler%.js}] Handler loaded (placeholder)');" >> "$handler"
    fi
done

# Check for icons
if [[ ! -f "icons/icon-48.png" ]]; then
    echo "⚠️  Warning: icons/icon-48.png not found. Creating placeholder..."
    # Create a simple placeholder icon using ImageMagick if available
    if command -v convert &> /dev/null; then
        convert -size 48x48 xc:#667eea -fill white -gravity center \
            -pointsize 24 -annotate 0 "AI" icons/icon-48.png 2>/dev/null || true
    fi
fi

if [[ ! -f "icons/icon-96.png" ]]; then
    echo "⚠️  Warning: icons/icon-96.png not found. Creating placeholder..."
    if command -v convert &> /dev/null; then
        convert -size 96x96 xc:#667eea -fill white -gravity center \
            -pointsize 48 -annotate 0 "AI" icons/icon-96.png 2>/dev/null || true
    fi
fi

# Remove old XPI if exists
if [[ -f "$OUTPUT_FILE" ]]; then
    echo "🗑️  Removing old ${OUTPUT_FILE}..."
    rm "$OUTPUT_FILE"
fi

# Create the XPI (which is just a ZIP file)
echo "📦 Creating ${OUTPUT_FILE}..."
zip -r "$OUTPUT_FILE" \
    manifest.json \
    background.js \
    cookie-manager.js \
    captcha-solver.js \
    logic.js \
    claude.js \
    grok.js \
    deepseek.js \
    chatgpt.js \
    gemini.js \
    googleaistudio.js \
    popup.html \
    popup.js \
    icons/ \
    -x "*.DS_Store" \
    -x "__MACOSX/*" \
    -x "*.git*"

# Verify the package
echo ""
echo "📋 Package contents:"
unzip -l "$OUTPUT_FILE"

echo ""
echo "✅ Successfully created: ${OUTPUT_FILE}"
echo ""
echo "📌 Installation instructions:"
echo "   1. Open Firefox and navigate to: about:debugging"
echo "   2. Click 'This Firefox' in the left sidebar"
echo "   3. Click 'Load Temporary Add-on...'"
echo "   4. Select the ${OUTPUT_FILE} file"
echo ""
echo "   For permanent installation:"
echo "   1. Navigate to: about:addons"
echo "   2. Click the gear icon ⚙️"
echo "   3. Select 'Install Add-on From File...'"
echo "   4. Select the ${OUTPUT_FILE} file"
echo ""
echo "   Note: For permanent installation of unsigned extensions,"
echo "   you may need Firefox Developer Edition or ESR with"
echo "   xpinstall.signatures.required set to false in about:config"
