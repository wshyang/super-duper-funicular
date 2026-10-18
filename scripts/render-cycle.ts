import fs from 'node:fs';
import path from 'node:path';
import { readPngFile, writePngFile } from '../src/core/png.js';
import { phaseList, solvePose } from '../src/rig/gait.js';
import { RUN_GAIT, WALK_GAIT } from '../src/rig/spec.js';
import { buildPersonaFromPlate } from '../src/render/persona.js';
import { renderSkinnedFrame } from '../src/render/skin.js';
import { renderControlPlate } from '../src/control/plate.js';
import { VIEW_PALETTE } from '../src/control/palette.js';
import { solveStandingPose } from '../src/render/standing.js';
import { evaluateCycleGates } from '../src/analysis/gates.js';
import { allPassed } from '../src/analysis/thresholds.js';
import { verifyAll, writeFileTree } from '../src/discipline/gate.js';

const PERSONA_ID = process.argv[2] ?? 'athletic';
const FRAME_COUNT = Number(process.argv[3] ?? 16);
const OUT_ROOT = process.argv[4] ?? path.join('out', 'frames', PERSONA_ID);

function main(): void {
  const platePath = path.join('assets', 'personas', PERSONA_ID, '01-master-lateral.png');
  const plate = readPngFile(platePath);
  const context = buildPersonaFromPlate(PERSONA_ID, plate);
  const runFrames = phaseList(FRAME_COUNT).map((phase) => solvePose(phase, { gait: RUN_GAIT }));
  const walkFrames = phaseList(8).map((phase) => solvePose(phase, { gait: WALK_GAIT }));
  const rendered = runFrames.map((pose) => renderSkinnedFrame(pose, context));
  const standing = renderSkinnedFrame(solveStandingPose(), context);
  const controls = runFrames.map((pose) => renderControlPlate(pose, VIEW_PALETTE, { groundLine: true }));
  const cycleGates = evaluateCycleGates(
    rendered,
    runFrames.map(
      (pose) => pose.nearFoot.contact === 'stance' || pose.farFoot.contact === 'stance',
    ),
  );
  const manifest = {
    schemaVersion: 1,
    personaId: PERSONA_ID,
    frameCount: FRAME_COUNT,
    sourcePlate: platePath,
    measuredProfile: context.profile.landmarks,
    derivedProfile: context.profile.normalized,
    bands: context.profile.bands,
    atlas: context.atlas.report,
    boneHalfWidths: context.boneHalfWidths,
    masterScale: context.masterScale,
    masterOrigin: context.masterOrigin,
    gates: cycleGates,
    passed: allPassed(cycleGates),
    frames: runFrames.map((pose, index) => ({
      id: `frame-${String(index + 1).padStart(2, '0')}`,
      phase: Number(pose.phase.toFixed(4)),
      file: `frames/frame-${String(index + 1).padStart(2, '0')}-phase-${String(Math.round(pose.phase * 360)).padStart(3, '0')}.png`,
      pivot: pose.pelvis,
      footAnchor: pose.nearFoot.heel,
      contact: pose.nearFoot.contact,
    })),
    walkSuiteFrames: walkFrames.length,
  };
  rendered.forEach((frame, index) => {
    const name = `frame-${String(index + 1).padStart(2, '0')}-phase-${String(
      Math.round((runFrames[index] as { phase: number }).phase * 360),
    ).padStart(3, '0')}.png`;
    writePngFile(path.join(OUT_ROOT, 'frames', name), frame);
  });
  controls.forEach((_frame, index) => {
    writePngFile(path.join(OUT_ROOT, 'control', `control-${String(index + 1).padStart(2, '0')}.png`), _frame);
  });
  writePngFile(path.join(OUT_ROOT, 'standing.png'), standing);
  // The manifest is written last, after every frame it describes exists. A
  // manifest that claims files which are not on disk is worse than no manifest.
  writeFileTree(OUT_ROOT, {
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
  });
  const summary = [
    `persona: ${PERSONA_ID}`,
    `frames: ${FRAME_COUNT}`,
    `atlas synthetic fraction: ${context.atlas.report.syntheticFraction}`,
    `gates: ${cycleGates.map((gate) => `${gate.name}=${gate.value.toFixed(3)}${gate.passed ? '' : ' FAIL'}`).join(', ')}`,
    `output: ${OUT_ROOT}`,
  ].join('\n');
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUT_ROOT, 'README.txt'), `${summary}\n`);
  console.log(summary);
  const report = verifyAll();
  if (report.violations.length > 0) {
    for (const violation of report.violations) {
      console.error(`${violation.file}: ${violation.rule} — ${violation.detail}`);
    }
    process.exitCode = 1;
  }
}

main();
