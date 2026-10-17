import { poseAt, MOTIONS, type MotionId } from '../lib/gait/gait';
import { PERSONAS } from '../lib/rig/body';
import { buildScene } from '../lib/render/scene';
import { auditCycle } from '../lib/analysis/cycle';
const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="runner-stage__canvas"]')!;
const ctx = canvas.getContext('2d')!; let phase = 0, playing = true, motion: MotionId = 'run', persona = PERSONAS[0]!;
function draw(): void { const pose = poseAt(phase, MOTIONS[motion]); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const op of buildScene(pose, persona)) { ctx.strokeStyle = op.color; ctx.fillStyle = op.color; ctx.lineCap = 'round';
    if (op.kind === 'ground') { ctx.beginPath(); ctx.moveTo(0, 285); ctx.lineTo(canvas.width, 285); ctx.stroke(); }
    else if (op.kind === 'circle' && op.from) { ctx.beginPath(); ctx.arc(200 + op.from[0] * 140, 285 - op.from[1] * 140, (op.r ?? .1) * 140, 0, 7); ctx.fill(); }
    else if (op.from && op.to) { ctx.lineWidth = (op.r ?? .04) * 280; ctx.beginPath(); ctx.moveTo(200 + op.from[0] * 140, 285 - op.from[1] * 140); ctx.lineTo(200 + op.to[0] * 140, 285 - op.to[1] * 140); ctx.stroke(); } }
  const el = document.querySelector('[data-testid="runner-stage__audit"]'); if (el) el.textContent = `phase ${phase.toFixed(2)} · foot crossings/cycle ${auditCycle().footCrossings} · audit: analytic only, filmstrip review pending`; }
function tick(): void { if (playing) phase = (phase + 0.008) % 1; draw(); requestAnimationFrame(tick); }
document.querySelector('[data-testid="runner-controls__play"]')?.addEventListener('click', () => { playing = !playing; });
document.querySelector<HTMLSelectElement>('[data-testid="runner-controls__motion"]')?.addEventListener('change', e => { motion = (e.target as HTMLSelectElement).value as MotionId; });
document.querySelector<HTMLSelectElement>('[data-testid="runner-controls__persona"]')?.addEventListener('change', e => { persona = PERSONAS.find(p => p.id === (e.target as HTMLSelectElement).value) ?? PERSONAS[0]!; });
document.querySelector<HTMLInputElement>('[data-testid="runner-controls__scrub"]')?.addEventListener('input', e => { playing = false; phase = Number((e.target as HTMLInputElement).value); });
tick();
