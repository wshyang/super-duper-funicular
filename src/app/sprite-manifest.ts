export interface ManifestVariantFrame {
  readonly id: string;
  readonly variant: string;
  readonly frame: number;
  readonly url: string;
}

export interface PublishedManifest {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly frames: readonly ManifestVariantFrame[];
}

/** Frames for one colour variant, ordered by frame number. */
export function framesForVariant(manifest: PublishedManifest, variantId: string): ManifestVariantFrame[] {
  return manifest.frames.filter((frame) => frame.variant === variantId).sort((a, b) => a.frame - b.frame);
}
