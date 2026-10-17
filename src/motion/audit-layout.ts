/** Half-keyframe samples reveal defects hidden by the eight-frame filmstrip. */
export const auditSamples = Array.from({ length: 16 }, (_, index) => ({
  phase: index / 16,
  x: (index % 4) * 480,
  y: Math.floor(index / 4) * 180,
}));
