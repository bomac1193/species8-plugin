#!/usr/bin/env python3
"""Species 8 — Cellular Automata Rhythmic Gate
Wolfram 1D cellular automaton generates complex gate patterns.
Usage: python3 cellular_automata.py input.wav output.wav '{"rule":30,"bpm":120}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def run_ca(rule, width, steps, initial_density=0.5):
    """Run a 1D elementary cellular automaton."""
    # Parse rule into lookup table
    rule_bits = [(rule >> i) & 1 for i in range(8)]

    # Random initial state
    grid = np.zeros((steps, width), dtype=np.uint8)
    grid[0] = (np.random.random(width) < initial_density).astype(np.uint8)

    for t in range(1, steps):
        for i in range(width):
            left = grid[t - 1][(i - 1) % width]
            center = grid[t - 1][i]
            right = grid[t - 1][(i + 1) % width]
            index = (left << 2) | (center << 1) | right
            grid[t][i] = rule_bits[index]

    return grid

def cellular_automata(input_path, output_path, params):
    rule = int(params.get("rule", 30))
    steps = int(params.get("steps", 64))
    gate_resolution = int(params.get("gate_resolution", 16))
    density = params.get("density", 0.5)
    bpm = params.get("bpm", 120)

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    # Run CA
    grid = run_ca(rule, gate_resolution, steps, density)

    # Flatten grid into a 1D gate pattern (read row by row)
    gate_pattern = grid.flatten()

    # Calculate timing
    beat_duration = 60.0 / bpm
    step_duration = beat_duration / 4  # 16th notes
    step_samples = int(step_duration * sr)

    # Build gate envelope
    total_gate_steps = len(gate_pattern)
    gate_envelope = np.zeros(num_samples)

    for i, gate_val in enumerate(gate_pattern):
        start = i * step_samples
        end = min(start + step_samples, num_samples)
        if start >= num_samples:
            break
        if gate_val:
            # Smooth attack/release
            seg_len = end - start
            attack = min(int(0.002 * sr), seg_len // 4)
            release = min(int(0.005 * sr), seg_len // 4)
            env_seg = np.ones(seg_len)
            if attack > 0:
                env_seg[:attack] = np.linspace(0, 1, attack)
            if release > 0:
                env_seg[-release:] = np.linspace(1, 0, release)
            gate_envelope[start:end] = env_seg

    # If gate pattern is shorter than audio, repeat
    if total_gate_steps * step_samples < num_samples:
        pattern_len = total_gate_steps * step_samples
        if pattern_len > 0:
            repeats = (num_samples // pattern_len) + 1
            gate_envelope = np.tile(gate_envelope[:pattern_len], repeats)[:num_samples]

    # Apply gate
    for ch in range(num_channels):
        audio[:, ch] *= gate_envelope[:num_samples]

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio *= 0.9 / peak

    sf.write(output_path, audio, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    cellular_automata(sys.argv[1], sys.argv[2], params)
