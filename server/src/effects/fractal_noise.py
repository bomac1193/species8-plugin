#!/usr/bin/env python3
"""Species 8 — Fractal Noise Modulation
Applies fBm (fractal Brownian motion) noise as amplitude or filter modulation.
Usage: python3 fractal_noise.py input.wav output.wav '{"octaves":6,"depth":0.7}'
"""

import sys
import json
import numpy as np
import soundfile as sf

def fbm_noise(length, octaves=6, persistence=0.5, lacunarity=2.0, speed=1.0):
    """Generate 1D fractal Brownian motion noise."""
    result = np.zeros(length)
    amplitude = 1.0
    frequency = speed / length

    for _ in range(octaves):
        # Simple interpolated noise at this octave
        num_points = max(2, int(length * frequency))
        raw = np.random.randn(num_points)
        x_raw = np.linspace(0, 1, num_points)
        x_out = np.linspace(0, 1, length)
        interpolated = np.interp(x_out, x_raw, raw)
        result += interpolated * amplitude
        amplitude *= persistence
        frequency *= lacunarity

    # Normalize to 0-1
    result -= result.min()
    rng = result.max() - result.min()
    if rng > 0:
        result /= rng
    return result

def fractal_noise(input_path, output_path, params):
    octaves = int(params.get("octaves", 6))
    persistence = params.get("persistence", 0.5)
    lacunarity = params.get("lacunarity", 2.0)
    speed = params.get("speed", 1.0)
    depth = params.get("depth", 0.7)
    mode = params.get("mode", "amplitude")

    audio, sr = sf.read(input_path, always_2d=True)
    num_samples, num_channels = audio.shape

    # Generate fractal envelope
    envelope = fbm_noise(num_samples, octaves, persistence, lacunarity, speed)

    # Scale depth: 0 = no effect, 1 = full modulation
    envelope = 1.0 - depth + depth * envelope

    if mode == "amplitude":
        # Simple amplitude modulation
        for ch in range(num_channels):
            audio[:, ch] *= envelope
    elif mode == "filter":
        # Spectral filtering modulation via short STFT
        fft_size = 2048
        hop = fft_size // 4
        for ch in range(num_channels):
            pos = 0
            while pos + fft_size <= num_samples:
                frame = audio[pos:pos + fft_size, ch]
                window = np.hanning(fft_size)
                spectrum = np.fft.rfft(frame * window)

                # Use envelope value at this position to control LP cutoff
                cutoff_norm = envelope[pos]
                freq_bins = len(spectrum)
                cutoff_bin = int(cutoff_norm * freq_bins)
                mask = np.zeros(freq_bins)
                mask[:cutoff_bin] = 1.0
                # Smooth transition
                transition = min(20, cutoff_bin)
                if transition > 0:
                    mask[max(0, cutoff_bin - transition):cutoff_bin] = np.linspace(1, 0, transition)

                spectrum *= mask
                frame_out = np.fft.irfft(spectrum, n=fft_size) * window
                audio[pos:pos + fft_size, ch] = frame_out
                pos += hop

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio *= 0.9 / peak

    sf.write(output_path, audio, sr)

if __name__ == "__main__":
    params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    fractal_noise(sys.argv[1], sys.argv[2], params)
