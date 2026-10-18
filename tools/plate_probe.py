#!/usr/bin/env python3
"""Stdlib-only probe for photographic sprite source plates and cutouts.

Decodes 8-bit PNG (colour types 2 and 6, non-interlaced) and reports the
alpha/silhouette statistics the revised pipeline needs to calibrate against:
opaque bounding boxes, per-row widths, and the width profile of a limb.

Usage:
    python3 tools/plate_probe.py bbox  <png> [<png> ...]
    python3 tools/plate_probe.py width <png> --rows 0,40,80,120,159
    python3 tools/plate_probe.py profile <png> --axis y --step 4

No third-party dependencies; safe to run in a bare container.
"""

from __future__ import annotations

import argparse
import struct
import sys
import zlib
from dataclasses import dataclass


@dataclass(frozen=True)
class Raster:
    width: int
    height: int
    channels: int
    data: bytes

    def pixel(self, x: int, y: int) -> tuple[int, ...]:
        offset = (y * self.width + x) * self.channels
        return tuple(self.data[offset : offset + self.channels])


def decode_png(path: str) -> Raster:
    with open(path, "rb") as handle:
        blob = handle.read()
    if blob[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path}: not a PNG file")
    offset, idat, header = 8, [], None
    while offset < len(blob):
        (length,) = struct.unpack(">I", blob[offset : offset + 4])
        kind = blob[offset + 4 : offset + 8]
        payload = blob[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            idat.append(payload)
        elif kind == b"IEND":
            break
    if header is None:
        raise ValueError(f"{path}: missing IHDR")
    width, height, depth, colour, compression, filt, interlace = header
    if depth != 8 or colour not in (2, 6) or compression != 0 or filt != 0 or interlace != 0:
        raise ValueError(f"{path}: unsupported PNG (depth={depth} colour={colour} interlace={interlace})")
    channels = 4 if colour == 6 else 3
    return Raster(width, height, channels, unfilter(zlib.decompress(b"".join(idat)), width, height, channels))


def unfilter(raw: bytes, width: int, height: int, channels: int) -> bytes:
    stride = width * channels
    out = bytearray(stride * height)
    previous = bytearray(stride)
    cursor = 0
    for row in range(height):
        method = raw[cursor]
        cursor += 1
        line = bytearray(raw[cursor : cursor + stride])
        cursor += stride
        if method == 1:
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif method == 2:
            for i in range(stride):
                line[i] = (line[i] + previous[i]) & 0xFF
        elif method == 3:
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + previous[i]) >> 1)) & 0xFF
        elif method == 4:
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                up_left = previous[i - channels] if i >= channels else 0
                line[i] = (line[i] + paeth(left, previous[i], up_left)) & 0xFF
        elif method != 0:
            raise ValueError(f"unknown PNG filter {method}")
        out[row * stride : (row + 1) * stride] = line
        previous = line
    return bytes(out)


def paeth(left: int, above: int, above_left: int) -> int:
    estimate = left + above - above_left
    dist_left, dist_above, dist_corner = (
        abs(estimate - left),
        abs(estimate - above),
        abs(estimate - above_left),
    )
    if dist_left <= dist_above and dist_left <= dist_corner:
        return left
    return above if dist_above <= dist_corner else above_left


def opaque(pixel: tuple[int, ...], background: tuple[int, int, int] | None) -> bool:
    if len(pixel) == 4:
        return pixel[3] > 16
    if background is None:
        return True
    return sum(abs(pixel[i] - background[i]) for i in range(3)) > 24


def row_span(raster: Raster, y: int, background: tuple[int, int, int] | None) -> tuple[int, int] | None:
    xs = [x for x in range(raster.width) if opaque(raster.pixel(x, y), background)]
    return (min(xs), max(xs)) if xs else None


def bounds(raster: Raster, background: tuple[int, int, int] | None) -> tuple[int, int, int, int]:
    min_x, min_y, max_x, max_y = raster.width, raster.height, -1, -1
    for y in range(raster.height):
        span = row_span(raster, y, background)
        if not span:
            continue
        min_x, max_x = min(min_x, span[0]), max(max_x, span[1])
        min_y, max_y = min(min_y, y), max(max_y, y)
    if max_x < 0:
        raise ValueError("empty silhouette")
    return min_x, min_y, max_x, max_y


def describe(path: str, background: tuple[int, int, int] | None) -> str:
    raster = decode_png(path)
    min_x, min_y, max_x, max_y = bounds(raster, background)
    return (
        f"{path}\n"
        f"  size={raster.width}x{raster.height} bbox=({min_x},{min_y})-({max_x},{max_y}) "
        f"w={max_x - min_x + 1} h={max_y - min_y + 1}"
    )


def width_profile(path: str, background: tuple[int, int, int] | None, step: int) -> str:
    raster = decode_png(path)
    lines = [f"{path}  size={raster.width}x{raster.height}"]
    for y in range(0, raster.height, step):
        span = row_span(raster, y, background)
        if span:
            lines.append(f"  y={y:3d} x={span[0]:3d}..{span[1]:3d} width={span[1] - span[0] + 1:3d}")
        else:
            lines.append(f"  y={y:3d} (empty)")
    return "\n".join(lines)


def parse_rows(spec: str) -> list[int]:
    return [int(part) for part in spec.split(",") if part.strip()]


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["bbox", "width", "profile"])
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--rows", default="")
    parser.add_argument("--step", type=int, default=4)
    parser.add_argument("--key", default="", help="magenta hex, e.g. FF00FF, when the plate is opaque")
    args = parser.parse_args(argv)
    background = tuple(int(args.key[i : i + 2], 16) for i in (0, 2, 4)) if args.key else None
    if args.command == "bbox":
        for path in args.paths:
            print(describe(path, background))
    elif args.command == "width":
        for path in args.paths:
            raster = decode_png(path)
            print(f"{path}  size={raster.width}x{raster.height}")
            for y in parse_rows(args.rows):
                span = row_span(raster, y, background)
                print(f"  y={y:3d} {span if span else '(empty)'}")
    else:
        for path in args.paths:
            print(width_profile(path, background, args.step))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
