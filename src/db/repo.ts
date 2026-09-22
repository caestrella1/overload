import { parseExerciseName, isAssistedName } from '../domain/exerciseName';
import { suggestMuscles } from '../domain/muscles';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type ImportRecord,
  type MuscleAssignment,
  type Settings,
  type Workout,
  type WorkoutSet,
} from '../domain/types';
import { planImport, type ExistingSetRef, type ImportPlan } from '../importers/plan';
import type { ParseResult, ParsedExercise } from '../importers/types';
import type { OverloadDB } from './db';

const SETTINGS_KEY = 'settings';
export const BACKUP_VERSION = 1;

export async function loadSettings(db: OverloadDB): Promise<Settings> {
  const row = await db.meta.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) };
}

export async function saveSettings(db: OverloadDB, patch: Partial<Settings>): Promise<void> {
  const current = await loadSettings(db);
  await db.meta.put({ key: SETTINGS_KEY, value: { ...current, ...patch } });
}

export interface ImportPreview {
  plan: ImportPlan;
  /** A previous import of the byte-identical file, if any. */
  sameFile: ImportRecord | null;
  newExercises: { name: string; muscles: MuscleAssignment | null; fromSource: boolean }[];
  newWorkouts: number;
  dateRange: [string, string] | null;
}

export async function previewImport(
  db: OverloadDB,
  parsed: ParseResult,
  fileHash: string,
): Promise<ImportPreview> {
  const keys = parsed.sets.map((s) => s.key);
  const found = await db.sets.where('key').anyOf(keys).toArray();
  const existing = new Map<string, ExistingSetRef>(
    found.map((s) => [s.key, { id: s.id ?? 0, contentHash: s.contentHash }]),
  );
  const plan = planImport(parsed.sets, existing);

  const sameFile = (await db.imports.where('fileHash').equals(fileHash).first()) ?? null;

  const known = new Set(
    (await db.exercises.bulkGet(parsed.exercises.map((e) => e.name)))
      .filter((e): e is Exercise => !!e)
      .map((e) => e.name),
  );
  const newExercises = parsed.exercises
    .filter((e) => !known.has(e.name))
    .map((e) => ({
      name: e.name,
      muscles: e.muscles ?? suggestMuscles(e.name),
      fromSource: !!e.muscles,
    }));

  const workoutKeys = parsed.workouts.map((w) => w.key);
  const existingWorkouts = await db.workouts.where('key').anyOf(workoutKeys).primaryKeys();
  const dates = parsed.sets.map((s) => s.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];

  return {
    plan,
    sameFile,
    newExercises,
    newWorkouts: workoutKeys.length - existingWorkouts.length,
    dateRange: first && last ? [first, last] : null,
  };
}

/** Builds or updates an exercise record, honoring muscle-source precedence: user > source > suggested. */
export function mergeExercise(existing: Exercise | undefined, parsed: ParsedExercise): Exercise {
  const { baseName, equipment } = parseExerciseName(parsed.name);
  const base: Exercise = existing ?? {
    name: parsed.name,
    baseName,
    equipment,
    muscles: { primary: [], secondary: [] },
    muscleSource: 'unassigned',
    unit: null,
    assisted: isAssistedName(parsed.name),
  };
  const next = { ...base };
  if (parsed.muscles && next.muscleSource !== 'user') {
    next.muscles = parsed.muscles;
    next.muscleSource = 'source';
  } else if (next.muscleSource === 'unassigned') {
    const suggestion = suggestMuscles(parsed.name);
    if (suggestion) {
      next.muscles = suggestion;
      next.muscleSource = 'suggested';
    }
  }
  if (parsed.unit && next.unit == null) next.unit = parsed.unit;
  return next;
}

export interface CommitOptions {
  fileName: string;
  fileHash: string;
  /** Overwrite stored sets that were edited in the source app since the last import. */
  updateChanged: boolean;
}

export async function commitImport(
  db: OverloadDB,
  parsed: ParseResult,
  opts: CommitOptions,
): Promise<ImportRecord> {
  return db.transaction('rw', [db.sets, db.workouts, db.exercises, db.imports], async () => {
    // Re-plan inside the transaction so the result reflects the current state.
    const found = await db.sets
      .where('key')
      .anyOf(parsed.sets.map((s) => s.key))
      .toArray();
    const plan = planImport(
      parsed.sets,
      new Map(found.map((s) => [s.key, { id: s.id ?? 0, contentHash: s.contentHash }])),
    );
    const updates = opts.updateChanged ? plan.toUpdate : [];
    const dates = parsed.sets.map((s) => s.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];

    const record: ImportRecord = {
      source: parsed.source,
      fileName: opts.fileName,
      fileHash: opts.fileHash,
      importedAt: new Date().toISOString(),
      rowCount: parsed.rowCount,
      added: plan.toAdd.length,
      updated: updates.length,
      duplicates: plan.duplicates + (plan.toUpdate.length - updates.length),
      dateRange: first && last ? [first, last] : null,
    };
    const importId = Number(await db.imports.add(record));
    record.id = importId;

    await db.sets.bulkAdd(plan.toAdd.map((s): WorkoutSet => ({ ...s, importId })));
    await db.sets.bulkPut(updates.map(({ id, set }): WorkoutSet => ({ ...set, id, importId })));

    const touched = new Set([...plan.toAdd, ...updates.map((u) => u.set)].map((s) => s.workoutKey));
    const touchedWorkouts = parsed.workouts.filter((w) => touched.has(w.key));
    const storedWorkouts = await db.workouts.bulkGet(touchedWorkouts.map((w) => w.key));
    await db.workouts.bulkPut(
      touchedWorkouts.map((w, i) => ({ ...w, importId: storedWorkouts[i]?.importId ?? importId })),
    );

    const storedEx = await db.exercises.bulkGet(parsed.exercises.map((e) => e.name));
    await db.exercises.bulkPut(parsed.exercises.map((e, i) => mergeExercise(storedEx[i], e)));

    return record;
  });
}

/** Removes the sets an import added or updated, then any workouts/exercises left empty. */
export async function undoImport(db: OverloadDB, importId: number): Promise<number> {
  return db.transaction('rw', [db.sets, db.workouts, db.exercises, db.imports], async () => {
    const removed = await db.sets.where('importId').equals(importId).delete();
    await db.imports.delete(importId);
    await pruneOrphans(db);
    return removed;
  });
}

async function pruneOrphans(db: OverloadDB): Promise<void> {
  const liveWorkouts = new Set(await db.sets.orderBy('workoutKey').uniqueKeys());
  const workoutKeys = await db.workouts.toCollection().primaryKeys();
  await db.workouts.bulkDelete(workoutKeys.filter((k) => !liveWorkouts.has(k)));

  // Keep user-edited exercises so their settings survive a re-import.
  const liveExercises = new Set(await db.sets.orderBy('exercise').uniqueKeys());
  const orphanEx = await db.exercises
    .filter((e) => !liveExercises.has(e.name) && e.muscleSource !== 'user' && e.unit == null)
    .primaryKeys();
  await db.exercises.bulkDelete(orphanEx);
}

export async function deleteSets(db: OverloadDB, ids: number[]): Promise<void> {
  await db.transaction('rw', [db.sets, db.workouts, db.exercises], async () => {
    await db.sets.bulkDelete(ids);
    await pruneOrphans(db);
  });
}

export interface DuplicateGroup {
  keep: WorkoutSet;
  extras: WorkoutSet[];
}

/**
 * Finds stored sets that record the same thing more than once: same workout time,
 * exercise, position and values. Keeps the earliest-imported copy.
 */
export function findDuplicateSets(sets: WorkoutSet[]): DuplicateGroup[] {
  const groups = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const k = `${s.date}|${s.exercise}|${s.setIndex}|${s.contentHash}`;
    const list = groups.get(k);
    if (list) list.push(s);
    else groups.set(k, [s]);
  }
  const out: DuplicateGroup[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const [keep, ...extras] = [...list].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    if (keep) out.push({ keep, extras });
  }
  return out;
}

export async function updateExercise(
  db: OverloadDB,
  name: string,
  patch: Partial<Omit<Exercise, 'name'>>,
): Promise<void> {
  await db.exercises.update(name, patch);
}

/** Accepts every suggested muscle assignment as the user's own. Returns how many changed. */
export async function confirmSuggestedMuscles(db: OverloadDB): Promise<number> {
  return db.exercises.where('muscleSource').equals('suggested').modify({ muscleSource: 'user' });
}

export async function clearAllData(db: OverloadDB, opts: { keepSettings: boolean }): Promise<void> {
  await db.transaction(
    'rw',
    [db.sets, db.workouts, db.exercises, db.imports, db.meta],
    async () => {
      await Promise.all([db.sets.clear(), db.workouts.clear(), db.imports.clear()]);
      if (opts.keepSettings) {
        // Exercise settings (muscles, units) are configuration; keep the edited ones.
        await db.exercises.filter((e) => e.muscleSource !== 'user' && e.unit == null).delete();
      } else {
        await Promise.all([db.exercises.clear(), db.meta.clear()]);
      }
    },
  );
}

export interface Backup {
  app: 'overload';
  version: number;
  exportedAt: string;
  settings: Settings;
  exercises: Exercise[];
  workouts: Workout[];
  sets: WorkoutSet[];
  imports: ImportRecord[];
}

export async function exportBackup(db: OverloadDB): Promise<Backup> {
  const [settings, exercises, workouts, sets, imports] = await Promise.all([
    loadSettings(db),
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
    db.imports.toArray(),
  ]);
  return {
    app: 'overload',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    exercises,
    workouts,
    sets,
    imports,
  };
}

export function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Backup>;
  return (
    v.app === 'overload' &&
    typeof v.version === 'number' &&
    Array.isArray(v.sets) &&
    Array.isArray(v.workouts) &&
    Array.isArray(v.exercises) &&
    Array.isArray(v.imports)
  );
}

/** Replaces all data with the backup's contents. */
export async function restoreBackup(db: OverloadDB, backup: Backup): Promise<void> {
  if (backup.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  await db.transaction(
    'rw',
    [db.sets, db.workouts, db.exercises, db.imports, db.meta],
    async () => {
      await Promise.all([
        db.sets.clear(),
        db.workouts.clear(),
        db.exercises.clear(),
        db.imports.clear(),
        db.meta.clear(),
      ]);
      await db.meta.put({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS, ...backup.settings } });
      await db.exercises.bulkPut(backup.exercises);
      await db.workouts.bulkPut(backup.workouts);
      await db.imports.bulkPut(backup.imports);
      await db.sets.bulkPut(backup.sets);
    },
  );
}
