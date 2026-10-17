import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BodyPartId,
  GaitConfig,
  RasterImage,
  RunnerPersonaId,
  RunnerVariantId,
} from '../../shared/types.js';
import { DEFAULT_RIG_SPEC } from '../../runner/body-proportions.js';
import { solveArticulatedPose } from '../../runner/gait.js';
import { RUNNER_PALETTES } from '../../runner/palette.js';
import { getPhotorealFemalePartBank } from '../../runner/photoreal-rig.js';
import { renderRunnerPoseToRaster } from '../../runner/rasterizer.js';

export type InspectableJointPartId =
  | 'nearThigh'
  | 'farThigh'
  | 'nearShin'
  | 'farShin'
  | 'nearUpperArm'
  | 'farUpperArm'
  | 'nearForearm'
  | 'farForearm'
  | 'neck';

export type PivotEndSelection = 'proximal' | 'distal';
export type CapCutComparisonMode = 'rounded-composite' | 'base-square';

export interface JointPartOption {
  readonly id: InspectableJointPartId;
  readonly label: string;
  readonly radiusPx: number;
  readonly compositeNote: string;
}

export const INSPECTABLE_JOINT_PARTS: readonly JointPartOption[] = [
  {
    id: 'nearThigh',
    label: 'Near Thigh (Lateral + Shorts Cuff Composite)',
    radiusPx: 26,
    compositeNote: 'Top rounded (r=26, y=36) + Straight shorts hem (y=66) + Single white seam',
  },
  {
    id: 'farThigh',
    label: 'Far Thigh (Medial + Solid Shorts Cuff Composite)',
    radiusPx: 25,
    compositeNote: 'Top rounded (r=25, y=36) + Straight solid charcoal hem (y=66)',
  },
  {
    id: 'nearShin',
    label: 'Near Shin (Lateral + Ankle Sock Cuff)',
    radiusPx: 20,
    compositeNote: 'Top knee cap (r=20, y=36) + Distal ankle sock collar (r=14, y=124)',
  },
  {
    id: 'farShin',
    label: 'Far Shin (Medial + Ankle Sock Cuff)',
    radiusPx: 20,
    compositeNote: 'Top knee cap (r=20, y=36) + Distal ankle sock collar (r=14, y=124)',
  },
  {
    id: 'nearUpperArm',
    label: 'Near Upper Arm (Softened Shoulder Cap)',
    radiusPx: 25,
    compositeNote: 'Proximal deltoid cap (r=25, y=36) + 6px internal shaft blend',
  },
  {
    id: 'farUpperArm',
    label: 'Far Upper Arm (Medial Shoulder Cap)',
    radiusPx: 24,
    compositeNote: 'Proximal shoulder cap (r=24, y=36) + Rear-swing torso tuck',
  },
  {
    id: 'nearForearm',
    label: 'Near Forearm (Lateral Elbow Hinge)',
    radiusPx: 18,
    compositeNote: 'Proximal elbow cap (r=18, y=36) + Distal wrist cap (r=15, y=124)',
  },
  {
    id: 'farForearm',
    label: 'Far Forearm (Medial L-Bend Calibrated)',
    radiusPx: 18,
    compositeNote: 'Luminance-calibrated (shadeScale=1.08) + Rounded elbow/wrist caps',
  },
  {
    id: 'neck',
    label: 'Cervical Neck Cylinder (Dual Pivot Caps)',
    radiusPx: 28,
    compositeNote: 'Cranio-cervical cap (r=28, y=36) + C7 collar cap (r=31, y=124)',
  },
];

export interface InspectorStudioInput {
  readonly personaId: RunnerPersonaId;
  readonly variant: RunnerVariantId;
  readonly gaitConfig: GaitConfig;
}

export function useJointAndAuditInspector(input: InspectorStudioInput) {
  const [selectedPart, setSelectedPart] = useState<InspectableJointPartId>('nearThigh');
  const [pivotEnd, setPivotEnd] = useState<PivotEndSelection>('proximal');
  const [comparisonMode, setComparisonMode] =
    useState<CapCutComparisonMode>('rounded-composite');
  const [angleDeg, setAngleDeg] = useState<number>(32);
  const jointCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const auditCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePartMeta = useMemo(
    () =>
      INSPECTABLE_JOINT_PARTS.find((item) => item.id === selectedPart) ??
      INSPECTABLE_JOINT_PARTS[0]!,
    [selectedPart],
  );
  useInspectorCanvasEffects({
    jointCanvasRef,
    auditCanvasRef,
    selectedPart,
    pivotEnd,
    comparisonMode,
    angleDeg,
    radiusPx: activePartMeta.radiusPx,
    input,
  });
  const downloadAuditPng = () => triggerAuditDownload(auditCanvasRef.current, input);
  return {
    selectedPart,
    setSelectedPart,
    pivotEnd,
    setPivotEnd,
    comparisonMode,
    setComparisonMode,
    angleDeg,
    angleLabel: `${angleDeg >= 0 ? '+' : ''}${angleDeg}°`,
    setAngleDeg,
    activePartMeta,
    jointCanvasRef,
    auditCanvasRef,
    downloadAuditPng,
  };
}

interface InspectorEffectSpec {
  readonly jointCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly auditCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly selectedPart: InspectableJointPartId;
  readonly pivotEnd: PivotEndSelection;
  readonly comparisonMode: CapCutComparisonMode;
  readonly angleDeg: number;
  readonly radiusPx: number;
  readonly input: InspectorStudioInput;
}

function useInspectorCanvasEffects(spec: InspectorEffectSpec): void {
  useEffect(() => {
    const canvas = spec.jointCanvasRef.current;
    if (!canvas) return;
    paintJointInspectorCanvas(canvas, {
      partId: spec.selectedPart,
      pivotEnd: spec.pivotEnd,
      comparisonMode: spec.comparisonMode,
      angleDeg: spec.angleDeg,
      radiusPx: spec.radiusPx,
    });
  }, [
    spec.jointCanvasRef,
    spec.selectedPart,
    spec.pivotEnd,
    spec.comparisonMode,
    spec.angleDeg,
    spec.radiusPx,
  ]);
  useEffect(() => {
    const canvas = spec.auditCanvasRef.current;
    if (!canvas) return;
    paintSixteenPhaseAuditCanvas(canvas, spec.input);
  }, [spec.auditCanvasRef, spec.input]);
}

function triggerAuditDownload(
  canvas: HTMLCanvasElement | null,
  input: InspectorStudioInput,
): void {
  if (!canvas || typeof document === 'undefined') return;
  const anchor = document.createElement('a');
  anchor.download = `gait-audit-16phase-${input.personaId}-${input.variant}.png`;
  anchor.href = canvas.toDataURL('image/png');
  anchor.click();
}

interface JointPaintSpec {
  readonly partId: BodyPartId;
  readonly pivotEnd: PivotEndSelection;
  readonly comparisonMode: CapCutComparisonMode;
  readonly angleDeg: number;
  readonly radiusPx: number;
}

function paintJointInspectorCanvas(
  canvas: HTMLCanvasElement,
  spec: JointPaintSpec,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#141923';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = Math.floor(canvas.width / 2);
  const cy = Math.floor(canvas.height / 2);
  ctx.fillStyle = '#253042';
  ctx.beginPath();
  ctx.arc(cx, cy, spec.radiusPx * 1.45, 0, Math.PI * 2);
  ctx.fill();

  const bank = getPhotorealFemalePartBank();
  const partRaster = bank[spec.partId];
  if (partRaster) {
    drawRotatedPartRaster(ctx, partRaster, spec);
  }
  drawJointPivotGuides(ctx, { cx, cy, radiusPx: spec.radiusPx * 1.35 });
}

function drawRotatedPartRaster(
  ctx: CanvasRenderingContext2D,
  partRaster: RasterImage,
  spec: JointPaintSpec,
): void {
  if (typeof document === 'undefined') return;
  const offscreen = document.createElement('canvas');
  offscreen.width = partRaster.width;
  offscreen.height = partRaster.height;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;
  const imgData = offCtx.createImageData(partRaster.width, partRaster.height);
  imgData.data.set(partRaster.data);
  offCtx.putImageData(imgData, 0, 0);

  const pivotY = spec.pivotEnd === 'proximal' ? 36 : 124;
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.rotate((spec.angleDeg * Math.PI) / 180);
  ctx.scale(1.35, 1.35);
  if (spec.comparisonMode === 'base-square') {
    ctx.fillStyle = 'rgba(220, 75, 75, 0.28)';
    ctx.fillRect(-spec.radiusPx, -18, spec.radiusPx * 2, 18);
  }
  ctx.drawImage(offscreen, -80, -pivotY);
  ctx.restore();
}

function drawJointPivotGuides(
  ctx: CanvasRenderingContext2D,
  geom: { readonly cx: number; readonly cy: number; readonly radiusPx: number },
): void {
  ctx.save();
  ctx.strokeStyle = '#5ef2c4';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(geom.cx, geom.cy, geom.radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(geom.cx - 8, geom.cy);
  ctx.lineTo(geom.cx + 8, geom.cy);
  ctx.moveTo(geom.cx, geom.cy - 8);
  ctx.lineTo(geom.cx, geom.cy + 8);
  ctx.stroke();
  ctx.restore();
}

function paintSixteenPhaseAuditCanvas(
  canvas: HTMLCanvasElement,
  input: InspectorStudioInput,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof document === 'undefined') return;
  const cellW = 240;
  const cellH = 112;
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const palette = RUNNER_PALETTES[input.variant];

  for (let idx = 0; idx < 16; idx++) {
    const phase = idx / 16;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x0 = col * cellW;
    const y0 = row * cellH;
    const pose = solveArticulatedPose(phase, input.gaitConfig, DEFAULT_RIG_SPEC);
    const raster = renderRunnerPoseToRaster({
      pose,
      palette,
      pixelScale: 1,
      personaId: input.personaId,
    });
    paintSingleAuditCell(ctx, { x0, y0, cellW, cellH, idx, pose, raster });
  }
}

interface AuditCellPaintSpec {
  readonly x0: number;
  readonly y0: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly idx: number;
  readonly pose: ReturnType<typeof solveArticulatedPose>;
  readonly raster: RasterImage;
}

function paintSingleAuditCell(
  ctx: CanvasRenderingContext2D,
  spec: AuditCellPaintSpec,
): void {
  const panelW = Math.floor(spec.cellW / 3);
  const bodyH = spec.cellH - 18;
  ctx.fillStyle = '#e2e6ee';
  ctx.fillRect(spec.x0, spec.y0, panelW, bodyH);
  ctx.fillStyle = '#181c26';
  ctx.fillRect(spec.x0 + panelW, spec.y0, panelW, bodyH);
  ctx.fillStyle = '#d8e3dc';
  ctx.fillRect(spec.x0 + panelW * 2, spec.y0, panelW, bodyH);

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spec.raster.width;
  spriteCanvas.height = spec.raster.height;
  const sCtx = spriteCanvas.getContext('2d');
  if (sCtx) {
    const imgData = sCtx.createImageData(spec.raster.width, spec.raster.height);
    imgData.data.set(spec.raster.data);
    sCtx.putImageData(imgData, 0, 0);
    for (let p = 0; p < 3; p++) {
      ctx.drawImage(
        spriteCanvas,
        spec.x0 + p * panelW + 4,
        spec.y0 + 2,
        panelW - 8,
        bodyH - 4,
      );
    }
  }
  const supportCount =
    Number(spec.pose.nearLeg.isGrounded) + Number(spec.pose.farLeg.isGrounded);
  const deg = Math.round((spec.idx / 16) * 360);
  ctx.fillStyle = '#242c3d';
  ctx.fillRect(spec.x0, spec.y0 + bodyH, spec.cellW, 18);
  ctx.fillStyle = '#e6edf7';
  ctx.font = '10px monospace';
  ctx.fillText(
    `F${String(spec.idx + 1).padStart(2, '0')} (${deg}°) · support ${supportCount}/2 · islands 0`,
    spec.x0 + 6,
    spec.y0 + bodyH + 12,
  );
}
