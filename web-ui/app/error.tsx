"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-black text-white/70 flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-[0.6rem] tracking-[0.3em] uppercase text-white/45">Species 8 UI Error</div>
      <div className="max-w-[560px] text-center text-[0.72rem] text-white/55 leading-relaxed">
        {error?.message || "Unexpected rendering error"}
      </div>
      <button
        type="button"
        onClick={reset}
        className="text-[0.52rem] tracking-[0.2em] uppercase px-3 py-1.5 border border-white/30 text-white/75 hover:bg-white/10"
      >
        Reload UI
      </button>
    </div>
  )
}
