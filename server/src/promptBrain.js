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
   */
  async interpret(prompt) {
    if (!this.apiKey) return null

    const systemPrompt = `You are the AI brain of Species 8, a sound mutation engine. Given a creative text prompt describing how audio should be transformed, you select and configure DSP effects to achieve that sonic vision.

${this.catalog}

# Rules
1. Return ONLY valid JSON — no markdown, no explanation outside the JSON.
2. Select 1–6 effects from the catalog above. Use exact effect names.
3. For each effect, provide parameters within the documented ranges.
4. Think creatively — map abstract/poetic descriptions to concrete DSP chains.
5. Order effects in the chain as they should be applied (first to last).
6. For rhythm/polyrhythm requests, prefer polyrhythm_gate and euclidean_stutter effects. Layer them for complex grooves.

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
  "confidence": <0.0-1.0>
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

    return {
      filters: validFilters,
      mood: parsed.mood ?? "unknown",
      reasoning: parsed.reasoning ?? "",
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    }
  }
}
