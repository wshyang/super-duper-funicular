import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodeJpeg, encodePng } from '../src/lib/pipeline/image-io.ts';
import { sha256Hex } from '../src/lib/pipeline/hashing.ts';
import { extractSheet } from '../src/lib/pipeline/extract.ts';

const SOURCE = 'src/images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg';
const OUT_DIR = 'public/sprites/extracted';
const ANALYSIS_DIR = 'public/analysis';

function main(): void {
  const bytes = readFileSync(SOURCE);
  const sourceSha = sha256Hex(new Uint8Array(bytes));
  const result = extractSheet(decodeJpeg(new Uint8Array(bytes)), sourceSha);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(ANALYSIS_DIR, { recursive: true });
  for (const [id, raster] of result.frames) writeFileSync(join(OUT_DIR, `${id}.png`), encodePng(raster));
  writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(result.manifest, null, 2)}\n`);
  writeFileSync(join(ANALYSIS_DIR, 'raw-cell-stats.json'), `${JSON.stringify(result.rawStats, null, 2)}\n`);
  console.log(`extracted ${result.frames.size} frames → ${OUT_DIR} (canvas ${result.manifest.canvas.width}×${result.manifest.canvas.height})`);
}

main();
