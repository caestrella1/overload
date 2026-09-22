import { useMemo } from 'react';
import { BarList, StackedBars } from '../components/charts';
import { NoDataPage } from '../components/NoDataPage';
import { RangeControls } from '../components/RangeControls';
import { Card, Muted, PageHeader, Segmented, Select } from '../components/ui';
import { inRange } from '../domain/analysis';
import type { Bucket } from '../domain/dates';
import { muscleContributors, muscleSeries, totalsByKey } from '../domain/metrics';
import { MUSCLE_GROUPS, REGIONS } from '../domain/muscles';
import type { MuscleGroup } from '../domain/types';
import { formatCompact, formatNumber } from '../domain/units';
import { useChartControls } from '../hooks/useChartControls';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';
import { SERIES_COLORS } from '../lib/colors';

type Metric = 'sets' | 'volume';
/** The top chart either breaks training down by region, or isolates one muscle. */
type View = 'regions' | 'muscle';

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

/** Regions keep a fixed color slot so filtering never repaints them. */
const REGION_KEYS = REGIONS.map((r, i) => ({ id: r, label: r, color: SERIES_COLORS[i] ?? '' }));

export default function MusclesPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [metric, setMetric] = usePref<Metric>('muscles.metric', 'sets');
  const [selected, setSelected] = usePref<MuscleGroup>('muscles.selected', 'Chest');
  const [view, setView] = usePref<View>('muscles.view', 'regions');
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

  const data = useMemo(() => {
    if (!exercises) return null;
    const regions = muscleSeries(ranged, exercises, { ...opts, bucket, level: 'region' });
    const muscles = muscleSeries(ranged, exercises, { ...opts, bucket, level: 'muscle' });
    return {
      regions,
      muscles,
      totals: totalsByKey(muscles.rows, MUSCLE_GROUPS),
      contributors: muscleContributors(ranged, exercises, selected, opts).slice(0, 10),
    };
  }, [ranged, exercises, opts, bucket, selected]);

  if (!sets || !data) return null;
  if (!sets.length) {
    return <NoDataPage title="Muscle groups">to see training per muscle group.</NoDataPage>;
  }

  const fmt = (v: number) => formatCompact(v, 1);
  const metricLabel = metric === 'sets' ? 'Sets' : `Volume (${settings.defaultUnit})`;
  const single = view === 'muscle';

  // One series for the chosen muscle. Periods it was not trained stay in, as zeros,
  // so gaps in training are visible rather than collapsed away.
  const muscleRows = data.muscles.rows.map((r) => ({
    period: r.period,
    value: Number(r[selected]) || 0,
  }));
  const muscleOptions = MUSCLE_GROUPS.filter(
    (m) => m === selected || data.muscles.groups.includes(m),
  ).map((m) => ({ id: m, label: m }));

  const focusMuscle = (m: MuscleGroup) => {
    setSelected(m);
    setView('muscle');
  };

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

      <Card
        className="mb-6"
        title={
          single
            ? `${selected}: ${metricLabel.toLowerCase()} per ${bucket}`
            : `${metricLabel} by body region`
        }
        subtitle={
          single
            ? 'Only this muscle, so its trend is readable on its own.'
            : 'Every muscle stacked, to see how a session splits up.'
        }
        actions={
          <>
            <Segmented<View>
              label="Chart contents"
              value={view}
              onChange={setView}
              options={[
                { id: 'regions', label: 'All muscles' },
                { id: 'muscle', label: 'One muscle' },
              ]}
            />
            {single && (
              <Select
                label="Muscle"
                value={selected}
                onChange={(m) => {
                  setSelected(m);
                }}
                options={muscleOptions}
              />
            )}
          </>
        }
      >
        {single ? (
          <StackedBars
            rows={muscleRows}
            keys={[{ id: 'value', label: selected, color: SERIES_COLORS[0] ?? '' }]}
            bucket={bucket}
            format={fmt}
          />
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
                focusMuscle(id as MuscleGroup);
              }}
            />
          ) : (
            <Muted>No muscle data in this range.</Muted>
          )}
        </Card>

        <Card className="lg:col-span-3" title={`Top exercises for ${selected}`}>
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
