# Species 8 - Sound Design Plugin

**Break the norm. Birth the impossible.**

Species 8 is a JUCE-based audio plugin (VST3/AU/Standalone) that allows users to transform audio using natural language prompts. Drop in an audio file, type a description like "wider, less muddy, brighter, plastic space" and hit **MUTATE** to evolve your sound.

![Species 8 Plugin](docs/screenshot.png)

## New Hybrid Architecture (Preview)

We are in the middle of moving Species 8 to a **hybrid architecture**:

- `dsp-engine/` (this JUCE project) remains the native audio brain.
- `web-ui/` now contains the **glassmorphic V0 template** (React/Tailwind) for the AI prompt and drag-and-drop hero section.
- `server/` is a lightweight Node/Express/WebSocket bridge. It already exposes `/mutate`, `/mutations`, `/preview/waveform`, and pushes job updates over WebSockets. Right now the bridge simulates DSP output; next we’ll swap in the real JUCE process behind the same interface.

This split gives us the best of both worlds: a pixel-perfect, GPU-accelerated UI and a native DSP core for ultra-low-latency audio mutation.

### Running the preview stack

> Requirements: Node 18+, npm, and (optionally) pnpm/yarn.

```bash
# 1. Start the server bridge
cd server
npm install
npm run dev

# 2. In another terminal, launch the web UI (Next.js template)
cd ../web-ui
npm install
npm run dev
```

The UI will open at http://localhost:3000 and talks to the bridge on http://localhost:4000 (health + mutation queues). This is the same V0 glassmorphic layout you referenced; we’ll wire it to the DSP engine in the next iteration.

> The legacy JUCE standalone is still available in `build/Species8_artefacts/Standalone/Species 8`, but that UI will soon become headless once the bridge is complete.

## Features

- **🎵 Drag & Drop Audio Loading**: Load WAV, AIFF, MP3, FLAC files directly into the plugin
- **📊 Waveform Visualization**: See your loaded audio in real-time
- **💬 Natural Language Prompts**: Describe your desired sound in plain English
- **🧬 Intelligent DSP Chain**: Prompt-driven processing with:
  - High-pass filtering (mud reduction)
  - High-shelf EQ (brightness control)
  - M/S stereo width processing
  - Binaural orbit spatializer for 8D-style motion
  - Reverb (space/plastic effects)
- **🎛️ Manual Controls**: Dry/Wet mix, Output Gain, and Bypass
- **🎨 Futuristic UI**: Dark theme with purple accents

## Supported Keywords

### Width
- `wider`, `wide`, `8d` → Increases stereo width
- `narrow`, `mono` → Decreases stereo width

### Clarity / Mud
- `less muddy`, `clearer`, `clean`, `clarity` → Reduces low-end mud
- `more muddy`, `muddy`, `warm` → Adds warmth/low-end

### Brightness
- `brighter`, `bright`, `crisp`, `shine` → Increases high frequencies
- `darker`, `dark`, `dull` → Reduces high frequencies

### Space
- `space`, `reverb`, `plastic`, `high-tech` → Adds reverb and space
- `dry`, `intimate`, `close` → Reduces reverb

### Immersive Motion
- `8d`, `orbit`, `around`, `immersive`, `binaural` → Enables the binaural orbit engine for moving 3D sound
- `static`, `center`, `mono` → Keeps the sound anchored in front

## Building from Source

### Prerequisites

1. **JUCE Framework** (v7.0 or later)
   - Download from [JUCE.com](https://juce.com/get-juce)
   - Or install via package manager

2. **C++ Compiler**
   - macOS: Xcode 12+ with command line tools
   - Windows: Visual Studio 2019+ or MSVC
   - Linux: GCC 7+ or Clang 6+

3. **CMake** (v3.15 or later) - Optional, if using CMake build

### Method 1: Using Projucer (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/species8-plugin.git
   cd species8-plugin
   ```

2. **Open Projucer**:
   - Launch Projucer from your JUCE installation
   - Open `Species8.jucer` (if provided) or create a new project:
     - Project Type: "Audio Plug-In"
     - Project Name: "Species8"
     - Add all source files from `Source/` directory

3. **Configure module paths**:
   - Set JUCE module path to your JUCE installation
   - Enable VST3, AU, and Standalone formats

4. **Export project**:
   - Select your IDE (Xcode, Visual Studio, Linux Makefile)
   - Click "Save Project and Open in IDE"

5. **Build in your IDE**:
   - Xcode: Select scheme and build (⌘B)
   - Visual Studio: Build solution (F7)
   - Make: Run `make CONFIG=Release`

### Method 2: Using CMake

1. **Clone and prepare**:
   ```bash
   git clone https://github.com/yourusername/species8-plugin.git
   cd species8-plugin
   ```

2. **Add JUCE to the project**:

   Option A - Using JUCE as a subdirectory:
   ```bash
   git submodule add https://github.com/juce-framework/JUCE.git
   git submodule update --init --recursive
   ```

   Option B - System-wide JUCE:
   Make sure JUCE is installed and CMake can find it via `find_package(JUCE)`

3. **Update CMakeLists.txt**:
   Uncomment the appropriate JUCE integration method in `CMakeLists.txt`:
   ```cmake
   # For submodule approach:
   add_subdirectory(JUCE)

   # OR for system installation:
   # find_package(JUCE CONFIG REQUIRED)
   ```

4. **Build**:
   ```bash
   mkdir build
   cd build
   cmake ..
   cmake --build . --config Release
   ```

5. **Install plugins**:
   - macOS: Plugins will be in `build/Species8_artefacts/`
     - VST3: Copy to `~/Library/Audio/Plug-Ins/VST3/`
     - AU: Copy to `~/Library/Audio/Plug-Ins/Components/`
   - Windows:
     - VST3: Copy to `C:\Program Files\Common Files\VST3\`
   - Linux:
     - VST3: Copy to `~/.vst3/`

## Project Structure

```
species8-plugin/
├── CMakeLists.txt              # CMake build configuration
├── README.md                   # This file
├── Species8.jucer              # Projucer project file (optional)
└── Source/
    ├── PluginProcessor.h       # Main audio processor header
    ├── PluginProcessor.cpp     # Audio processor implementation
    ├── PluginEditor.h          # GUI editor header
    ├── PluginEditor.cpp        # GUI implementation
    ├── StereoWidthProcessor.h  # Custom stereo width DSP
    ├── StereoWidthProcessor.cpp
    ├── WaveformDisplay.h       # Waveform visualization component
    ├── WaveformDisplay.cpp
    ├── DragDropComponent.h     # Drag & drop handler
    └── DragDropComponent.cpp
```

## Usage

1. **Load the plugin** in your DAW (Ableton, Logic, FL Studio, etc.)

2. **Drag an audio file** onto the waveform area
   - Supported formats: WAV, AIFF, MP3, FLAC, OGG

3. **Type a prompt** describing your desired sound:
   - Example: `"wider, less muddy, brighter"`
   - Example: `"plastic high-tech space"`
   - Example: `"darker, narrow, intimate"`

4. **Click MUTATE** to apply the transformation

5. **Adjust parameters**:
   - **Dry/Wet**: Mix between original and processed signal
   - **Output**: Final output gain (-24dB to +24dB)
   - **Bypass**: Toggle processing on/off

6. **Process audio** from your DAW through the plugin in real-time

## Architecture

### DSP Chain

```cpp
ProcessorChain<
    IIR::Filter,           // High-pass filter (20-200Hz, mud reduction)
    IIR::Filter,           // High-shelf filter (±6dB @ 4kHz, brightness)
    StereoWidthProcessor,  // M/S encoding with width control (0-2x)
    Reverb                 // Space effect (room size + damping)
>
```

### Prompt Parsing

The plugin uses simple keyword matching to adjust DSP parameters:

1. Text is converted to lowercase
2. Keywords are searched using `String::contains()`
3. Matching keywords adjust corresponding parameters by ±0.2 (clamped to 0-1 range)
4. Parameters are smoothed using `juce::SmoothedValue` to prevent clicks

This is **not** AI/ML-based (yet) - it's a deterministic keyword-to-parameter mapping system.

## Future Enhancements

- [ ] Add real AI/ML model for prompt interpretation
- [ ] Sample playback/trigger functionality
- [ ] More DSP modules (distortion, compression, chorus)
- [ ] Preset system for saving prompt-generated settings
- [ ] Visual feedback for active parameters
- [ ] MIDI control and automation
- [ ] Multi-band processing
- [ ] Spectral display

## Technical Specifications

- **Plugin Formats**: VST3, AU, Standalone
- **Sample Rates**: 44.1kHz - 192kHz
- **Bit Depth**: 32-bit float processing
- **Latency**: Minimal (<10ms)
- **CPU Usage**: Low-moderate (depends on reverb quality)
- **Thread Safety**: Full thread-safe parameter access

## License

This project is provided as-is for educational and commercial use.
Built with JUCE Framework (GPL/Commercial license).

## Credits

**Created by**: Your Name
**Framework**: [JUCE](https://juce.com/)
**Inspired by**: Modern AI-driven audio tools and the concept of evolutionary sound design

---

**Species 8** - *Where prompts become sonic reality.*
