#!/usr/bin/env python3
"""Species 8 — Granular Cloud
Decomposes audio into tiny grains and recomposes into textural clouds.
Usage: python3 granular_cloud.py input.wav output.wav '{"density":20,"grain_size":0.05}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def granular_cloud(input_path, output_path, params):
    grain_size = params.get("grain_size", 0.05)
    density = params.get("density", 20)
    pitch_scatter = params.get("pitch_scatter", 0.3)
    position_scatter = params.get("position_scatter", 0.5)
    duration = params.get("duration", 8.0)
    stereo_spread = params.get("stereo_spread", 0.8)

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    # Mix to mono for grain source
    mono = np.mean(audio, axis=1)

    grain_samples = int(grain_size * sr)
    output_samples = int(duration * sr)
    output = np.zeros((output_samples, 2))  # Always stereo output

    num_grains = int(density * duration)
    window = np.hanning(grain_samples)

    for _ in range(num_grains):
        # Random position in source
        center = np.random.random() * position_scatter
        center = center * num_samples
        start = int(max(0, center - grain_samples // 2))
        end = min(start + grain_samples, num_samples)
        grain = mono[start:end].copy()

        if len(grain) < grain_samples:
            grain = np.pad(grain, (0, grain_samples - len(grain)))

        # Apply window
        grain *= window[:len(grain)]

        # Pitch scatter via resampling
        if pitch_scatter > 0:
            ratio = 1.0 + (np.random.random() * 2 - 1) * pitch_scatter
            ratio = max(0.25, min(4.0, ratio))
            indices = np.linspace(0, len(grain) - 1, int(len(grain) / ratio))
            indices = np.clip(indices.astype(int), 0, len(grain) - 1)
            grain = grain[indices]

        # Random placement in output
        out_pos = int(np.random.random() * max(1, output_samples - len(grain)))

        # Stereo panning
        pan = np.random.random() * stereo_spread
        left_gain = np.cos(pan * np.pi / 2)
        right_gain = np.sin(pan * np.pi / 2)

        end_pos = min(out_pos + len(grain), output_samples)
        seg_len = end_pos - out_pos
        output[out_pos:end_pos, 0] += grain[:seg_len] * left_gain
        output[out_pos:end_pos, 1] += grain[:seg_len] * right_gain

    # Normalize
    peak = np.max(np.abs(output))
    if peak > 0:
        output *= 0.9 / peak

    sf.write(output_path, output, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    granular_cloud(sys.argv[1], sys.argv[2], params)
