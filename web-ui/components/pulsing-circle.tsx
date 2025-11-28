"use client"

import { motion } from "framer-motion"

export default function PulsingCircle() {
  return (
    <div className="absolute bottom-10 right-10 hidden md:block">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border border-white/40 blur-md"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border border-dashed border-white/30"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.svg
          className="absolute inset-0 w-full h-full text-[10px] fill-white/80"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transform: "scale(1.5)" }}
        >
          <defs>
            <path id="species-circle" d="M 50, 50 m -42, 0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" />
          </defs>
          <text className="instrument tracking-[0.35em]">
            <textPath href="#species-circle" startOffset="0%">
              mutate the signal • mutate the signal • mutate the signal •{" "}
            </textPath>
          </text>
        </motion.svg>
      </div>
    </div>
  )
}
