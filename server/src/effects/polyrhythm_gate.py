#!/usr/bin/env python3
"""Species 8 — Polyrhythmic Gate
Layers multiple time divisions to create interlocking rhythmic patterns.
E.g. 3 against 4 against 5 creates complex, shifting grooves.
Usage: python3 polyrhythm_gate.py input.wav output.wav '{"layers":[3,4,5],"bpm":120}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def build_polyrhythm_envelope(num_samples, sr, layers, bpm, swing=0, gate_shape="sharp"):
    """Build a composite polyrhythmic gate envelope from multiple pulse layers."""
    beat_duration = 60.0 / bpm
    bar_duration = beat_duration * 4  # Assume 4/4 for bar length
    bar_samples = int(bar_duration * sr)

    # Each layer divides the bar into N equal pulses
    combined = np.ones(num_samples)

    for division in layers:
        pulse_duration = bar_duration / division
        pulse_samples = int(pulse_duration * sr)

        layer_env = np.zeros(num_samples)

        for i in range(int(np.ceil(num_samples / pulse_samples))):
            # Apply swing: offset even-numbered pulses
            swing_offset = 0
            if i % 2 == 1 and swing > 0:
                swing_offset = int(swing * pulse_samples)

            start = i * pulse_samples + swing_offset
            if start >= num_samples:
                break

            # Gate length = 60% of pulse duration (rhythmic gap)
            gate_len = int(pulse_samples * 0.6)
            end = min(start + gate_len, num_samples)
            seg_len = end - start

            if seg_len <= 0:
                continue

            if gate_shape == "sharp":
                # Sharp gate with tiny attack/release
                env_seg = np.ones(seg_len)
                attack = min(int(0.001 * sr), seg_len // 4)
                release = min(int(0.003 * sr), seg_len // 4)
                if attack > 0:
                    env_seg[:attack] = np.linspace(0, 1, attack)
                if release > 0:
                    env_seg[-release:] = np.linspace(1, 0, release)
            elif gate_shape == "smooth":
                env_seg = np.sin(np.linspace(0, np.pi, seg_len))
            elif gate_shape == "ramp":
                env_seg = np.linspace(1, 0, seg_len)
            else:
                env_seg = np.ones(seg_len)

            layer_env[start:end] = np.maximum(layer_env[start:end], env_seg)

        # Multiply layers together — where pulses don't align, signal is gated
        combined *= layer_env

    return combined

def polyrhythm_gate(input_path, output_path, params):
    layers = params.get("layers", [3, 4, 5])
    bpm = params.get("bpm", 120)
    duration = params.get("duration", 8.0)
    swing = params.get("swing", 0)
    gate_shape = params.get("gate_shape", "sharp")
    mix = params.get("mix", 0.9)

    if isinstance(layers, (int, float)):
        layers = [int(layers)]
    layers = [int(l) for l in layers]

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    # Limit to requested duration
    max_samples = int(duration * sr)
    if num_samples > max_samples:
        audio = audio[:max_samples]
        num_samples = max_samples

    # Build polyrhythmic envelope
    envelope = build_polyrhythm_envelope(num_samples, sr, layers, bpm, swing, gate_shape)

    # Apply with dry/wet mix
    for ch in range(num_channels):
        audio[:, ch] = audio[:, ch] * (envelope * mix + (1 - mix))

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio *= 0.9 / peak

    sf.write(output_path, audio, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    polyrhythm_gate(sys.argv[1], sys.argv[2], params)
