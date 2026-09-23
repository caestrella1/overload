import { useMemo } from 'react';
import { Swatch, TrendChart, type ChartSeries } from '../components/charts';
import { MetricPicker } from '../components/MetricPicker';
import { NoDataPage } from '../components/NoDataPage';
import { RangeControls } from '../components/RangeControls';
import { Card, Checkbox, Muted, PageHeader, Select } from '../components/ui';
import { formatMetric, groupByExercise, inRange, statsForExercise } from '../domain/analysis';
import { bucketSeries, METRIC_BY_ID, METRICS, type MetricId } from '../domain/metrics';
import type { WorkoutSet } from '../domain/types';
import { formatNumber } from '../domain/units';
import { useChartControls } from '../hooks/useChartControls';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';
import { SERIES_COLORS } from '../lib/colors';

const SLOTS = 4;
const NONE = '';
const ALL_METRICS = METRICS.map((m) => m.id);

/** Rebases a series so its first point is 100, for comparing lifts of different scale. */
function indexTo100(points: ChartSeries['points']): ChartSeries['points'] {
  const base = points[0]?.value;
  return base ? points.map((p) => ({ ...p, value: (p.value / base) * 100 })) : points;
}

export default function ComparePage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [picked, setPicked] = usePref<string[]>('compare.exercises', []);
  const [metric, setMetric] = usePref<MetricId>('compare.metric', 'e1rm');
  const [indexed, setIndexed] = usePref('compare.indexed', false);
  const { range, setRange, bucket, setBucket, start } = useChartControls('compare', {
    range: '1y',
    bucket: 'week',
  });

  const slots = useMemo(() => Array.from({ length: SLOTS }, (_, i) => picked[i] ?? NONE), [picked]);
  const grouped = useMemo(
    () => (sets ? groupByExercise(sets) : new Map<string, WorkoutSet[]>()),
    [sets],
  );
  const names = useMemo(() => [...grouped.keys()].sort((a, b) => a.localeCompare(b)), [grouped]);

  const unit = settings.defaultUnit;
  const series = useMemo<ChartSeries[]>(() => {
    if (!exercises) return [];
    return slots.flatMap((name, i) => {
      if (!name) return [];
      const ex = exercises.get(name);
      // Convert everything to the default unit so weights are comparable.
      const stats = inRange(statsForExercise(grouped.get(name) ?? [], ex, settings, unit), start);
      const points = bucketSeries(stats, metric, bucket, { assisted: ex?.assisted });
      // Color follows the slot, so removing one lift never repaints the others.
      return [
        {
          id: `s${i}`,
          label: name,
          color: SERIES_COLORS[i] ?? '',
          points: indexed ? indexTo100(points) : points,
        },
      ];
    });
  }, [slots, exercises, grouped, settings, unit, start, metric, bucket, indexed]);

  if (!sets || !exercises) return null;
  if (!sets.length) return <NoDataPage title="Compare">to compare lifts.</NoDataPage>;

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
            <div key={i} className="flex min-w-0 items-center gap-2">
              <Swatch color={SERIES_COLORS[i] ?? ''} />
              <Select
                label={`Exercise ${i + 1}`}
                className="min-w-0 flex-1"
                value={name}
                onChange={(v) => {
                  setPicked(slots.map((s, j) => (j === i ? v : s)));
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
          <MetricPicker value={metric} metrics={ALL_METRICS} onChange={setMetric} />
        </div>
        {series.length ? (
          <TrendChart series={series} bucket={bucket} format={fmt} />
        ) : (
          <Muted className="py-12 text-center">Pick an exercise above.</Muted>
        )}
      </Card>
    </>
  );
}
