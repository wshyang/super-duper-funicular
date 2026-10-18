import { createImage } from './image-io.js';
import type { CanvasSpec, RasterImage } from '../shared/types.js';

const PANEL_RGB = [226, 230, 238];
const GROUND_RGB = [120, 128, 140];
const GUTTER_PX = 8;

export function buildContactSheet(
  frames: readonly RasterImage[],
  columns: number,
  canvas: CanvasSpec,
): RasterImage {
  const rows = Math.ceil(frames.length / columns);
  const sheetWidth = columns * canvas.widthPx + (columns + 1) * GUTTER_PX;
  const sheetHeight = rows * canvas.heightPx + (rows + 1) * GUTTER_PX;
  const sheet = createImage(sheetWidth, sheetHeight);
  fillPanel(sheet);
  frames.forEach((frame, index) => {
    const cellX = GUTTER_PX + (index % columns) * (canvas.widthPx + GUTTER_PX);
    const cellY = GUTTER_PX + Math.floor(index / columns) * (canvas.heightPx + GUTTER_PX);
    drawGroundLine(sheet, cellX, cellY, canvas);
    blitCell(sheet, frame, cellX, cellY);
  });
  return sheet;
}

function fillPanel(sheet: RasterImage): void {
  for (let index = 0; index < sheet.data.length; index += 4) {
    sheet.data[index] = PANEL_RGB[0];
    sheet.data[index + 1] = PANEL_RGB[1];
    sheet.data[index + 2] = PANEL_RGB[2];
    sheet.data[index + 3] = 255;
  }
}

function drawGroundLine(sheet: RasterImage, cellX: number, cellY: number, canvas: CanvasSpec): void {
  const y = cellY + canvas.groundY;
  for (let x = 0; x < canvas.widthPx; x++) {
    const offset = (y * sheet.width + cellX + x) * 4;
    sheet.data[offset] = GROUND_RGB[0];
    sheet.data[offset + 1] = GROUND_RGB[1];
    sheet.data[offset + 2] = GROUND_RGB[2];
    sheet.data[offset + 3] = 255;
  }
}

function blitCell(sheet: RasterImage, frame: RasterImage, cellX: number, cellY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const sourceOffset = (y * frame.width + x) * 4;
      const alpha = frame.data[sourceOffset + 3];
      if (alpha <= 2) continue;
      const targetOffset = ((cellY + y) * sheet.width + cellX + x) * 4;
      const inverse = (255 - alpha) / 255;
      for (let channel = 0; channel < 3; channel++) {
        sheet.data[targetOffset + channel] = Math.round(
          frame.data[sourceOffset + channel] * (alpha / 255) + sheet.data[targetOffset + channel] * inverse,
        );
      }
      sheet.data[targetOffset + 3] = 255;
    }
  }
}
