import type { RasterImage } from '../shared/types.js';

const INFINITE = 1e9;
const OPAQUE_THRESHOLD = 16;

export function computeDistanceTransform(image: RasterImage): Float64Array {
  const { width, height, data } = image;
  const dist = new Float64Array(width * height);
  for (let index = 0; index < dist.length; index++) {
    dist[index] = data[index * 4 + 3] > OPAQUE_THRESHOLD ? INFINITE : 0;
  }
  chamferForward(dist, width, height);
  chamferBackward(dist, width, height);
  return dist;
}

function chamferForward(dist: Float64Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (dist[index] === 0) continue;
      let minimum = dist[index];
      if (x > 0) minimum = Math.min(minimum, dist[index - 1] + 1);
      if (y > 0) minimum = Math.min(minimum, dist[index - width] + 1);
      if (x > 0 && y > 0) minimum = Math.min(minimum, dist[index - width - 1] + 1.4142);
      if (x < width - 1 && y > 0) minimum = Math.min(minimum, dist[index - width + 1] + 1.4142);
      dist[index] = minimum;
    }
  }
}

function chamferBackward(dist: Float64Array, width: number, height: number): void {
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const index = y * width + x;
      if (dist[index] === 0) continue;
      let minimum = dist[index];
      if (x < width - 1) minimum = Math.min(minimum, dist[index + 1] + 1);
      if (y < height - 1) minimum = Math.min(minimum, dist[index + width] + 1);
      if (x < width - 1 && y < height - 1) minimum = Math.min(minimum, dist[index + width + 1] + 1.4142);
      if (x > 0 && y < height - 1) minimum = Math.min(minimum, dist[index + width - 1] + 1.4142);
      dist[index] = minimum;
    }
  }
}
