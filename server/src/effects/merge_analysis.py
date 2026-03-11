"""Species 8 — Merge Analysis
Pure-function library for spectral analysis of audio tracks.
Imported by merge_physics.py. Numpy + soundfile only (no librosa).
"""

import numpy as np


# Krumhansl-Kessler key profiles
_MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# 6-band frequency boundaries (Hz)
_BAND_EDGES = [0, 80, 250, 1000, 4000, 8000, 20000]
_BAND_NAMES = ["sub", "low_mid", "mid", "high_mid", "presence", "air"]


def spectral_centroid(audio_mono, sr, fft_size=2048, hop=512):
    """Return mean spectral centroid (Hz) and time curve."""
    n_frames = max(1, (len(audio_mono) - fft_size) // hop + 1)
    freqs = np.fft.rfftfreq(fft_size, 1.0 / sr)
    centroids = np.empty(n_frames)
    window = np.hanning(fft_size)

    for i in range(n_frames):
        start = i * hop
        frame = audio_mono[start:start + fft_size]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        mag = np.abs(np.fft.rfft(frame * window))
        total = mag.sum()
        if total > 1e-10:
            centroids[i] = np.sum(freqs * mag) / total
        else:
            centroids[i] = 0.0

    return float(np.mean(centroids)), centroids


def rms_energy(audio_mono, sr, hop=512):
    """Return mean RMS and envelope curve."""
    n_frames = max(1, len(audio_mono) // hop)
    envelope = np.empty(n_frames)

    for i in range(n_frames):
        start = i * hop
        end = min(start + hop, len(audio_mono))
        frame = audio_mono[start:end]
        envelope[i] = np.sqrt(np.mean(frame ** 2))

    return float(np.mean(envelope)), envelope


def estimate_key(audio_mono, sr, fft_size=8192):
    """Estimate musical key via chromagram + Krumhansl-Kessler correlation.
    Returns (key_name, mode, semitone_index)."""
    # Build chromagram by accumulating energy into pitch classes
    chroma = np.zeros(12)
    window = np.hanning(fft_size)
    hop = fft_size // 2
    freqs = np.fft.rfftfreq(fft_size, 1.0 / sr)

    n_frames = max(1, (len(audio_mono) - fft_size) // hop + 1)
    for i in range(n_frames):
        start = i * hop
        frame = audio_mono[start:start + fft_size]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        mag = np.abs(np.fft.rfft(frame * window)) ** 2

        # Map each bin to a pitch class (ignore DC and very low bins)
        for j in range(1, len(freqs)):
            f = freqs[j]
            if f < 30 or f > 5000:
                continue
            # MIDI note from frequency, then pitch class
            midi = 12 * np.log2(f / 440.0) + 69
            pc = int(round(midi)) % 12
            chroma[pc] += mag[j]

    if chroma.sum() < 1e-10:
        return ("C", "major", 0)

    chroma /= chroma.max()

    # Correlate with all 24 key profiles (12 major + 12 minor)
    best_corr = -2.0
    best_key = 0
    best_mode = "major"

    for shift in range(12):
        rolled = np.roll(chroma, -shift)
        corr_maj = np.corrcoef(rolled, _MAJOR_PROFILE)[0, 1]
        corr_min = np.corrcoef(rolled, _MINOR_PROFILE)[0, 1]
        if corr_maj > best_corr:
            best_corr = corr_maj
            best_key = shift
            best_mode = "major"
        if corr_min > best_corr:
            best_corr = corr_min
            best_key = shift
            best_mode = "minor"

    return (_NOTE_NAMES[best_key], best_mode, best_key)


def transient_density(audio_mono, sr, fft_size=1024, hop=256):
    """Detect transients via spectral flux. Returns density (per second) and onset times."""
    n_frames = max(1, (len(audio_mono) - fft_size) // hop + 1)
    window = np.hanning(fft_size)
    prev_mag = None
    flux = np.empty(n_frames)

    for i in range(n_frames):
        start = i * hop
        frame = audio_mono[start:start + fft_size]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        mag = np.abs(np.fft.rfft(frame * window))

        if prev_mag is not None:
            # Half-wave rectified spectral flux
            diff = mag - prev_mag
            flux[i] = np.sum(np.maximum(0, diff))
        else:
            flux[i] = 0.0
        prev_mag = mag

    # Peak-pick: above mean + 1.5 std
    if flux.std() > 1e-10:
        threshold = flux.mean() + 1.5 * flux.std()
    else:
        threshold = flux.mean() + 1e-10

    onset_frames = []
    for i in range(1, len(flux) - 1):
        if flux[i] > threshold and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]:
            onset_frames.append(i)

    duration_sec = len(audio_mono) / sr
    density = len(onset_frames) / max(duration_sec, 0.01)
    onset_times = np.array(onset_frames) * hop / sr

    return float(density), onset_times


def band_energy(audio_mono, sr, fft_size=4096):
    """Return dict of 6-band average energy: sub, low_mid, mid, high_mid, presence, air."""
    window = np.hanning(fft_size)
    hop = fft_size // 2
    freqs = np.fft.rfftfreq(fft_size, 1.0 / sr)
    n_frames = max(1, (len(audio_mono) - fft_size) // hop + 1)

    bands = {name: 0.0 for name in _BAND_NAMES}

    for i in range(n_frames):
        start = i * hop
        frame = audio_mono[start:start + fft_size]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        mag = np.abs(np.fft.rfft(frame * window)) ** 2

        for b in range(len(_BAND_NAMES)):
            lo = _BAND_EDGES[b]
            hi = _BAND_EDGES[b + 1]
            mask = (freqs >= lo) & (freqs < hi)
            bands[_BAND_NAMES[b]] += mag[mask].sum()

    # Normalize by frame count
    for name in _BAND_NAMES:
        bands[name] /= max(n_frames, 1)

    return bands


def analyze_track(audio_stereo, sr):
    """Full analysis of a single track. Input: (N, 2) array at given sr.
    Returns analysis dict."""
    mono = audio_stereo.mean(axis=1) if audio_stereo.ndim > 1 else audio_stereo

    sc_mean, sc_curve = spectral_centroid(mono, sr)
    rms_mean, rms_env = rms_energy(mono, sr)
    key_name, key_mode, key_semitone = estimate_key(mono, sr)
    td, onset_times = transient_density(mono, sr)
    bands = band_energy(mono, sr)

    return {
        "spectral_centroid": sc_mean,
        "spectral_centroid_curve": sc_curve,
        "rms_mean": rms_mean,
        "rms_envelope": rms_env,
        "key": key_name,
        "key_mode": key_mode,
        "key_semitone": key_semitone,
        "transient_density": td,
        "onset_times": onset_times,
        "band_energy": bands,
    }
