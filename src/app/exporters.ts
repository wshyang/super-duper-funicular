import { SOURCE_SHA256, STAGE_SIZE } from '../shared/constants';
import type { GaitSettings } from '../shared/types';
import { renderRunner } from '../runner/render';
import { solvePose } from '../runner/pose';

export const EXPORT_LAYOUT = {
  frameCount: 8,
  auditPhases: 16,
  panelColumns: 3,
  scale: 0.5,
} as const;

export interface SpriteSheetManifest {
  readonly schema: 'funicular.sprite-sheet.v1';
  readonly sourceSha256: string;
  readonly renderer: 'Canvas 2D';
  readonly settings: GaitSettings;
  readonly cell: { readonly width: number; readonly height: number };
  readonly frames: readonly {
    readonly index: number;
    readonly phase: number;
    readonly x: number;
    readonly y: 0;
  }[];
}

export interface CycleAuditManifest {
  readonly schema: 'funicular.cycle-audit.v1';
  readonly sourceSha256: string;
  readonly settings: GaitSettings;
  readonly phases: readonly number[];
  readonly panels: readonly ['light', 'dark', 'skeleton'];
  readonly cell: { readonly width: number; readonly height: number };
}

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const contextOf = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create a 2D canvas context.');
  return context;
};

const cellWidth = Math.round(STAGE_SIZE.width * EXPORT_LAYOUT.scale);
const cellHeight = Math.round(STAGE_SIZE.height * EXPORT_LAYOUT.scale);

export const createSpriteSheetManifest = (settings: GaitSettings): SpriteSheetManifest => ({
  schema: 'funicular.sprite-sheet.v1',
  sourceSha256: SOURCE_SHA256,
  renderer: 'Canvas 2D',
  settings,
  cell: { width: cellWidth, height: cellHeight },
  frames: Array.from({ length: EXPORT_LAYOUT.frameCount }, (_, index) => ({
    index,
    phase: index / EXPORT_LAYOUT.frameCount,
    x: index * cellWidth,
    y: 0 as const,
  })),
});

export const createCycleAuditManifest = (settings: GaitSettings): CycleAuditManifest => ({
  schema: 'funicular.cycle-audit.v1',
  sourceSha256: SOURCE_SHA256,
  settings,
  phases: Array.from(
    { length: EXPORT_LAYOUT.auditPhases },
    (_, index) => index / EXPORT_LAYOUT.auditPhases,
  ),
  panels: ['light', 'dark', 'skeleton'],
  cell: { width: cellWidth, height: cellHeight },
});

export const createSpriteSheet = (
  settings: GaitSettings,
): { readonly canvas: HTMLCanvasElement; readonly manifest: SpriteSheetManifest } => {
  const canvas = createCanvas(cellWidth * EXPORT_LAYOUT.frameCount, cellHeight);
  const output = contextOf(canvas);
  const scratch = createCanvas(STAGE_SIZE.width, STAGE_SIZE.height);
  const scratchContext = contextOf(scratch);
  for (const frame of createSpriteSheetManifest(settings).frames) {
    renderRunner(scratchContext, solvePose(settings, frame.phase), settings, {
      background: 'transparent',
    });
    output.drawImage(
      scratch,
      0,
      0,
      STAGE_SIZE.width,
      STAGE_SIZE.height,
      frame.x,
      0,
      cellWidth,
      cellHeight,
    );
  }
  return { canvas, manifest: createSpriteSheetManifest(settings) };
};

export const createCycleAudit = (
  settings: GaitSettings,
): { readonly canvas: HTMLCanvasElement; readonly manifest: CycleAuditManifest } => {
  const manifest = createCycleAuditManifest(settings);
  const canvas = createCanvas(
    cellWidth * EXPORT_LAYOUT.panelColumns,
    cellHeight * EXPORT_LAYOUT.auditPhases,
  );
  const output = contextOf(canvas);
  const scratch = createCanvas(STAGE_SIZE.width, STAGE_SIZE.height);
  const scratchContext = contextOf(scratch);
  for (const [row, phase] of manifest.phases.entries()) {
    const pose = solvePose(settings, phase);
    const panels = [
      { background: 'light' as const, skeleton: false },
      { background: 'dark' as const, skeleton: false },
      { background: 'light' as const, skeleton: true },
    ];
    for (const [column, options] of panels.entries()) {
      renderRunner(scratchContext, pose, settings, options);
      output.drawImage(
        scratch,
        0,
        0,
        STAGE_SIZE.width,
        STAGE_SIZE.height,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
      );
    }
  }
  return { canvas, manifest };
};

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

export const downloadCanvasPng = async (
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('The browser could not encode the PNG export.'));
    }, 'image/png');
  });
  saveBlob(blob, filename);
};

export const downloadJson = (value: unknown, filename: string): void => {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  saveBlob(new Blob([json], { type: 'application/json' }), filename);
};
