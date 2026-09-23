import Dexie, { type EntityTable } from 'dexie';
import type { MappingProfile } from '../importers/mapping';
import type { Exercise, ImportRecord, Workout, WorkoutSet } from '../domain/types';

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
  return db;
}

export const db = createDb();
