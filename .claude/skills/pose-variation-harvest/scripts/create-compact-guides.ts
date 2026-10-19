import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../../../src/runner/body-proportions.js';
import { solveArticulatedPose } from '../../../src/runner/gait.js';
import { writePngFile } from '../../../src/pipeline/image-io.js';
import { renderPoseGuideRaster } from '../../../src/pipeline/pose-guide-renderer.js';

/**
 * Repeatable helper for Section 5 — create compact toe-off + insert guides.
 * Mirrors scripts/create-custom-h03-v2-guide.ts but lives inside the skill for portability.
 * Usage: npx tsx .claude/skills/pose-variation-harvest/scripts/create-compact-guides.ts
 */
const OUT_V2 = 'src/images/photoreal-female-pose-bank/guides/skeleton/H03-v2-compact-toeoff-guide.png';
const OUT_H06 = 'src/images/photoreal-female-pose-bank/guides/skeleton/H06-v2-left-down-guide.png';
const OUT_H07 = 'src/images/photoreal-female-pose-bank/guides/skeleton/H07-v2-compact-toeoff-guide.png';
const OUT_X07 = 'src/images/photoreal-female-pose-bank/guides/skeleton/inserts/X07-far-forearm-low-forward-guide.png';

const compactGait = { ...DEFAULT_GAIT_CONFIG, strideLengthScale: 0.62, kneeDriveScale: 0.68, armSwingScale: 0.85, forwardLeanDeg: 18, bounceAmplitudeScale: 0.5 };
const deeperGait = { ...DEFAULT_GAIT_CONFIG, strideLengthScale: 0.75, kneeDriveScale: 0.85, forwardLeanDeg: 20, bounceAmplitudeScale: 0.65 };

function ensureDir(p: string) { fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true }); }

const poseH03 = solveArticulatedPose(0.25, compactGait, DEFAULT_RIG_SPEC);
ensureDir(OUT_V2); writePngFile(OUT_V2, renderPoseGuideRaster(poseH03, DEFAULT_RIG_SPEC, { width: 1408, height: 768 }));
console.log(`[pose-variation-harvest] Wrote ${OUT_V2}`);

const poseH06 = solveArticulatedPose(0.625, deeperGait, DEFAULT_RIG_SPEC);
ensureDir(OUT_H06); writePngFile(OUT_H06, renderPoseGuideRaster(poseH06, DEFAULT_RIG_SPEC, { width: 1408, height: 768 }));
console.log(`[pose-variation-harvest] Wrote ${OUT_H06}`);

const poseH07 = solveArticulatedPose(0.75, compactGait, DEFAULT_RIG_SPEC);
ensureDir(OUT_H07); writePngFile(OUT_H07, renderPoseGuideRaster(poseH07, DEFAULT_RIG_SPEC, { width: 1408, height: 768 }));
console.log(`[pose-variation-harvest] Wrote ${OUT_H07}`);

// X07: H02 body + far arm +20° low-forward
type Pt = { x: number; y: number };
function proj(pt: Pt, a: number, l: number): Pt { return { x: pt.x + Math.cos(a) * l, y: pt.y + Math.sin(a) * l }; }
const poseH02 = solveArticulatedPose(0.125, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
const sh = poseH02.farArm.hipOrShoulder;
const upA = (-10 * Math.PI) / 180, loA = (20 * Math.PI) / 180;
const mid = proj(sh, upA, DEFAULT_RIG_SPEC.upperArmLength);
const wrist = proj(mid, loA, DEFAULT_RIG_SPEC.forearmLength);
const tip = proj(wrist, loA, 6);
const farArm = { hipOrShoulder: sh, midJoint: mid, endEffector: wrist, heelPoint: wrist, ballPoint: tip, tipPoint: tip, upperAngleRad: upA, lowerAngleRad: loA, distalAngleRad: loA, toeAngleRad: loA, heelLiftPx: 0, contactPhase: 'flight-reach' as const, isGrounded: false };
const poseX07: any = { ...poseH02, farArm };
ensureDir(OUT_X07); writePngFile(OUT_X07, renderPoseGuideRaster(poseX07, DEFAULT_RIG_SPEC, { width: 1408, height: 768 }));
console.log(`[pose-variation-harvest] Wrote ${OUT_X07}`);

const manifest = path.resolve('src/images/photoreal-female-pose-bank/guides/skeleton/custom-guides-manifest.json');
fs.writeFileSync(manifest, JSON.stringify({ generatedAt: new Date().toISOString(), guides: [{ id: 'H03-v2', path: OUT_V2 }, { id: 'H06-v2', path: OUT_H06 }, { id: 'H07-v2', path: OUT_H07 }, { id: 'X07', path: OUT_X07 }] }, null, 2));
console.log(`[pose-variation-harvest] Manifest ${manifest}`);
