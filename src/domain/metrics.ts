import { bucketKey, type Bucket } from './dates';
import { REGION_OF, type Region } from './muscles';
import { convertWeight } from './units';
import type { E1rmFormula, Exercise, MuscleGroup, Unit, WorkoutSet } from './types';

export type MetricId =
  | 'e1rm'
  | 'topWeight'
  | 'volume'
  | 'reps'
  | 'sets'
  | 'maxReps'
  | 'avgRpe'
  | 'distance'
  | 'duration';

export interface MetricDef {
  id: MetricId;
  label: string;
  kind: 'weight' | 'count' | 'distance' | 'seconds' | 'rpe';
  /** How session values combine into a week/month. */
  agg: 'max' | 'sum' | 'mean';
  description: string;
}

export const METRICS: MetricDef[] = [
  {
    id: 'e1rm',
    label: 'Est. 1RM',
    kind: 'weight',
    agg: 'max',
    description: 'Best estimated one-rep max from any working set',
  },
  {
    id: 'topWeight',
    label: 'Top weight',
    kind: 'weight',
    agg: 'max',
    description: 'Heaviest working set (least assistance for assisted lifts)',
  },
  {
    id: 'volume',
    label: 'Volume',
    kind: 'weight',
    agg: 'sum',
    description: 'Sum of weight × reps',
  },
  { id: 'reps', label: 'Total reps', kind: 'count', agg: 'sum', description: 'Sum of reps' },
  { id: 'sets', label: 'Sets', kind: 'count', agg: 'sum', description: 'Working sets' },
  {
    id: 'maxReps',
    label: 'Max reps',
    kind: 'count',
    agg: 'max',
    description: 'Most reps in a single set',
  },
  { id: 'avgRpe', label: 'Avg RPE', kind: 'rpe', agg: 'mean', description: 'Mean logged RPE' },
  {
    id: 'distance',
    label: 'Distance',
    kind: 'distance',
    agg: 'sum',
    description: 'Total distance',
  },
  {
    id: 'duration',
    label: 'Duration',
    kind: 'seconds',
    agg: 'sum',
    description: 'Total time under the exercise',
  },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((d) => [d.id, d])) as Record<
  MetricId,
  MetricDef
>;

/** Reps above this give unreliable 1RM estimates and are ignored for e1RM. */
export const MAX_E1RM_REPS = 15;

export function estimate1rm(weight: number, reps: number, formula: E1rmFormula): number | null {
  if (weight <= 0 || reps < 1 || reps > MAX_E1RM_REPS) return null;
  if (reps === 1) return weight;
  return formula === 'brzycki' ? (weight * 36) / (37 - reps) : weight * (1 + reps / 30);
}

export interface MetricOptions {
  includeWarmups: boolean;
  formula: E1rmFormula;
}

/**
 * Turns a logged weight into the load actually moved, for lifts that carry your own
 * weight. Supplied only when bodyweight is known, so the fallbacks stay untouched otherwise.
 */
export interface BodyweightLoad {
  /** Bodyweight on a date, already in the unit the stats are computed in. */
  at: (date: string) => number | null;
  factor: number;
  /** Logged weight is assistance taken off, rather than load added. */
  assisted: boolean;
}

/**
 * Weight actually moved by a set, in the stats' unit: the logged weight, plus the share of
 * bodyweight the lift carries (or minus the assistance taken off).
 */
export function effectiveLoad(set: WorkoutSet, scale: number, bodyweight?: BodyweightLoad): number {
  const logged = (set.weight ?? 0) * scale;
  if (!bodyweight) return logged;
  const bw = bodyweight.at(set.date);
  if (bw == null) return logged;
  return Math.max(0, bw * bodyweight.factor + (bodyweight.assisted ? -logged : logged));
}

/** A set counts if it's a working set with something logged. */
export function isWorkingSet(s: WorkoutSet, includeWarmups: boolean): boolean {
  if (!includeWarmups && s.setType === 'warmup') return false;
  return (s.reps ?? 0) > 0 || (s.seconds ?? 0) > 0 || (s.distance ?? 0) > 0;
}

export interface SessionStat {
  workoutKey: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  volume: number;
  e1rm: number | null;
  topWeight: number | null;
  topWeightReps: number | null;
  maxReps: number | null;
  avgRpe: number | null;
  distance: number;
  duration: number;
}

/**
 * Per-exercise, per-workout stats. Weights are in the exercise's recording unit,
 * converted by `scale` (e.g. lb -> kg) when provided.
 */
export function sessionStats(
  sets: WorkoutSet[],
  opts: MetricOptions & { assisted?: boolean; scale?: number; bodyweight?: BodyweightLoad },
): SessionStat[] {
  const scale = opts.scale ?? 1;
  // With bodyweight known, an assisted lift becomes an ordinary higher-is-better load.
  const assisted = opts.bodyweight ? false : opts.assisted;
  const groups = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    if (!isWorkingSet(s, opts.includeWarmups)) continue;
    const k = `${s.workoutKey}\u0000${s.exercise}`;
    const list = groups.get(k);
    if (list) list.push(s);
    else groups.set(k, [s]);
  }

  const out: SessionStat[] = [];
  for (const list of groups.values()) {
    const first = list[0];
    if (!first) continue;
    const stat: SessionStat = {
      workoutKey: first.workoutKey,
      date: first.date,
      exercise: first.exercise,
      sets: list.length,
      reps: 0,
      volume: 0,
      e1rm: null,
      topWeight: null,
      topWeightReps: null,
      maxReps: null,
      avgRpe: null,
      distance: 0,
      duration: 0,
    };
    let rpeSum = 0;
    let rpeCount = 0;
    for (const s of list) {
      const reps = s.reps ?? 0;
      const weight = effectiveLoad(s, scale, opts.bodyweight);
      stat.reps += reps;
      stat.distance += s.distance ?? 0;
      stat.duration += s.seconds ?? 0;
      if (reps > 0) stat.maxReps = Math.max(stat.maxReps ?? 0, reps);
      if (s.rpe != null) {
        rpeSum += s.rpe;
        rpeCount++;
      }
      if (reps <= 0 || weight <= 0) continue;
      if (assisted) {
        // Less assistance is better; volume and e1RM of assistance are meaningless.
        if (stat.topWeight == null || weight < stat.topWeight) {
          stat.topWeight = weight;
          stat.topWeightReps = reps;
        }
        continue;
      }
      stat.volume += weight * reps;
      if (stat.topWeight == null || weight > stat.topWeight) {
        stat.topWeight = weight;
        stat.topWeightReps = reps;
      } else if (weight === stat.topWeight && reps > (stat.topWeightReps ?? 0)) {
        stat.topWeightReps = reps;
      }
      const e = estimate1rm(weight, reps, opts.formula);
      if (e != null && (stat.e1rm == null || e > stat.e1rm)) stat.e1rm = e;
    }
    if (rpeCount) stat.avgRpe = rpeSum / rpeCount;
    out.push(stat);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function metricValue(stat: SessionStat, metric: MetricId): number | null {
  const v = stat[metric];
  if (v == null) return null;
  // Zero totals usually mean "not applicable" (e.g. distance on a lifting exercise).
  if (METRIC_BY_ID[metric].agg === 'sum' && v === 0) return null;
  return v;
}

export interface SeriesPoint {
  period: string;
  value: number;
}

/** Collapses session stats into one value per period for the given metric. */
export function bucketSeries(
  stats: SessionStat[],
  metric: MetricId,
  bucket: Bucket,
  opts: { assisted?: boolean } = {},
): SeriesPoint[] {
  const def = METRIC_BY_ID[metric];
  const lowerIsBetter = opts.assisted && metric === 'topWeight';
  const acc = new Map<string, { value: number; n: number }>();
  for (const s of stats) {
    const v = metricValue(s, metric);
    if (v == null) continue;
    const key = bucketKey(s.date, bucket);
    const cur = acc.get(key);
    if (!cur) {
      acc.set(key, { value: v, n: 1 });
      continue;
    }
    if (def.agg === 'sum') cur.value += v;
    else if (def.agg === 'mean') cur.value = (cur.value * cur.n + v) / (cur.n + 1);
    else cur.value = lowerIsBetter ? Math.min(cur.value, v) : Math.max(cur.value, v);
    cur.n++;
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { value }]) => ({ period, value }));
}

export type PrType = 'e1rm' | 'weight' | 'reps' | 'volume';

export interface PrEvent {
  date: string;
  workoutKey: string;
  exercise: string;
  type: PrType;
  value: number;
  previous: number;
  /** Reps for weight PRs, for context. */
  reps: number | null;
}

export const PR_LABELS: Record<PrType, string> = {
  e1rm: 'Est. 1RM',
  weight: 'Weight',
  reps: 'Reps',
  volume: 'Session volume',
};

/**
 * Walks sessions chronologically and emits an event whenever a best is beaten.
 * The first session only sets the baseline.
 */
export function detectPrs(stats: SessionStat[], opts: { assisted?: boolean } = {}): PrEvent[] {
  const best: Partial<Record<PrType, number>> = {};
  const events: PrEvent[] = [];
  const sorted = [...stats].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    const candidates: [PrType, number | null, boolean][] = [
      ['e1rm', s.e1rm, false],
      ['weight', s.topWeight, !!opts.assisted],
      ['reps', s.maxReps, false],
      ['volume', s.volume > 0 ? s.volume : null, false],
    ];
    for (const [type, value, lower] of candidates) {
      if (value == null) continue;
      const prev = best[type];
      if (prev == null) {
        best[type] = value;
        continue;
      }
      if (lower ? value < prev : value > prev) {
        events.push({
          date: s.date,
          workoutKey: s.workoutKey,
          exercise: s.exercise,
          type,
          value,
          previous: prev,
          reps: type === 'weight' ? s.topWeightReps : null,
        });
        best[type] = value;
      }
    }
  }
  return events;
}

export type MuscleLevel = 'muscle' | 'region';

/**
 * Credit a set gives each muscle (or region) it trains: primary 1, secondary `secondaryWeight`.
 * When rolled up to regions, a region takes its best credit so a set isn't counted twice.
 */
export function muscleCredit(
  exercise: Exercise,
  secondaryWeight: number,
  level: MuscleLevel = 'muscle',
): Map<string, number> {
  const credit = new Map<string, number>();
  const add = (muscle: MuscleGroup, w: number) => {
    if (w <= 0) return;
    const g: string = level === 'region' ? REGION_OF[muscle] : muscle;
    credit.set(g, Math.max(credit.get(g) ?? 0, w));
  };
  exercise.muscles.primary.forEach((m) => {
    add(m, 1);
  });
  exercise.muscles.secondary.forEach((m) => {
    add(m, secondaryWeight);
  });
  return credit;
}

/**
 * Weight × reps for a set in `targetUnit`. Assisted exercises have no meaningful volume,
 * so they return 0.
 */
export function setVolume(
  set: WorkoutSet,
  exercise: Exercise | undefined,
  targetUnit: Unit,
): number {
  if (exercise?.assisted) return 0;
  const unit = exercise?.unit ?? targetUnit;
  return convertWeight((set.weight ?? 0) * (set.reps ?? 0), unit, targetUnit);
}

export interface MuscleOptions extends MetricOptions {
  metric: 'sets' | 'volume';
  secondaryWeight: number;
  defaultUnit: Unit;
}

/** Amount one set contributes: 1 for set counts, converted volume otherwise. */
function setAmount(set: WorkoutSet, exercise: Exercise, opts: MuscleOptions): number {
  return opts.metric === 'sets' ? 1 : setVolume(set, exercise, opts.defaultUnit);
}

export interface MuscleSeriesOptions extends MuscleOptions {
  bucket: Bucket;
  level: MuscleLevel;
}

export type MuscleRow = { period: string } & Record<string, number | string>;

/** Sets or volume per muscle group (or region) per period. */
export function muscleSeries(
  sets: WorkoutSet[],
  exercises: Map<string, Exercise>,
  opts: MuscleSeriesOptions,
): { rows: MuscleRow[]; groups: string[] } {
  const periods = new Map<string, Map<string, number>>();
  const seen = new Set<string>();
  for (const s of sets) {
    if (!isWorkingSet(s, opts.includeWarmups)) continue;
    const ex = exercises.get(s.exercise);
    if (!ex) continue;
    const amount = setAmount(s, ex, opts);
    if (amount <= 0) continue;
    const credit = muscleCredit(ex, opts.secondaryWeight, opts.level);
    if (!credit.size) continue;

    const key = bucketKey(s.date, opts.bucket);
    let row = periods.get(key);
    if (!row) periods.set(key, (row = new Map<string, number>()));
    for (const [g, w] of credit) {
      row.set(g, (row.get(g) ?? 0) + amount * w);
      seen.add(g);
    }
  }
  const rows = [...periods.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => ({ period, ...Object.fromEntries(values) }));
  return { rows, groups: [...seen] };
}

/** How much each exercise contributed to one muscle, largest first. */
export function muscleContributors(
  sets: WorkoutSet[],
  exercises: Map<string, Exercise>,
  muscle: MuscleGroup,
  opts: MuscleOptions,
): { exercise: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const s of sets) {
    if (!isWorkingSet(s, opts.includeWarmups)) continue;
    const ex = exercises.get(s.exercise);
    if (!ex) continue;
    const w = muscleCredit(ex, opts.secondaryWeight).get(muscle);
    if (!w) continue;
    const amount = setAmount(s, ex, opts);
    if (amount > 0) totals.set(s.exercise, (totals.get(s.exercise) ?? 0) + amount * w);
  }
  return [...totals.entries()]
    .map(([exercise, value]) => ({ exercise, value }))
    .sort((a, b) => b.value - a.value);
}

/** Sums each key across rows, dropping zeros, largest first. */
export function totalsByKey(
  rows: Record<string, number | string>[],
  keys: string[],
): { key: string; value: number }[] {
  return keys
    .map((key) => ({ key, value: rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) }))
    .filter((t) => t.value > 0)
    .sort((a, b) => b.value - a.value);
}

export type { Region };
