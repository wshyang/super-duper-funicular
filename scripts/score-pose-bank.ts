import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { solveArticulatedPose } from '../src/runner/gait.js';
import { readImageFile } from '../src/pipeline/image-io.js';
import {
  evaluateKeyGate,
  findLowestFigureEdge,
  measureBackgroundUniformity,
  measureFloorShadow,
  measureSoleEdgeContrast,
} from '../src/pipeline/pose-key-metrics.js';
import {
  checkDuplicateAgainstAccepted,
  checkPoseCompliance,
  elbowBin,
  kneeBin,
  observationFromSolvedPose,
  poseAngularDistance,
  type MajorJointKey,
  type PoseAnnotation,
  type PoseObservation,
} from '../src/pipeline/pose-diversity.js';
import {
  evaluateHarvestEligibility,
  type ChiralityTier,
  type CropVerdict,
  type VisibilityScore,
} from '../src/pipeline/pose-bank-pipeline.js';

const SPINE_PHASES: Record<string, number> = {
  H01: 0,
  H02: 0.125,
  H03: 0.25,
  H04: 0.375,
  H05: 0.5,
  H06: 0.625,
  H07: 0.75,
  H08: 0.875,
};

interface ScoredAnnotationFileEntry {
  observed: PoseObservation;
  frameKey: string;
  callId: string;
  candidatePath: string;
  targetOverride?: PoseObservation;
  targetedJoints?: MajorJointKey[];
  chiralityTier: ChiralityTier;
  costumeClean: boolean;
  visibility: Record<string, VisibilityScore>;
  candidateId: string;
}

const FOOT_REGION_PARTS = new Set(['nearFoot', 'farFoot']);

function targetFor(entry: ScoredAnnotationFileEntry): PoseObservation {
  if (entry.targetOverride) return entry.targetOverride;
  const phase = SPINE_PHASES[entry.frameKey];
  if (phase === undefined) throw new Error(`No solver phase for frame ${entry.frameKey}; supply targetOverride.`);
  return observationFromSolvedPose(solveArticulatedPose(phase, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC));
}

interface HarvestRecord {
  part: string;
  candidateId: string;
  verdict: CropVerdict;
  bin: string;
}

interface ScoreContext {
  entries: ScoredAnnotationFileEntry[];
  accepted: PoseAnnotation[];
  spineBest: Map<string, string>;
  harvestable: HarvestRecord[];
}

function buildAnnotated(entry: ScoredAnnotationFileEntry, observed: PoseObservation): PoseAnnotation {
  return {
    ...observed,
    candidateId: entry.candidateId,
    candidatePath: entry.candidatePath,
    annotatedBy: 'score-pose-bank/annotations.json',
    annotatedAt: new Date().toISOString(),
    confidence: 'by-eye',
  };
}

function resolvePoseVerdict(entry: ScoredAnnotationFileEntry, observed: PoseObservation, ctx: ScoreContext): { pose: string; compliance: string; dupNote: string } {
  const compliance = checkPoseCompliance(observed, targetFor(entry), entry.targetedJoints);
  const dup = checkDuplicateAgainstAccepted(observed, ctx.accepted);
  let pose: string = compliance.verdict;
  if (compliance.verdict === 'pass' && dup.duplicate) {
    // Same-pose resubmission for a strictly better costume/key variant
    // supersedes rather than duplicates (e.g. X02 #87 fixes #84's wristband).
    const priorEntry = ctx.entries.find((e) => e.candidateId === dup.closestCandidateId);
    const sameFrame = priorEntry?.frameKey === entry.frameKey;
    const costumeImproved = priorEntry && !priorEntry.costumeClean && entry.costumeClean;
    pose = sameFrame && costumeImproved ? `pass(supersedes ${dup.closestCandidateId})` : 'rejected(duplicate)';
  }
  if (pose === 'pass' || pose.startsWith('pass(')) ctx.accepted.push(buildAnnotated(entry, observed));
  else void poseAngularDistance;
  return { pose, compliance: compliance.reason, dupNote: dup.duplicate ? dup.reason : `ok (${dup.reason})` };
}

function scoreCropParts(entry: ScoredAnnotationFileEntry, observed: PoseObservation, pose: string, keyPass: boolean, upperKeyClean: boolean): string[] {
  const cropByPart: string[] = [];
  const frameStatus = pose === 'pass' || pose.startsWith('pass(') ? 'accepted' : 'conditional';
  for (const [part, visibility] of Object.entries(entry.visibility)) {
    const regionKeyPassed = FOOT_REGION_PARTS.has(part) ? keyPass : upperKeyClean;
    const eligibility = evaluateHarvestEligibility({
      visibility, keyGatePassed: regionKeyPassed, chiralityTier: entry.chiralityTier,
      costumeClean: entry.costumeClean, frameStatus,
    });
    if (eligibility.verdict !== 'not-harvestable') {
      const isArm = part.toLowerCase().includes('arm') || part.toLowerCase().includes('hand');
      const drivingJoint = part.startsWith('near')
        ? (isArm ? observed.nearElbowDeg : observed.nearKneeDeg)
        : (isArm ? observed.farElbowDeg : observed.farKneeDeg);
      const bin = isArm ? elbowBin(drivingJoint)
        : part === 'head' || part === 'torso' || part === 'neck' || part === 'pelvis' || part === 'hairAccessory'
          ? 'midline' : kneeBin(drivingJoint);
      scoreCtx().harvestable.push({ part, candidateId: entry.candidateId, verdict: eligibility.verdict, bin });
    }
    cropByPart.push(`${part}:${visibility}/${eligibility.verdict.replace('harvestable-', '').replace('not-harvestable', 'no')}`);
  }
  return cropByPart;
}

let CTX: ScoreContext | null = null;
function scoreCtx(): ScoreContext {
  if (!CTX) throw new Error('score context not initialised');
  return CTX;
}

function scoreOneCandidate(entry: ScoredAnnotationFileEntry): void {
  const ctx = scoreCtx();
  const observed: PoseObservation = { ...entry.observed };
  const { pose, compliance, dupNote } = resolvePoseVerdict(entry, observed, ctx);
  const raster = readImageFile(path.resolve(entry.candidatePath));
  const uni = measureBackgroundUniformity(raster);
  const shadow = measureFloorShadow(raster);
  const frameType = observed.nearFootState === 'contact' || observed.farFootState === 'contact' ? 'contact' : 'flight';
  let soleEdge;
  if (frameType === 'contact') {
    const edge = findLowestFigureEdge(raster);
    if (edge) soleEdge = measureSoleEdgeContrast(raster, edge.soleX, 45, edge.soleBottomY - 60, edge.soleBottomY + 4);
  }
  const key = evaluateKeyGate(uni, shadow, frameType, soleEdge);
  const cropByPart = scoreCropParts(entry, observed, pose, key.pass, uni.stdDev < 8);
  const keyShort = key.pass ? 'key-PASS' : `key-FAIL[${key.failures.join('; ')}]`;
  console.log(
    `${pose.toUpperCase().padEnd(19)} ${entry.candidateId.padEnd(10)} ${entry.callId.padEnd(4)} ` +
      `${compliance} | dup: ${dupNote}\n` +
      `                     ${keyShort} bgStd=${uni.stdDev} shadow=${shadow.pixelCount} dip=${shadow.maxDip} contact=${shadow.contactPixelCount}` +
      (soleEdge ? ` soleEdge=${soleEdge.contrast}` : '') +
      `\n                     CROP[${entry.chiralityTier}/${entry.costumeClean ? 'costume-ok' : 'COSTUME-DRIFT'}]: ${cropByPart.join(' ')}`,
  );
  if (SPINE_PHASES[entry.frameKey] !== undefined) {
    const rank = (v: string) => (v === 'pass' || v.startsWith('pass(') ? 0 : v === 'deviated' ? 1 : 2);
    const prev = ctx.spineBest.get(entry.frameKey);
    if (prev === undefined || rank(pose) < rank(prev)) ctx.spineBest.set(entry.frameKey, pose);
  }
}

function printRollup(spineBest: Map<string, string>, harvestable: HarvestRecord[]): void {
  console.log('\n--- SC-AC-08 phase spine (best POSE verdict per frame) ---');
  for (const frame of Object.keys(SPINE_PHASES)) console.log(`  ${frame}: ${spineBest.get(frame) ?? 'no candidate'}`);
  const isPass = (v: string) => v === 'pass' || v.startsWith('pass(');
  const spinePass = Object.keys(SPINE_PHASES).filter((f) => isPass(spineBest.get(f) ?? '')).length;
  console.log('\n--- SC-AC-07 coverage (harvestable sources per part) ---');
  const byPart = new Map<string, { count: number; bins: Set<string>; tiers: Set<string> }>();
  for (const h of harvestable) {
    const slot = byPart.get(h.part) ?? { count: 0, bins: new Set<string>(), tiers: new Set<string>() };
    slot.count++;
    slot.bins.add(h.bin);
    slot.tiers.add(h.verdict === 'harvestable-side-specific' ? 'side' : 'shape');
    byPart.set(h.part, slot);
  }
  for (const [part, slot] of [...byPart.entries()].sort()) {
    console.log(`  ${part}: ${slot.count} source(s), bins=[${[...slot.bins].join(',')}], tiers=[${[...slot.tiers].join(',')}]`);
  }
  const articulation = ['nearUpperArm', 'farUpperArm', 'nearForearm', 'farForearm', 'nearHand', 'farHand', 'nearThigh', 'farThigh', 'nearShin', 'farShin', 'nearFoot', 'farFoot'];
  const twoBin = articulation.filter((x) => (byPart.get(x)?.bins.size ?? 0) >= 2).length;
  const side = harvestable.filter((h) => h.verdict === 'harvestable-side-specific').length;
  console.log('\n--- Definition of working (SC-AC) ---');
  console.log(`  [${spinePass}/8] spine POSE-pass (SC-AC-08)`);
  console.log(`  [${byPart.size}/17] parts with >=1 harvestable source; [${twoBin}/12] articulation parts x2 angle bins (SC-AC-07)`);
  console.log(`  [${side}/${harvestable.length}] side-specific sources (need >=50%)`);
  console.log(`  [${countProofs()}] end-to-end SC-AC-09 proofs`);
}

function countProofs(): number {
  const proofsPath = path.join(process.cwd(), 'src/images/photoreal-female-pose-bank/proofs.json');
  if (!fs.existsSync(proofsPath)) return 0;
  const proofs = JSON.parse(fs.readFileSync(proofsPath, 'utf8')) as Array<{ gatesPass?: boolean; visualSeamCheck?: string }>;
  return proofs.filter((r) => r.gatesPass === true && typeof r.visualSeamCheck === 'string' && r.visualSeamCheck.startsWith('pass')).length;
}

function main(): void {
  const annotationsPath = process.argv[2] ?? 'src/images/photoreal-female-pose-bank/annotations.json';
  const entries = JSON.parse(fs.readFileSync(annotationsPath, 'utf8')) as ScoredAnnotationFileEntry[];
  CTX = { entries, accepted: [], spineBest: new Map(), harvestable: [] };
  console.log(`[score-pose-bank] scoring ${entries.length} candidates from ${annotationsPath}\n`);
  for (const entry of entries) scoreOneCandidate(entry);
  printRollup(CTX.spineBest, CTX.harvestable);
}

main();
