/**
 * Vertical slice of the revised pipeline (Stages 0-7) for one persona.
 * `npm run persona:run -- <personaDirName> <personaId>`
 * Stages 0-1 (generation) happen out-of-band and are logged in docs/FDS.md#image-prompt-log.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { CalibrationPose, PartExtractSpec, PartMeta, Rgba } from '../src/shared/atlas-types.js';
import { Z_ORDER } from '../src/shared/atlas-types.js';
import { extractPart, lm } from '../src/pipeline/atlas/extract-part.js';
import { loadPng, meanLuminance, savePng } from '../src/pipeline/atlas/image-io.js';
import { relightPart } from '../src/pipeline/atlas/relight.js';
import { refinePose } from '../src/pipeline/atlas/refine-calibration.js';
import { distToSegment } from '../src/pipeline/atlas/extract-part.js';
import {
  FRAME_H,
  FRAME_W,
  GROUND_Y,
  countComponents,
  lowestOpaqueY,
  renderFrame,
  type RigLengths,
  type RigPart,
} from '../src/runner/mini-rig.js';

const personaDir = process.argv[2] ?? 'photoreal-female-masters';
const personaId = process.argv[3] ?? 'photo-sg-chinese-female-masters';
const root = process.cwd();
const imgDir = path.join(root, 'src/images', personaDir);
const calDir = path.join(root, 'src/calibration', personaId);
const outDir = path.join(root, 'public/sprites/photoreal', personaId);
const evidenceDir = path.join(root, 'docs/evidence/masters-cycle-01');

function loadPose(id: string): CalibrationPose {
  return JSON.parse(fs.readFileSync(path.join(calDir, `${id}.json`), 'utf8')) as CalibrationPose;
}

function deriveExtra(pose: CalibrationPose): CalibrationPose {
  const l = pose.landmarks as Record<string, readonly number[]>;
  if (l.neckBase && l.skullTop && !l.skullBase) {
    l.skullBase = [l.neckBase[0] + 2, l.neckBase[1] - 24];
    l.hairPivot = [l.neckBase[0] - 16, l.neckBase[1] - 68];
    l.hairTip = [l.neckBase[0] - 52, l.neckBase[1] - 8];
    l.femoralCut = [l.hip[0] + (l.knee[0] - l.hip[0]) * 0.22, l.hip[1] + (l.knee[1] - l.hip[1]) * 0.22];
  }
  return pose;
}

const REFINE_BONES: Record<string, readonly [string, string][]> = {
  master: [['collar', 'waist'], ['waist', 'hip'], ['hip', 'knee'], ['knee', 'ankle'], ['ankle', 'ball'], ['shoulderNear', 'elbowNear'], ['elbowNear', 'wristNear'], ['wristNear', 'handTipNear'], ['skullBase', 'skullTop'], ['hairPivot', 'hairTip'], ['waist', 'femoralCut']],
  A1: [['hipNear', 'kneeNear'], ['kneeNear', 'ankleNear'], ['ankleNear', 'ballNear'], ['hipFar', 'kneeFar'], ['kneeFar', 'ankleFar'], ['ankleFar', 'ballFar'], ['shoulderNear', 'elbowNear'], ['elbowNear', 'wristNear'], ['wristNear', 'handTipNear'], ['shoulderFar', 'elbowFar'], ['elbowFar', 'wristFar'], ['wristFar', 'handTipFar'], ['neckBase', 'waist']],
  A2: [['hipNear', 'kneeNear'], ['kneeNear', 'ankleNear'], ['ankleNear', 'ballNear'], ['hipFar', 'kneeFar'], ['kneeFar', 'ankleFar'], ['ankleFar', 'ballFar'], ['shoulderNear', 'elbowNear'], ['elbowNear', 'wristNear'], ['wristNear', 'handTipNear'], ['neckBase', 'waist']],
  A3: [['shoulderNear', 'elbowNear'], ['elbowNear', 'wristNear'], ['hipNear', 'kneeNear'], ['kneeNear', 'ankleNear'], ['hipFar', 'kneeFar'], ['kneeFar', 'ankleFar'], ['ankleFar', 'ballFar'], ['neckBase', 'waist']],
};

const MASTER_BONE_FOR_PART: Readonly<Record<string, [string, string]>> = {
  head: ['skullBase', 'skullTop'], neck: ['neckBase', 'skullBase'], hairAccessory: ['hairPivot', 'hairTip'],
  torso: ['collar', 'waist'], pelvis: ['waist', 'femoralCut'],
  nearThigh: ['hip', 'knee'], farThigh: ['hip', 'knee'], nearShin: ['knee', 'ankle'], farShin: ['knee', 'ankle'],
  nearFoot: ['ankle', 'ball'], farFoot: ['ankle', 'ball'],
  nearUpperArm: ['shoulderNear', 'elbowNear'], farUpperArm: ['shoulderNear', 'elbowNear'],
  nearForearm: ['elbowNear', 'wristNear'], farForearm: ['elbowNear', 'wristNear'],
  nearHand: ['wristNear', 'handTipNear'], farHand: ['wristNear', 'handTipNear'],
};

function buildPoses(plates: Record<string, Rgba>): Record<string, CalibrationPose> {
  const out: Record<string, CalibrationPose> = {};
  // TURN-L07: master keeps visually-verified v1 landmarks (refiner v1 drifts to
  // silhouette contours on the master - see stage-learnings L-S2-2); atlas poses refine.
  for (const id of ['master', 'A1', 'A2', 'A3']) {
    const derived = deriveExtra(loadPose(id));
    const refined = id === 'master' ? derived : refinePose(plates[id] ?? plates.master ?? derivedFallback(), derived, REFINE_BONES[id] ?? []);
    fs.writeFileSync(path.join(calDir, `${id}.refined.json`), `${JSON.stringify(refined, null, 2)}\n`);
    out[id] = refined;
  }
  return out;
}

function derivedFallback(): Rgba {
  return { width: 1, height: 1, data: new Uint8ClampedArray(4) };
}

const SPECS: readonly PartExtractSpec[] = [
  { partId: 'head', sourcePose: 'master', proximal: 'skullBase', distal: 'skullTop', canonical: 'down', competeWith: [], radiusFactor: 1.25 },
  { partId: 'neck', sourcePose: 'master', proximal: 'neckBase', distal: 'skullBase', canonical: 'down', competeWith: [['shoulderNear', 'elbowNear']], radiusFactor: 1.1 },
  { partId: 'hairAccessory', sourcePose: 'master', proximal: 'hairPivot', distal: 'hairTip', canonical: 'down', competeWith: [['neckBase', 'skullTop']], radiusFactor: 1.2 },
  { partId: 'torso', sourcePose: 'master', proximal: 'collar', distal: 'waist', canonical: 'down', competeWith: [['shoulderNear', 'elbowNear'], ['hip', 'knee']], radiusFactor: 1.6 },
  { partId: 'pelvis', sourcePose: 'master', proximal: 'waist', distal: 'femoralCut', canonical: 'down', competeWith: [['hip', 'knee']], radiusFactor: 1.5 },
  { partId: 'nearThigh', sourcePose: 'A2', proximal: 'hipNear', distal: 'kneeNear', canonical: 'down', competeWith: [['hipFar', 'kneeFar'], ['neckBase', 'waist']], radiusFactor: 1.15 },
  { partId: 'nearShin', sourcePose: 'A2', proximal: 'kneeNear', distal: 'ankleNear', canonical: 'down', competeWith: [['kneeFar', 'ankleFar']], radiusFactor: 1.05 },
  { partId: 'nearFoot', sourcePose: 'A2', proximal: 'ankleNear', distal: 'ballNear', canonical: 'down', competeWith: [['ankleFar', 'ballFar'], ['kneeNear', 'ankleNear']], radiusFactor: 1.2 },
  { partId: 'farThigh', sourcePose: 'A1', proximal: 'hipFar', distal: 'kneeFar', canonical: 'down', competeWith: [['hipNear', 'kneeNear'], ['neckBase', 'waist']], radiusFactor: 1.15 },
  { partId: 'farShin', sourcePose: 'A1', proximal: 'kneeFar', distal: 'ankleFar', canonical: 'down', competeWith: [['kneeNear', 'ankleNear']], radiusFactor: 1.05 },
  { partId: 'farFoot', sourcePose: 'A1', proximal: 'ankleFar', distal: 'ballFar', canonical: 'down', competeWith: [['ankleNear', 'ballNear'], ['kneeFar', 'ankleFar']], radiusFactor: 1.2 },
  { partId: 'nearUpperArm', sourcePose: 'A3', proximal: 'shoulderNear', distal: 'elbowNear', canonical: 'down', competeWith: [['neckBase', 'waist'], ['hipNear', 'kneeNear']], radiusFactor: 1.0 },
  { partId: 'nearForearm', sourcePose: 'A1', proximal: 'elbowNear', distal: 'wristNear', canonical: 'down', competeWith: [['elbowFar', 'wristFar'], ['neckBase', 'waist']], radiusFactor: 1.0 },
  { partId: 'nearHand', sourcePose: 'A1', proximal: 'wristNear', distal: 'handTipNear', canonical: 'down', competeWith: [['elbowNear', 'wristNear'], ['waist', 'hip'], ['hip', 'knee']], radiusFactor: 1.3 },
  { partId: 'farUpperArm', sourcePose: 'A1', proximal: 'shoulderFar', distal: 'elbowFar', canonical: 'down', competeWith: [['neckBase', 'waist'], ['shoulderNear', 'elbowNear']], radiusFactor: 1.0 },
  { partId: 'farForearm', sourcePose: 'A1', proximal: 'elbowFar', distal: 'wristFar', canonical: 'down', competeWith: [['elbowNear', 'wristNear'], ['neckBase', 'waist']], radiusFactor: 1.0 },
  { partId: 'farHand', sourcePose: 'A1', proximal: 'wristFar', distal: 'handTipFar', canonical: 'down', competeWith: [['elbowFar', 'wristFar'], ['waist', 'hip'], ['hip', 'knee']], radiusFactor: 1.3 },
];

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function filePlates(): { path: string; sha256: string; role: string }[] {
  const manifestPath = path.join(root, 'src/images/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { assets: { path: string }[] };
  const roles: Record<string, string> = {
    '01-master-lateral-profile-reference.png': 'persona-master',
    '02-atlas-A1-contact-right.png': 'persona-atlas-A1',
    '03-atlas-A2-flight-pass.png': 'persona-atlas-A2',
    '04-atlas-A3-recovery-high.png': 'persona-atlas-A3',
  };
  const added: { path: string; sha256: string; role: string }[] = [];
  for (const [file, role] of Object.entries(roles)) {
    const rel = `src/images/${personaDir}/${file}`;
    if (manifest.assets.some((a) => a.path === rel)) continue;
    const entry = { path: rel, sha256: sha256(path.join(root, rel)), role };
    (manifest.assets as unknown[]).push({ ...entry, filedIn: 'ADD-007', provenance: `generate_image 2026-10-18 persona ${personaId}` });
    added.push(entry);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return added;
}

function measureLengthsFrom(source: CalibrationPose, scale: number): RigLengths {
  const d = (a: string, b: string): number => Math.max(6, Math.round((() => {
    const p = lm(source, a);
    const q = lm(source, b);
    return Math.hypot(p.x - q.x, p.y - q.y);
  })() * scale));
  return {
    torso: d('collar', 'waist'),
    neck: d('neckBase', 'skullBase'),
    head: d('skullBase', 'skullTop'),
    thigh: d('hip', 'knee'),
    shin: d('knee', 'ankle'),
    foot: Math.round(d('ankle', 'ball') * 1.6),
    upperArm: d('shoulderNear', 'elbowNear'),
    forearm: d('elbowNear', 'wristNear'),
    hand: d('wristNear', 'handTipNear'),
  };
}

interface RunInputs {
  masterPlate: Rgba;
  plates: Record<string, Rgba>;
  poses: Record<string, CalibrationPose>;
  master: CalibrationPose;
  masterRefined: CalibrationPose;
  scale: number;
  lengths: RigLengths;
  plateFiles: Record<string, string>;
}

function loadInputs(): RunInputs {
  const masterPlate = loadPng(path.join(imgDir, '01-master-lateral-profile-reference.png'));
  const master = deriveExtra(loadPose('master'));
  const sole = lm(master, 'sole');
  const skullTop = lm(master, 'skullTop');
  const scale = 195 / (sole.y - skullTop.y);
  const plateFiles: Record<string, string> = {
    master: '01-master-lateral-profile-reference.png',
    A1: '02-atlas-A1-contact-right.png',
    A2: '03-atlas-A2-flight-pass.png',
    A3: '04-atlas-A3-recovery-high.png',
  };
  const plates: Record<string, Rgba> = { master: masterPlate };
  for (const id of ['A1', 'A2', 'A3']) plates[id] = loadPng(path.join(imgDir, plateFiles[id] ?? ''));
  const poses = buildPoses(plates);
  const masterRefined = poses.master ?? master;
  return { masterPlate, plates, poses, master, masterRefined, scale, lengths: measureLengthsFrom(master, scale), plateFiles };
}

function relightTargetFor(inputs: RunInputs): (partId: string) => number {
  return (partId: string): number => {
    const bone = MASTER_BONE_FOR_PART[partId];
    if (!bone) return 140;
    const a = lm(inputs.masterRefined, bone[0]);
    const b = lm(inputs.masterRefined, bone[1]);
    return meanLuminance(inputs.masterPlate, (x, y) => distToSegment({ x, y }, a, b) < 26 && !isBackdrop(inputs.masterPlate, x, y));
  };
}

function extractAll(inputs: RunInputs): { rigParts: RigPart[]; partReport: Record<string, unknown>[] } {
  const targetFor = relightTargetFor(inputs);
  const rigParts: RigPart[] = [];
  const partReport: Record<string, unknown>[] = [];
  for (const spec of SPECS) {
    const pose = inputs.poses[spec.sourcePose] ?? inputs.masterRefined;
    const result = extractPart(inputs.plates[spec.sourcePose] ?? inputs.masterPlate, pose, spec, inputs.scale, Z_ORDER[spec.partId] ?? 10);
    const relight = relightPart(result.part, targetFor(spec.partId));
    const meta: PartMeta = { ...result.meta, relightScale: relight };
    savePng(path.join(outDir, 'parts', `${spec.partId}.png`), result.part);
    rigParts.push({ img: result.part, meta });
    partReport.push({ partId: spec.partId, sourcePose: spec.sourcePose, keptRatio: Number(result.keptRatio.toFixed(3)), relightScale: relight, restLength: meta.restLength, halfWidth: meta.halfWidth });
  }
  fs.writeFileSync(path.join(outDir, 'parts-meta.json'), `${JSON.stringify(partReport, null, 2)}\n`);
  return { rigParts, partReport };
}

function renderCycle(rigParts: readonly RigPart[], lengths: RigLengths): { frames: Rgba[]; audit: Record<string, unknown>[]; contact: Rgba } {
  const audit: Record<string, unknown>[] = [];
  const frames: Rgba[] = [];
  for (let f = 0; f < 16; f++) {
    const fb = shiftToGround(renderFrame(rigParts as RigPart[], lengths, f / 16));
    frames.push(fb);
    savePng(path.join(outDir, 'cycle', `frame-${String(f + 1).padStart(2, '0')}.png`), fb);
    const lowest = lowestOpaqueY(fb);
    audit.push({ frame: f + 1, phase: Number((f / 16).toFixed(4)), opaqueComponents: countComponents(fb), lowestFootY: lowest, groundLineDeltaPx: lowest - GROUND_Y });
  }
  const contact: Rgba = { width: FRAME_W * 4, height: FRAME_H * 4, data: new Uint8ClampedArray(FRAME_W * 4 * FRAME_H * 4 * 4) };
  frames.forEach((fb, i) => {
    const cx = (i % 4) * FRAME_W;
    const cy = Math.floor(i / 4) * FRAME_H;
    for (let y = 0; y < FRAME_H; y++) {
      for (let x = 0; x < FRAME_W; x++) {
        const s = (y * FRAME_W + x) * 4;
        const d = ((cy + y) * contact.width + cx + x) * 4;
        contact.data[d] = fb.data[s] ?? 0;
        contact.data[d + 1] = fb.data[s + 1] ?? 0;
        contact.data[d + 2] = fb.data[s + 2] ?? 0;
        contact.data[d + 3] = fb.data[s + 3] ?? 0;
      }
    }
  });
  return { frames, audit, contact };
}

function publishOutputs(inputs: RunInputs, partReport: Record<string, unknown>[], audit: Record<string, unknown>[], contact: Rgba): void {
  fs.mkdirSync(evidenceDir, { recursive: true });
  savePng(path.join(evidenceDir, 'contact-16frame.png'), contact);
  fs.writeFileSync(path.join(evidenceDir, 'audit-report.json'), `${JSON.stringify({ run: 'masters-cycle-01', personaId, scale: Number(inputs.scale.toFixed(4)), lengths: inputs.lengths, frames: audit }, null, 2)}\n`);
  const sumFiles = ['contact-16frame.png', 'audit-report.json', 'stage-learnings.json'];
  for (const plate of Object.values(inputs.plateFiles)) sumFiles.push(`../../src/images/${personaDir}/${plate}`);
  const sums = sumFiles
    .filter((f) => fs.existsSync(path.join(evidenceDir, f)))
    .map((f) => `${sha256(path.join(evidenceDir, f))}  ${f}`)
    .join('\n');
  fs.writeFileSync(path.join(evidenceDir, 'SHA256SUMS'), `${sums}\n`);
  const manifest = {
    personaId,
    runId: 'masters-cycle-01',
    scale: Number(inputs.scale.toFixed(4)),
    lengths: inputs.lengths,
    plates: Object.entries(inputs.plateFiles).map(([poseId, file]) => ({
      poseId,
      src: `/repo-assets/src-images/${personaDir}/${file}`,
      landmarks: inputs.poses[poseId]?.landmarks ?? {},
      landmarksV1: loadPose(poseId).landmarks,
    })),
    parts: partReport.map((p) => ({ ...p, src: `/sprites/photoreal/${personaId}/parts/${String(p.partId)}.png` })),
    cycle: {
      frames: Array.from({ length: 16 }, (_, i) => `/sprites/photoreal/${personaId}/cycle/frame-${String(i + 1).padStart(2, '0')}.png`),
      contact: '/repo-assets/evidence/masters-cycle-01/contact-16frame.png',
      audit,
    },
    learningsUrl: '/repo-assets/evidence/masters-cycle-01/stage-learnings.json',
  };
  fs.writeFileSync(path.join(outDir, 'stage-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function main(): void {
  const filed = filePlates();
  const inputs = loadInputs();
  const { rigParts, partReport } = extractAll(inputs);
  const { audit, contact } = renderCycle(rigParts, inputs.lengths);
  publishOutputs(inputs, partReport, audit, contact);
  console.log(JSON.stringify({ filed: filed.map((f) => f.path), scale: Number(inputs.scale.toFixed(4)), lengths: inputs.lengths, parts: partReport.length, audit: audit.slice(0, 4) }, null, 2));
}

/** MVP vertical registration: lower foot sole on the ground line; ballistic flight deferred to Stage 6. */
function shiftToGround(fb: Rgba): Rgba {
  const lowest = lowestOpaqueY(fb);
  const dy = lowest < 0 ? 0 : GROUND_Y - lowest;
  const out = { width: fb.width, height: fb.height, data: new Uint8ClampedArray(fb.data.length) };
  for (let y = 0; y < fb.height; y++) {
    const sy = y - dy;
    if (sy < 0 || sy > fb.height - 1) continue;
    for (let x = 0; x < fb.width; x++) {
      const s = (sy * fb.width + x) * 4;
      const d = (y * fb.width + x) * 4;
      out.data[d] = fb.data[s] ?? 0;
      out.data[d + 1] = fb.data[s + 1] ?? 0;
      out.data[d + 2] = fb.data[s + 2] ?? 0;
      out.data[d + 3] = fb.data[s + 3] ?? 0;
    }
  }
  return out;
}

function isBackdrop(img: Rgba, x: number, y: number): boolean {
  const i = (y * img.width + x) * 4;
  const r = img.data[i] ?? 0;
  const g = img.data[i + 1] ?? 0;
  const b = img.data[i + 2] ?? 0;
  return r > 150 && b > 150 && g < 120 && r - g > 60 && b - g > 60;
}

main();
