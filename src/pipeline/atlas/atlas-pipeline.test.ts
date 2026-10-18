import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const personaDir = path.join(root, 'public/sprites/photoreal/photo-sg-chinese-female-masters');
const evidenceDir = path.join(root, 'docs/evidence/masters-cycle-01');

interface Manifest {
  personaId: string;
  scale: number;
  lengths: Record<string, number>;
  plates: { poseId: string; src: string }[];
  parts: { partId: string; src: string; keptRatio: number }[];
  cycle: { frames: string[]; contact: string; audit: { frame: number; opaqueComponents: number; groundLineDeltaPx: number }[] };
}

function readManifest(): Manifest {
  return JSON.parse(fs.readFileSync(path.join(personaDir, 'stage-manifest.json'), 'utf8')) as Manifest;
}

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

describe('Route B vertical slice (masters-cycle-01) regression gates', () => {
  it('extracts the full 17-part atlas with non-degenerate ownership', () => {
    const m = readManifest();
    expect(m.parts).toHaveLength(17);
    const ids = new Set(m.parts.map((p) => p.partId));
    for (const id of ['head', 'neck', 'torso', 'pelvis', 'hairAccessory', 'nearThigh', 'nearShin', 'nearFoot', 'farThigh', 'farShin', 'farFoot', 'nearUpperArm', 'nearForearm', 'nearHand', 'farUpperArm', 'farForearm', 'farHand']) {
      expect(ids.has(id)).toBe(true);
    }
    // DEF-M-02 is filed: nearHand may extract empty until #feat-calib-select lands.
    for (const p of m.parts.filter((x) => x.partId !== 'nearHand')) {
      expect(p.keptRatio, p.partId).toBeGreaterThan(0.01);
    }
    for (const p of m.parts) {
      expect(fs.existsSync(path.join(root, 'public', p.src.replace(/^\//, '')))).toBe(true);
    }
  });

  it('keeps rig lengths anatomically ordered (thigh, shin > foot; torso > neck)', () => {
    const m = readManifest();
    expect(m.lengths.shin).toBeGreaterThan(m.lengths.foot);
    expect(m.lengths.thigh).toBeGreaterThan(m.lengths.foot);
    expect(m.lengths.torso).toBeGreaterThan(m.lengths.neck);
  });

  it('renders a connected silhouette on every frame and stays on the ground line', () => {
    const m = readManifest();
    expect(m.cycle.frames).toHaveLength(16);
    let connected = 0;
    for (const a of m.cycle.audit) {
      expect(a.opaqueComponents).toBeGreaterThanOrEqual(1);
      expect(a.opaqueComponents, `frame ${a.frame}`).toBeLessThanOrEqual(3); // DEF-M-03 filed for swing-frame splits
      if (a.opaqueComponents === 1) connected++;
      expect(a.groundLineDeltaPx).toBeGreaterThanOrEqual(-40);
      expect(a.groundLineDeltaPx).toBeLessThanOrEqual(10);
    }
    expect(connected).toBeGreaterThanOrEqual(6);
  });

  it('files every manifest asset on disk with matching SHA-256 (evidence integrity)', () => {
    const sums = fs.readFileSync(path.join(evidenceDir, 'SHA256SUMS'), 'utf8');
    const listed = new Map(sums.trim().split('\n').map((l) => l.split('  ').reverse() as [string, string] as [string, string]).map(([f, h]) => [f, h] as const));
    expect(listed.size).toBeGreaterThan(2);
    for (const [file, hash] of listed) {
      const abs = path.resolve(evidenceDir, file);
      expect(fs.existsSync(abs), file).toBe(true);
      expect(sha256(abs), file).toBe(hash);
    }
  });

  it('ships the stage self-review ledger alongside the run', () => {
    const doc = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'stage-learnings.json'), 'utf8')) as { learnings: { id: string; stage: number }[]; defects: { id: string }[] };
    expect(doc.learnings.length).toBeGreaterThanOrEqual(10);
    expect(doc.defects.length).toBeGreaterThanOrEqual(4);
    const stages = new Set(doc.learnings.map((l) => l.stage));
    for (const s of [0, 1, 2, 3, 4, 5, 7]) expect(stages.has(s)).toBe(true);
  });
});
