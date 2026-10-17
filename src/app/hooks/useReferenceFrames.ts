import { useEffect, useState } from "react";
import { framesForVariant, type ManifestVariantFrame, type PublishedManifest } from "../sprite-manifest.ts";

export type ReferenceState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly frames: readonly ManifestVariantFrame[] }
  | { readonly status: "failed"; readonly message: string };

const MANIFEST_URL = "/sprites/running-cycle-8frame/manifest.json";

/** Loads the extracted reference frames from the public manifest for one colour variant. */
export function useReferenceFrames(variantId: string): ReferenceState {
  const [state, setState] = useState<ReferenceState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(MANIFEST_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`manifest request failed with ${response.status}`);
        return response.json() as Promise<PublishedManifest>;
      })
      .then((manifest) => {
        if (!cancelled) setState({ status: "ready", frames: framesForVariant(manifest, variantId) });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "failed", message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [variantId]);

  return state;
}
