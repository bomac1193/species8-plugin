"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000"

export default function AlienVisualizer() {
  const [energy, setEnergy] = useState(0.25)
  const [waveform, setWaveform] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchWaveform = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/preview/waveform`)
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        const samples = Array.isArray(data?.data) ? data.data.slice(0, 80) : []
        setWaveform(samples)
        if (samples.length) {
          const max = samples.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0)
          setEnergy(0.2 + Math.min(0.8, max))
        }
      } catch (error) {
        console.error("Failed to fetch waveform preview", error)
      }
    }

    fetchWaveform()
    const timer = setInterval(fetchWaveform, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const waveformBars = useMemo(() => {
    if (!waveform.length) return null
    return waveform.map((value, index) => {
      const height = Math.max(4, Math.abs(value) * 120)
      return (
        <span
          key={`${value}-${index}`}
          style={{ height }}
          className="w-1 rounded-full bg-gradient-to-b from-white/80 via-purple-200 to-cyan-200/60"
        />
      )
    })
  }, [waveform])

  return (
    <div className="relative w-full flex items-center justify-center min-h-[520px]">
      <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-purple-600/20 via-fuchsia-500/10 to-cyan-400/10 pointer-events-none" />

      <div className="relative w-full max-w-xl aspect-[3/4] rounded-[60px] border border-white/20 bg-white/5/20 backdrop-blur-3xl overflow-hidden shadow-[0_40px_120px_rgba(90,30,255,0.35)]">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(91,33,182,0.65), transparent 45%), radial-gradient(circle at 75% 10%, rgba(0,232,255,0.5), transparent 40%), radial-gradient(circle at 50% 70%, rgba(255,74,176,0.45), transparent 50%), linear-gradient(135deg, rgba(9,6,34,0.95), rgba(15,5,45,0.95))",
          }}
          animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(20deg)", "hue-rotate(0deg)"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute inset-10 rounded-[50%_50%_42%_42%/68%_68%_24%_24%] bg-gradient-to-br from-white/30 via-purple-300/60 to-cyan-200/60 backdrop-blur-[40px] border border-white/30 shadow-[inset_0_0_80px_rgba(255,255,255,0.18)]"
          animate={{
            scale: [1, 1 + energy * 0.08, 1],
            rotate: [-1, 1, -1],
            filter: [
              "drop-shadow(0 0 30px rgba(99,102,241,0.35))",
              "drop-shadow(0 0 60px rgba(34,197,94,0.35))",
              "drop-shadow(0 0 30px rgba(99,102,241,0.35))",
            ],
          }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <motion.div
            className="absolute top-[38%] left-[22%] w-[32%] h-[18%] bg-black/70 rounded-[60%_40%_60%_40%/70%_70%_30%_30%] blur-sm"
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="absolute top-[38%] right-[22%] w-[32%] h-[18%] bg-black/70 rounded-[40%_60%_40%_60%/70%_70%_30%_30%] blur-sm"
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-b from-cyan-200/80 to-transparent blur-2xl opacity-70"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>

        <div className="absolute bottom-8 left-10 right-10 flex items-end gap-1 h-28">
          {waveformBars ?? (
            <div className="text-xs text-white/70 tracking-[0.3em] uppercase">Awaiting Audio</div>
          )}
        </div>

        <motion.div
          className="absolute -right-6 -bottom-6 opacity-60"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        >
          <div className="relative w-36 h-36">
            <div className="absolute inset-0 rounded-full border border-white/30 blur-sm" />
            <div className="absolute inset-2 rounded-full border border-white/40 blur-md opacity-80 animate-pulse-glow" />
            <motion.div
              className="absolute inset-0 rounded-full border border-dashed border-white/40 text-[10px] tracking-[0.4em] uppercase text-white/70 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            >
              mutate • species8 • mutate •
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
