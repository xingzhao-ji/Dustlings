"""Original one-shot RPG cues. No recordings, external samples, or listening claims.

Generate only rpg-*.wav, preserving all previously integrated Dustlings audio.
The family tune borrows Dustlings' own D-F#-E-A-D motif, not a reference game.
"""
from pathlib import Path
import hashlib
import json
import wave
import numpy as np

RATE = 44100
OUT = Path("godot/assets/audio")
EVIDENCE = Path("evidence/rpg/audio")
OUT.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)
report = {
    "origin": "Original deterministic synthesis; no external audio or licensed samples",
    "sample_rate": RATE,
    "audition": "Not auditioned. Numerical inspection does not establish pleasing sound or mix.",
    "files": {},
}


def envelope(count, attack, release):
    env = np.ones(count)
    a = min(count, round(attack * RATE))
    r = min(count, round(release * RATE))
    env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    env[-r:] *= np.sin(np.linspace(np.pi / 2, 0, r)) ** 2
    return env


def smooth(noise, width):
    return np.convolve(noise, np.ones(width) / width, mode="same")


def save(name, signal):
    signal = np.asarray(signal, dtype=np.float64)
    signal -= signal.mean()
    signal *= envelope(len(signal), .002, .008)
    # Leave generous headroom. Every cue has exact silent endpoints and no loop.
    signal[0] = signal[-1] = 0
    pcm = np.rint(signal * 32767).astype("<i2")
    path = OUT / (name + ".wav")
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())
    actual = pcm.astype(float) / 32768
    checks = {
        "finite": bool(np.isfinite(actual).all()),
        "headroom": bool(np.max(np.abs(actual)) <= .18),
        "dc_below_0.0002": bool(abs(actual.mean()) < .0002),
        "silent_endpoints": bool(pcm[0] == 0 and pcm[-1] == 0),
        "bounded_neighbor_step": bool(np.max(np.abs(np.diff(actual))) < .06),
        "duration": bool(.15 <= len(actual) / RATE <= 3.8),
    }
    assert all(checks.values()), (name, checks)
    report["files"][name] = {
        "path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "seconds": len(actual) / RATE,
        "peak_dbfs": float(20 * np.log10(max(np.abs(actual).max(), 1e-12))),
        "rms_dbfs": float(20 * np.log10(max(np.sqrt(np.mean(actual ** 2)), 1e-12))),
        "dc": float(actual.mean()), "maximum_neighbor_step": float(np.max(np.abs(np.diff(actual)))),
        "checks": checks,
    }


for surface, seconds in [("stone", .19), ("wood", .25), ("grass", .27)]:
    for variant in range(3):
        rng = np.random.default_rng(4301 + variant * 137 + sum(map(ord, surface)))
        t = np.arange(round(seconds * RATE)) / RATE
        noise = rng.normal(0, 1, len(t))
        tune = 1 + (variant - 1) * .045
        if surface == "stone":
            body = np.sin(2 * np.pi * 154 * tune * t) * np.exp(-t * 40)
            grain = (smooth(noise, 9) - smooth(noise, 75)) * np.exp(-t * 35)
            cue = body * .075 + grain * .095
        elif surface == "wood":
            body = (np.sin(2 * np.pi * 104 * tune * t) + .32 * np.sin(2 * np.pi * 221 * tune * t)) * np.exp(-t * 26)
            grain = (smooth(noise, 12) - smooth(noise, 110)) * np.exp(-t * 36)
            cue = body * .060 + grain * .080
        else:
            body = np.sin(2 * np.pi * 89 * tune * t) * np.exp(-t * 35)
            grain = smooth(noise, 16) * np.exp(-t * 17) * (.7 + .3 * np.sin(np.pi * np.minimum(t / .14, 1)))
            cue = body * .028 + grain * .14
        cue *= envelope(len(t), .006 + variant * .001, .035)
        save(f"rpg-step-{surface}-{variant + 1}", cue)


def whistle(midi, seconds, seed):
    t = np.arange(round(seconds * RATE)) / RATE
    frequency = 440 * 2 ** ((midi - 69) / 12)
    phase = 2 * np.pi * frequency * t + .013 * np.sin(2 * np.pi * 4.7 * t)
    tone = np.sin(phase) + .16 * np.sin(phase * 2) + .025 * np.sin(phase * 3)
    breath = smooth(np.random.default_rng(seed).normal(0, 1, len(t)), 31)
    return (tone * .077 + breath * .009) * envelope(len(t), .06, .21)


for answer in [False, True]:
    # D4-F#4-E4 is Nell's phrase. A3-D4 supplies the companion's answering cadence.
    events = [(0, 62), (.46, 66), (.92, 64)]
    if answer:
        events.extend([(1.72, 57), (2.17, 62)])
    sound = np.zeros(round((3.25 if answer else 1.98) * RATE))
    for i, (start, midi) in enumerate(events):
        duration = .69 if i < 3 else .80
        note = whistle(midi, duration, 6100 + i)
        index = round(start * RATE)
        sound[index:index + len(note)] += note
    # A very soft single room reflection, with room for the phrase to resolve.
    delay = round(.089 * RATE)
    dry = sound.copy()
    sound[delay:] += dry[:-delay] * .06
    save("rpg-melody-answer" if answer else "rpg-melody-taught", sound)

report["check_count"] = sum(len(item["checks"]) for item in report["files"].values())
report["all_checks_pass"] = all(all(item["checks"].values()) for item in report["files"].values())
(EVIDENCE / "pcm-checks.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"files": len(report["files"]), "checks": report["check_count"], "all_pass": report["all_checks_pass"]}))
