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

/** How much to trust a muscle suggestion. See domain/suggest.ts. */
export type Confidence = 'high' | 'medium' | 'low';

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

/**
 * Where a record came from, kept verbatim so it survives renames, merges and links.
 * The app can always answer "which app called this what, and when did it arrive".
 */
export interface SourceRef {
  /** Import source id, e.g. "strong" or "custom:ab12cd34". */
  source: string;
  /** The name that source used, before any rename or merge. */
  name: string;
  /** The import that first brought it in. May dangle once that import is undone. */
  importId: number;
  firstSeen: string;
}

export interface Exercise {
  /** Current name. Also the primary key, so renames rewrite it. */
  name: string;
  baseName: string;
  equipment: string | null;
  muscles: MuscleAssignment;
  muscleSource: MuscleSource;
  /** Unit the logged weights are recorded in. null = use the global default. */
  unit: Unit | null;
  /** Weight is assistance (lower = harder), e.g. "Pull Up (Assisted)". */
  assisted: boolean;
  /** The lift moves your own weight, so logged weight is what you added or took off. */
  bodyweight: boolean;
  /** Share of bodyweight the lift actually moves: 1 for a pull-up, less for a push-up. */
  bodyweightFactor: number;
  /** Every source name that feeds this exercise, gaining an entry on each merge. */
  origins: SourceRef[];
  /**
   * Entry in the bundled exercise catalogue this was matched to. A classification link
   * only: identity always stays with the name the source used.
   */
  catalogId: string | null;
  /** How much to trust the suggested muscles. Absent once you set them yourself. */
  suggestionConfidence: Confidence | null;
  /** Why the suggestion came out the way it did, shown on the exercise page. */
  suggestionReason: string | null;
}

export interface Workout {
  /** Stable identity: `${date}|${name}`. */
  key: string;
  /** Import source this workout arrived from. Never rewritten. */
  originSource: string;
  /** Workout name as the source wrote it. Never rewritten. */
  originName: string;
  /** The import that first brought it in. May dangle once that import is undone. */
  originImportId: number;
  /** Local timestamp, "YYYY-MM-DDTHH:mm:ss" (no timezone, as logged). */
  date: string;
  name: string;
  durationSec: number | null;
  notes: string | null;
  importId: number;
}

export interface WorkoutSet {
  id?: number;
  /** Import source this set arrived from. Never rewritten. */
  originSource: string;
  /**
   * Exercise name as the source wrote it. Kept because `exercise` is rewritten by
   * renames and merges, so this is the only record of which name the set arrived under.
   */
  originName: string;
  /** The import that first brought it in; `importId` is the one that last touched it. */
  originImportId: number;
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

/** A renamed or merged-away exercise name, and what it became. */
export interface ExerciseAlias {
  from: string;
  to: string;
  createdAt: string;
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
