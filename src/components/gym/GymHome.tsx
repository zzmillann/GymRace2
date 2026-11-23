'use client';

// «Hoy»: la sesión que toca (con su mapa muscular), empezar o seguir el entreno, la semana y lo último.
import { Play, Plus, Moon, ChevronRight, Flame, Trophy } from 'lucide-react';
import { useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';
import { BodyMap } from './BodyMap';
import { byId } from '@/lib/gym/catalog';
import { fmtKg, iso, nextSession, routineForDate, routineMuscles, weekdayOf, WEEKDAYS, WEEKDAYS_SHORT, workoutMinutes, workoutSets, workoutVolume } from '@/lib/gym/calc';

export function GymHome({ onOpenWorkout, onGoPlan }: { onOpenWorkout: () => void; onGoPlan: () => void }) {
  const { plan, routines, history, active, startWorkout, customExercises } = useGymStore();
  const unit = useAppStore((s) => s.settings.weightUnit);
  const today = new Date();
  const routine = routineForDate(plan, routines, history, today);
  const doneToday = history.some((w) => w.date.slice(0, 10) === iso(today));
  const next = routine ? null : nextSession(plan, routines, history, today);

  // semana actual (lunes → domingo) con los días entrenados
  const monday = new Date(today); monday.setDate(today.getDate() - weekdayOf(today));
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const trained = new Set(history.map((w) => w.date.slice(0, 10)));
  const thisWeek = history.filter((w) => w.date.slice(0, 10) >= iso(monday));
  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const prs = (w: (typeof history)[number]) => w.entries.reduce((a, e) => a + e.sets.filter((s) => s.pr).length, 0);

  const start = (r = routine) => { startWorkout(r || null); onOpenWorkout(); };

  return (
    <div className="flex flex-col gap-5">
      {/* Sesión de hoy */}
      {active ? (
        <button onClick={onOpenWorkout} className="og-card p-4 text-left flex items-center gap-4" style={{ borderColor: 'rgb(var(--accent) / .45)' }}>
          <span className="w-11 h-11 rounded-full grid place-items-center" style={{ background: 'rgb(var(--accent))', color: '#0c0e12' }}><Play size={20} fill="currentColor" /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-accent uppercase tracking-wide">Entreno en curso</div>
            <div className="text-[17px] font-semibold text-content truncate">{active.name}</div>
            <div className="text-[13px] text-muted">{active.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)} de {active.entries.reduce((a, e) => a + e.sets.length, 0)} series</div>
          </div>
          <ChevronRight className="text-muted" size={20} />
        </button>
      ) : routine ? (
        <div className="og-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-muted uppercase tracking-wide">Hoy · {WEEKDAYS[weekdayOf(today)]}</div>
              <div className="text-[22px] font-semibold text-content leading-tight mt-0.5">{routine.name}</div>
              <div className="text-[13px] text-muted mt-1">{routine.items.length} ejercicios · {routine.items.reduce((a, i) => a + i.sets.length, 0)} series{routine.deload ? ' · descarga' : ''}</div>
              <ul className="mt-3 flex flex-col gap-1">
                {routine.items.slice(0, 5).map((it) => (
                  <li key={it.uid} className="text-[14px] text-content truncate">{byId(it.exId, customExercises)?.name || it.exId} <span className="text-muted">· {it.sets.length}×{it.sets[0]?.reps ?? (it.sets[0]?.seconds ? `${it.sets[0].seconds}s` : '')}</span></li>
                ))}
                {routine.items.length > 5 && <li className="text-[13px] text-muted">y {routine.items.length - 5} más</li>}
              </ul>
            </div>
            <BodyMap size={92} values={routineMuscles(routine, customExercises)} />
          </div>
          <button onClick={() => start()} className="og-btn w-full mt-4"><Play size={18} fill="currentColor" /> {doneToday ? 'Entrenar otra vez' : 'Empezar entreno'}</button>
        </div>
      ) : (
        <div className="og-card p-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full grid place-items-center bg-surface-2 text-muted"><Moon size={20} /></span>
            <div className="flex-1">
              <div className="text-[17px] font-semibold text-content">{routine === null ? 'Hoy toca descanso' : 'Aún no tienes plan'}</div>
              <div className="text-[13px] text-muted">
                {routine === null && next ? `Próxima sesión: ${WEEKDAYS[weekdayOf(next.date)].toLowerCase()} · ${next.routine.name}` : routine === undefined ? 'Crea tus rutinas o carga un plan de inicio.' : 'No hay más sesiones en las próximas dos semanas.'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {routine === undefined && <button onClick={onGoPlan} className="og-btn flex-1">Crear plan</button>}
            <button onClick={() => start(null)} className="og-btn soft flex-1"><Plus size={18} /> Entreno libre</button>
          </div>
        </div>
      )}

      {/* La semana */}
      <div>
        <div className="og-label">Esta semana</div>
        <div className="og-card p-3">
          <div className="grid grid-cols-7 gap-1">
            {week.map((d, i) => {
              const k = iso(d); const isToday = k === iso(today); const done = trained.has(k);
              const planned = routineForDate(plan, routines, history, d);
              return (
                <div key={k} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-accent' : 'text-muted'}`}>{WEEKDAYS_SHORT[i]}</span>
                  <span className="w-8 h-8 rounded-full grid place-items-center text-[13px] font-semibold og-num"
                    style={done ? { background: 'rgb(var(--accent))', color: '#0c0e12' } : isToday ? { boxShadow: 'inset 0 0 0 2px rgb(var(--accent))', color: 'rgb(var(--content))' } : { background: 'rgb(var(--surface-2))', color: planned ? 'rgb(var(--content))' : 'rgb(var(--muted))' }}>
                    {d.getDate()}
                  </span>
                  <span className="h-1 w-1 rounded-full" style={{ background: planned && !done ? 'rgb(var(--muted))' : 'transparent' }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-line/10 text-[13px]">
            <span className="text-muted"><b className="text-content og-num">{thisWeek.length}</b> entrenos</span>
            <span className="text-muted"><b className="text-content og-num">{thisWeek.reduce((a, w) => a + workoutSets(w), 0)}</b> series</span>
            <span className="text-muted"><b className="text-content og-num">{fmtKg(thisWeek.reduce((a, w) => a + workoutVolume(w), 0), unit)}</b> {unit}</span>
          </div>
        </div>
      </div>

      {/* Últimos entrenos */}
      <div>
        <div className="og-label">Últimos entrenos</div>
        {recent.length === 0 ? (
          <div className="og-card p-5 text-center text-[14px] text-muted"><Flame size={22} className="mx-auto mb-2 text-accent" />Tu primer entreno aparecerá aquí.</div>
        ) : (
          <div className="og-group">
            {recent.map((w) => (
              <div key={w.id} className="og-row">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-content truncate">{w.name}</div>
                  <div className="text-[13px] text-muted">{new Date(w.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {workoutMinutes(w) || '—'} min · {workoutSets(w)} series</div>
                </div>
                {prs(w) > 0 && <span className="og-chip on"><Trophy size={12} /> {prs(w)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
