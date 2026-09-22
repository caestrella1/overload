export type Unit = 'lb' | 'kg';

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export type MuscleGroup =
  | 'Chest'
  | 'Lats'
  | 'Upper Back'
  | 'Lower Back'
  | 'Traps'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Abs'
  | 'Obliques'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Adductors'
  | 'Abductors'
  | 'Calves'
  | 'Cardio'
  | 'Full Body';

export interface MuscleAssignment {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
}

/**
 * Where an exercise's muscle groups came from.
 * - source: the import file specified them
 * - user: set or confirmed manually
 * - suggested: guessed from the built-in mapping or name keywords; needs review
 * - unassigned: nothing known
 */
export type MuscleSource = 'source' | 'user' | 'suggested' | 'unassigned';

export interface Exercise {
  /** Exercise name exactly as it appears in the source, e.g. "Bench Press (Barbell)". */
  name: string;
  baseName: string;
  equipment: string | null;
  muscles: MuscleAssignment;
  muscleSource: MuscleSource;
  /** Unit the logged weights are recorded in. null = use the global default. */
  unit: Unit | null;
  /** Weight is assistance (lower = harder), e.g. "Pull Up (Assisted)". */
  assisted: boolean;
}

export interface Workout {
  /** Stable identity: `${date}|${name}`. */
  key: string;
  /** Local timestamp, "YYYY-MM-DDTHH:mm:ss" (no timezone, as logged). */
  date: string;
  name: string;
  durationSec: number | null;
  notes: string | null;
  importId: number;
}

export interface WorkoutSet {
  id?: number;
  /** Identity used for dedupe: date, exercise, set order and occurrence. */
  key: string;
  /** Hash of the logged values; differs when a set was edited in the source app. */
  contentHash: string;
  workoutKey: string;
  date: string;
  exercise: string;
  /** Raw set label from the source ("1", "W", "D"...). */
  setLabel: string;
  /** 1-based position of the set within its exercise block. */
  setIndex: number;
  setType: SetType;
  weight: number | null;
  reps: number | null;
  distance: number | null;
  seconds: number | null;
  rpe: number | null;
  notes: string | null;
  importId: number;
}

export interface ImportRecord {
  id?: number;
  source: string;
  fileName: string;
  fileHash: string;
  importedAt: string;
  rowCount: number;
  added: number;
  updated: number;
  duplicates: number;
  /** Sets deleted because a sync import no longer contained them. */
  removed: number;
  dateRange: [string, string] | null;
}

export type E1rmFormula = 'epley' | 'brzycki';

export interface Settings {
  defaultUnit: Unit;
  e1rmFormula: E1rmFormula;
  includeWarmups: boolean;
  /** Weight of a secondary muscle when counting sets per muscle group. */
  secondaryWeight: number;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultUnit: 'lb',
  e1rmFormula: 'epley',
  includeWarmups: false,
  secondaryWeight: 0.5,
};
