"use client"

import AlienVisualizer from "@/components/alien-visualizer"
import PulsingCircle from "@/components/pulsing-circle"
import RichTextEditor from "@/components/rich-text-editor"
import ShaderBackground from "@/components/shader-background"

export default function PromptStudio() {
  return (
    <ShaderBackground>
      <div className="relative z-10 min-h-screen px-4 md:px-6 pt-10 pb-12 flex flex-col items-center gap-8">
        <div className="text-center max-w-3xl space-y-3">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[0.65rem] tracking-[0.35em] uppercase text-white/80">
            Burn the square. Birth the Strange.
          </div>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight">
            Mutate sound with{" "}
            <span className="italic instrument text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-cyan-200">
              alien intention
            </span>
          </h1>
          <p className="text-white/75 text-sm md:text-base">
            Drop reference stems and describe the mutation in language. Species 8 fuses your words and files into a
            binaural evolution.
          </p>
        </div>

        <AlienVisualizer className="max-w-xl w-full" />
        <RichTextEditor className="max-w-3xl w-full" />
        <PulsingCircle />
      </div>
    </ShaderBackground>
  )
}
