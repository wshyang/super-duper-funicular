import { useCallback, useState } from 'react';
import type { GaitSettings } from '../../shared/types.ts';
import {
  auditSheetFileName,
  downloadCanvas,
  renderAuditSheet,
  renderSpriteSheet,
  spriteSheetFileName,
} from '../lib/export-sheets.ts';

export interface ExportController {
  readonly busy: boolean;
  readonly error: string | null;
  readonly exportSpriteSheet: () => void;
  readonly exportAuditSheet: () => void;
}

/** Canvas exports are browser side effects; the component only wires the callbacks. */
export const useExports = (settings: GaitSettings): ExportController => {
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
      const canvas = renderSpriteSheet(settings);
      downloadCanvas(canvas, spriteSheetFileName(settings));
    });
  }, [run, settings]);

  const exportAuditSheet = useCallback(() => {
    run(() => {
      const canvas = renderAuditSheet(settings);
      downloadCanvas(canvas, auditSheetFileName(settings));
    });
  }, [run, settings]);

  return { busy, error, exportSpriteSheet, exportAuditSheet };
};
