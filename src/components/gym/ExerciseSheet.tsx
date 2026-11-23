'use client';

// Ficha de un ejercicio: músculos, material, pasos, multimedia propia e historial (récords, curva de 1RM, últimas sesiones).
import { useEffect, useMemo, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BodyMap } from './BodyMap';
import { byId } from '@/lib/gym/catalog';
import { bests, e1rmSeries, fmtKg } from '@/lib/gym/calc';
import { equipmentName, muscleName } from '@/lib/gym/muscles';
import type { ExerciseKind, MuscleId } from '@/lib/gym/types';
import { useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';

export const KIND_NAMES: Record<ExerciseKind, string> = { weight: 'Peso × reps', reps: 'Solo reps', time: 'Tiempo', cardio: 'Cardio' };

export interface ExMedia { type: string; data: string }
export const mediaKey = (id: string) => `gr_ex_media_${id}`;
export function readMedia(id: string): ExMedia | null {
  try { const raw = localStorage.getItem(mediaKey(id)); return raw ? (JSON.parse(raw) as ExMedia) : null; } catch { return null; }
}

const fmtDate = (d: string) => new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export function ExerciseSheet({ exId, onClose }: { exId: string; onClose: () => void }) {
  const custom = useGymStore((s) => s.customExercises);
  const history = useGymStore((s) => s.history);
  const bodyweights = useGymStore((s) => s.bodyweights);
  const unit = useAppStore((s) => s.settings.weightUnit);
  const ex = byId(exId, custom);
  const [media, setMedia] = useState<ExMedia | null>(null);
  useEffect(() => { setMedia(readMedia(exId)); }, [exId]);

  const best = useMemo(() => bests(history, exId), [history, exId]);
  const series = useMemo(() => e1rmSeries(history, exId).map((p) => ({ ...p, v: Number(fmtKg(p.e1rm, unit)) })), [history, exId, unit]);
  const sessions = useMemo(() => [...history]
    .filter((w) => w.entries.some((e) => e.exId === exId && e.sets.some((s) => s.done)))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    .map((w) => {
      const sets = w.entries.filter((e) => e.exId === exId).flatMap((e) => e.sets.filter((s) => s.done));
      const txt = sets.map((s) => {
        if (s.seconds && !s.reps) return `${s.seconds} s${s.distanceKm ? ` · ${s.distanceKm} km` : ''}`;
        const reps = (s.reps || 0) + (s.repsLeft ? `/${s.repsLeft}` : '');
        return s.kg ? `${fmtKg(s.kg, unit)}×${reps}` : `${reps} reps`;
      }).join(', ');
      return { id: w.id, date: w.date, txt, pr: sets.some((s) => s.pr) };
    }), [history, exId, unit]);
  const bw = bodyweights.length ? bodyweights[bodyweights.length - 1].kg : 0;

  const values: Partial<Record<MuscleId, number>> = {};
  ex?.secondary.forEach((m) => { values[m] = 0.5; });
  ex?.primary.forEach((m) => { values[m] = 1; });

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-app/90 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-app rounded-t-3xl sm:rounded-3xl border border-line/10 p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-content leading-tight">{ex?.name || 'Ejercicio no encontrado'}</h2>
            {ex && <p className="text-sm text-muted mt-0.5">{equipmentName(ex.equipment)} · {KIND_NAMES[ex.kind]}{ex.perSide ? ' · por lado' : ''}{ex.custom ? ' · propio' : ''}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 -m-1 rounded-full bg-surface-2 text-muted"><X size={18} /></button>
        </div>

        {ex && (
          <>
            <div className="og-card p-3 flex items-center gap-4 mb-4">
              <BodyMap values={values} size={150} label />
              <div className="flex-1 min-w-0 text-sm space-y-2">
                <div><div className="text-muted text-xs">Principales</div><div className="text-content font-medium">{ex.primary.map(muscleName).join(', ') || '—'}</div></div>
                {ex.secondary.length > 0 && <div><div className="text-muted text-xs">Secundarios</div><div className="text-content">{ex.secondary.map(muscleName).join(', ')}</div></div>}
              </div>
            </div>

            {media && (
              <div className="og-card overflow-hidden mb-4">
                {media.type.startsWith('video/')
                  ? <video src={media.data} controls loop muted playsInline className="w-full max-h-72 object-contain bg-black" />
                  : <img src={media.data} alt={ex.name} className="w-full max-h-72 object-contain bg-black" />}
              </div>
            )}

            {ex.steps.length > 0 && (
              <div className="mb-4">
                <div className="og-label">Cómo se hace</div>
                <ol className="og-card p-3 space-y-2">
                  {ex.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-content">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-surface-2 text-accent text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="og-label">Tu historial</div>
            {sessions.length === 0 ? (
              <div className="og-card p-4 text-sm text-muted text-center">Aún no lo has hecho. Cuando lo registres verás aquí tus récords y tu progreso.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="Mejor peso" value={best.kg ? `${fmtKg(best.kg, unit)} ${unit}` : '—'} />
                  <Stat label="1RM estimado" value={best.e1rm ? `${fmtKg(best.e1rm, unit)} ${unit}` : '—'} sub={bw && best.e1rm ? `${Math.round((best.e1rm / bw) * 100)} % de tu peso` : undefined} />
                  <Stat label={best.seconds && !best.reps ? 'Mejor tiempo' : 'Más reps'} value={best.seconds && !best.reps ? `${best.seconds} s` : String(best.reps || '—')} />
                </div>
                {series.length >= 2 && (
                  <div className="og-card p-3 mb-3">
                    <div className="text-xs text-muted mb-1">1RM estimado ({unit})</div>
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                          <CartesianGrid stroke="rgb(var(--line) / .06)" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={24} />
                          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} width={44} />
                          <Tooltip
                            contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line) / .1)', borderRadius: 10, fontSize: 12 }}
                            labelFormatter={(l) => fmtDate(String(l))}
                            formatter={(v) => [`${v} ${unit}`, '1RM est.']}
                          />
                          <Line type="monotone" dataKey="v" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 2, fill: 'rgb(var(--accent))' }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <div className="og-group">
                  {sessions.map((s) => (
                    <div key={s.id} className="og-row">
                      <div className="w-20 shrink-0 text-xs text-muted og-num">{fmtDate(s.date)}</div>
                      <div className="flex-1 min-w-0 text-sm text-content og-num">{s.txt}</div>
                      {s.pr && <Trophy size={14} className="og-warn shrink-0" aria-label="Récord" />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="og-card p-2.5">
      <div className="text-[11px] text-muted leading-tight">{label}</div>
      <div className="text-base font-bold text-content og-num mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted leading-tight mt-0.5">{sub}</div>}
    </div>
  );
}
