import type { Calibration, GaitSettings, JointOffsets } from './types.ts';

export const DEFAULT_CALIBRATION: Calibration = {
  hip: { x: 0, y: 0 },
  shoulder: { x: 0, y: 0 },
  head: { x: 0, y: 0 },
};

export const CALIBRATION_LIMIT = 12;
export const CALIBRATION_STEP = 0.5;

export const clampOffset = (value: number): number =>
  Math.max(
    -CALIBRATION_LIMIT,
    Math.min(CALIBRATION_LIMIT, Math.round(value / CALIBRATION_STEP) * CALIBRATION_STEP),
  );

export const clampCalibration = (calibration: Calibration): Calibration => ({
  hip: { x: clampOffset(calibration.hip.x), y: clampOffset(calibration.hip.y) },
  shoulder: { x: clampOffset(calibration.shoulder.x), y: clampOffset(calibration.shoulder.y) },
  head: { x: clampOffset(calibration.head.x), y: clampOffset(calibration.head.y) },
});

export const isDefaultCalibration = (calibration: Calibration): boolean =>
  [calibration.hip, calibration.shoulder, calibration.head].every(
    (offset: JointOffsets) => offset.x === 0 && offset.y === 0,
  );

export interface CalibrationPayload {
  readonly schema: 'funicular-calibration/1';
  readonly canvas: { readonly width: number; readonly height: number };
  readonly settings: GaitSettings;
  readonly calibration: Calibration;
}

/** The JSON written next to a calibrated export, so the pixels are reproducible. */
export const calibrationPayload = (
  settings: GaitSettings,
  calibration: Calibration,
): CalibrationPayload => ({
  schema: 'funicular-calibration/1',
  canvas: { width: 260, height: 340 },
  settings,
  calibration: clampCalibration(calibration),
});

export const calibrationFileName = (settings: GaitSettings): string =>
  `funicular-${settings.persona}-${settings.motion}-${settings.palette}-calibration.json`;

export const calibratedSheetFileName = (settings: GaitSettings): string =>
  `funicular-${settings.persona}-${settings.motion}-${settings.palette}-8frame-calibrated.png`;
