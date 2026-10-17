import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  ArticulatedPose,
  Point2D,
  RasterImage,
  RgbaColor,
  RunnerPersonaId,
  RunnerVariantId,
} from '../shared/types.js';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { RUNNER_PALETTES } from '../runner/palette.js';
import { renderRunnerPoseToRaster } from '../runner/rasterizer.js';
import { listOpaqueComponentSizes } from './connected-components.js';
import { writePngFile } from './image-io.js';
import { extractAndLoadPhotorealFemaleParts } from './photoreal-extractor.js';
import { blitRaster, createRaster, fillRaster, readPixel, writePixel } from './raster.js';

export interface CycleDumpOptions {
  readonly outDir?: string;
  readonly frameCount?: number;
  readonly personaId?: RunnerPersonaId;
  readonly variant?: RunnerVariantId;
}

export interface FrameDefectMetrics {
  readonly frameIndex: number;
  readonly phase: number;
  readonly phaseDeg: number;
  readonly phaseName: string;
  readonly rawFramePath: string;
  readonly auditFramePath: string;
  readonly foregroundPixelCount: number;
  readonly disconnectedIslandsCount: number;
  readonly detachedIslandPixels: number;
  readonly magentaSpillPixelsCount: number;
  readonly semiTransparentFringeCount: number;
  readonly lowestFootY: number;
  readonly groundLineDeltaPx: number;
  readonly uncoveredJointNames: readonly string[];
}

export interface CycleAuditReport {
  readonly outDir: string;
  readonly personaId: RunnerPersonaId;
  readonly variant: RunnerVariantId;
  readonly frameCount: number;
  readonly contactSheetPath: string;
  readonly jointCropsSheetPath: string;
  readonly reportJsonPath: string;
  readonly totalDisconnectedIslands: number;
  readonly totalMagentaSpillPixels: number;
  readonly framesWithUncoveredJoints: number;
  readonly frames: readonly FrameDefectMetrics[];
}

export function dumpFullGaitCycleToTempDir(
  options: CycleDumpOptions = {},
): CycleAuditReport {
  const outDir = options.outDir ?? path.join(os.tmpdir(), 'gait-cycle-audit');
  const frameCount = options.frameCount ?? 16;
  const personaId = options.personaId ?? 'photo-sg-chinese-female';
  const variant = options.variant ?? 'red';
  const framesDir = path.join(outDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  if (personaId === 'photo-sg-chinese-female') {
    extractAndLoadPhotorealFemaleParts(process.cwd());
  }
  const cols = 4;
  const rows = Math.ceil(frameCount / cols);
  const contactSheet = createRaster(
    cols * DEFAULT_RIG_SPEC.canvasWidth,
    rows * DEFAULT_RIG_SPEC.canvasHeight,
  );
  fillRaster(contactSheet, { r: 226, g: 230, b: 238, a: 255 });
  const frameMetrics: FrameDefectMetrics[] = [];
  const rawFrames: RasterImage[] = [];
  const poses: ArticulatedPose[] = [];

  for (let i = 0; i < frameCount; i++) {
    const phase = i / frameCount;
    const pose = solveArticulatedPose(phase, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const raw = renderRunnerPoseToRaster({
      pose,
      palette: RUNNER_PALETTES[variant],
      pixelScale: 1,
      personaId,
    });
    rawFrames.push(raw);
    poses.push(pose);
    const metrics = writeAndMeasureCycleFrame(raw, pose, {
      index: i,
      framesDir,
      contactSheet,
      cols,
    });
    frameMetrics.push(metrics);
  }

  const contactSheetPath = path.join(outDir, 'contact-sheet-16frame.png');
  writePngFile(contactSheetPath, contactSheet);
  const jointCropsSheetPath = path.join(outDir, 'joint-crops-sheet.png');
  writePngFile(jointCropsSheetPath, buildZoomedJointCropsSheet(rawFrames));
  return writeCycleAuditReportJson(outDir, {
    personaId,
    variant,
    frameCount,
    contactSheetPath,
    jointCropsSheetPath,
    frames: frameMetrics,
  });
}

function writeAndMeasureCycleFrame(
  raw: RasterImage,
  pose: ArticulatedPose,
  ctx: {
    readonly index: number;
    readonly framesDir: string;
    readonly contactSheet: RasterImage;
    readonly cols: number;
  },
): FrameDefectMetrics {
  const num = String(ctx.index + 1).padStart(2, '0');
  const deg = String(Math.round(pose.phase * 360)).padStart(3, '0');
  const rawFramePath = path.join(ctx.framesDir, `raw-frame-${num}-deg-${deg}.png`);
  const auditFramePath = path.join(ctx.framesDir, `audit-frame-${num}-deg-${deg}.png`);
  writePngFile(rawFramePath, raw);
  const auditPlate = buildThreePanelAuditPlate(raw, pose);
  writePngFile(auditFramePath, auditPlate);
  const cellPanel = renderNeutralPanelWithGround(raw, DEFAULT_RIG_SPEC.groundY);
  const col = ctx.index % ctx.cols;
  const row = Math.floor(ctx.index / ctx.cols);
  blitRaster(ctx.contactSheet, cellPanel, {
    x: col * DEFAULT_RIG_SPEC.canvasWidth,
    y: row * DEFAULT_RIG_SPEC.canvasHeight,
  });
  return computeFrameDefectMetrics(raw, pose, {
    frameIndex: ctx.index + 1,
    rawFramePath,
    auditFramePath,
  });
}

function computeFrameDefectMetrics(
  raw: RasterImage,
  pose: ArticulatedPose,
  meta: {
    readonly frameIndex: number;
    readonly rawFramePath: string;
    readonly auditFramePath: string;
  },
): FrameDefectMetrics {
  const sizes = listOpaqueComponentSizes(raw, 2);
  const detached = sizes.slice(1);
  const detachedIslandPixels = detached.reduce((acc, s) => acc + s, 0);
  const scan = scanPixelAnomalies(raw);
  const uncoveredJointNames = findUncoveredJoints(raw, pose);
  return {
    frameIndex: meta.frameIndex,
    phase: Number(pose.phase.toFixed(4)),
    phaseDeg: Math.round(pose.phase * 360),
    phaseName: pose.phaseName,
    rawFramePath: meta.rawFramePath,
    auditFramePath: meta.auditFramePath,
    foregroundPixelCount: scan.foregroundCount,
    disconnectedIslandsCount: detached.length,
    detachedIslandPixels,
    magentaSpillPixelsCount: scan.magentaSpillCount,
    semiTransparentFringeCount: scan.fringeCount,
    lowestFootY: scan.maxY,
    groundLineDeltaPx: scan.maxY - DEFAULT_RIG_SPEC.groundY,
    uncoveredJointNames,
  };
}

function scanPixelAnomalies(raw: RasterImage): {
  readonly foregroundCount: number;
  readonly magentaSpillCount: number;
  readonly fringeCount: number;
  readonly maxY: number;
} {
  let foregroundCount = 0;
  let magentaSpillCount = 0;
  let fringeCount = 0;
  let maxY = 0;
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      const p = readPixel(raw, x, y);
      if (p.a < 16) continue;
      foregroundCount++;
      if (y > maxY) maxY = y;
      if (p.a < 140) fringeCount++;
      if (p.r > 165 && p.b > 150 && p.r - p.g > 42 && p.b - p.g > 36) {
        magentaSpillCount++;
      }
    }
  }
  return { foregroundCount, magentaSpillCount, fringeCount, maxY };
}

function findUncoveredJoints(raw: RasterImage, pose: ArticulatedPose): string[] {
  const joints: ReadonlyArray<{ readonly name: string; readonly pt: Point2D }> = [
    { name: 'neck', pt: pose.neck },
    { name: 'collar', pt: pose.collar },
    { name: 'pelvis', pt: pose.pelvis },
    { name: 'nearElbow', pt: pose.nearArm.midJoint },
    { name: 'nearKnee', pt: pose.nearLeg.midJoint },
    { name: 'nearAnkle', pt: pose.nearLeg.endEffector },
    { name: 'farKnee', pt: pose.farLeg.midJoint },
    { name: 'farAnkle', pt: pose.farLeg.endEffector },
  ];
  const uncovered: string[] = [];
  for (const j of joints) {
    const cx = Math.round(j.pt.x);
    const cy = Math.round(j.pt.y);
    const maxA = Math.max(
      readPixel(raw, cx, cy).a,
      readPixel(raw, cx - 1, cy).a,
      readPixel(raw, cx + 1, cy).a,
      readPixel(raw, cx, cy - 1).a,
      readPixel(raw, cx, cy + 1).a,
    );
    if (maxA < 160) uncovered.push(j.name);
  }
  return uncovered;
}

function buildThreePanelAuditPlate(
  raw: RasterImage,
  pose: ArticulatedPose,
): RasterImage {
  const w = raw.width;
  const h = raw.height;
  const plate = createRaster(w * 3, h);
  const left = renderNeutralPanelWithGround(raw, DEFAULT_RIG_SPEC.groundY);
  const mid = renderDarkAnomalyHighlightPanel(raw);
  const right = renderJointOverlayPanel(left, pose);
  blitRaster(plate, left, { x: 0, y: 0 });
  blitRaster(plate, mid, { x: w, y: 0 });
  blitRaster(plate, right, { x: w * 2, y: 0 });
  return plate;
}

function renderNeutralPanelWithGround(
  raw: RasterImage,
  groundY: number,
): RasterImage {
  const out = createRaster(raw.width, raw.height);
  fillRaster(out, { r: 226, g: 230, b: 238, a: 255 });
  for (let x = 12; x < raw.width - 12; x++) {
    writePixel(out, { x, y: groundY }, { r: 148, g: 158, b: 176, a: 255 });
  }
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      const p = readPixel(raw, x, y);
      if (p.a === 0) continue;
      const bg = readPixel(out, x, y);
      const a = p.a / 255;
      writePixel(out, { x, y }, {
        r: Math.round(p.r * a + bg.r * (1 - a)),
        g: Math.round(p.g * a + bg.g * (1 - a)),
        b: Math.round(p.b * a + bg.b * (1 - a)),
        a: 255,
      });
    }
  }
  return out;
}

function renderDarkAnomalyHighlightPanel(raw: RasterImage): RasterImage {
  const out = createRaster(raw.width, raw.height);
  fillRaster(out, { r: 24, g: 28, b: 38, a: 255 });
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      const p = readPixel(raw, x, y);
      if (p.a === 0) continue;
      const isSpill = p.r > 165 && p.b > 150 && p.r - p.g > 42 && p.b - p.g > 36;
      if (isSpill) {
        writePixel(out, { x, y }, { r: 0, g: 255, b: 255, a: 255 });
      } else {
        const a = p.a / 255;
        writePixel(out, { x, y }, {
          r: Math.round(p.r * a + 24 * (1 - a)),
          g: Math.round(p.g * a + 28 * (1 - a)),
          b: Math.round(p.b * a + 38 * (1 - a)),
          a: 255,
        });
      }
    }
  }
  return out;
}

function renderJointOverlayPanel(
  basePanel: RasterImage,
  pose: ArticulatedPose,
): RasterImage {
  const out = createRaster(basePanel.width, basePanel.height);
  out.data.set(basePanel.data);
  const pivots: ReadonlyArray<{ readonly pt: Point2D; readonly color: RgbaColor }> = [
    { pt: pose.headCenter, color: { r: 0, g: 210, b: 255, a: 255 } },
    { pt: pose.neck, color: { r: 0, g: 255, b: 120, a: 255 } },
    { pt: pose.collar, color: { r: 255, g: 200, b: 0, a: 255 } },
    { pt: pose.pelvis, color: { r: 255, g: 60, b: 180, a: 255 } },
    { pt: pose.nearArm.midJoint, color: { r: 255, g: 80, b: 40, a: 255 } },
    { pt: pose.nearLeg.midJoint, color: { r: 40, g: 140, b: 255, a: 255 } },
    { pt: pose.nearLeg.endEffector, color: { r: 40, g: 140, b: 255, a: 255 } },
    { pt: pose.nearLeg.ballPoint, color: { r: 20, g: 220, b: 100, a: 255 } },
  ];
  for (const item of pivots) {
    drawCrosshair(out, item.pt, item.color);
  }
  return out;
}

function drawCrosshair(img: RasterImage, pt: Point2D, color: RgbaColor): void {
  const cx = Math.round(pt.x);
  const cy = Math.round(pt.y);
  for (let d = -3; d <= 3; d++) {
    if (cx + d >= 0 && cx + d < img.width && cy >= 0 && cy < img.height) {
      writePixel(img, { x: cx + d, y: cy }, color);
    }
    if (cy + d >= 0 && cy + d < img.height && cx >= 0 && cx < img.width) {
      writePixel(img, { x: cx, y: cy + d }, color);
    }
  }
}

function buildZoomedJointCropsSheet(
  rawFrames: readonly RasterImage[],
): RasterImage {
  const cropW = 90;
  const cropH = 80;
  const scale = 2;
  const cellW = cropW * scale;
  const cellH = cropH * scale;
  const sampleIndices = [0, 4, 8, 12];
  const zones = [
    { minX: 62, minY: 42 },
    { minX: 60, minY: 98 },
    { minX: 55, minY: 145 },
  ];
  const sheet = createRaster(sampleIndices.length * cellW, zones.length * cellH);
  fillRaster(sheet, { r: 226, g: 230, b: 238, a: 255 });
  for (let r = 0; r < zones.length; r++) {
    for (let c = 0; c < sampleIndices.length; c++) {
      const frame = rawFrames[sampleIndices[c] ?? 0] ?? rawFrames[0]!;
      const panel = renderNeutralPanelWithGround(frame, DEFAULT_RIG_SPEC.groundY);
      blitMagnifiedZone(sheet, panel, {
        srcMinX: zones[r]!.minX,
        srcMinY: zones[r]!.minY,
        cropW,
        cropH,
        dstOffsetX: c * cellW,
        dstOffsetY: r * cellH,
        scale,
      });
    }
  }
  return sheet;
}

function blitMagnifiedZone(
  dst: RasterImage,
  src: RasterImage,
  spec: {
    readonly srcMinX: number;
    readonly srcMinY: number;
    readonly cropW: number;
    readonly cropH: number;
    readonly dstOffsetX: number;
    readonly dstOffsetY: number;
    readonly scale: number;
  },
): void {
  for (let y = 0; y < spec.cropH * spec.scale; y++) {
    const sy = Math.min(src.height - 1, spec.srcMinY + Math.floor(y / spec.scale));
    for (let x = 0; x < spec.cropW * spec.scale; x++) {
      const sx = Math.min(src.width - 1, spec.srcMinX + Math.floor(x / spec.scale));
      writePixel(
        dst,
        { x: spec.dstOffsetX + x, y: spec.dstOffsetY + y },
        readPixel(src, sx, sy),
      );
    }
  }
}

function writeCycleAuditReportJson(
  outDir: string,
  data: Omit<
    CycleAuditReport,
    | 'outDir'
    | 'reportJsonPath'
    | 'totalDisconnectedIslands'
    | 'totalMagentaSpillPixels'
    | 'framesWithUncoveredJoints'
  >,
): CycleAuditReport {
  const reportJsonPath = path.join(outDir, 'audit-report.json');
  const totalDisconnectedIslands = data.frames.reduce(
    (s, f) => s + f.disconnectedIslandsCount,
    0,
  );
  const totalMagentaSpillPixels = data.frames.reduce(
    (s, f) => s + f.magentaSpillPixelsCount,
    0,
  );
  const framesWithUncoveredJoints = data.frames.filter(
    (f) => f.uncoveredJointNames.length > 0,
  ).length;
  const report: CycleAuditReport = {
    outDir,
    ...data,
    reportJsonPath,
    totalDisconnectedIslands,
    totalMagentaSpillPixels,
    framesWithUncoveredJoints,
  };
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}
