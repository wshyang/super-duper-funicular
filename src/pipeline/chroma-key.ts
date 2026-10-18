import { createImage, getPixel, isMagentaBackdrop, isMagentaSpill, setPixel, type Rect2, type RgbaImage } from './rgba-image.ts';

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export function chromaKeyWindow(master: RgbaImage, window: Rect2): RgbaImage {
  const cut = createImage(window.w, window.h);
  for (let y = 0; y < window.h; y += 1) {
    for (let x = 0; x < window.w; x += 1) {
      setPixel(cut, x, y, getPixel(master, window.x + x, window.y + y));
    }
  }
  floodKeyBackdrop(cut);
  despillMagentaFringe(cut);
  return cut;
}

function floodKeyBackdrop(cut: RgbaImage): void {
  const seen = new Uint8Array(cut.width * cut.height);
  const stack: number[] = [];
  for (let x = 0; x < cut.width; x += 1) {
    stack.push(x, (cut.height - 1) * cut.width + x);
  }
  for (let y = 0; y < cut.height; y += 1) {
    stack.push(y * cut.width, y * cut.width + cut.width - 1);
  }
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    if (seen[index] === 1) continue;
    seen[index] = 1;
    const x = index % cut.width;
    const y = Math.floor(index / cut.width);
    const pixel = getPixel(cut, x, y);
    if (!isMagentaBackdrop(pixel)) continue;
    setPixel(cut, x, y, { ...pixel, a: 0 });
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cut.width || ny >= cut.height) continue;
      if (seen[ny * cut.width + nx] === 0) stack.push(ny * cut.width + nx);
    }
  }
}

function despillMagentaFringe(cut: RgbaImage): void {
  for (let y = 0; y < cut.height; y += 1) {
    for (let x = 0; x < cut.width; x += 1) {
      const pixel = getPixel(cut, x, y);
      if (pixel.a === 0) continue;
      if (isMagentaSpill({ ...pixel, a: 255 })) setPixel(cut, x, y, { ...pixel, a: 0 });
    }
  }
}
