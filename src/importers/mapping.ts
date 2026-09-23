import type { Unit } from '../domain/types';
import { fnv1a } from '../lib/hash';
import type { DateOrder } from './dates';

/** Fields a mapped CSV can supply. Everything but date and exercise is optional. */
export type MappedField =
  | 'date'
  | 'exercise'
  | 'workout'
  | 'duration'
  | 'setOrder'
  | 'weight'
  | 'weightUnit'
  | 'reps'
  | 'distance'
  | 'seconds'
  | 'rpe'
  | 'notes'
  | 'workoutNotes'
  | 'muscles'
  | 'secondaryMuscles';

export interface FieldSpec {
  id: MappedField;
  label: string;
  hint: string;
  required?: boolean;
  /** Header names that usually mean this field, matched loosely. */
  aliases: string[];
}

export const MAPPED_FIELDS: FieldSpec[] = [
  {
    id: 'date',
    label: 'Date',
    hint: 'When the workout started. Every row of a workout repeats it.',
    required: true,
    aliases: ['date', 'datetime', 'start time', 'starttime', 'workout date', 'timestamp', 'day'],
  },
  {
    id: 'exercise',
    label: 'Exercise',
    hint: 'Exercise name.',
    required: true,
    aliases: ['exercise name', 'exercise', 'exercise title', 'movement', 'lift'],
  },
  {
    id: 'weight',
    label: 'Weight',
    hint: 'Weight lifted. Leave unset for bodyweight-only logs.',
    aliases: ['weight', 'weight (kg)', 'weight (lb)', 'weight (lbs)', 'kg', 'lbs', 'load'],
  },
  {
    id: 'reps',
    label: 'Reps',
    hint: 'Repetitions completed.',
    aliases: ['reps', 'rep', 'repetitions', 'rep count'],
  },
  {
    id: 'setOrder',
    label: 'Set number',
    hint: 'Position of the set. Letters like W or D mark warm-up and drop sets.',
    aliases: ['set order', 'set', 'set number', 'set index', 'setnumber', 'set_order'],
  },
  {
    id: 'workout',
    label: 'Workout name',
    hint: 'Groups sets into a session, together with the date.',
    aliases: ['workout name', 'workout', 'routine', 'session', 'workout title', 'program', 'title'],
  },
  {
    id: 'duration',
    label: 'Workout duration',
    hint: 'How long the session took.',
    aliases: ['duration', 'workout duration', 'time', 'elapsed'],
  },
  {
    id: 'weightUnit',
    label: 'Weight unit column',
    hint: 'Only when the file states kg or lb per row.',
    aliases: ['weight unit', 'unit', 'weight_unit', 'units'],
  },
  {
    id: 'distance',
    label: 'Distance',
    hint: 'For cardio entries.',
    aliases: ['distance', 'distance (km)', 'distance (mi)', 'km', 'miles'],
  },
  {
    id: 'seconds',
    label: 'Duration of set',
    hint: 'Seconds held or run, for planks and cardio.',
    aliases: ['seconds', 'duration (s)', 'time (s)', 'set duration', 'hold'],
  },
  {
    id: 'rpe',
    label: 'RPE',
    hint: 'Rate of perceived exertion.',
    aliases: ['rpe', 'rir', 'effort'],
  },
  {
    id: 'notes',
    label: 'Set notes',
    hint: 'Anything you wrote on the set.',
    aliases: ['notes', 'note', 'comment', 'set notes'],
  },
  {
    id: 'workoutNotes',
    label: 'Workout notes',
    hint: 'Notes about the whole session.',
    aliases: ['workout notes', 'session notes', 'description'],
  },
  {
    id: 'muscles',
    label: 'Muscle groups',
    hint: 'Used as-is when present, instead of being guessed from the name.',
    aliases: ['muscle groups', 'muscle group', 'primary muscles', 'muscles', 'target'],
  },
  {
    id: 'secondaryMuscles',
    label: 'Secondary muscles',
    hint: 'Muscles worked indirectly.',
    aliases: ['secondary muscles', 'secondary muscle', 'synergists', 'secondary'],
  },
];

export const REQUIRED_FIELDS = MAPPED_FIELDS.filter((f) => f.required).map((f) => f.id);

/** Which CSV column feeds each field. A missing entry means the field is unmapped. */
export type FieldMap = Partial<Record<MappedField, string>>;

/**
 * Import source id for a mapped layout. Derived from the columns, so renaming a profile
 * or recreating it still dedupes and syncs against earlier imports of the same export.
 */
export function mappedSource(signature: string): string {
  return `custom:${fnv1a(signature)}`;
}

export interface MappingProfile {
  id?: number;
  /** Shown in the picker, e.g. "Hevy". */
  name: string;
  /** Identifies the layout so the same export maps itself next time. */
  signature: string;
  map: FieldMap;
  /** Unit for weights when the file has no unit column. */
  unit: Unit;
  /** How day and month are ordered in this file's dates. */
  dateOrder: DateOrder;
  createdAt: string;
  lastUsedAt: string;
}

const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header-order-independent identity for a CSV layout. */
export function headerSignature(headers: string[]): string {
  return headers.map(normalize).filter(Boolean).sort().join('|');
}

/**
 * First pass at a mapping, from header names alone. An exact alias match wins over a
 * partial one, and no column is used for two fields.
 */
export function guessMapping(headers: string[]): FieldMap {
  const taken = new Set<string>();
  const map: FieldMap = {};
  const score = (header: string, spec: FieldSpec): number => {
    const h = normalize(header);
    if (!h) return 0;
    let best = 0;
    for (const alias of spec.aliases) {
      const a = normalize(alias);
      // A longer alias is a more specific claim, so it outranks a short one that also fits.
      const specificity = Math.min(a.length, 30) / 100;
      if (h === a) best = Math.max(best, 3 + specificity);
      else if (h.startsWith(a) || a.startsWith(h)) best = Math.max(best, 2 + specificity);
      else if (h.includes(a)) best = Math.max(best, 1 + specificity);
    }
    return best;
  };

  for (const spec of MAPPED_FIELDS) {
    let best: { header: string; score: number } | null = null;
    for (const header of headers) {
      if (taken.has(header)) continue;
      const s = score(header, spec);
      if (s > 0 && (!best || s > best.score)) best = { header, score: s };
    }
    if (best) {
      map[spec.id] = best.header;
      taken.add(best.header);
    }
  }
  return map;
}

/**
 * Weight columns usually name their unit, as in "weight_kg". Reading it saves the user
 * from importing a whole history at 2.2x the real load.
 */
export function guessUnit(header: string | undefined, fallback: Unit): Unit {
  const h = header ? normalize(header) : '';
  if (h.includes('kg') || h.includes('kilo')) return 'kg';
  if (h.includes('lb') || h.includes('pound')) return 'lb';
  return fallback;
}

export function missingRequired(map: FieldMap): MappedField[] {
  return REQUIRED_FIELDS.filter((f) => !map[f]);
}

/**
 * A file with one row per workout instead of per set cannot be mapped: its sets live in
 * numbered columns. Detected so the UI can say so rather than importing one set per session.
 */
export function looksWideFormat(headers: string[]): boolean {
  const numbered = headers.filter((h) => /(set|s)\s*_?\.?\s*[1-9]\d?\b/i.test(h));
  return numbered.length >= 3;
}
