import React, { useEffect, useMemo, useRef, useState } from 'react';
import './standing-profile-panel.css';
import { formatDifference, formatPercent } from './standing-profile-formatters.js';
import type { PhotorealAssetTuningSpec, PhotorealPersonaId, RasterImage } from '../../shared/types.js';
import { applyAssetTuningToRigSpec, DEFAULT_RIG_SPEC } from '../../runner/body-proportions.js';
import { RUNNER_PALETTES } from '../../runner/palette.js';
import { renderRunnerPoseToRaster } from '../../runner/rasterizer.js';
import { PERSONA_REFERENCE_DIMENSIONS, referencePercent } from '../../runner/persona-reference.js';
import { solveStandingUprightPose } from '../../runner/standing-pose.js';
import type { PhotorealLoadStatus } from '../hooks/usePhotorealRigAssets.js';

interface StandingProfilePanelProps {
  readonly personaId: PhotorealPersonaId;
  readonly tuning: PhotorealAssetTuningSpec;
  readonly photorealStatus: PhotorealLoadStatus;
}

interface ProportionRow {
  readonly name: string;
  readonly reference: number;
  readonly assembled: number;
}

interface WidthRow {
  readonly name: string;
  readonly reference: number;
  readonly assembled: number;
  readonly configured: number;
}

export function StandingProfilePanel({
  personaId,
  tuning,
  photorealStatus,
}: StandingProfilePanelProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rasterHeight, setRasterHeight] = useState(190);
  const measurements = PERSONA_REFERENCE_DIMENSIONS[personaId];
  const poseAndRaster = useMemo(() => {
    const rig = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
    const pose = solveStandingUprightPose(rig, tuning.defaultHairStyleMode);
    const raster = renderRunnerPoseToRaster({
      pose,
      palette: RUNNER_PALETTES.red,
      pixelScale: 1,
      personaId,
      assetTuning: tuning,
    });
    return { pose, raster, displayRaster: cropRasterToOpaqueBounds(raster) };
  }, [personaId, tuning, photorealStatus]);
  const rows = useMemo(
    () => buildProportionRows(poseAndRaster.pose, poseAndRaster.raster, tuning, measurements),
    [poseAndRaster, tuning, measurements],
  );
  const widthRows = useMemo(
    () => buildWidthRows(poseAndRaster.pose, poseAndRaster.raster, tuning, measurements),
    [poseAndRaster, tuning, measurements],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintRaster(canvas, poseAndRaster.displayRaster);
    setRasterHeight(poseAndRaster.displayRaster.height);
  }, [poseAndRaster]);

  const referenceUrl = `/sprites/photoreal/${personaFolder(personaId)}/reference-profile.png`;
  const canvasWidth = poseAndRaster.displayRaster.width;
  return (
    <section className="standing-profile-panel" data-testid="standing-profile-panel">
      <header className="standing-profile-panel__header">
        <div>
          <span className="eyebrow">Neutral posture · full body</span>
          <h2>Standing Profile Calibration</h2>
          <p>
            Source-profile height estimate <strong>≈ {tuning.estimatedHeightCm} cm</strong> · illustrative
            fictional-persona estimate, not measured subject data. Both figures share a sole baseline
            and normalized standing height so widths and segment lengths can be compared.
          </p>
        </div>
        <span className="pill">{tuning.buildLabel}</span>
      </header>
      <div className="standing-profile-panel__comparison">
        <ProfileTile title="Original side profile" subtitle="Keyed source master · normalized height">
          <img src={referenceUrl} alt={`${tuning.buildLabel} original side-profile reference`} style={{ height: rasterHeight, width: 'auto' }} />
        </ProfileTile>
        <ProfileTile title="Stitched upright rig" subtitle="Neutral joints · current default tunables">
          {photorealStatus === 'loaded' ? (
            <canvas
              ref={canvasRef}
              width={poseAndRaster.displayRaster.width}
              height={poseAndRaster.displayRaster.height}
              style={{ height: rasterHeight, width: canvasWidth }}
              data-testid="standing-persona-composite"
              aria-label="Photoreal persona stitched in neutral standing posture"
            />
          ) : (
            <p className="standing-profile-panel__loading">Photoreal asset bank: {photorealStatus}</p>
          )}
        </ProfileTile>
      </div>
      <div className="standing-profile-panel__table-wrap">
        <table className="standing-profile-panel__table">
          <caption>Approximate segment length as percent of full standing height</caption>
          <thead><tr><th scope="col">Element</th><th scope="col">Source profile</th><th scope="col">Assembled default</th><th scope="col">Difference</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>{formatPercent(row.reference)}</td>
                <td>{formatPercent(row.assembled)}</td>
                <td>{formatDifference(row.assembled - row.reference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="standing-profile-panel__note">
          Width readouts compare source-profile spans to live raster spans at corresponding neutral-pose
          rows. Layer overlap means these are visual estimates, not anatomical measurements. Adjust the
          persona-specific width/length controls in the sidebar and compare again.
        </p>
        <table className="standing-profile-panel__table standing-profile-panel__table--width">
          <caption>Horizontal width as percent of standing height</caption>
          <thead><tr><th scope="col">Cross-section</th><th scope="col">Source profile</th><th scope="col">Assembled raster</th><th scope="col">Configured width</th></tr></thead>
          <tbody>
            {widthRows.map((row) => (
              <tr key={row.name}><th scope="row">{row.name}</th><td>{formatPercent(row.reference)}</td><td>{formatPercent(row.assembled)}</td><td>{formatPercent(row.configured)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfileTile({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <article className="standing-profile-tile">
      <div className="standing-profile-tile__copy"><h3>{title}</h3><p>{subtitle}</p></div>
      <div className="standing-profile-tile__stage">{children}</div>
    </article>
  );
}

function buildProportionRows(
  pose: ReturnType<typeof solveStandingUprightPose>,
  raster: RasterImage,
  tuning: PhotorealAssetTuningSpec,
  reference: (typeof PERSONA_REFERENCE_DIMENSIONS)[PhotorealPersonaId],
): ProportionRow[] {
  const height = findRasterHeight(raster);
  const handTip = projectHandTip(pose.nearArm, tuning.handLengthPx);
  const assembled = [
    ['Head', 26.5 * tuning.headScale],
    ['Neck', distance(pose.neck, pose.collar)],
    ['Torso', distance(pose.pelvis, pose.collar)],
    ['Pelvis / shorts', 19 * tuning.pelvisLengthScale],
    ['Upper arm', distance(pose.nearArm.hipOrShoulder, pose.nearArm.midJoint)],
    ['Forearm', distance(pose.nearArm.midJoint, pose.nearArm.endEffector)],
    ['Hand', distance(pose.nearArm.endEffector, handTip)],
    ['Arm reach (shoulder→fingertip)', distance(pose.nearArm.hipOrShoulder, handTip)],
    ['Thigh', distance(pose.nearLeg.hipOrShoulder, pose.nearLeg.midJoint)],
    ['Shin', distance(pose.nearLeg.midJoint, pose.nearLeg.endEffector)],
    ['Shoe length', DEFAULT_RIG_SPEC.footLength * tuning.footLengthScale],
  ] as const;
  const source = [
    reference.headLengthPx, reference.neckLengthPx, reference.torsoLengthPx,
    reference.pelvisLengthPx, reference.upperArmLengthPx, reference.forearmLengthPx,
    reference.handLengthPx,
    reference.upperArmLengthPx + reference.forearmLengthPx + reference.handLengthPx,
    reference.thighLengthPx, reference.shinLengthPx, reference.shoeLengthPx,
  ];
  return assembled.map(([name, px], index) => ({
    name,
    reference: referencePercent(source[index] ?? 0, reference),
    assembled: (px / height) * 100,
  }));
}

function buildWidthRows(
  pose: ReturnType<typeof solveStandingUprightPose>,
  raster: RasterImage,
  tuning: PhotorealAssetTuningSpec,
  reference: (typeof PERSONA_REFERENCE_DIMENSIONS)[PhotorealPersonaId],
): WidthRow[] {
  const height = findRasterHeight(raster);
  const torsoY = Math.round((pose.pelvis.y + pose.collar.y) / 2);
  const pelvisY = Math.round(pose.pelvis.y + 5);
  const armY = Math.round((pose.nearArm.hipOrShoulder.y + pose.nearArm.midJoint.y) / 2);
  const forearmY = Math.round((pose.nearArm.midJoint.y + pose.nearArm.endEffector.y) / 2);
  const thighY = Math.round((pose.nearLeg.hipOrShoulder.y + pose.nearLeg.midJoint.y) / 2);
  const shinY = Math.round((pose.nearLeg.midJoint.y + pose.nearLeg.endEffector.y) / 2);
  const profile = [
    ['Head', reference.headDepthPx, pose.headCenter.y, 46 * tuning.headScale],
    ['Neck', reference.neckWidthPx, pose.neck.y, tuning.torsoWidthPx * 1.92],
    ['Torso', reference.torsoWidthPx, torsoY, tuning.torsoWidthPx * 2],
    ['Pelvis', reference.pelvisWidthPx, pelvisY, tuning.pelvisWidthPx * 2],
    ['Upper arm', reference.upperArmWidthPx, armY, tuning.upperArmWidthPx * 2],
    ['Forearm', reference.forearmWidthPx, forearmY, tuning.forearmWidthPx * 2],
    ['Hand', reference.handWidthPx, pose.nearArm.endEffector.y + 6, tuning.handWidthPx * 2],
    ['Thigh', reference.thighWidthPx, thighY, tuning.thighWidthPx * 2],
    ['Shin', reference.shinWidthPx, shinY, tuning.shinWidthPx * 2],
  ] as const;
  return profile.map(([name, sourceWidth, y, configured]) => ({
    name,
    reference: referencePercent(sourceWidth, reference),
    assembled: (measureRasterRowWidth(raster, y) / height) * 100,
    configured: (configured / height) * 100,
  }));
}

function measureRasterRowWidth(raster: RasterImage, y: number): number {
  let minX = raster.width;
  let maxX = -1;
  for (let dy = Math.max(0, y - 2); dy <= Math.min(raster.height - 1, y + 2); dy++) {
    for (let x = 0; x < raster.width; x++) {
      if (raster.data[(dy * raster.width + x) * 4 + 3] < 32) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return maxX < minX ? 0 : maxX - minX + 1;
}

function cropRasterToOpaqueBounds(raster: RasterImage): RasterImage {
  let minX = raster.width, minY = raster.height, maxX = -1, maxY = -1;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (raster.data[(y * raster.width + x) * 4 + 3] < 32) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return raster;
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const start = ((minY + y) * raster.width + minX) * 4;
    data.set(raster.data.subarray(start, start + width * 4), y * width * 4);
  }
  return { width, height, data };
}

function findRasterHeight(raster: RasterImage): number {
  let minY = raster.height;
  let maxY = -1;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (raster.data[(y * raster.width + x) * 4 + 3] < 32) continue;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return maxY < minY ? 1 : maxY - minY + 1;
}

function paintRaster(canvas: HTMLCanvasElement, raster: RasterImage): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const imageData = context.createImageData(raster.width, raster.height);
  imageData.data.set(raster.data);
  context.clearRect(0, 0, raster.width, raster.height);
  context.putImageData(imageData, 0, 0);
}

function projectHandTip(
  arm: ReturnType<typeof solveStandingUprightPose>['nearArm'],
  length: number,
): { readonly x: number; readonly y: number } {
  const dx = arm.endEffector.x - arm.midJoint.x;
  const dy = arm.endEffector.y - arm.midJoint.y;
  const magnitude = Math.max(1, Math.hypot(dx, dy));
  return { x: arm.endEffector.x + (dx / magnitude) * length, y: arm.endEffector.y + (dy / magnitude) * length };
}

function distance(a: { readonly x: number; readonly y: number }, b: { readonly x: number; readonly y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function personaFolder(personaId: PhotorealPersonaId): string {
  return personaId.replace('photo-sg-chinese-female', 'sg-chinese-female');
}
