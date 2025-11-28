# Species 8 - Prompt Examples & Guide

## How Prompts Work

Type keywords into the prompt field and click **MUTATE** to transform your sound. The plugin recognizes keywords and adjusts DSP parameters accordingly. You can combine multiple keywords for complex transformations.

## Keyword Reference

### Stereo Width

| Keyword | Effect | Parameter Change |
|---------|--------|------------------|
| `wider` | Increases stereo width | +0.2 to width |
| `wide` | Increases stereo width | +0.2 to width |
| `8d` | Increases stereo width (8D audio effect) | +0.2 to width |
| `narrow` | Decreases stereo width | -0.2 to width |
| `mono` | Decreases stereo width toward mono | -0.2 to width |

### Clarity / Mud Control

| Keyword | Effect | Parameter Change |
|---------|--------|------------------|
| `less muddy` | Reduces low-frequency mud | +0.2 to mud reduction |
| `clearer` | Removes low-end buildup | +0.2 to mud reduction |
| `clean` | Tightens low frequencies | +0.2 to mud reduction |
| `clarity` | Enhances clarity by filtering lows | +0.2 to mud reduction |
| `more muddy` | Adds warmth/low-end | -0.2 to mud reduction |
| `muddy` | Increases low-end presence | -0.2 to mud reduction |
| `warm` | Adds low-frequency warmth | -0.2 to mud reduction |

### Brightness

| Keyword | Effect | Parameter Change |
|---------|--------|------------------|
| `brighter` | Boosts high frequencies | +0.2 to brightness |
| `bright` | Adds sparkle and air | +0.2 to brightness |
| `crisp` | Enhances high-end definition | +0.2 to brightness |
| `shine` | Adds brilliance | +0.2 to brightness |
| `darker` | Reduces high frequencies | -0.2 to brightness |
| `dark` | Dulls high-end | -0.2 to brightness |
| `dull` | Removes sparkle | -0.2 to brightness |

### Space / Reverb

| Keyword | Effect | Parameter Change |
|---------|--------|------------------|
| `space` | Adds reverb and spatial depth | +0.2 to reverb |
| `reverb` | Increases reverb mix | +0.2 to reverb |
| `plastic` | Adds synthetic reverb character | +0.2 to reverb |
| `high-tech` | Creates futuristic space | +0.2 to reverb |
| `dry` | Reduces reverb | -0.2 to reverb |
| `intimate` | Removes space, brings close | -0.2 to reverb |
| `close` | Tight, dry sound | -0.2 to reverb |

## Example Prompts

### Electronic Music Production

```
"wider plastic high-tech"
→ Wide stereo, synthetic reverb, futuristic vibe
Good for: Synth pads, electronic leads
```

```
"8d crisp brighter"
→ Extra-wide stereo with enhanced highs
Good for: Atmospheric elements, background textures
```

```
"less muddy clean bright"
→ Clear, tight, and sparkly
Good for: Vocal processing, acoustic instruments
```

### Vocal Processing

```
"clearer brighter intimate"
→ Clear, bright, but kept upfront (no reverb)
Good for: Lead vocals, podcasts
```

```
"less muddy space shine"
→ Clean lows, spacious, with high-end sparkle
Good for: Background vocals, harmonies
```

```
"warm darker close"
→ Warm, dark, and intimate
Good for: Deep vocals, lo-fi aesthetics
```

### Experimental / Sound Design

```
"wider plastic space"
→ Wide, synthetic, and spacious
Good for: Sci-fi effects, ambient textures
```

```
"8d high-tech brighter less muddy"
→ Maximum width, futuristic, bright and clean
Good for: Experimental soundscapes
```

```
"darker muddy narrow"
→ Dark, warm, and centered
Good for: Grounding bass elements
```

### Mixing & Mastering

```
"clarity crisp"
→ Enhanced clarity and definition
Good for: Making elements cut through the mix
```

```
"less muddy clean"
→ Removes low-end buildup
Good for: Cleaning up muddy mixes
```

```
"brighter shine"
→ Adds air and presence
Good for: Making dull recordings sparkle
```

## Prompt Combinations

### The "Radio Ready" Combo
```
"less muddy brighter clarity"
```
**Effect**: Clean lows + enhanced highs + overall clarity
**Use**: Polished commercial sound

### The "8D Audio" Combo
```
"8d wider plastic space"
```
**Effect**: Maximum width + synthetic reverb
**Use**: Immersive headphone experience

### The "Lo-Fi" Combo
```
"darker warm narrow intimate"
```
**Effect**: Warm, dark, mono-ish, and close
**Use**: Vintage, nostalgic vibes

### The "Cinematic" Combo
```
"space plastic wide brighter"
```
**Effect**: Spacious, wide, bright, and synthetic
**Use**: Film scores, epic builds

### The "Podcast" Combo
```
"clearer less muddy intimate"
```
**Effect**: Clear voice, reduced mud, upfront
**Use**: Voice-over, podcasting

## Tips for Best Results

1. **Start Simple**: Begin with 1-2 keywords, then add more
2. **Iterate**: Click MUTATE multiple times to gradually increase effect
3. **Combine Opposites**: Mix "wide" with "intimate" for interesting effects
4. **Use Dry/Wet**: Control the intensity with the Dry/Wet knob
5. **Experiment**: Try unconventional combinations!

## Understanding Parameter Changes

Each keyword adjusts a parameter by **±0.2** (on a 0.0-1.0 scale):
- Parameters are clamped to 0.0-1.0 range
- Multiple clicks accumulate changes
- Use opposing keywords to reverse effects

Example:
- Start: `widthAmount = 0.5`
- Prompt: `"wider"` → `widthAmount = 0.7`
- Prompt: `"wider"` again → `widthAmount = 0.9`
- Prompt: `"narrow"` → `widthAmount = 0.7`

## Advanced Techniques

### Incremental Mutation
Click MUTATE multiple times with the same prompt to gradually intensify the effect:
```
Click 1: "brighter" → +0.2 brightness
Click 2: "brighter" → +0.4 brightness
Click 3: "brighter" → +0.6 brightness
```

### Prompt Reversal
Use opposing keywords to undo changes:
```
"wider brighter" → Wide and bright
"narrow darker"  → Returns toward original
```

### Keyword Stacking
Combine many keywords for complex transformations:
```
"8d plastic high-tech brighter less muddy clarity crisp"
→ Maximum futuristic processing
```

## What's NOT Supported (Yet)

- ❌ Intensity modifiers (`"very wide"`, `"slightly bright"`)
- ❌ Negations (`"not muddy"` - use `"less muddy"` instead)
- ❌ Continuous values (`"50% wider"`)
- ❌ Contextual understanding (`"make it sound expensive"`)
- ❌ Learning from feedback

These features are planned for future AI/ML-powered versions!

## Contributing Your Own Keywords

Want to add custom keywords? Edit `PluginProcessor.cpp` in the `updateParametersFromPrompt()` method:

```cpp
// Add your custom keyword
if (prompt.contains ("yourKeyword"))
{
    yourParameter->store (newValue);
}
```

## Prompt Library

Share your best prompts with the community! Open an issue on GitHub with:
- Prompt text
- Use case
- Audio example (optional)

---

**Remember**: Species 8 is about experimentation. There are no wrong prompts—only new sounds waiting to be discovered! 🧬🎵
