// Species 8 — AI Prompt Brain
// Interprets creative text prompts into structured DSP parameters
// using Claude Haiku via the Anthropic Messages API (native fetch).

import { buildCatalogDescription, listEffects } from "./effectLibrary.js"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-haiku-4-5-20251001"
const MAX_TOKENS = 1024
const TEMPERATURE = 0.7
const TIMEOUT_MS = 5000

export default class PromptBrain {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.catalog = buildCatalogDescription()
    this.availableEffects = listEffects()
  }

  /**
   * Interpret a creative prompt into structured DSP parameters.
   * Returns null on failure (caller falls back to keyword matching).
   * @param {string} prompt - user's creative text prompt
   * @param {boolean} isMultiFile - true when merging multiple audio files
   */
  async interpret(prompt, isMultiFile = false) {
    if (!this.apiKey) return null

    const mergeSection = isMultiFile ? `

# Merge Physics (MULTI-FILE MODE)
Multiple audio files are being merged. You MUST also return a "mergePhysics" object controlling how the files interact spectrally. The dominant file (loudest/most transient) claims territory; submissive files are shaped around it.

## Physics Weights (all 0.0–1.0)
- territoriality: How aggressively the dominant claims frequency space. High = dominant carves out space, submissive ducks. (aggressive/battle → 0.7-1.0, gentle/blend → 0.1-0.3)
- timbre_transfer: Dominant's spectral envelope bleeds onto submissive (vocoder-like). (dreamy/melt → 0.5-0.8, clean/separate → 0.0-0.1)
- harmonic_infection: Dominant's overtones additively bleed into submissive over time. (haunting/possessed → 0.4-0.7, pure/clean → 0.0-0.1)
- gravitational_pull: Pitch-shift submissive toward dominant's key. (unified/harmonious → 0.5-0.8, dissonant/chaotic → 0.0-0.1)
- phase_entanglement: Force phase coherence where both have energy. (fused/locked → 0.3-0.6, loose/organic → 0.0-0.1)
- temporal_magnetism: Snap submissive transients to dominant's rhythmic grid. (rhythmic/locked → 0.6-0.9, free/floating → 0.0-0.2)

## Mood Mapping Examples
- "make them fight" → high territoriality (0.8), low timbre_transfer (0.1)
- "melt them together" → high timbre_transfer (0.7), high gravitational_pull (0.6)
- "dreamy blend" → timbre_transfer 0.5, phase_entanglement 0.3, temporal_magnetism 0.1
- "rhythmic lock" → temporal_magnetism 0.8, territoriality 0.4
- "possessed" → harmonic_infection 0.6, timbre_transfer 0.4, phase_entanglement 0.4
- "clean layer" → all low (0.1-0.2), let each track breathe` : ""

    const mergeFormat = isMultiFile ? `,
  "mergePhysics": {
    "territoriality": <0.0-1.0>,
    "timbre_transfer": <0.0-1.0>,
    "harmonic_infection": <0.0-1.0>,
    "gravitational_pull": <0.0-1.0>,
    "phase_entanglement": <0.0-1.0>,
    "temporal_magnetism": <0.0-1.0>
  }` : ""

    const systemPrompt = `You are the AI brain of Species 8, a sound mutation engine. Given a creative text prompt describing how audio should be transformed, you select and configure DSP effects to achieve that sonic vision.

${this.catalog}
${mergeSection}

# Rules
1. Return ONLY valid JSON — no markdown, no explanation outside the JSON.
2. Select 1–6 effects from the catalog above. Use exact effect names.
3. For each effect, provide parameters within the documented ranges.
4. Think creatively — map abstract/poetic descriptions to concrete DSP chains.
5. Order effects in the chain as they should be applied (first to last).
6. For rhythm/polyrhythm requests, prefer polyrhythm_gate and euclidean_stutter effects. Layer them for complex grooves.${isMultiFile ? "\n7. You MUST include the mergePhysics object for multi-file mode." : ""}

# Intensity Rules — CRITICAL
- When the user says "heavy", "extreme", "destroy", "mangle", "obliterate", "aggressive", "insane", "brutal", "weird", "strange", or uses ALL CAPS or exclamation marks, push ALL parameters toward their extreme ranges. Do NOT use default/moderate values.
- For heavy distortion: crusher with bits=2-4, mix=0.8-1.0, samples=8-32. Layer with soft_clip (threshold=0.1-0.3) or psychoacoustic_clip (level_in=4-8) for stacked dirt.
- For pitch warble/warp: vibrato with frequency=8-20, depth=0.8-1.0. Stack with freq_shift for alien inharmonic tones.
- For metallic textures: spectral_warp with warp=2.5-4.0. Stack with flanger (regen=60-95, speed=2-8) for aggressive comb filtering.

# Compound Effect Chaining — CRITICAL
- When the user wants BOTH distortion AND rhythm: apply distortion effects FIRST, then rhythmic effects SECOND. Example: crusher → polyrhythm_gate. The rhythm chops the already-distorted signal.
- When the user wants "rhythmic distortion": use tremolo (frequency=8-30, depth=1.0) to amplitude-modulate the signal, THEN crusher (bits=2-4, mix=1.0) so the distortion itself pumps rhythmically. Or use cellular_automata for chaotic gating + crusher.
- For "sound mangling" or "destroy": use 4-6 effects. Example chain: crusher(bits=2,mix=1) → spectral_warp(warp=3) → freq_shift(shift=200) → polyrhythm_gate → vibrato(freq=12,depth=0.9).
- NEVER use just one effect for requests that describe multiple transformations. If the user mentions distortion AND pitch AND rhythm, use at least one effect for EACH concept.

# Response Format
{
  "filters": [
    {
      "type": "<effect_name>",
      "params": { "<param>": <value>, ... },
      "reasoning": "<1 sentence explaining why this effect>"
    }
  ],
  "mood": "<2-5 word mood/vibe summary>",
  "reasoning": "<1-2 sentences explaining the overall interpretation>",
  "confidence": <0.0-1.0>${mergeFormat}
}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        console.warn(`PromptBrain API error ${response.status}: ${text.slice(0, 200)}`)
        return null
      }

      const data = await response.json()
      const content = data?.content?.[0]?.text
      if (!content) {
        console.warn("PromptBrain: empty response from API")
        return null
      }

      return this.parseResponse(content)
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("PromptBrain: request timed out")
      } else {
        console.warn("PromptBrain: request failed", error.message)
      }
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Parse and validate the JSON response from Claude.
   */
  parseResponse(text) {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (error) {
      console.warn("PromptBrain: failed to parse JSON response", error.message)
      return null
    }

    if (!Array.isArray(parsed.filters) || parsed.filters.length === 0) {
      console.warn("PromptBrain: no filters in response")
      return null
    }

    // Validate effect names
    const validFilters = parsed.filters.filter((f) => {
      if (!f.type || !this.availableEffects.includes(f.type)) {
        console.warn(`PromptBrain: unknown effect "${f.type}", skipping`)
        return false
      }
      return true
    })

    if (validFilters.length === 0) {
      console.warn("PromptBrain: no valid effects after filtering")
      return null
    }

    const result = {
      filters: validFilters,
      mood: parsed.mood ?? "unknown",
      reasoning: parsed.reasoning ?? "",
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    }

    // Extract merge physics if present
    if (parsed.mergePhysics && typeof parsed.mergePhysics === "object") {
      const mp = parsed.mergePhysics
      const clamp = (v) => (typeof v === "number" ? Math.min(1, Math.max(0, v)) : undefined)
      result.mergePhysics = {
        territoriality: clamp(mp.territoriality) ?? 0.5,
        timbre_transfer: clamp(mp.timbre_transfer) ?? 0.2,
        harmonic_infection: clamp(mp.harmonic_infection) ?? 0.15,
        gravitational_pull: clamp(mp.gravitational_pull) ?? 0.2,
        phase_entanglement: clamp(mp.phase_entanglement) ?? 0.1,
        temporal_magnetism: clamp(mp.temporal_magnetism) ?? 0.3,
      }
    }

    return result
  }
}
