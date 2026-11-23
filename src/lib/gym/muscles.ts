import type { Equipment, MuscleId } from './types';

export const MUSCLES: { id: MuscleId; name: string; group: string }[] = [
  { id: 'chest', name: 'Pecho', group: 'Pecho' },
  { id: 'front_delts', name: 'Hombro frontal', group: 'Hombro' },
  { id: 'side_delts', name: 'Hombro lateral', group: 'Hombro' },
  { id: 'rear_delts', name: 'Hombro posterior', group: 'Hombro' },
  { id: 'biceps', name: 'Bíceps', group: 'Brazo' },
  { id: 'triceps', name: 'Tríceps', group: 'Brazo' },
  { id: 'forearms', name: 'Antebrazo', group: 'Brazo' },
  { id: 'abs', name: 'Abdomen', group: 'Core' },
  { id: 'obliques', name: 'Oblicuos', group: 'Core' },
  { id: 'traps', name: 'Trapecio', group: 'Espalda' },
  { id: 'lats', name: 'Dorsal', group: 'Espalda' },
  { id: 'upper_back', name: 'Espalda alta', group: 'Espalda' },
  { id: 'lower_back', name: 'Lumbar', group: 'Espalda' },
  { id: 'glutes', name: 'Glúteo', group: 'Pierna' },
  { id: 'quads', name: 'Cuádriceps', group: 'Pierna' },
  { id: 'hamstrings', name: 'Isquios', group: 'Pierna' },
  { id: 'adductors', name: 'Aductores', group: 'Pierna' },
  { id: 'calves', name: 'Gemelos', group: 'Pierna' },
];

export const muscleName = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.name || id;

export const EQUIPMENT: { id: Equipment; name: string }[] = [
  { id: 'barbell', name: 'Barra' },
  { id: 'dumbbell', name: 'Mancuernas' },
  { id: 'machine', name: 'Máquina' },
  { id: 'cable', name: 'Polea' },
  { id: 'bodyweight', name: 'Peso corporal' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'band', name: 'Banda' },
  { id: 'ez_bar', name: 'Barra Z' },
  { id: 'trap_bar', name: 'Barra hexagonal' },
  { id: 'smith', name: 'Multipower' },
  { id: 'cardio', name: 'Cardio' },
];

export const equipmentName = (id: Equipment) => EQUIPMENT.find((e) => e.id === id)?.name || id;

/** Series semanales recomendadas por músculo (rango orientativo para hipertrofia). */
export const WEEKLY_SETS_TARGET: [number, number] = [10, 20];
