import type { Calibration, GaitSettings } from '../../shared/types.ts';
import { CANVAS } from '../../shared/constants.ts';
import { buildScene } from '../../runner/scene.ts';
import { cartoonGround, paintScene, paintSkeleton } from '../../runner/paint-canvas.ts';

export interface PanelLayout {
  readonly columns: number;
  readonly rows: number;
  readonly panelWidth: number;
  readonly panelHeight: number;
  readonly footer: number;
}

export const AUDIT_LAYOUT: PanelLayout = {
  columns: 16,
  rows: 3,
  panelWidth: CANVAS.width,
  panelHeight: CANVAS.height,
  footer: 26,
};

export const panelOrigin = (
  layout: PanelLayout,
  column: number,
  row: number,
): { x: number; y: number } => ({
  x: column * layout.panelWidth,
  y: row * (layout.panelHeight + layout.footer),
});

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const spriteSheetFileName = (settings: GaitSettings, extension = 'png'): string =>
  `funicular-${settings.persona}-${settings.motion}-${settings.palette}-8frame.${extension}`;

export const auditSheetFileName = (settings: GaitSettings): string =>
  `funicular-${settings.persona}-${settings.motion}-${settings.palette}-16phase-audit.png`;

/** Eight transparent cells, painted by the same scene painter as the live stage. */
export const renderSpriteSheet = (
  settings: GaitSettings,
  scale = 2,
  calibration?: Calibration,
): HTMLCanvasElement => {
  const cellWidth = CANVAS.width * scale;
  const cellHeight = CANVAS.height * scale;
  const canvas = createCanvas(cellWidth * 8, cellHeight);
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  for (let index = 0; index < 8; index += 1) {
    const scene = buildScene(settings, index / 8, { calibration });
    context.save();
    context.translate(index * cellWidth, 0);
    paintScene(context, scene, scale);
    context.restore();
  }
  return canvas;
};

const ROW_BACKGROUNDS = ['#f4f4f5', '#101318', '#101318'] as const;
const ROW_LABELS = ['Floor light', 'Floor dark', 'Joint overlay'] as const;

/** 16 phases × light/dark/skeleton panels, exactly the audit format used by peers. */
export const renderAuditSheet = (
  settings: GaitSettings,
  calibration?: Calibration,
): HTMLCanvasElement => {
  const { columns, rows, panelWidth, panelHeight, footer } = AUDIT_LAYOUT;
  const canvas = createCanvas(columns * panelWidth, rows * (panelHeight + footer));
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const origin = panelOrigin(AUDIT_LAYOUT, column, row);
      const phase = column / columns;
      context.fillStyle = ROW_BACKGROUNDS[row] ?? '#101318';
      context.fillRect(origin.x, origin.y, panelWidth, panelHeight + footer);
      const scene = buildScene(settings, phase, { calibration });
      context.save();
      context.translate(origin.x, origin.y);
      if (row === 0) cartoonGround(context, scene, 1);
      paintScene(context, scene, 1, { clear: false });
      if (row === 2) paintSkeleton(context, scene, 1);
      context.restore();
      context.fillStyle = row === 0 ? '#3f3f46' : '#a1a1aa';
      context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.fillText(
        `${String(column).padStart(2, '0')} · ${(phase * 360).toFixed(0)}° · ${ROW_LABELS[row]}`,
        origin.x + 8,
        origin.y + panelHeight + 17,
      );
    }
  }
  return canvas;
};

export const downloadCanvas = (canvas: HTMLCanvasElement, filename: string): void => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
};

export const downloadJson = (payload: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
