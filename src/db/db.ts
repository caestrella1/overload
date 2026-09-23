import Dexie, { type EntityTable } from 'dexie';
import { isBodyweightName, type BodyweightEntry } from '../domain/bodyweight';
import { suggestForName } from '../domain/suggest';
import type { MappingProfile } from '../importers/mapping';
import type {
  Exercise,
  ExerciseAlias,
  ImportRecord,
  SourceRef,
  Workout,
  WorkoutSet,
} from '../domain/types';

export interface MetaRow {
  key: string;
  value: unknown;
}

/** A set removed by a sync import, kept so that import can be undone. */
export interface RemovalRow {
  id?: number;
  importId: number;
  set: WorkoutSet;
  /** Carried on one row per workout, so a workout that loses every set comes back too. */
  workout?: Workout;
}

export type OverloadDB = Dexie & {
  sets: EntityTable<WorkoutSet, 'id'>;
  workouts: EntityTable<Workout, 'key'>;
  exercises: EntityTable<Exercise, 'name'>;
  imports: EntityTable<ImportRecord, 'id'>;
  removals: EntityTable<RemovalRow, 'id'>;
  profiles: EntityTable<MappingProfile, 'id'>;
  bodyweights: EntityTable<BodyweightEntry, 'id'>;
  aliases: EntityTable<ExerciseAlias, 'from'>;
  meta: EntityTable<MetaRow, 'key'>;
};

export function createDb(name = 'overload'): OverloadDB {
  const db = new Dexie(name) as OverloadDB;
  db.version(1).stores({
    sets: '++id, &key, workoutKey, exercise, date, importId',
    workouts: '&key, date, importId',
    exercises: '&name, muscleSource',
    imports: '++id, fileHash, importedAt',
    meta: '&key',
  });
  // v2 adds sync imports, which can remove sets; removals make those undoable.
  db.version(2)
    .stores({ removals: '++id, importId' })
    .upgrade((tx) =>
      tx
        .table<ImportRecord>('imports')
        .toCollection()
        .modify((r) => {
          r.removed = 0;
        }),
    );
  // v3 adds saved column mappings for CSV layouts the app has no built-in importer for.
  db.version(3).stores({ profiles: '++id, &signature, lastUsedAt' });
  // v4 logs bodyweight, so lifts that carry it can report the load actually moved.
  db.version(4)
    .stores({ bodyweights: '++id, &date' })
    .upgrade((tx) =>
      tx
        .table<Omit<Exercise, 'origins'> & { origins?: SourceRef[] }>('exercises')
        .toCollection()
        .modify((e) => {
          e.bodyweight = isBodyweightName(e.name);
          e.bodyweightFactor = 1;
        }),
    );
  // v5 remembers renamed and merged exercises, so later imports follow the rename.
  db.version(5).stores({ aliases: '&from, to' });
  // v6 records where each row came from, so provenance survives renames and merges.
  // Rows written before it lack the origin fields, hence the partial types below.
  db.version(6).upgrade(async (tx) => {
    interface Origin {
      originSource: string;
      originName: string;
      originImportId: number;
    }
    type Legacy<T extends Origin> = Omit<T, keyof Origin> & Partial<Origin>;
    const imports = await tx.table<ImportRecord>('imports').toArray();
    const sourceOf = new Map(imports.map((r) => [r.id, r.source]));
    const firstSeenOf = new Map(imports.map((r) => [r.id, r.importedAt]));
    const UNKNOWN = 'unknown';

    // Remember which exercise each source name belongs to before the sets are rewritten.
    const exerciseOrigins = new Map<string, SourceRef>();
    await tx
      .table<Legacy<WorkoutSet>>('sets')
      .toCollection()
      .modify((s) => {
        s.originSource ??= sourceOf.get(s.importId) ?? UNKNOWN;
        s.originName ??= s.exercise;
        s.originImportId ??= s.importId;
        exerciseOrigins.set(s.exercise, {
          source: s.originSource ?? UNKNOWN,
          name: s.originName ?? s.exercise,
          importId: s.originImportId ?? s.importId,
          firstSeen: firstSeenOf.get(s.importId) ?? '',
        });
      });

    await tx
      .table<Legacy<Workout>>('workouts')
      .toCollection()
      .modify((w) => {
        w.originSource ??= sourceOf.get(w.importId) ?? UNKNOWN;
        w.originName ??= w.name;
        w.originImportId ??= w.importId;
      });

    await tx
      .table<Omit<Exercise, 'origins'> & { origins?: SourceRef[] }>('exercises')
      .toCollection()
      .modify((e) => {
        if (e.origins?.length) return;
        const known = exerciseOrigins.get(e.name);
        e.origins = known ? [known] : [];
      });
  });
  // v7 links exercises to the bundled catalogue and records how far to trust the
  // suggestion. Existing guesses are re-run, since the catalogue knows more than the
  // name rules did on their own.
  db.version(7).upgrade((tx) =>
    tx
      .table<Exercise>('exercises')
      .toCollection()
      .modify((e) => {
        e.catalogId ??= null;
        e.suggestionConfidence ??= null;
        e.suggestionReason ??= null;
        if (e.muscleSource !== 'suggested' && e.muscleSource !== 'unassigned') return;
        const suggestion = suggestForName(e.name);
        if (!suggestion) return;
        e.muscles = suggestion.muscles;
        e.muscleSource = 'suggested';
        e.catalogId = suggestion.catalogId;
        e.suggestionConfidence = suggestion.confidence;
        e.suggestionReason = suggestion.reason;
      }),
  );
  return db;
}

export const db = createDb();
