import type { Rgb } from '../profile/master-profile.js';

/**
 * The backdrop predicate, in one place.
 *
 * It lives in `analysis` because both the plate keyer and the output auditor
 * need exactly the same definition, and because "is this pixel background" is a
 * property of the image, not of the profile. Two copies of this rule drifted
 * apart in the previous branches; the rendering auditor ended up using a looser
 * test than the keyer and reported spill that no viewer could see, while missing
 * spill that was real.
 *
 * The rule is chromatic rather than metric. The backdrop is magenta — red and
 * blue high, green much lower than either. Warm skin, crimson fabric, white
 * shoes and dark hair all fail that test regardless of brightness. A tight
 * Manhattan catch-all handles near-exact backdrop pixels and nothing else.
 */
export function isMagentaSignature(r: number, g: number, b: number): boolean {
  return r > 120 && b > 90 && g < 0.72 * Math.min(r, b);
}

export function isChromaPixel(r: number, g: number, b: number, key: Rgb): boolean {
  if (isMagentaSignature(r, g, b)) return true;
  return Math.abs(r - key.r) + Math.abs(g - key.g) + Math.abs(b - key.b) < 48;
}
