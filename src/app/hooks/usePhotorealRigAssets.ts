import { useEffect, useState } from 'react';
import type {
  BodyPartId,
  PhotorealPersonaId,
  RasterImage,
  RunnerPersonaId,
} from '../../shared/types.js';
import { ARTICULATED_BODY_PARTS } from '../../runner/body-proportions.js';
import {
  hasPhotorealPartBankForPersona,
  type PhotorealPartBank,
  setPhotorealPartBankForPersona,
} from '../../runner/photoreal-rig.js';
import { isPhotorealPersona } from '../../runner/skin-registry.js';

export type PhotorealLoadStatus = 'idle' | 'loaded' | 'error';

export function buildPhotorealPartAssetUrl(
  folder: string,
  partId: BodyPartId,
  revision: string,
): string {
  return `/sprites/photoreal/${folder}/parts/${partId}.png?v=${encodeURIComponent(revision)}`;
}

export interface PhotorealPartContentManifest {
  readonly personaFolder: string;
  readonly parts: Readonly<Record<string, string>>;
}

export async function loadPhotorealPartContentManifest(
  folder: string,
): Promise<PhotorealPartContentManifest | null> {
  try {
    const response = await fetch(
      `/sprites/photoreal/${folder}/parts-manifest.json`,
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PhotorealPartContentManifest;
  } catch {
    return null;
  }
}

export function resolvePartContentRevision(
  manifest: PhotorealPartContentManifest | null,
  partId: BodyPartId,
  fallbackRevision: string,
): string {
  const contentHash = manifest?.parts[partId];
  if (!contentHash) {
    return fallbackRevision;
  }
  return contentHash;
}

export function isCompletePhotorealBank(bank: PhotorealPartBank): boolean {
  return ARTICULATED_BODY_PARTS.every((part) => Boolean(bank[part.partId]));
}

export interface PhotorealAssetsState {
  readonly status: PhotorealLoadStatus;
  readonly retryPhotorealAssets: () => void;
}

export function isPhotorealExportBlocked(
  personaId: string,
  status: PhotorealLoadStatus,
): boolean {
  return (
    isPhotorealPersona(personaId as RunnerPersonaId) && status !== 'loaded'
  );
}

function hasAllPhotorealBanks(): boolean {
  return (
    hasPhotorealPartBankForPersona('photo-sg-chinese-female') &&
    hasPhotorealPartBankForPersona('photo-sg-chinese-female-average') &&
    hasPhotorealPartBankForPersona('photo-sg-chinese-female-petite')
  );
}

export function usePhotorealRigAssetsWithRetry(): PhotorealAssetsState {
  const [status, setStatus] = useState<PhotorealLoadStatus>(
    hasAllPhotorealBanks() ? 'loaded' : 'idle',
  );
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    if (hasAllPhotorealBanks() || typeof Image === 'undefined') {
      return;
    }
    let cancelled = false;
    setStatus('idle');
    const fallbackRevision = Date.now().toString(36);
    Promise.all([
      loadPersonaPartsInBrowser('photo-sg-chinese-female', fallbackRevision),
      loadPersonaPartsInBrowser('photo-sg-chinese-female-average', fallbackRevision),
      loadPersonaPartsInBrowser('photo-sg-chinese-female-petite', fallbackRevision),
    ])
      .then(([athleticBank, averageBank, petiteBank]) => {
        if (cancelled) return;
        if (isCompletePhotorealBank(athleticBank)) {
          setPhotorealPartBankForPersona('photo-sg-chinese-female', athleticBank);
          if (isCompletePhotorealBank(averageBank)) {
            setPhotorealPartBankForPersona(
              'photo-sg-chinese-female-average',
              averageBank,
            );
          }
          if (isCompletePhotorealBank(petiteBank)) {
            setPhotorealPartBankForPersona(
              'photo-sg-chinese-female-petite',
              petiteBank,
            );
          }
          setStatus('loaded');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const retryPhotorealAssets = () => setRetryCount((n) => n + 1);
  return { status, retryPhotorealAssets };
}

export function usePhotorealRigAssets(): PhotorealLoadStatus {
  return usePhotorealRigAssetsWithRetry().status;
}

async function loadPersonaPartsInBrowser(
  personaId: PhotorealPersonaId,
  fallbackRevision: string,
): Promise<PhotorealPartBank> {
  const folder =
    personaId === 'photo-sg-chinese-female-petite'
      ? 'sg-chinese-female-petite'
      : personaId === 'photo-sg-chinese-female-average'
        ? 'sg-chinese-female-average'
        : 'sg-chinese-female';
  const contentManifest = await loadPhotorealPartContentManifest(folder);
  const entries = await Promise.all(
    ARTICULATED_BODY_PARTS.map(async (part) => {
      const revision = resolvePartContentRevision(
        contentManifest,
        part.partId,
        fallbackRevision,
      );
      const url = buildPhotorealPartAssetUrl(folder, part.partId, revision);
      const raster = await decodeUrlToRaster(url);
      return [part.partId, raster] as const;
    }),
  );
  const bank: Partial<Record<BodyPartId, RasterImage>> = {};
  for (const [partId, raster] of entries) {
    if (raster) {
      bank[partId] = raster;
    }
  }
  return bank;
}

function decodeUrlToRaster(url: string): Promise<RasterImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 160;
      canvas.height = img.naturalHeight || 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({
        width: canvas.width,
        height: canvas.height,
        data: new Uint8ClampedArray(imageData.data),
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
