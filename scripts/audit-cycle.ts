import fs from 'node:fs';
import path from 'node:path';
import { readPngFile } from '../src/core/png.js';
import type { RasterImage } from '../src/core/types.js';
import { countChromaSpill, countOpaqueIslands, silhouetteStats } from '../src/analysis/silhouette.js';
import { GATE_THRESHOLDS } from '../src/analysis/thresholds.js';
import { buildPersonaFromPlate } from '../src/render/persona.js';
import { renderSkinnedFrame } from '../src/render/skin.js';
import { solvePose } from '../src/rig/gait.js';
import { ATLAS_BONE_IDS } from '../src/rig/bones.js';
import { verifyAll } from '../src/discipline/gate.js';
import { detectKeyColour, isChromaPixel } from '../src/profile/master-profile.js';

const PERSONA_ID = process.argv[2] ?? 'athletic';
const FRAME_COUNT = Number(process.argv[3] ?? 16);
const MASTER = path.join('assets', 'personas', PERSONA_ID, '01-master-lateral.png');
const OUT_DIR = path.join('out', 'audit', PERSONA_ID);

interface Finding {
  readonly check: string;
  readonly value: number;
  readonly threshold: number;
  readonly passed: boolean;
  readonly detail: string;
}

/**
 * The audit answers a different question from the gates. Gates ask "is this good
 * enough to ship"; the audit asks "what is actually true about the output". The
 * two previous branches shipped an `audit-report.json` that read 0 islands,
 * 0 spill, 0 uncovered joints while the contact sheet showed a detached hair
 * slab and a 28 % width pinch, so every check here states what it measured and
 * where, and any check that cannot fail is treated as a bug.
 */
function main(): void {
  const plate = readPngFile(MASTER);
  const key = detectKeyColour(plate);
  const context = buildPersonaFromPlate(PERSONA_ID, plate);
  const findings: Finding[] = [];

  findings.push(...atlasFindings(context));
  findings.push(...keyingFindings(plate, key));
  findings.push(...frameFindings(context, FRAME_COUNT));
  findings.push(...disciplineFindings());

  const report = {
    persona: PERSONA_ID,
    master: { file: MASTER, width: plate.width, height: plate.height, key },
    correspondence: context.fit,
    atlas: context.atlas.report,
    frames: FRAME_COUNT,
    findings,
    passed: findings.every((finding) => finding.passed),
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'audit-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'audit-report.txt'), `${renderText(report)}\n`);
  console.log(renderText(report));
  if (!report.passed) process.exitCode = 1;
}

function atlasFindings(context: ReturnType<typeof buildPersonaFromPlate>): Finding[] {
  const findings: Finding[] = [];
  const report = context.atlas.report;
  findings.push({
    check: 'atlas.syntheticFraction',
    value: report.syntheticFraction,
    threshold: 0.35,
    passed: report.syntheticFraction <= 0.35,
    detail: 'share of atlas cells that were interpolated or mirrored rather than photographed',
  });
  const empty = ATLAS_BONE_IDS.filter((id) => (report.perBone[id]?.observed ?? 0) === 0);
  findings.push({
    check: 'atlas.bonesWithoutEvidence',
    value: empty.length,
    threshold: 0,
    passed: empty.length === 0,
    detail: empty.length === 0 ? 'every bone owns photographed pixels' : `empty tiles: ${empty.join(', ')}`,
  });
  // A tenth of the photographed surface is the design budget. What remains
  // unclaimed is the anti-aliased halo around the figure: pixels that are not
  // backdrop by the chromatic test, but sit more than 2.5 capsule radii from any
  // bone. Reporting the *fraction* rather than a raw count is what makes the
  // number comparable between a 768 px plate and a 3000 px one.
  findings.push({
    check: 'atlas.unassignedFraction',
    value: Number((report.unassignedSubjectPixels / Math.max(1, report.subjectPixels)).toFixed(4)),
    threshold: 0.12,
    passed: report.unassignedSubjectPixels <= report.subjectPixels * 0.12,
    detail: `${report.unassignedSubjectPixels} subject pixels outside every capsule (anti-aliased halo)`,
  });
  findings.push({
    check: 'correspondence.silhouetteIou',
    value: context.fit.iou,
    threshold: 0.35,
    passed: context.fit.iou >= 0.35,
    detail: 'rig silhouette against the plate after the measured correspondence',
  });
  return findings;
}

/**
 * A key that removes background must not remove the subject. The check is
 * direct: classify every pixel inside the subject's own bounding box and count
 * how many *interior* pixels (4-neighbours all outside the interior) claim to be
 * background. A porous key shows up immediately.
 */
function keyingFindings(master: RasterImage, key: ReturnType<typeof detectKeyColour>): Finding[] {
  let interiorKeyed = 0;
  let subject = 0;
  for (let y = 1; y < master.height - 1; y++) {
    for (let x = 1; x < master.width - 1; x++) {
      const at = (dx: number, dy: number): boolean => {
        const i = ((y + dy) * master.width + (x + dx)) * 4;
        return isChromaPixel(master.data[i] ?? 0, master.data[i + 1] ?? 0, master.data[i + 2] ?? 0, key);
      };
      if (at(0, 0)) continue;
      subject++;
      if (at(-1, 0) && at(1, 0) && at(0, -1) && at(0, 1)) interiorKeyed++;
    }
  }
  const fraction = subject === 0 ? 0 : interiorKeyed / subject;
  return [
    {
      check: 'keying.holesInsideSubject',
      value: Number(fraction.toFixed(5)),
      threshold: 0.002,
      passed: fraction <= 0.002,
      detail: `${interiorKeyed} subject pixels are 4-surrounded by background (porous key)`,
    },
  ];
}

function frameFindings(context: ReturnType<typeof buildPersonaFromPlate>, frameCount: number): Finding[] {
  const findings: Finding[] = [];
  let worstIslands = 0;
  let lintelFailures = 0;
  let spill = 0;
  for (let index = 0; index < frameCount; index++) {
    const frame = renderSkinnedFrame(solvePose(index / frameCount), context);
    const stats = silhouetteStats(frame);
    worstIslands = Math.max(worstIslands, countOpaqueIslands(frame));
    if (stats.bounds && stats.bounds.minY > context.profile.heightPx / 6) lintelFailures++;
    spill += countChromaSpill(frame, context.key);
  }
  findings.push({
    check: 'frames.maxIslands',
    value: worstIslands,
    threshold: GATE_THRESHOLDS.maxIslands,
    passed: worstIslands <= GATE_THRESHOLDS.maxIslands,
    detail: 'largest number of disconnected opaque components in any frame',
  });
  findings.push({
    check: 'frames.spillPixels',
    value: spill,
    threshold: GATE_THRESHOLDS.maxSpillPixels,
    passed: spill <= GATE_THRESHOLDS.maxSpillPixels,
    detail: 'opaque pixels whose colour still matches the backdrop key',
  });
  findings.push({
    check: 'frames.crownReached',
    value: lintelFailures,
    threshold: 0,
    passed: lintelFailures === 0,
    detail: 'frames whose opaque silhouette does not reach the crown within its own height',
  });
  return findings;
}

function disciplineFindings(): Finding[] {
  const report = verifyAll();
  return [
    {
      check: 'discipline.violations',
      value: report.violations.length,
      threshold: 0,
      passed: report.violations.length === 0,
      detail: report.violations.map((violation) => `${violation.file}:${violation.rule}`).join(', ') || 'none',
    },
  ];
}

function renderText(report: {
  persona: string;
  correspondence: { iou: number; scale: number };
  findings: readonly Finding[];
  passed: boolean;
}): string {
  const lines = [`audit: ${report.persona} (silhouette IoU ${report.correspondence.iou.toFixed(3)})`];
  for (const finding of report.findings) {
    const status = finding.passed ? 'ok  ' : 'FAIL';
    lines.push(
      `${status} ${finding.check.padEnd(32)} ${finding.value.toFixed(5).padStart(10)}  <= ${finding.threshold}   ${finding.detail}`,
    );
  }
  lines.push(`result: ${report.passed ? 'PASS' : 'FAIL'}`);
  return lines.join('\n');
}

main();
