'use client';

// Mapa del cuerpo propio de GymRace: figura frontal y trasera esquemática; cada zona se ilumina según su valor.
// values: músculo → 0..1 (o cualquier número; se normaliza al máximo). onPick: tocar un músculo.
import type { MuscleId } from '@/lib/gym/types';
import { muscleName } from '@/lib/gym/muscles';

type Zone = { m: MuscleId; d: string };

// Coordenadas en un lienzo de 100×210 por figura. Formas simples y simétricas (se duplican con espejo).
const FRONT: Zone[] = [
  { m: 'front_delts', d: 'M30 46 q-8 2 -10 12 q4 4 10 2 q2 -8 4 -12 z' },
  { m: 'side_delts', d: 'M20 58 q-3 6 -2 12 q4 0 6 -4 q0 -6 -4 -8 z' },
  { m: 'chest', d: 'M35 46 q15 -4 15 2 v18 q-10 4 -18 0 q-4 -8 3 -20 z' },
  { m: 'biceps', d: 'M19 72 q-3 10 -1 20 q5 1 7 -2 q1 -10 -1 -18 z' },
  { m: 'forearms', d: 'M18 95 q-4 12 -3 24 q4 1 6 -1 q2 -12 2 -22 z' },
  { m: 'abs', d: 'M40 68 h10 v42 q-6 2 -10 -2 z' },
  { m: 'obliques', d: 'M33 70 q-3 16 1 34 q4 2 6 2 v-36 z' },
  { m: 'quads', d: 'M33 118 q-4 26 0 50 q6 3 10 0 q3 -26 -1 -48 q-5 -4 -9 -2 z' },
  { m: 'adductors', d: 'M44 120 q4 14 4 34 q-3 2 -5 -1 q-2 -16 -3 -32 z' },
  { m: 'calves', d: 'M34 176 q-3 14 0 26 q5 2 7 0 q1 -14 -1 -26 z' },
];
const BACK: Zone[] = [
  { m: 'traps', d: 'M38 34 q12 -4 12 6 v16 q-8 -2 -14 -10 q-2 -8 2 -12 z' },
  { m: 'rear_delts', d: 'M30 46 q-8 2 -10 12 q4 4 10 2 q2 -8 4 -12 z' },
  { m: 'upper_back', d: 'M35 50 q8 6 15 8 v12 q-8 0 -14 -4 q-3 -8 -1 -16 z' },
  { m: 'lats', d: 'M32 62 q-2 18 4 32 q6 2 14 0 v-22 q-10 -2 -18 -10 z' },
  { m: 'triceps', d: 'M19 70 q-3 10 -1 20 q5 1 7 -2 q1 -10 -1 -18 z' },
  { m: 'forearms', d: 'M18 95 q-4 12 -3 24 q4 1 6 -1 q2 -12 2 -22 z' },
  { m: 'lower_back', d: 'M40 94 h10 v16 h-10 q-2 -8 0 -16 z' },
  { m: 'glutes', d: 'M33 110 q8 -4 17 0 v18 q-9 4 -17 -2 q-3 -8 0 -16 z' },
  { m: 'hamstrings', d: 'M33 130 q-3 20 0 38 q6 3 10 0 q2 -20 0 -38 q-5 -3 -10 0 z' },
  { m: 'calves', d: 'M33 174 q-4 12 0 26 q6 2 8 0 q2 -14 -1 -26 q-4 -2 -7 0 z' },
];

// Silueta (cabeza, tronco, brazos, piernas) en gris de fondo
const SIL = 'M50 6 a10 11 0 1 1 0.1 0 z M38 30 h24 q14 4 20 16 q6 22 6 46 q2 14 0 28 h-6 q-2 -20 -6 -36 l-2 20 q0 4 -2 10 q4 30 0 60 q2 14 0 28 h-12 q-2 -24 -2 -48 q-2 -10 -6 -24 q-4 14 -6 24 q0 24 -2 48 h-12 q-2 -14 0 -28 q-4 -30 0 -60 q-2 -6 -2 -10 l-2 -20 q-4 16 -6 36 h-6 q-2 -14 0 -28 q0 -24 6 -46 q6 -12 20 -16 z';

export function BodyMap({ values = {}, onPick, selected, size = 120, color = 'rgb(var(--accent))', showBack = true, label }: {
  values?: Partial<Record<MuscleId, number>>; onPick?: (m: MuscleId) => void; selected?: MuscleId | null;
  size?: number; color?: string; showBack?: boolean; label?: boolean;
}) {
  const max = Math.max(1e-9, ...Object.values(values).map((v) => v || 0));
  const fill = (m: MuscleId) => {
    const v = (values[m] || 0) / max;
    if (selected === m) return color;
    return v > 0 ? color : 'rgb(var(--line) / .17)';
  };
  const op = (m: MuscleId) => (selected === m ? 1 : (values[m] || 0) > 0 ? 0.25 + 0.75 * ((values[m] || 0) / max) : 1);
  const zone = (z: Zone, k: string) => (
    <g key={k} onClick={onPick ? () => onPick(z.m) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
      <title>{muscleName(z.m)}</title>
      <path d={z.d} fill={fill(z.m)} fillOpacity={op(z.m)} />
      <path d={z.d} transform="translate(100 0) scale(-1 1)" fill={fill(z.m)} fillOpacity={op(z.m)} />
    </g>
  );
  const fig = (zones: Zone[], key: string, title: string) => (
    <svg key={key} viewBox="0 0 100 210" width={size * 0.5} height={size} role="img" aria-label={title}>
      <path d={SIL} fill="rgb(var(--line) / .07)" />
      {zones.map((z, i) => zone(z, `${key}${i}`))}
    </svg>
  );
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: size * 0.06 }}>
        {fig(FRONT, 'f', 'Vista frontal')}
        {showBack && fig(BACK, 'b', 'Vista trasera')}
      </div>
      {label && showBack && <div style={{ display: 'flex', gap: size * 0.3, fontSize: 10, color: 'rgb(var(--muted))' }}><span>Delante</span><span>Detrás</span></div>}
    </div>
  );
}
