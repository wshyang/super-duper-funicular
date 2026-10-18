/**
 * SC-AC-09 harvest proof: cut one part from an accepted pose-bank candidate.
 *
 * Proof #1 (this script's frame-specific finder): H01-100 farFoot — the
 * tucked trail shoe, well isolated from other body parts. The script bboxes
 * it, adds a shin stub for rig overlap, keys studio magenta, and runs the
 * SC-AC-09 telemetry gates (magentaSpill = 0, detachedIslands = 0).
 * uncoveredJoints is a rig-render gate and is recorded as deferred.
 * A reviewer completes the proof with the 1x/2x visual seam check and marks
 * proofs.json accordingly.
 *
 * Negative lesson (kept for the record): proof-01 first targeted H07-96
 * nearFoot, whose swing shoe hangs against the support ankle. Rectangular
 * ankle-anchored boxes cannot isolate compact-pose feet — the alpha flood
 * crossed into the support leg (384x416 box, islands=1, FAIL). Compact feet
 * need mask/shape-aware cutouts; the box harvester is valid only for
 * isolated parts (COMPACT-ADJACENCY limitation).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readImageFile, writePngFile } from '../src/pipeline/image-io.js';
import { keyStudioMagenta } from '../src/pipeline/photoreal-extractor.js';
import { listOpaqueComponentSizes, removeSmallOpaqueIslands } from '../src/pipeline/connected-components.js';
import { readPixel } from '../src/pipeline/raster.js';
import type { RasterImage } from '../src/shared/types.js';

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function isShoeWhite(r: number, g: number, b: number): boolean {
  return r > 198 && g > 198 && b > 198;
}

function isMagentaBg(r: number, g: number, b: number): boolean {
  const rg = r - g;
  const bg = b - g;
  return r > 132 && b > 110 && rg > 38 && bg > 28 && Math.abs(r - b) < 66;
}

function isShoeColored(r: number, g: number, b: number): boolean {
  const min = Math.min(r, g, b);
  if (min > 150) return true; // shoe white / sock white
  return r > 150 && r - g > 80; // crimson shoe accents (skin has r-g ~50)
}

/** Largest white fragment in the tucked-shoe region = trail-shoe seed (H01-100).
 * The shoe's white is split by crimson stripes into <400px fragments; the
 * color flood re-merges them. Region excludes the singlet stripe (x 697+)
 * and the support shoe/sock (y 658+). */
function findTuckedShoeWhite(img: RasterImage): { box: Box; centroid: { x: number; y: number } } {
  const { width, height } = img;
  const seen = new Uint8Array(width * height);
  let best: { box: Box; centroid: { x: number; y: number }; area: number } | null = null;
  for (let y = 400; y < 580; y++) {
    for (let x = 400; x < 650; x++) {
      const idx = y * width + x;
      if (seen[idx]) continue;
      const p = readPixel(img, x, y);
      if (!isShoeWhite(p.r, p.g, p.b)) continue;
      // Flood-fill this white cluster.
      let x0 = x;
      let x1 = x;
      let y0 = y;
      let y1 = y;
      let area = 0;
      const stack: Array<[number, number]> = [[x, y]];
      seen[idx] = 1;
      while (stack.length > 0) {
        const [cx, cy] = stack.pop() as [number, number];
        area++;
        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (cy < y0) y0 = cy;
        if (cy > y1) y1 = cy;
        const neighbors: Array<[number, number]> = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 400 || nx >= 650 || ny < 400 || ny >= 580) continue;
          const nidx = ny * width + nx;
          if (seen[nidx]) continue;
          seen[nidx] = 1;
          const np = readPixel(img, nx, ny);
          if (isShoeWhite(np.r, np.g, np.b)) stack.push([nx, ny]);
        }
      }
      if (area >= 100 && (best === null || area > best.area)) {
        best = { box: { x0, y0, x1, y1 }, centroid: { x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2) }, area };
      }
    }
  }
  if (!best) throw new Error('tucked shoe cluster not found');
  return best;
}

/**
 * Full shoe extent: flood keyed pixels with shoe-like colors (white/crimson)
 * from the white centroid inside a bounded window. White-only bbox clips
 * colored toes; the color constraint stops the flood at skin (shin), so the
 * extent covers shoe + sock but not the leg.
 */
function findFootColorBox(keyed: RasterImage, seed: { x: number; y: number }, window: Box): Box {
  const { width, height } = keyed;
  const seen = new Uint8Array(width * height);
  let x0 = seed.x;
  let x1 = seed.x;
  let y0 = seed.y;
  let y1 = seed.y;
  const stack: Array<[number, number]> = [[seed.x, seed.y]];
  seen[seed.y * width + seed.x] = 1;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop() as [number, number];
    if (cx < x0) x0 = cx;
    if (cx > x1) x1 = cx;
    if (cy < y0) y0 = cy;
    if (cy > y1) y1 = cy;
    const neighbors: Array<[number, number]> = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < window.x0 || nx > window.x1 || ny < window.y0 || ny > window.y1) continue;
      const nidx = ny * width + nx;
      if (seen[nidx]) continue;
      seen[nidx] = 1;
      const np = readPixel(keyed, nx, ny);
      if (np.a > 0 && isShoeColored(np.r, np.g, np.b)) stack.push([nx, ny]);
    }
  }
  return { x0, y0, x1, y1 };
}

function crop(img: RasterImage, box: Box): RasterImage {
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const out: RasterImage = {
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4),
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = readPixel(img, box.x0 + x, box.y0 + y);
      const o = (y * w + x) * 4;
      out.data[o] = p.r;
      out.data[o + 1] = p.g;
      out.data[o + 2] = p.b;
      out.data[o + 3] = p.a;
    }
  }
  return out;
}

const CANDIDATE_REL = 'src/images/photoreal-female-pose-bank/candidates/H01-right-contact-v3-guide-retry3.png';
const CUTOUT_REL = 'src/images/photoreal-female-pose-bank/proofs/proof01-H01-100-farFoot.png';

function locateCutoutBox(img: RasterImage, keyed: RasterImage): { shoe: Box; box: Box } {
  const white = findTuckedShoeWhite(img);
  const reach = 130;
  const window: Box = {
    x0: Math.max(0, white.box.x0 - reach),
    y0: Math.max(0, white.box.y0 - reach),
    x1: Math.min(img.width - 1, white.box.x1 + reach),
    y1: Math.min(img.height - 1, white.box.y1 + reach),
  };
  const shoe = findFootColorBox(keyed, white.centroid, window);
  const box: Box = {
    x0: Math.max(0, shoe.x0 - 24),
    y0: Math.max(0, shoe.y0 - 24 - 50),
    x1: Math.min(img.width - 1, shoe.x1 + 24),
    y1: Math.min(img.height - 1, shoe.y1 + 24),
  };
  return { shoe, box };
}

function measureCutoutTelemetry(cutout: RasterImage): { magentaSpill: number; detachedIslands: number } {
  let magentaSpill = 0;
  for (let y = 0; y < cutout.height; y++) {
    for (let x = 0; x < cutout.width; x++) {
      const p = readPixel(cutout, x, y);
      if (p.a > 0 && isMagentaBg(p.r, p.g, p.b)) magentaSpill++;
    }
  }
  const components = listOpaqueComponentSizes(cutout, 1).filter((area) => area > 25);
  return { magentaSpill, detachedIslands: Math.max(0, components.length - 1) };
}

function writeProofOutputs(repoRoot: string, cutout: RasterImage, shoe: Box, box: Box, telemetry: { magentaSpill: number; detachedIslands: number }): void {
  const outDir = path.join(repoRoot, 'src/images/photoreal-female-pose-bank/proofs');
  fs.mkdirSync(outDir, { recursive: true });
  writePngFile(path.join(repoRoot, CUTOUT_REL), cutout);
  const cutoutHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, CUTOUT_REL))).digest('hex');
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, CANDIDATE_REL))).digest('hex');
  const gatesPass = telemetry.magentaSpill === 0 && telemetry.detachedIslands === 0;
  const sidecar = {
    proofId: 'proof-01',
    criterion: 'SC-AC-09',
    sourceCandidate: 'H01-100',
    sourcePath: CANDIDATE_REL,
    sourceSha256: sourceHash,
    part: 'farFoot',
    shoeBox: shoe,
    cutoutBox: box,
    pivotInCutout: { x: shoe.x0 - box.x0 + Math.round((shoe.x1 - shoe.x0) * 0.3), y: shoe.y0 - box.y0 },
    pivotNotes: 'ankle estimate: 30% across the shoe bbox from the heel side, top edge; refine at rig time.',
    telemetry: { ...telemetry, uncoveredJoints: 'deferred-rig-stage' },
    gatesPass,
    cleanupNotes: 'keyStudioMagenta + color-flood shoe extent (white/crimson; stops at skin) + removeSmallOpaqueIslands(8) for keyer specks/micro-dots + 24px pad + 50px shin stub; no manual cleanup. COMPACT-ADJACENCY: box harvester valid only for isolated parts; H07-96 nearFoot needs mask-aware cutout.',
    visualSeamCheck: 'pending-reviewer',
    cutoutPath: CUTOUT_REL,
    cutoutSha256: cutoutHash,
  };
  fs.writeFileSync(path.join(outDir, 'proof01-H01-100-farFoot.json'), JSON.stringify(sidecar, null, 2) + '\n');
  const registryPath = path.join(repoRoot, 'src/images/photoreal-female-pose-bank/proofs.json');
  const registry = fs.existsSync(registryPath) ? (JSON.parse(fs.readFileSync(registryPath, 'utf8')) as unknown[]) : [];
  const next = registry.filter((r) => (r as { proofId?: string }).proofId !== 'proof-01');
  next.push({ proofId: 'proof-01', sourceCandidate: 'H01-100', part: 'farFoot', gatesPass, visualSeamCheck: sidecar.visualSeamCheck });
  fs.writeFileSync(registryPath, JSON.stringify(next, null, 2) + '\n');
}

function main(): void {
  const repoRoot = process.cwd();
  const candidateAbs = path.join(repoRoot, CANDIDATE_REL);
  const img = readImageFile(candidateAbs);
  const keyed = keyStudioMagenta(img);
  const { shoe, box } = locateCutoutBox(img, keyed);
  const cutout = removeSmallOpaqueIslands(crop(keyed, box), 8);
  const telemetry = measureCutoutTelemetry(cutout);
  writeProofOutputs(repoRoot, cutout, shoe, box, telemetry);
  console.log(`box=${JSON.stringify(box)} spill=${telemetry.magentaSpill} islands=${telemetry.detachedIslands} gates=${telemetry.magentaSpill === 0 && telemetry.detachedIslands === 0 ? 'PASS' : 'FAIL'}`);
}

main();
