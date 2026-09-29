"""Generate SingBridge's original instrumental timing guide with no external assets."""

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 22050
DURATION_SECONDS = 28
OUTPUT = (
    Path(__file__).resolve().parents[1]
    / "shared/src/commonMain/composeResources/files/practice.wav"
)
# Original four-phrase melody, one note per half-second beat.
PHRASES = (
    (60, 64, 67, 64, 62, 65, 69, 67, 64, 62, 60, 0),
    (62, 65, 69, 65, 64, 67, 71, 69, 67, 65, 64, 0),
    (64, 67, 72, 71, 69, 67, 65, 64, 62, 64, 67, 0),
    (65, 69, 72, 69, 67, 64, 62, 64, 67, 62, 60, 0),
)


def sample_at(t: float) -> float:
    beat = int(t / 0.5)
    local = t % 0.5
    # A short, quiet click makes the count-in and phrase timing audible.
    click = 0.08 * math.exp(-local * 110) * math.sin(2 * math.pi * 1100 * local)
    if not 2 <= t < 26:
        return click if t < 2 else 0.0
    phrase = int((t - 2) / 6)
    midi = PHRASES[phrase][(beat - 4) % 12]
    if midi == 0:
        return click
    frequency = 440 * 2 ** ((midi - 69) / 12)
    envelope = min(local / 0.015, 1) * math.exp(-local * 5)
    tone = math.sin(2 * math.pi * frequency * local)
    tone += 0.2 * math.sin(4 * math.pi * frequency * local)
    return click + 0.22 * envelope * tone


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        audio.writeframes(
            b"".join(
                struct.pack("<h", round(sample_at(index / SAMPLE_RATE) * 32767))
                for index in range(SAMPLE_RATE * DURATION_SECONDS)
            )
        )
    print(f"Generated {OUTPUT.name}: {DURATION_SECONDS}s, mono PCM, {SAMPLE_RATE}Hz")
