/**
 * Set identity. A set is identified by when it happened, which exercise it was, and its
 * position in that exercise — plus an occurrence counter, so an exercise repeated in one
 * workout still gets distinct keys. Imports and merges both build keys this way, so a set
 * keeps the same identity however it got here.
 */
export function setIdentity(date: string, exercise: string, setLabel: string): string {
  return `${date}|${exercise}|${setLabel}`;
}

/** Tracks how many times each identity has been seen, to number repeats. */
export type OccurrenceCounts = Map<string, number>;

export function nextKey(
  counts: OccurrenceCounts,
  date: string,
  exercise: string,
  setLabel: string,
): string {
  const identity = setIdentity(date, exercise, setLabel);
  const occurrence = (counts.get(identity) ?? 0) + 1;
  counts.set(identity, occurrence);
  return `${identity}|${occurrence}`;
}
