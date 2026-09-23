import { dayKey } from './dates';
import type { Unit } from './types';
import { convertWeight } from './units';

export interface BodyweightEntry {
  id?: number;
  /** Local day, "YYYY-MM-DD". One entry per day. */
  date: string;
  weight: number;
  unit: Unit;
}

/**
 * Bodyweight on a given day: the most recent entry at or before it. Before the first
 * entry, the earliest one is used, since an unknown earlier weight is better approximated
 * by the closest known one than by nothing.
 */
export function bodyweightAt(log: BodyweightEntry[], date: string, unit: Unit): number | null {
  if (!log.length) return null;
  const day = dayKey(date);
  let best: BodyweightEntry | null = null;
  for (const entry of log) {
    if (entry.date > day) continue;
    if (!best || entry.date > best.date) best = entry;
  }
  best ??= log.reduce((a, b) => (a.date <= b.date ? a : b));
  return convertWeight(best.weight, best.unit, unit);
}

/** Lifts where the logged weight is added to, or subtracted from, your own. */
const BODYWEIGHT_PATTERN =
  /\b(pull.?up|chin.?up|dip|push.?up|press.?up|muscle.?up|inverted row|pistol squat|bodyweight)\b/i;

export function isBodyweightName(name: string): boolean {
  return BODYWEIGHT_PATTERN.test(name);
}

export interface BodyweightChange {
  latest: BodyweightEntry;
  earliest: BodyweightEntry;
  change: number;
}

/** Latest entry in range and how far it has moved, in the latest entry's unit. */
export function bodyweightChange(log: BodyweightEntry[]): BodyweightChange | null {
  if (!log.length) return null;
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date));
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];
  if (!earliest || !latest) return null;
  return {
    latest,
    earliest,
    change: latest.weight - convertWeight(earliest.weight, earliest.unit, latest.unit),
  };
}
