// Species 8 — Effect Library
// Single source of truth for all mutation effects (ffmpeg + python).
// Each effect defines its engine, template/script, parameter ranges,
// and a creative description that feeds the AI system prompt.

const effects = {
  // ── FFMPEG EFFECTS ──────────────────────────────────────────────

  stereo_widen: {
    engine: "ffmpeg",
    filter: (p) => `stereowiden=delay=${p.delay ?? 20}:feedback=${p.feedback ?? 0.5}:crossfeed=${p.crossfeed ?? 0.2}:drymix=${p.drymix ?? 0.7}`,
    defaults: { delay: 20, feedback: 0.5, crossfeed: 0.2, drymix: 0.7 },
    ranges: { delay: [1, 100], feedback: [0, 0.9], crossfeed: [0, 0.8], drymix: [0, 1] },
    description: "Widens stereo field using delay-based decorrelation. Good for immersive, expansive, 8D-style spatial effects.",
    tags: ["wider", "wide", "8d", "immersive", "spacious", "orbit"],
  },

  highpass: {
    engine: "ffmpeg",
    filter: (p) => `highpass=f=${p.frequency ?? 160}:p=2`,
    defaults: { frequency: 160 },
    ranges: { frequency: [20, 2000] },
    description: "Removes low frequencies. Cleans mud, adds clarity, thins out the sound.",
    tags: ["clean", "clarity", "thin", "telephone"],
  },

  lowpass: {
    engine: "ffmpeg",
    filter: (p) => `lowpass=f=${p.frequency ?? 2400}:p=2`,
    defaults: { frequency: 2400 },
    ranges: { frequency: [200, 20000] },
    description: "Removes high frequencies. Creates warmth, muffled textures, underwater vibes.",
    tags: ["warm", "muffled", "underwater", "dark", "lo-fi"],
  },

  eq_shelf: {
    engine: "ffmpeg",
    filter: (p) => `equalizer=f=${p.frequency ?? 5200}:t=h:w=${p.width ?? 2600}:g=${p.gain ?? 5}`,
    defaults: { frequency: 5200, width: 2600, gain: 5 },
    ranges: { frequency: [100, 16000], width: [100, 8000], gain: [-12, 12] },
    description: "Shelving EQ for brightness/darkness. Positive gain = brighter/airy, negative = darker/dull.",
    tags: ["bright", "air", "sparkle", "dark", "dull"],
  },

  echo: {
    engine: "ffmpeg",
    filter: (p) => `aecho=${p.in_gain ?? 0.8}:${p.out_gain ?? 0.9}:${p.delay ?? 90}:${p.decay ?? 0.4}`,
    defaults: { in_gain: 0.8, out_gain: 0.9, delay: 90, decay: 0.4 },
    ranges: { in_gain: [0, 1], out_gain: [0, 1], delay: [10, 1000], decay: [0, 0.9] },
    description: "Echo/reverb via delay feedback. Good for space, cathedral, cave, vast environments.",
    tags: ["reverb", "space", "cathedral", "cave", "echo"],
  },

  phaser: {
    engine: "ffmpeg",
    filter: (p) => `aphaser=type=t:speed=${p.speed ?? 0.5}:decay=${p.decay ?? 0.6}`,
    defaults: { speed: 0.5, decay: 0.6 },
    ranges: { speed: [0.1, 5], decay: [0.1, 0.9] },
    description: "Phase-shifting for swirling, orbital motion. Creates movement and rotation in the stereo field.",
    tags: ["swirl", "orbit", "motion", "phaser", "rotate"],
  },

  crusher: {
    engine: "ffmpeg",
    filter: (p) => `acrusher=bits=${p.bits ?? 8}:mode=log:aa=1:samples=${p.samples ?? 1}:mix=${p.mix ?? 0.4}`,
    defaults: { bits: 8, samples: 1, mix: 0.4 },
    ranges: { bits: [2, 16], samples: [1, 64], mix: [0, 1] },
    description: "Bitcrusher for digital destruction, lo-fi, glitchy, degraded textures.",
    tags: ["bitcrush", "glitch", "degrade", "digital", "destroy", "lofi"],
  },

  pitch_shift: {
    engine: "ffmpeg",
    filter: (p) => `asetrate=48000*${p.ratio ?? 1.25},aresample=48000`,
    defaults: { ratio: 1.25 },
    ranges: { ratio: [0.25, 4] },
    description: "Pitch shifting via sample rate manipulation. >1 = higher, <1 = lower. Extreme values create alien/chipmunk/demon effects.",
    tags: ["pitch", "chipmunk", "demon", "alien", "helium"],
  },

  spectral_warp: {
    engine: "ffmpeg",
    filter: (p) => `afftfilt=real='hypot(re,im)*cos(atan2(im,re)*${p.warp ?? 1.5})':imag='hypot(re,im)*sin(atan2(im,re)*${p.warp ?? 1.5})':win_size=${p.win_size ?? 1024}:overlap=0.75`,
    defaults: { warp: 1.5, win_size: 1024 },
    ranges: { warp: [0.5, 4], win_size: [256, 4096] },
    description: "FFT-based spectral warping for metallic, robotic, vocoder-like timbres.",
    tags: ["metallic", "robotic", "vocoder", "spectral", "alien"],
  },

  chorus: {
    engine: "ffmpeg",
    filter: (p) => `chorus=${p.in_gain ?? 0.5}:${p.out_gain ?? 0.9}:${p.delays ?? "50|60|40"}:${p.decays ?? "0.4|0.32|0.3"}:${p.speeds ?? "0.25|0.4|0.3"}:${p.depths ?? "2|2.3|1.3"}`,
    defaults: { in_gain: 0.5, out_gain: 0.9, delays: "50|60|40", decays: "0.4|0.32|0.3", speeds: "0.25|0.4|0.3", depths: "2|2.3|1.3" },
    ranges: { in_gain: [0, 1], out_gain: [0, 1] },
    description: "Multi-voice chorus for lush, shimmering, doubled textures.",
    tags: ["chorus", "shimmer", "lush", "double", "detune"],
  },

  compressor: {
    engine: "ffmpeg",
    filter: (p) => `acompressor=threshold=${p.threshold ?? -20}dB:ratio=${p.ratio ?? 6}:attack=${p.attack ?? 5}:release=${p.release ?? 50}:makeup=${p.makeup ?? 4}dB`,
    defaults: { threshold: -20, ratio: 6, attack: 5, release: 50, makeup: 4 },
    ranges: { threshold: [-60, 0], ratio: [1, 20], attack: [0.1, 100], release: [10, 1000], makeup: [0, 24] },
    description: "Dynamic range compression. Adds punch, loudness, or extreme squashing for pumping effects.",
    tags: ["compress", "punch", "slam", "loud", "pump"],
  },

  tremolo: {
    engine: "ffmpeg",
    filter: (p) => `tremolo=f=${p.frequency ?? 6}:d=${p.depth ?? 0.7}`,
    defaults: { frequency: 6, depth: 0.7 },
    ranges: { frequency: [0.5, 40], depth: [0, 1] },
    description: "Amplitude modulation / tremolo. Creates pulsing, stuttering, rhythmic volume changes.",
    tags: ["tremolo", "pulse", "stutter", "wobble"],
  },

  flanger: {
    engine: "ffmpeg",
    filter: (p) => `flanger=delay=${p.delay ?? 3}:depth=${p.depth ?? 6}:speed=${p.speed ?? 0.4}:regen=${p.regen ?? 30}:width=${p.width ?? 70}`,
    defaults: { delay: 3, depth: 6, speed: 0.4, regen: 30, width: 70 },
    ranges: { delay: [0, 30], depth: [0, 10], speed: [0.1, 10], regen: [0, 95], width: [0, 100] },
    description: "Flanging for jet-sweep, metallic, comb-filter textures.",
    tags: ["flanger", "jet", "sweep", "metallic"],
  },

  noise_texture: {
    engine: "ffmpeg",
    filter: (p) => `aeval=val(0)+random(0)*${p.amount ?? 0.02}|val(1)+random(1)*${p.amount ?? 0.02}`,
    defaults: { amount: 0.02 },
    ranges: { amount: [0.001, 0.2] },
    description: "Adds random noise texture/grain over the signal. Lo-fi, vinyl, tape hiss vibes.",
    tags: ["grain", "texture", "noise", "tape", "vinyl", "hiss"],
  },

  // ── NEW FFMPEG EFFECTS ──────────────────────────────────────────

  freq_shift: {
    engine: "ffmpeg",
    filter: (p) => `afreqshift=shift=${p.shift ?? 100}:level=${p.level ?? 1}`,
    defaults: { shift: 100, level: 1 },
    ranges: { shift: [-2000, 2000], level: [0, 1] },
    description: "Frequency shifting (not pitch shifting). Creates Doppler effects, detuned alien textures, inharmonic bell-like tones. Negative = downward shift.",
    tags: ["doppler", "detuned", "alien", "inharmonic", "bell", "frequency"],
  },

  psychoacoustic_clip: {
    engine: "ffmpeg",
    filter: (p) => `apsyclip=level_in=${p.level_in ?? 1}:level_out=${p.level_out ?? 1}`,
    defaults: { level_in: 1, level_out: 1 },
    ranges: { level_in: [0.1, 8], level_out: [0.1, 4] },
    description: "Psychoacoustic-aware clipping for intelligent overdrive that preserves tonal quality better than hard clipping.",
    tags: ["overdrive", "clip", "warm", "saturate", "analog"],
  },

  soft_clip: {
    engine: "ffmpeg",
    filter: (p) => `asoftclip=type=${p.type ?? "tanh"}:threshold=${p.threshold ?? 1}:output=${p.output ?? 1}`,
    defaults: { type: "tanh", threshold: 1, output: 1 },
    ranges: { threshold: [0.01, 2], output: [0.1, 2] },
    description: "Soft clipping / saturation with multiple curve types (tanh, atan, cubic, exp, alg, quintic, sin, erf). Warm tube-like distortion.",
    tags: ["saturation", "warm", "tube", "tape", "soft"],
  },

  exciter: {
    engine: "ffmpeg",
    filter: (p) => `aexciter=level_in=${p.level_in ?? 1}:level_out=${p.level_out ?? 1}:amount=${p.amount ?? 1}:drive=${p.drive ?? 1}:blend=${p.blend ?? 0}:freq=${p.freq ?? 7500}`,
    defaults: { level_in: 1, level_out: 1, amount: 1, drive: 1, blend: 0, freq: 7500 },
    ranges: { amount: [0, 64], drive: [0, 10], blend: [-10, 10], freq: [2000, 16000] },
    description: "Harmonic exciter that adds upper harmonics for presence, crispness, and detail. Makes sounds cut through a mix.",
    tags: ["excite", "presence", "crisp", "detail", "harmonics", "air"],
  },

  multiband_compress: {
    engine: "ffmpeg",
    filter: (p) => `mcompand=0.005,0.1 6 -47/-40,-34/-34,-17/-33 ${p.crossover1 ?? 100} 0.003,0.05 6 -47/-40,-34/-34,-17/-33 ${p.crossover2 ?? 3000} 0.000625,0.0125 6 -47/-40,-34/-34,-17/-33`,
    defaults: { crossover1: 100, crossover2: 3000 },
    ranges: { crossover1: [50, 500], crossover2: [1000, 8000] },
    description: "Multiband compressor that processes bass/mid/treble independently. Tightens dynamics per frequency band.",
    tags: ["multiband", "master", "tight", "controlled"],
  },

  dynamic_eq: {
    engine: "ffmpeg",
    filter: (p) => `adynamicequalizer=threshold=${p.threshold ?? -24}:dfrequency=${p.frequency ?? 1000}:dqfactor=${p.qfactor ?? 1}:tfrequency=${p.target_freq ?? 1000}:tqfactor=${p.target_q ?? 1}:attack=${p.attack ?? 20}:release=${p.release ?? 200}:ratio=${p.ratio ?? 1}`,
    defaults: { threshold: -24, frequency: 1000, qfactor: 1, target_freq: 1000, target_q: 1, attack: 20, release: 200, ratio: 1 },
    ranges: { threshold: [-60, 0], frequency: [20, 20000], ratio: [0, 30] },
    description: "Dynamic EQ — frequency-dependent compression/expansion. Tames resonances or boosts only when needed.",
    tags: ["dynamic", "adaptive", "surgical", "resonance"],
  },

  sub_boost: {
    engine: "ffmpeg",
    filter: (p) => `asubboost=dry=${p.dry ?? 1}:wet=${p.wet ?? 1}:decay=${p.decay ?? 0}:feedback=${p.feedback ?? 0.9}:cutoff=${p.cutoff ?? 100}:slope=${p.slope ?? 0.5}:delay=${p.delay ?? 20}`,
    defaults: { dry: 1, wet: 1, decay: 0, feedback: 0.9, cutoff: 100, slope: 0.5, delay: 20 },
    ranges: { wet: [0, 1], feedback: [0, 1], cutoff: [20, 200], delay: [1, 100] },
    description: "Sub-bass enhancement / generation. Adds deep low-end rumble and weight.",
    tags: ["sub", "bass", "rumble", "deep", "weight", "808"],
  },

  rubberband_stretch: {
    engine: "ffmpeg",
    filter: (p) => `rubberband=tempo=${p.tempo ?? 0.5}:pitch=${p.pitch ?? 1}`,
    defaults: { tempo: 0.5, pitch: 1 },
    ranges: { tempo: [0.1, 4], pitch: [0.5, 2] },
    description: "High-quality time stretching without pitch change (or pitch shift without time change). Uses Rubber Band Library.",
    tags: ["stretch", "timestretch", "slowmo", "speed"],
  },

  haas_stereo: {
    engine: "ffmpeg",
    filter: (p) => `haas=level_in=${p.level_in ?? 1}:level_out=${p.level_out ?? 1}:side_gain=${p.side_gain ?? 1}:middle_source=${p.middle_source ?? "mid"}`,
    defaults: { level_in: 1, level_out: 1, side_gain: 1, middle_source: "mid" },
    ranges: { level_in: [0.1, 4], level_out: [0.1, 4], side_gain: [0, 4] },
    description: "Haas effect stereo widening via short inter-aural delay. Creates natural-sounding width without artifacts.",
    tags: ["haas", "stereo", "wide", "natural", "pan"],
  },

  vibrato: {
    engine: "ffmpeg",
    filter: (p) => `vibrato=f=${p.frequency ?? 5}:d=${p.depth ?? 0.5}`,
    defaults: { frequency: 5, depth: 0.5 },
    ranges: { frequency: [0.1, 20], depth: [0, 1] },
    description: "Pitch vibrato — periodic pitch modulation. Creates wobbly, watery, seasick effects at extreme settings.",
    tags: ["vibrato", "wobble", "watery", "seasick", "warp"],
  },

  // ── PYTHON EFFECTS ──────────────────────────────────────────────

  spectral_freeze: {
    engine: "python",
    script: "spectral_freeze.py",
    defaults: { position: 0.3, duration: 5, fft_size: 4096, crossfade: 0.5 },
    ranges: { position: [0, 1], duration: [1, 30], fft_size: [1024, 8192], crossfade: [0, 1] },
    description: "Captures a single spectral frame (STFT snapshot) and sustains it as an infinite drone. Creates frozen-in-time, suspended, crystallized textures.",
    tags: ["freeze", "drone", "sustain", "crystal", "suspended", "frozen", "infinite"],
  },

  granular_cloud: {
    engine: "python",
    script: "granular_cloud.py",
    defaults: { grain_size: 0.05, density: 20, pitch_scatter: 0.3, position_scatter: 0.5, duration: 8, stereo_spread: 0.8 },
    ranges: { grain_size: [0.005, 0.5], density: [1, 100], pitch_scatter: [0, 2], position_scatter: [0, 1], duration: [1, 30], stereo_spread: [0, 1] },
    description: "Granular synthesis — decomposes audio into tiny grains and recomposes them into clouds, textures, and swarms. Creates ambient, atmospheric, particulate sound.",
    tags: ["granular", "cloud", "swarm", "particles", "ambient", "texture", "scatter"],
  },

  paulstretch: {
    engine: "python",
    script: "paulstretch.py",
    defaults: { stretch_factor: 8, window_size: 0.25 },
    ranges: { stretch_factor: [2, 100], window_size: [0.05, 1] },
    description: "Extreme time stretching (paulstretch algorithm). Turns any sound into an ethereal, glacial, ambient drone. 8x = dreamy, 50x+ = cosmic.",
    tags: ["paulstretch", "stretch", "glacial", "ethereal", "ambient", "drone", "cosmic", "slow"],
  },

  fractal_noise: {
    engine: "python",
    script: "fractal_noise.py",
    defaults: { octaves: 6, persistence: 0.5, lacunarity: 2, speed: 1, depth: 0.7, mode: "amplitude" },
    ranges: { octaves: [1, 10], persistence: [0.1, 0.9], lacunarity: [1.5, 4], speed: [0.1, 10], depth: [0, 1] },
    description: "Fractal Brownian motion (fBm) noise modulation. Applies organic, natural-feeling amplitude or filter modulation. Creates breathing, living, evolving textures.",
    tags: ["fractal", "organic", "evolving", "breathing", "living", "modulation", "natural"],
  },

  cellular_automata: {
    engine: "python",
    script: "cellular_automata.py",
    defaults: { rule: 30, steps: 64, gate_resolution: 16, density: 0.5, bpm: 120 },
    ranges: { rule: [0, 255], steps: [16, 256], gate_resolution: [4, 64], density: [0.1, 0.9], bpm: [60, 300] },
    description: "Wolfram 1D cellular automata generates complex rhythmic gate patterns. Rule 30 = chaotic, Rule 110 = complex, Rule 90 = fractal. Creates algorithmic, generative rhythmic chopping.",
    tags: ["cellular", "automata", "gate", "chop", "algorithmic", "generative", "pattern"],
  },

  // ── NEW RHYTHM / POLYRHYTHM EFFECTS ─────────────────────────────

  polyrhythm_gate: {
    engine: "python",
    script: "polyrhythm_gate.py",
    defaults: { layers: [3, 4, 5], bpm: 120, duration: 8, swing: 0, gate_shape: "sharp", mix: 0.9 },
    ranges: { bpm: [40, 300], duration: [1, 30], swing: [0, 0.5], mix: [0, 1] },
    description: "Polyrhythmic amplitude gating — layers multiple time divisions (e.g., 3 against 4 against 5) to create complex, interlocking rhythmic patterns. The interference patterns create emergent grooves that shift and evolve. Perfect for Afrobeat-style cross-rhythms, IDM complexity, or hypnotic polymetric textures.",
    tags: ["polyrhythm", "polymetric", "gate", "rhythm", "cross-rhythm", "afrobeat", "idm", "groove", "interlocking"],
  },

  euclidean_stutter: {
    engine: "python",
    script: "euclidean_stutter.py",
    defaults: { pulses: 5, steps: 8, layers: 1, bpm: 120, duration: 8, rotation: 0, stutter_length: 0.05, feedback: 0.3 },
    ranges: { pulses: [1, 32], steps: [2, 64], layers: [1, 4], bpm: [40, 300], duration: [1, 30], rotation: [0, 63], stutter_length: [0.01, 0.2], feedback: [0, 0.9] },
    description: "Euclidean rhythm algorithm generates maximally-even beat distributions. E(5,8) = Cuban tresillo, E(3,8) = Cuban tresillo variant, E(7,12) = West African bell. Multiple layers create polyrhythmic stutter/repeat effects with optional feedback trails.",
    tags: ["euclidean", "stutter", "rhythm", "tresillo", "clave", "repeat", "glitch", "tribal", "african", "polyrhythm"],
  },
}

/**
 * Build a human-readable catalog description for the AI system prompt.
 * This tells Claude what effects are available and how to use them.
 */
export function buildCatalogDescription() {
  const lines = ["# Available Effects\n"]

  for (const [name, effect] of Object.entries(effects)) {
    lines.push(`## ${name}`)
    lines.push(`Engine: ${effect.engine}`)
    lines.push(`Description: ${effect.description}`)
    lines.push(`Tags: ${effect.tags.join(", ")}`)

    const defaults = effect.defaults
    const ranges = effect.ranges
    const params = []
    for (const [key, val] of Object.entries(defaults)) {
      const range = ranges[key]
      if (range) {
        params.push(`  ${key}: ${val} (range: ${range[0]}–${range[1]})`)
      } else {
        params.push(`  ${key}: ${val}`)
      }
    }
    lines.push(`Parameters:\n${params.join("\n")}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Get an effect definition by name.
 */
export function getEffect(name) {
  return effects[name] ?? null
}

/**
 * Get all effect names.
 */
export function listEffects() {
  return Object.keys(effects)
}

/**
 * Build an ffmpeg filter string from an effect name + params.
 * Returns null if the effect is not ffmpeg-based.
 */
export function buildFfmpegFilter(name, params = {}) {
  const effect = effects[name]
  if (!effect || effect.engine !== "ffmpeg") return null
  const merged = { ...effect.defaults, ...params }
  return effect.filter(merged)
}

/**
 * Get the Python script filename for a python-engine effect.
 * Returns null if the effect is not python-based.
 */
export function getPythonScript(name) {
  const effect = effects[name]
  if (!effect || effect.engine !== "python") return null
  return effect.script
}

export default effects
