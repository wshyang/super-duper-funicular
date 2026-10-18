#!/usr/bin/env python3
"""Pack consecutive transparent PNG frames into a fixed-cell sprite atlas."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from PIL import Image

FRAME_PATTERN = re.compile(r"^frame_(\d{2,})\.png$")


class AtlasError(ValueError):
    """Raised when inputs cannot form a valid sprite atlas."""


@dataclass(frozen=True)
class AtlasConfig:
    expected_count: int = 16
    columns: int = 4
    fps: float = 24.0
    ground_y: int | None = 234
    manifest_path: Path | None = None
    contacts_path: Path | None = None
    max_contact_error_px: float = 1.0


@dataclass(frozen=True)
class FrameInfo:
    index: int
    path: Path
    image: Image.Image
    sha256: str
    alpha_bbox: tuple[int, int, int, int]
    alpha_edge_touched: bool


@dataclass(frozen=True)
class ContactContext:
    frame_count: int
    width: int
    height: int
    ground_y: int
    max_error_px: float


@dataclass(frozen=True)
class ContactAudit:
    frames: tuple[dict[str, object], ...] | None
    status: str
    tolerance_px: float


@dataclass(frozen=True)
class AtlasArtifacts:
    image: Image.Image
    frames: tuple[FrameInfo, ...]
    atlas_path: Path
    manifest_path: Path
    config: AtlasConfig
    contact_audit: ContactAudit


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _frame_paths(input_dir: Path) -> list[tuple[int, Path]]:
    indexed = []
    for path in input_dir.glob("frame_*.png"):
        match = FRAME_PATTERN.fullmatch(path.name)
        if match is None:
            raise AtlasError(f"invalid frame name {path.name!r}; expected frame_00.png")
        indexed.append((int(match.group(1)), path))
    return sorted(indexed, key=lambda item: item[0])


def _load_frames(input_dir: Path, expected_count: int) -> tuple[FrameInfo, ...]:
    indexed = _frame_paths(input_dir)
    if len(indexed) != expected_count:
        raise AtlasError(f"expected {expected_count} frames, found {len(indexed)}")
    actual = [index for index, _ in indexed]
    if actual != list(range(expected_count)):
        raise AtlasError(f"frame indices must be consecutive 0..{expected_count - 1}; got {actual}")
    frames = [_load_frame(index, path) for index, path in indexed]
    _require_common_size(frames)
    return tuple(frames)


def _load_frame(index: int, path: Path) -> FrameInfo:
    with Image.open(path) as source:
        source.load()
        if "A" not in source.getbands():
            raise AtlasError(f"{path.name} has no alpha channel; render transparent RGBA PNGs")
        image = source.convert("RGBA")
    alpha = image.getchannel("A")
    if alpha.getextrema()[0] != 0:
        raise AtlasError(f"{path.name} has no fully transparent pixels; check film transparency")
    bbox = alpha.getbbox()
    if bbox is None:
        raise AtlasError(f"{path.name} is fully transparent")
    width, height = image.size
    edge_touched = bbox[0] == 0 or bbox[1] == 0 or bbox[2] == width or bbox[3] == height
    return FrameInfo(index, path, image, sha256_file(path), bbox, edge_touched)


def _require_common_size(frames: Sequence[FrameInfo]) -> None:
    size = frames[0].image.size
    for frame in frames[1:]:
        if frame.image.size != size:
            raise AtlasError(f"{frame.path.name} is {frame.image.size}, expected {size}")


def _read_contact_entries(config: AtlasConfig) -> list[object]:
    if config.contacts_path is None or config.ground_y is None:
        raise AtlasError("contact sidecar requires --contacts and --ground-y")
    payload = json.loads(config.contacts_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("coordinateOrigin") != "top-left":
        raise AtlasError("contacts JSON must use coordinateOrigin 'top-left'")
    if payload.get("groundLineYFromTop") != config.ground_y:
        raise AtlasError("contacts groundLineYFromTop must match --ground-y")
    entries = payload.get("frames")
    if not isinstance(entries, list) or len(entries) != config.expected_count:
        raise AtlasError(f"contacts must contain exactly {config.expected_count} frame entries")
    return entries


def _contact_record(entry: object, index: int, context: ContactContext) -> tuple[dict[str, object], float | None]:
    if not isinstance(entry, dict) or type(entry.get("index")) is not int or entry["index"] != index:
        raise AtlasError(f"contacts must be ordered with indices 0..{context.frame_count - 1}")
    state, foot, sole = entry.get("state"), entry.get("supportFoot"), entry.get("solePointPx")
    if state == "flight":
        if foot is not None or sole is not None:
            raise AtlasError(f"flight frame {index} must not name a support foot or sole point")
        return {"state": state, "supportFoot": None, "solePointPx": None, "groundErrorPx": None}, None
    if state != "support" or not isinstance(foot, str) or foot not in {"L", "R"}:
        raise AtlasError(f"frame {index} must be flight or support with supportFoot L/R")
    if not isinstance(sole, list) or len(sole) != 2 or not all(type(v) in (int, float) for v in sole):
        raise AtlasError(f"support frame {index} requires solePointPx [x, y]")
    x, y = float(sole[0]), float(sole[1])
    if not 0 <= x < context.width or not 0 <= y < context.height:
        raise AtlasError(f"support frame {index} solePointPx is outside the frame")
    error = y - context.ground_y
    record = {"state": state, "supportFoot": foot, "solePointPx": [x, y], "groundErrorPx": error}
    return record, abs(error)


def _load_contact_audit(config: AtlasConfig, frame_size: tuple[int, int]) -> ContactAudit:
    if config.contacts_path is None:
        return ContactAudit(None, "pending", config.max_contact_error_px)
    entries = _read_contact_entries(config)
    width, height = frame_size
    context = ContactContext(config.expected_count, width, height, config.ground_y or 0, config.max_contact_error_px)
    parsed = [_contact_record(entry, i, context) for i, entry in enumerate(entries)]
    errors = [error for _, error in parsed if error is not None]
    if not errors:
        raise AtlasError("contacts must include at least one support frame")
    status = "pass" if max(errors) <= context.max_error_px else "fail"
    return ContactAudit(tuple(record for record, _ in parsed), status, context.max_error_px)


def _compose_atlas(frames: Sequence[FrameInfo], columns: int) -> Image.Image:
    width, height = frames[0].image.size
    rows = math.ceil(len(frames) / columns)
    atlas = Image.new("RGBA", (width * columns, height * rows), (0, 0, 0, 0))
    for frame in frames:
        location = ((frame.index % columns) * width, (frame.index // columns) * height)
        atlas.alpha_composite(frame.image, location)
    return atlas


def _frame_manifest(frame: FrameInfo, build: AtlasArtifacts) -> dict[str, object]:
    width, height = build.frames[0].image.size
    columns = build.config.columns
    record: dict[str, object] = {
        "index": frame.index,
        "source": frame.path.name,
        "sha256": frame.sha256,
        "atlasRect": {
            "x": (frame.index % columns) * width,
            "y": (frame.index // columns) * height,
            "width": width,
            "height": height,
        },
        "alphaBounds": list(frame.alpha_bbox),
        "subjectTouchesCanvasEdge": frame.alpha_edge_touched,
    }
    contacts = build.contact_audit.frames
    if contacts is not None:
        record["contact"] = contacts[frame.index]
    return record


def _manifest_layout(build: AtlasArtifacts) -> dict[str, object]:
    width, height = build.frames[0].image.size
    columns = build.config.columns
    rows = math.ceil(len(build.frames) / columns)
    return {
        "frameSize": {"width": width, "height": height},
        "atlasSize": {"width": width * columns, "height": height * rows},
        "columns": columns,
        "rows": rows,
    }


def _make_manifest(build: AtlasArtifacts, atlas_hash: str) -> dict[str, object]:
    config = build.config
    return {
        "schemaVersion": 1,
        "status": "candidate",
        "frameCount": len(build.frames),
        "fps": config.fps,
        "loopDurationSeconds": len(build.frames) / config.fps,
        **_manifest_layout(build),
        "groundLineYFromTop": config.ground_y,
        "supportSoleTolerancePx": config.max_contact_error_px,
        "atlas": {"path": build.atlas_path.name, "sha256": atlas_hash},
        "frames": [_frame_manifest(frame, build) for frame in build.frames],
        "review": {"visualApproval": "pending", "supportFootAudit": build.contact_audit.status},
    }


def _write_outputs(build: AtlasArtifacts) -> None:
    build.atlas_path.parent.mkdir(parents=True, exist_ok=True)
    build.manifest_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_atlas = build.atlas_path.with_name(f".{build.atlas_path.stem}.tmp{build.atlas_path.suffix}")
    temporary_manifest = build.manifest_path.with_name(f".{build.manifest_path.name}.tmp")
    try:
        build.image.save(temporary_atlas, format="PNG", optimize=False)
        manifest = _make_manifest(build, sha256_file(temporary_atlas))
        temporary_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary_atlas, build.atlas_path)
        os.replace(temporary_manifest, build.manifest_path)
    finally:
        temporary_atlas.unlink(missing_ok=True)
        temporary_manifest.unlink(missing_ok=True)


def pack_atlas(input_dir: Path, atlas_path: Path, config: AtlasConfig) -> Path:
    if not input_dir.is_dir():
        raise AtlasError(f"input directory does not exist: {input_dir}")
    _validate_config(config)
    frames = _load_frames(input_dir, config.expected_count)
    width, height = frames[0].image.size
    if config.ground_y is not None and not 0 <= config.ground_y < height:
        raise AtlasError(f"ground line {config.ground_y} is outside frame height {height}")
    manifest_path = config.manifest_path or atlas_path.with_suffix(".json")
    if atlas_path.resolve() == manifest_path.resolve():
        raise AtlasError("atlas PNG and manifest JSON must use different paths")
    contact_audit = _load_contact_audit(config, (width, height))
    build = AtlasArtifacts(_compose_atlas(frames, config.columns), frames, atlas_path, manifest_path, config, contact_audit)
    _write_outputs(build)
    return manifest_path


def _validate_config(config: AtlasConfig) -> None:
    if type(config.expected_count) is not int or type(config.columns) is not int:
        raise AtlasError("frame count and columns must be integers")
    valid_fps = type(config.fps) in (int, float) and math.isfinite(config.fps) and config.fps > 0
    if config.expected_count < 1 or config.columns < 1 or not valid_fps:
        raise AtlasError("frame count, columns, and finite fps must be positive")
    valid_tolerance = type(config.max_contact_error_px) in (int, float)
    valid_tolerance = valid_tolerance and math.isfinite(config.max_contact_error_px)
    if not valid_tolerance or config.max_contact_error_px < 0:
        raise AtlasError("contact tolerance must be finite and not negative")
    if config.ground_y is not None and type(config.ground_y) is not int:
        raise AtlasError("ground line must be an integer pixel coordinate")


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("frames", type=Path, help="directory containing frame_00.png ...")
    parser.add_argument("atlas", type=Path, help="output atlas PNG")
    parser.add_argument("--manifest", type=Path, help="output manifest JSON (default: atlas with .json suffix)")
    parser.add_argument("--contacts", type=Path, help="JSON support/flight labels and sole markers")
    parser.add_argument("--frame-count", type=int, default=16)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--fps", type=float, default=24.0)
    parser.add_argument("--ground-y", type=int, default=234, help="top-origin ground line in frame pixels")
    parser.add_argument("--max-contact-error-px", type=float, default=1.0)
    return parser.parse_args(argv)


def _config_from_args(args: argparse.Namespace) -> AtlasConfig:
    return AtlasConfig(
        expected_count=args.frame_count,
        columns=args.columns,
        fps=args.fps,
        ground_y=args.ground_y,
        manifest_path=args.manifest,
        contacts_path=args.contacts,
        max_contact_error_px=args.max_contact_error_px,
    )


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        manifest_path = pack_atlas(args.frames, args.atlas, _config_from_args(args))
    except (AtlasError, OSError, json.JSONDecodeError) as error:
        print(f"pack_atlas: error: {error}", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    contact_status = manifest["review"]["supportFootAudit"]
    print(f"wrote {args.atlas} and {manifest_path}; support-foot audit: {contact_status}")
    return 1 if contact_status == "fail" else 0


if __name__ == "__main__":
    raise SystemExit(main())
