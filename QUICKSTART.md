# Species 8 - Quick Start Guide

## Fastest Way to Build (5 minutes)

### Step 1: Get JUCE

**Option A - Download JUCE** (easiest):
```bash
# Download JUCE from https://juce.com/get-juce
# Extract to a known location (e.g., ~/JUCE)
```

**Option B - Use git submodule**:
```bash
cd species8-plugin
git submodule add https://github.com/juce-framework/JUCE.git
```

### Step 2: Update CMakeLists.txt

Edit `CMakeLists.txt` and uncomment ONE of these lines (around line 10):

```cmake
# If using submodule:
add_subdirectory(JUCE)

# OR if JUCE is installed system-wide:
# find_package(JUCE CONFIG REQUIRED)
```

### Step 3: Build

**macOS/Linux**:
```bash
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

**Windows** (PowerShell):
```powershell
mkdir build; cd build
cmake ..
cmake --build . --config Release
```

### Step 4: Install Plugin

**macOS**:
```bash
# VST3
cp -r build/Species8_artefacts/Release/VST3/Species8.vst3 ~/Library/Audio/Plug-Ins/VST3/

# AU
cp -r build/Species8_artefacts/Release/AU/Species8.component ~/Library/Audio/Plug-Ins/Components/
```

**Windows**:
```powershell
# VST3
Copy-Item build/Species8_artefacts/Release/VST3/Species8.vst3 "C:\Program Files\Common Files\VST3\" -Recurse
```

**Linux**:
```bash
# VST3
cp -r build/Species8_artefacts/Release/VST3/Species8.vst3 ~/.vst3/
```

## Testing the Plugin

1. **Open your DAW** (Ableton, Logic, FL Studio, Reaper, etc.)

2. **Rescan plugins** if needed

3. **Load "Species 8"** as an audio effect on a track

4. **Try these prompts**:
   - `"wider brighter less muddy"`
   - `"plastic high-tech space"`
   - `"darker intimate warm"`
   - `"8d crisp clarity"`

5. **Drag an audio file** into the waveform area to visualize (optional)

## Common Build Issues

### "JUCE not found"
- Make sure you've uncommented the correct line in `CMakeLists.txt`
- For submodule: Ensure `JUCE/` directory exists
- For system install: Set `JUCE_DIR` environment variable

### "VST3 SDK not found"
- JUCE includes VST3 SDK, no separate download needed
- Make sure JUCE modules are properly linked

### Plugin doesn't appear in DAW
- Check plugin was copied to correct directory
- Rescan plugins in your DAW
- macOS: Check security settings (allow unsigned plugins)
- Windows: Run as administrator if needed

### Compile errors
- Make sure you're using C++17 or later
- Update JUCE to latest version
- Check compiler version meets JUCE requirements

## Next Steps

- Read full [README.md](README.md) for detailed documentation
- Experiment with different prompts
- Check DSP parameters in your DAW's automation view
- Customize the code to add your own keywords and effects

## Support

For issues or questions:
- Check [README.md](README.md)
- Open an issue on GitHub
- Consult JUCE documentation: https://docs.juce.com/

---

**Happy sound designing!** 🎵🧬
