import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendChart, type ChartSeries } from '../components/charts';
import { SERIES_COLORS } from '../lib/colors';
import { RangeControls } from '../components/RangeControls';
import { Card, Checkbox, EmptyState, PageHeader, Segmented, Select } from '../components/ui';
import { formatMetric, groupByExercise, inRange, statsForExercise } from '../domain/analysis';
import { rangeStart, type Bucket, type RangePreset } from '../domain/dates';
import { bucketSeries, METRIC_BY_ID, METRICS, type MetricId } from '../domain/metrics';
import type { WorkoutSet } from '../domain/types';
import { formatNumber } from '../domain/units';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';

const SLOTS = 4;
const NONE = '';

export default function ComparePage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [picked, setPicked] = usePref<string[]>('compare.exercises', []);
  const [metric, setMetric] = usePref<MetricId>('compare.metric', 'e1rm');
  const [bucket, setBucket] = usePref<Bucket>('compare.bucket', 'week');
  const [range, setRange] = usePref<RangePreset>('compare.range', '1y');
  const [indexed, setIndexed] = usePref('compare.indexed', false);

  const slots = useMemo(() => Array.from({ length: SLOTS }, (_, i) => picked[i] ?? NONE), [picked]);
  const grouped = useMemo(
    () => (sets ? groupByExercise(sets) : new Map<string, WorkoutSet[]>()),
    [sets],
  );
  const names = useMemo(() => [...grouped.keys()].sort((a, b) => a.localeCompare(b)), [grouped]);

  const start = rangeStart(range);
  const unit = settings.defaultUnit;
  const series = useMemo<ChartSeries[]>(() => {
    if (!exercises) return [];
    const out: ChartSeries[] = [];
    slots.forEach((name, i) => {
      if (!name) return;
      const ex = exercises.get(name);
      // Convert everything to the default unit so weights are comparable.
      const stats = inRange(statsForExercise(grouped.get(name) ?? [], ex, settings, unit), start);
      let points = bucketSeries(stats, metric, bucket, { assisted: ex?.assisted });
      const base = points[0]?.value;
      if (indexed && base) points = points.map((p) => ({ ...p, value: (p.value / base) * 100 }));
      // Color follows the slot, so removing one lift never repaints the others.
      out.push({ id: `s${i}`, label: name, color: SERIES_COLORS[i] ?? '', points });
    });
    return out;
  }, [slots, exercises, grouped, settings, unit, start, metric, bucket, indexed]);

  if (!sets || !exercises) return null;
  if (!sets.length) {
    return (
      <>
        <PageHeader title="Compare" />
        <EmptyState title="No data yet">
          <Link to="/import" className="text-accent hover:underline">
            Import your workouts
          </Link>{' '}
          to compare lifts.
        </EmptyState>
      </>
    );
  }

  const setSlot = (i: number, name: string) => {
    const next = [...slots];
    next[i] = name;
    setPicked(next);
  };

  const def = METRIC_BY_ID[metric];
  const fmt = (v: number) => (indexed ? formatNumber(v, 0) : formatMetric(v, metric, unit, true));

  return (
    <>
      <PageHeader
        title="Compare"
        subtitle={`Up to ${SLOTS} exercises on one metric. Weights are shown in ${unit}.`}
        actions={
          <RangeControls range={range} onRange={setRange} bucket={bucket} onBucket={setBucket} />
        }
      />
      <Card className="mb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: SERIES_COLORS[i] }}
                aria-hidden="true"
              />
              <Select
                label={`Exercise ${i + 1}`}
                className="min-w-0 flex-1 [&_select]:w-full"
                value={name}
                onChange={(v) => {
                  setSlot(i, v);
                }}
                options={[
                  { id: NONE, label: '— none —' },
                  ...names.map((n) => ({ id: n, label: n })),
                ]}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card
        title={indexed ? `${def.label} (first point = 100)` : def.label}
        subtitle={def.description}
        actions={
          <Checkbox checked={indexed} onChange={setIndexed}>
            Index to 100
          </Checkbox>
        }
      >
        <div className="mb-3">
          <Segmented
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({ id: m.id, label: m.label }))}
          />
        </div>
        {series.length ? (
          <TrendChart series={series} bucket={bucket} format={fmt} />
        ) : (
          <p className="py-12 text-center text-sm text-ink-3">Pick an exercise above.</p>
        )}
      </Card>
    </>
  );
}
