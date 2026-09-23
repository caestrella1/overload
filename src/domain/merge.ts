import { nextKey, type OccurrenceCounts } from './identity';
import type { WorkoutSet } from './types';

/**
 * Rewrites sets onto one exercise name, renumbering their positions and identity keys.
 *
 * Two exercises merged into one can otherwise collide: both may hold a "set 1" in the same
 * workout. Sets are ordered by workout, then by their previous position, then by insertion
 * order, so the merged history reads in the order it was logged.
 */
export function mergeSetsInto(sets: WorkoutSet[], exercise: string): WorkoutSet[] {
  const ordered = [...sets].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.workoutKey.localeCompare(b.workoutKey) ||
      a.setIndex - b.setIndex ||
      (a.id ?? 0) - (b.id ?? 0),
  );

  const counts: OccurrenceCounts = new Map();
  const blockIndex = new Map<string, number>();

  return ordered.map((set) => {
    const blockKey = `${set.workoutKey}|${exercise}`;
    const setIndex = (blockIndex.get(blockKey) ?? 0) + 1;
    blockIndex.set(blockKey, setIndex);
    return {
      ...set,
      exercise,
      setIndex,
      key: nextKey(counts, set.date, exercise, set.setLabel),
    };
  });
}

/** Renames in a map of aliases, following chains so A→B→C resolves to C. */
export function resolveAlias(aliases: Map<string, string>, name: string): string {
  const seen = new Set<string>();
  let current = name;
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current) ?? current;
  }
  return current;
}
