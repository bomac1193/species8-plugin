"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
}

type MutationJob = {
  id: string
  prompt: string
  status: string
  createdAt?: string
  previewUrl?: string | null
  interpretation?: AIInterpretation
}

type UploadedReference = {
  id: string
  name: string
}

const controls = [
  { label: "DW", value: 0.32 },
  { label: "WD", value: 0.58 },
  { label: "CL", value: 0.18 },
  { label: "OUT", value: 0.72 },
]

const statusMeta: Record<string, { label: string; dot: string; tone: string }> = {
  processing: { label: "QUEUED", dot: "bg-white/30", tone: "text-white/40" },
  rendering: { label: "RENDERING", dot: "bg-white/60 animate-pulse", tone: "text-white/60" },
  ready: { label: "READY", dot: "bg-white", tone: "text-white/80" },
  error: { label: "ERROR", dot: "bg-white/20", tone: "text-white/25" },
}

export default function PromptStudio() {
  const [uploads, setUploads] = useState<UploadedReference[]>([])
  const [prompt, setPrompt] = useState("")
  const [isMutating, setIsMutating] = useState(false)
  const [mutationStatus, setMutationStatus] = useState<null | { kind: "success" | "error"; message: string }>(null)
  const [mutations, setMutations] = useState<MutationJob[]>([])
  const [bridgeStatus, setBridgeStatus] = useState<"connecting" | "online" | "offline">("connecting")
  const [isUploading, setIsUploading] = useState(false)

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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return
      setIsUploading(true)
      ;(async () => {
        const next: UploadedReference[] = []
        for (const file of acceptedFiles) {
          try {
            const uploaded = await uploadFile(file)
            next.push({ id: uploaded.id, name: uploaded.name ?? file.name })
          } catch (error) {
            console.error("Upload failed", error)
            setMutationStatus({ kind: "error", message: `Failed to upload ${file.name}` })
          }
        }
        if (next.length) {
          setUploads((prev) => [...next, ...prev].slice(0, 4))
        }
        setIsUploading(false)
      })()
    },
    [uploadFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [] },
    multiple: true,
    useFsAccessApi: false,
  })

  const dropLabel = useMemo(() => {
    if (isUploading) return "Uploading..."
    if (uploads.length === 0) return "Drag Sound Here"
    if (uploads.length === 1) return uploads[0].name
    return `${uploads[0].name} +${uploads.length - 1}`
  }, [uploads, isUploading])

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
      setMutationStatus({ kind: "error", message: "Describe the mutation before firing the console." })
      return
    }

    setIsMutating(true)
    setMutationStatus(null)

    try {
      const response = await fetch(`${SERVER_URL}/mutate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          settings: { references: uploads.map((item) => item.id), source: "species8-monolith" },
        }),
      })

      if (!response.ok) {
        throw new Error(`Bridge responded with ${response.status}`)
      }

      const mutation = await response.json()
      upsertMutation(mutation)
      setMutationStatus({
        kind: "success",
        message: `Mutation ${mutation?.id ?? "queued"} dispatched to bridge.`,
      })
    } catch (error) {
      console.error(error)
      setMutationStatus({
        kind: "error",
        message: "Bridge unreachable. Start npm run dev in /server.",
      })
    } finally {
      setIsMutating(false)
    }
  }, [prompt, uploads, upsertMutation])

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-3 py-10">
      <div className="relative w-full max-w-4xl bg-[#050505] border border-white/70 rounded-[8px] overflow-hidden text-xs tracking-[0.2em]">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
          <div className="absolute inset-[1px] border border-white/10 rounded-[7px]" />
          <div className="absolute top-6 left-6 right-6 h-[1px] bg-white/10" />
          <div className="absolute bottom-6 left-6 right-6 h-[1px] bg-white/10" />
        </div>

        <div className="relative px-5 py-6 space-y-5">
          <header className="flex items-center justify-between text-[0.55rem] uppercase">
            <div className="flex items-center gap-3">
              <span className="tracking-[0.6em] text-white/80 font-light">SPECIES-8</span>
              <SphinxMascot />
            </div>
            <DNAWaveformIcon />
            <div className="flex items-center gap-2 text-[0.45rem] tracking-[0.4em] text-white/60">
              <span>08</span>
              <span className="w-10 h-px bg-white/30" />
              <span>LAB</span>
            </div>
          </header>

          <section className="flex flex-col gap-4">
            {/* Hidden honeypot fields absorb browser autofill */}
            <div aria-hidden="true" className="absolute opacity-0 h-0 overflow-hidden pointer-events-none">
              <input type="text" name="username" tabIndex={-1} value="" readOnly />
              <input type="password" name="password" tabIndex={-1} value="" readOnly />
            </div>
            <div className="flex items-stretch border border-white/70 rounded-[6px] bg-white/[0.05] backdrop-blur-sm">
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
                className="flex-1 bg-transparent text-white/80 text-[0.75rem] tracking-[0.2em] px-3 py-2.5 placeholder:text-white/40 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              <button
                className="px-4 text-[0.6rem] uppercase tracking-[0.45em] border-l border-white/50 bg-white/[0.08] hover:bg-white/[0.12] transition-colors disabled:text-white/30 disabled:hover:bg-white/[0.08]"
                type="button"
                onClick={handleMutate}
                disabled={isMutating || isUploading}
              >
                {isMutating ? "MUTATING" : "MUTATE"}
              </button>
            </div>

            <div className="relative border border-white/40 rounded-[6px] bg-white/[0.04] backdrop-blur-[3px]">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="grid grid-cols-4">
                {controls.map((control, index) => (
                  <ControlModule key={control.label} {...control} isFirst={index === 0} />
                ))}
              </div>
            </div>
          </section>

          <section className="flex items-center justify-between gap-3 text-[0.5rem]">
            <div
              {...getRootProps({
                className:
                  "flex-1 border border-dotted border-white/60 rounded-[6px] bg-white/[0.04] backdrop-blur-[3px] px-3 py-2.5 text-center uppercase text-white/70 cursor-pointer transition-colors",
              })}
            >
              <input {...getInputProps()} />
              <div className={isDragActive ? "text-white" : "text-white/70"}>{dropLabel}</div>
              {uploads.length > 1 && (
                <div className="mt-1 text-[0.45rem] tracking-[0.3em] text-white/40">
                  {uploads
                    .slice(1)
                    .map((file) => file.name)
                    .join(" · ")}
                </div>
              )}
              {isUploading && <div className="mt-1 text-[0.45rem] tracking-[0.3em] text-white/40">Processing...</div>}
            </div>
            <div className="w-[1px] h-10 bg-white/20" />
            <div className="flex flex-col gap-1">
              <div className="text-white/50 tracking-[0.5em]">INPUT</div>
              <div className="h-1 w-12 bg-white/20" />
            </div>
          </section>
          {mutationStatus && (
            <div
              className={`text-[0.48rem] tracking-[0.35em] uppercase ${
                mutationStatus.kind === "success" ? "text-white/70" : "text-white/40"
              }`}
            >
              {mutationStatus.message}
            </div>
          )}
          <div className="rounded-[6px] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-black border border-white/10 rounded-t-[6px]">
              <div className="flex items-center gap-2 text-[0.45rem] tracking-[0.4em] uppercase text-white/50">
                <span>MUTATIONS</span>
                {mutations.length > 0 && (
                  <span className="text-[0.4rem] bg-white/10 px-1.5 py-0.5 rounded-[3px] text-white/40">{mutations.length}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[0.4rem] tracking-[0.3em] uppercase text-white/35">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  bridgeStatus === "online" ? "bg-white/80" : bridgeStatus === "connecting" ? "bg-white/40 animate-pulse" : "bg-white/15"
                }`} />
                <span>{bridgeStatus}</span>
              </div>
            </div>
            <div className="bg-black border-x border-b border-white/10 rounded-b-[6px] divide-y divide-white/[0.06]">
              {mutations.length === 0 && (
                <div className="px-3 py-4 text-center text-[0.42rem] tracking-[0.35em] uppercase text-white/25">
                  No mutations yet
                </div>
              )}
              {mutations.map((job, index) => (
                <MutationCard key={job.id} job={job} index={index + 1} previewOrigin={previewOrigin} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function MutationCard({ job, index, previewOrigin }: { job: MutationJob; index: number; previewOrigin: string }) {
  const [showInterpretation, setShowInterpretation] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    if (!node) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    node.addEventListener("play", onPlay)
    node.addEventListener("pause", onPause)
    node.addEventListener("ended", onEnded)
  }, [])

  const meta = statusMeta[job.status] ?? {
    label: job.status?.toUpperCase?.() ?? "UNKNOWN",
    dot: "bg-white/20",
    tone: "text-white/30",
  }

  const audioUrl = job.previewUrl ? `${previewOrigin}${job.previewUrl}` : null
  const isReady = job.status === "ready" && audioUrl

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
    const el = document.getElementById(`audio-${job.id}`) as HTMLAudioElement | null
    if (!el) return
    if (el.paused) {
      el.play()
    } else {
      el.pause()
    }
  }, [job.id])

  const timeLabel = useMemo(() => {
    if (!job.createdAt) return ""
    const d = new Date(job.createdAt)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }, [job.createdAt])

  return (
    <div className="group px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
      {/* Row 1: Index + Prompt + Status */}
      <div className="flex items-center gap-2.5">
        <span className="text-[0.5rem] tabular-nums text-white/20 w-4 shrink-0 text-right font-light">
          {String(index).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[0.5rem] tracking-[0.15em] text-white/60 truncate">
            {job.prompt}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.interpretation && (
            <button
              type="button"
              onClick={() => setShowInterpretation((prev) => !prev)}
              className="text-[0.38rem] tracking-[0.25em] uppercase text-white/20 hover:text-white/50 transition-colors px-1"
            >
              {showInterpretation ? "HIDE" : "AI"}
            </button>
          )}
          {timeLabel && (
            <span className="text-[0.38rem] tabular-nums text-white/15">{timeLabel}</span>
          )}
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} title={meta.label} />
        </div>
      </div>

      {/* Row 2: Audio Player + Drag Handle (only when ready) */}
      {isReady && (
        <div className="flex items-center gap-2.5 mt-2 ml-[26px]">
          <button
            type="button"
            onClick={togglePlay}
            className="w-6 h-6 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center transition-colors shrink-0"
          >
            {isPlaying ? (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white" fillOpacity="0.7">
                <rect x="1" y="1" width="2" height="6" rx="0.5" />
                <rect x="5" y="1" width="2" height="6" rx="0.5" />
              </svg>
            ) : (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white" fillOpacity="0.7">
                <path d="M2 1L7 4L2 7Z" />
              </svg>
            )}
          </button>

          {/* Minimal waveform bar placeholder */}
          <div className="flex-1 flex items-center gap-[2px] h-4 overflow-hidden opacity-40">
            {Array.from({ length: 32 }, (_, i) => {
              const seed = (job.id.charCodeAt(i % job.id.length) + i * 7) % 100
              const h = 20 + seed * 0.8
              return (
                <div
                  key={i}
                  className="flex-1 bg-white/50 rounded-[0.5px] min-w-[1px]"
                  style={{ height: `${h}%` }}
                />
              )
            })}
          </div>

          {/* Drag handle — drag this onto Ableton */}
          <a
            href={audioUrl}
            download={`species8-${job.id}.wav`}
            draggable
            onDragStart={handleDragStart}
            className="w-6 h-6 rounded-[4px] bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition-colors shrink-0 cursor-grab active:cursor-grabbing"
            title="Drag to Ableton or click to download"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1">
              <path d="M5 1v6M3 5l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 8h8" strokeLinecap="round" />
            </svg>
          </a>

          <audio id={`audio-${job.id}`} ref={audioRef} preload="none" src={audioUrl} />
        </div>
      )}

      {/* Row 2 alt: Status text when not ready */}
      {!isReady && job.status !== "error" && (
        <div className="mt-1.5 ml-[26px] text-[0.38rem] tracking-[0.3em] uppercase text-white/20">
          {meta.label}
        </div>
      )}
      {job.status === "error" && (
        <div className="mt-1.5 ml-[26px] text-[0.38rem] tracking-[0.2em] text-white/20 normal-case">
          {job.error ?? "Processing failed"}
        </div>
      )}

      {/* AI Interpretation (collapsible) */}
      {job.interpretation && showInterpretation && (
        <div className="mt-2 ml-[26px] pl-2.5 border-l border-white/[0.06] space-y-1.5">
          <div className="text-[0.42rem] tracking-[0.15em] text-white/45 italic normal-case">
            {job.interpretation.mood}
          </div>
          <div className="text-[0.38rem] leading-relaxed text-white/25 normal-case">
            {job.interpretation.reasoning}
          </div>
          <div className="flex flex-wrap gap-1">
            {job.interpretation.filters.map((filter, i) => (
              <span
                key={i}
                className="text-[0.36rem] tracking-[0.15em] bg-white/[0.04] border border-white/[0.06] rounded-[3px] px-1.5 py-0.5 text-white/30"
                title={filter.reasoning}
              >
                {filter.type}
              </span>
            ))}
          </div>
          <div className="text-[0.33rem] tracking-[0.25em] uppercase text-white/15">
            {Math.round(job.interpretation.confidence * 100)}% confidence
          </div>
        </div>
      )}
    </div>
  )
}

function ControlModule({
  label,
  value,
  isFirst,
}: {
  label: string
  value: number
  isFirst?: boolean
}) {
  const rotation = -110 + value * 220

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2.5 ${
        isFirst ? "" : "border-l border-white/30"
      }`}
    >
      <span className="text-white/60 text-[0.55rem] tracking-[0.45em]">{label}</span>
      <div className="relative w-8 h-8 border border-white/70 rounded-[4px] bg-white/[0.04]">
        <div className="absolute inset-[4px] border border-white/30 rounded-[3px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[2px] h-3 bg-white" style={{ transform: `rotate(${rotation}deg)` }} />
        </div>
      </div>
    </div>
  )
}

function SphinxMascot() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="white" strokeWidth="0.9" className="opacity-80">
      <path d="M2 13.5 L5.5 4.5 L8 1.5 L12 0.8 L16 2.2 L18.5 5.5 L21 13.5 Z" />
      <path d="M8 10 L10.5 10.8 L12.5 9.2" />
      <path d="M10 6.2 L11.5 5.5 L13 6.2" />
      <path d="M4 15.5 H20" />
      <path d="M6.5 15.5 L7.5 13 L9.2 12" />
      <path d="M17.5 15.5 L16.5 13 L14.8 12" />
    </svg>
  )
}

function DNAWaveformIcon() {
  return (
    <motion.svg
      width="80"
      height="28"
      viewBox="0 0 80 28"
      fill="none"
      stroke="white"
      strokeWidth="0.9"
      className="opacity-80"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 4, repeat: Infinity }}
    >
      <motion.path
        d="M2 8 C10 2 18 14 26 8 C34 2 42 14 50 8 C58 2 66 14 74 8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <motion.path
        d="M2 20 C10 14 18 26 26 20 C34 14 42 26 50 20 C58 14 66 26 74 20"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.4 }}
      />
      {[0, 12, 24, 36, 48, 60, 72].map((x) => (
        <motion.line
          key={x}
          x1={x + 4}
          y1={9.2}
          x2={x + 4}
          y2={18.8}
          stroke="white"
          strokeWidth="0.6"
          initial={{ scaleY: 0.4 }}
          animate={{ scaleY: [0.4, 1, 0.4] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: x / 120 }}
        />
      ))}
    </motion.svg>
  )
}
