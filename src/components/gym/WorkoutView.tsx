'use client';

// Entreno guiado a pantalla completa: series con peso/reps/tiempo, esfuerzo, récords, descanso y resumen final.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Calculator, Check, MoreHorizontal, Plus, Repeat, Search, StickyNote, Trash2, Trophy, X } from 'lucide-react';
import { useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';
import { confettiBig, haptic, playDing } from '@/lib/feedback';
import { CATALOG, byId, norm } from '@/lib/gym/catalog';
import { MUSCLES } from '@/lib/gym/muscles';
import { fmtKg, lastSets, setVolume, toKg, workoutMinutes, workoutSets, workoutVolume } from '@/lib/gym/calc';
import type { CatalogExercise, DoneSet, MuscleId, SetType, Workout, WorkoutEntry } from '@/lib/gym/types';
import { PlateCalc } from '@/components/gym/PlateCalc';

const BAR_EQUIP = ['barbell', 'ez_bar', 'trap_bar', 'smith'] as const;
type BarEquip = (typeof BAR_EQUIP)[number];
const NEXT_TYPE: Record<SetType, SetType> = { normal: 'warmup', warmup: 'drop', drop: 'restpause', restpause: 'normal' };

// ───────────────────────── piezas comunes ─────────────────────────

function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60" onClick={onClose}
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

function NumInput({ value, onChange, placeholder, decimal, className = '', ariaLabel, onFocus, onBlur }: {
  value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; decimal?: boolean; className?: string;
  ariaLabel?: string; onFocus?: () => void; onBlur?: () => void;
}) {
  const show = (v: number | undefined) => (v == null || Number.isNaN(v) ? '' : String(v));
  const [txt, setTxt] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(show(value)); }, [value]);
  return (
    <input aria-label={ariaLabel} inputMode={decimal ? 'decimal' : 'numeric'} placeholder={placeholder} value={txt}
      className={`og-input og-num min-h-[38px] w-full px-1 text-center text-[16px] ${className}`}
      onFocus={(e) => { focused.current = true; e.target.select(); onFocus?.(); }}
      onBlur={() => { focused.current = false; setTxt(show(value)); onBlur?.(); }}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        setTxt(e.target.value);
        if (t.trim() === '') return onChange(undefined);
        const n = decimal ? parseFloat(t) : parseInt(t, 10);
        if (!Number.isNaN(n)) onChange(n);
      }} />
  );
}

function ExercisePicker({ open, onClose, onPick, title }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title: string }) {
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
              <div className="truncate text-content">{e.name}</div>
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

// ───────────────────────── utilidades ─────────────────────────

const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

const effortClass = (mode: 'rir' | 'rpe', v: number | undefined) => {
  if (v == null) return '';
  if (mode === 'rir') return v <= 0 ? 'og-bad' : v <= 3 ? 'og-good' : 'og-warn';
  return v >= 10 ? 'og-bad' : v >= 7 ? 'og-good' : 'og-warn';
};
const EFFORT_HELP = {
  rir: 'RIR = repeticiones que te quedaban en reserva. 0 = al fallo, 2 = podrías haber hecho 2 más. Lo ideal suele ser 1–3.',
  rpe: 'RPE = esfuerzo del 6 al 10. 10 = no podías ni una más, 8 = te quedaban unas 2. Lo ideal suele ser 7–9.',
};

function prevText(s: DoneSet | undefined, kind: string, unit: 'kg' | 'lb') {
  if (!s) return '';
  if (kind === 'cardio') return `${Math.round((s.seconds || 0) / 60)} min${s.distanceKm ? ` · ${s.distanceKm} km` : ''}`;
  if (kind === 'time') return `${s.seconds || 0} s`;
  const reps = s.repsLeft != null ? `${s.repsLeft}/${s.reps ?? 0}` : `${s.reps ?? 0}`;
  if (kind === 'reps') return s.kg ? `+${fmtKg(s.kg, unit)}×${reps}` : `${reps} reps`;
  return `${fmtKg(s.kg || 0, unit)}×${reps}`;
}

// ───────────────────────── vista del entreno ─────────────────────────

export function WorkoutView({ onClose }: { onClose: () => void }) {
  const active = useGymStore((s) => s.active);
  const history = useGymStore((s) => s.history);
  const routines = useGymStore((s) => s.routines);
  const custom = useGymStore((s) => s.customExercises);
  const prefs = useGymStore((s) => s.prefs);
  const restEndsAt = useGymStore((s) => s.restEndsAt);
  const store = useGymStore.getState;
  const unit = useAppStore((s) => s.settings.weightUnit);
  const hapticOn = useAppStore((s) => s.settings.hapticFeedback);
  const soundOn = useAppStore((s) => s.settings.soundEffects);

  const [now, setNow] = useState(Date.now());
  const [menu, setMenu] = useState<string | null>(null);              // entry uid con el menú abierto
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'swap'; uid: string }>(null);
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const [plate, setPlate] = useState<null | { kg?: number; equipment: BarEquip }>(null);
  const [focusEffort, setFocusEffort] = useState<string | null>(null);
  const [toast, setToast] = useState<null | { text: string; pr?: boolean; undo?: () => void }>(null);
  const [flash, setFlash] = useState(false);
  const [summary, setSummary] = useState<null | { minutes: number; sets: number; volume: number; prs: number; saved: boolean }>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTotal = useRef(90);
  const firedFor = useRef<number | null>(null);

  // reloj (cronómetro y descanso)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  // pantalla siempre encendida
  useEffect(() => {
    if (!prefs.keepAwake || !active) return;
    type WL = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WL> } };
    if (!nav.wakeLock) return;
    let lock: WL | null = null; let alive = true;
    const req = async () => { try { const l = await nav.wakeLock!.request('screen'); if (alive) lock = l; else l.release().catch(() => {}); } catch { /* sin permiso o no soportado */ } };
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    req();
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [prefs.keepAwake, !!active]); // eslint-disable-line react-hooks/exhaustive-deps

  // duración total del descanso para la barra
  useEffect(() => { if (restEndsAt) restTotal.current = Math.max(1, Math.round((restEndsAt - Date.now()) / 1000)); }, [restEndsAt]);

  // fin del descanso: vibración + ding + destello
  const restLeft = restEndsAt ? Math.ceil((restEndsAt - now) / 1000) : 0;
  useEffect(() => {
    if (!restEndsAt || restLeft > 0 || firedFor.current === restEndsAt) return;
    firedFor.current = restEndsAt;
    if (hapticOn) haptic([200, 100, 200]);
    if (soundOn) { playDing(880); setTimeout(() => playDing(1175), 180); }
    if (prefs.flashOnRest) { setFlash(true); setTimeout(() => setFlash(false), 700); }
    store().stopRest();
  }, [restEndsAt, restLeft, hapticOn, soundOn, prefs.flashOnRest, store]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (t: { text: string; pr?: boolean; undo?: () => void }, ms = 2500) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const routine = active?.routineId ? routines.find((r) => r.id === active.routineId) : undefined;
  const itemFor = (e: WorkoutEntry) => routine?.items.find((it) => it.exId === e.exId || it.backupExId === e.exId);

  const stats = useMemo(() => {
    let done = 0, total = 0, vol = 0;
    for (const e of active?.entries || []) for (const s of e.sets) {
      total++;
      if (s.done) { done++; if (s.type !== 'warmup') vol += setVolume(s); }
    }
    return { done, total, vol };
  }, [active]);

  const prevByEx = useMemo(() => {
    const m: Record<string, DoneSet[]> = {};
    for (const e of active?.entries || []) if (!m[e.exId]) m[e.exId] = lastSets(history, e.exId);
    return m;
  }, [active?.entries, history]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── resumen final (se muestra aunque ya no haya entreno activo) ──
  if (summary) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-app px-6">
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent"><Trophy size={30} /></div>
          <h2 className="font-display mb-1 text-2xl text-content">{summary.saved ? '¡Entreno terminado!' : 'Entreno cerrado'}</h2>
          {!summary.saved && <p className="mb-4 text-sm text-muted">No marcaste ninguna serie, así que no se ha guardado.</p>}
          {summary.saved && (
            <div className="og-group my-5 text-left">
              <div className="og-row"><span className="flex-1 text-muted">Duración</span><span className="og-num text-content">{summary.minutes} min</span></div>
              <div className="og-row"><span className="flex-1 text-muted">Series</span><span className="og-num text-content">{summary.sets}</span></div>
              <div className="og-row"><span className="flex-1 text-muted">Volumen</span><span className="og-num text-content">{fmtKg(Math.round(summary.volume), unit)} {unit}</span></div>
              <div className="og-row"><span className="flex-1 text-muted">Récords</span><span className={`og-num ${summary.prs ? 'og-good' : 'text-content'}`}>{summary.prs}</span></div>
            </div>
          )}
          <button className="og-btn w-full" onClick={() => { setSummary(null); onClose(); }}>Hecho</button>
        </motion.div>
      </div>
    );
  }

  if (!active) return null;

  const elapsed = (now - +new Date(active.date)) / 1000;

  // Al cambiar peso o reps de una serie, las siguientes del mismo tipo que aún estén vacías y sin hacer copian el valor
  const patchSet = (entryUid: string, idx: number, p: Partial<DoneSet>) =>
    store().updateActive((w) => ({ ...w, entries: w.entries.map((e) => {
      if (e.uid !== entryUid) return e;
      const base = e.sets[idx];
      return { ...e, sets: e.sets.map((s, i) => {
        if (i === idx) return { ...s, ...p };
        if (i < idx || s.done || s.type !== base?.type) return s;
        const fill: Partial<DoneSet> = {};
        if ('kg' in p && !s.kg) fill.kg = p.kg;
        if ('reps' in p && !s.reps) fill.reps = p.reps;
        return Object.keys(fill).length ? { ...s, ...fill } : s;
      }) };
    }) }));
  const patchEntry = (entryUid: string, p: Partial<WorkoutEntry>) =>
    store().updateActive((w) => ({ ...w, entries: w.entries.map((e) => (e.uid === entryUid ? { ...e, ...p } : e)) }));

  const onToggle = (entry: WorkoutEntry, idx: number, entryIdx: number) => {
    const wasDone = entry.sets[idx]?.done;
    const res = store().toggleSet(entry.uid, idx);
    if (wasDone) return;
    if (hapticOn) haptic(25);
    if (res.pr) {
      showToast({ text: '¡Récord!', pr: true });
      confettiBig();
      if (soundOn) playDing(1320);
    }
    if (prefs.autoRest) {
      // en superserie, el descanso llega al acabar el último ejercicio del grupo
      const next = active.entries[entryIdx + 1];
      const midSuperset = !!entry.superset && next?.superset === entry.superset;
      if (!midSuperset) store().startRest(itemFor(entry)?.rest || 90);
    }
  };

  const onDeleteSet = (entry: WorkoutEntry, idx: number) => {
    const removed = entry.sets[idx];
    store().removeSet(entry.uid, idx);
    showToast({
      text: 'Serie borrada',
      undo: () => store().updateActive((w) => ({ ...w, entries: w.entries.map((e) => {
        if (e.uid !== entry.uid) return e;
        const sets = [...e.sets]; sets.splice(Math.min(idx, sets.length), 0, removed);
        return { ...e, sets };
      }) })),
    }, 5000);
  };

  const finish = () => {
    if (!stats.done && !window.confirm('No has marcado ninguna serie. ¿Terminar sin guardar?')) return;
    const w: Workout | null = store().finishWorkout();
    if (hapticOn) haptic([30, 60, 30]);
    setSummary(w
      ? { minutes: workoutMinutes(w), sets: workoutSets(w), volume: workoutVolume(w), prs: w.entries.reduce((a, e) => a + e.sets.filter((s) => s.pr).length, 0), saved: true }
      : { minutes: 0, sets: 0, volume: 0, prs: 0, saved: false });
  };
  const discard = () => {
    if (!window.confirm('¿Descartar este entreno? No se guardará nada.')) return;
    store().discardWorkout(); onClose();
  };

  const menuEntry = active.entries.find((e) => e.uid === menu);
  const menuEx = menuEntry ? byId(menuEntry.exId, custom) : undefined;
  const menuBackup = menuEntry ? itemFor(menuEntry)?.backupExId : undefined;
  const menuBackupEx = menuBackup && menuBackup !== menuEntry?.exId ? byId(menuBackup, custom) : undefined;
  const menuOriginal = menuEntry ? itemFor(menuEntry) : undefined;
  const pct = stats.total ? stats.done / stats.total : 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-app">
      <div className="flex h-[100dvh] w-full max-w-md flex-col">
        {/* cabecera */}
        <header className="border-b border-line/10 px-4 pb-3 pt-3">
          <div className="flex items-center gap-2">
            <button className="text-sm font-semibold og-bad" onClick={discard}>Descartar</button>
            <div className="min-w-0 flex-1 text-center">
              <div className="truncate font-display text-content">{active.name}</div>
              <div className="og-num text-xs text-muted">{fmtClock(elapsed)}</div>
            </div>
            <button className="og-btn min-h-[34px] px-3 text-sm" onClick={finish}>Terminar</button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.3 }} />
            </div>
            <span className="og-num shrink-0 text-xs text-muted">{stats.done}/{stats.total} · <span className="text-content">{fmtKg(Math.round(stats.vol), unit)} {unit}</span></span>
          </div>
        </header>

        {/* ejercicios */}
        <div className={`flex-1 space-y-3 overflow-y-auto px-4 pt-4 ${restEndsAt ? 'pb-36' : 'pb-24'}`}>
          {active.entries.map((entry, ei) => {
            const ex = byId(entry.exId, custom);
            const kind = ex?.kind || 'weight';
            const perSide = !!ex?.perSide && (kind === 'weight' || kind === 'reps');
            const prev = prevByEx[entry.exId] || [];
            const prevSS = ei > 0 && !!entry.superset && active.entries[ei - 1].superset === entry.superset;
            const nextSS = !!entry.superset && active.entries[ei + 1]?.superset === entry.superset;
            let workNo = 0;
            return (
              <Fragment key={entry.uid}>
                {entry.superset && !prevSS && <div className="og-label -mb-2 !pb-1 text-accent">Superserie</div>}
                <section className={`og-card ${entry.superset ? 'border-l-[3px] !border-l-accent' : ''} ${prevSS ? '!-mt-1 rounded-t-md' : ''} ${nextSS ? 'rounded-b-md' : ''}`}>
                  <div className="flex items-center gap-2 px-3.5 pb-1 pt-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-content">{ex?.name || entry.exId}</div>
                      {entry.note && !noteOpen[entry.uid] && <div className="truncate text-xs text-muted">{entry.note}</div>}
                    </div>
                    <button aria-label="Opciones del ejercicio" className="rounded-full p-1.5 text-muted active:bg-surface-2" onClick={() => setMenu(entry.uid)}><MoreHorizontal size={20} /></button>
                  </div>

                  {noteOpen[entry.uid] && (
                    <div className="px-3.5 pb-2">
                      <textarea className="og-input min-h-[60px] py-2 text-sm" placeholder="Nota para este ejercicio" value={entry.note || ''}
                        onChange={(e) => patchEntry(entry.uid, { note: e.target.value || undefined })}
                        onBlur={() => setNoteOpen((n) => ({ ...n, [entry.uid]: false }))} autoFocus />
                    </div>
                  )}

                  {/* cabecera de columnas */}
                  <div className="flex items-center gap-1.5 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    <span className="w-8 text-center">Serie</span>
                    {kind === 'weight' && <span className="flex-1 text-center">{unit}</span>}
                    {kind === 'reps' && <span className="w-14 text-center">+{unit}</span>}
                    {(kind === 'weight' || kind === 'reps') && <span className="flex-1 text-center">{perSide ? 'Reps Izq / Der' : 'Reps'}</span>}
                    {kind === 'time' && <span className="flex-1 text-center">Segundos</span>}
                    {kind === 'cardio' && <><span className="flex-1 text-center">Min</span><span className="flex-1 text-center">Km</span></>}
                    {prefs.effort !== 'off' && <span className="w-11 text-center">{prefs.effort.toUpperCase()}</span>}
                    <span className="w-9" />
                    <span className="w-6" />
                  </div>

                  <div className="space-y-1 px-3 pb-2">
                    {entry.sets.map((s, i) => {
                      if (s.type !== 'warmup') workNo++;
                      const badge = s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'restpause' ? 'RP' : String(workNo);
                      const p = prev[i];
                      const effKey = `${entry.uid}:${i}`;
                      return (
                        <div key={i}>
                          <div className={`flex items-center gap-1.5 rounded-lg py-0.5 transition-colors ${s.done ? 'bg-accent/10' : ''}`}>
                            <button aria-label="Cambiar tipo de serie" onClick={() => patchSet(entry.uid, i, { type: NEXT_TYPE[s.type] })}
                              className={`og-num h-8 w-8 shrink-0 rounded-lg text-xs font-bold ${s.type === 'warmup' ? 'og-warn bg-surface-2' : s.type === 'normal' ? 'bg-surface-2 text-content' : 'og-info bg-surface-2'}`}>
                              {badge}
                            </button>
                            {kind === 'weight' && (
                              <div className="flex-1"><NumInput decimal ariaLabel="Peso" value={s.kg != null ? Number(fmtKg(s.kg, unit)) : undefined}
                                placeholder={p?.kg != null ? fmtKg(p.kg, unit) : '0'} onChange={(v) => patchSet(entry.uid, i, { kg: v == null ? undefined : toKg(v, unit) })} /></div>
                            )}
                            {kind === 'reps' && (
                              <div className="w-14"><NumInput decimal className="text-[13px]" ariaLabel="Lastre" placeholder="+0" value={s.kg != null ? Number(fmtKg(s.kg, unit)) : undefined}
                                onChange={(v) => patchSet(entry.uid, i, { kg: v == null || v === 0 ? undefined : toKg(v, unit) })} /></div>
                            )}
                            {(kind === 'weight' || kind === 'reps') && (perSide ? (
                              <div className="flex flex-1 gap-1">
                                <NumInput ariaLabel="Reps izquierda" placeholder="I" value={s.repsLeft} onChange={(v) => patchSet(entry.uid, i, { repsLeft: v })} />
                                <NumInput ariaLabel="Reps derecha" placeholder="D" value={s.reps} onChange={(v) => patchSet(entry.uid, i, { reps: v })} />
                              </div>
                            ) : (
                              <div className="flex-1"><NumInput ariaLabel="Repeticiones" placeholder={p?.reps != null ? String(p.reps) : '0'} value={s.reps} onChange={(v) => patchSet(entry.uid, i, { reps: v })} /></div>
                            ))}
                            {kind === 'time' && (
                              <div className="flex-1"><NumInput ariaLabel="Segundos" value={s.seconds} onChange={(v) => patchSet(entry.uid, i, { seconds: v })} /></div>
                            )}
                            {kind === 'cardio' && (
                              <>
                                <div className="flex-1"><NumInput decimal ariaLabel="Minutos" value={s.seconds != null ? Math.round((s.seconds / 60) * 10) / 10 : undefined}
                                  onChange={(v) => patchSet(entry.uid, i, { seconds: v == null ? undefined : Math.round(v * 60) })} /></div>
                                <div className="flex-1"><NumInput decimal ariaLabel="Kilómetros" placeholder="—" value={s.distanceKm} onChange={(v) => patchSet(entry.uid, i, { distanceKm: v })} /></div>
                              </>
                            )}
                            {prefs.effort !== 'off' && (
                              <div className="w-11">
                                <NumInput ariaLabel={prefs.effort.toUpperCase()} placeholder="—" value={s.effort}
                                  className={`font-semibold ${effortClass(prefs.effort, s.effort)}`}
                                  onFocus={() => setFocusEffort(effKey)} onBlur={() => setFocusEffort((k) => (k === effKey ? null : k))}
                                  onChange={(v) => {
                                    const [lo, hi] = prefs.effort === 'rir' ? [0, 5] : [6, 10];
                                    patchSet(entry.uid, i, { effort: v == null ? undefined : Math.min(hi, Math.max(lo, v)) });
                                  }} />
                              </div>
                            )}
                            <button aria-label={s.done ? 'Desmarcar serie' : 'Marcar serie hecha'} onClick={() => onToggle(entry, i, ei)}
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${s.done ? 'bg-accent text-[#0c0e12]' : 'bg-surface-2 text-muted'}`}>
                              <Check size={18} strokeWidth={3} />
                            </button>
                            <button aria-label="Borrar serie" onClick={() => onDeleteSet(entry, i)} className="w-6 shrink-0 text-muted/70"><Trash2 size={15} /></button>
                          </div>
                          {(p || s.pr) && (
                            <div className="og-num flex gap-2 pl-10 text-[11px] text-muted">
                              {p && <span>Anterior: {prevText(p, kind, unit)}</span>}
                              {s.pr && s.done && <span className="og-good font-semibold">Récord</span>}
                            </div>
                          )}
                          {focusEffort === effKey && prefs.effort !== 'off' && (
                            <p className="pl-10 pt-0.5 text-[11px] text-muted">{EFFORT_HELP[prefs.effort]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button className="w-full border-t border-line/10 py-2.5 text-sm font-semibold text-accent" onClick={() => store().addSet(entry.uid)}>
                    + Añadir serie
                  </button>
                </section>
              </Fragment>
            );
          })}

          <button className="og-btn soft w-full" onClick={() => setPicker({ mode: 'add' })}><Plus size={18} /> Añadir ejercicio</button>
        </div>

        {/* descanso */}
        <AnimatePresence>
          {restEndsAt && restLeft > 0 && (
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="fixed inset-x-0 bottom-0 z-[65] mx-auto w-full max-w-md border-t border-line/10 bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
              <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, (restLeft / restTotal.current) * 100)}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-xs text-muted">Descanso</div>
                  <div className="og-num font-display text-2xl text-content">{fmtClock(restLeft)}</div>
                </div>
                <button className="og-btn soft min-h-[38px] px-3 text-sm" onClick={() => (restLeft - 15 > 0 ? store().startRest(restLeft - 15) : store().stopRest())}>−15s</button>
                <button className="og-btn soft min-h-[38px] px-3 text-sm" onClick={() => { store().startRest(restLeft + 15); restTotal.current += 15; }}>+15s</button>
                <button className="og-btn min-h-[38px] px-3 text-sm" onClick={() => store().stopRest()}>Saltar</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* aviso / deshacer */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className={`fixed inset-x-0 z-[66] mx-auto flex w-[calc(100%-32px)] max-w-sm items-center gap-3 rounded-xl px-4 py-3 shadow-lg ${restEndsAt ? 'bottom-32' : 'bottom-6'} ${toast.pr ? 'bg-accent text-[#0c0e12]' : 'bg-surface-2 text-content'}`}>
              {toast.pr && <Trophy size={18} />}
              <span className="flex-1 font-semibold">{toast.text}</span>
              {toast.undo && (
                <button className="font-semibold text-accent" onClick={() => { toast.undo!(); setToast(null); }}>Deshacer</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* destello al acabar el descanso */}
        <AnimatePresence>
          {flash && (
            <motion.div className="pointer-events-none fixed inset-0 z-[90] bg-white"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0, 0.85, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />
          )}
        </AnimatePresence>
      </div>

      {/* menú del ejercicio */}
      <Sheet open={!!menuEntry} onClose={() => setMenu(null)} title={menuEx?.name || 'Ejercicio'}>
        {menuEntry && (
          <div className="og-group">
            {menuBackupEx && (
              <button className="og-row w-full text-left" onClick={() => { store().swapEntry(menuEntry.uid, menuBackupEx.id); setMenu(null); }}>
                <Repeat size={18} className="text-accent" />
                <div className="flex-1"><div className="text-content">Cambiar por alternativa</div><div className="text-xs text-muted">{menuBackupEx.name}</div></div>
              </button>
            )}
            {menuOriginal && menuOriginal.exId !== menuEntry.exId && (
              <button className="og-row w-full text-left" onClick={() => { store().swapEntry(menuEntry.uid, menuOriginal.exId); setMenu(null); }}>
                <Repeat size={18} className="text-accent" />
                <div className="flex-1"><div className="text-content">Volver al original</div><div className="text-xs text-muted">{byId(menuOriginal.exId, custom)?.name}</div></div>
              </button>
            )}
            <button className="og-row w-full text-left" onClick={() => { setPicker({ mode: 'swap', uid: menuEntry.uid }); setMenu(null); }}>
              <ArrowLeftRight size={18} className="text-accent" /><span className="flex-1 text-content">Cambiar ejercicio</span>
            </button>
            <button className="og-row w-full text-left" onClick={() => { store().addSet(menuEntry.uid); setMenu(null); }}>
              <Plus size={18} className="text-accent" /><span className="flex-1 text-content">Añadir serie</span>
            </button>
            <button className="og-row w-full text-left" onClick={() => { setNoteOpen((n) => ({ ...n, [menuEntry.uid]: true })); setMenu(null); }}>
              <StickyNote size={18} className="text-accent" /><span className="flex-1 text-content">Nota</span>
            </button>
            {menuEx && (BAR_EQUIP as readonly string[]).includes(menuEx.equipment) && (
              <button className="og-row w-full text-left" onClick={() => {
                const s = menuEntry.sets.find((x) => !x.done && x.kg) || menuEntry.sets.find((x) => x.kg);
                setPlate({ kg: s?.kg, equipment: menuEx.equipment as BarEquip }); setMenu(null);
              }}>
                <Calculator size={18} className="text-accent" /><span className="flex-1 text-content">Calculadora de discos</span>
              </button>
            )}
            <button className="og-row w-full text-left" onClick={() => {
              if (!window.confirm('¿Quitar este ejercicio del entreno?')) return;
              store().updateActive((w) => ({ ...w, entries: w.entries.filter((e) => e.uid !== menuEntry.uid) })); setMenu(null);
            }}>
              <Trash2 size={18} className="og-bad" /><span className="og-bad flex-1">Quitar ejercicio</span>
            </button>
          </div>
        )}
      </Sheet>

      <ExercisePicker open={!!picker} onClose={() => setPicker(null)} title={picker?.mode === 'swap' ? 'Cambiar ejercicio' : 'Añadir ejercicio'}
        onPick={(id) => { if (picker?.mode === 'swap') store().swapEntry(picker.uid, id); else store().addEntry(id); }} />

      {plate && <PlateCalc initialKg={plate.kg} equipment={plate.equipment} onClose={() => setPlate(null)} />}
    </div>
  );
}
