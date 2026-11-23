// Tipos del módulo de gimnasio (rutinas, entrenos, progreso). Los pesos se guardan SIEMPRE en kg.

export type MuscleId =
  | 'chest' | 'front_delts' | 'side_delts' | 'rear_delts' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'traps' | 'lats' | 'upper_back' | 'lower_back'
  | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'calves';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'ez_bar' | 'trap_bar' | 'smith' | 'cardio';

/** Cómo se registra: peso×reps, solo reps (peso corporal), tiempo (plancha) o cardio (tiempo + distancia/velocidad). */
export type ExerciseKind = 'weight' | 'reps' | 'time' | 'cardio';

export interface CatalogExercise {
  id: string;
  name: string;
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: Equipment;
  kind: ExerciseKind;
  perSide?: boolean;   // zancadas, trabajo a una mano: se registran reps por lado
  steps: string[];
  custom?: boolean;    // creado por el usuario
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'restpause';

/** Serie planificada en una rutina. */
export interface PlannedSet {
  type: SetType;
  reps?: number;        // objetivo (o rango con repsMax)
  repsMax?: number;
  kg?: number;          // si se fija; si no, se toma del último entreno
  seconds?: number;     // ejercicios de tiempo / cardio
  rest?: number;        // descanso tras esta serie (s); si falta, el del ejercicio
}

export type ProgressionRule = 'none' | 'linear' | 'double';

export interface RoutineItem {
  uid: string;
  exId: string;
  sets: PlannedSet[];
  rest: number;               // descanso por defecto (s)
  superset?: string;          // mismo id = superserie
  backupExId?: string;        // alternativa si la máquina está ocupada
  progression?: ProgressionRule;
  incrementKg?: number;       // lineal: cuánto subir
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  deload?: boolean;           // semana de descarga: -40 % de peso
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0 = lunes … 6 = domingo

export interface Plan {
  mode: 'week' | 'rotation';
  week: Partial<Record<Weekday, string | null>>;   // día → id de rutina (null = descanso)
  rotation: string[];                              // A, B, C…: la siguiente es la que toca
  moves: Record<string, string | null>;            // 'YYYY-MM-DD' → rutina movida a ese día (sin tocar el plan)
}

export interface DoneSet {
  type: SetType;
  kg?: number;
  reps?: number;
  repsLeft?: number;          // por lado
  seconds?: number;
  distanceKm?: number;
  effort?: number;            // RIR (0-5) o RPE (6-10) según ajustes
  done: boolean;
  pr?: boolean;
}

export interface WorkoutEntry {
  uid: string;
  exId: string;
  sets: DoneSet[];
  superset?: string;
  note?: string;
}

export interface Workout {
  id: string;
  date: string;               // ISO de inicio
  endedAt?: string;
  routineId?: string;
  name: string;
  entries: WorkoutEntry[];
  note?: string;
  source?: 'app' | 'strong' | 'hevy' | 'fitnotes' | 'manual';
}

export interface BodyWeight { date: string; kg: number; }

export interface GymPlaces {
  id: string;
  name: string;
  barKg: number;              // barra olímpica
  ezKg: number;
  trapKg: number;
  smithKg: number;
  plates: number[];           // discos disponibles (por lado), en kg
  dumbbells?: number[];
}

export interface GymPrefs {
  effort: 'off' | 'rir' | 'rpe';
  autoRest: boolean;          // al marcar una serie arranca el descanso
  keepAwake: boolean;
  flashOnRest: boolean;       // destello al acabar el descanso (gimnasios ruidosos)
  goalKg?: number;            // peso corporal objetivo
  goalMode?: 'lose' | 'gain' | 'hold';
  activeGym: string;
}
