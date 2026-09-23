/**
 * A fixed-length selection where each position owns a color slot. Removing one entry
 * leaves a hole rather than shifting the rest, so the series still on screen keep
 * their colors.
 */
export type Slots<T extends string> = (T | null)[];

export const MAX_SERIES = 6;

export function activeSlots<T extends string>(slots: Slots<T>): T[] {
  return slots.filter((s): s is T => s != null);
}

export function isFull<T extends string>(slots: Slots<T>, max = MAX_SERIES): boolean {
  return activeSlots(slots).length >= max;
}

/** Adds a value to the first free slot, or clears it if already selected. */
export function toggleSlot<T extends string>(
  slots: Slots<T>,
  value: T,
  max = MAX_SERIES,
): Slots<T> {
  const next = [...slots];
  const at = next.indexOf(value);
  if (at >= 0) {
    next[at] = null;
    // Trailing holes carry no meaning; drop them so an empty selection is [].
    while (next.length && next[next.length - 1] == null) next.pop();
    return next;
  }
  if (isFull(next, max)) return slots;
  const free = next.indexOf(null);
  if (free >= 0) next[free] = value;
  else next.push(value);
  return next;
}
