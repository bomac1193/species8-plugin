import { EventEmitter } from "events"

/**
 * Lightweight bridge that will eventually proxy commands to the native JUCE DSP
 * engine. For now it simulates async mutations and waveform previews so the
 * React UI can integrate end-to-end.
 */
export default class DspBridge extends EventEmitter {
  constructor() {
    super()
    this.history = []
  }

  /**
   * Queue a mutation request. In the future this will send an IPC message to
   * the native executable. Right now it simulates rendering with timeouts.
   */
  enqueueMutation({ prompt, settings }) {
    const job = {
      id: `mut-${Date.now()}`,
      prompt,
      settings,
      status: "processing",
      createdAt: new Date().toISOString(),
      previewUrl: null,
    }

    this.history.push(job)
    this.emit("mutation:queued", job)

    setTimeout(() => {
      job.status = "rendering"
      this.emit("mutation:rendering", job)
    }, 250)

    setTimeout(() => {
      job.status = "ready"
      job.previewUrl = `/previews/${job.id}.wav`
      this.emit("mutation:ready", job)
    }, 1800)

    return job
  }

  getRecentMutations(limit = 50) {
    return this.history.slice(-limit)
  }

  /**
   * Return a placeholder waveform preview so the React UI has data to draw.
   */
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
