import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, ImportRecord, Workout, WorkoutSet } from '../domain/types';

export interface MetaRow {
  key: string;
  value: unknown;
}

export type OverloadDB = Dexie & {
  sets: EntityTable<WorkoutSet, 'id'>;
  workouts: EntityTable<Workout, 'key'>;
  exercises: EntityTable<Exercise, 'name'>;
  imports: EntityTable<ImportRecord, 'id'>;
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
  return db;
}

export const db = createDb();
