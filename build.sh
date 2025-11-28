#!/bin/bash
# Species 8 - Quick Build Script
# Run this to build the plugin quickly

set -e  # Exit on error

echo "🧬 Species 8 - Build Script"
echo "=========================="
echo ""

# Check if JUCE directory exists
if [ ! -d "JUCE" ]; then
    echo "⚠️  JUCE directory not found!"
    echo "Do you want to download JUCE via git submodule? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "📥 Downloading JUCE..."
        git submodule add https://github.com/juce-framework/JUCE.git
        git submodule update --init --recursive
        echo "✅ JUCE downloaded"
    else
        echo "❌ Please download JUCE manually and place it in the project directory"
        echo "   Or update CMakeLists.txt to use system JUCE installation"
        exit 1
    fi
fi

# Create build directory
echo "📁 Creating build directory..."
mkdir -p build
cd build

# Run CMake
echo "⚙️  Running CMake..."
cmake ..

# Build
echo "🔨 Building Species 8..."
cmake --build . --config Release

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Plugin locations:"
if [ "$(uname)" == "Darwin" ]; then
    echo "   VST3: build/Species8_artefacts/Release/VST3/Species8.vst3"
    echo "   AU:   build/Species8_artefacts/Release/AU/Species8.component"
    echo ""
    echo "To install, run:"
    echo "   ./install.sh"
elif [ "$(uname)" == "Linux" ]; then
    echo "   VST3: build/Species8_artefacts/Release/VST3/Species8.vst3"
    echo ""
    echo "To install, run:"
    echo "   cp -r build/Species8_artefacts/Release/VST3/Species8.vst3 ~/.vst3/"
else
    echo "   VST3: build\\Species8_artefacts\\Release\\VST3\\Species8.vst3"
fi

echo ""
echo "🎵 Species 8 is ready to mutate your sounds!"
