'use client';

// Plan de entreno: semana fija o rotación, mis rutinas (con editor completo), planes de inicio y mover sesiones.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp, Link2, Moon, Plus, Search, Trash2, X } from 'lucide-react';
import { useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';
import { BodyMap } from '@/components/gym/BodyMap';
import { CATALOG, byId, norm } from '@/lib/gym/catalog';
import { MUSCLES } from '@/lib/gym/muscles';
import { STARTER_PLANS, WEEKDAYS, fmtKg, iso, routineForDate, routineMuscles, toKg, uid } from '@/lib/gym/calc';
import type { CatalogExercise, MuscleId, PlannedSet, ProgressionRule, Routine, RoutineItem, SetType, Weekday } from '@/lib/gym/types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SET_TYPES: { id: SetType; name: string; short: string }[] = [
  { id: 'normal', name: 'Normal', short: 'N' },
  { id: 'warmup', name: 'Calentamiento', short: 'W' },
  { id: 'drop', name: 'Drop', short: 'D' },
  { id: 'restpause', name: 'Rest-pause', short: 'RP' },
];

// ───────────────────────── piezas comunes ─────────────────────────

function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div onClick={(e) => e.stopPropagation()}
            className={`flex w-full max-w-md flex-col bg-app ${full ? 'h-[100dvh]' : 'max-h-[85dvh] rounded-t-2xl'}`}
            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="font-display text-lg text-content">{title}</h2>
              <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-surface-2 p-1.5 text-muted"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-2'}`}>
      <span className={`absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-[2px]'}`} />
    </button>
  );
}

/** Campo numérico que deja escribir decimales a medias ("2," → 2.5) sin perder lo tecleado. */
function NumInput({ value, onChange, placeholder, decimal, className = '', ariaLabel }: {
  value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; decimal?: boolean; className?: string; ariaLabel?: string;
}) {
  const show = (v: number | undefined) => (v == null || Number.isNaN(v) ? '' : String(v));
  const [txt, setTxt] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(show(value)); }, [value]);
  return (
    <input aria-label={ariaLabel} inputMode={decimal ? 'decimal' : 'numeric'} placeholder={placeholder} value={txt}
      className={`og-input og-num min-h-[36px] px-2 text-center text-[15px] ${className}`}
      onFocus={(e) => { focused.current = true; e.target.select(); }}
      onBlur={() => { focused.current = false; setTxt(show(value)); }}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        setTxt(e.target.value);
        if (t.trim() === '') return onChange(undefined);
        const n = decimal ? parseFloat(t) : parseInt(t, 10);
        if (!Number.isNaN(n)) onChange(n);
      }} />
  );
}

/** Buscador de ejercicios: texto + filtro por músculo, sobre el catálogo y los ejercicios propios. */
function ExercisePicker({ open, onClose, onPick, title = 'Añadir ejercicio' }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title?: string }) {
  const custom = useGymStore((s) => s.customExercises);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const list = useMemo(() => {
    const all: CatalogExercise[] = [...custom, ...CATALOG];
    const nq = norm(q.trim());
    return all.filter((e) => (!nq || norm(e.name).includes(nq)) && (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)))
      .sort((a, b) => (muscle ? Number(b.primary.includes(muscle)) - Number(a.primary.includes(muscle)) : 0));
  }, [custom, q, muscle]);
  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="og-input pl-9" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button className={`og-chip shrink-0 ${!muscle ? 'on' : ''}`} onClick={() => setMuscle(null)}>Todos</button>
        {MUSCLES.map((m) => (
          <button key={m.id} className={`og-chip shrink-0 ${muscle === m.id ? 'on' : ''}`} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>{m.name}</button>
        ))}
      </div>
      <div className="og-group">
        {list.map((e) => (
          <button key={e.id} className="og-row w-full text-left" onClick={() => { onPick(e.id); setQ(''); onClose(); }}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-content">{e.name}{e.custom && <span className="og-chip ml-2">Propio</span>}</div>
              <div className="truncate text-xs text-muted">{e.primary.map((m) => MUSCLES.find((x) => x.id === m)?.name).join(', ')}</div>
            </div>
            <Plus size={18} className="text-accent" />
          </button>
        ))}
        {!list.length && <div className="og-row text-sm text-muted">No hay ejercicios con ese filtro.</div>}
      </div>
    </Sheet>
  );
}

// ───────────────────────── vista del plan ─────────────────────────

export function PlanView() {
  const plan = useGymStore((s) => s.plan);
  const routines = useGymStore((s) => s.routines);
  const custom = useGymStore((s) => s.customExercises);
  const setPlan = useGymStore((s) => s.setPlan);
  const loadStarter = useGymStore((s) => s.loadStarter);

  const [pickDay, setPickDay] = useState<Weekday | null>(null);
  const [addRot, setAddRot] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [moving, setMoving] = useState(false);

  const rName = (id: string | null | undefined) => routines.find((r) => r.id === id)?.name;

  const moveRot = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= plan.rotation.length) return;
    const rot = [...plan.rotation]; [rot[i], rot[j]] = [rot[j], rot[i]];
    setPlan({ rotation: rot });
  };

  const startStarter = (id: string, name: string) => {
    if (routines.length && !window.confirm(`Se añadirán las rutinas de «${name}» y se reemplazará tu semana. Tus rutinas actuales no se borran. ¿Continuar?`)) return;
    loadStarter(id);
  };

  const newRoutine = () => setEditing({ id: uid(), name: '', items: [] });

  return (
    <div className="space-y-6 pb-6">
      <div className="og-seg">
        <button className={plan.mode === 'week' ? 'on' : ''} onClick={() => setPlan({ mode: 'week' })}>Semana</button>
        <button className={plan.mode === 'rotation' ? 'on' : ''} onClick={() => setPlan({ mode: 'rotation' })}>Rotación</button>
      </div>

      {plan.mode === 'week' ? (
        <section>
          <div className="og-label">Tu semana</div>
          <div className="og-group">
            {WEEKDAYS.map((d, i) => {
              const id = plan.week[i as Weekday];
              const r = routines.find((x) => x.id === id);
              return (
                <button key={d} className="og-row w-full text-left" onClick={() => setPickDay(i as Weekday)}>
                  <span className="w-[86px] shrink-0 text-sm text-muted">{d}</span>
                  <span className={`min-w-0 flex-1 truncate ${r ? 'text-content' : 'text-muted'}`}>
                    {r ? r.name : <span className="inline-flex items-center gap-1.5"><Moon size={14} /> Descanso</span>}
                  </span>
                  {r && <BodyMap size={44} showBack={false} values={routineMuscles(r, custom)} />}
                  <ChevronRight size={16} className="text-muted" />
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="og-label">Orden de la rotación</div>
          <div className="og-group">
            {plan.rotation.map((id, i) => (
              <div key={`${id}-${i}`} className="og-row">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">{LETTERS[i] || i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-content">{rName(id) || 'Rutina borrada'}</span>
                <button aria-label="Subir" disabled={i === 0} onClick={() => moveRot(i, -1)} className="p-1 text-muted disabled:opacity-30"><ChevronUp size={18} /></button>
                <button aria-label="Bajar" disabled={i === plan.rotation.length - 1} onClick={() => moveRot(i, 1)} className="p-1 text-muted disabled:opacity-30"><ChevronDown size={18} /></button>
                <button aria-label="Quitar" onClick={() => setPlan({ rotation: plan.rotation.filter((_, k) => k !== i) })} className="p-1 og-bad"><Trash2 size={16} /></button>
              </div>
            ))}
            <button className="og-row w-full text-accent" onClick={() => setAddRot(true)} disabled={!routines.length}>
              <Plus size={18} /> Añadir rutina a la rotación
            </button>
          </div>
          <p className="px-1.5 pt-2 text-xs text-muted">La siguiente sesión es la siguiente que no hayas hecho. Si un día no entrenas, no se pierde: sigue tocando la misma.</p>
        </section>
      )}

      <section>
        <div className="og-group">
          <button className="og-row w-full text-left" onClick={() => setMoving(true)}>
            <CalendarDays size={18} className="text-accent" />
            <span className="flex-1 text-content">Mover sesión</span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        </div>
      </section>

      <section>
        <div className="og-label">Mis rutinas</div>
        <div className="og-group">
          {routines.map((r) => (
            <button key={r.id} className="og-row w-full text-left" onClick={() => setEditing(r)}>
              <BodyMap size={44} showBack={false} values={routineMuscles(r, custom)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-content">{r.name}{r.deload && <span className="og-chip ml-2">Descarga</span>}</div>
                <div className="truncate text-xs text-muted">{r.items.length} ejercicios · {r.items.reduce((a, it) => a + it.sets.length, 0)} series</div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>
          ))}
          <button className="og-row w-full text-accent" onClick={newRoutine}><Plus size={18} /> Nueva rutina</button>
        </div>
      </section>

      <section>
        <div className="og-label">Planes de inicio</div>
        <div className="og-group">
          {STARTER_PLANS.map((p) => (
            <div key={p.id} className="og-row">
              <div className="min-w-0 flex-1">
                <div className="text-content">{p.name}</div>
                <div className="text-xs text-muted">{p.desc}</div>
              </div>
              <button className="og-btn soft min-h-[34px] px-3 text-sm" onClick={() => startStarter(p.id, p.name)}>Usar</button>
            </div>
          ))}
        </div>
        <p className="px-1.5 pt-2 text-xs text-muted">Se cargan como rutinas normales: luego puedes cambiarlas a tu gusto.</p>
      </section>

      {/* elegir rutina de un día */}
      <Sheet open={pickDay != null} onClose={() => setPickDay(null)} title={pickDay != null ? WEEKDAYS[pickDay] : ''}>
        <RoutineChoice routines={routines} current={pickDay != null ? plan.week[pickDay] ?? null : null}
          onPick={(id) => { if (pickDay != null) setPlan({ week: { ...plan.week, [pickDay]: id } }); setPickDay(null); }} />
      </Sheet>

      {/* añadir a la rotación */}
      <Sheet open={addRot} onClose={() => setAddRot(false)} title="Añadir a la rotación">
        <div className="og-group">
          {routines.map((r) => (
            <button key={r.id} className="og-row w-full text-left text-content" onClick={() => { setPlan({ rotation: [...plan.rotation, r.id] }); setAddRot(false); }}>
              <span className="flex-1">{r.name}</span><Plus size={18} className="text-accent" />
            </button>
          ))}
        </div>
      </Sheet>

      <MoveSessionSheet open={moving} onClose={() => setMoving(false)} />

      {editing && <RoutineEditor key={editing.id} initial={editing} isNew={!routines.some((r) => r.id === editing.id)} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RoutineChoice({ routines, current, onPick }: { routines: Routine[]; current: string | null; onPick: (id: string | null) => void }) {
  return (
    <div className="og-group">
      <button className="og-row w-full text-left" onClick={() => onPick(null)}>
        <Moon size={16} className="text-muted" /><span className="flex-1 text-content">Descanso</span>
        {!current && <Check size={18} className="text-accent" />}
      </button>
      {routines.map((r) => (
        <button key={r.id} className="og-row w-full text-left" onClick={() => onPick(r.id)}>
          <span className="flex-1 text-content">{r.name}</span>
          {current === r.id && <Check size={18} className="text-accent" />}
        </button>
      ))}
      {!routines.length && <div className="og-row text-sm text-muted">Aún no tienes rutinas. Crea una o carga un plan de inicio.</div>}
    </div>
  );
}

// ───────────────────────── mover sesión ─────────────────────────

function MoveSessionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plan = useGymStore((s) => s.plan);
  const routines = useGymStore((s) => s.routines);
  const history = useGymStore((s) => s.history);
  const moveSession = useGymStore((s) => s.moveSession);
  const setPlan = useGymStore((s) => s.setPlan);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState(0);
  const date = days[sel];
  const key = iso(date);
  const planned = routineForDate(plan, routines, history, date);
  const todayIso = iso(new Date());
  const futureMoves = Object.entries(plan.moves).filter(([k]) => k >= todayIso).sort(([a], [b]) => a.localeCompare(b));
  const label = (d: Date, i: number) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : WEEKDAYS[(d.getDay() + 6) % 7].slice(0, 3));

  const clearMove = (k: string) => { const m = { ...plan.moves }; delete m[k]; setPlan({ moves: m }); };

  return (
    <Sheet open={open} onClose={onClose} title="Mover sesión">
      <p className="mb-3 text-sm text-muted">Elige el día y qué quieres hacer ese día. Tu plan no cambia: solo ese día.</p>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button key={i} onClick={() => setSel(i)}
            className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-1.5 text-xs font-semibold ${sel === i ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'}`}>
            <span>{label(d, i)}</span><span className="og-num text-base">{d.getDate()}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 px-1.5 text-sm text-muted">
        Ahora toca: <span className="text-content">{planned ? planned.name : planned === null ? 'Descanso' : 'Nada planificado'}</span>
        {key in plan.moves && <span className="og-info"> (movido)</span>}
      </p>
      <RoutineChoice routines={routines} current={key in plan.moves ? plan.moves[key] : planned?.id ?? null}
        onPick={(id) => moveSession(key, id)} />
      {key in plan.moves && (
        <button className="og-btn soft mt-3 w-full" onClick={() => clearMove(key)}>Volver a lo del plan</button>
      )}
      {futureMoves.length > 0 && (
        <>
          <div className="og-label mt-5">Sesiones movidas</div>
          <div className="og-group">
            {futureMoves.map(([k, id]) => (
              <div key={k} className="og-row">
                <span className="og-num w-24 text-sm text-muted">{k.slice(8, 10)}/{k.slice(5, 7)}</span>
                <span className="flex-1 truncate text-content">{routines.find((r) => r.id === id)?.name || 'Descanso'}</span>
                <button aria-label="Quitar cambio" className="p-1 text-muted" onClick={() => clearMove(k)}><X size={16} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

// ───────────────────────── editor de rutina ─────────────────────────

const defaultSets = (ex: CatalogExercise | undefined): PlannedSet[] => {
  if (ex?.kind === 'time') return [0, 1, 2].map(() => ({ type: 'normal', seconds: 30 }));
  if (ex?.kind === 'cardio') return [{ type: 'normal', seconds: 600 }];
  return [0, 1, 2].map(() => ({ type: 'normal', reps: 10 }));
};

/** Quita ids de superserie que se han quedado con un solo ejercicio. */
const normalizeSupersets = (items: RoutineItem[]): RoutineItem[] => {
  const count: Record<string, number> = {};
  items.forEach((it) => { if (it.superset) count[it.superset] = (count[it.superset] || 0) + 1; });
  return items.map((it) => (it.superset && count[it.superset] < 2 ? { ...it, superset: undefined } : it));
};

function RoutineEditor({ initial, isNew, onClose }: { initial: Routine; isNew: boolean; onClose: () => void }) {
  const unit = useAppStore((s) => s.settings.weightUnit);
  const custom = useGymStore((s) => s.customExercises);
  const saveRoutine = useGymStore((s) => s.saveRoutine);
  const deleteRoutine = useGymStore((s) => s.deleteRoutine);
  const [r, setR] = useState<Routine>(() => JSON.parse(JSON.stringify(initial)));
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'backup'; uid: string }>(null);
  const [open, setOpen] = useState<string | null>(null);

  const setItems = (fn: (items: RoutineItem[]) => RoutineItem[]) => setR((x) => ({ ...x, items: normalizeSupersets(fn(x.items)) }));
  const patchItem = (u: string, p: Partial<RoutineItem>) => setItems((items) => items.map((it) => (it.uid === u ? { ...it, ...p } : it)));
  const patchSet = (u: string, i: number, p: Partial<PlannedSet>) => setItems((items) => items.map((it) => (it.uid === u ? { ...it, sets: it.sets.map((s, k) => (k === i ? { ...s, ...p } : s)) } : it)));
  const move = (i: number, d: -1 | 1) => setItems((items) => { const j = i + d; if (j < 0 || j >= items.length) return items; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const toggleSuperset = (i: number, on: boolean) => setItems((items) => {
    const n = items.map((x) => ({ ...x }));
    const next = n[i + 1]; if (!next) return items;
    if (on) {
      const id = n[i].superset || next.superset || uid();
      const oldNext = next.superset;
      n[i].superset = id; next.superset = id;
      // si el siguiente ya estaba en otro grupo, arrastra a todo ese grupo
      if (oldNext && oldNext !== id) n.forEach((x) => { if (x.superset === oldNext) x.superset = id; });
    } else {
      const id = n[i].superset; const fresh = uid();
      for (let j = i + 1; j < n.length && n[j].superset === id; j++) n[j].superset = fresh;
    }
    return n;
  });

  const save = () => {
    saveRoutine({ ...r, name: r.name.trim() || 'Rutina sin nombre', items: normalizeSupersets(r.items) });
    onClose();
  };
  const remove = () => {
    if (!window.confirm(`¿Borrar la rutina «${r.name || 'sin nombre'}»? Se quitará también de tu plan.`)) return;
    deleteRoutine(r.id); onClose();
  };

  const onPicked = (exId: string) => {
    if (!picker) return;
    if (picker.mode === 'add') {
      const ex = byId(exId, custom);
      const item: RoutineItem = { uid: uid(), exId, sets: defaultSets(ex), rest: ex?.kind === 'cardio' ? 60 : 90, progression: ex?.kind === 'weight' ? 'double' : 'none' };
      if (ex?.kind === 'weight') item.sets = item.sets.map((s) => ({ ...s, reps: 8, repsMax: 12 }));
      setItems((items) => [...items, item]);
      setOpen(item.uid);
    } else patchItem(picker.uid, { backupExId: exId });
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-app">
      <div className="flex h-[100dvh] w-full max-w-md flex-col">
        <div className="flex items-center gap-2 border-b border-line/10 px-4 py-3">
          <button className="text-sm text-muted" onClick={onClose}>Cancelar</button>
          <h2 className="font-display flex-1 text-center text-content">{isNew ? 'Nueva rutina' : 'Editar rutina'}</h2>
          <button className="text-sm font-semibold text-accent" onClick={save}>Guardar</button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-10 pt-4">
          <div className="og-group">
            <div className="og-row">
              <input className="og-input" placeholder="Nombre (p. ej. Empuje)" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} autoFocus={isNew} />
            </div>
            <div className="og-row">
              <div className="flex-1">
                <div className="text-content">Semana de descarga: −40 %</div>
                <div className="text-xs text-muted">Baja el peso para recuperar sin perder el ritmo.</div>
              </div>
              <Toggle on={!!r.deload} onChange={(v) => setR({ ...r, deload: v })} label="Semana de descarga" />
            </div>
          </div>

          <div>
            <div className="og-label">Ejercicios</div>
            <div className="space-y-2">
              {r.items.map((it, i) => {
                const ex = byId(it.exId, custom);
                const kind = ex?.kind || 'weight';
                const isOpen = open === it.uid;
                const next = r.items[i + 1];
                const inSS = !!it.superset && !!next && next.superset === it.superset;
                const prevSS = i > 0 && !!it.superset && r.items[i - 1].superset === it.superset;
                return (
                  <div key={it.uid} className={`og-card overflow-hidden ${it.superset ? 'border-l-[3px] !border-l-accent' : ''} ${prevSS ? '-mt-1' : ''}`}>
                    <div className="og-row">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : it.uid)}>
                        <div className="truncate text-content">{ex?.name || it.exId}</div>
                        <div className="truncate text-xs text-muted">
                          {summarySets(it.sets, kind, unit)} · {it.rest}s descanso{it.superset ? ' · Superserie' : ''}
                        </div>
                      </button>
                      <button aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-muted disabled:opacity-30"><ChevronUp size={18} /></button>
                      <button aria-label="Bajar" disabled={i === r.items.length - 1} onClick={() => move(i, 1)} className="p-1 text-muted disabled:opacity-30"><ChevronDown size={18} /></button>
                      <button aria-label="Quitar ejercicio" onClick={() => setItems((items) => items.filter((x) => x.uid !== it.uid))} className="p-1 og-bad"><Trash2 size={16} /></button>
                    </div>

                    {isOpen && (
                      <div className="space-y-3 border-t border-line/10 px-3.5 pb-3.5 pt-3">
                        {/* series */}
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5 px-1 text-[11px] font-semibold uppercase text-muted">
                            <span className="w-[74px]">Tipo</span>
                            {kind === 'time' || kind === 'cardio' ? <span className="flex-1">{kind === 'cardio' ? 'Minutos' : 'Segundos'}</span> : (
                              <><span className="flex-1">Reps (mín–máx)</span><span className="w-[64px]">{kind === 'reps' ? `+${unit}` : unit}</span></>
                            )}
                            <span className="w-7" />
                          </div>
                          {it.sets.map((s, k) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <select aria-label="Tipo de serie" value={s.type} onChange={(e) => patchSet(it.uid, k, { type: e.target.value as SetType })}
                                className="og-input min-h-[36px] w-[74px] px-1 text-xs">
                                {SET_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              {kind === 'time' || kind === 'cardio' ? (
                                kind === 'cardio' ? (
                                  <NumInput className="flex-1" decimal ariaLabel="Minutos" value={s.seconds != null ? Math.round((s.seconds / 60) * 10) / 10 : undefined}
                                    onChange={(v) => patchSet(it.uid, k, { seconds: v == null ? undefined : Math.round(v * 60) })} />
                                ) : (
                                  <NumInput className="flex-1" ariaLabel="Segundos" value={s.seconds} onChange={(v) => patchSet(it.uid, k, { seconds: v })} />
                                )
                              ) : (
                                <>
                                  <div className="flex flex-1 items-center gap-1">
                                    <NumInput ariaLabel="Repeticiones" value={s.reps} onChange={(v) => patchSet(it.uid, k, { reps: v })} />
                                    <span className="text-muted">–</span>
                                    <NumInput ariaLabel="Repeticiones máximas" placeholder="—" value={s.repsMax} onChange={(v) => patchSet(it.uid, k, { repsMax: v })} />
                                  </div>
                                  <NumInput className="!w-[64px]" decimal ariaLabel="Peso" placeholder="auto"
                                    value={s.kg != null ? Number(fmtKg(s.kg, unit)) : undefined}
                                    onChange={(v) => patchSet(it.uid, k, { kg: v == null ? undefined : toKg(v, unit) })} />
                                </>
                              )}
                              <button aria-label="Quitar serie" className="w-7 p-1 text-muted disabled:opacity-30" disabled={it.sets.length <= 1}
                                onClick={() => patchItem(it.uid, { sets: it.sets.filter((_, x) => x !== k) })}><X size={16} /></button>
                            </div>
                          ))}
                          <button className="og-btn soft min-h-[34px] w-full text-sm"
                            onClick={() => patchItem(it.uid, { sets: [...it.sets, { ...(it.sets[it.sets.length - 1] || { type: 'normal', reps: 10 }) }] })}>
                            <Plus size={16} /> Añadir serie
                          </button>
                          {kind !== 'time' && kind !== 'cardio' && <p className="px-1 text-[11px] text-muted">Deja el peso en «auto» para usar el del último entreno con la progresión.</p>}
                        </div>

                        <div className="og-group !bg-surface-2/40">
                          <div className="og-row">
                            <span className="flex-1 text-sm text-content">Descanso entre series</span>
                            <NumInput className="!w-[70px]" ariaLabel="Descanso en segundos" value={it.rest} onChange={(v) => patchItem(it.uid, { rest: v ?? 0 })} />
                            <span className="text-sm text-muted">s</span>
                          </div>
                          {kind !== 'time' && kind !== 'cardio' && (
                            <div className="space-y-2 px-3.5 py-3">
                              <div className="text-sm text-content">Progresión</div>
                              <div className="og-seg">
                                {(['none', 'linear', 'double'] as ProgressionRule[]).map((p) => (
                                  <button key={p} className={(it.progression || 'none') === p ? 'on' : ''} onClick={() => patchItem(it.uid, { progression: p })}>
                                    {p === 'none' ? 'Ninguna' : p === 'linear' ? 'Lineal' : 'Doble progresión'}
                                  </button>
                                ))}
                              </div>
                              {(it.progression === 'linear' || it.progression === 'double') && (
                                <div className="flex items-center gap-2">
                                  <span className="flex-1 text-xs text-muted">
                                    {it.progression === 'linear' ? 'Si haces todas las reps, sube cada sesión:' : 'Cuando todas las series llegan al máximo del rango, sube:'}
                                  </span>
                                  <span className="text-sm text-muted">+</span>
                                  <NumInput className="!w-[64px]" decimal ariaLabel="Incremento" placeholder={fmtKg(2.5, unit)}
                                    value={it.incrementKg != null ? Number(fmtKg(it.incrementKg, unit)) : undefined}
                                    onChange={(v) => patchItem(it.uid, { incrementKg: v == null ? undefined : toKg(v, unit) })} />
                                  <span className="text-sm text-muted">{unit}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {next && (
                            <div className="og-row">
                              <Link2 size={16} className="text-muted" />
                              <span className="flex-1 text-sm text-content">Superserie con el siguiente</span>
                              <Toggle on={inSS} onChange={(v) => toggleSuperset(i, v)} label="Superserie con el siguiente" />
                            </div>
                          )}
                          <div className="og-row">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-content">Alternativa si la máquina está ocupada</div>
                              <div className="truncate text-xs text-muted">{it.backupExId ? byId(it.backupExId, custom)?.name || it.backupExId : 'Ninguna'}</div>
                            </div>
                            {it.backupExId && <button aria-label="Quitar alternativa" className="p-1 text-muted" onClick={() => patchItem(it.uid, { backupExId: undefined })}><X size={16} /></button>}
                            <button className="og-btn soft min-h-[32px] px-3 text-sm" onClick={() => setPicker({ mode: 'backup', uid: it.uid })}>Elegir</button>
                          </div>
                          <div className="og-row">
                            <input className="og-input min-h-[36px] text-sm" placeholder="Nota (p. ej. asiento en 4)" value={it.note || ''}
                              onChange={(e) => patchItem(it.uid, { note: e.target.value || undefined })} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="og-btn soft w-full" onClick={() => setPicker({ mode: 'add' })}><Plus size={18} /> Añadir ejercicio</button>
            </div>
          </div>

          {!isNew && <button className="og-btn danger w-full" onClick={remove}><Trash2 size={16} /> Borrar rutina</button>}
        </div>
      </div>

      <ExercisePicker open={!!picker} onClose={() => setPicker(null)} onPick={onPicked}
        title={picker?.mode === 'backup' ? 'Elegir alternativa' : 'Añadir ejercicio'} />
    </div>
  );
}

function summarySets(sets: PlannedSet[], kind: string, unit: 'kg' | 'lb') {
  const work = sets.filter((s) => s.type !== 'warmup');
  const w = sets.length - work.length;
  const f = work[0];
  let core = `${work.length} series`;
  if (f) {
    if (kind === 'time') core = `${work.length}×${f.seconds || 0}s`;
    else if (kind === 'cardio') core = `${work.length}×${Math.round((f.seconds || 0) / 60)} min`;
    else core = `${work.length}×${f.reps ?? '?'}${f.repsMax ? `–${f.repsMax}` : ''}${f.kg != null ? ` · ${fmtKg(f.kg, unit)} ${unit}` : ''}`;
  }
  return w ? `${core} (+${w} calent.)` : core;
}
