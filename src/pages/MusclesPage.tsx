import { useMemo } from 'react';
import { BarList, StackedBars, TrendChart, type ChartSeries } from '../components/charts';
import { MuscleFilter } from '../components/muscles/MuscleFilter';
import { RisingMuscles } from '../components/muscles/RisingMuscles';
import { NoDataPage } from '../components/NoDataPage';
import { RangeControls } from '../components/RangeControls';
import { Card, Muted, PageHeader, Segmented } from '../components/ui';
import { inRange } from '../domain/analysis';
import type { Bucket } from '../domain/dates';
import { muscleContributors, muscleSeries, totalsByKey } from '../domain/metrics';
import { REGIONS } from '../domain/muscles';
import { muscleTrends } from '../domain/trends';
import type { MuscleGroup } from '../domain/types';
import { formatCompact, formatNumber } from '../domain/units';
import { useChartControls } from '../hooks/useChartControls';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';
import { SERIES_COLORS } from '../lib/colors';
import { activeSlots, toggleSlot, type Slots } from '../lib/slots';

type Metric = 'sets' | 'volume';

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

/** Regions keep a fixed color slot so filtering never repaints them. */
const REGION_KEYS = REGIONS.map((r, i) => ({ id: r, label: r, color: SERIES_COLORS[i] ?? '' }));

const colorAt = (index: number) => SERIES_COLORS[index] ?? '';

export default function MusclesPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [metric, setMetric] = usePref<Metric>('muscles.metric', 'sets');
  const [slots, setSlots] = usePref<Slots<MuscleGroup>>('muscles.slots', []);
  const { range, setRange, bucket, setBucket, start } = useChartControls('muscles', {
    range: '6m',
    bucket: 'week',
  });

  const ranged = useMemo(() => (sets ? inRange(sets, start) : []), [sets, start]);
  const opts = useMemo(
    () => ({
      includeWarmups: settings.includeWarmups,
      formula: settings.e1rmFormula,
      secondaryWeight: settings.secondaryWeight,
      defaultUnit: settings.defaultUnit,
      metric,
    }),
    [settings, metric],
  );

  const selected = useMemo(() => activeSlots(slots), [slots]);
  // The exercise breakdown follows the first chosen muscle, or the most-trained one.
  const focus = selected[0];

  const data = useMemo(() => {
    if (!exercises) return null;
    const regions = muscleSeries(ranged, exercises, { ...opts, bucket, level: 'region' });
    const muscles = muscleSeries(ranged, exercises, { ...opts, bucket, level: 'muscle' });
    const totals = totalsByKey(muscles.rows, muscles.groups);
    const contributor = focus ?? (totals[0]?.key as MuscleGroup | undefined);
    return {
      regions,
      muscles,
      totals,
      contributor,
      rising: muscleTrends(muscles.rows, muscles.groups),
      contributors: contributor
        ? muscleContributors(ranged, exercises, contributor, opts).slice(0, 10)
        : [],
    };
  }, [ranged, exercises, opts, bucket, focus]);

  if (!sets || !data) return null;
  if (!sets.length) {
    return <NoDataPage title="Muscle groups">to see training per muscle group.</NoDataPage>;
  }

  const fmt = (v: number) => formatCompact(v, 1);
  const metricLabel = metric === 'sets' ? 'Sets' : `Volume (${settings.defaultUnit})`;
  const toggle = (m: MuscleGroup) => {
    setSlots(toggleSlot(slots, m));
  };

  // Chips cover everything trained in range, plus anything selected that no longer is.
  const chips = [
    ...data.totals.map((t) => t.key as MuscleGroup),
    ...selected.filter((m) => !data.muscles.groups.includes(m)),
  ];

  const series: ChartSeries[] = slots.flatMap((muscle, index) =>
    muscle
      ? [
          {
            id: muscle,
            label: muscle,
            color: colorAt(index),
            points: data.muscles.rows.map((r) => ({
              period: r.period,
              // A period with no work for this muscle is a real zero, not a gap.
              value: Number(r[muscle]) || 0,
            })),
          },
        ]
      : [],
  );

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

      <RisingMuscles
        trends={data.rising.trends}
        window={data.rising.window}
        bucket={bucket}
        metricLabel={metricLabel}
        selected={selected}
        onSelect={toggle}
      />

      <Card
        className="mb-6"
        title={
          selected.length
            ? `${selected.join(', ')}: ${metricLabel.toLowerCase()} per ${bucket}`
            : `${metricLabel} by body region`
        }
        subtitle={
          selected.length
            ? 'Only the muscles you picked, so each one reads on its own.'
            : 'Every muscle stacked, to see how a session splits up.'
        }
      >
        <MuscleFilter
          muscles={chips}
          slots={slots}
          colorAt={colorAt}
          onToggle={toggle}
          onClear={() => {
            setSlots([]);
          }}
        />
        {series.length ? (
          <TrendChart series={series} bucket={bucket} format={fmt} />
        ) : (
          <StackedBars
            rows={data.regions.rows}
            keys={REGION_KEYS.filter((k) => data.regions.groups.includes(k.id))}
            bucket={bucket}
            format={fmt}
          />
        )}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title={`${metricLabel} per muscle`}
          subtitle="Total in range. Select a muscle to chart it above."
        >
          {data.totals.length ? (
            <BarList
              items={data.totals.map((t) => ({ id: t.key, label: t.key, value: t.value }))}
              format={fmt}
              selected={selected}
              onSelect={(id) => {
                toggle(id as MuscleGroup);
              }}
            />
          ) : (
            <Muted>No muscle data in this range.</Muted>
          )}
        </Card>

        <Card
          className="lg:col-span-3"
          title={data.contributor ? `Top exercises for ${data.contributor}` : 'Top exercises'}
        >
          {data.contributors.length ? (
            <BarList
              wideLabels
              format={fmt}
              items={data.contributors.map((c) => ({
                id: c.exercise,
                label: c.exercise,
                value: c.value,
              }))}
            />
          ) : (
            <Muted>No exercises hit this muscle in range.</Muted>
          )}
        </Card>
      </div>
    </>
  );
}
