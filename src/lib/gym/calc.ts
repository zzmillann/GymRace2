// Cálculos del módulo de gimnasio: 1RM, volumen, récords, discos, progresión, músculos y planes.
import { byId } from './catalog';
import type { CatalogExercise, DoneSet, MuscleId, Plan, Routine, RoutineItem, Weekday, Workout } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 0 = lunes … 6 = domingo */
export const weekdayOf = (d: Date): Weekday => (((d.getDay() + 6) % 7) as Weekday);
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ── 1RM estimado (Epley; con pocas reps es fiable, por encima de 12 se limita) ──
export const e1rm = (kg: number, reps: number) => (reps <= 0 || kg <= 0 ? 0 : reps === 1 ? kg : kg * (1 + Math.min(reps, 12) / 30));

const workSets = (sets: DoneSet[]) => sets.filter((s) => s.done && s.type !== 'warmup');
export const setVolume = (s: DoneSet) => (s.kg || 0) * ((s.reps || 0) + (s.repsLeft || 0));
export const workoutVolume = (w: Workout) => w.entries.reduce((a, e) => a + workSets(e.sets).reduce((b, s) => b + setVolume(s), 0), 0);
export const workoutSets = (w: Workout) => w.entries.reduce((a, e) => a + workSets(e.sets).length, 0);
export const workoutMinutes = (w: Workout) => (w.endedAt ? Math.max(1, Math.round((+new Date(w.endedAt) - +new Date(w.date)) / 60000)) : 0);

/** Mejor marca histórica de un ejercicio (peso máximo, 1RM estimado, reps máximas, volumen de serie). */
export function bests(history: Workout[], exId: string, before?: string) {
  let kg = 0, e = 0, reps = 0, vol = 0, seconds = 0;
  for (const w of history) {
    if (before && w.date >= before) continue;
    for (const en of w.entries) if (en.exId === exId) for (const s of workSets(en.sets)) {
      kg = Math.max(kg, s.kg || 0); e = Math.max(e, e1rm(s.kg || 0, s.reps || 0));
      reps = Math.max(reps, s.reps || 0); vol = Math.max(vol, setVolume(s)); seconds = Math.max(seconds, s.seconds || 0);
    }
  }
  return { kg, e1rm: e, reps, vol, seconds };
}

/** ¿Es récord esta serie respecto a todo lo anterior? (peso, 1RM estimado o, sin peso, reps/tiempo) */
export function isPR(history: Workout[], exId: string, s: DoneSet, before?: string) {
  if (!s.done || s.type === 'warmup') return false;
  const b = bests(history, exId, before);
  const hasHistory = b.kg > 0 || b.reps > 0 || b.seconds > 0;
  if (!hasHistory) return false;
  if ((s.kg || 0) > 0) return (s.kg || 0) > b.kg || e1rm(s.kg || 0, s.reps || 0) > b.e1rm + 0.01;
  if (s.seconds) return s.seconds > b.seconds;
  return (s.reps || 0) > b.reps;
}

/** Últimas series hechas de un ejercicio (para rellenar el entreno de hoy). */
export function lastSets(history: Workout[], exId: string): DoneSet[] {
  const ws = [...history].sort((a, b) => b.date.localeCompare(a.date));
  for (const w of ws) { const en = w.entries.find((e) => e.exId === exId && e.sets.some((s) => s.done)); if (en) return en.sets.filter((s) => s.done); }
  return [];
}

/** Serie a serie: curva del 1RM estimado por día. */
export function e1rmSeries(history: Workout[], exId: string) {
  const out: { date: string; e1rm: number; kg: number }[] = [];
  for (const w of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    let best = 0, kg = 0;
    for (const en of w.entries) if (en.exId === exId) for (const s of workSets(en.sets)) { const v = e1rm(s.kg || 0, s.reps || 0); if (v > best) { best = v; kg = s.kg || 0; } }
    if (best > 0) out.push({ date: w.date.slice(0, 10), e1rm: Math.round(best * 10) / 10, kg });
  }
  return out;
}

// ── Calculadora de discos ──
/** Discos por lado para llegar a `target` con una barra de `bar` kg y los discos disponibles. */
export function plateMath(target: number, bar: number, plates: number[]) {
  const perSide = (target - bar) / 2;
  if (perSide < 0) return { perSide: [], achieved: bar, rest: target - bar };
  const sorted = [...plates].sort((a, b) => b - a);
  let left = Math.round(perSide * 1000) / 1000; const used: number[] = [];
  for (const p of sorted) while (left + 1e-9 >= p) { used.push(p); left = Math.round((left - p) * 1000) / 1000; }
  const achieved = bar + 2 * used.reduce((a, b) => a + b, 0);
  return { perSide: used, achieved, rest: Math.round((target - achieved) * 100) / 100 };
}

// ── Progresión ──
/** Sugerencia de peso para hoy según la regla del ejercicio y el último entreno. */
export function suggestKg(item: RoutineItem, history: Workout[], increment = 2.5): number | undefined {
  const last = lastSets(history, item.exId).filter((s) => s.type !== 'warmup');
  if (!last.length) return item.sets.find((s) => s.kg)?.kg;
  const top = Math.max(...last.map((s) => s.kg || 0));
  const rule = item.progression || 'none';
  const targets = item.sets.filter((s) => s.type !== 'warmup');
  if (rule === 'linear') {
    const hit = targets.every((t, i) => (last[i]?.reps || 0) >= (t.reps || 0));
    return hit ? top + (item.incrementKg || increment) : top;
  }
  if (rule === 'double') {
    // doble progresión: cuando todas las series llegan al tope del rango, sube el peso y vuelve al mínimo
    const hit = targets.every((t, i) => (last[i]?.reps || 0) >= (t.repsMax || t.reps || 0));
    return hit ? top + (item.incrementKg || increment) : top;
  }
  return top || undefined;
}

// ── Músculos ──
/** Series efectivas por músculo en un periodo: principal = 1, secundario = 0,5. */
export function setsByMuscle(history: Workout[], fromIso: string, custom: CatalogExercise[] = []) {
  const out: Partial<Record<MuscleId, number>> = {};
  for (const w of history) {
    if (w.date < fromIso) continue;
    for (const en of w.entries) {
      const ex = byId(en.exId, custom); if (!ex) continue;
      const n = workSets(en.sets).length; if (!n) continue;
      for (const m of ex.primary) out[m] = (out[m] || 0) + n;
      for (const m of ex.secondary) out[m] = (out[m] || 0) + n * 0.5;
    }
  }
  return out;
}

/** Horas desde que se trabajó cada músculo como principal (para «recuperando» y «olvidado»). */
export function hoursSinceMuscle(history: Workout[], custom: CatalogExercise[] = [], now = Date.now()) {
  const out: Partial<Record<MuscleId, number>> = {};
  for (const w of history) {
    const h = (now - +new Date(w.endedAt || w.date)) / 3600000;
    for (const en of w.entries) {
      const ex = byId(en.exId, custom); if (!ex || !en.sets.some((s) => s.done)) continue;
      for (const m of ex.primary) out[m] = Math.min(out[m] ?? Infinity, h);
    }
  }
  return out;
}

/** Músculos que trabaja una rutina (para el mapa pequeño de cada sesión). */
export function routineMuscles(r: Routine | undefined, custom: CatalogExercise[] = []) {
  const out: Partial<Record<MuscleId, number>> = {};
  for (const it of r?.items || []) {
    const ex = byId(it.exId, custom); if (!ex) continue;
    for (const m of ex.primary) out[m] = (out[m] || 0) + it.sets.length;
    for (const m of ex.secondary) out[m] = (out[m] || 0) + it.sets.length * 0.5;
  }
  return out;
}

// ── Plan: qué toca hoy ──
export function routineForDate(plan: Plan, routines: Routine[], history: Workout[], date = new Date()): Routine | null | undefined {
  const k = iso(date);
  if (k in plan.moves) return routines.find((r) => r.id === plan.moves[k]) || null;
  if (plan.mode === 'rotation') {
    if (!plan.rotation.length) return undefined;
    // la siguiente es la que sigue a la última hecha
    const last = [...history].filter((w) => w.routineId && plan.rotation.includes(w.routineId)).sort((a, b) => b.date.localeCompare(a.date))[0];
    const doneToday = last && last.date.slice(0, 10) === k;
    if (doneToday) return routines.find((r) => r.id === last!.routineId) || null;
    const idx = last ? (plan.rotation.indexOf(last.routineId!) + 1) % plan.rotation.length : 0;
    return routines.find((r) => r.id === plan.rotation[idx]) || null;
  }
  // sin ninguna rutina asignada en la semana todavía no hay plan (undefined), no «descanso» (null)
  if (!Object.values(plan.week).some(Boolean)) return undefined;
  const id = plan.week[weekdayOf(date)];
  if (!id) return null;
  return routines.find((r) => r.id === id) || null;
}

/** Próximo día con sesión (para el mensaje del día de descanso). */
export function nextSession(plan: Plan, routines: Routine[], history: Workout[], from = new Date()) {
  for (let i = 1; i <= 14; i++) {
    const d = new Date(from); d.setDate(d.getDate() + i);
    const r = routineForDate(plan, routines, history, d);
    if (r) return { date: d, routine: r };
  }
  return null;
}

// ── Planes de inicio (se cargan como rutinas normales y editables) ──
const it = (exId: string, sets: number, reps: number, rest = 120, extra: Partial<RoutineItem> = {}): RoutineItem =>
  ({ uid: uid(), exId, rest, sets: Array.from({ length: sets }, () => ({ type: 'normal' as const, reps })), ...extra });
const dbl = (exId: string, sets: number, min: number, max: number, rest = 90): RoutineItem =>
  ({ uid: uid(), exId, rest, progression: 'double', sets: Array.from({ length: sets }, () => ({ type: 'normal' as const, reps: min, repsMax: max })) });

export const STARTER_PLANS: { id: string; name: string; desc: string; build: () => { routines: Routine[]; week: Plan['week'] } }[] = [
  {
    id: 'ppl', name: 'Empuje / Tirón / Pierna', desc: '6 días: cada grupo dos veces por semana.',
    build: () => {
      const push: Routine = { id: uid(), name: 'Empuje', items: [it('bench_press', 4, 6, 180, { progression: 'linear', incrementKg: 2.5 }), dbl('ohp', 3, 8, 10), dbl('db_incline', 3, 8, 12), dbl('lateral_raise', 3, 12, 15, 60), dbl('triceps_pushdown', 3, 10, 15, 60)] };
      const pull: Routine = { id: uid(), name: 'Tirón', items: [it('deadlift', 3, 5, 180, { progression: 'linear', incrementKg: 5 }), dbl('pull_up', 3, 6, 10), dbl('barbell_row', 3, 8, 12), dbl('face_pull', 3, 12, 15, 60), dbl('db_curl', 3, 10, 12, 60)] };
      const legs: Routine = { id: uid(), name: 'Pierna', items: [it('squat', 4, 6, 180, { progression: 'linear', incrementKg: 2.5 }), dbl('rdl', 3, 8, 10), dbl('leg_press', 3, 10, 15), dbl('leg_curl', 3, 10, 15, 60), dbl('calf_raise', 4, 10, 15, 60)] };
      return { routines: [push, pull, legs], week: { 0: push.id, 1: pull.id, 2: legs.id, 3: push.id, 4: pull.id, 5: legs.id, 6: null } };
    },
  },
  {
    id: 'upper_lower', name: 'Torso / Pierna', desc: '4 días: torso y pierna alternos.',
    build: () => {
      const up: Routine = { id: uid(), name: 'Torso', items: [it('bench_press', 4, 6, 180, { progression: 'linear', incrementKg: 2.5 }), dbl('barbell_row', 4, 6, 10), dbl('db_shoulder_press', 3, 8, 12), dbl('lat_pulldown', 3, 8, 12), dbl('ez_curl', 2, 10, 12, 60), dbl('skull_crusher', 2, 10, 12, 60)] };
      const low: Routine = { id: uid(), name: 'Pierna', items: [it('squat', 4, 6, 180, { progression: 'linear', incrementKg: 2.5 }), dbl('rdl', 3, 8, 10), dbl('bulgarian_split_squat', 3, 8, 12), dbl('leg_curl', 3, 10, 15, 60), dbl('calf_raise', 3, 10, 15, 60), it('plank', 3, 0, 60)] };
      low.items[5].sets = low.items[5].sets.map((s) => ({ ...s, reps: undefined, seconds: 45 }));
      return { routines: [up, low], week: { 0: up.id, 1: low.id, 2: null, 3: up.id, 4: low.id, 5: null, 6: null } };
    },
  },
  {
    id: 'full_body', name: 'Cuerpo completo', desc: '3 días: todo el cuerpo en cada sesión.',
    build: () => {
      const a: Routine = { id: uid(), name: 'Cuerpo completo A', items: [it('squat', 3, 8, 150, { progression: 'linear', incrementKg: 2.5 }), dbl('bench_press', 3, 8, 10), dbl('barbell_row', 3, 8, 10), dbl('lateral_raise', 2, 12, 15, 60), dbl('hanging_leg_raise', 2, 10, 15, 60)] };
      const b: Routine = { id: uid(), name: 'Cuerpo completo B', items: [it('deadlift', 3, 5, 180, { progression: 'linear', incrementKg: 5 }), dbl('ohp', 3, 8, 10), dbl('lat_pulldown', 3, 8, 12), dbl('lunge', 2, 10, 12), dbl('hammer_curl', 2, 10, 12, 60)] };
      return { routines: [a, b], week: { 0: a.id, 1: null, 2: b.id, 3: null, 4: a.id, 5: null, 6: null } };
    },
  },
  {
    id: 'fivebyfive', name: '5×5 de fuerza', desc: '3 días: básicos pesados, 5 series de 5, subiendo peso cada sesión.',
    build: () => {
      const lin = (id: string, inc = 2.5, sets = 5, reps = 5) => it(id, sets, reps, 180, { progression: 'linear', incrementKg: inc });
      const a: Routine = { id: uid(), name: '5×5 A', items: [lin('squat'), lin('bench_press'), lin('barbell_row')] };
      const b: Routine = { id: uid(), name: '5×5 B', items: [lin('squat'), lin('ohp'), lin('deadlift', 5, 1, 5)] };
      return { routines: [a, b], week: { 0: a.id, 1: null, 2: b.id, 3: null, 4: a.id, 5: null, 6: null } };
    },
  },
];

/** Formato de peso según la unidad elegida (los datos siempre en kg). */
export const KG_TO_LB = 2.20462;
export const fmtKg = (kg: number | undefined, unit: 'kg' | 'lb') => (kg == null ? '' : unit === 'lb' ? String(Math.round(kg * KG_TO_LB * 10) / 10) : String(Math.round(kg * 100) / 100));
export const toKg = (v: number, unit: 'kg' | 'lb') => (unit === 'lb' ? v / KG_TO_LB : v);
