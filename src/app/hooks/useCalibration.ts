import { useCallback, useState } from 'react';
import type { Calibration } from '../../shared/types.ts';
import { clampCalibration, clampOffset, DEFAULT_CALIBRATION } from '../../shared/calibration.ts';

export type CalibrationJoint = 'hip' | 'shoulder' | 'head';
export type CalibrationAxis = 'x' | 'y';

export interface CalibrationState {
  readonly calibration: Calibration;
  readonly setOffset: (joint: CalibrationJoint, axis: CalibrationAxis, value: number) => void;
  readonly reset: () => void;
}

/** Six independent joint offsets, clamped and quantised by the shared calibration rules. */
export const useCalibration = (): CalibrationState => {
  const [calibration, setCalibration] = useState<Calibration>(DEFAULT_CALIBRATION);

  const setOffset = useCallback((joint: CalibrationJoint, axis: CalibrationAxis, value: number) => {
    setCalibration((current) =>
      clampCalibration({
        ...current,
        [joint]: { ...current[joint], [axis]: clampOffset(value) },
      }),
    );
  }, []);

  const reset = useCallback(() => setCalibration(DEFAULT_CALIBRATION), []);
  return { calibration, setOffset, reset };
};
