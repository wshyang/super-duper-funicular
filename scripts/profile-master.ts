import fs from 'node:fs';
import path from 'node:path';
import { readPngFile, writePngFile } from '../src/core/png.js';
import { cloneRaster, writePixel } from '../src/core/raster.js';
import { detectKeyColour, keyMaster, measureMaster, type MasterProfile } from '../src/profile/master-profile.js';

const MASTER_PATH = process.argv[2] ?? 'assets/personas/athletic/01-master-lateral.png';
const OUT_DIR = process.argv[3] ?? 'out/profile/athletic';

const LANDMARK_COLOURS: Record<string, { r: number; g: number; b: number }> = {
  headTop: { r: 0, g: 200, b: 255 },
  chin: { r: 255, g: 200, b: 0 },
  shoulder: { r: 0, g: 255, b: 120 },
  waist: { r: 255, g: 120, b: 0 },
  hip: { r: 255, g: 0, b: 160 },
  knee: { r: 160, g: 0, b: 255 },
  ankle: { r: 0, g: 255, b: 255 },
  sole: { r: 255, g: 0, b: 0 },
};

function paintLandmarks(image: ReturnType<typeof readPngFile>, profile: MasterProfile) {
  const overlay = cloneRaster(image);
  for (const [name, y] of Object.entries(profile.landmarks)) {
    const colour = LANDMARK_COLOURS[name] ?? { r: 255, g: 255, b: 255 };
    for (let x = profile.minX - 20; x < profile.maxX + 20; x++) {
      for (let dy = 0; dy < 3; dy++) {
        writePixel(overlay, x, Math.round(y) + dy, { ...colour, a: 230 });
      }
    }
  }
  return overlay;
}

function main(): void {
  const master = readPngFile(MASTER_PATH);
  const key = detectKeyColour(master);
  const keyed = keyMaster(master, key);
  const profile = measureMaster(keyed);
  writePngFile(path.join(OUT_DIR, 'profile-overlay.png'), paintLandmarks(master, profile));
  const derived = {
    note: 'Knee is placed at the midpoint of the measured hip and ankle anchors; the silhouette alone cannot locate a joint centre.',
    knee: profile.landmarks.knee,
  };
  const report = {
    source: MASTER_PATH,
    heightPx: profile.heightPx,
    detectedKey: profile.detectedKey,
    landmarks: profile.landmarks,
    normalizedFromSole: profile.normalized,
    bands: profile.bands,
    armAxis: profile.armAxis,
    palette: profile.palette,
    derived,
    measuredAt: 'deterministic; no hand-tuned crop constants',
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'profile.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
