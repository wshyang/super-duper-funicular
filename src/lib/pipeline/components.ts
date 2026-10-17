/** A connected blob of foreground pixels, with its bounding box and moments. */
export interface Component {
  readonly id: number;
  readonly area: number;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centroidX: number;
  readonly centroidY: number;
  readonly pixels: Int32Array;
}

export interface LabelResult {
  readonly labels: Int32Array;
  readonly components: readonly Component[];
  readonly width: number;
  readonly height: number;
}

/**
 * 8-connected component labelling with a scanline flood fill. One pass builds
 * every blob's extent and pixel list, which the sprite cutter reuses as a mask
 * so that only the figure is kept and stray magenta pockets are dropped.
 */
export function labelComponents(
  isForeground: (x: number, y: number) => boolean,
  width: number,
  height: number,
  minimumArea = 1,
): LabelResult {
  const labels = new Int32Array(width * height);
  const components: Component[] = [];
  const stack: number[] = [];
  let nextId = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (labels[index] !== 0 || !isForeground(x, y)) continue;
      nextId += 1;
      labels[index] = nextId;
      stack.push(index);
      const pixels: number[] = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;
      while (stack.length > 0) {
        const current = stack.pop() as number;
        const cy = Math.floor(current / width);
        const cx = current - cy * width;
        pixels.push(current);
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbour = ny * width + nx;
            if (labels[neighbour] !== 0 || !isForeground(nx, ny)) continue;
            labels[neighbour] = nextId;
            stack.push(neighbour);
          }
        }
      }
      if (pixels.length < minimumArea) continue;
      components.push({
        id: nextId,
        area: pixels.length,
        minX,
        minY,
        maxX,
        maxY,
        centroidX: sumX / pixels.length,
        centroidY: sumY / pixels.length,
        pixels: Int32Array.from(pixels),
      });
    }
  }
  return { labels, components, width, height };
}

/**
 * Groups 1-D positions into clusters, splitting wherever the gap exceeds
 * `tolerance`. Used to recover rows and columns of a sprite sheet from blob
 * centres without assuming a fixed grid.
 */
export function clusterPositions(values: readonly number[], tolerance: number): number[][] {
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const value of sorted) {
    const current = clusters[clusters.length - 1];
    if (current !== undefined && value - (current[current.length - 1] as number) <= tolerance) {
      current.push(value);
      continue;
    }
    clusters.push([value]);
  }
  return clusters;
}
