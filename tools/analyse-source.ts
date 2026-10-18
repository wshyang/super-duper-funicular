import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Raster } from '../src/shared/types.ts';
import { decodeJpeg, decodePng } from '../src/lib/pipeline/image-io.ts';
import { sha256Hex } from '../src/lib/pipeline/hashing.ts';
import { analyseSourceFlaws } from '../src/lib/analysis/source-flaws.ts';
import type { RawCellStats } from '../src/lib/pipeline/extract.ts';
import { PALETTES } from '../src/lib/pipeline/extract.ts';
import { auditCycle } from '../src/lib/analysis/cycle-audit.ts';
import { MOTION_IDS, MOTION_PROFILES } from '../src/lib/rig/body.ts';

const SOURCE = 'src/images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg';
const FRAMES_DIR = 'public/sprites/extracted';
const OUT = 'public/analysis/source-flaws.json';

function main(): void {
  const sourceBytes = new Uint8Array(readFileSync(SOURCE));
  const sourceSha = sha256Hex(sourceBytes);
  const rows = PALETTES.map((palette) => loadRow(palette));
  const rawStats = JSON.parse(readFileSync('public/analysis/raw-cell-stats.json', 'utf8')) as RawCellStats[];
  const report = analyseSourceFlaws(rows, rawStats, sourceSha);
  const cycleAudit = Object.fromEntries(MOTION_IDS.map((id) => [id, auditCycle(MOTION_PROFILES[id])]));
  mkdirSync('public/analysis', { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ ...report, generatedCycleAudit: cycleAudit }, null, 2)}\n`);
  for (const flaw of report.flaws) {
    console.log(`${flaw.id} detected=${flaw.detected} :: ${flaw.evidence}`);
  }
  console.log(`mean half-cycle IoU ${report.meanHalfCycleIou} · lead swaps ${report.leadSwaps} · min separation ${report.minFootSeparationPx}px`);
}

function loadRow(palette: string): Raster[] {
  const frames: Raster[] = [];
  for (let frame = 1; frame <= 8; frame += 1) {
    const id = `${palette}-${String(frame).padStart(2, '0')}`;
    frames.push(decodePng(readFileSync(`${FRAMES_DIR}/${id}.png`)));
  }
  return frames;
}

main();
