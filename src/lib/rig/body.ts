/** Body metrics — named constants only (CLAUDE rule 10). Units: abstract metres, y-down screen space handled by renderer. */
export const BODY = { thigh: 0.42, shin: 0.42, foot: 0.24, upperArm: 0.30, forearm: 0.28, hand: 0.16, torso: 0.52, neck: 0.10, headR: 0.11 } as const;
export interface Persona { readonly id: string; readonly label: string; readonly skin: string; readonly top: string; readonly shorts: string; readonly shoe: string; readonly hair: string; readonly scale: number }
/** Skinnable personas (PR#1 skin-registry + PR#2/PR#3 persona strengths, data-only). */
export const PERSONAS: readonly Persona[] = [
  { id: 'sg-female', label: 'SG Chinese — female runner', skin: '#c98d64', top: '#2563eb', shorts: '#172554', shoe: '#f8fafc', hair: '#1c1917', scale: 0.96 },
  { id: 'sg-male', label: 'SG Chinese — male runner', skin: '#b07a4f', top: '#dc2626', shorts: '#111827', shoe: '#fef08a', hair: '#111827', scale: 1.0 },
  { id: 'cobalt', label: 'Cobalt (reference-sheet blue)', skin: '#8d5524', top: '#1d4ed8', shorts: '#1e3a8a', shoe: '#ffffff', hair: '#292524', scale: 1.0 },
];
