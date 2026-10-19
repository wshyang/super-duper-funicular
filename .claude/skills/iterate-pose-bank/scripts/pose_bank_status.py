#!/usr/bin/env python3
"""Pose-bank manifest triage for the iterate-pose-bank skill.

Usage:
  python3 pose_bank_status.py [pose-bank.json]

Prints per-frame status + attempts, verifies SHA-256 hashes of the identity anchor
and every attempt candidate against disk, and emits the regeneration work queue.
Exit code 1 when there is pending work or hash drift; 0 when the bank is clean.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

DEFAULT = "src/images/photoreal-female-pose-bank/pose-bank.json"
DONE = {"accepted", "accepted-for-pose"}
TODO = {"needs-regeneration", "rejected", "conditional", "planned"}


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def check_hash(path: str | None, expected: str | None, label: str, problems: list[str]) -> None:
    if not path or not expected:
        return
    if not os.path.exists(path):
        problems.append(f"MISSING FILE  {label}: {path}")
        return
    actual = sha256(path)
    if actual != expected:
        problems.append(f"HASH DRIFT    {label}: {path}\n              manifest {expected}\n              disk     {actual}")


def main() -> int:
    manifest_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
    with open(manifest_path) as f:
        d = json.load(f)

    problems: list[str] = []
    queue: list[str] = []

    anchor = d.get("identityAnchor") or {}
    check_hash(anchor.get("path"), anchor.get("sha256"), "identity anchor (H00 master)", problems)

    print(f"pose bank: {manifest_path}")
    print(f"character: {d.get('characterId')}")
    print(f"acceptance criteria: {d.get('acceptanceCriteria', '(none recorded)')}")
    print(f"identity anchor: {anchor.get('path')}")
    print()
    print(f"{'frame':6} {'phase':7} {'status':22} attempts (latest last)")
    for fr in d.get("frames", []):
        attempts = fr.get("attempts", [])
        chain = " -> ".join(f"{a.get('attemptId','?')}:{a.get('status','?')}" for a in attempts) or "-"
        phase = fr.get("phase")
        print(f"{fr['key']:6} {('' if phase is None else f'{phase:.3f}'):7} {fr.get('status','?'):22} {chain}")
        for a in attempts:
            check_hash(a.get("candidatePath"), a.get("candidateSha256"), f"{fr['key']} {a.get('attemptId')}", problems)
            check_hash(a.get("baseImagePath"), a.get("baseImageSha256"), f"{fr['key']} {a.get('attemptId')} base", problems)
            check_hash(a.get("poseGuidePath"), a.get("poseGuideSha256"), f"{fr['key']} {a.get('attemptId')} guide", problems)
        if fr.get("status") in TODO:
            queue.append(f"{fr['key']} ({fr.get('phaseName','?')}): status={fr['status']}")

    print()
    if queue:
        print("WORK QUEUE (regenerate/review these frames):")
        for q in queue:
            print(f"  - {q}")
    else:
        print("WORK QUEUE: empty — all frames accepted or accepted-for-pose.")

    if problems:
        print("\nINTEGRITY PROBLEMS (investigate before editing anything):")
        for p in problems:
            print(f"  ! {p}")

    return 1 if (queue or problems) else 0


if __name__ == "__main__":
    sys.exit(main())
