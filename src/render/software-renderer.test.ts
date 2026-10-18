import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { buildCapsuleChainMesh, makeSyntheticTexture } from './mesh-factory.js';
import {
  countOpaqueComponents,
  countOpaquePixels,
  createFramebuffer,
  renderMesh,
  type Framebuffer,
  type RenderSpec,
} from './software-renderer.js';

const FRAME_W = 160;
const FRAME_H = 200;
const POSES: readonly (readonly number[])[] = [
  [0.0, 0.0],
  [0.35, -0.7],
  [0.6, -1.5],
  [0.2, -2.2],
  [-0.3, -1.6],
  [-0.6, -0.9],
  [-0.35, -0.3],
  [0.15, -0.5],
];

function specFor(boneAngles: readonly number[]): RenderSpec {
  return {
    width: FRAME_W,
    height: FRAME_H,
    boneAngles,
    boneLengths: [40, 38],
    origin: { x: 0, y: 42, z: 0 },
    lightDir: { x: 0.3, y: 0.8, z: 1 },
    pixelsPerUnit: 2,
  };
}

function renderPose(boneAngles: readonly number[]): { fb: Framebuffer; ms: number } {
  const mesh = buildCapsuleChainMesh([
    { radius: 7, length: 40, radialSegments: 14, rings: 10 },
    { radius: 5, length: 38, radialSegments: 12, rings: 10 },
  ]);
  const tex = makeSyntheticTexture(128, 256);
  const fb = createFramebuffer(FRAME_W, FRAME_H);
  const started = process.hrtime.bigint();
  renderMesh(mesh, tex, specFor(boneAngles), fb);
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { fb, ms };
}

function blit(fb: Framebuffer, png: PNG, col: number, row: number): void {
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const s = (y * FRAME_W + x) * 4;
      const d = ((row * FRAME_H + y) * (FRAME_W * 4) + (col * FRAME_W + x)) * 4;
      png.data[d] = fb.color[s] ?? 0;
      png.data[d + 1] = fb.color[s + 1] ?? 0;
      png.data[d + 2] = fb.color[s + 2] ?? 0;
      png.data[d + 3] = fb.color[s + 3] ?? 0;
    }
  }
}

describe('Route B proof-of-concept: pure-TS skinned software renderer', () => {
  const evidenceDir = path.join(process.cwd(), 'docs/evidence/poc-software-render');

  it('renders an 8-pose skinned cycle deterministically and commits the evidence pack', () => {
    const mesh = buildCapsuleChainMesh([
      { radius: 7, length: 40, radialSegments: 14, rings: 10 },
      { radius: 5, length: 38, radialSegments: 12, rings: 10 },
    ]);
    expect(mesh.positions.length / 3).toBeGreaterThan(100);
    expect(mesh.indices.length / 3).toBeGreaterThan(100);

    const report: Record<string, unknown>[] = [];
    const png = new PNG({ width: FRAME_W * 4, height: FRAME_H * 2 });
    png.data.fill(0);
    POSES.forEach((pose, i) => {
      const { fb, ms } = renderPose(pose);
      const digest = crypto.createHash('sha256').update(fb.color).digest('hex');
      const again = renderPose(pose);
      expect(crypto.createHash('sha256').update(again.fb.color).digest('hex')).toBe(digest);
      expect(ms).toBeLessThan(500);
      const opaque = countOpaquePixels(fb);
      const components = countOpaqueComponents(fb);
      expect(opaque).toBeGreaterThan(1500);
      expect(components, `pose ${i} silhouette split into ${components} components (joint gap)`).toBe(1);
      report.push({ pose: i, boneAngles: pose, opaquePixels: opaque, opaqueComponents: components, renderMs: Number(ms.toFixed(2)), frameSha256: digest });
      blit(fb, png, i % 4, Math.floor(i / 4));
    });

    const opaqueCounts = report.map((r) => r.opaquePixels as number);
    const spread = (Math.max(...opaqueCounts) - Math.min(...opaqueCounts)) / Math.max(...opaqueCounts);

    fs.mkdirSync(evidenceDir, { recursive: true });
    const contactPath = path.join(evidenceDir, 'contact-8pose.png');
    fs.writeFileSync(contactPath, PNG.sync.write(png));
    const reportJson = JSON.stringify(
      {
        run: 'poc-software-render',
        date: '2026-10-18',
        branch: 'arena/62955c1e-super-duper-funicular',
        purpose: 'Derisk Route B (PIPELINE_REVISION_PROPOSAL §11): deterministic pure-TS skinned orthographic rasterisation of a UV-textured capsule chain at sprite scale.',
        mesh: { vertices: mesh.positions.length / 3, triangles: mesh.indices.length / 3 },
        frames: report,
        opaqueSpreadRatioInfoOnly: Number(spread.toFixed(4)),
      },
      null,
      2,
    );
    fs.writeFileSync(path.join(evidenceDir, 'poc-report.json'), `${reportJson}\n`);
    const sums = [` ${path.basename(contactPath)}`, ` ${'poc-report.json'}`]
      .map((rel) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(evidenceDir, rel.trim()))).digest('hex')}  ${rel.trim()}`)
      .join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'SHA256SUMS'), `${sums}\n`);
  });
});
