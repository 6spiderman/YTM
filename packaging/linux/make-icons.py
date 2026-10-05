#!/usr/bin/env python3
"""Generate the Linux icon set (PNG per size, named <size>x<size>.png) from assets/icons/icon.png.

Output goes to packaging/linux/icons (not assets/, which is packaged into the Windows installer).
Requires Pillow. Run from the repository root: python3 packaging/linux/make-icons.py
The source is 433x433, so sizes above 256 are not generated (no upscaling).
"""
from pathlib import Path
from PIL import Image

SIZES = [16, 24, 32, 48, 64, 128, 256]
root = Path(__file__).resolve().parents[2]
src = Image.open(root / "assets" / "icons" / "icon.png").convert("RGBA")
out = root / "packaging" / "linux" / "icons"
out.mkdir(parents=True, exist_ok=True)
for size in SIZES:
    src.resize((size, size), Image.LANCZOS).save(out / f"{size}x{size}.png", optimize=True)
    print("wrote", out / f"{size}x{size}.png")
