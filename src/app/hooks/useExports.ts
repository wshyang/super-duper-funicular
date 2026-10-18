import { useCallback, useState } from 'react';
import type { Calibration, GaitSettings } from '../../shared/types.ts';
import {
  calibrationFileName,
  calibrationPayload,
  calibratedSheetFileName,
} from '../../shared/calibration.ts';
import {
  auditSheetFileName,
  downloadCanvas,
  downloadJson,
  renderAuditSheet,
  renderSpriteSheet,
  spriteSheetFileName,
} from '../lib/export-sheets.ts';

export interface ExportController {
  readonly busy: boolean;
  readonly error: string | null;
  readonly exportSpriteSheet: () => void;
  readonly exportAuditSheet: () => void;
  readonly exportCalibrationJson: () => void;
  readonly exportCalibratedSheet: () => void;
}

/** Canvas exports are browser side effects; the component only wires the callbacks. */
const useCalibrationExports = (
  settings: GaitSettings,
  calibration: Calibration,
  run: (task: () => void) => void,
): { exportCalibrationJson: () => void; exportCalibratedSheet: () => void } => {
  const exportCalibrationJson = useCallback(() => {
    downloadJson(calibrationPayload(settings, calibration), calibrationFileName(settings));
  }, [settings, calibration]);
  const exportCalibratedSheet = useCallback(() => {
    run(() => {
      const canvas = renderSpriteSheet(settings, 2, calibration);
      downloadCanvas(canvas, calibratedSheetFileName(settings));
    });
  }, [run, settings, calibration]);
  return { exportCalibrationJson, exportCalibratedSheet };
};

export const useExports = (settings: GaitSettings, calibration: Calibration): ExportController => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((task: () => void) => {
    setBusy(true);
    setError(null);
    window.setTimeout(() => {
      try {
        task();
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : 'Export failed.');
      } finally {
        setBusy(false);
      }
    }, 0);
  }, []);

  const exportSpriteSheet = useCallback(() => {
    run(() => {
      const canvas = renderSpriteSheet(settings, 2, calibration);
      downloadCanvas(canvas, spriteSheetFileName(settings));
    });
  }, [run, settings, calibration]);

  const exportAuditSheet = useCallback(() => {
    run(() => {
      const canvas = renderAuditSheet(settings, calibration);
      downloadCanvas(canvas, auditSheetFileName(settings));
    });
  }, [run, settings, calibration]);

  const calibrationExports = useCalibrationExports(settings, calibration, run);
  return { busy, error, exportSpriteSheet, exportAuditSheet, ...calibrationExports };
};
