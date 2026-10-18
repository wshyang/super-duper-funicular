from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from tools.sprite_pipeline.pack_atlas import AtlasConfig, AtlasError, pack_atlas


class PackAtlasTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.frames = self.root / "frames"
        self.frames.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_frame(self, index: int, size: tuple[int, int] = (8, 8)) -> Path:
        image = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(image).rectangle((1, 1, 2, 2), fill=(255, 0, 0, 255))
        path = self.frames / f"frame_{index:02d}.png"
        image.save(path)
        return path

    def write_contacts(self, sole_y: float = 7, ground_y: int = 7) -> Path:
        payload = {
            "coordinateOrigin": "top-left",
            "groundLineYFromTop": ground_y,
            "frames": [
                {"index": 0, "state": "support", "supportFoot": "R", "solePointPx": [4, sole_y]},
                {"index": 1, "state": "flight", "supportFoot": None, "solePointPx": None},
                {"index": 2, "state": "support", "supportFoot": "L", "solePointPx": [5, sole_y]},
                {"index": 3, "state": "flight", "supportFoot": None, "solePointPx": None},
            ],
        }
        path = self.root / "contacts.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    def test_packs_frames_without_resizing_and_writes_provenance(self) -> None:
        paths = [self.write_frame(index) for index in range(4)]
        atlas_path = self.root / "out" / "run.png"
        config = AtlasConfig(expected_count=4, columns=2, fps=24, ground_y=7)
        manifest_path = pack_atlas(self.frames, atlas_path, config)

        with Image.open(atlas_path) as atlas:
            self.assertEqual(atlas.size, (16, 16))
            self.assertEqual(atlas.mode, "RGBA")
            self.assertEqual(atlas.getpixel((1, 1)), (255, 0, 0, 255))
            self.assertEqual(atlas.getpixel((9, 9)), (255, 0, 0, 255))
            self.assertEqual(atlas.getpixel((7, 7)), (0, 0, 0, 0))

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(manifest["frameCount"], 4)
        self.assertEqual(manifest["loopDurationSeconds"], 4 / 24)
        self.assertEqual(manifest["frames"][3]["atlasRect"], {"x": 8, "y": 8, "width": 8, "height": 8})
        self.assertEqual(manifest["frames"][0]["sha256"], hashlib.sha256(paths[0].read_bytes()).hexdigest())
        self.assertEqual(manifest["status"], "candidate")
        self.assertEqual(manifest["review"]["supportFootAudit"], "pending")

    def test_records_support_foot_error_and_passes_within_tolerance(self) -> None:
        for index in range(4):
            self.write_frame(index)
        config = AtlasConfig(expected_count=4, columns=2, ground_y=7, contacts_path=self.write_contacts(7.5))
        manifest_path = pack_atlas(self.frames, self.root / "atlas.png", config)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertEqual(manifest["review"]["supportFootAudit"], "pass")
        self.assertEqual(manifest["supportSoleTolerancePx"], 1.0)
        self.assertEqual(manifest["frames"][0]["contact"]["supportFoot"], "R")
        self.assertEqual(manifest["frames"][0]["contact"]["groundErrorPx"], 0.5)
        self.assertEqual(manifest["frames"][1]["contact"]["state"], "flight")

    def test_marks_support_foot_audit_failed_when_sole_is_too_low(self) -> None:
        for index in range(4):
            self.write_frame(index)
        contacts = self.write_contacts(sole_y=6, ground_y=4)
        config = AtlasConfig(expected_count=4, columns=2, ground_y=4, contacts_path=contacts)
        manifest_path = pack_atlas(self.frames, self.root / "atlas.png", config)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertEqual(manifest["review"]["supportFootAudit"], "fail")
        self.assertEqual(manifest["frames"][0]["contact"]["groundErrorPx"], 2.0)

    def test_rejects_contact_ground_line_mismatch(self) -> None:
        for index in range(4):
            self.write_frame(index)
        contacts = self.write_contacts()
        config = AtlasConfig(expected_count=4, columns=2, ground_y=6, contacts_path=contacts)
        with self.assertRaisesRegex(AtlasError, "must match --ground-y"):
            pack_atlas(self.frames, self.root / "atlas.png", config)

    def test_rejects_missing_or_nonconsecutive_frames(self) -> None:
        self.write_frame(0)
        self.write_frame(2)
        config = AtlasConfig(expected_count=2, columns=2, ground_y=7)
        with self.assertRaisesRegex(AtlasError, "frame indices must be consecutive"):
            pack_atlas(self.frames, self.root / "atlas.png", config)

    def test_rejects_mismatched_frame_dimensions(self) -> None:
        self.write_frame(0)
        self.write_frame(1, (9, 8))
        config = AtlasConfig(expected_count=2, columns=2, ground_y=7)
        with self.assertRaisesRegex(AtlasError, "expected \(8, 8\)"):
            pack_atlas(self.frames, self.root / "atlas.png", config)

    def test_rejects_missing_alpha_channel(self) -> None:
        Image.new("RGB", (8, 8), (255, 0, 0)).save(self.frames / "frame_00.png")
        config = AtlasConfig(expected_count=1, columns=1, ground_y=7)
        with self.assertRaisesRegex(AtlasError, "no alpha channel"):
            pack_atlas(self.frames, self.root / "atlas.png", config)

    def test_rejects_opaque_background(self) -> None:
        Image.new("RGBA", (8, 8), (255, 0, 0, 255)).save(self.frames / "frame_00.png")
        config = AtlasConfig(expected_count=1, columns=1, ground_y=7)
        with self.assertRaisesRegex(AtlasError, "no fully transparent pixels"):
            pack_atlas(self.frames, self.root / "atlas.png", config)

    def test_rejects_invalid_frame_filename(self) -> None:
        self.write_frame(0)
        (self.frames / "frame_bad.png").write_bytes(b"not used")
        config = AtlasConfig(expected_count=1, columns=1, ground_y=7)
        with self.assertRaisesRegex(AtlasError, "invalid frame name"):
            pack_atlas(self.frames, self.root / "atlas.png", config)

    def test_rejects_ground_line_outside_frame(self) -> None:
        self.write_frame(0)
        config = AtlasConfig(expected_count=1, columns=1, ground_y=8)
        with self.assertRaisesRegex(AtlasError, "outside frame height"):
            pack_atlas(self.frames, self.root / "atlas.png", config)


if __name__ == "__main__":
    unittest.main()
