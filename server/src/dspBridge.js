import { EventEmitter } from "events"
import fs from "fs"
import path from "path"
import { execFile, spawn } from "child_process"
import { fileURLToPath } from "url"
import { promisify } from "util"
import { buildFfmpegFilter, getEffect, getPythonScript } from "./effectLibrary.js"
import { runPythonEffect } from "./pythonEffects.js"

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const previewDir = path.join(__dirname, "..", "previews")
fs.mkdirSync(previewDir, { recursive: true })

const rendererBinaryName = process.platform === "win32" ? "Species8Renderer.exe" : "Species8Renderer"

function findRendererBinary() {
  if (process.env.SPECIES8_RENDERER) {
    return process.env.SPECIES8_RENDERER
  }

  const candidates = [
    path.join(process.cwd(), "build", "Species8Renderer_artefacts", "Release", rendererBinaryName),
    path.join(process.cwd(), "build", "Species8Renderer_artefacts", "Debug", rendererBinaryName),
    path.join(process.cwd(), "build", "Species8Renderer_artefacts", rendererBinaryName),
    path.join(process.cwd(), "build", rendererBinaryName),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export default class DspBridge extends EventEmitter {
  constructor(resolveReference = () => null, promptBrain = null) {
    super()
    this.history = []
    this.previewBuffers = new Map()
    this.resolveReference = resolveReference
    this.promptBrain = promptBrain
    this.rendererPath = findRendererBinary()
    this.renderer = null
    this.rendererBuffer = ""
    this.rendererRestartTimer = null

    if (this.rendererPath) {
      this.startRenderer()
    } else {
      console.warn(
        "Species8 renderer binary not found. Set SPECIES8_RENDERER env var or build the console target to enable native renders.",
      )
    }
  }

  enqueueMutation({ prompt, settings }) {
    const job = {
      id: `mut-${Date.now()}`,
      prompt,
      settings,
      status: "processing",
      createdAt: new Date().toISOString(),
      previewUrl: null,
      error: null,
    }

    this.history.push(job)
    this.emit("mutation:queued", job)
    this.processJob(job)
    return job
  }

  async processJob(job) {
    const referencePaths = (job.settings?.references ?? [])
      .map((id) => this.resolveReference(id))
      .filter(Boolean)
      .map((reference) => reference.path)

    if (referencePaths.length && this.renderer) {
      this.sendRendererJob(job, referencePaths)
      return
    }

    await this.renderWithFallback(job, referencePaths[0])
  }

  sendRendererJob(job, referencePaths) {
    if (!this.renderer || !this.renderer.stdin.writable) {
      console.warn("Renderer unavailable, falling back to internal preview")
      this.renderWithFallback(job, referencePaths[0])
      return
    }

    const payload = {
      id: job.id,
      prompt: job.prompt ?? "",
      references: referencePaths,
      controls: job.settings?.controls ?? {},
    }

    try {
      this.renderer.stdin.write(`${JSON.stringify(payload)}\n`)
    } catch (error) {
      console.error("Failed to send job to renderer", error)
      this.renderWithFallback(job, referencePaths[0])
    }
  }

  async renderWithFallback(job, referencePath) {
    try {
      job.status = "rendering"
      this.emit("mutation:rendering", job)

      // Try AI interpretation first, fall through to keyword matching on failure
      let buffer = null
      if (this.promptBrain && referencePath) {
        try {
          buffer = await this.createAIPreview(job, referencePath)
        } catch (error) {
          console.warn("AI preview failed, falling back to keywords:", error.message)
          buffer = null
        }
      }

      if (!buffer) {
        buffer = await this.createFallbackPreview(job, referencePath)
      }

      job.status = "ready"
      job.previewUrl = `/previews/${job.id}.wav`
      this.previewBuffers.set(job.id, buffer)
      this.emit("mutation:ready", job)
    } catch (error) {
      console.error("Mutation failed", error)
      job.status = "error"
      job.error = error.message
      this.emit("mutation:error", job)
    }
  }

  async createAIPreview(job, referencePath) {
    const interpretation = await this.promptBrain.interpret(job.prompt)
    if (!interpretation || !interpretation.filters.length) return null

    // Store interpretation on the job for UI display
    job.interpretation = {
      mood: interpretation.mood,
      reasoning: interpretation.reasoning,
      confidence: interpretation.confidence,
      filters: interpretation.filters,
    }

    // Split into ffmpeg and python effects
    const ffmpegFilters = []
    const pythonSteps = []

    for (const filter of interpretation.filters) {
      const effect = getEffect(filter.type)
      if (!effect) continue

      if (effect.engine === "ffmpeg") {
        const filterStr = buildFfmpegFilter(filter.type, filter.params)
        if (filterStr) ffmpegFilters.push(filterStr)
      } else if (effect.engine === "python") {
        const script = getPythonScript(filter.type)
        if (script) pythonSteps.push({ script, params: filter.params ?? {} })
      }
    }

    if (ffmpegFilters.length === 0 && pythonSteps.length === 0) return null

    let currentPath = referencePath
    const tempFiles = []

    try {
      // Step 1: Run ffmpeg filters (chained)
      if (ffmpegFilters.length > 0) {
        const ffmpegOutput = path.join(previewDir, `${job.id}_ffmpeg.wav`)
        tempFiles.push(ffmpegOutput)
        const filterGraph = "aformat=channel_layouts=stereo," + ffmpegFilters.join(",")
        const args = ["-y", "-i", currentPath, "-ac", "2", "-ar", "48000", "-af", filterGraph, "-c:a", "pcm_s16le", ffmpegOutput]
        await execFileAsync("ffmpeg", args)
        currentPath = ffmpegOutput
      }

      // Step 2: Run python effects sequentially
      for (let i = 0; i < pythonSteps.length; i++) {
        const { script, params } = pythonSteps[i]
        const pyOutput = path.join(previewDir, `${job.id}_py${i}.wav`)
        tempFiles.push(pyOutput)
        await runPythonEffect(script, currentPath, pyOutput, params)
        currentPath = pyOutput
      }

      // Step 3: Copy final result to canonical output path
      const outputPath = path.join(previewDir, `${job.id}.wav`)
      if (currentPath !== outputPath) {
        await fs.promises.copyFile(currentPath, outputPath)
      }

      return fs.promises.readFile(outputPath)
    } finally {
      // Clean up temp files
      for (const tmp of tempFiles) {
        fs.promises.unlink(tmp).catch(() => {})
      }
    }
  }

  startRenderer() {
    if (!this.rendererPath) return
    try {
      this.renderer = spawn(this.rendererPath, [], { stdio: ["pipe", "pipe", "pipe"] })
      this.renderer.on("error", (error) => {
        console.error("Renderer process error", error)
      })
      this.renderer.stdout.on("data", (data) => this.handleRendererStdout(data))
      this.renderer.stderr.on("data", (data) => {
        console.error(`[renderer] ${data}`)
      })
      this.renderer.on("exit", (code, signal) => {
        console.warn(`Renderer exited (${code ?? "?"}/${signal ?? "?"}), restarting...`)
        this.renderer = null
        // Rescue any in-flight jobs stuck at processing/rendering
        for (const job of this.history) {
          if (job.status === "processing" || job.status === "rendering") {
            const refPath = (job.settings?.references ?? [])
              .map((id) => this.resolveReference(id))
              .filter(Boolean)
              .map((ref) => ref.path)[0] ?? null
            console.warn(`Rescuing stuck job ${job.id} via fallback (ref=${refPath ? "yes" : "none"})`)
            this.renderWithFallback(job, refPath)
          }
        }
        if (this.rendererRestartTimer) {
          clearTimeout(this.rendererRestartTimer)
        }
        this.rendererRestartTimer = setTimeout(() => this.startRenderer(), 2000)
      })
    } catch (error) {
      console.error("Unable to start renderer", error)
      this.renderer = null
    }
  }

  handleRendererStdout(chunk) {
    this.rendererBuffer += chunk.toString()
    // Try to extract complete JSON objects from the buffer.
    // The renderer may output pretty-printed (multi-line) JSON,
    // so we look for balanced braces rather than relying on newlines.
    let startIndex = this.rendererBuffer.indexOf("{")
    while (startIndex >= 0) {
      let depth = 0
      let endIndex = -1
      for (let i = startIndex; i < this.rendererBuffer.length; i++) {
        if (this.rendererBuffer[i] === "{") depth++
        else if (this.rendererBuffer[i] === "}") depth--
        if (depth === 0) {
          endIndex = i
          break
        }
      }
      if (endIndex === -1) break // incomplete JSON, wait for more data
      const jsonStr = this.rendererBuffer.slice(startIndex, endIndex + 1)
      this.rendererBuffer = this.rendererBuffer.slice(endIndex + 1)
      this.processRendererMessage(jsonStr)
      startIndex = this.rendererBuffer.indexOf("{")
    }
  }

  processRendererMessage(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch (error) {
      console.warn("Renderer sent invalid JSON", line)
      return
    }

    const job = this.getJobById(message?.id)
    if (!job) {
      return
    }

    if (message.status === "rendering") {
      job.status = "rendering"
      this.emit("mutation:rendering", job)
      return
    }

    if (message.status === "ready" && message.renderPath) {
      fs.promises
        .readFile(message.renderPath)
        .then((buffer) => {
          this.previewBuffers.set(job.id, buffer)
          job.status = "ready"
          job.previewUrl = `/previews/${job.id}.wav`
          this.emit("mutation:ready", job)
        })
        .catch((error) => {
          console.error("Failed to read renderer output", error)
          job.status = "error"
          job.error = error.message
          this.emit("mutation:error", job)
        })
      return
    }

    if (message.status === "error") {
      job.status = "error"
      job.error = message.message ?? "Renderer error"
      this.emit("mutation:error", job)
    }
  }

  async createFallbackPreview(job, referencePath) {
    if (!referencePath) {
      return createPreviewBuffer(job.id)
    }

    const filterGraph = buildFilterGraph(job.prompt ?? "")
    const outputPath = path.join(previewDir, `${job.id}.wav`)
    const args = ["-y", "-i", referencePath, "-ac", "2", "-ar", "48000"]
    if (filterGraph) {
      args.push("-af", filterGraph)
    }
    args.push("-c:a", "pcm_s16le", outputPath)

    await execFileAsync("ffmpeg", args)
    return fs.promises.readFile(outputPath)
  }

  getRecentMutations(limit = 50) {
    return this.history.slice(-limit)
  }

  getPreviewBuffer(id) {
    return this.previewBuffers.get(id) ?? null
  }

  getJobById(id) {
    return this.history.find((job) => job.id === id)
  }

  getWaveformPreview() {
    const sampleRate = 44100
    const lengthSeconds = 2
    const totalSamples = sampleRate * lengthSeconds
    const data = []

    for (let i = 0; i < totalSamples; i += 441) {
      const value = Math.sin((i / totalSamples) * Math.PI * 4) * Math.exp(-i / totalSamples)
      data.push(Number(value.toFixed(4)))
    }

    return {
      sampleRate,
      channels: 2,
      samples: data.length,
      data,
    }
  }
}

function createPreviewBuffer(seed) {
  const sampleRate = 44100
  const durationSeconds = 1.5
  const totalSamples = Math.floor(sampleRate * durationSeconds)
  const bytesPerSample = 2
  const buffer = Buffer.alloc(44 + totalSamples * bytesPerSample)

  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + totalSamples * bytesPerSample, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(totalSamples * bytesPerSample, 40)

  const digits = Number(seed.replace(/\D/g, "").slice(-3)) || 1
  const baseFreq = 180 + (digits % 240)

  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate
    const envelope = Math.exp(-(time / durationSeconds) * 5)
    const value = Math.sin(2 * Math.PI * baseFreq * time) * envelope
    const sample = Math.max(-1, Math.min(1, value)) * 0.4
    buffer.writeInt16LE(sample * 32767, 44 + i * bytesPerSample)
  }

  return buffer
}

function buildFilterGraph(prompt) {
  const lower = prompt.toLowerCase()
  const filters = ["aformat=channel_layouts=stereo"]

  if (hasToken(lower, ["wider", "wide", "orbit", "immersive", "8d"])) {
    filters.push("stereowiden=delay=20:feedback=0.5:crossfeed=0.2:drymix=0.7")
  } else if (hasToken(lower, ["narrow", "mono", "center"])) {
    filters.push("extrastereo=m=0.6")
  }

  if (hasToken(lower, ["less muddy", "clearer", "clean", "clarity"])) {
    filters.push("highpass=f=160")
  } else if (hasToken(lower, ["muddy", "warm", "thick"])) {
    filters.push("lowpass=f=2400")
  }

  if (hasToken(lower, ["brighter", "shine", "air", "sparkle"])) {
    filters.push("equalizer=f=5200:t=h:w=2600:g=5")
  } else if (hasToken(lower, ["darker", "dark", "dull"])) {
    filters.push("equalizer=f=5200:t=h:w=2600:g=-6")
  }

  if (hasToken(lower, ["space", "plastic", "reverb", "cathedral", "temple"])) {
    filters.push("aecho=0.8:0.9:90:0.4")
  } else if (hasToken(lower, ["dry", "intimate"])) {
    filters.push("aecho=0.2:0.3:20:0.2")
  }

  if (hasToken(lower, ["motion", "orbit", "swirl"])) {
    filters.push("aphaser=type=t:speed=0.5:decay=0.6")
  }

  if (hasToken(lower, ["texture", "grain", "gritty", "lofi", "lo-fi"])) {
    filters.push("aeval=val(0)+random(0)*0.02|val(1)+random(1)*0.02")
  }

  if (hasToken(lower, ["distortion", "distort", "saturate", "crunch", "overdrive"])) {
    filters.push("acrusher=bits=8:mode=log:aa=1:samples=1:mix=0.4")
  }

  if (hasToken(lower, ["pitch up", "higher pitch", "chipmunk"])) {
    filters.push("asetrate=48000*1.25,aresample=48000")
  } else if (hasToken(lower, ["pitch down", "lower pitch", "slow", "slowed"])) {
    filters.push("asetrate=48000*0.8,aresample=48000")
  }

  if (hasToken(lower, ["spectral", "metallic", "robotic", "vocoder"])) {
    filters.push("afftfilt=real='hypot(re,im)*cos(atan2(im,re)*1.5)':imag='hypot(re,im)*sin(atan2(im,re)*1.5)':win_size=1024:overlap=0.75")
  }

  if (hasToken(lower, ["chorus", "shimmer", "lush"])) {
    filters.push("chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3")
  }

  if (hasToken(lower, ["compress", "punch", "slam", "loud"])) {
    filters.push("acompressor=threshold=-20dB:ratio=6:attack=5:release=50:makeup=4dB")
  }

  if (hasToken(lower, ["tremolo", "pulse", "stutter"])) {
    filters.push("tremolo=f=6:d=0.7")
  }

  if (hasToken(lower, ["flanger", "jet", "sweep"])) {
    filters.push("flanger=delay=3:depth=6:speed=0.4:regen=30:width=70")
  }

  return filters.join(",")
}

function hasToken(prompt, candidates) {
  return candidates.some((token) => prompt.includes(token))
}
