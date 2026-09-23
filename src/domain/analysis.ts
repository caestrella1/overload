import { bodyweightAt, type BodyweightEntry } from './bodyweight';
import { bucketKey, type Bucket } from './dates';
import {
  detectPrs,
  isWorkingSet,
  METRIC_BY_ID,
  METRICS,
  metricValue,
  sessionStats,
  setVolume,
  type MetricId,
  type PrEvent,
  type SessionStat,
} from './metrics';
import type { Exercise, Settings, Unit, WorkoutSet } from './types';
import type { BodyweightLoad } from './metrics';
import { convertWeight, exerciseUnit, formatCompact, formatNumber } from './units';

/**
 * Bodyweight loading for an exercise, or undefined when it does not apply: the lift does
 * not carry bodyweight, or nothing has been logged to carry.
 */
export function bodyweightLoadFor(
  exercise: Exercise | undefined,
  log: BodyweightEntry[],
  unit: Unit,
): BodyweightLoad | undefined {
  if (!exercise?.bodyweight || !log.length) return undefined;
  return {
    at: (date) => bodyweightAt(log, date, unit),
    factor: exercise.bodyweightFactor,
    assisted: exercise.assisted,
  };
}

/** Session stats for one exercise, optionally converted into `targetUnit`. */
export function statsForExercise(
  sets: WorkoutSet[],
  exercise: Exercise | undefined,
  settings: Settings,
  targetUnit?: Unit,
  bodyweightLog: BodyweightEntry[] = [],
): SessionStat[] {
  const unit = exerciseUnit(exercise, settings.defaultUnit);
  const statsUnit = targetUnit ?? unit;
  return sessionStats(sets, {
    includeWarmups: settings.includeWarmups,
    formula: settings.e1rmFormula,
    assisted: exercise?.assisted,
    scale: targetUnit ? convertWeight(1, unit, targetUnit) : 1,
    bodyweight: bodyweightLoadFor(exercise, bodyweightLog, statsUnit),
  });
}

export function groupByExercise(sets: WorkoutSet[]): Map<string, WorkoutSet[]> {
  const map = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = map.get(s.exercise);
    if (list) list.push(s);
    else map.set(s.exercise, [s]);
  }
  return map;
}

/** All PRs across exercises, newest first. Values are in each exercise's own unit. */
export function allPrs(
  sets: WorkoutSet[],
  exercises: Map<string, Exercise>,
  settings: Settings,
  bodyweightLog: BodyweightEntry[] = [],
): PrEvent[] {
  const out: PrEvent[] = [];
  for (const [name, list] of groupByExercise(sets)) {
    const ex = exercises.get(name);
    const stats = statsForExercise(list, ex, settings, undefined, bodyweightLog);
    // Bodyweight turns an assisted lift into an ordinary load, so lower stops being better.
    const assisted = ex?.assisted && !bodyweightLoadFor(ex, bodyweightLog, settings.defaultUnit);
    out.push(...detectPrs(stats, { assisted }));
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface PeriodTotal {
  period: string;
  volume: number;
  sets: number;
  workouts: number;
}

/** Training totals per period; volume in the default unit, assisted lifts excluded. */
export function periodTotals(
  sets: WorkoutSet[],
  exercises: Map<string, Exercise>,
  settings: Settings,
  bucket: Bucket,
): PeriodTotal[] {
  const rows = new Map<string, PeriodTotal & { keys: Set<string> }>();
  for (const s of sets) {
    if (!isWorkingSet(s, settings.includeWarmups)) continue;
    const period = bucketKey(s.date, bucket);
    let row = rows.get(period);
    if (!row)
      rows.set(period, (row = { period, volume: 0, sets: 0, workouts: 0, keys: new Set() }));
    row.sets++;
    row.keys.add(s.workoutKey);
    row.volume += setVolume(s, exercises.get(s.exercise), settings.defaultUnit);
  }
  return [...rows.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(({ keys, ...r }) => ({ ...r, workouts: keys.size }));
}

export function availableMetrics(stats: SessionStat[]): MetricId[] {
  return METRICS.filter((m) => stats.some((s) => metricValue(s, m.id) != null)).map((m) => m.id);
}

export function inRange<T extends { date: string }>(items: T[], start: string | null): T[] {
  return start ? items.filter((i) => i.date >= start) : items;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return s ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** Formats a metric value with its unit; `compact` abbreviates large numbers for axes. */
export function formatMetric(value: number, metric: MetricId, unit: Unit, compact = false): string {
  const def = METRIC_BY_ID[metric];
  if (def.kind === 'seconds') return formatDuration(value);
  if (compact && Math.abs(value) >= 10000) return formatCompact(value);
  if (def.kind === 'weight') return `${formatNumber(value, 1)}${compact ? '' : ` ${unit}`}`;
  if (def.kind === 'rpe') return formatNumber(value, 1);
  return formatNumber(value, def.kind === 'distance' ? 2 : 1);
}

/** "135 lb × 8 reps", "1.5 dist × 600s" and so on, for set chips. */
export function describeSet(s: WorkoutSet, unit: Unit): string {
  const parts: string[] = [];
  if (s.weight) parts.push(`${formatNumber(s.weight)} ${unit}`);
  if (s.reps != null && (s.reps || !s.seconds)) parts.push(`${formatNumber(s.reps, 0)} reps`);
  if (s.distance) parts.push(`${formatNumber(s.distance, 2)} dist`);
  if (s.seconds) parts.push(`${formatNumber(s.seconds, 0)}s`);
  return parts.join(' × ') || '—';
}
