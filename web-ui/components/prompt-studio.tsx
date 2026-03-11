"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { motion } from "framer-motion"

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000"

type AIFilter = {
  type: string
  params?: Record<string, number | string>
  reasoning?: string
}

type AIInterpretation = {
  mood: string
  reasoning: string
  confidence: number
  filters: AIFilter[]
  mergePhysics?: MergePhysics
}

type MutationJob = {
  id: string
  prompt: string
  status: string
  createdAt?: string
  previewUrl?: string | null
  interpretation?: AIInterpretation
  error?: string
}

type UploadedReference = {
  id: string
  name: string
  durationSec: number | null
  isOneShot: boolean
  playbackMode: OneShotPlaybackMode
}

type OneShotPlaybackMode = "normal" | "loop" | "stretch" | "texture"

type MergePhysics = {
  territoriality: number
  timbre_transfer: number
  harmonic_infection: number
  gravitational_pull: number
  phase_entanglement: number
  temporal_magnetism: number
}

const defaultMergePhysics: MergePhysics = {
  territoriality: 0.5,
  timbre_transfer: 0.2,
  harmonic_infection: 0.15,
  gravitational_pull: 0.2,
  phase_entanglement: 0.1,
  temporal_magnetism: 0.3,
}

const mergeControls: Array<{ key: keyof MergePhysics; label: string; hint: string }> = [
  { key: "territoriality", label: "Dominance Clash", hint: "High: one sound crushes the other by frequency." },
  { key: "timbre_transfer", label: "Timbre Melt", hint: "High: source A's tone imprint bleeds into source B." },
  { key: "harmonic_infection", label: "Overtone Infection", hint: "High: spectral ghosts and overtone bleed." },
  { key: "gravitational_pull", label: "Pitch Gravity", hint: "High: submissive track bends hard toward dominant key." },
  { key: "phase_entanglement", label: "Phase Lock", hint: "High: tighter fusion, metallic/comb texture." },
  { key: "temporal_magnetism", label: "Rhythm Hijack", hint: "High: transients are pulled to dominant groove." },
]

const mergePresets: Array<{ name: string; values: MergePhysics }> = [
  {
    name: "Fight",
    values: {
      territoriality: 1,
      timbre_transfer: 0.12,
      harmonic_infection: 0.35,
      gravitational_pull: 0.18,
      phase_entanglement: 0.45,
      temporal_magnetism: 0.72,
    },
  },
  {
    name: "Melt",
    values: {
      territoriality: 0.35,
      timbre_transfer: 0.95,
      harmonic_infection: 0.78,
      gravitational_pull: 0.82,
      phase_entanglement: 0.66,
      temporal_magnetism: 0.35,
    },
  },
  {
    name: "Possessed",
    values: {
      territoriality: 0.7,
      timbre_transfer: 0.8,
      harmonic_infection: 1,
      gravitational_pull: 0.9,
      phase_entanglement: 0.86,
      temporal_magnetism: 0.75,
    },
  },
]

const playbackModes: Array<{ key: OneShotPlaybackMode; label: string }> = [
  { key: "normal", label: "Normal" },
  { key: "loop", label: "Loop" },
  { key: "stretch", label: "Stretch" },
  { key: "texture", label: "Texture" },
]

const statusMeta: Record<string, { label: string; dot: string; tone: string }> = {
  processing: { label: "QUEUED", dot: "bg-white/25", tone: "text-white/35" },
  rendering: { label: "RENDERING", dot: "bg-violet-400/50 animate-pulse", tone: "text-white/55" },
  ready: { label: "READY", dot: "bg-violet-400/70", tone: "text-white/70" },
  error: { label: "ERROR", dot: "bg-red-400/30", tone: "text-white/20" },
}

export default function PromptStudio() {
  const [uploads, setUploads] = useState<UploadedReference[]>([])
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isMutating, setIsMutating] = useState(false)
  const [mutationStatus, setMutationStatus] = useState<null | { kind: "success" | "error"; message: string }>(null)
  const [mutations, setMutations] = useState<MutationJob[]>([])
  const [bridgeStatus, setBridgeStatus] = useState<"connecting" | "online" | "offline">("connecting")
  const [isUploading, setIsUploading] = useState(false)
  const [timeExtend, setTimeExtend] = useState(1)
  const [mergePhysics, setMergePhysics] = useState<MergePhysics>(defaultMergePhysics)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)

  const wsUrl = useMemo(() => {
    if (SERVER_URL.startsWith("https://")) return SERVER_URL.replace("https://", "wss://")
    if (SERVER_URL.startsWith("http://")) return SERVER_URL.replace("http://", "ws://")
    return SERVER_URL
  }, [])
  const previewOrigin = useMemo(() => SERVER_URL.replace(/\/$/, ""), [])

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append("audio", file)
    const response = await fetch(`${SERVER_URL}/uploads`, {
      method: "POST",
      body: formData,
    })
    if (!response.ok) {
      throw new Error(`Upload failed with ${response.status}`)
    }
    return response.json()
  }, [])

  const getAudioDuration = useCallback((file: File) => {
    return new Promise<number | null>((resolve) => {
      const audio = document.createElement("audio")
      const url = URL.createObjectURL(file)
      const cleanup = () => {
        URL.revokeObjectURL(url)
        audio.remove()
      }
      audio.preload = "metadata"
      audio.src = url
      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : null
        cleanup()
        resolve(duration)
      }
      audio.onerror = () => {
        cleanup()
        resolve(null)
      }
    })
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return
      setIsUploading(true)
      ;(async () => {
        const next: UploadedReference[] = []
        for (const file of acceptedFiles) {
          try {
            const uploaded = await uploadFile(file)
            const durationSec = await getAudioDuration(file)
            const isOneShot = durationSec !== null && durationSec <= 2.5
            next.push({
              id: uploaded.id,
              name: uploaded.name ?? file.name,
              durationSec,
              isOneShot,
              playbackMode: isOneShot ? "loop" : "normal",
            })
          } catch (error) {
            console.error("Upload failed", error)
            setMutationStatus({ kind: "error", message: `Failed to upload ${file.name}` })
          }
        }
        if (next.length) {
          setUploads((prev) => [...next, ...prev].slice(0, 4))
          setSelectedUploadId((prev) => prev ?? next[0].id)
        }
        setIsUploading(false)
      })()
    },
    [uploadFile, getAudioDuration],
  )

  const replaceUpload = useCallback(async (targetId: string, file: File) => {
    const uploaded = await uploadFile(file)
    const durationSec = await getAudioDuration(file)
    const isOneShot = durationSec !== null && durationSec <= 2.5
    setUploads((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              id: uploaded.id,
              name: uploaded.name ?? file.name,
              durationSec,
              isOneShot,
              playbackMode: isOneShot ? item.playbackMode ?? "loop" : "normal",
            }
          : item,
      ),
    )
    setSelectedUploadId(uploaded.id)
  }, [uploadFile, getAudioDuration])

  // getRootProps goes on the drop zone div — the proven working pattern
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "audio/*": [] },
    multiple: true,
    useFsAccessApi: false,
    noClick: true,
    noKeyboard: true,
  })

  const dropLabel = useMemo(() => {
    if (isUploading) return "Uploading..."
    if (uploads.length === 0) return "Drop audio"
    if (uploads.length === 1) return `A: ${uploads[0].name}`
    const labels = uploads.map((_, i) => String.fromCharCode(65 + i)).join(" + ")
    return `${labels} loaded`
  }, [uploads, isUploading])

  const selectedUpload = useMemo(
    () => uploads.find((item) => item.id === selectedUploadId) ?? null,
    [uploads, selectedUploadId],
  )

  const upsertMutation = useCallback((job: MutationJob) => {
    if (!job?.id) return
    setMutations((prev) => {
      const filtered = prev.filter((existing) => existing.id !== job.id)
      return [job, ...filtered].slice(0, 5)
    })
  }, [])

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const connect = () => {
      if (disposed) return
      setBridgeStatus("connecting")
      socket = new WebSocket(wsUrl)

      socket.onopen = () => setBridgeStatus("online")

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message?.type === "hello" && Array.isArray(message.payload?.mutations)) {
            const incoming = message.payload.mutations as MutationJob[]
            setMutations((prev) => {
              const combined = [...incoming.reverse(), ...prev]
              const next: MutationJob[] = []
              const seen = new Set<string>()
              for (const job of combined) {
                if (!job?.id || seen.has(job.id)) continue
                seen.add(job.id)
                next.push(job)
                if (next.length === 5) break
              }
              return next
            })
            return
          }

          if (message?.payload?.id) {
            upsertMutation(message.payload as MutationJob)
          }
        } catch (error) {
          console.warn("Failed to parse bridge message", error)
        }
      }

      socket.onclose = () => {
        setBridgeStatus("offline")
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [wsUrl, upsertMutation])

  const handleMutate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setMutationStatus({ kind: "error", message: "Describe the mutation first." })
      return
    }

    setIsMutating(true)
    setMutationStatus(null)

    const playbackModeMap = Object.fromEntries(
      uploads
        .filter((item) => item.playbackMode !== "normal")
        .map((item) => [item.id, item.playbackMode]),
    )

    try {
      const response = await fetch(`${SERVER_URL}/mutate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          settings: {
            references: uploads.map((item) => item.id),
            timeExtend,
            source: "species8-monolith",
            ...(Object.keys(playbackModeMap).length > 0 ? { playbackModes: playbackModeMap } : {}),
            ...(uploads.length > 1 ? { mergePhysics } : {}),
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Bridge responded with ${response.status}`)
      }

      const mutation = await response.json()
      upsertMutation(mutation)
      setMutationStatus({
        kind: "success",
        message: `Mutation ${mutation?.id ?? "queued"} dispatched.`,
      })
    } catch (error) {
      console.error(error)
      setMutationStatus({
        kind: "error",
        message: "Bridge unreachable. Start the server.",
      })
    } finally {
      setIsMutating(false)
    }
  }, [prompt, uploads, timeExtend, mergePhysics, upsertMutation])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-3 py-8 selection:bg-violet-400/20">
      <div className="relative w-full max-w-[560px]">
        {/* Top edge highlight */}
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent pointer-events-none z-10" />

        <div className="relative bg-[#050505] border border-white/[0.07] rounded-xl overflow-hidden">
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
            <div className="flex items-baseline gap-2">
              <span className="brand text-[0.95rem] text-white/55 italic">Species</span>
              <span className="text-[0.85rem] text-white/40 font-light tracking-[0.3em]" style={{ textShadow: '0 0 8px rgba(255,255,255,0.25)' }}>8</span>
            </div>
            <DNAWaveformIcon />
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                bridgeStatus === "online"
                  ? "bg-violet-400/60"
                  : bridgeStatus === "connecting"
                    ? "bg-white/15 animate-pulse"
                    : "bg-white/[0.06]"
              }`} />
              <span className="text-[0.5rem] tracking-[0.3em] uppercase text-white/20 font-light">{bridgeStatus}</span>
            </div>
          </div>

          <div className="p-5 space-y-3.5">
            {/* ─── Drop zone ─── */}
            <div
              {...getRootProps({
                className: `group relative rounded-lg border border-dashed transition-all duration-300 cursor-pointer ${
                  isDragActive
                    ? "border-violet-400/25 bg-violet-400/[0.03]"
                    : "border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.015]"
                }`,
              })}
            >
              <input {...getInputProps()} />
              <input
                ref={replaceInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  const targetId = replaceTargetId
                  event.currentTarget.value = ""
                  if (!file || !targetId) return
                  setIsUploading(true)
                  ;(async () => {
                    try {
                      await replaceUpload(targetId, file)
                      setMutationStatus({ kind: "success", message: "Sample replaced for selected slot." })
                    } catch (error) {
                      console.error("Replace failed", error)
                      setMutationStatus({ kind: "error", message: "Failed to replace sample." })
                    } finally {
                      setIsUploading(false)
                      setReplaceTargetId(null)
                    }
                  })()
                }}
              />
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-white/20 group-hover:text-white/35 transition-colors shrink-0">
                    <path d="M7 9V2M4.5 4.5L7 2l2.5 2.5" />
                    <path d="M2.5 11.5h9" />
                  </svg>
                  <span className={`text-[0.65rem] tracking-[0.2em] uppercase transition-colors truncate ${
                    isDragActive ? "text-white/55" : "text-white/25 group-hover:text-white/40"
                  }`}>
                    {dropLabel}
                  </span>
                </div>
                {uploads.length >= 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setUploads([])
                      setSelectedUploadId(null)
                    }}
                    className="text-[0.45rem] text-white/15 hover:text-white/35 transition-colors shrink-0 pl-3"
                  >
                    clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    open()
                  }}
                  className="text-[0.45rem] text-white/22 hover:text-white/50 transition-colors shrink-0 pl-3 uppercase tracking-[0.18em]"
                >
                  add
                </button>
              </div>
              {isUploading && (
                <div className="px-4 pb-2.5 text-[0.55rem] tracking-[0.2em] text-violet-300/30 animate-pulse uppercase">
                  Uploading
                </div>
              )}
              {uploads.length > 0 && (
                <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
                  {uploads.map((upload, i) => {
                    const slot = String.fromCharCode(65 + i)
                    const isSelected = selectedUploadId === upload.id
                    return (
                      <div
                        key={upload.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedUploadId(upload.id)
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setReplaceTargetId(upload.id)
                          replaceInputRef.current?.click()
                        }}
                        className={`inline-flex flex-col gap-1 rounded-md border px-2 py-1.5 max-w-full cursor-pointer transition-colors ${
                          isSelected
                            ? "border-white/40 bg-white/[0.08]"
                            : "border-white/[0.12] bg-white/[0.02] hover:border-white/[0.25]"
                        }`}
                        title="Left click: select/edit mode • Right click: replace sample"
                      >
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[0.45rem] tracking-[0.2em] uppercase text-white/45 shrink-0">{slot}</span>
                          <span className="text-[0.5rem] text-white/35 truncate max-w-[180px]">{upload.name}</span>
                          <span className="text-[0.42rem] tracking-[0.12em] uppercase border border-white/[0.2] rounded px-1 py-[1px] text-white/50">
                            {upload.isOneShot ? "one-shot" : "clip"}
                          </span>
                        </div>
                        <div className="text-[0.42rem] tracking-[0.12em] uppercase text-white/50">
                          mode: {upload.playbackMode}
                        </div>
                        {isSelected && (
                          <div className="text-[0.42rem] text-white/35 leading-snug">
                            Left click to edit mode. Right click to replace this sample.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedUpload && (
                <div className="px-4 pb-2.5">
                  <div className="rounded-md border border-white/[0.18] bg-white/[0.03] px-2.5 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.45rem] tracking-[0.2em] uppercase text-white/58">
                        selected: {selectedUpload.name}
                      </span>
                      <span className="text-[0.42rem] tracking-[0.2em] uppercase text-white/65">
                        current {selectedUpload.playbackMode}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      {playbackModes.map((mode) => (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploads((prev) => prev.map((item) => (
                              item.id === selectedUpload.id ? { ...item, playbackMode: mode.key } : item
                            )))
                          }}
                          className={`text-[0.47rem] tracking-[0.18em] uppercase px-2 py-1 rounded border transition-colors ${
                            selectedUpload.playbackMode === mode.key
                              ? "border-white/70 text-white/90 bg-white/[0.1]"
                              : "border-white/[0.18] text-white/40 hover:text-white/70 hover:border-white/[0.35]"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    {!selectedUpload.isOneShot && (
                      <div className="text-[0.47rem] text-white/35">Modes are strongest on one-shots, but still available on longer clips.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Anti-autofill honeypot */}
            <div aria-hidden="true" className="absolute opacity-0 h-0 overflow-hidden pointer-events-none">
              <input type="text" name="username" tabIndex={-1} value="" readOnly />
              <input type="password" name="password" tabIndex={-1} value="" readOnly />
            </div>

            {/* ─── Prompt bar ─── */}
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] focus-within:border-white/[0.15] transition-all duration-300 overflow-hidden prompt-focus-glow">
              <input
                type="search"
                role="searchbox"
                name="species8-mutation-prompt"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                placeholder="Describe the mutation..."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") handleMutate() }}
                className="flex-1 bg-transparent text-white/75 text-[0.8rem] tracking-wide px-4 py-2.5 placeholder:text-white/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              <button
                className="px-4 py-2.5 text-[0.55rem] uppercase tracking-[0.5em] text-white/30 hover:text-white/90 hover:bg-violet-500/[0.08] transition-all duration-200 disabled:text-white/10 disabled:hover:bg-transparent border-l border-white/[0.06] shrink-0"
                type="button"
                onClick={handleMutate}
                disabled={isMutating || isUploading}
              >
                {isMutating ? "..." : "GO"}
              </button>
            </div>

            {/* ─── Time extend ─── */}
            <div className="flex items-center gap-4 px-1">
              <span className="text-[0.55rem] tracking-[0.3em] uppercase text-white/20 font-light shrink-0">Time</span>
              <div className="flex gap-1.5">
                {([1, 2, 4, 8] as const).map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setTimeExtend(mult)}
                    className={`text-[0.55rem] tabular-nums px-2.5 py-1.5 rounded-md cursor-pointer select-none transition-all duration-200 ${
                      timeExtend === mult
                        ? "bg-violet-500/[0.1] text-white/70 border border-violet-400/[0.15]"
                        : "text-white/25 hover:text-white/50 border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03]"
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>

            {uploads.length > 1 && (
              <div className="rounded-lg border border-white/[0.12] bg-white/[0.015] px-3 py-2.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.5rem] tracking-[0.3em] uppercase text-white/55">Merge Physics</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMergePhysics(defaultMergePhysics)}
                      className="text-[0.45rem] tracking-[0.2em] uppercase text-white/28 hover:text-white/60 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="text-[0.55rem] text-white/40 leading-relaxed">
                  Higher values are intentionally extreme: stranger tone transfer, stronger pitch bending, harder rhythmic forcing.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mergePresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setMergePhysics(preset.values)}
                      className="text-[0.5rem] tracking-[0.2em] uppercase px-2 py-1 rounded border border-white/[0.14] text-white/45 hover:text-white/80 hover:border-white/[0.35] hover:bg-white/[0.06] transition-all"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {mergeControls.map((control) => (
                    <label key={control.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[0.45rem] tracking-[0.14em] uppercase text-white/30">
                        <span>{control.label}</span>
                        <span className="tabular-nums text-white/25">{mergePhysics[control.key].toFixed(2)}</span>
                      </div>
                      <div className="text-[0.5rem] leading-snug text-white/22">{control.hint}</div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={mergePhysics[control.key]}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          setMergePhysics((prev) => ({ ...prev, [control.key]: value }))
                        }}
                        className="w-full brutalist-slider"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Status toast */}
            {mutationStatus && (
              <div className={`text-[0.55rem] tracking-[0.2em] uppercase px-1 transition-colors ${
                mutationStatus.kind === "success" ? "text-white/30" : "text-white/20"
              }`}>
                {mutationStatus.message}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* ─── Output ─── */}
            <MutationQueue mutations={mutations} previewOrigin={previewOrigin} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function MutationQueue({
  mutations,
  previewOrigin,
}: {
  mutations: MutationJob[]
  previewOrigin: string
}) {
  const ready = mutations.filter((j) => j.status === "ready")
  const pending = mutations.filter((j) => j.status !== "ready")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] tracking-[0.4em] uppercase text-white/30 font-light">Output</span>
        {mutations.length > 0 && (
          <span className="text-[0.5rem] tabular-nums text-white/20 font-light">
            {ready.length}<span className="text-white/10 mx-0.5">/</span>{mutations.length}
          </span>
        )}
      </div>

      {mutations.length === 0 && (
        <div className="py-10 text-center">
          <p className="brand italic text-[0.85rem] text-white/[0.07] select-none">
            Mutations will appear here
          </p>
        </div>
      )}

      {ready.length > 0 && (
        <div className="space-y-2">
          {ready.map((job, i) => (
            <MutationCard key={job.id} job={job} index={i + 1} previewOrigin={previewOrigin} />
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-1.5">
          {ready.length > 0 && (
            <div className="text-[0.5rem] tracking-[0.3em] uppercase text-white/15 pt-1 font-light">Processing</div>
          )}
          {pending.map((job) => {
            const meta = statusMeta[job.status] ?? { label: "...", dot: "bg-white/10", tone: "text-white/20" }
            return (
              <div key={job.id} className="flex items-center gap-2.5 py-1.5">
                <div className={`w-[5px] h-[5px] rounded-full shrink-0 ${meta.dot}`} />
                <span className="text-[0.6rem] text-white/30 truncate flex-1">{job.prompt}</span>
                <span className={`text-[0.5rem] tracking-[0.25em] uppercase shrink-0 ${meta.tone}`}>{meta.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function MutationCard({ job, index, previewOrigin }: { job: MutationJob; index: number; previewOrigin: string }) {
  const [expanded, setExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [waveformData, setWaveformData] = useState<number[] | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>(0)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const scrubbingRef = useRef(false)
  const scrubPctRef = useRef(0)

  const audioUrl = job.previewUrl ? `${previewOrigin}${job.previewUrl}` : null

  // Decode audio and extract waveform peaks on mount
  useEffect(() => {
    if (!audioUrl) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(audioUrl)
        const buf = await res.arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(buf)
        ctx.close()
        if (cancelled) return
        const raw = decoded.getChannelData(0)
        const n = 120
        const blockSize = Math.floor(raw.length / n)
        const peaks: number[] = []
        for (let i = 0; i < n; i++) {
          let peak = 0
          const start = i * blockSize
          for (let j = 0; j < blockSize; j++) {
            const v = Math.abs(raw[start + j])
            if (v > peak) peak = v
          }
          peaks.push(peak)
        }
        const max = Math.max(...peaks, 0.001)
        setWaveformData(peaks.map((p) => p / max))
      } catch {
        // Seed-based fallback renders automatically
      }
    })()
    return () => { cancelled = true }
  }, [audioUrl])

  // Track playback progress via rAF — suppressed while user is scrubbing
  const updateProgress = useCallback(() => {
    const el = audioElRef.current
    if (el && el.duration && !el.paused) {
      if (!scrubbingRef.current) {
        setProgress(el.currentTime / el.duration)
      }
      rafRef.current = requestAnimationFrame(updateProgress)
    }
  }, [])

  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    audioElRef.current = node
    if (!node) return
    node.addEventListener("play", () => {
      setIsPlaying(true)
      rafRef.current = requestAnimationFrame(updateProgress)
    })
    node.addEventListener("pause", () => {
      setIsPlaying(false)
      cancelAnimationFrame(rafRef.current)
    })
    node.addEventListener("ended", () => {
      if (scrubbingRef.current) return
      setIsPlaying(false)
      setProgress(0)
      cancelAnimationFrame(rafRef.current)
    })
  }, [updateProgress])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!audioUrl) return
      e.dataTransfer.effectAllowed = "copy"
      e.dataTransfer.setData("text/uri-list", audioUrl)
      e.dataTransfer.setData("text/plain", audioUrl)
      e.dataTransfer.setData("DownloadURL", `audio/wav:species8-${job.id}.wav:${audioUrl}`)
    },
    [audioUrl, job.id],
  )

  const togglePlay = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    document.querySelectorAll<HTMLAudioElement>("audio").forEach((a) => {
      if (a !== el && !a.paused) a.pause()
    })
    if (el.paused) {
      el.play()
    } else {
      el.pause()
    }
  }, [])

  // Compute seek percentage from pointer position
  const pctFromPointer = useCallback((clientX: number) => {
    const div = waveformRef.current
    if (!div) return -1
    const rect = div.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    scrubbingRef.current = true

    const el = audioElRef.current
    if (!el) return
    const pct = pctFromPointer(e.clientX)
    if (pct < 0) return

    // Pause this element during scrub (prevents race conditions)
    if (!el.paused) el.pause()

    // Stop all other audio
    document.querySelectorAll<HTMLAudioElement>("audio").forEach((a) => {
      if (a !== el && !a.paused) a.pause()
    })

    // Visual update only — no el.currentTime during drag
    scrubPctRef.current = pct
    setProgress(pct)
  }, [pctFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    const pct = pctFromPointer(e.clientX)
    if (pct < 0) return
    // Visual update only — no el.currentTime during drag
    scrubPctRef.current = pct
    setProgress(pct)
  }, [pctFromPointer])

  const handlePointerUp = useCallback(() => {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false

    const el = audioElRef.current
    if (!el) return
    const pct = scrubPctRef.current

    // Not loaded — kick off load, then seek+play
    if (!el.duration || isNaN(el.duration)) {
      el.addEventListener("loadedmetadata", () => {
        el.currentTime = pct * el.duration
        el.addEventListener("seeked", () => el.play().catch(() => {}), { once: true })
      }, { once: true })
      el.load()
      return
    }

    // Single seek, wait for confirmation, then play
    el.currentTime = pct * el.duration
    el.addEventListener("seeked", () => {
      el.play().catch(() => {})
    }, { once: true })
  }, [])

  const timeLabel = useMemo(() => {
    if (!job.createdAt) return ""
    const d = new Date(job.createdAt)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }, [job.createdAt])

  return (
    <div className={`rounded-lg border overflow-hidden transition-all duration-300 ${
      isPlaying
        ? "bg-white/[0.025] border-violet-400/[0.12]"
        : "bg-black border-white/[0.06] hover:border-white/[0.1]"
    }`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-[0.55rem] tabular-nums text-white/15 w-4 shrink-0 text-right font-light">
          {String(index).padStart(2, "0")}
        </span>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
            isPlaying
              ? "bg-violet-500/[0.12] hover:bg-violet-500/[0.18]"
              : "bg-white/[0.04] hover:bg-violet-500/[0.1]"
          }`}
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white" fillOpacity="0.75">
              <rect x="2" y="1.5" width="2" height="7" rx="0.5" />
              <rect x="6" y="1.5" width="2" height="7" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white" fillOpacity="0.6">
              <path d="M3 1.5L8.5 5L3 8.5Z" />
            </svg>
          )}
        </button>

        {/* Waveform — click or drag to scrub */}
        <div
          ref={waveformRef}
          className="flex-1 h-9 relative cursor-pointer select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <WaveformSVG data={waveformData} seed={job.id} isPlaying={isPlaying} progress={progress} />
        </div>

        {timeLabel && (
          <span className="text-[0.5rem] tabular-nums text-white/20 shrink-0 font-light">{timeLabel}</span>
        )}

        {/* Drag handle — drag to DAW */}
        {audioUrl && (
          <div
            draggable
            onDragStart={handleDragStart}
            className="w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all shrink-0 cursor-grab active:cursor-grabbing"
            title="Drag to DAW"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="4" cy="3.5" r="1" />
              <circle cx="8" cy="3.5" r="1" />
              <circle cx="4" cy="6.5" r="1" />
              <circle cx="8" cy="6.5" r="1" />
              <circle cx="4" cy="9.5" r="1" />
              <circle cx="8" cy="9.5" r="1" />
            </svg>
          </div>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="w-6 h-6 flex items-center justify-center text-white/15 hover:text-white/40 transition-colors shrink-0"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M1.5 3L4 5.5L6.5 3" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3.5 pt-0 space-y-2.5 border-t border-white/[0.04]">
          <div className="pt-2.5 text-[0.7rem] leading-relaxed text-white/40 normal-case">
            {job.prompt}
          </div>

          {job.interpretation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[0.5rem] tracking-[0.25em] uppercase text-white/20 font-light">AI</span>
                <span className="text-[0.6rem] text-white/30 italic normal-case">{job.interpretation.mood}</span>
              </div>
              <div className="text-[0.55rem] leading-relaxed text-white/20 normal-case">
                {job.interpretation.reasoning}
              </div>
              <div className="flex flex-wrap gap-1">
                {job.interpretation.filters.map((filter, i) => (
                  <span
                    key={i}
                    className="text-[0.5rem] tracking-wider bg-violet-400/[0.04] border border-violet-400/[0.1] rounded px-2 py-[3px] text-white/30"
                    title={filter.reasoning}
                  >
                    {filter.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {audioUrl && (
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href={audioUrl}
                download={`species8-${job.id}.wav`}
                className="text-[0.5rem] tracking-[0.2em] uppercase text-white/20 hover:text-violet-300/50 transition-colors duration-200"
              >
                Download WAV
              </a>
              <span className="text-white/[0.06]">|</span>
              <span className="text-[0.45rem] tabular-nums text-white/10 font-light">{job.id}</span>
            </div>
          )}
        </div>
      )}

      <audio id={`audio-${job.id}`} ref={audioRef} preload="auto" src={audioUrl ?? undefined} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function WaveformSVG({ data, seed, isPlaying, progress }: { data: number[] | null; seed: string; isPlaying: boolean; progress: number }) {
  const W = 500
  const H = 36
  const MID = H / 2

  // Build amplitude array — real peaks or seed-based fallback
  const amps = useMemo(() => {
    if (data && data.length > 0) {
      // Smooth the real data with a 3-tap kernel
      const smoothed: number[] = []
      for (let i = 0; i < data.length; i++) {
        const prev = data[Math.max(0, i - 1)]
        const curr = data[i]
        const next = data[Math.min(data.length - 1, i + 1)]
        smoothed.push(prev * 0.2 + curr * 0.6 + next * 0.2)
      }
      return smoothed
    }
    // Fallback
    const hash = (s: string) => {
      let h = 0
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
      return h
    }
    const rng = (i: number) => {
      const x = Math.sin(hash(seed) * 0.001 + i * 127.1) * 43758.5453
      return x - Math.floor(x)
    }
    const n = 120
    const out: number[] = []
    for (let i = 0; i < n; i++) {
      const base = rng(i) * 0.7 + 0.1
      const env = Math.sin((i / n) * Math.PI)
      out.push(base * env)
    }
    return out
  }, [data, seed])

  // Build smooth cubic bezier SVG paths (top + bottom mirrored)
  const paths = useMemo(() => {
    const n = amps.length
    const step = W / n

    let topPath = ""
    let bottomPath = ""

    for (let i = 0; i < n; i++) {
      const x = i * step + step / 2
      const a = amps[i] * MID * 0.88
      const yTop = MID - a
      const yBot = MID + a

      if (i === 0) {
        topPath = `M ${x} ${yTop}`
        bottomPath = `M ${x} ${yBot}`
      } else {
        const px = (i - 1) * step + step / 2
        const cpx = (px + x) / 2
        const prevA = amps[i - 1] * MID * 0.88
        topPath += ` C ${cpx} ${MID - prevA} ${cpx} ${yTop} ${x} ${yTop}`
        bottomPath += ` C ${cpx} ${MID + prevA} ${cpx} ${yBot} ${x} ${yBot}`
      }
    }

    // Close the fill shapes back to midline
    const lastX = (n - 1) * step + step / 2
    const firstX = step / 2
    const topFill = `${topPath} L ${lastX} ${MID} L ${firstX} ${MID} Z`
    const botFill = `${bottomPath} L ${lastX} ${MID} L ${firstX} ${MID} Z`

    return { topPath, bottomPath, topFill, botFill }
  }, [amps])

  // Playhead x position
  const playheadX = progress * W

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <clipPath id={`played-${seed}`}>
          <rect x="0" y="0" width={playheadX} height={H} />
        </clipPath>
        <clipPath id={`unplayed-${seed}`}>
          <rect x={playheadX} y="0" width={W - playheadX} height={H} />
        </clipPath>
      </defs>

      {/* Center line */}
      <line x1="0" y1={MID} x2={W} y2={MID} stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />

      {/* Unplayed fill */}
      <g clipPath={`url(#unplayed-${seed})`}>
        <path d={paths.topFill} fill="white" fillOpacity={isPlaying ? 0.06 : 0.03} />
        <path d={paths.botFill} fill="white" fillOpacity={isPlaying ? 0.06 : 0.03} />
        <path d={paths.topPath} fill="none" stroke="white" strokeOpacity={isPlaying ? 0.25 : 0.12} strokeWidth="1.2" />
        <path d={paths.bottomPath} fill="none" stroke="white" strokeOpacity={isPlaying ? 0.25 : 0.12} strokeWidth="1.2" />
      </g>

      {/* Played fill — violet tint */}
      <g clipPath={`url(#played-${seed})`}>
        <path d={paths.topFill} fill="rgb(167,139,250)" fillOpacity={isPlaying ? 0.12 : 0.08} />
        <path d={paths.botFill} fill="rgb(167,139,250)" fillOpacity={isPlaying ? 0.12 : 0.08} />
        <path d={paths.topPath} fill="none" stroke="rgb(167,139,250)" strokeOpacity={isPlaying ? 0.7 : 0.45} strokeWidth="1.2" />
        <path d={paths.bottomPath} fill="none" stroke="rgb(167,139,250)" strokeOpacity={isPlaying ? 0.7 : 0.45} strokeWidth="1.2" />
      </g>

      {/* Playhead line */}
      {(isPlaying || progress > 0) && (
        <line x1={playheadX} y1={1} x2={playheadX} y2={H - 1} stroke="rgb(167,139,250)" strokeOpacity="0.5" strokeWidth="1" />
      )}
    </svg>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function DNAWaveformIcon() {
  return (
    <motion.svg
      width="64"
      height="22"
      viewBox="0 0 64 22"
      fill="none"
      stroke="white"
      strokeWidth="0.7"
      className="opacity-70"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.85, 0.5] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.path
        d="M2 6 C8 2 14 11 20 6 C26 2 32 11 38 6 C44 2 50 11 56 6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <motion.path
        d="M2 16 C8 11 14 20 20 16 C26 11 32 20 38 16 C44 11 50 20 56 16"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.5 }}
      />
      {[0, 10, 20, 30, 40, 50].map((x) => (
        <motion.line
          key={x}
          x1={x + 3}
          y1={7}
          x2={x + 3}
          y2={15}
          stroke="white"
          strokeWidth="0.4"
          initial={{ scaleY: 0.3 }}
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: x / 100 }}
        />
      ))}
    </motion.svg>
  )
}
