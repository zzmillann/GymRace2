// Importar y exportar datos del módulo de gimnasio: CSV de Strong / Hevy / FitNotes, copia de seguridad JSON,
// CSV propio, rutinas compartidas y peso corporal de Apple Health. Funciones puras (sin React).
import { CATALOG, norm } from './catalog';
import { KG_TO_LB, uid } from './calc';
import type {
  BodyWeight, CatalogExercise, DoneSet, Equipment, ExerciseKind, GymPlaces, GymPrefs, MuscleId, Plan, Routine, SetType, Workout, WorkoutEntry,
} from './types';

export type WeightUnit = 'kg' | 'lb';
export type ImportFormat = 'strong' | 'hevy' | 'fitnotes';

// ─────────────────────────── CSV ───────────────────────────

/** Detecta el separador mirando la primera línea (fuera de comillas). */
function detectDelimiter(text: string): string {
  let inQ = false; const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && (c === '\n' || c === '\r')) break;
    else if (!inQ && c in counts) counts[c]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
}

/** Parser CSV: comillas (con "" escapado), saltos de línea dentro de comillas, CRLF, coma / punto y coma / tabulador. */
export function parseCSV(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const d = delimiter || detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === d) { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const hkey = (s: string) => norm(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** Tabla con acceso por nombre de columna (varios candidatos, sin tildes ni mayúsculas). */
function table(csv: string) {
  const rows = parseCSV(csv);
  const header = (rows[0] || []).map(hkey);
  const body = rows.slice(1);
  const idx = (...names: string[]) => { for (const n of names) { const i = header.indexOf(hkey(n)); if (i >= 0) return i; } return -1; };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  return { header, body, idx, get };
}

/** Número tolerante: «62,5», «62.5», «1.234,5», vacío → undefined. */
export function num(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  let s = String(v).trim().replace(/\s/g, '');
  if (!s) return undefined;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

const MONTHS: Record<string, number> = {
  jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dec: 12, dic: 12,
};

/** Fecha → ISO. Acepta «2023-01-15 08:30:00», ISO, «15/01/2023 8:30», «15 Jan 2023, 08:30», «Jan 15, 2023 8:30 AM». */
export function parseDate(v: string): string | undefined {
  const s = (v || '').trim(); if (!s) return undefined;
  const time = (rest: string) => {
    const t = rest.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!t) return [0, 0, 0];
    let h = +t[1]; const ap = t[4]?.toLowerCase();
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    return [h, +t[2], +(t[3] || 0)];
  };
  const mk = (y: number, mo: number, d: number, rest: string) => {
    if (!y || !mo || !d || mo > 12 || d > 31) return undefined;
    const [h, mi, se] = time(rest);
    const dt = new Date(y < 100 ? 2000 + y : y, mo - 1, d, h, mi, se);
    return Number.isNaN(+dt) ? undefined : dt.toISOString();
  };
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (m) {
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(m[4]) && m[4].includes('T')) { const dt = new Date(s); if (!Number.isNaN(+dt)) return dt.toISOString(); }
    return mk(+m[1], +m[2], +m[3], m[4]);
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(.*)$/);
  if (m) return +m[2] > 12 ? mk(+m[3], +m[1], +m[2], m[4]) : mk(+m[3], +m[2], +m[1], m[4]);   // día/mes/año (europeo); si no cuadra, mes/día/año
  m = s.match(/^(\d{1,2})\s+([a-zA-Z]{3})[a-z]*\.?\s+(\d{4}),?(.*)$/);
  if (m && MONTHS[m[2].toLowerCase()]) return mk(+m[3], MONTHS[m[2].toLowerCase()], +m[1], m[4]);
  m = s.match(/^([a-zA-Z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4}),?(.*)$/);
  if (m && MONTHS[m[1].toLowerCase()]) return mk(+m[3], MONTHS[m[1].toLowerCase()], +m[2], m[4]);
  const dt = new Date(s);
  return Number.isNaN(+dt) ? undefined : dt.toISOString();
}

/** «1h 5m», «45m», «1:05:00», «3900» (s) → segundos. */
function parseDuration(v: string): number | undefined {
  const s = (v || '').trim().toLowerCase(); if (!s) return undefined;
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*h/); const mi = s.match(/(\d+)\s*m(?!s)/); const se = s.match(/(\d+)\s*s/);
  if (h || mi || se) return Math.round((num(h?.[1]) || 0) * 3600 + (num(mi?.[1]) || 0) * 60 + (num(se?.[1]) || 0));
  return num(s);
}

// ─────────────────────────── Ejercicios ───────────────────────────

const ekey = (s: string) => norm(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** Nombres en inglés (Strong / Hevy / FitNotes) → id del catálogo. Las claves se normalizan con `ekey`. */
const ALIASES_RAW: Record<string, string[]> = {
  bench_press: ['Bench Press (Barbell)', 'Bench Press', 'Barbell Bench Press', 'Flat Barbell Bench Press', 'Bench Press - Barbell'],
  incline_bench: ['Incline Bench Press (Barbell)', 'Incline Bench Press', 'Incline Barbell Bench Press'],
  db_bench: ['Bench Press (Dumbbell)', 'Dumbbell Bench Press', 'Flat Dumbbell Bench Press'],
  db_incline: ['Incline Bench Press (Dumbbell)', 'Incline Dumbbell Bench Press', 'Incline Dumbbell Press'],
  db_fly: ['Chest Fly (Dumbbell)', 'Dumbbell Fly', 'Flat Dumbbell Fly', 'Dumbbell Flyes'],
  cable_fly: ['Cable Crossover', 'Cable Fly', 'Chest Fly (Cable)', 'Cable Fly Crossovers'],
  chest_press_machine: ['Chest Press (Machine)', 'Machine Chest Press', 'Chest Press'],
  pec_deck: ['Pec Deck (Machine)', 'Pec Deck', 'Butterfly (Pec Deck)', 'Chest Fly (Machine)', 'Machine Fly'],
  push_up: ['Push Up', 'Push Ups', 'Pushup', 'Push-Up'],
  dips: ['Chest Dip', 'Dip', 'Dips', 'Triceps Dip', 'Parallel Bar Dip', 'Chest Dip (Assisted)'],
  smith_bench: ['Bench Press (Smith Machine)', 'Smith Machine Bench Press'],
  deadlift: ['Deadlift (Barbell)', 'Deadlift', 'Barbell Deadlift', 'Conventional Deadlift'],
  trap_bar_deadlift: ['Deadlift (Trap Bar)', 'Trap Bar Deadlift', 'Hex Bar Deadlift'],
  barbell_row: ['Bent Over Row (Barbell)', 'Barbell Row', 'Bent Over Row', 'Bent Over Barbell Row', 'Pendlay Row (Barbell)'],
  db_row: ['Bent Over One Arm Row (Dumbbell)', 'Dumbbell Row', 'One Arm Dumbbell Row', 'Single Arm Dumbbell Row', 'Dumbbell Row (Single Arm)'],
  pull_up: ['Pull Up', 'Pull Ups', 'Pullup', 'Pull-Up', 'Pull Up (Weighted)', 'Pull Up (Assisted)', 'Wide Grip Pull Up'],
  chin_up: ['Chin Up', 'Chin Ups', 'Chinup', 'Chin-Up', 'Chin Up (Weighted)'],
  lat_pulldown: ['Lat Pulldown (Cable)', 'Lat Pulldown', 'Lat Pulldown (Machine)', 'Wide Grip Lat Pulldown', 'Pulldown'],
  seated_row: ['Seated Cable Row', 'Seated Row (Cable)', 'Seated Cable Row - V Grip (Cable)', 'Cable Row', 'Seated Row'],
  tbar_row: ['T Bar Row', 'T-Bar Row', 'T Bar Row (Machine)'],
  machine_row: ['Seated Row (Machine)', 'Machine Row', 'Iso-Lateral Row (Machine)', 'Row (Machine)'],
  straight_arm_pulldown: ['Straight Arm Pulldown', 'Straight Arm Pulldown (Cable)', 'Cable Pullover'],
  back_extension: ['Back Extension', 'Hyperextension', 'Back Extension (Hyperextension)', 'Back Extension (Machine)'],
  shrug: ['Shrug (Barbell)', 'Barbell Shrug', 'Shrug'],
  db_shrug: ['Shrug (Dumbbell)', 'Dumbbell Shrug'],
  face_pull: ['Face Pull (Cable)', 'Face Pull', 'Face Pulls'],
  ohp: ['Overhead Press (Barbell)', 'Overhead Press', 'Military Press', 'Standing Military Press', 'Strict Military Press', 'Shoulder Press (Barbell)', 'Standing Barbell Shoulder Press (OHP)'],
  db_shoulder_press: ['Shoulder Press (Dumbbell)', 'Dumbbell Shoulder Press', 'Seated Dumbbell Press', 'Overhead Press (Dumbbell)', 'Seated Dumbbell Shoulder Press'],
  machine_shoulder_press: ['Shoulder Press (Machine)', 'Machine Shoulder Press', 'Shoulder Press (Plate Loaded)'],
  lateral_raise: ['Lateral Raise (Dumbbell)', 'Lateral Raise', 'Dumbbell Lateral Raise', 'Side Lateral Raise'],
  cable_lateral: ['Lateral Raise (Cable)', 'Cable Lateral Raise', 'Single Arm Lateral Raise (Cable)'],
  front_raise: ['Front Raise (Dumbbell)', 'Front Raise', 'Dumbbell Front Raise', 'Front Raise (Plate)'],
  rear_delt_fly: ['Reverse Fly (Dumbbell)', 'Rear Delt Fly', 'Bent Over Lateral Raise', 'Rear Delt Reverse Fly (Dumbbell)', 'Reverse Fly'],
  reverse_pec_deck: ['Reverse Fly (Machine)', 'Reverse Pec Deck', 'Rear Delt Reverse Fly (Machine)', 'Rear Delt Fly (Machine)'],
  upright_row: ['Upright Row (Barbell)', 'Upright Row'],
  arnold_press: ['Arnold Press (Dumbbell)', 'Arnold Press'],
  barbell_curl: ['Bicep Curl (Barbell)', 'Barbell Curl', 'Biceps Curl (Barbell)', 'Barbell Biceps Curl'],
  ez_curl: ['EZ Bar Curl', 'Bicep Curl (EZ Bar)', 'EZ-Bar Curl', 'EZ Bar Biceps Curl'],
  db_curl: ['Bicep Curl (Dumbbell)', 'Dumbbell Curl', 'Biceps Curl (Dumbbell)', 'Dumbbell Biceps Curl', 'Alternating Dumbbell Curl'],
  hammer_curl: ['Hammer Curl (Dumbbell)', 'Hammer Curl', 'Dumbbell Hammer Curl'],
  incline_curl: ['Incline Curl (Dumbbell)', 'Incline Dumbbell Curl', 'Seated Incline Curl (Dumbbell)'],
  preacher_curl: ['Preacher Curl (Barbell)', 'Preacher Curl', 'Preacher Curl (EZ Bar)', 'Preacher Curl (Machine)', 'Preacher Curl (Dumbbell)'],
  cable_curl: ['Bicep Curl (Cable)', 'Cable Curl', 'Biceps Curl (Cable)'],
  triceps_pushdown: ['Triceps Pushdown (Cable - Straight Bar)', 'Triceps Pushdown', 'Tricep Pushdown', 'Cable Pushdown', 'Triceps Pushdown (Cable)'],
  rope_pushdown: ['Triceps Rope Pushdown', 'Rope Pushdown', 'Triceps Pushdown (Rope)', 'Tricep Rope Pushdown'],
  skull_crusher: ['Skullcrusher (Barbell)', 'Skull Crusher', 'Skullcrusher', 'Lying Triceps Extension', 'Skullcrusher (EZ Bar)', 'Skullcrusher (Dumbbell)'],
  overhead_triceps: ['Triceps Extension (Dumbbell)', 'Overhead Triceps Extension', 'Overhead Triceps Extension (Cable)', 'Triceps Extension (Cable)', 'Seated Triceps Press'],
  close_grip_bench: ['Bench Press - Close Grip (Barbell)', 'Close Grip Bench Press', 'Close-Grip Bench Press', 'Bench Press (Close Grip)'],
  bench_dip: ['Bench Dip', 'Bench Dips'],
  wrist_curl: ['Wrist Curl (Barbell)', 'Wrist Curl', 'Wrist Curl (Dumbbell)'],
  farmer_walk: ['Farmers Walk', "Farmer's Walk", 'Farmer Walk', 'Farmers Carry'],
  dead_hang: ['Dead Hang', 'Bar Hang'],
  squat: ['Squat (Barbell)', 'Squat', 'Back Squat', 'Barbell Squat', 'Barbell Back Squat', 'Full Squat', 'High Bar Squat', 'Low Bar Squat'],
  front_squat: ['Front Squat (Barbell)', 'Front Squat', 'Barbell Front Squat'],
  goblet_squat: ['Goblet Squat (Kettlebell)', 'Goblet Squat', 'Goblet Squat (Dumbbell)'],
  leg_press: ['Leg Press', 'Leg Press (Machine)', 'Sled Leg Press', 'Horizontal Leg Press'],
  hack_squat: ['Hack Squat', 'Hack Squat (Machine)'],
  smith_squat: ['Squat (Smith Machine)', 'Smith Machine Squat'],
  lunge: ['Lunge (Barbell)', 'Lunge', 'Lunge (Dumbbell)', 'Walking Lunge', 'Walking Lunge (Dumbbell)', 'Lunges', 'Reverse Lunge'],
  bulgarian_split_squat: ['Bulgarian Split Squat', 'Bulgarian Split Squat (Dumbbell)', 'Split Squat', 'Split Squat (Dumbbell)'],
  step_up: ['Step Up', 'Step Up (Dumbbell)', 'Box Step Up'],
  leg_extension: ['Leg Extension (Machine)', 'Leg Extension', 'Leg Extensions'],
  rdl: ['Romanian Deadlift (Barbell)', 'Romanian Deadlift', 'RDL', 'Stiff Leg Deadlift', 'Stiff Leg Deadlift (Barbell)', 'Straight Leg Deadlift'],
  db_rdl: ['Romanian Deadlift (Dumbbell)', 'Dumbbell Romanian Deadlift', 'Stiff Leg Deadlift (Dumbbell)'],
  leg_curl: ['Lying Leg Curl (Machine)', 'Lying Leg Curl', 'Leg Curl', 'Leg Curl (Machine)'],
  seated_leg_curl: ['Seated Leg Curl (Machine)', 'Seated Leg Curl'],
  hip_thrust: ['Hip Thrust (Barbell)', 'Hip Thrust', 'Barbell Hip Thrust', 'Hip Thrust (Machine)'],
  glute_bridge: ['Glute Bridge', 'Glute Bridge (Barbell)', 'Bridge'],
  cable_kickback: ['Glute Kickback (Cable)', 'Cable Kickback', 'Glute Kickback (Machine)', 'Cable Glute Kickback'],
  hip_adduction: ['Hip Adductor (Machine)', 'Hip Adduction (Machine)', 'Hip Adduction', 'Adductor Machine'],
  hip_abduction: ['Hip Abductor (Machine)', 'Hip Abduction (Machine)', 'Hip Abduction', 'Abductor Machine'],
  calf_raise: ['Standing Calf Raise (Machine)', 'Standing Calf Raise', 'Calf Raise', 'Calf Raise (Machine)', 'Standing Calf Raise (Dumbbell)', 'Calf Press on Leg Press', 'Calf Press (Machine)'],
  seated_calf: ['Seated Calf Raise (Machine)', 'Seated Calf Raise', 'Seated Calf Raise (Plate Loaded)'],
  kb_swing: ['Kettlebell Swing', 'Swing (Kettlebell)', 'Kettlebell Swings'],
  pistol_squat: ['Pistol Squat', 'Single Leg Squat'],
  plank: ['Plank', 'Front Plank', 'Plank Hold'],
  side_plank: ['Side Plank'],
  crunch: ['Crunch', 'Crunches', 'Crunch (Machine)', 'Ab Crunch', 'Sit Up', 'Sit Ups'],
  hanging_leg_raise: ['Hanging Leg Raise', 'Hanging Knee Raise', 'Leg Raise', 'Lying Leg Raise', 'Knee Raise (Captain\'s Chair)', 'Leg Raise Parallel Bars'],
  cable_crunch: ['Cable Crunch', 'Kneeling Cable Crunch', 'Crunch (Cable)'],
  ab_wheel: ['Ab Wheel', 'Ab Wheel Rollout', 'Ab Rollout'],
  russian_twist: ['Russian Twist', 'Russian Twists'],
  pallof_press: ['Pallof Press', 'Pallof Press (Cable)'],
  dead_bug: ['Dead Bug', 'Deadbug'],
  power_clean: ['Power Clean', 'Clean (Barbell)', 'Hang Power Clean', 'Clean'],
  thruster: ['Thruster (Barbell)', 'Thruster', 'Thruster (Dumbbell)'],
  burpee: ['Burpee', 'Burpees'],
  treadmill: ['Running (Treadmill)', 'Treadmill', 'Running', 'Walking', 'Treadmill Running', 'Walking (Treadmill)', 'Run', 'Jogging'],
  bike: ['Cycling (Indoor)', 'Stationary Bike', 'Cycling', 'Exercise Bike', 'Spinning', 'Bike', 'Air Bike', 'Assault Bike'],
  rower: ['Rowing (Machine)', 'Rowing Machine', 'Rowing', 'Rower', 'Indoor Rowing', 'Row (Ergometer)'],
  elliptical: ['Elliptical Trainer', 'Elliptical', 'Elliptical Machine', 'Cross Trainer'],
  stair_climber: ['Stair Climber', 'Stair Machine', 'Stairmaster', 'Stair Stepper', 'Climbing (Stair)'],
  jump_rope: ['Jump Rope', 'Skipping', 'Skipping Rope', 'Jump Rope (Skipping)'],
};

const ALIASES: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const ex of CATALOG) { m.set(ekey(ex.name), ex.id); m.set(ekey(ex.id), ex.id); }
  for (const [id, names] of Object.entries(ALIASES_RAW)) for (const n of names) m.set(ekey(n), id);
  return m;
})();

const stripParens = (s: string) => s.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');

/** Nombre importado → id de ejercicio (catálogo o propio), o undefined si no hay coincidencia. */
export function matchExercise(name: string, custom: CatalogExercise[] = []): string | undefined {
  const k = ekey(name); if (!k) return undefined;
  const direct = ALIASES.get(k); if (direct) return direct;
  const own = custom.find((c) => c.id === name.trim() || ekey(c.name) === k || c.id === `custom_${slug(name)}`); if (own) return own.id;
  const bare = ekey(stripParens(name));
  if (bare && bare !== k) { const b = ALIASES.get(bare); if (b) return b; }
  return undefined;
}

export const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'ejercicio';

/** Material deducido del texto entre paréntesis (o del nombre). */
export function guessEquipment(name: string): Equipment {
  const paren = (name.match(/\(([^)]*)\)/)?.[1] || '');
  const t = ekey(paren || name);
  const has = (...ws: string[]) => ws.some((w) => t.includes(w));
  if (has('smith', 'multipower')) return 'smith';
  if (has('trap bar', 'hex bar', 'hexagonal')) return 'trap_bar';
  if (has('ez bar', 'ez', 'barra z')) return 'ez_bar';
  if (has('dumbbell', 'mancuerna')) return 'dumbbell';
  if (has('kettlebell')) return 'kettlebell';
  if (has('cable', 'polea')) return 'cable';
  if (has('band', 'banda', 'goma')) return 'band';
  if (has('machine', 'maquina', 'plate loaded', 'lever')) return 'machine';
  if (has('bodyweight', 'assisted', 'weighted', 'peso corporal')) return 'bodyweight';
  if (has('barbell', 'barra')) return 'barbell';
  if (has('treadmill', 'bike', 'cycling', 'rowing', 'elliptical', 'running', 'cardio')) return 'cardio';
  return paren ? 'machine' : 'barbell';
}

/** Músculo principal deducido de la categoría de FitNotes (o vacío). */
function guessMuscles(category: string): MuscleId[] {
  const c = ekey(category);
  if (!c) return [];
  if (c.includes('chest') || c.includes('pecho')) return ['chest'];
  if (c.includes('back') || c.includes('espalda')) return ['lats', 'upper_back'];
  if (c.includes('shoulder') || c.includes('hombro')) return ['side_delts', 'front_delts'];
  if (c.includes('bicep')) return ['biceps'];
  if (c.includes('tricep')) return ['triceps'];
  if (c.includes('arm') || c.includes('brazo')) return ['biceps', 'triceps'];
  if (c.includes('leg') || c.includes('pierna')) return ['quads', 'hamstrings', 'glutes'];
  if (c.includes('glute') || c.includes('gluteo')) return ['glutes'];
  if (c.includes('calf') || c.includes('calves') || c.includes('gemelo')) return ['calves'];
  if (c.includes('abs') || c.includes('core') || c.includes('abdominal')) return ['abs'];
  if (c.includes('cardio')) return ['quads'];
  return [];
}

// ─────────────────────────── Construcción de entrenos ───────────────────────────

interface RawSet {
  exName: string;
  category?: string;
  set: DoneSet;
  superset?: string;
  exNote?: string;
}

interface RawWorkout {
  key: string;
  date: string;
  endedAt?: string;
  name: string;
  note?: string;
  sets: RawSet[];
}

interface Stats { kg: boolean; reps: boolean; sec: boolean; dist: boolean; category?: string; }

/** Agrupa series en entradas (ejercicio consecutivo = misma entrada) y resuelve nombres. */
function buildWorkouts(raws: RawWorkout[], source: Workout['source'], custom: CatalogExercise[]) {
  const unknown = new Map<string, Stats>();
  const idFor = (name: string) => matchExercise(name, custom) || `custom_${slug(name)}`;
  const workouts: Workout[] = [];
  for (const rw of raws) {
    const entries: WorkoutEntry[] = [];
    for (const rs of rw.sets) {
      const exId = idFor(rs.exName);
      if (!matchExercise(rs.exName, custom)) {
        const st = unknown.get(rs.exName) || { kg: false, reps: false, sec: false, dist: false };
        st.kg ||= (rs.set.kg || 0) > 0; st.reps ||= (rs.set.reps || 0) > 0; st.sec ||= (rs.set.seconds || 0) > 0; st.dist ||= (rs.set.distanceKm || 0) > 0;
        st.category ||= rs.category;
        unknown.set(rs.exName, st);
      }
      const last = entries[entries.length - 1];
      if (last && last.exId === exId && (last.superset || '') === (rs.superset || '')) last.sets.push(rs.set);
      else entries.push({ uid: uid(), exId, sets: [rs.set], superset: rs.superset || undefined, note: rs.exNote || undefined });
    }
    if (!entries.length) continue;
    workouts.push({ id: uid(), date: rw.date, endedAt: rw.endedAt, name: rw.name || 'Entreno importado', entries, note: rw.note || undefined, source });
  }
  workouts.sort((a, b) => a.date.localeCompare(b.date));
  const unknownNames = Array.from(unknown.keys());
  const newExercises: CatalogExercise[] = unknownNames.map((name) => {
    const st = unknown.get(name)!;
    const equipment = st.dist && !st.kg ? 'cardio' : guessEquipment(name);
    const kind: ExerciseKind = st.kg ? 'weight' : st.dist || equipment === 'cardio' ? 'cardio' : st.sec && !st.reps ? 'time' : st.reps ? 'reps' : 'weight';
    return { id: `custom_${slug(name)}`, name: name.trim(), primary: guessMuscles(st.category || ''), secondary: [], equipment, kind, steps: [], custom: true };
  });
  return { workouts, newExercises, unknownNames };
}

function groupRows<T>(rows: T[], keyOf: (r: T) => string) {
  const map = new Map<string, T[]>();
  for (const r of rows) { const k = keyOf(r); const arr = map.get(k); if (arr) arr.push(r); else map.set(k, [r]); }
  return map;
}

const clean = (o: DoneSet): DoneSet => {
  const out: DoneSet = { type: o.type, done: true };
  if (o.kg != null && o.kg > 0) out.kg = Math.round(o.kg * 100) / 100;
  if (o.reps != null && o.reps > 0) out.reps = Math.round(o.reps);
  if (o.seconds != null && o.seconds > 0) out.seconds = Math.round(o.seconds);
  if (o.distanceKm != null && o.distanceKm > 0) out.distanceKm = Math.round(o.distanceKm * 1000) / 1000;
  if (o.effort != null && o.effort > 0) out.effort = o.effort;
  return out;
};

const distToKm = (v: number | undefined, unit: string) => {
  if (v == null) return undefined;
  const u = ekey(unit);
  if (u.startsWith('mi')) return v * 1.609344;
  if (u === 'm' || u.startsWith('meter') || u.startsWith('metre') || u.startsWith('metro')) return v / 1000;
  if (u.startsWith('ft') || u.startsWith('feet')) return v * 0.0003048;
  if (u.startsWith('yd') || u.startsWith('yard')) return v * 0.0009144;
  return v;
};

const lbToKg = (v: number) => v / KG_TO_LB;

// ─────────────────────────── Strong ───────────────────────────

/** CSV de Strong (también acepta el CSV propio que exporta GymRace, con cabeceras en español). */
export function parseStrong(csv: string, unit: WeightUnit = 'kg', custom: CatalogExercise[] = []) {
  const t = table(csv);
  const c = {
    date: t.idx('Date', 'Fecha'), wname: t.idx('Workout Name', 'Entreno', 'Nombre del entreno'), dur: t.idx('Duration', 'Duración', 'Duracion', 'Duración (min)'),
    ex: t.idx('Exercise Name', 'Ejercicio', 'Exercise'), order: t.idx('Set Order', 'Serie', 'Set'), type: t.idx('Tipo', 'Set Type'),
    kg: t.idx('Weight (kg)', 'Peso (kg)'), lb: t.idx('Weight (lb)', 'Weight (lbs)', 'Peso (lb)'), w: t.idx('Weight', 'Peso'),
    reps: t.idx('Reps', 'Repeticiones'), dist: t.idx('Distance', 'Distancia', 'Distancia (km)', 'Distance (km)'), distUnit: t.idx('Distance Unit'),
    sec: t.idx('Seconds', 'Segundos'), notes: t.idx('Notes', 'Notas'), wnotes: t.idx('Workout Notes', 'Notas del entreno'), rpe: t.idx('RPE', 'Esfuerzo'),
  };
  if (c.date < 0 || c.ex < 0) throw new Error('El CSV no tiene las columnas de Strong (Date, Exercise Name…).');
  const raws: RawWorkout[] = [];
  const groups = groupRows(t.body, (r) => `${t.get(r, c.date)}|${t.get(r, c.wname)}`);
  for (const [key, rows] of Array.from(groups)) {
    const date = parseDate(t.get(rows[0], c.date)); if (!date) continue;
    let durS = parseDuration(t.get(rows[0], c.dur));
    if (durS != null && c.dur >= 0 && /min/.test(t.header[c.dur])) durS *= 60;
    const endedAt = durS ? new Date(+new Date(date) + durS * 1000).toISOString() : undefined;
    const sets: RawSet[] = [];
    for (const r of rows) {
      const exName = t.get(r, c.ex); if (!exName) continue;
      const order = t.get(r, c.order).toLowerCase();
      if (order.includes('rest') || order.includes('descanso')) continue;
      const typeTxt = (t.get(r, c.type) || order).toLowerCase();
      const type: SetType = /^w|warm|calent/.test(typeTxt) ? 'warmup' : /^d|drop/.test(typeTxt) ? 'drop' : 'normal';
      let kg: number | undefined;
      if (c.kg >= 0) kg = num(t.get(r, c.kg));
      else if (c.lb >= 0) { const v = num(t.get(r, c.lb)); kg = v != null ? lbToKg(v) : undefined; }
      else { const v = num(t.get(r, c.w)); kg = v != null ? (unit === 'lb' ? lbToKg(v) : v) : undefined; }
      const distRaw = num(t.get(r, c.dist));
      const distanceKm = c.distUnit >= 0 ? distToKm(distRaw, t.get(r, c.distUnit)) : distRaw;
      sets.push({ exName, exNote: t.get(r, c.notes), set: clean({ type, kg, reps: num(t.get(r, c.reps)), seconds: num(t.get(r, c.sec)), distanceKm, effort: num(t.get(r, c.rpe)), done: true }) });
    }
    raws.push({ key, date, endedAt, name: t.get(rows[0], c.wname), note: t.get(rows[0], c.wnotes), sets });
  }
  return buildWorkouts(raws, 'strong', custom);
}

// ─────────────────────────── Hevy ───────────────────────────

export function parseHevy(csv: string, custom: CatalogExercise[] = []) {
  const t = table(csv);
  const c = {
    title: t.idx('title'), start: t.idx('start_time'), end: t.idx('end_time'), desc: t.idx('description'),
    ex: t.idx('exercise_title'), ss: t.idx('superset_id'), exNotes: t.idx('exercise_notes'), type: t.idx('set_type'),
    kg: t.idx('weight_kg'), lb: t.idx('weight_lbs', 'weight_lb'), reps: t.idx('reps'),
    km: t.idx('distance_km'), mi: t.idx('distance_miles', 'distance_mi'), m: t.idx('distance_meters', 'distance_m'),
    sec: t.idx('duration_seconds'), rpe: t.idx('rpe'),
  };
  if (c.start < 0 || c.ex < 0) throw new Error('El CSV no tiene las columnas de Hevy (start_time, exercise_title…).');
  const raws: RawWorkout[] = [];
  const groups = groupRows(t.body, (r) => `${t.get(r, c.start)}|${t.get(r, c.title)}`);
  for (const [key, rows] of Array.from(groups)) {
    const date = parseDate(t.get(rows[0], c.start)); if (!date) continue;
    const sets: RawSet[] = [];
    for (const r of rows) {
      const exName = t.get(r, c.ex); if (!exName) continue;
      const st = t.get(r, c.type).toLowerCase();
      const type: SetType = st.startsWith('warm') ? 'warmup' : st.startsWith('drop') ? 'drop' : 'normal';
      const lb = num(t.get(r, c.lb));
      const kg = c.kg >= 0 ? num(t.get(r, c.kg)) : lb != null ? lbToKg(lb) : undefined;
      const mi = num(t.get(r, c.mi)); const m = num(t.get(r, c.m));
      const distanceKm = c.km >= 0 ? num(t.get(r, c.km)) : mi != null ? mi * 1.609344 : m != null ? m / 1000 : undefined;
      const ss = t.get(r, c.ss);
      sets.push({ exName, exNote: t.get(r, c.exNotes), superset: ss ? `hevy_${key}_${ss}` : undefined, set: clean({ type, kg, reps: num(t.get(r, c.reps)), seconds: num(t.get(r, c.sec)), distanceKm, effort: num(t.get(r, c.rpe)), done: true }) });
    }
    raws.push({ key, date, endedAt: parseDate(t.get(rows[0], c.end)), name: t.get(rows[0], c.title), note: t.get(rows[0], c.desc), sets });
  }
  const out = buildWorkouts(raws, 'hevy', custom);
  // superserie: ids más cortos y estables
  for (const w of out.workouts) { const map = new Map<string, string>(); for (const e of w.entries) if (e.superset) { if (!map.has(e.superset)) map.set(e.superset, uid()); e.superset = map.get(e.superset); } }
  return out;
}

// ─────────────────────────── FitNotes ───────────────────────────

export function parseFitNotes(csv: string, custom: CatalogExercise[] = []) {
  const t = table(csv);
  const c = {
    date: t.idx('Date', 'Fecha'), ex: t.idx('Exercise', 'Ejercicio'), cat: t.idx('Category', 'Categoría', 'Categoria'),
    kg: t.idx('Weight (kg)', 'Weight (kgs)', 'Peso (kg)'), lb: t.idx('Weight (lbs)', 'Weight (lb)'), w: t.idx('Weight', 'Peso'), wUnit: t.idx('Weight Unit', 'Unidad de peso'),
    reps: t.idx('Reps', 'Repeticiones'), dist: t.idx('Distance', 'Distancia'), distUnit: t.idx('Distance Unit', 'Unidad de distancia'),
    time: t.idx('Time', 'Tiempo', 'Duration'), comment: t.idx('Comment', 'Comentario', 'Notes'),
  };
  if (c.date < 0 || c.ex < 0) throw new Error('El CSV no tiene las columnas de FitNotes (Date, Exercise…).');
  const raws: RawWorkout[] = [];
  const groups = groupRows(t.body, (r) => t.get(r, c.date));
  for (const [key, rows] of Array.from(groups)) {
    const date = parseDate(t.get(rows[0], c.date)); if (!date) continue;
    const sets: RawSet[] = [];
    for (const r of rows) {
      const exName = t.get(r, c.ex); if (!exName) continue;
      let kg: number | undefined;
      if (c.kg >= 0) kg = num(t.get(r, c.kg));
      else if (c.lb >= 0) { const v = num(t.get(r, c.lb)); kg = v != null ? lbToKg(v) : undefined; }
      else { const v = num(t.get(r, c.w)); const u = ekey(t.get(r, c.wUnit)); kg = v != null ? (u.startsWith('lb') ? lbToKg(v) : v) : undefined; }
      const distanceKm = distToKm(num(t.get(r, c.dist)), t.get(r, c.distUnit) || 'km');
      sets.push({ exName, category: t.get(r, c.cat), exNote: t.get(r, c.comment), set: clean({ type: 'normal', kg, reps: num(t.get(r, c.reps)), seconds: parseDuration(t.get(r, c.time)), distanceKm, done: true }) });
    }
    raws.push({ key, date, name: 'Entreno (FitNotes)', sets });
  }
  return buildWorkouts(raws, 'fitnotes', custom);
}

// ─────────────────────────── Autodetección ───────────────────────────

export function detectFormat(csv: string): ImportFormat | null {
  const first = parseCSV(csv.slice(0, 4000))[0] || [];
  const h = new Set(first.map(hkey));
  if (h.has('exercise title') || (h.has('start time') && h.has('set index'))) return 'hevy';
  if (h.has('set order') || h.has('workout name') || h.has('exercise name') || (h.has('ejercicio') && h.has('serie'))) return 'strong';
  if ((h.has('exercise') || h.has('ejercicio')) && (h.has('category') || h.has('categoria') || h.has('weight unit'))) return 'fitnotes';
  return null;
}

export interface ImportResult {
  format: ImportFormat;
  workouts: Workout[];
  newExercises: CatalogExercise[];
  unknownNames: string[];
}

/** Detecta el formato (Strong, Hevy o FitNotes) y lo importa. `unit` solo se usa si el archivo no dice la unidad (Strong). */
export function importAny(csv: string, unit: WeightUnit = 'kg', custom: CatalogExercise[] = []): ImportResult {
  const format = detectFormat(csv);
  if (!format) throw new Error('No se reconoce el formato. Usa el CSV exportado desde Strong, Hevy o FitNotes.');
  const r = format === 'hevy' ? parseHevy(csv, custom) : format === 'fitnotes' ? parseFitNotes(csv, custom) : parseStrong(csv, unit, custom);
  return { format, ...r };
}

// ─────────────────────────── Copia de seguridad JSON ───────────────────────────

export interface GymBackup {
  app: 'gymrace-gym';
  version: 1;
  exportedAt: string;
  routines: Routine[];
  plan: Plan;
  history: Workout[];
  bodyweights: BodyWeight[];
  customExercises: CatalogExercise[];
  gyms: GymPlaces[];
  prefs: GymPrefs;
}

export type BackupState = Pick<GymBackup, 'routines' | 'plan' | 'history' | 'bodyweights' | 'customExercises' | 'gyms' | 'prefs'>;

export function exportJSON(state: BackupState): string {
  const b: GymBackup = {
    app: 'gymrace-gym', version: 1, exportedAt: new Date().toISOString(),
    routines: state.routines, plan: state.plan, history: state.history, bodyweights: state.bodyweights,
    customExercises: state.customExercises, gyms: state.gyms, prefs: state.prefs,
  };
  return JSON.stringify(b, null, 1);
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Lee y valida una copia de seguridad. Lanza un Error con mensaje en español si no es válida. */
export function importJSON(text: string): GymBackup {
  let data: unknown;
  try { data = JSON.parse(text.replace(/^﻿/, '')); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!isObj(data) || data.app !== 'gymrace-gym') throw new Error('No es una copia de seguridad del gimnasio de GymRace.');
  if (typeof data.version !== 'number' || data.version > 1) throw new Error('La copia es de una versión más nueva de GymRace. Actualiza la app.');
  const arr = (k: string) => { const v = data as Record<string, unknown>; if (v[k] == null) return []; if (!Array.isArray(v[k])) throw new Error(`Copia dañada: «${k}» no es una lista.`); return v[k] as unknown[]; };
  const history = arr('history') as Workout[];
  if (history.some((w) => !isObj(w) || typeof w.id !== 'string' || typeof w.date !== 'string' || !Array.isArray(w.entries))) throw new Error('Copia dañada: hay entrenos con formato incorrecto.');
  const routines = arr('routines') as Routine[];
  if (routines.some((r) => !isObj(r) || typeof r.id !== 'string' || !Array.isArray(r.items))) throw new Error('Copia dañada: hay rutinas con formato incorrecto.');
  const bodyweights = (arr('bodyweights') as BodyWeight[]).filter((b) => isObj(b) && typeof b.date === 'string' && typeof b.kg === 'number');
  const customExercises = (arr('customExercises') as CatalogExercise[]).filter((e) => isObj(e) && typeof e.id === 'string' && typeof e.name === 'string');
  const gyms = (arr('gyms') as GymPlaces[]).filter((g) => isObj(g) && typeof g.id === 'string' && Array.isArray(g.plates));
  const plan = isObj(data.plan) ? (data.plan as unknown as Plan) : { mode: 'week' as const, week: {}, rotation: [], moves: {} };
  const prefs = isObj(data.prefs) ? (data.prefs as unknown as GymPrefs) : ({} as GymPrefs);
  return {
    app: 'gymrace-gym', version: 1, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    routines, plan: { mode: plan.mode === 'rotation' ? 'rotation' : 'week', week: plan.week || {}, rotation: plan.rotation || [], moves: plan.moves || {} },
    history, bodyweights, customExercises, gyms, prefs,
  };
}

// ─────────────────────────── CSV propio ───────────────────────────

const csvCell = (v: string | number | undefined) => {
  const s = v == null ? '' : String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const dec = (n: number | undefined, digits = 2) => (n == null ? '' : String(Math.round(n * 10 ** digits) / 10 ** digits).replace('.', ','));
const TYPE_ES: Record<SetType, string> = { normal: 'Normal', warmup: 'Calentamiento', drop: 'Drop set', restpause: 'Rest-pause' };

/** Historial → CSV (una fila por serie) con «;» y coma decimal, listo para Excel en español. Se puede volver a importar. */
export function exportCSV(history: Workout[], unit: WeightUnit = 'kg', custom: CatalogExercise[] = []): string {
  const nameOf = (id: string) => CATALOG.find((e) => e.id === id)?.name || custom.find((e) => e.id === id)?.name || id;
  const head = ['Fecha', 'Entreno', 'Duración (min)', 'Ejercicio', 'Serie', 'Tipo', `Peso (${unit})`, 'Reps', 'Distancia (km)', 'Segundos', 'Esfuerzo', 'Notas', 'Notas del entreno'];
  const lines = [head.join(';')];
  const pad = (n: number) => String(n).padStart(2, '0');
  for (const w of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const d = new Date(w.date);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const mins = w.endedAt ? Math.max(1, Math.round((+new Date(w.endedAt) - +d) / 60000)) : undefined;
    for (const e of w.entries) e.sets.forEach((s, i) => {
      const kg = s.kg != null ? (unit === 'lb' ? s.kg * KG_TO_LB : s.kg) : undefined;
      const reps = s.reps != null || s.repsLeft != null ? (s.reps || 0) + (s.repsLeft || 0) : undefined;
      lines.push([date, w.name, mins, nameOf(e.exId), i + 1, TYPE_ES[s.type] || s.type, dec(kg), reps, dec(s.distanceKm, 3), s.seconds, s.effort, e.note, i === 0 ? w.note : '']
        .map((v) => csvCell(v as string | number | undefined)).join(';'));
    });
  }
  return '﻿' + lines.join('\r\n');
}

// ─────────────────────────── Rutinas compartidas ───────────────────────────

export interface RoutineShare { app: 'gymrace-routine'; v: 1; routine: Routine; exercises: CatalogExercise[]; }

/** Rutina → JSON pequeño con los ejercicios propios que usa. */
export function routineToShareFile(routine: Routine, custom: CatalogExercise[] = []): string {
  const ids = new Set(routine.items.flatMap((it) => [it.exId, it.backupExId].filter(Boolean) as string[]));
  const exercises = custom.filter((e) => ids.has(e.id));
  const share: RoutineShare = { app: 'gymrace-routine', v: 1, routine, exercises };
  return JSON.stringify(share, null, 1);
}

/** Lee una rutina compartida y le asigna ids nuevos (rutina, ítems y superseries). */
export function routineFromShareFile(text: string): { routine: Routine; exercises: CatalogExercise[] } {
  let data: unknown;
  try { data = JSON.parse(text.replace(/^﻿/, '')); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!isObj(data) || data.app !== 'gymrace-routine' || !isObj(data.routine)) throw new Error('No es una rutina compartida de GymRace.');
  const r = data.routine as unknown as Routine;
  if (!Array.isArray(r.items)) throw new Error('La rutina compartida está dañada.');
  const ss = new Map<string, string>();
  const routine: Routine = {
    ...r, id: uid(), name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Rutina compartida',
    items: r.items.filter((it) => isObj(it) && typeof it.exId === 'string').map((it) => {
      let superset: string | undefined;
      if (it.superset) { if (!ss.has(it.superset)) ss.set(it.superset, uid()); superset = ss.get(it.superset); }
      return { ...it, uid: uid(), superset, sets: Array.isArray(it.sets) ? it.sets : [], rest: typeof it.rest === 'number' ? it.rest : 90 };
    }),
  };
  const exercises = (Array.isArray(data.exercises) ? data.exercises : [])
    .filter((e): e is CatalogExercise => isObj(e) && typeof e.id === 'string' && typeof e.name === 'string')
    .map((e) => ({ ...e, primary: Array.isArray(e.primary) ? e.primary : [], secondary: Array.isArray(e.secondary) ? e.secondary : [], steps: Array.isArray(e.steps) ? e.steps : [], custom: true }));
  return { routine, exercises };
}

// ─────────────────────────── Peso corporal (Apple Health) ───────────────────────────

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

/**
 * Apple Health export.xml (registros HKQuantityTypeIdentifierBodyMass) o CSV sencillo «fecha,kg» (con o sin cabecera,
 * con columna opcional de unidad). Un valor por día (el último), ordenado por fecha.
 */
export function parseAppleHealthWeight(text: string): BodyWeight[] {
  const byDay = new Map<string, number>();
  const put = (dateIso: string | undefined, kg: number | undefined) => {
    if (!dateIso || kg == null || !Number.isFinite(kg) || kg < 20 || kg > 400) return;
    byDay.set(dateIso.slice(0, 10), Math.round(kg * 100) / 100);
  };
  const toKgUnit = (v: number, u: string) => { const x = (u || 'kg').toLowerCase(); return x.startsWith('lb') ? lbToKg(v) : x === 'g' ? v / 1000 : x === 'st' ? v * 6.35029 : v; };

  if (/<\s*(HealthData|Record)\b/.test(text)) {
    const re = /<Record\b[^>]*type="HKQuantityTypeIdentifierBodyMass"[^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const tag = m[0];
      const v = num(attr(tag, 'value')); if (v == null) continue;
      const d = attr(tag, 'startDate') || attr(tag, 'creationDate') || '';
      const day = d.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      put(day, toKgUnit(v, attr(tag, 'unit') || 'kg'));
    }
  } else {
    const rows = parseCSV(text);
    for (const r of rows) {
      if (r.length < 2) continue;
      const iso = parseDate(r[0]); const v = num(r[1]);
      if (!iso || v == null) continue;   // cabecera u otras filas
      // fecha local (sin desfase horario) para el día
      const day = /^\d{4}-\d{2}-\d{2}/.test(r[0].trim()) ? r[0].trim().slice(0, 10) : (() => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
      put(day, toKgUnit(v, r[2]?.trim() || 'kg'));
    }
  }
  return Array.from(byDay.entries()).map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
}
