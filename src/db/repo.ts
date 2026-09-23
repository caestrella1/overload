import { isBodyweightName, type BodyweightEntry } from '../domain/bodyweight';
import { mergeSetsInto, resolveAlias } from '../domain/merge';
import { parseExerciseName, isAssistedName } from '../domain/exerciseName';
import { suggestForName } from '../domain/suggest';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type ExerciseAlias,
  type Confidence,
  type SourceRef,
  type ImportRecord,
  type MuscleAssignment,
  type Settings,
  type Workout,
  type WorkoutSet,
} from '../domain/types';
import {
  planImport,
  planSync,
  syncCandidates,
  type ExistingSetRef,
  type ImportPlan,
} from '../importers/plan';
import type { MappingProfile } from '../importers/mapping';
import type { ParseResult, ParsedExercise } from '../importers/types';
import { nextKey } from '../domain/identity';
import type { OverloadDB, RemovalRow } from './db';

const SETTINGS_KEY = 'settings';
export const BACKUP_VERSION = 5;

export async function loadSettings(db: OverloadDB): Promise<Settings> {
  const row = await db.meta.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) };
}

export async function saveSettings(db: OverloadDB, patch: Partial<Settings>): Promise<void> {
  const current = await loadSettings(db);
  await db.meta.put({ key: SETTINGS_KEY, value: { ...current, ...patch } });
}

/**
 * Small named booleans in the meta table, for state that must outlive localStorage
 * (which some embedded browsers block or wipe between visits).
 */
export async function readFlag(db: OverloadDB, key: string): Promise<boolean> {
  return (await db.meta.get(key))?.value === true;
}

export async function writeFlag(db: OverloadDB, key: string, value: boolean): Promise<void> {
  await db.meta.put({ key, value });
}

export interface SyncPreview {
  /** Stored sets this file covers but no longer contains — deleted in the source app. */
  toRemove: WorkoutSet[];
  /** How many stored sets the file speaks for, removals included. */
  inScope: number;
  /** Earliest date the file covers; sync never reaches back past this. */
  from: string | null;
}

export interface ImportPreview {
  plan: ImportPlan;
  /** A previous import of the byte-identical file, if any. */
  sameFile: ImportRecord | null;
  newExercises: {
    name: string;
    muscles: MuscleAssignment | null;
    fromSource: boolean;
    confidence: Confidence | null;
  }[];
  newWorkouts: number;
  dateRange: [string, string] | null;
  sync: SyncPreview;
}

/** Ids of imports from `source`; sets from other sources are never in sync's reach. */
async function sourceImportIds(db: OverloadDB, source: string): Promise<Set<number>> {
  const ids = await db.imports.filter((r) => r.source === source).primaryKeys();
  return new Set(ids.filter((id): id is number => id != null));
}

/** Stored sets a file speaks for, and which of them it no longer contains. */
async function planSyncFor(
  db: OverloadDB,
  parsed: ParseResult,
  from: string | null,
): Promise<SyncPreview> {
  if (!from) return { toRemove: [], inScope: 0, from: null };
  const [importIds, stored] = await Promise.all([
    sourceImportIds(db, parsed.source),
    db.sets.where('date').aboveOrEqual(from).toArray(),
  ]);
  const candidates = syncCandidates(stored, { from, importIds });
  return {
    toRemove: planSync(candidates, new Set(parsed.sets.map((s) => s.key))),
    inScope: candidates.length,
    from,
  };
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
    .map((e) => {
      const suggestion = e.muscles ? null : suggestForName(e.name);
      return {
        name: e.name,
        muscles: e.muscles ?? suggestion?.muscles ?? null,
        fromSource: !!e.muscles,
        confidence: suggestion?.confidence ?? null,
      };
    });

  const workoutKeys = parsed.workouts.map((w) => w.key);
  const existingWorkouts = await db.workouts.where('key').anyOf(workoutKeys).primaryKeys();
  const [first, last] = fileDateRange(parsed) ?? [null, null];

  return {
    plan,
    sameFile,
    newExercises,
    newWorkouts: workoutKeys.length - existingWorkouts.length,
    dateRange: first && last ? [first, last] : null,
    sync: await planSyncFor(db, parsed, first),
  };
}

/** Earliest and latest set date in a parsed file. */
function fileDateRange(parsed: ParseResult): [string, string] | null {
  const dates = parsed.sets.map((s) => s.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first && last ? [first, last] : null;
}

/** Adds a source reference unless that source already claims that name. */
export function addOrigin(origins: SourceRef[], ref: SourceRef): SourceRef[] {
  const known = origins.some((o) => o.source === ref.source && o.name === ref.name);
  return known ? origins : [...origins, ref];
}

/** Builds or updates an exercise record, honoring muscle-source precedence: user > source > suggested. */
export function mergeExercise(
  existing: Exercise | undefined,
  parsed: ParsedExercise,
  origin?: SourceRef,
): Exercise {
  const { baseName, equipment } = parseExerciseName(parsed.name);
  const base: Exercise = existing ?? {
    name: parsed.name,
    baseName,
    equipment,
    muscles: { primary: [], secondary: [] },
    muscleSource: 'unassigned',
    unit: null,
    assisted: isAssistedName(parsed.name),
    bodyweight: isBodyweightName(parsed.name),
    bodyweightFactor: 1,
    origins: [],
    catalogId: null,
    suggestionConfidence: null,
    suggestionReason: null,
  };
  const next = { ...base };
  if (origin) next.origins = addOrigin(next.origins, origin);
  if (parsed.muscles && next.muscleSource !== 'user') {
    // The file said so itself, which beats anything we could infer.
    next.muscles = parsed.muscles;
    next.muscleSource = 'source';
  } else if (next.muscleSource === 'unassigned') {
    const suggestion = suggestForName(parsed.name);
    if (suggestion) {
      next.muscles = suggestion.muscles;
      next.muscleSource = 'suggested';
      next.catalogId = suggestion.catalogId;
      next.suggestionConfidence = suggestion.confidence;
      next.suggestionReason = suggestion.reason;
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
  /** Also delete stored sets this file covers but no longer contains. */
  sync?: boolean;
}

export async function commitImport(
  db: OverloadDB,
  parsed: ParseResult,
  opts: CommitOptions,
): Promise<ImportRecord> {
  const tables = [db.sets, db.workouts, db.exercises, db.imports, db.removals];
  return db.transaction('rw', tables, async () => {
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
    const range = fileDateRange(parsed);
    const first = range?.[0] ?? null;
    // Computed before writing, so this import's own sets are never candidates.
    const toRemove = opts.sync ? (await planSyncFor(db, parsed, first)).toRemove : [];

    const record: ImportRecord = {
      source: parsed.source,
      fileName: opts.fileName,
      fileHash: opts.fileHash,
      importedAt: new Date().toISOString(),
      rowCount: parsed.rowCount,
      added: plan.toAdd.length,
      updated: updates.length,
      duplicates: plan.duplicates + (plan.toUpdate.length - updates.length),
      removed: toRemove.length,
      dateRange: range,
    };
    const importId = Number(await db.imports.add(record));
    record.id = importId;

    const origin = { source: parsed.source, importId, firstSeen: record.importedAt };
    await db.sets.bulkAdd(
      plan.toAdd.map((s): WorkoutSet => ({
        ...s,
        importId,
        originSource: parsed.source,
        originImportId: importId,
      })),
    );
    // An update keeps the origin of the set it replaces: it is the same set, revised.
    const storedById = new Map(found.map((s) => [s.id, s]));
    await db.sets.bulkPut(
      updates.map(({ id, set }): WorkoutSet => {
        const previous = storedById.get(id);
        return {
          ...set,
          id,
          importId,
          originSource: previous?.originSource ?? parsed.source,
          originName: previous?.originName ?? set.originName,
          originImportId: previous?.originImportId ?? importId,
        };
      }),
    );

    const touched = new Set([...plan.toAdd, ...updates.map((u) => u.set)].map((s) => s.workoutKey));
    const touchedWorkouts = parsed.workouts.filter((w) => touched.has(w.key));
    const storedWorkouts = await db.workouts.bulkGet(touchedWorkouts.map((w) => w.key));
    await db.workouts.bulkPut(
      touchedWorkouts.map((w, i): Workout => {
        const previous = storedWorkouts[i];
        return {
          ...w,
          importId: previous?.importId ?? importId,
          originSource: previous?.originSource ?? parsed.source,
          originName: previous?.originName ?? w.originName,
          originImportId: previous?.originImportId ?? importId,
        };
      }),
    );

    const storedEx = await db.exercises.bulkGet(parsed.exercises.map((e) => e.name));
    await db.exercises.bulkPut(
      parsed.exercises.map((e, i) => mergeExercise(storedEx[i], e, { ...origin, name: e.name })),
    );

    if (toRemove.length) {
      // Kept verbatim so undoing this import puts them back, workouts included:
      // removing a workout's last set prunes its record too.
      await db.removals.bulkAdd(await snapshotRemovals(db, importId, toRemove));
      await db.sets.bulkDelete(toRemove.map((s) => s.id ?? -1));
      await pruneOrphans(db);
    }

    return record;
  });
}

/**
 * Reverses an import: deletes the sets it added or last updated, and restores the sets a
 * sync import deleted. Sets it updated are removed rather than reverted to earlier values.
 */
export async function undoImport(db: OverloadDB, importId: number): Promise<number> {
  const tables = [db.sets, db.workouts, db.exercises, db.imports, db.removals];
  return db.transaction('rw', tables, async () => {
    const deleted = await db.sets.where('importId').equals(importId).delete();

    const removals = await db.removals.where('importId').equals(importId).toArray();
    if (removals.length) {
      // A later import may have re-added the same set; leave that copy alone.
      const live = new Set(await db.sets.orderBy('key').uniqueKeys());
      await db.sets.bulkAdd(removals.map((r) => r.set).filter((s) => !live.has(s.key)));
      await db.workouts.bulkPut(removals.flatMap((r) => (r.workout ? [r.workout] : [])));
      await db.removals.bulkDelete(removals.map((r) => r.id ?? -1));
    }

    await db.imports.delete(importId);
    await pruneOrphans(db);
    return deleted;
  });
}

/**
 * Pairs each set being removed with its workout record, carried once per workout so undo
 * can restore a workout that loses every set.
 */
async function snapshotRemovals(
  db: OverloadDB,
  importId: number,
  sets: WorkoutSet[],
): Promise<RemovalRow[]> {
  const keys = [...new Set(sets.map((s) => s.workoutKey))];
  const stored = await db.workouts.bulkGet(keys);
  const byKey = new Map(stored.flatMap((w) => (w ? [[w.key, w] as const] : [])));
  const carried = new Set<string>();
  return sets.map((set) => {
    const workout = carried.has(set.workoutKey) ? undefined : byKey.get(set.workoutKey);
    carried.add(set.workoutKey);
    return { importId, set, workout };
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

/** How many sets a sync import removed and still holds for undo. */
export async function countRemovals(db: OverloadDB, importId: number): Promise<number> {
  return db.removals.where('importId').equals(importId).count();
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
  // Once you set the muscles yourself there is no suggestion left to rate.
  const settled = patch.muscleSource === 'user' ? { suggestionConfidence: null } : {};
  await db.exercises.update(name, { ...patch, ...settled });
}

export async function findProfile(
  db: OverloadDB,
  signature: string,
): Promise<MappingProfile | null> {
  return (await db.profiles.where('signature').equals(signature).first()) ?? null;
}

export function listProfiles(db: OverloadDB): Promise<MappingProfile[]> {
  return db.profiles.orderBy('lastUsedAt').reverse().toArray();
}

/** Saves a mapping, replacing any earlier one for the same CSV layout. */
export async function saveProfile(
  db: OverloadDB,
  profile: Omit<MappingProfile, 'id' | 'createdAt' | 'lastUsedAt'>,
): Promise<MappingProfile> {
  const now = new Date().toISOString();
  const existing = await findProfile(db, profile.signature);
  const saved: MappingProfile = {
    ...profile,
    id: existing?.id,
    createdAt: existing?.createdAt ?? now,
    lastUsedAt: now,
  };
  saved.id = Number(await db.profiles.put(saved));
  return saved;
}

export async function deleteProfile(db: OverloadDB, id: number): Promise<void> {
  await db.profiles.delete(id);
}

export function listAliases(db: OverloadDB): Promise<ExerciseAlias[]> {
  return db.aliases.toArray();
}

export async function aliasMap(db: OverloadDB): Promise<Map<string, string>> {
  return new Map((await db.aliases.toArray()).map((a) => [a.from, a.to]));
}

export async function deleteAlias(db: OverloadDB, from: string): Promise<void> {
  await db.aliases.delete(from);
}

/**
 * Renames an exercise, or folds it into another one when the target already exists.
 * Sets move across with fresh identities, and the old name is remembered so a later
 * import of it follows the rename instead of recreating the exercise.
 */
export async function renameExercise(
  db: OverloadDB,
  from: string,
  to: string,
): Promise<{ moved: number; merged: boolean }> {
  const target = to.trim();
  if (!target || target === from) return { moved: 0, merged: false };

  const tables = [db.sets, db.exercises, db.aliases];
  return db.transaction('rw', tables, async () => {
    const [source, existing] = await Promise.all([
      db.exercises.get(from),
      db.exercises.get(target),
    ]);
    const merged = !!existing;

    // Re-key the target's own sets too: numbering spans both exercises once they are one.
    const affected = await db.sets.where('exercise').anyOf([from, target]).toArray();
    const rekeyed = mergeSetsInto(affected, target);
    await db.sets.bulkDelete(affected.map((s) => s.id ?? -1));
    await db.sets.bulkAdd(rekeyed);

    if (source) {
      // Provenance is cumulative: the merged exercise remembers every name it answers to.
      const origins = (existing?.origins ?? []).concat(source.origins);
      // Merging keeps the target's own settings; renaming carries the source record over.
      const kept = existing ?? { ...source, name: target };
      await db.exercises.put({
        ...kept,
        origins: origins.reduce<SourceRef[]>((acc, o) => addOrigin(acc, o), []),
      });
      await db.exercises.delete(from);
    }

    await db.aliases.put({ from, to: target, createdAt: new Date().toISOString() });
    // Anything that already pointed at the old name now points at the new one.
    await db.aliases.where('to').equals(from).modify({ to: target });

    return { moved: rekeyed.filter((s) => s.exercise === target).length, merged };
  });
}

/**
 * Applies stored renames to a freshly parsed file, so an export still using an old
 * exercise name lands on the merged one instead of resurrecting it.
 */
export function applyAliases(parsed: ParseResult, aliases: Map<string, string>): ParseResult {
  if (!aliases.size) return parsed;
  const rename = (name: string) => resolveAlias(aliases, name);
  if (!parsed.exercises.some((e) => rename(e.name) !== e.name)) return parsed;

  const counts = new Map<string, number>();
  const sets = parsed.sets.map((s) => {
    const exercise = rename(s.exercise);
    return { ...s, exercise, key: nextKey(counts, s.date, exercise, s.setLabel) };
  });
  const exercises = new Map(
    parsed.exercises.map((e) => [rename(e.name), { ...e, name: rename(e.name) }]),
  );
  return { ...parsed, sets, exercises: [...exercises.values()] };
}

export function listBodyweights(db: OverloadDB): Promise<BodyweightEntry[]> {
  return db.bodyweights.orderBy('date').toArray();
}

/** One entry per day; logging the same day again replaces it. */
export async function saveBodyweight(
  db: OverloadDB,
  entry: Omit<BodyweightEntry, 'id'>,
): Promise<void> {
  await db.transaction('rw', db.bodyweights, async () => {
    const existing = await db.bodyweights.where('date').equals(entry.date).first();
    await db.bodyweights.put({ ...entry, id: existing?.id });
  });
}

export async function deleteBodyweight(db: OverloadDB, id: number): Promise<void> {
  await db.bodyweights.delete(id);
}

/**
 * Accepts suggested muscle assignments as the user's own. Only the confidences asked for,
 * so a bulk accept never quietly adopts a guess the app itself flagged as shaky.
 */
export async function confirmSuggestedMuscles(
  db: OverloadDB,
  accept: Confidence[] = ['high'],
): Promise<number> {
  return db.exercises
    .where('muscleSource')
    .equals('suggested')
    .filter((e) => accept.includes(e.suggestionConfidence ?? 'medium'))
    .modify({ muscleSource: 'user', suggestionConfidence: null });
}

/** Exercises still showing a guess, grouped by how far it can be trusted. */
export async function countSuggestions(db: OverloadDB): Promise<Record<Confidence, number>> {
  const counts: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
  await db.exercises
    .where('muscleSource')
    .equals('suggested')
    .each((e) => {
      counts[e.suggestionConfidence ?? 'medium']++;
    });
  return counts;
}

export async function clearAllData(db: OverloadDB, opts: { keepSettings: boolean }): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.sets,
      db.workouts,
      db.exercises,
      db.imports,
      db.removals,
      db.profiles,
      db.bodyweights,
      db.aliases,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.sets.clear(),
        db.workouts.clear(),
        db.imports.clear(),
        db.removals.clear(),
      ]);
      if (opts.keepSettings) {
        // Exercise settings (muscles, units) are configuration; keep the edited ones.
        // Saved CSV mappings are configuration too, so they stay either way here.
        await db.exercises.filter((e) => e.muscleSource !== 'user' && e.unit == null).delete();
      } else {
        await Promise.all([
          db.exercises.clear(),
          db.profiles.clear(),
          db.bodyweights.clear(),
          db.aliases.clear(),
          db.meta.clear(),
        ]);
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
  /** Sets removed by sync imports, so those imports stay undoable. Absent in v1 backups. */
  removals?: RemovalRow[];
  /** Saved CSV column mappings. Absent before v3. */
  profiles?: MappingProfile[];
  /** Logged bodyweight. Absent before v4. */
  bodyweights?: BodyweightEntry[];
  /** Renamed and merged exercise names. Absent before v5. */
  aliases?: ExerciseAlias[];
}

export async function exportBackup(db: OverloadDB): Promise<Backup> {
  const [settings, exercises, workouts, sets, imports, removals, profiles, bodyweights, aliases] =
    await Promise.all([
      loadSettings(db),
      db.exercises.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.imports.toArray(),
      db.removals.toArray(),
      db.profiles.toArray(),
      db.bodyweights.toArray(),
      db.aliases.toArray(),
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
    removals,
    profiles,
    bodyweights,
    aliases,
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
    [
      db.sets,
      db.workouts,
      db.exercises,
      db.imports,
      db.removals,
      db.profiles,
      db.bodyweights,
      db.aliases,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.sets.clear(),
        db.workouts.clear(),
        db.exercises.clear(),
        db.imports.clear(),
        db.removals.clear(),
        db.profiles.clear(),
        db.bodyweights.clear(),
        db.aliases.clear(),
        db.meta.clear(),
      ]);
      await db.meta.put({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS, ...backup.settings } });
      await db.exercises.bulkPut(backup.exercises);
      await db.workouts.bulkPut(backup.workouts);
      await db.imports.bulkPut(backup.imports);
      await db.sets.bulkPut(backup.sets);
      await db.removals.bulkPut(backup.removals ?? []);
      await db.profiles.bulkPut(backup.profiles ?? []);
      await db.bodyweights.bulkPut(backup.bodyweights ?? []);
      await db.aliases.bulkPut(backup.aliases ?? []);
    },
  );
}
