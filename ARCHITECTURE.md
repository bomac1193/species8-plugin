# Species 8 - Technical Architecture

## Overview

Species 8 is a prompt-driven audio effect plugin built with JUCE. It translates natural language descriptions into DSP parameter adjustments, allowing intuitive sound design through text prompts.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│              Species8AudioProcessorEditor           │
│  ┌──────────────────────────────────────────────┐  │
│  │         DragDropComponent                    │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │       WaveformDisplay                  │ │  │
│  │  │   (Shows loaded audio buffer)          │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Text Prompt Input] [MUTATE Button]              │
│                                                     │
│  [Dry/Wet Knob] [Output Knob] [Bypass Toggle]    │
└─────────────────────────────────────────────────────┘
                        │
                        ├─ onMutateClick()
                        ↓
┌─────────────────────────────────────────────────────┐
│         Species8AudioProcessor                      │
│                                                      │
│  updateParametersFromPrompt(prompt)                │
│    ↓                                                │
│  Keyword Matching Engine                           │
│    ├─ "wider" → widthAmount += 0.2                │
│    ├─ "less muddy" → mudAmount += 0.2             │
│    ├─ "brighter" → brightnessAmount += 0.2        │
│    └─ "space" → spaceAmount += 0.2                │
│                                                      │
│  updateDSPFromParameters()                          │
│    ↓                                                │
│  ┌────────────────────────────────────────────┐   │
│  │          DSP Processor Chain               │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  1. High-Pass Filter (IIR)           │ │   │
│  │  │     20Hz - 200Hz (mud reduction)     │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  2. High-Shelf Filter (IIR)          │ │   │
│  │  │     ±6dB @ 4kHz (brightness)         │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  3. StereoWidthProcessor             │ │   │
│  │  │     M/S encoding (0-2x width)        │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  4. Reverb                           │ │   │
│  │  │     Room size + damping (space)      │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
│  DryWetMixer (0-100%)                               │
│  OutputGain (-24dB to +24dB)                        │
└─────────────────────────────────────────────────────┘
                        │
                        ↓
                  Audio Output
```

## Component Breakdown

### 1. Species8AudioProcessor

**Responsibilities**:
- Main audio processing engine
- Parameter management via `AudioProcessorValueTreeState`
- DSP chain orchestration
- Audio file loading
- Prompt parsing and keyword matching

**Key Methods**:
- `processBlock()` - Main audio processing loop
- `updateParametersFromPrompt()` - Parses text and updates parameters
- `updateDSPFromParameters()` - Applies parameters to DSP chain
- `loadAudioFile()` - Loads audio for visualization

**Parameters** (all 0.0-1.0 unless noted):
- `dryWet` - Mix between dry and wet signal
- `outputGain` - Output level (-24dB to +24dB)
- `bypass` - Boolean bypass toggle
- `mudAmount` - High-pass filter intensity
- `brightnessAmount` - High-shelf filter intensity
- `widthAmount` - Stereo width multiplier
- `spaceAmount` - Reverb mix amount

### 2. Species8AudioProcessorEditor

**Responsibilities**:
- User interface rendering
- User input handling
- Visual feedback
- Parameter control attachments

**UI Elements**:
- Title and subtitle labels
- Drag & drop area (DragDropComponent)
- Text prompt input field
- MUTATE button (triggers prompt parsing)
- Parameter knobs (dry/wet, output)
- Bypass toggle

**Styling**:
- Dark theme (background: #03030b, #0b1223)
- Purple accent colors (#9f7bff, #d5c7ff)
- Custom slider, button, and label styling

### 3. StereoWidthProcessor

**Responsibilities**:
- Mid/Side encoding and decoding
- Stereo width manipulation
- Smoothed parameter changes

**Algorithm**:
```cpp
// Convert L/R to M/S
mid = (left + right) * 0.5
side = (left - right) * 0.5

// Apply width
side *= widthMultiplier  // 0.0 (mono) to 2.0 (wide)

// Convert M/S back to L/R
left = mid + side
right = mid - side
```

### 4. WaveformDisplay

**Responsibilities**:
- Visual representation of loaded audio
- Real-time waveform rendering
- Placeholder text when empty

**Rendering**:
- Samples audio buffer at pixel resolution
- Calculates min/max per pixel for efficient rendering
- Draws using `juce::Path` with gradient fill and stroke

### 5. DragDropComponent

**Responsibilities**:
- File drag and drop handling
- File validation (WAV, AIFF, MP3, etc.)
- Integration with audio processor
- Visual feedback during drag

## DSP Signal Flow

```
Input Audio
    ↓
[Buffer Copy] ────────────────────┐ (Dry signal)
    ↓                              │
[High-Pass Filter]                 │
    ↓                              │
[High-Shelf Filter]                │
    ↓                              │
[Stereo Width Processor]           │
    ↓                              │
[Reverb]                           │
    ↓                              │
[Wet Signal] ──────────────────────┤
                                   ↓
                          [DryWetMixer]
                                   ↓
                          [Output Gain]
                                   ↓
                            Output Audio
```

## Prompt Parsing Algorithm

**Current Implementation** (Keyword-based):

```cpp
void updateParametersFromPrompt(String prompt)
{
    prompt = prompt.toLowerCase();

    // Width detection
    if (prompt.contains("wider") || prompt.contains("wide"))
        widthAmount += 0.2f;

    // Mud detection
    if (prompt.contains("less muddy") || prompt.contains("clearer"))
        mudAmount += 0.2f;

    // Brightness detection
    if (prompt.contains("brighter") || prompt.contains("crisp"))
        brightnessAmount += 0.2f;

    // Space detection
    if (prompt.contains("space") || prompt.contains("plastic"))
        spaceAmount += 0.2f;

    // Clamp all values to [0.0, 1.0]
    // Apply to DSP chain
}
```

**Limitations**:
- Simple substring matching
- No semantic understanding
- No negation handling beyond specific phrases
- No intensity modifiers (e.g., "very wide" vs "slightly wide")

**Future Enhancements**:
- NLP-based parsing (word embeddings, transformers)
- Sentiment analysis for intensity
- Context-aware parameter adjustment
- Learning from user corrections

## Thread Safety

**Audio Thread** (Real-time):
- `processBlock()` - Processes audio samples
- Reads atomic parameter values
- No allocations or locks in audio path

**Message Thread** (GUI):
- Parameter updates from UI controls
- Prompt parsing and parameter changes
- File loading operations

**Synchronization**:
- `std::atomic<float>*` for parameter access
- `AudioProcessorValueTreeState` handles thread-safe updates
- `juce::SmoothedValue` for click-free parameter transitions

## Performance Considerations

**CPU Usage**:
- High-pass filter: ~1% CPU
- High-shelf filter: ~1% CPU
- Stereo width: <1% CPU
- Reverb: ~5-15% CPU (depends on room size)
- Total: ~8-20% CPU @ 44.1kHz, 512 samples/buffer

**Memory**:
- Loaded audio buffer: Variable (depends on file size)
- DSP state: ~100KB
- GUI components: ~50KB
- Total: <1MB + audio buffer

**Latency**:
- Processing latency: <1ms
- Reverb tail: Up to 2 seconds
- Total plugin latency: ~10ms (depending on buffer size)

## File Formats Supported

**Audio Loading**:
- WAV (PCM, 16/24/32-bit)
- AIFF (PCM)
- MP3 (via JUCE MP3 decoder)
- FLAC (lossless)
- OGG (Vorbis)

**Plugin Formats**:
- VST3 (Windows, macOS, Linux)
- AU (macOS only)
- Standalone (all platforms)

## Build Targets

**Platforms**:
- macOS (10.13+): VST3, AU, Standalone
- Windows (10+): VST3, Standalone
- Linux: VST3, Standalone

**Compilers**:
- Clang 6+ (macOS, Linux)
- GCC 7+ (Linux)
- MSVC 2019+ (Windows)

## Future Architecture Improvements

1. **AI/ML Integration**:
   - Embed small transformer model for prompt understanding
   - Train on audio descriptor dataset
   - Real-time parameter prediction

2. **Modular DSP**:
   - Plugin-able DSP modules
   - User-defined processing chains
   - Preset system

3. **Advanced Visualization**:
   - Spectral analyzer
   - Real-time parameter activity display
   - Prompt history and favorites

4. **MIDI Integration**:
   - Sample triggering via MIDI
   - Parameter automation via CC
   - Preset switching via program change

5. **Multi-instance Support**:
   - Global preset sharing
   - Instance synchronization
   - Session management

---

**Last Updated**: 2025-11-28
**Version**: 1.0.0
