import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db/db';
import { loadSettings } from '../db/repo';
import { DEFAULT_SETTINGS, type Exercise, type Settings } from '../domain/types';

export function useSettings(): Settings {
  return useLiveQuery(() => loadSettings(db), [], DEFAULT_SETTINGS);
}

export function useExercises(): Map<string, Exercise> | undefined {
  const list = useLiveQuery(() => db.exercises.toArray(), []);
  return useMemo(() => (list ? new Map(list.map((e) => [e.name, e])) : undefined), [list]);
}

/** All sets, oldest first. Undefined while loading. */
export function useAllSets() {
  return useLiveQuery(() => db.sets.orderBy('date').toArray(), []);
}

export function useExerciseSets(name: string) {
  return useLiveQuery(() => db.sets.where('exercise').equals(name).sortBy('date'), [name]);
}

export function useWorkouts() {
  return useLiveQuery(() => db.workouts.orderBy('date').toArray(), []);
}

export function useBodyweights() {
  return useLiveQuery(() => db.bodyweights.orderBy('date').toArray(), [], []);
}

export function useImports() {
  return useLiveQuery(() => db.imports.orderBy('importedAt').reverse().toArray(), []);
}
