"""Key AI-generated photographic sources and build calibrated overlapping rig parts.
No image generation here. Manual, reviewed landmarks live in photo_parts.json.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'src/images/photo-runner'
OUTPUT = ROOT/'public/photo-runner'


def remove_green(image):
    pixels = np.array(image.convert('RGB'), dtype=float)
    red, green, blue = [pixels[:, :, index] for index in range(3)]
    excess = green - np.maximum(red, blue)*1.3
    alpha = np.clip((25 - excess) / 20, 0, 1)
    labels, _ = ndimage.label(alpha > .1)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    alpha *= labels == sizes.argmax()
    # Remove green spill only in an edge band, not teal clothing interiors.
    edge = ndimage.binary_dilation(alpha < .1, iterations=3) & (alpha > 0)
    pixels[:, :, 1] = np.where(edge, np.minimum(green, np.maximum(red, blue)), green)
    rgba = np.dstack([pixels, alpha*255]).astype(np.uint8)
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(rgba)


def joint_mask(size, config):
    height, width = size
    y, x = np.mgrid[:height, :width]
    left, top, _, _ = config['crop']
    start, end = np.array(config['start']), np.array(config['end'])
    direction = (end-start)/np.linalg.norm(end-start)
    projection = (x+left-start[0])*direction[0]+(y+top-start[1])*direction[1]
    mask = np.ones(size)
    for point, radius, region in [(start, config.get('roundStart'), projection < 0),
                                  (end, config.get('roundEnd'), projection > np.linalg.norm(end-start))]:
        if radius is None:
            continue
        distance = np.hypot(x+left-point[0], y+top-point[1])
        mask *= np.where(region, np.clip((radius-distance)/4, 0, 1), 1)
    return mask


def crop_part(image, config):
    part = np.array(image.crop(config['crop']))
    fade = config['fade']
    ramp = np.minimum(np.arange(part.shape[0])/fade,
                      (part.shape[0]-1-np.arange(part.shape[0]))/fade)
    part[:, :, 3] = (part[:, :, 3]*np.clip(ramp[:, None], 0, 1)*joint_mask(part.shape[:2], config)).astype(np.uint8)
    return Image.fromarray(part)


def make_entry(name, config):
    crop = config['crop']
    return dict(url=f'/photo-runner/{name}.png', source=f'{config["source"]}.png',
                surface=config['surface'], crop=crop,
                start=[config['start'][0]-crop[0], config['start'][1]-crop[1]],
                end=[config['end'][0]-crop[0], config['end'][1]-crop[1]],
                size=[crop[2]-crop[0], crop[3]-crop[1]])


def prepare():
    config = json.loads((ROOT/'scripts/photo_parts.json').read_text())
    keyed = {name: remove_green(Image.open(SOURCE/f'{name}.png'))
             for name in {part['source'] for part in config.values()}}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    parts = {}
    for name, spec in config.items():
        path = OUTPUT/f'{name}.png'
        crop_part(keyed[spec['source']], spec).save(path, optimize=True)
        parts[name] = {**make_entry(name, spec), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    manifest = dict(persona='mei-lin-photo', kind='AI-generated photographic cutout rig',
                    generationCount=9, parts=parts)
    (OUTPUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(f'Prepared {len(parts)} photographic parts from {len(keyed)} independent source images.')


if __name__ == '__main__':
    prepare()
