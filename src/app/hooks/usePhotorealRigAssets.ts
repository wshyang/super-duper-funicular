import { useEffect, useState } from 'react';
import type { BodyPartId, RasterImage } from '../../shared/types.js';
import { ARTICULATED_BODY_PARTS } from '../../runner/body-proportions.js';
import {
  hasPhotorealFemalePartBank,
  type PhotorealPartBank,
  setPhotorealFemalePartBank,
} from '../../runner/photoreal-rig.js';

export type PhotorealLoadStatus = 'idle' | 'loaded';

export function usePhotorealRigAssets(): PhotorealLoadStatus {
  const [status, setStatus] = useState<PhotorealLoadStatus>(
    hasPhotorealFemalePartBank() ? 'loaded' : 'idle',
  );

  useEffect(() => {
    if (hasPhotorealFemalePartBank() || typeof Image === 'undefined') {
      return;
    }
    let cancelled = false;
    loadAllPartsInBrowser()
      .then((bank) => {
        if (!cancelled && Object.keys(bank).length > 0) {
          setPhotorealFemalePartBank(bank);
          setStatus('loaded');
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

async function loadAllPartsInBrowser(): Promise<PhotorealPartBank> {
  const entries = await Promise.all(
    ARTICULATED_BODY_PARTS.map(async (part) => {
      const url = `/sprites/photoreal/sg-chinese-female/parts/${part.partId}.png`;
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
