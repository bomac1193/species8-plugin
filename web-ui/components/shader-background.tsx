"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ShaderBackgroundProps {
  children: ReactNode
}

export default function ShaderBackground({ children }: ShaderBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const onEnter = () => setActive(true)
    const onLeave = () => setActive(false)

    node.addEventListener("pointerenter", onEnter)
    node.addEventListener("pointerleave", onLeave)

    return () => {
      node.removeEventListener("pointerenter", onEnter)
      node.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen w-full bg-black relative overflow-hidden">
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="species-glass" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.4" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
            />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0 animate-slow-pan">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(132,56,255,0.45),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(0,213,255,0.35),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(255,70,190,0.35),transparent_50%)]" />
        <div
          className={cn(
            "absolute inset-0 opacity-60 blur-[120px]",
            active ? "animate-gradient-shift-fast" : "animate-gradient-shift",
          )}
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.2), rgba(69,33,255,0.35), rgba(0,224,255,0.25), rgba(255,90,217,0.3), rgba(255,255,255,0.2))",
          }}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      {children}
    </div>
  )
}
