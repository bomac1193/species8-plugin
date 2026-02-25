#!/usr/bin/env python3
"""Species 8 — Paulstretch
Extreme time stretching via STFT phase randomization.
Usage: python3 paulstretch.py input.wav output.wav '{"stretch_factor":8}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def paulstretch(input_path, output_path, params):
    stretch_factor = params.get("stretch_factor", 8.0)
    window_size = params.get("window_size", 0.25)  # seconds

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    window_samples = int(window_size * sr)
    # Ensure even window size
    if window_samples % 2 != 0:
        window_samples += 1

    half_window = window_samples // 2
    window = np.hanning(window_samples)

    # Calculate output size
    hop_in = max(1, int(half_window / stretch_factor))
    num_hops = max(1, (num_samples - window_samples) // hop_in)
    output_samples = num_hops * half_window + window_samples
    output = np.zeros((output_samples, num_channels))

    out_pos = 0
    in_pos = 0

    for _ in range(num_hops):
        for ch in range(num_channels):
            # Extract frame
            end = min(in_pos + window_samples, num_samples)
            frame = audio[in_pos:end, ch].copy()
            if len(frame) < window_samples:
                frame = np.pad(frame, (0, window_samples - len(frame)))

            # Window
            frame *= window

            # STFT
            spectrum = np.fft.rfft(frame)

            # Randomize phases (the core paulstretch trick)
            magnitude = np.abs(spectrum)
            random_phase = np.exp(2j * np.pi * np.random.random(len(magnitude)))
            spectrum = magnitude * random_phase

            # ISTFT
            frame_out = np.fft.irfft(spectrum, n=window_samples)
            frame_out *= window

            # Overlap-add
            write_end = min(out_pos + window_samples, output_samples)
            seg = write_end - out_pos
            output[out_pos:write_end, ch] += frame_out[:seg]

        in_pos += hop_in
        out_pos += half_window

        if in_pos >= num_samples:
            break

    # Trim trailing silence
    output = output[:out_pos + window_samples]

    # Normalize
    peak = np.max(np.abs(output))
    if peak > 0:
        output *= 0.9 / peak

    sf.write(output_path, output, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    paulstretch(sys.argv[1], sys.argv[2], params)
