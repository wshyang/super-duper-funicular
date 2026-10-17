export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export function isMagenta(r: number, g: number, b: number): boolean {
  return r > 180 && b > 180 && g < 80;
}

export function keyMagenta(image: RgbaImage): RgbaImage {
  const data = new Uint8Array(image.data);
  for (let i = 0; i < data.length; i += 4) {
    if (isMagenta(data[i]!, data[i + 1]!, data[i + 2]!)) {
      data[i + 3] = 0;
    }
  }
  return { width: image.width, height: image.height, data };
}

export function meanIoU(a: RgbaImage, b: RgbaImage): number {
  let inter = 0;
  let union = 0;
  const n = Math.min(a.data.length, b.data.length);
  for (let i = 3; i < n; i += 4) {
    const aa = a.data[i]! > 16;
    const bb = b.data[i]! > 16;
    if (aa && bb) inter += 1;
    if (aa || bb) union += 1;
  }
  return union === 0 ? 1 : inter / union;
}
