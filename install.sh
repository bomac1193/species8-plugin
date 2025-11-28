#!/bin/bash
# Species 8 - Installation Script for macOS

set -e

echo "🧬 Species 8 - Plugin Installer"
echo "==============================="
echo ""

# Check if build exists
if [ ! -d "build/Species8_artefacts" ]; then
    echo "❌ Build directory not found!"
    echo "Please run ./build.sh first"
    exit 1
fi

# Check OS
if [ "$(uname)" != "Darwin" ]; then
    echo "⚠️  This script is for macOS only"
    echo "For Linux, manually copy VST3 to ~/.vst3/"
    exit 1
fi

echo "Installing Species 8 plugins..."
echo ""

# Create plugin directories if they don't exist
mkdir -p ~/Library/Audio/Plug-Ins/VST3
mkdir -p ~/Library/Audio/Plug-Ins/Components

# Install VST3
if [ -d "build/Species8_artefacts/Release/VST3/Species8.vst3" ]; then
    echo "📦 Installing VST3..."
    cp -r build/Species8_artefacts/Release/VST3/Species8.vst3 ~/Library/Audio/Plug-Ins/VST3/
    echo "✅ VST3 installed to ~/Library/Audio/Plug-Ins/VST3/"
fi

# Install AU
if [ -d "build/Species8_artefacts/Release/AU/Species8.component" ]; then
    echo "📦 Installing AU..."
    cp -r build/Species8_artefacts/Release/AU/Species8.component ~/Library/Audio/Plug-Ins/Components/
    echo "✅ AU installed to ~/Library/Audio/Plug-Ins/Components/"
fi

# Install Standalone
if [ -d "build/Species8_artefacts/Release/Standalone/Species8.app" ]; then
    echo "📦 Installing Standalone App..."
    cp -r build/Species8_artefacts/Release/Standalone/Species8.app ~/Applications/
    echo "✅ Standalone installed to ~/Applications/"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Open your DAW (Logic, Ableton, etc.)"
echo "2. Rescan plugins if needed"
echo "3. Load 'Species 8' as an audio effect"
echo "4. Start mutating sounds! 🎵🧬"
