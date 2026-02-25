#!/usr/bin/env python3
"""Species 8 — Spectral Freeze
Captures a single STFT frame and sustains it as an infinite drone.
Usage: python3 spectral_freeze.py input.wav output.wav '{"position":0.3,"duration":5}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def spectral_freeze(input_path, output_path, params):
    position = params.get("position", 0.3)
    duration = params.get("duration", 5.0)
    fft_size = int(params.get("fft_size", 4096))
    crossfade = params.get("crossfade", 0.5)

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    # Pick the frame at the given position
    frame_index = int(position * num_samples)
    frame_index = max(0, min(frame_index, num_samples - fft_size))

    hop_size = fft_size // 4
    output_samples = int(duration * sr)
    output = np.zeros((output_samples, num_channels))

    for ch in range(num_channels):
        # Extract and window the target frame
        frame = audio[frame_index:frame_index + fft_size, ch]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        window = np.hanning(fft_size)
        spectrum = np.fft.rfft(frame * window)
        magnitude = np.abs(spectrum)

        # Reconstruct by repeating the magnitude with random phases
        pos = 0
        while pos < output_samples:
            random_phase = np.exp(2j * np.pi * np.random.random(len(magnitude)))
            frame_out = np.fft.irfft(magnitude * random_phase, n=fft_size) * window
            end = min(pos + fft_size, output_samples)
            output[pos:end, ch] += frame_out[:end - pos]
            pos += hop_size

        # Normalize channel
        peak = np.max(np.abs(output[:, ch]))
        if peak > 0:
            output[:, ch] /= peak

    # Crossfade with original at start
    if crossfade > 0:
        fade_samples = min(int(crossfade * sr), output_samples, num_samples)
        fade_curve = np.linspace(1, 0, fade_samples).reshape(-1, 1)
        output[:fade_samples] = (
            audio[:fade_samples] * fade_curve +
            output[:fade_samples] * (1 - fade_curve)
        )

    # Normalize final output
    peak = np.max(np.abs(output))
    if peak > 0:
        output *= 0.9 / peak

    sf.write(output_path, output, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    spectral_freeze(sys.argv[1], sys.argv[2], params)
