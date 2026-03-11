#!/usr/bin/env python3
"""Species 8 — Merge Physics
Spectral-aware merge of 2-4 audio files using dominance rules and weird physics.

Usage: python3 merge_physics.py output.wav '{"inputs": ["/path/a.wav", "/path/b.wav"], "physics": {...}}'

Physics weights (all 0.0–1.0):
  territoriality    — dominant claims frequency space (default 0.5)
  timbre_transfer   — dominant's spectral envelope on submissive (default 0.2)
  harmonic_infection — dominant overtones bleed into submissive (default 0.15)
  gravitational_pull — pitch-shift submissive toward dominant key (default 0.2)
  phase_entanglement — force phase coherence at overlaps (default 0.1)
  temporal_magnetism — snap submissive transients to dominant grid (default 0.3)
"""

import sys
import json
import numpy as np
import soundfile as sf
from merge_analysis import analyze_track

TARGET_SR = 48000
FFT_SIZE = 4096
HOP = FFT_SIZE // 4

DEFAULT_PHYSICS = {
    "territoriality": 0.5,
    "timbre_transfer": 0.2,
    "harmonic_infection": 0.15,
    "gravitational_pull": 0.2,
    "phase_entanglement": 0.1,
    "temporal_magnetism": 0.3,
}

ONESHOT_SECONDS = 2.5
EXTEND_SECONDS = 8.0


def stable_hash(text):
    """Deterministic small hash for repeatable per-file variation."""
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def level_track(audio, target_rms=0.16):
    """RMS leveling with safety clamps; preserves dynamics better than peak normalization."""
    rms = np.sqrt(np.mean(audio ** 2))
    if rms < 1e-8:
        return audio
    gain = np.clip(target_rms / rms, 0.35, 1.8)
    out = audio * gain
    peak = np.max(np.abs(out))
    if peak > 0.98:
        out *= (0.98 / peak)
    return out


def add_entry_shape(audio, sr, seed, is_oneshot, rng=None, variation=0.35):
    """Avoid all tracks slamming at t=0 by adding deterministic offset + attack fade."""
    h = stable_hash(seed)
    jitter = rng.random() if rng is not None else 0.5
    max_offset_ms = 180 if is_oneshot else 90
    offset_ms = int((h % max_offset_ms) * (0.5 + variation * 0.8) + jitter * (14 + 70 * variation))
    fade_ms = int(8 + (h % 20) + jitter * (8 + 26 * variation))  # ~8-54ms
    offset = int(offset_ms * 0.001 * sr)
    fade = max(1, int(fade_ms * 0.001 * sr))

    out = audio
    if offset > 0:
        pre = np.zeros((offset, out.shape[1]))
        out = np.concatenate([pre, out], axis=0)

    fade = min(fade, len(out))
    ramp = np.linspace(0.0, 1.0, fade, endpoint=True).reshape(-1, 1)
    out[:fade] *= ramp
    return out


# ---------------------------------------------------------------------------
# Step 1: Load & normalize
# ---------------------------------------------------------------------------

def apply_playback_mode(audio, sr, mode, rng=None, variation=0.35):
    """Apply one-shot playback shaping before merge."""
    mode = (mode or "normal").lower()
    duration = len(audio) / sr
    is_oneshot = duration <= ONESHOT_SECONDS
    if not is_oneshot or mode == "normal":
        return audio

    target_len = max(int(EXTEND_SECONDS * sr), len(audio))

    if mode == "loop":
        # Start at a non-zero phase so repeated one-shots don't always slam at sample 0.
        base = stable_hash(str(len(audio)))
        jitter = rng.random() if rng is not None else 0.5
        max_shift = max(1, int(len(audio) * (0.2 + 0.25 * variation)))
        shift = int((base % max_shift) + jitter * max_shift * 0.35) % len(audio)
        audio = np.roll(audio, -shift, axis=0)
        reps = int(np.ceil(target_len / len(audio)))
        out = np.tile(audio, (reps, 1))[:target_len]
        xf = min(int(0.01 * sr), len(audio) // 8)  # 10ms seam soften
        if xf > 8:
            head = out[:xf].copy()
            tail = out[-xf:].copy()
            fade_in = np.linspace(0.0, 1.0, xf).reshape(-1, 1)
            fade_out = 1.0 - fade_in
            out[:xf] = head * fade_in + tail * fade_out
        return out

    if mode == "stretch":
        jitter = rng.random() if rng is not None else 0.5
        ratio = np.clip(0.32 + 0.1 * (jitter - 0.5) - 0.06 * variation, 0.18, 0.45)
        n_out = int(len(audio) / ratio)
        x_old = np.linspace(0, 1, len(audio))
        x_new = np.linspace(0, 1, n_out)
        stretched = np.column_stack([
            np.interp(x_new, x_old, audio[:, 0]),
            np.interp(x_new, x_old, audio[:, 1]),
        ])
        if len(stretched) < target_len:
            reps = int(np.ceil(target_len / len(stretched)))
            stretched = np.tile(stretched, (reps, 1))
        return stretched[:target_len]

    if mode == "texture":
        rev = audio[::-1]
        chunk = np.concatenate([audio, rev], axis=0)
        reps = int(np.ceil(target_len / len(chunk)))
        out = np.tile(chunk, (reps, 1))[:target_len]
        t = np.linspace(0, 1, len(out), endpoint=False)
        jitter = rng.random() if rng is not None else 0.5
        flutter_hz = 5.0 + 7.0 * variation + 2.0 * jitter
        grain_hz = 24.0 + 24.0 * variation + 8.0 * jitter
        flutter = 0.65 + 0.35 * np.sin(2 * np.pi * flutter_hz * t)
        grain = 0.75 + 0.25 * np.sin(2 * np.pi * grain_hz * t + (0.2 + jitter))
        env = (flutter * grain).reshape(-1, 1)
        out = out * env
        out[:, 1] = np.roll(out[:, 1], int((0.004 + 0.01 * variation) * sr))
        return out

    return audio


def load_and_normalize(paths, playback_modes=None, rng=None, variation=0.35):
    """Read all files, resample to TARGET_SR stereo, pad to longest."""
    tracks = []
    max_len = 0
    modes = playback_modes or []

    for idx, p in enumerate(paths):
        audio, sr = sf.read(p, always_2d=True)
        # To stereo
        if audio.shape[1] == 1:
            audio = np.column_stack([audio[:, 0], audio[:, 0]])
        elif audio.shape[1] > 2:
            audio = audio[:, :2]

        # Resample if needed (linear interpolation — fast, good enough for merge)
        if sr != TARGET_SR:
            ratio = TARGET_SR / sr
            n_out = int(len(audio) * ratio)
            x_old = np.linspace(0, 1, len(audio))
            x_new = np.linspace(0, 1, n_out)
            resampled = np.column_stack([
                np.interp(x_new, x_old, audio[:, 0]),
                np.interp(x_new, x_old, audio[:, 1]),
            ])
            audio = resampled

        mode = modes[idx] if idx < len(modes) else "normal"
        is_oneshot = (len(audio) / TARGET_SR) <= ONESHOT_SECONDS

        # Playback styling first (loop/stretch/texture), then level and shape.
        audio = apply_playback_mode(audio, TARGET_SR, mode, rng=rng, variation=variation)
        target_rms = 0.14 if mode in ("texture", "stretch") else 0.16
        audio = level_track(audio, target_rms=target_rms)
        audio = add_entry_shape(audio, TARGET_SR, seed=f"{p}:{idx}:{mode}", is_oneshot=is_oneshot, rng=rng, variation=variation)

        tracks.append(audio)
        max_len = max(max_len, len(audio))

    # Pad all to same length
    for i in range(len(tracks)):
        if len(tracks[i]) < max_len:
            pad = np.zeros((max_len - len(tracks[i]), 2))
            tracks[i] = np.concatenate([tracks[i], pad])

    return tracks


# ---------------------------------------------------------------------------
# Step 2: Dominance
# ---------------------------------------------------------------------------

def determine_dominance(analyses):
    """Rank tracks by RMS energy (70%) + transient density (30%). Return (dominant_idx, rankings)."""
    scores = []
    rms_vals = [a["rms_mean"] for a in analyses]
    td_vals = [a["transient_density"] for a in analyses]

    rms_max = max(rms_vals) if max(rms_vals) > 0 else 1.0
    td_max = max(td_vals) if max(td_vals) > 0 else 1.0

    for i, a in enumerate(analyses):
        score = 0.7 * (a["rms_mean"] / rms_max) + 0.3 * (a["transient_density"] / td_max)
        scores.append(score)

    rankings = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    return rankings[0], rankings


# ---------------------------------------------------------------------------
# Step 3: STFT helpers
# ---------------------------------------------------------------------------

def stft(audio_mono, fft_size=FFT_SIZE, hop=HOP):
    """Return complex STFT matrix (n_frames, n_bins)."""
    window = np.hanning(fft_size)
    n_frames = max(1, (len(audio_mono) - fft_size) // hop + 1)
    n_bins = fft_size // 2 + 1
    S = np.zeros((n_frames, n_bins), dtype=np.complex128)

    for i in range(n_frames):
        start = i * hop
        frame = audio_mono[start:start + fft_size]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        S[i] = np.fft.rfft(frame * window)

    return S


def istft(S, fft_size=FFT_SIZE, hop=HOP):
    """Overlap-add ISTFT from complex matrix."""
    window = np.hanning(fft_size)
    n_frames = S.shape[0]
    out_len = (n_frames - 1) * hop + fft_size
    output = np.zeros(out_len)
    norm = np.zeros(out_len)

    for i in range(n_frames):
        frame = np.fft.irfft(S[i], n=fft_size) * window
        start = i * hop
        output[start:start + fft_size] += frame
        norm[start:start + fft_size] += window ** 2

    norm = np.maximum(norm, 1e-8)
    return output / norm


def fit_length(signal, target_len):
    """Trim or zero-pad a 1D signal to exact target length."""
    if len(signal) == target_len:
        return signal
    if len(signal) > target_len:
        return signal[:target_len]
    return np.pad(signal, (0, target_len - len(signal)))


# ---------------------------------------------------------------------------
# Layer 2: Relationship Rules
# ---------------------------------------------------------------------------

def apply_territoriality(sub_stft, dom_stft, strength):
    """Per-bin attenuation where dominant has more energy."""
    dom_mag = np.abs(dom_stft)
    sub_mag = np.abs(sub_stft)
    s = np.clip(strength, 0.0, 1.0)
    drive = 0.3 + (s ** 1.2) * 8.0

    # Where dominant is louder, attenuate submissive
    ratio = (dom_mag / (sub_mag + 1e-10)) ** 0.85
    # Attenuation factor: 1 where sub dominates, decays where dom dominates
    atten = 1.0 / (1.0 + drive * ratio)
    atten = np.maximum(atten, 0.02)
    # Preserve phase
    return sub_stft * atten


def compute_stereo_placement(dom_analysis, sub_analysis):
    """Return pan position (-1 to 1) based on spectral complementarity."""
    dom_bands = dom_analysis["band_energy"]
    sub_bands = sub_analysis["band_energy"]

    # Compute per-band difference to find where submissive is complementary
    diff = 0.0
    for band in dom_bands:
        d = dom_bands[band]
        s = sub_bands[band]
        total = d + s + 1e-10
        diff += abs(d - s) / total

    # More complementary = wider panning
    complementarity = diff / 6.0  # normalize by number of bands
    # Map to pan: 0.3–0.9 range (never dead center, never full extreme)
    pan = 0.3 + complementarity * 0.6
    return pan


def apply_temporal_magnetism(sub_audio, sub_onsets, dom_onsets, strength, sr):
    """Shift submissive transients toward dominant's grid with aggressive timing pull."""
    if len(dom_onsets) == 0 or len(sub_onsets) == 0:
        return sub_audio

    s = np.clip(strength, 0.0, 1.0)
    max_shift = int((0.02 + 0.12 * (s ** 1.3)) * sr)  # up to ~140ms
    output = sub_audio.copy()

    for sub_t in sub_onsets:
        # Find nearest dominant onset
        sub_sample = int(sub_t * sr)
        diffs = dom_onsets - sub_t
        nearest_idx = np.argmin(np.abs(diffs))
        dom_sample = int(dom_onsets[nearest_idx] * sr)
        shift = dom_sample - sub_sample

        # Clamp to max shift, scale by strength
        shift = int(np.clip(shift, -max_shift, max_shift) * (0.4 + s * 1.2))
        if shift == 0:
            continue

        # Shift a region around the transient (up to 140ms window)
        region = int((0.05 + 0.09 * s) * sr)
        src_start = max(0, sub_sample - region // 2)
        src_end = min(len(output), sub_sample + region // 2)
        dst_start = max(0, src_start + shift)
        dst_end = min(len(output), src_end + shift)

        # Crossfade the shift to avoid clicks
        seg_len = min(src_end - src_start, dst_end - dst_start)
        if seg_len <= 0:
            continue
        fade = np.linspace(0, 1, seg_len).reshape(-1, 1) if output.ndim > 1 else np.linspace(0, 1, seg_len)
        orig_seg = output[dst_start:dst_start + seg_len].copy()
        shift_seg = sub_audio[src_start:src_start + seg_len]
        if len(orig_seg) == seg_len and len(shift_seg) == seg_len:
            blend = np.clip(0.35 + s * 0.85, 0.0, 1.0)
            output[dst_start:dst_start + seg_len] = orig_seg * (1 - fade * blend) + shift_seg * (fade * blend)

    return output


def apply_temporal_weirdness(sub_audio, dom_onsets, strength, sr, rng=None, variation=0.35):
    """Inject timing-driven strangeness: onset-locked warble + micro reverse/stutter."""
    s = np.clip(strength, 0.0, 1.0)
    if s < 0.12:
        return sub_audio

    output = sub_audio.copy()
    n = len(output)

    if len(dom_onsets) == 0:
        # Fallback rhythmic grid every 1/4 second
        dom_onsets = np.arange(0.0, n / sr, 0.25)

    # 1) Onset-locked AM/ring-like warble
    for idx, onset_t in enumerate(dom_onsets):
        center = int(onset_t * sr)
        region = int((0.025 + 0.085 * s) * sr)
        start = max(0, center - region // 2)
        end = min(n, center + region // 2)
        if end - start < 8:
            continue

        t = np.linspace(0.0, 1.0, end - start, endpoint=False)
        jitter = rng.random() if rng is not None else 0.5
        lfo_hz = 5.0 + 28.0 * s + 8.0 * variation * jitter
        phase = idx * (0.61 + 0.3 * jitter)
        lfo = np.sin(2.0 * np.pi * lfo_hz * t + phase)
        wobble = 1.0 + lfo * (0.15 + 0.6 * s)
        wobble = wobble.reshape(-1, 1) if output.ndim > 1 else wobble
        output[start:end] *= wobble

        # 2) Reverse micro-grains on stronger settings
        if s > 0.35 and idx % 2 == 0:
            rev = int((0.010 + 0.055 * s) * sr)
            r0 = max(0, center - rev // 2)
            r1 = min(n, r0 + rev)
            if r1 - r0 > 8:
                output[r0:r1] = output[r0:r1][::-1]

    # 3) Global rhythm-chop envelope
    step = int((0.11 - 0.07 * s) * sr)
    step = max(step, int(0.018 * sr))
    duck = 1.0 - (0.35 + 0.55 * s)
    for i, start in enumerate(range(0, n, step)):
        end = min(n, start + step)
        if end - start < 4:
            continue
        # Deterministic pseudo-pattern
        rand_gate = rng.random() if rng is not None else (((i * 37) % 10) / 10)
        threshold = 0.25 + 0.3 * variation
        if rand_gate < threshold:
            output[start:end] *= duck

    return output


# ---------------------------------------------------------------------------
# Layer 3: Weird Physics
# ---------------------------------------------------------------------------

def apply_timbre_transfer(sub_stft, dom_stft, strength):
    """Spectral envelope crossfade: blend dominant's smoothed envelope onto submissive."""
    dom_mag = np.abs(dom_stft)
    sub_mag = np.abs(sub_stft)
    sub_phase = np.angle(sub_stft)
    s = np.clip(strength, 0.0, 1.0)
    drive = 0.3 + (s ** 1.15) * 2.4

    # Smooth spectral envelopes (simple moving average across frequency bins)
    kernel_size = 31
    kernel = np.ones(kernel_size) / kernel_size

    result = np.zeros_like(sub_stft)
    for i in range(sub_stft.shape[0]):
        dom_env = np.convolve(dom_mag[i], kernel, mode="same")
        sub_env = np.convolve(sub_mag[i], kernel, mode="same")

        # Ratio of envelopes — apply dominant's shape
        ratio = (dom_env / (sub_env + 1e-10)) ** (0.8 + 1.4 * s)
        # Crossfade: blend between original magnitude and shaped magnitude
        shaped = sub_mag[i] * np.clip(ratio, 0.05, 20.0)
        new_mag = sub_mag[i] * (1 - s) + shaped * s * drive
        # Keep original phase
        result[i] = new_mag * np.exp(1j * sub_phase[i])

    return result


def apply_harmonic_infection(sub_stft, dom_stft, strength):
    """Additive bleed of dominant's spectrum into submissive, ramping over time."""
    n_frames = sub_stft.shape[0]
    s = np.clip(strength, 0.0, 1.0)
    ramp = np.linspace(0, s, n_frames).reshape(-1, 1)
    bleed = 0.2 + (s ** 1.1) * 1.6
    return sub_stft + dom_stft * ramp * bleed


def apply_gravitational_pull(audio_stereo, sub_key_semi, dom_key_semi, strength):
    """Resample-based pitch shift toward dominant's key."""
    # Calculate semitone distance (shortest path around circle of fifths)
    diff = (dom_key_semi - sub_key_semi) % 12
    if diff > 6:
        diff -= 12
    s = np.clip(strength, 0.0, 1.0)
    # Scale by strength, cap at 7 semitones for extreme states
    shift_semitones = np.clip(diff * (0.35 + 1.65 * s), -7, 7)
    if abs(shift_semitones) < 0.01:
        return audio_stereo

    ratio = 2.0 ** (shift_semitones / 12.0)
    n_out = int(len(audio_stereo) / ratio)
    if n_out < 2:
        return audio_stereo

    x_old = np.linspace(0, 1, len(audio_stereo))
    x_new = np.linspace(0, 1, n_out)

    result = np.column_stack([
        np.interp(x_new, x_old, audio_stereo[:, 0]),
        np.interp(x_new, x_old, audio_stereo[:, 1]),
    ])

    # Pad or trim to original length
    if len(result) < len(audio_stereo):
        result = np.pad(result, ((0, len(audio_stereo) - len(result)), (0, 0)))
    else:
        result = result[:len(audio_stereo)]

    return result


def apply_phase_entanglement(sub_stft, dom_stft, strength):
    """Blend submissive's phase toward dominant's where both have energy."""
    dom_mag = np.abs(dom_stft)
    sub_mag = np.abs(sub_stft)
    dom_phase = np.angle(dom_stft)
    sub_phase = np.angle(sub_stft)

    # Only blend where both have significant energy
    energy_mask = np.minimum(dom_mag, sub_mag) / (np.maximum(dom_mag, sub_mag) + 1e-10)
    s = np.clip(strength, 0.0, 1.0)
    blend = np.clip((0.25 + s * 1.25) * energy_mask, 0.0, 1.0)

    # Interpolate phase (unwrap to avoid discontinuities)
    new_phase = sub_phase + blend * (dom_phase - sub_phase)
    return sub_mag * np.exp(1j * new_phase)


# ---------------------------------------------------------------------------
# Final: Sum & Master
# ---------------------------------------------------------------------------

def sum_and_master(tracks, pan_positions):
    """Sum tracks with stereo placement, soft-limit to -0.9dB."""
    length = len(tracks[0])
    output = np.zeros((length, 2))

    for i, (track, pan) in enumerate(zip(tracks, pan_positions)):
        if track.ndim == 1:
            track = np.column_stack([track, track])
        # Pan: 0 = center, positive = right, negative = left
        # Use constant-power panning
        angle = (pan + 1) / 2 * (np.pi / 2)  # 0 to pi/2
        gain_l = np.cos(angle)
        gain_r = np.sin(angle)
        output[:, 0] += track[:len(output), 0] * gain_l
        output[:, 1] += track[:len(output), 1] * gain_r

    # Soft-limit with stronger drive to keep extreme settings intense but controlled
    peak = np.max(np.abs(output))
    if peak > 0.9:
        output = np.tanh(output / peak * 2.6) * 0.95

    # Loudness floor: keep ultra-weird modes audible (avoid near-silent exports).
    rms = np.sqrt(np.mean(output ** 2))
    if rms > 1e-8 and rms < 0.04:
        makeup = min(16.0, 0.08 / rms)
        output *= makeup
        peak2 = np.max(np.abs(output))
        if peak2 > 0.98:
            output *= (0.98 / peak2)

    # Final short fade-in to avoid clipped/clicky first transient in exports
    fade = min(len(output), int(0.018 * TARGET_SR))
    if fade > 1:
        ramp = np.linspace(0.0, 1.0, fade).reshape(-1, 1)
        output[:fade] *= ramp

    return output


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def merge(output_path, inputs, physics, playback_modes=None, variation_seed=None):
    """Full merge pipeline."""
    p = {**DEFAULT_PHYSICS, **physics}
    seed_text = str(variation_seed) if variation_seed is not None else str(np.random.SeedSequence().entropy)
    seed = stable_hash(seed_text)
    rng = np.random.default_rng(seed)
    variation = 0.28 + 0.55 * float(np.clip(p.get("temporal_magnetism", 0.3), 0.0, 1.0))

    # Step 1: Load and normalize
    print(f"[merge_physics] Loading {len(inputs)} tracks...", file=sys.stderr)
    tracks = load_and_normalize(inputs, playback_modes=playback_modes, rng=rng, variation=variation)

    # Step 2: Analyze each track
    print("[merge_physics] Analyzing tracks...", file=sys.stderr)
    analyses = [analyze_track(t, TARGET_SR) for t in tracks]

    # Step 3: Determine dominance
    dom_idx, rankings = determine_dominance(analyses)
    print(f"[merge_physics] Dominant track: {dom_idx} (key={analyses[dom_idx]['key']} {analyses[dom_idx]['key_mode']})", file=sys.stderr)

    # Dominant track passes through unmodified
    dom_track = tracks[dom_idx]
    dom_analysis = analyses[dom_idx]

    # Process each submissive track
    processed = []
    pan_positions = []

    for i in range(len(tracks)):
        if i == dom_idx:
            processed.append(tracks[i])
            pan_positions.append(0.0)  # dominant stays center
            continue

        sub_track = tracks[i].copy()
        sub_analysis = analyses[i]

        print(f"[merge_physics] Processing submissive track {i}...", file=sys.stderr)

        # --- Layer 2: Relationship Rules ---

        # Frequency territoriality (per-channel STFT)
        if p["territoriality"] > 0.01:
            for ch in range(2):
                sub_S = stft(sub_track[:, ch])
                dom_S = stft(dom_track[:, ch])
                sub_S = apply_territoriality(sub_S, dom_S, p["territoriality"])
                sub_track[:, ch] = fit_length(istft(sub_S), len(sub_track))

        # Stereo placement
        pan = compute_stereo_placement(dom_analysis, sub_analysis)
        # Alternate left/right for different submissive tracks
        side = 1 if (i % 2 == 0) else -1
        pan_positions.append(pan * side)

        # Temporal magnetism
        if p["temporal_magnetism"] > 0.01:
            sub_track = apply_temporal_magnetism(
                sub_track, sub_analysis["onset_times"],
                dom_analysis["onset_times"], p["temporal_magnetism"], TARGET_SR
            )
            sub_track = apply_temporal_weirdness(
                sub_track, dom_analysis["onset_times"], p["temporal_magnetism"], TARGET_SR, rng=rng, variation=variation
            )

        # --- Layer 3: Weird Physics ---

        # Timbre transfer
        if p["timbre_transfer"] > 0.01:
            for ch in range(2):
                sub_S = stft(sub_track[:, ch])
                dom_S = stft(dom_track[:, ch])
                sub_S = apply_timbre_transfer(sub_S, dom_S, p["timbre_transfer"])
                sub_track[:, ch] = fit_length(istft(sub_S), len(sub_track))

        # Harmonic infection
        if p["harmonic_infection"] > 0.01:
            for ch in range(2):
                sub_S = stft(sub_track[:, ch])
                dom_S = stft(dom_track[:, ch])
                sub_S = apply_harmonic_infection(sub_S, dom_S, p["harmonic_infection"])
                sub_track[:, ch] = fit_length(istft(sub_S), len(sub_track))

        # Gravitational pitch pull
        if p["gravitational_pull"] > 0.01:
            sub_track = apply_gravitational_pull(
                sub_track, sub_analysis["key_semitone"],
                dom_analysis["key_semitone"], p["gravitational_pull"]
            )

        # Phase entanglement
        if p["phase_entanglement"] > 0.01:
            for ch in range(2):
                sub_S = stft(sub_track[:, ch])
                dom_S = stft(dom_track[:, ch])
                sub_S = apply_phase_entanglement(sub_S, dom_S, p["phase_entanglement"])
                sub_track[:, ch] = fit_length(istft(sub_S), len(sub_track))

        processed.append(sub_track)

    # Step 6: Sum and master
    print("[merge_physics] Summing and mastering...", file=sys.stderr)
    output = sum_and_master(processed, pan_positions)

    sf.write(output_path, output, TARGET_SR)
    print(f"[merge_physics] Done → {output_path}", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 merge_physics.py output.wav '{\"inputs\": [...], \"physics\": {...}}'", file=sys.stderr)
        sys.exit(1)

    output_path = sys.argv[1]
    params = json.loads(sys.argv[2])
    inputs = params.get("inputs", [])
    physics = params.get("physics", {})
    playback_modes = params.get("playback_modes", [])
    variation_seed = params.get("variation_seed")

    if len(inputs) < 2:
        print("[merge_physics] Need at least 2 input files", file=sys.stderr)
        sys.exit(1)

    merge(output_path, inputs, physics, playback_modes=playback_modes, variation_seed=variation_seed)
