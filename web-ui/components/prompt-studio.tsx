"use client"

import AlienVisualizer from "@/components/alien-visualizer"
import PulsingCircle from "@/components/pulsing-circle"
import RichTextEditor from "@/components/rich-text-editor"
import ShaderBackground from "@/components/shader-background"

export default function PromptStudio() {
  return (
    <ShaderBackground>
      <div className="relative z-10 min-h-screen px-6 md:px-12 pt-16 pb-20">
        <div className="max-w-4xl mb-12">
          <div
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs tracking-[0.3em] uppercase text-white/80 mb-6"
            style={{ filter: "url(#species-glass)" }}
          >
            Species 8 · AI Mutator
          </div>
          <h1 className="text-4xl md:text-6xl font-light text-white leading-tight mb-4">
            Compose{" "}
            <span className="instrument italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-cyan-200">
              impossible
            </span>{" "}
            sound mutations.
          </h1>
          <p className="text-white/80 max-w-2xl text-base md:text-lg">
            Describe the sound in plain language while the alien visualizer reacts to every nuance. Prompts are sent to
            the Species 8 DSP through the bridge and the shader creature mirrors the evolving energy.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-stretch">
          <RichTextEditor />
          <AlienVisualizer />
        </div>

        <PulsingCircle />
      </div>
    </ShaderBackground>
  )
}
