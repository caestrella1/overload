import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarList, StackedBars, TrendChart } from '../components/charts';
import { SERIES_COLORS } from '../lib/colors';
import { RangeControls } from '../components/RangeControls';
import { Card, EmptyState, PageHeader, Segmented } from '../components/ui';
import { inRange } from '../domain/analysis';
import { rangeStart, type Bucket, type RangePreset } from '../domain/dates';
import { isWorkingSet, muscleSeries } from '../domain/metrics';
import { MUSCLE_GROUPS, REGIONS } from '../domain/muscles';
import type { MuscleGroup } from '../domain/types';
import { convertWeight, exerciseUnit, formatNumber } from '../domain/units';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';

type Metric = 'sets' | 'volume';

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export default function MusclesPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [metric, setMetric] = usePref<Metric>('muscles.metric', 'sets');
  const [bucket, setBucket] = usePref<Bucket>('muscles.bucket', 'week');
  const [range, setRange] = usePref<RangePreset>('muscles.range', '6m');
  const [selected, setSelected] = usePref<MuscleGroup>('muscles.selected', 'Chest');

  const start = rangeStart(range);
  const ranged = useMemo(() => (sets ? inRange(sets, start) : []), [sets, start]);

  const base = useMemo(
    () => ({
      includeWarmups: settings.includeWarmups,
      formula: settings.e1rmFormula,
      secondaryWeight: settings.secondaryWeight,
      defaultUnit: settings.defaultUnit,
      bucket,
      metric,
    }),
    [settings, bucket, metric],
  );

  const regions = useMemo(
    () => (exercises ? muscleSeries(ranged, exercises, { ...base, level: 'region' }) : null),
    [ranged, exercises, base],
  );
  const muscles = useMemo(
    () => (exercises ? muscleSeries(ranged, exercises, { ...base, level: 'muscle' }) : null),
    [ranged, exercises, base],
  );

  const totals = useMemo(() => {
    if (!muscles) return [];
    return MUSCLE_GROUPS.map((m) => ({
      id: m,
      label: m,
      value: muscles.rows.reduce((acc, r) => acc + (Number(r[m]) || 0), 0),
    }))
      .filter((t) => t.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [muscles]);

  const contributors = useMemo(() => {
    if (!exercises) return [];
    const map = new Map<string, number>();
    for (const s of ranged) {
      if (!isWorkingSet(s, settings.includeWarmups)) continue;
      const ex = exercises.get(s.exercise);
      if (!ex) continue;
      const w = ex.muscles.primary.includes(selected)
        ? 1
        : ex.muscles.secondary.includes(selected)
          ? settings.secondaryWeight
          : 0;
      if (!w) continue;
      let amount = 1;
      if (metric === 'volume') {
        if (ex.assisted) continue;
        const unit = exerciseUnit(ex, settings.defaultUnit);
        amount = convertWeight((s.weight ?? 0) * (s.reps ?? 0), unit, settings.defaultUnit);
      }
      map.set(s.exercise, (map.get(s.exercise) ?? 0) + amount * w);
    }
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ id: name, label: name, value }));
  }, [ranged, exercises, selected, metric, settings]);

  if (!sets || !exercises || !regions || !muscles) return null;
  if (!sets.length) {
    return (
      <>
        <PageHeader title="Muscle groups" />
        <EmptyState title="No data yet">
          <Link to="/import" className="text-accent hover:underline">
            Import your workouts
          </Link>{' '}
          to see training per muscle group.
        </EmptyState>
      </>
    );
  }

  const unit = settings.defaultUnit;
  const fmt = (v: number) =>
    metric === 'volume' && v >= 10000 ? `${formatNumber(v / 1000, 1)}k` : formatNumber(v, 1);
  const metricLabel = metric === 'sets' ? 'Sets' : `Volume (${unit})`;
  const regionKeys = REGIONS.filter((r) => regions.groups.includes(r)).map((r) => ({
    id: r,
    label: r,
    color: SERIES_COLORS[REGIONS.indexOf(r)] ?? '',
  }));
  const trend = muscles.rows
    .filter((r) => typeof r[selected] === 'number')
    .map((r) => ({ period: r.period, value: r[selected] as number }));

  return (
    <>
      <PageHeader
        title="Muscle groups"
        subtitle={`Secondary muscles count as ${formatNumber(settings.secondaryWeight, 2)} of a set. Change this in Settings.`}
        actions={
          <>
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { id: 'sets', label: 'Sets' },
                { id: 'volume', label: 'Volume' },
              ]}
            />
            <RangeControls
              range={range}
              onRange={setRange}
              bucket={bucket}
              onBucket={setBucket}
              buckets={BUCKETS}
            />
          </>
        }
      />

      <Card title={`${metricLabel} by body region`} className="mb-6">
        <StackedBars rows={regions.rows} keys={regionKeys} bucket={bucket} format={fmt} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title={`${metricLabel} per muscle`}
          subtitle="Total in range. Select a muscle to see its trend."
        >
          {totals.length ? (
            <BarList
              items={totals}
              format={fmt}
              selected={selected}
              onSelect={(id) => {
                setSelected(id as MuscleGroup);
              }}
            />
          ) : (
            <p className="text-sm text-ink-3">No muscle data in this range.</p>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card title={`${selected}: ${metricLabel.toLowerCase()} per ${bucket}`}>
            <TrendChart
              series={[{ id: 'v', label: selected, color: SERIES_COLORS[0] ?? '', points: trend }]}
              bucket={bucket}
              format={fmt}
              height={240}
            />
          </Card>
          <Card title={`Top exercises for ${selected}`}>
            {contributors.length ? (
              <BarList items={contributors} format={fmt} wideLabels />
            ) : (
              <p className="text-sm text-ink-3">No exercises hit this muscle in range.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
