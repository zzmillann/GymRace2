'use client';

// Datos del módulo de gimnasio: rutinas, plan, entreno en curso, historial, peso corporal, gimnasios y preferencias.
// Se guarda en el dispositivo (localStorage) aparte del store principal de GymRace.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyWeight, CatalogExercise, DoneSet, GymPlaces, GymPrefs, Plan, Routine, RoutineItem, Workout, WorkoutEntry } from '@/lib/gym/types';
import { isPR, lastSets, STARTER_PLANS, suggestKg, uid } from '@/lib/gym/calc';
import { byId } from '@/lib/gym/catalog';

const DEFAULT_GYM: GymPlaces = { id: 'main', name: 'Mi gimnasio', barKg: 20, ezKg: 10, trapKg: 25, smithKg: 15, plates: [25, 20, 15, 10, 5, 2.5, 1.25] };

interface GymState {
  routines: Routine[];
  plan: Plan;
  history: Workout[];
  active: Workout | null;
  bodyweights: BodyWeight[];
  customExercises: CatalogExercise[];
  gyms: GymPlaces[];
  prefs: GymPrefs;
  restEndsAt: number | null;      // descanso en marcha (epoch ms)

  // rutinas y plan
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  setPlan: (p: Partial<Plan>) => void;
  moveSession: (dateIso: string, routineId: string | null) => void;
  loadStarter: (starterId: string) => void;

  // entreno
  startWorkout: (routine?: Routine | null, name?: string) => void;
  updateActive: (fn: (w: Workout) => Workout) => void;
  toggleSet: (entryUid: string, idx: number) => { pr: boolean };
  addSet: (entryUid: string) => void;
  removeSet: (entryUid: string, idx: number) => void;
  addEntry: (exId: string) => void;
  swapEntry: (entryUid: string, exId: string) => void;
  finishWorkout: () => Workout | null;
  discardWorkout: () => void;
  startRest: (seconds: number) => void;
  stopRest: () => void;

  // historial
  saveWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
  importWorkouts: (ws: Workout[]) => number;

  // cuerpo, ejercicios propios, gimnasios, ajustes
  addBodyweight: (kg: number, date?: string) => void;
  deleteBodyweight: (date: string) => void;
  saveCustomExercise: (e: CatalogExercise) => void;
  deleteCustomExercise: (id: string) => void;
  saveGym: (g: GymPlaces) => void;
  setPrefs: (p: Partial<GymPrefs>) => void;
}

export const useGymStore = create<GymState>()(
  persist(
    (set, get) => ({
      routines: [],
      plan: { mode: 'week', week: {}, rotation: [], moves: {} },
      history: [],
      active: null,
      bodyweights: [],
      customExercises: [],
      gyms: [DEFAULT_GYM],
      prefs: { effort: 'off', autoRest: true, keepAwake: true, flashOnRest: false, activeGym: 'main' },
      restEndsAt: null,

      saveRoutine: (r) => set((s) => ({ routines: s.routines.some((x) => x.id === r.id) ? s.routines.map((x) => (x.id === r.id ? r : x)) : [...s.routines, r] })),
      deleteRoutine: (id) => set((s) => ({
        routines: s.routines.filter((r) => r.id !== id),
        plan: { ...s.plan, week: Object.fromEntries(Object.entries(s.plan.week).map(([d, r]) => [d, r === id ? null : r])), rotation: s.plan.rotation.filter((r) => r !== id) },
      })),
      setPlan: (p) => set((s) => ({ plan: { ...s.plan, ...p } })),
      moveSession: (dateIso, routineId) => set((s) => ({ plan: { ...s.plan, moves: { ...s.plan.moves, [dateIso]: routineId } } })),
      loadStarter: (starterId) => {
        const st = STARTER_PLANS.find((p) => p.id === starterId); if (!st) return;
        const { routines, week } = st.build();
        set((s) => ({ routines: [...s.routines, ...routines], plan: { ...s.plan, mode: 'week', week, rotation: routines.map((r) => r.id) } }));
      },

      startWorkout: (routine, name) => {
        const { history } = get();
        const entries: WorkoutEntry[] = (routine?.items || []).map((item: RoutineItem) => {
          const last = lastSets(history, item.exId);
          const sug = suggestKg(item, history);
          const deload = routine?.deload ? 0.6 : 1;
          return {
            uid: uid(), exId: item.exId, superset: item.superset, note: item.note,
            sets: item.sets.map((ps, i): DoneSet => ({
              type: ps.type,
              kg: ps.kg ?? (ps.type === 'warmup' ? undefined : sug != null ? Math.round(sug * deload * 4) / 4 : last[i]?.kg),
              reps: ps.reps ?? last[i]?.reps,
              seconds: ps.seconds ?? last[i]?.seconds,
              done: false,
            })),
          };
        });
        set({ active: { id: uid(), date: new Date().toISOString(), routineId: routine?.id, name: name || routine?.name || 'Entreno libre', entries, source: 'app' } });
      },
      updateActive: (fn) => set((s) => (s.active ? { active: fn(s.active) } : {})),
      toggleSet: (entryUid, idx) => {
        let pr = false;
        const { active, history } = get(); if (!active) return { pr };
        const entries = active.entries.map((e) => {
          if (e.uid !== entryUid) return e;
          const sets = e.sets.map((s, i) => {
            if (i !== idx) return s;
            const done = !s.done;
            const next = { ...s, done, pr: false };
            if (done) { next.pr = isPR(history, e.exId, next); pr = !!next.pr; }
            return next;
          });
          return { ...e, sets };
        });
        set({ active: { ...active, entries } });
        return { pr };
      },
      addSet: (entryUid) => get().updateActive((w) => ({ ...w, entries: w.entries.map((e) => {
        if (e.uid !== entryUid) return e;
        const prev = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { type: 'normal', kg: prev?.kg, reps: prev?.reps, seconds: prev?.seconds, done: false }] };
      }) })),
      removeSet: (entryUid, idx) => get().updateActive((w) => ({ ...w, entries: w.entries.map((e) => (e.uid === entryUid ? { ...e, sets: e.sets.filter((_, i) => i !== idx) } : e)) })),
      addEntry: (exId) => get().updateActive((w) => {
        const last = lastSets(get().history, exId);
        const sets: DoneSet[] = (last.length ? last : [{ type: 'normal', done: false } as DoneSet]).map((s) => ({ type: s.type, kg: s.kg, reps: s.reps, seconds: s.seconds, done: false }));
        return { ...w, entries: [...w.entries, { uid: uid(), exId, sets }] };
      }),
      swapEntry: (entryUid, exId) => get().updateActive((w) => ({ ...w, entries: w.entries.map((e) => (e.uid === entryUid ? { ...e, exId, sets: e.sets.map((s) => ({ ...s, done: false, pr: false })) } : e)) })),
      finishWorkout: () => {
        const { active } = get(); if (!active) return null;
        const done: Workout = { ...active, endedAt: new Date().toISOString(), entries: active.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length) };
        set((s) => ({ active: null, restEndsAt: null, history: done.entries.length ? [...s.history, done] : s.history }));
        return done.entries.length ? done : null;
      },
      discardWorkout: () => set({ active: null, restEndsAt: null }),
      startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
      stopRest: () => set({ restEndsAt: null }),

      saveWorkout: (w) => set((s) => ({ history: s.history.some((x) => x.id === w.id) ? s.history.map((x) => (x.id === w.id ? w : x)) : [...s.history, w] })),
      deleteWorkout: (id) => set((s) => ({ history: s.history.filter((w) => w.id !== id) })),
      importWorkouts: (ws) => {
        const have = new Set(get().history.map((w) => `${w.date.slice(0, 16)}|${w.name}`));
        const fresh = ws.filter((w) => !have.has(`${w.date.slice(0, 16)}|${w.name}`));
        set((s) => ({ history: [...s.history, ...fresh] }));
        return fresh.length;
      },

      addBodyweight: (kg, date) => {
        const d = (date || new Date().toISOString()).slice(0, 10);
        set((s) => ({ bodyweights: [...s.bodyweights.filter((b) => b.date !== d), { date: d, kg }].sort((a, b) => a.date.localeCompare(b.date)) }));
      },
      deleteBodyweight: (date) => set((s) => ({ bodyweights: s.bodyweights.filter((b) => b.date !== date) })),
      saveCustomExercise: (e) => set((s) => ({ customExercises: s.customExercises.some((x) => x.id === e.id) ? s.customExercises.map((x) => (x.id === e.id ? e : x)) : [...s.customExercises, { ...e, custom: true }] })),
      deleteCustomExercise: (id) => set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) })),
      saveGym: (g) => set((s) => ({ gyms: s.gyms.some((x) => x.id === g.id) ? s.gyms.map((x) => (x.id === g.id ? g : x)) : [...s.gyms, g] })),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
    }),
    { name: 'gymrace-gym-v1', version: 1 },
  ),
);

/** Ejercicio del catálogo o propio. */
export const useExercise = (id: string) => byId(id, useGymStore.getState().customExercises);
export const activeGym = (s: Pick<GymState, 'gyms' | 'prefs'>) => s.gyms.find((g) => g.id === s.prefs.activeGym) || s.gyms[0];
