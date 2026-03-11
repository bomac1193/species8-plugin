import test from "node:test"
import assert from "node:assert/strict"
import fs from "fs/promises"
import path from "path"
import { spawnSync } from "child_process"
import { tmpdir } from "os"
import { fileURLToPath } from "url"
import DspBridge from "./dspBridge.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const previewDir = path.join(__dirname, "..", "previews")

function hasFfmpeg() {
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" })
  return probe.status === 0
}

function createTone(outputPath, frequency) {
  const proc = spawnSync("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `sine=frequency=${frequency}:duration=1`,
    "-ac", "2",
    "-ar", "48000",
    outputPath,
  ])
  if (proc.status !== 0) {
    throw new Error(`ffmpeg failed creating tone (${frequency}Hz): ${proc.stderr?.toString() ?? ""}`)
  }
}

test("multi-file merge uses settings.mergePhysics override and renders preview", async (t) => {
  if (!hasFfmpeg()) t.skip("ffmpeg is required")

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "species8-merge-"))
  const aPath = path.join(tempDir, "a.wav")
  const bPath = path.join(tempDir, "b.wav")
  createTone(aPath, 220)
  createTone(bPath, 330)

  const uploads = new Map([
    ["a", { path: aPath }],
    ["b", { path: bPath }],
  ])

  const promptBrain = {
    async interpret() {
      return {
        mood: "fused",
        reasoning: "merge only",
        confidence: 1,
        filters: [],
        mergePhysics: {
          territoriality: 0.2,
          timbre_transfer: 0.2,
          harmonic_infection: 0.2,
          gravitational_pull: 0.2,
          phase_entanglement: 0.2,
          temporal_magnetism: 0.2,
        },
      }
    },
  }

  const bridge = new DspBridge((id) => uploads.get(id), promptBrain)
  const mergeOverride = {
    territoriality: 0.91,
    timbre_transfer: 0.33,
    harmonic_infection: 0.44,
    gravitational_pull: 0.55,
    phase_entanglement: 0.22,
    temporal_magnetism: 0.66,
  }

  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("mutation timed out")), 12000)
    bridge.once("mutation:ready", (job) => {
      clearTimeout(timeout)
      resolve(job)
    })
    bridge.once("mutation:error", (job) => {
      clearTimeout(timeout)
      reject(new Error(job.error ?? "mutation error"))
    })
  })

  const enqueued = bridge.enqueueMutation({
    prompt: "merge these",
    settings: { references: ["a", "b"], mergePhysics: mergeOverride },
  })

  const job = await done
  assert.equal(job.id, enqueued.id)
  assert.equal(job.status, "ready")
  assert.equal(job.interpretation.mergePhysics.territoriality, mergeOverride.territoriality)
  assert.equal(job.interpretation.mergePhysics.temporal_magnetism, mergeOverride.temporal_magnetism)
  assert.match(job.previewUrl, /^\/previews\/.+\.wav$/)

  const outputPath = path.join(previewDir, `${job.id}.wav`)
  const stats = await fs.stat(outputPath)
  assert.ok(stats.size > 0)

  await fs.rm(outputPath, { force: true })
  await fs.rm(tempDir, { recursive: true, force: true })
})
