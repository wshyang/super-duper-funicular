import unittest
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from PIL import Image
from extract_sprites import key_magenta, pixel_hash, inventory, ROOT, detect_spans, extract

class ExtractionTest(unittest.TestCase):
    def test_key_and_foreground(self):
        image = Image.new('RGB', (20, 20), (255, 30, 250))
        for x in range(5, 15):
            for y in range(5, 15):
                image.putpixel((x, y), (45, 20, 60))
        result = key_magenta(image)
        self.assertEqual(result.getbbox(), (5, 5, 15, 15))
        self.assertEqual(result.getpixel((0, 0)), (0, 0, 0, 0))
        self.assertEqual(result.getpixel((10, 10))[3], 255)

    def test_hash_canonicalizes_mode(self):
        image = Image.new('RGB', (2, 2), 'red')
        self.assertEqual(pixel_hash(image), pixel_hash(image.convert('RGBA')))

    def test_inventory_has_one_unique_source(self):
        items = inventory()
        original = [item for item in items if item['classification'] == 'character-animation-sheet']
        self.assertEqual(len(original), 1)
        self.assertIsNone(original[0]['duplicateOf'])
        self.assertTrue(all(item['duplicateOf'] is None for item in items))

    def test_violet_highlights_are_not_keyed(self):
        image = Image.new('RGB', (30, 30), (255, 30, 250))
        for x in range(5, 25):
            for y in range(5, 25):
                image.putpixel((x, y), (90, 30, 130))
        image.putpixel((15, 15), (183, 80, 208))
        self.assertEqual(key_magenta(image).getpixel((15, 15))[3], 255)

    def test_nonuniform_dividers(self):
        image = Image.open(ROOT/'src/images/runner-six-palette-eight-frame-sheet.jpeg')
        self.assertEqual(len(detect_spans(image, 1)), 6)
        self.assertEqual(len(detect_spans(image, 0)), 8)

    def test_real_outputs_are_unique_transparent_and_not_clipped(self):
        manifest = json.loads((ROOT/'public/sprites/manifest.json').read_text())
        self.assertEqual(manifest['frameCount'], 48)
        hashes = set()
        for frame in manifest['frames']:
            image = Image.open(ROOT/'public'/frame['url'].lstrip('/'))
            self.assertEqual(image.mode, 'RGBA')
            self.assertEqual(list(image.size), manifest['canvas'])
            self.assertEqual(pixel_hash(image), frame['sha256'])
            self.assertEqual(image.getpixel((0, 0))[3], 0)
            self.assertLess(image.getbbox()[3], image.height)
            hashes.add(pixel_hash(image))
        self.assertEqual(len(hashes), 48)

    def test_identical_frames_share_one_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = Image.new('RGB', (64, 32), (255, 0, 255))
            for offset in (0, 32):
                for x in range(10, 20):
                    for y in range(10, 20):
                        image.putpixel((x+offset, y), (30, 80, 180))
            source = root/'fixture.png'
            image.save(source)
            config = SimpleNamespace(source=source, output=root/'sprites', mode='grid',
                                     rows=1, columns=2, region=(0, 0, 64, 32))
            extract(config)
            manifest = json.loads((config.output/'manifest.json').read_text())
            self.assertEqual(manifest['uniqueCount'], 1)
            self.assertEqual(len(list(config.output.glob('*.png'))), 1)
            self.assertEqual(manifest['frames'][0]['url'], manifest['frames'][1]['url'])

    def test_reproduction_is_deterministic(self):
        manifest = ROOT/'public/sprites/manifest.json'
        before = manifest.read_bytes()
        subprocess.run([sys.executable, str(ROOT/'scripts/extract_sprites.py')], check=True, capture_output=True)
        self.assertEqual(manifest.read_bytes(), before)

if __name__ == '__main__':
    unittest.main()
