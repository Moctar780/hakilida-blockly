#!/usr/bin/env python3
"""Generate Tauri icon PNGs from a source image or create default placeholders.
Usage: python3 gen-icons.py [source.png]
"""

import struct, zlib, os, sys
from array import array

SIZES = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
}

def make_png(size, r=0x1F, g=0x6F, b=0xEB, a=255):
    """Create a minimal solid-color PNG of the given size."""
    raw = b""
    for y in range(size):
        raw += b"\x00"  # filter byte
        for x in range(size):
            # Simple checkered pattern so icon isn't blank
            cx, cy = x - size // 2, y - size // 2
            dist = (cx * cx + cy * cy) ** 0.5
            radius = size / 2 - 2
            if dist > radius:
                raw += struct.pack("BBBB", 0, 0, 0, 0)  # transparent
            elif dist > radius * 0.85:
                raw += struct.pack("BBBB", 255, 255, 255, 200)  # white rim
            else:
                raw += struct.pack("BBBB", r, g, b, 255)

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def make_ico():
    """Create a simple .ico from the 32x32 PNG."""
    png_data = make_png(32)
    # ICO header: reserved=0, type=1 (icon), count=1
    # Entry: w=32, h=32, colors=0, reserved=0, planes=1, bpp=32, size, offset
    offset = 6 + 16  # header + entry
    return (
        struct.pack("<HHH", 0, 1, 1)
        + struct.pack("<BBBBHHII", 32, 32, 0, 0, 1, 32, len(png_data), offset)
        + png_data
    )


def make_icns():
    """Create a minimal .icns (macOS icon) from a 128x128 PNG."""
    png_data = make_png(128)
    size = 8 + len(png_data)
    return struct.pack(">4sII", b"icns", size, 0) + struct.pack(">4sI", b"ic07", len(png_data) + 8) + png_data


def main():
    out_dir = os.path.join(os.path.dirname(__file__) or ".", "icons")
    os.makedirs(out_dir, exist_ok=True)

    for name, size in SIZES.items():
        path = os.path.join(out_dir, name)
        with open(path, "wb") as f:
            f.write(make_png(size))
        print(f"  Created {path} ({size}x{size})")

    ico_path = os.path.join(out_dir, "icon.ico")
    with open(ico_path, "wb") as f:
        f.write(make_ico())
    print(f"  Created {ico_path}")

    icns_path = os.path.join(out_dir, "icon.icns")
    with open(icns_path, "wb") as f:
        f.write(make_icns())
    print(f"  Created {icns_path}")

    print("\nDone — icons generated in", out_dir)


if __name__ == "__main__":
    main()
