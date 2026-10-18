import type { PhotorealPersonaId } from '../shared/types.js';

export type PersonaBuildTier = 'petite' | 'athletic' | 'average';

export function resolveBuildTier(personaId: PhotorealPersonaId): PersonaBuildTier {
  if (personaId === 'photo-sg-chinese-female-petite') return 'petite';
  if (personaId === 'photo-sg-chinese-female-average') return 'average';
  return 'athletic';
}
