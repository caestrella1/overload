import type { WorkoutSet } from './types';

export interface RemovalGroup {
  workoutKey: string;
  date: string;
  name: string;
  exercises: string[];
  sets: number;
}

/** Groups sets a sync would remove by workout, for display in the import preview. */
export function groupRemovals(sets: WorkoutSet[]): RemovalGroup[] {
  const groups = new Map<string, RemovalGroup>();
  for (const s of sets) {
    let g = groups.get(s.workoutKey);
    if (!g) {
      const [date = s.date, ...rest] = s.workoutKey.split('|');
      g = {
        workoutKey: s.workoutKey,
        date,
        name: rest.join('|') || 'Workout',
        exercises: [],
        sets: 0,
      };
      groups.set(s.workoutKey, g);
    }
    g.sets++;
    if (!g.exercises.includes(s.exercise)) g.exercises.push(s.exercise);
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * A sync that removes a large share of what the file covers usually means a partial
 * export rather than deleted workouts, so the preview warns before anything is removed.
 */
export const LARGE_REMOVAL_SHARE = 0.2;

export function isLargeRemoval(removed: number, inScope: number): boolean {
  return inScope > 0 && removed / inScope > LARGE_REMOVAL_SHARE;
}
