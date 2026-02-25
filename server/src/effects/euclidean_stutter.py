#!/usr/bin/env python3
"""Species 8 — Euclidean Stutter
Euclidean rhythm algorithm generates maximally-even beat distributions,
then applies stutter/repeat effects at those positions.
E(5,8) = tresillo, E(3,8) = Cuban variant, E(7,12) = West African bell.
Usage: python3 euclidean_stutter.py input.wav output.wav '{"pulses":5,"steps":8,"bpm":120}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def euclidean_rhythm(pulses, steps, rotation=0):
    """Bjorklund's algorithm for Euclidean rhythm generation."""
    if pulses >= steps:
        return [1] * steps
    if pulses <= 0:
        return [0] * steps

    # Bjorklund's algorithm
    pattern = []
    counts = []
    remainders = []

    divisor = steps - pulses
    remainders.append(pulses)
    level = 0

    while True:
        counts.append(divisor // remainders[level])
        remainders.append(divisor % remainders[level])
        divisor = remainders[level]
        level += 1
        if remainders[level] <= 1:
            break

    counts.append(divisor)

    def build(level_idx):
        if level_idx == -1:
            return [0]
        elif level_idx == -2:
            return [1]
        else:
            seq = []
            for _ in range(counts[level_idx]):
                seq.extend(build(level_idx - 1))
            if remainders[level_idx] != 0:
                seq.extend(build(level_idx - 2))
            return seq

    pattern = build(level)

    # Apply rotation
    if rotation > 0:
        rotation = rotation % len(pattern)
        pattern = pattern[rotation:] + pattern[:rotation]

    return pattern

def euclidean_stutter(input_path, output_path, params):
    pulses = int(params.get("pulses", 5))
    steps = int(params.get("steps", 8))
    num_layers = int(params.get("layers", 1))
    bpm = params.get("bpm", 120)
    duration = params.get("duration", 8.0)
    rotation = int(params.get("rotation", 0))
    stutter_length = params.get("stutter_length", 0.05)
    feedback = params.get("feedback", 0.3)

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    max_samples = int(duration * sr)
    if num_samples > max_samples:
        audio = audio[:max_samples]
        num_samples = max_samples

    output = audio.copy()
    beat_duration = 60.0 / bpm
    step_duration = beat_duration * 4 / steps  # One pattern cycle = 1 bar
    step_samples = int(step_duration * sr)
    stutter_samples = int(stutter_length * sr)

    for layer_idx in range(num_layers):
        # Each layer can have different pulses or rotation
        layer_pulses = pulses + layer_idx
        layer_rotation = rotation + layer_idx * 2
        pattern = euclidean_rhythm(layer_pulses, steps, layer_rotation)

        # Repeat pattern to fill duration
        total_steps = int(np.ceil(num_samples / step_samples))
        full_pattern = (pattern * (total_steps // len(pattern) + 1))[:total_steps]

        for i, hit in enumerate(full_pattern):
            if not hit:
                continue

            pos = i * step_samples
            if pos >= num_samples:
                break

            # Stutter: repeat a tiny segment multiple times
            grain_end = min(pos + stutter_samples, num_samples)
            grain = output[pos:grain_end].copy()

            if len(grain) == 0:
                continue

            # Write stutter repeats with decay
            num_repeats = 3
            for r in range(1, num_repeats + 1):
                repeat_pos = pos + r * stutter_samples
                if repeat_pos >= num_samples:
                    break
                repeat_end = min(repeat_pos + len(grain), num_samples)
                seg_len = repeat_end - repeat_pos
                decay = feedback ** r
                output[repeat_pos:repeat_end] += grain[:seg_len] * decay

    # Normalize
    peak = np.max(np.abs(output))
    if peak > 0:
        output *= 0.9 / peak

    sf.write(output_path, output, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    euclidean_stutter(sys.argv[1], sys.argv[2], params)
