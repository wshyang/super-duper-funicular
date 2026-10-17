import hashlib
import json
import unittest
from PIL import Image
from prepare_photo_parts import ROOT, OUTPUT, remove_green, prepare

class PhotoPartsTest(unittest.TestCase):
    def test_key_preserves_white_socks_and_teal(self):
        image = Image.new('RGB', (40, 30), (0, 200, 30))
        for x in range(10, 30):
            for y in range(5, 25):
                image.putpixel((x, y), (205, 225, 210) if y < 15 else (80, 130, 140))
        keyed = remove_green(image)
        self.assertEqual(keyed.getpixel((0, 0))[3], 0)
        self.assertEqual(keyed.getpixel((15, 10))[3], 255)
        self.assertEqual(keyed.getpixel((15, 20))[3], 255)

    def test_all_parts_have_alpha_and_valid_landmarks(self):
        manifest = json.loads((OUTPUT/'manifest.json').read_text())
        self.assertEqual(len(manifest['parts']), 16)
        self.assertEqual(manifest['generationCount'], 9)
        for part in manifest['parts'].values():
            path = ROOT/'public'/part['url'].lstrip('/')
            image = Image.open(path)
            self.assertEqual(image.mode, 'RGBA')
            self.assertEqual(list(image.size), part['size'])
            self.assertEqual(image.getchannel('A').getextrema(), (0, 255))
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), part['sha256'])
            for x, y in (part['start'], part['end']):
                self.assertGreaterEqual(x, 0)
                self.assertGreaterEqual(y, 0)
                self.assertLess(x, image.width)
                self.assertLess(y, image.height)

    def test_regeneration_is_deterministic(self):
        before = (OUTPUT/'manifest.json').read_bytes()
        prepare()
        self.assertEqual((OUTPUT/'manifest.json').read_bytes(), before)

if __name__ == '__main__':
    unittest.main()
