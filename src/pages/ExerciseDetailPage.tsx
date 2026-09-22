import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TrendChart } from '../components/charts';
import { SERIES_COLORS } from '../lib/colors';
import { MuscleEditor } from '../components/MuscleEditor';
import { MuscleChips } from '../components/MuscleChips';
import { RangeControls } from '../components/RangeControls';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  PageHeader,
  Segmented,
  Select,
  StatTile,
} from '../components/ui';
import { db } from '../db/db';
import { updateExercise } from '../db/repo';
import { availableMetrics, formatMetric, inRange, statsForExercise } from '../domain/analysis';
import { bucketKey, formatDate, rangeStart, type Bucket, type RangePreset } from '../domain/dates';
import { bucketSeries, detectPrs, METRIC_BY_ID, PR_LABELS, type MetricId } from '../domain/metrics';
import type { Unit, WorkoutSet } from '../domain/types';
import { exerciseUnit, formatNumber } from '../domain/units';
import { useExerciseSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';

export default function ExerciseDetailPage() {
  const name = useParams().name ?? '';
  const sets = useExerciseSets(name);
  const exercises = useExercises();
  const settings = useSettings();
  const [metricPref, setMetric] = usePref<MetricId>('exercise.metric', 'e1rm');
  const [bucket, setBucket] = usePref<Bucket>('exercise.bucket', 'session');
  const [range, setRange] = usePref<RangePreset>('exercise.range', 'all');
  const [historyLimit, setHistoryLimit] = useState(10);

  const ex = exercises?.get(name);
  const stats = useMemo(
    () => (sets ? statsForExercise(sets, ex, settings) : []),
    [sets, ex, settings],
  );
  const metrics = useMemo(() => availableMetrics(stats), [stats]);
  const metric = metrics.includes(metricPref) ? metricPref : (metrics[0] ?? 'sets');
  const start = rangeStart(range);
  const points = useMemo(
    () => bucketSeries(inRange(stats, start), metric, bucket, { assisted: ex?.assisted }),
    [stats, start, metric, bucket, ex?.assisted],
  );
  const prs = useMemo(() => detectPrs(stats, { assisted: ex?.assisted }).reverse(), [stats, ex]);

  if (!sets || !exercises) return null;
  if (!ex) {
    return (
      <EmptyState title="Exercise not found">
        <Link to="/exercises" className="text-accent hover:underline">
          Back to exercises
        </Link>
      </EmptyState>
    );
  }

  const unit = exerciseUnit(ex, settings.defaultUnit);
  const bestE1rm = Math.max(0, ...stats.map((s) => s.e1rm ?? 0));
  const bestWeight = ex.assisted
    ? stats.reduce<(typeof stats)[number] | null>(
        (b, s) =>
          s.topWeight != null && (b?.topWeight == null || s.topWeight < b.topWeight) ? s : b,
        null,
      )
    : stats.reduce<(typeof stats)[number] | null>(
        (b, s) => (s.topWeight != null && s.topWeight > (b?.topWeight ?? 0) ? s : b),
        null,
      );
  const last = stats[stats.length - 1];
  const def = METRIC_BY_ID[metric];

  const setUnit = (value: 'default' | Unit) => {
    void updateExercise(db, ex.name, { unit: value === 'default' ? null : value });
  };

  return (
    <>
      <PageHeader
        title={ex.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <MuscleChips exercise={ex} />
            {ex.assisted && <Badge tone="accent">Assisted: lower is better</Badge>}
          </span>
        }
        actions={
          <Link to="/exercises" className="text-sm text-ink-2 hover:text-ink">
            ← All exercises
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Best est. 1RM"
          value={bestE1rm ? `${formatNumber(bestE1rm)} ${unit}` : '–'}
          detail={settings.e1rmFormula === 'epley' ? 'Epley' : 'Brzycki'}
        />
        <StatTile
          label={ex.assisted ? 'Least assistance' : 'Best weight'}
          value={
            bestWeight?.topWeight != null ? `${formatNumber(bestWeight.topWeight)} ${unit}` : '–'
          }
          detail={
            bestWeight
              ? `× ${formatNumber(bestWeight.topWeightReps ?? 0, 0)} on ${formatDate(bestWeight.date)}`
              : undefined
          }
        />
        <StatTile label="Sessions" value={formatNumber(stats.length, 0)} />
        <StatTile
          label="Last session"
          value={last ? formatDate(last.date, { month: 'short', day: 'numeric' }) : '–'}
          detail={last ? `${last.sets} sets · ${formatNumber(last.reps, 0)} reps` : undefined}
        />
      </div>

      <Card
        title={def.label}
        subtitle={def.description}
        actions={
          <RangeControls range={range} onRange={setRange} bucket={bucket} onBucket={setBucket} />
        }
        className="mb-6"
      >
        <div className="mb-3">
          <Segmented
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={metrics.map((m) => ({ id: m, label: METRIC_BY_ID[m].label }))}
          />
        </div>
        <TrendChart
          series={[{ id: 'v', label: def.label, color: SERIES_COLORS[0] ?? '', points }]}
          bucket={bucket}
          format={(v) => formatMetric(v, metric, unit, true)}
        />
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="PR history" subtitle="Each time you beat a previous best">
          {prs.length ? (
            <ul className="max-h-80 divide-y divide-border overflow-auto">
              {prs.map((p) => (
                <li
                  key={`${p.type}|${p.date}`}
                  className="flex items-baseline justify-between py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{PR_LABELS[p.type]}</div>
                    <div className="text-xs text-ink-2">{formatDate(p.date)}</div>
                  </div>
                  <div className="tabular text-right text-sm">
                    <div className="font-medium text-ink">
                      {formatNumber(p.value)}
                      {p.type !== 'reps' ? ` ${unit}` : ''}
                      {p.reps ? ` × ${p.reps}` : ''}
                    </div>
                    <div className="text-xs text-ink-3">was {formatNumber(p.previous)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No PRs yet beyond your first session.</p>
          )}
        </Card>

        <Card title="Exercise settings">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              Weights logged in
              <Select
                label="Weight unit"
                value={ex.unit ?? 'default'}
                onChange={setUnit}
                options={[
                  { id: 'default', label: `Default (${settings.defaultUnit})` },
                  { id: 'lb', label: 'lb' },
                  { id: 'kg', label: 'kg' },
                ]}
              />
            </label>
            <Checkbox
              checked={ex.assisted}
              onChange={(assisted) => void updateExercise(db, ex.name, { assisted })}
            >
              Assisted (weight is assistance)
            </Checkbox>
          </div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Muscle groups</h3>
          <MuscleEditor
            key={ex.name}
            exercise={ex}
            onSave={(muscles) =>
              void updateExercise(db, ex.name, { muscles, muscleSource: 'user' })
            }
          />
        </Card>
      </div>

      <Card title="History" subtitle={`${stats.length} sessions, newest first`}>
        <SessionHistory sets={sets} unit={unit} limit={historyLimit} />
        {historyLimit < stats.length && (
          <div className="mt-4 text-center">
            <Button
              onClick={() => {
                setHistoryLimit((l) => l + 20);
              }}
            >
              Show more
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

function SessionHistory({ sets, unit, limit }: { sets: WorkoutSet[]; unit: Unit; limit: number }) {
  const sessions = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const list = map.get(s.workoutKey);
      if (list) list.push(s);
      else map.set(s.workoutKey, [s]);
    }
    return [...map.values()].reverse();
  }, [sets]);

  return (
    <ul className="divide-y divide-border">
      {sessions.slice(0, limit).map((list) => {
        const first = list[0];
        if (!first) return null;
        return (
          <li key={first.workoutKey} className="py-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {formatDate(bucketKey(first.date, 'session'))}
              </span>
              <span className="truncate text-xs text-ink-2">
                {first.workoutKey.split('|').slice(1).join('|')}
              </span>
            </div>
            <div className="tabular flex flex-wrap gap-1.5">
              {[...list]
                .sort((a, b) => a.setIndex - b.setIndex)
                .map((s) => (
                  <span
                    key={s.key}
                    title={s.notes ?? undefined}
                    className={
                      s.setType === 'warmup'
                        ? 'rounded border border-dashed border-border px-1.5 py-0.5 text-xs text-ink-3'
                        : 'rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink'
                    }
                  >
                    {s.setType !== 'normal' && (
                      <span className="mr-1 font-semibold">{s.setType[0]?.toUpperCase()}</span>
                    )}
                    {describeSet(s, unit)}
                    {s.rpe != null && <span className="ml-1 text-ink-3">@{s.rpe}</span>}
                  </span>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function describeSet(s: WorkoutSet, unit: Unit): string {
  const parts: string[] = [];
  if (s.weight) parts.push(`${formatNumber(s.weight)} ${unit}`);
  if (s.reps != null && (s.reps || !s.seconds)) parts.push(`${formatNumber(s.reps, 0)} reps`);
  if (s.distance) parts.push(`${formatNumber(s.distance, 2)} dist`);
  if (s.seconds) parts.push(`${formatNumber(s.seconds, 0)}s`);
  return parts.join(' × ') || '—';
}
