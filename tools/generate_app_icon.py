"""Generate SingBridge's app icon files for Android and iOS with no external assets.

The mark is a beamed note pair whose beam is a bridge deck over a round arch.
Pass an SVG path as the only argument to also write a full-bleed preview SVG.
"""

import json
import math
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID_RES = ROOT / "androidApp/src/main/res"
IOS_ICON_SET = ROOT / "iosApp/SingBridge/Assets.xcassets/AppIcon.appiconset"

PINE = "#235E52"
PAPER = "#FAF7F0"
GOLD = "#EEC779"

# Geometry on a 256-unit canvas, centred on (128, 128).
BEAM_TOP, BEAM_CORNER = 46, 12
STEM_LEFT, STEM_RIGHT, STEM_WIDTH, STEM_BOTTOM = 70, 220, 30, 176
ARCH_RADIUS = 45
ARCH_CENTER = (
    (STEM_LEFT + STEM_WIDTH + STEM_RIGHT - STEM_WIDTH) / 2,
    BEAM_TOP + 24 + ARCH_RADIUS,
)
HEAD_RX, HEAD_RY, HEAD_ANGLE = 34, 24, -22
HEADS = ((67.2, 184, PAPER), (187.2, 184, GOLD))  # the gold head is the line being sung

BODY_PATH = (
    f"M{STEM_LEFT},{STEM_BOTTOM} V{BEAM_TOP + BEAM_CORNER} "
    f"A{BEAM_CORNER},{BEAM_CORNER} 0 0 1 {STEM_LEFT + BEAM_CORNER},{BEAM_TOP} "
    f"H{STEM_RIGHT - BEAM_CORNER} A{BEAM_CORNER},{BEAM_CORNER} 0 0 1 {STEM_RIGHT},{BEAM_TOP + BEAM_CORNER} "
    f"V{STEM_BOTTOM} H{STEM_RIGHT - STEM_WIDTH} V{ARCH_CENTER[1]:g} "
    f"A{ARCH_RADIUS},{ARCH_RADIUS} 0 0 0 {STEM_LEFT + STEM_WIDTH},{ARCH_CENTER[1]:g} V{STEM_BOTTOM} Z"
)


def head_path(cx: float, cy: float) -> str:
    """Rotated ellipse as four cubic curves, so Android vector drawables need no group transform."""
    a = math.radians(HEAD_ANGLE)
    k = 4 * (math.sqrt(2) - 1) / 3

    def at(x: float, y: float) -> str:
        return f"{cx + x * math.cos(a) - y * math.sin(a):.2f},{cy + x * math.sin(a) + y * math.cos(a):.2f}"

    rx, ry = HEAD_RX, HEAD_RY
    quarters = (
        ((rx, k * ry), (k * rx, ry), (0, ry)),
        ((-k * rx, ry), (-rx, k * ry), (-rx, 0)),
        ((-rx, -k * ry), (-k * rx, -ry), (0, -ry)),
        ((k * rx, -ry), (rx, -k * ry), (rx, 0)),
    )
    return (
        f"M{at(rx, 0)} "
        + " ".join("C" + " ".join(at(*p) for p in q) for q in quarters)
        + " Z"
    )


def mark_layers(gold: str = GOLD) -> list[tuple[str, str]]:
    return [(PAPER, BODY_PATH)] + [
        (gold if color == GOLD else PAPER, head_path(x, y)) for x, y, color in HEADS
    ]


def mark_radius() -> float:
    """Farthest point of the mark from the canvas centre, used to fit Android's safe zone."""
    a = math.radians(HEAD_ANGLE)
    points = [(STEM_RIGHT, STEM_BOTTOM), (STEM_LEFT, STEM_BOTTOM)]
    for cx, cy, _ in HEADS:
        for step in range(360):
            t = math.radians(step)
            x, y = HEAD_RX * math.cos(t), HEAD_RY * math.sin(t)
            points.append(
                (
                    cx + x * math.cos(a) - y * math.sin(a),
                    cy + x * math.sin(a) + y * math.cos(a),
                )
            )
    corner = (
        math.hypot(128 - STEM_LEFT - BEAM_CORNER, 128 - BEAM_TOP - BEAM_CORNER)
        + BEAM_CORNER
    )
    return max([corner] + [math.hypot(x - 128, y - 128) for x, y in points])


def android_vector(layers: list[tuple[str, str]]) -> str:
    # Keep the whole mark inside the 66dp safe circle of the 108dp adaptive icon canvas.
    scale = 33 / mark_radius()
    offset = 54 - 128 * scale
    paths = "".join(
        f'        <path android:fillColor="{color}" android:pathData="{data}" />\n'
        for color, data in layers
    )
    return (
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        '    android:width="108dp" android:height="108dp"\n'
        '    android:viewportWidth="108" android:viewportHeight="108">\n'
        f'    <group android:scaleX="{scale:.4f}" android:scaleY="{scale:.4f}"\n'
        f'        android:translateX="{offset:.3f}" android:translateY="{offset:.3f}">\n'
        f"{paths}"
        "    </group>\n"
        "</vector>\n"
    )


def inside_mark(x: float, y: float) -> int:
    """0 for background, 1 for paper, 2 for gold; mirrors BODY_PATH and head_path."""
    a = math.radians(HEAD_ANGLE)
    for cx, cy, color in HEADS:
        dx, dy = x - cx, y - cy
        lx, ly = dx * math.cos(a) + dy * math.sin(a), -dx * math.sin(a) + dy * math.cos(
            a
        )
        if (lx / HEAD_RX) ** 2 + (ly / HEAD_RY) ** 2 <= 1:
            return 2 if color == GOLD else 1
    if not (STEM_LEFT <= x <= STEM_RIGHT and BEAM_TOP <= y <= STEM_BOTTOM):
        return 0
    corner_y = BEAM_TOP + BEAM_CORNER
    corner_x = STEM_LEFT + BEAM_CORNER if x < 128 else STEM_RIGHT - BEAM_CORNER
    if y < corner_y and abs(x - 128) > abs(corner_x - 128):
        if math.hypot(x - corner_x, y - corner_y) > BEAM_CORNER:
            return 0
    in_opening = (
        STEM_LEFT + STEM_WIDTH < x < STEM_RIGHT - STEM_WIDTH and y >= ARCH_CENTER[1]
    )
    in_arch = math.hypot(x - ARCH_CENTER[0], y - ARCH_CENTER[1]) < ARCH_RADIUS
    return 0 if in_opening or in_arch else 1


def ios_png(size: int) -> bytes:
    """Opaque full-bleed RGB PNG; iOS applies its own corner mask."""
    colors = [
        tuple(int(c[i : i + 2], 16) for i in (1, 3, 5)) for c in (PINE, PAPER, GOLD)
    ]
    unit = 256 / size
    grid = [
        [inside_mark(i * unit, j * unit) for i in range(size + 1)]
        for j in range(size + 1)
    ]
    rows = bytearray()
    for j in range(size):
        rows.append(0)
        for i in range(size):
            corners = {grid[j][i], grid[j][i + 1], grid[j + 1][i], grid[j + 1][i + 1]}
            if len(corners) == 1:
                rows.extend(colors[corners.pop()])
                continue
            # Edge pixel: average a 4x4 supersample.
            total = [0, 0, 0]
            for sy in range(4):
                for sx in range(4):
                    rgb = colors[
                        inside_mark(
                            (i + (sx + 0.5) / 4) * unit, (j + (sy + 0.5) / 4) * unit
                        )
                    ]
                    total = [t + c for t, c in zip(total, rgb, strict=True)]
            rows.extend(round(t / 16) for t in total)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    header = struct.pack(">2I5B", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + chunk(b"IEND", b"")
    )


def preview_svg() -> str:
    paths = "".join(
        f'<path fill="{color}" d="{data}"/>' for color, data in mark_layers()
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">'
        f'<rect width="256" height="256" fill="{PINE}"/>{paths}</svg>\n'
    )


def write(path: Path, content: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content if isinstance(content, bytes) else content.encode("utf-8"))


if __name__ == "__main__":
    write(
        ANDROID_RES / "mipmap-anydpi/ic_launcher.xml",
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background" />\n'
        '    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n'
        '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n'
        "</adaptive-icon>\n",
    )
    write(
        ANDROID_RES / "values/ic_launcher_background.xml",
        '<?xml version="1.0" encoding="utf-8"?>\n'
        f'<resources>\n    <color name="ic_launcher_background">{PINE}</color>\n</resources>\n',
    )
    write(
        ANDROID_RES / "drawable/ic_launcher_foreground.xml",
        android_vector(mark_layers()),
    )
    # Themed icons use only the layer's alpha, so both note heads share one colour.
    write(
        ANDROID_RES / "drawable/ic_launcher_monochrome.xml",
        android_vector(mark_layers(gold=PAPER)),
    )
    write(IOS_ICON_SET / "AppIcon.png", ios_png(1024))
    write(
        IOS_ICON_SET / "Contents.json",
        json.dumps(
            {
                "images": [
                    {
                        "filename": "AppIcon.png",
                        "idiom": "universal",
                        "platform": "ios",
                        "size": "1024x1024",
                    }
                ],
                "info": {"author": "xcode", "version": 1},
            },
            indent=2,
        )
        + "\n",
    )
    write(
        IOS_ICON_SET.parent / "Contents.json",
        json.dumps({"info": {"author": "xcode", "version": 1}}, indent=2) + "\n",
    )
    if len(sys.argv) > 1:
        write(Path(sys.argv[1]), preview_svg())
    print(
        f"Generated Android adaptive icon layers and iOS AppIcon.png (scale fits radius {mark_radius():.1f})"
    )
