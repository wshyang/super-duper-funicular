import { getPixel, isOpaque, type RgbaImage } from './rgba-image.ts';

export interface ComponentSummary {
  readonly count: number;
  readonly sizes: number[];
}

interface FloodResult {
  readonly size: number;
  readonly touchesBorder: boolean;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function flood(image: RgbaImage, seen: Uint8Array, startX: number, startY: number, wantOpaque: boolean): FloodResult {
  const stack: number[] = [startY * image.width + startX];
  seen[startY * image.width + startX] = 1;
  let size = 0;
  let touchesBorder = false;
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    size += 1;
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) touchesBorder = true;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
      const ni = ny * image.width + nx;
      if (seen[ni] === 1) continue;
      if (isOpaque(getPixel(image, nx, ny)) !== wantOpaque) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  return { size, touchesBorder };
}

export function labelOpaqueComponents(image: RgbaImage): ComponentSummary {
  const seen = new Uint8Array(image.width * image.height);
  const sizes: number[] = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = y * image.width + x;
      if (seen[i] === 1 || !isOpaque(getPixel(image, x, y))) continue;
      sizes.push(flood(image, seen, x, y, true).size);
    }
  }
  sizes.sort((a, b) => b - a);
  return { count: sizes.length, sizes };
}

export interface HoleInfo {
  readonly size: number;
  readonly designedOverlap: number;
}

function floodMembers(image: RgbaImage, seen: Uint8Array, startX: number, startY: number): { members: number[]; touchesBorder: boolean } {
  const stack: number[] = [startY * image.width + startX];
  seen[startY * image.width + startX] = 1;
  const members: number[] = [];
  let touchesBorder = false;
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    members.push(index);
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) touchesBorder = true;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
      const ni = ny * image.width + nx;
      if (seen[ni] === 1 || isOpaque(getPixel(image, nx, ny))) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  return { members, touchesBorder };
}

export function enclosedHoles(image: RgbaImage, designed?: RgbaImage): HoleInfo[] {
  const seen = new Uint8Array(image.width * image.height);
  const holes: HoleInfo[] = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = y * image.width + x;
      if (seen[i] === 1 || isOpaque(getPixel(image, x, y))) continue;
      const result = floodMembers(image, seen, x, y);
      if (result.touchesBorder || result.members.length <= 3) continue;
      let overlap = 0;
      if (designed !== undefined) {
        for (const index of result.members) {
          if (getPixel(designed, index % image.width, Math.floor(index / image.width)).a > 0) overlap += 1;
        }
      }
      holes.push({ size: result.members.length, designedOverlap: overlap / result.members.length });
    }
  }
  return holes;
}

export function enclosedTransparentHoles(image: RgbaImage): number[] {
  return enclosedHoles(image).map((hole) => hole.size);
}
