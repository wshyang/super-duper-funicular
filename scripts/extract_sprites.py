"""Deterministic JPEG-tolerant chroma key, grid/loose-piece extraction and exact dedup."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
PALETTES = ['crimson', 'cobalt', 'leaf', 'sunshine', 'violet', 'tangerine']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pixel_hash(image):
    return digest(str(image.size).encode() + image.convert('RGBA').tobytes())


def key_magenta(image):
    rgba = np.array(image.convert('RGBA'))
    rgb = rgba[:, :, :3].astype(float)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # Both bright sheet pink and JPEG-contaminated pink edges are background.
    is_bright = (red > 175) & (blue > 175)
    is_edge = (red > 130) & (blue > 130) & (np.abs(red-blue) < 30)
    is_key = (is_bright | is_edge) & (red > green * 1.25) & (blue > green * 1.25)
    seed = np.zeros_like(is_key)
    seed[0, :] = is_key[0, :]
    seed[-1, :] = is_key[-1, :]
    seed[:, 0] = is_key[:, 0]
    seed[:, -1] = is_key[:, -1]
    is_key = ndimage.binary_propagation(seed, mask=is_key) | ((red > 230) & (blue > 230) & (green < 160))
    mask = ~is_key
    labels, count = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    keep = sizes >= 12
    keep[0] = False
    mask = keep[labels] if count else np.zeros_like(mask)
    rgba[:, :, 3] = mask.astype(np.uint8) * 255
    rgba[~mask, :3] = 0
    return Image.fromarray(rgba)


def detect_spans(image, axis):
    rgb = np.array(image.convert('RGB'))
    median = np.median(rgb, axis=axis)
    is_divider = (median[:, 0] > 200) & (median[:, 1] < 20) & (median[:, 2] > 200)
    labels, _ = ndimage.label(~is_divider)
    return [(part[0].start, part[0].stop) for part in ndimage.find_objects(labels)
            if part[0].stop-part[0].start > 20]


def grid_regions(image, config):
    rows, columns = detect_spans(image, 1), detect_spans(image, 0)
    if config.region or len(rows) != config.rows or len(columns) != config.columns:
        left, top, right, bottom = config.region or (0, round(image.height*82/1052), image.width, image.height)
        width, height = (right-left)/config.columns, (bottom-top)/config.rows
        rows = [(round(top+row*height), round(top+(row+1)*height)) for row in range(config.rows)]
        columns = [(round(left+col*width), round(left+(col+1)*width)) for col in range(config.columns)]
    for row, (top, bottom) in enumerate(rows):
        for col, (left, right) in enumerate(columns):
            bounds = (left, top, right, bottom)
            palette = PALETTES[row] if config.rows == 6 else f'row-{row+1:02}'
            yield f'runner-{palette}-{col+1:02}', row, col, bounds


def piece_regions(image):
    keyed = key_magenta(image)
    labels, _ = ndimage.label(np.array(keyed)[:, :, 3] > 0)
    pieces = ndimage.find_objects(labels)
    for index, piece in enumerate(pieces):
        if piece is None:
            continue
        y, x = piece
        if (y.stop-y.start)*(x.stop-x.start) < 36:
            continue
        yield f'piece-{index+1:03}', 0, index, (x.start, y.start, x.stop, y.stop)


def inventory():
    records, seen = [], {}
    for path in sorted((ROOT/'src/images').rglob('*')):
        if path.suffix.lower() not in ['.png', '.jpg', '.jpeg', '.webp']:
            continue
        image = Image.open(path)
        sha, pixels = digest(path.read_bytes()), pixel_hash(image)
        duplicate = seen.get(pixels)
        records.append(dict(path=str(path.relative_to(ROOT)), sha256=sha,
                            pixelSha256=pixels, size=list(image.size), duplicateOf=duplicate,
                            classification=('generated-photographic-reference' if path.name == 'reference.png' else 'generated-photographic-part-source') if 'photo-runner' in path.parts else 'character-animation-sheet'))
        seen.setdefault(pixels, str(path.relative_to(ROOT)))
    return records


def extract(config):
    image = Image.open(config.source)
    regions = list(grid_regions(image, config) if config.mode == 'grid' else piece_regions(image))
    width = max(bounds[2]-bounds[0] for _, _, _, bounds in regions)
    height = max(bounds[3]-bounds[1] for _, _, _, bounds in regions)
    config.output.mkdir(parents=True, exist_ok=True)
    frames, seen = [], {}
    for name, row, column, bounds in regions:
        cut = key_magenta(image.crop(bounds))
        canvas = Image.new('RGBA', (width, height))
        canvas.paste(cut, (0, 0))
        sha = pixel_hash(canvas)
        filename = seen.get(sha, f'{name}.png')
        if sha not in seen:
            canvas.save(config.output/filename, optimize=True)
            seen[sha] = filename
        frames.append(dict(id=name, row=row, column=column, url=f'/sprites/{filename}',
                           sha256=sha, sourceBounds=list(bounds), bounds=canvas.getbbox(),
                           pivot=[width//2, height-3], size=[width, height],
                           duplicateOf=None if filename == f'{name}.png' else filename))
    manifest = dict(source=config.source.name, mode=config.mode, frameCount=len(frames),
                    uniqueCount=len(seen), canvas=[width, height], frames=frames)
    (config.output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    (ROOT/'docs/artwork-inventory.json').write_text(json.dumps(inventory(), indent=2)+'\n')
    print(f'{len(frames)} logical frames → {len(seen)} unique PNGs at {config.output}')


def parse_arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'src/images/runner-six-palette-eight-frame-sheet.jpeg')
    parser.add_argument('--output', type=Path, default=ROOT/'public/sprites')
    parser.add_argument('--mode', choices=['grid', 'components'], default='grid')
    parser.add_argument('--rows', type=int, default=6)
    parser.add_argument('--columns', type=int, default=8)
    parser.add_argument('--region', nargs=4, type=int, metavar=('LEFT', 'TOP', 'RIGHT', 'BOTTOM'))
    config = parser.parse_args()
    if config.rows < 1 or config.columns < 1:
        parser.error('rows and columns must be positive')
    return config


if __name__ == '__main__':
    extract(parse_arguments())
