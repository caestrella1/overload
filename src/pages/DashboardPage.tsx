import { useMemo } from 'react';
import { StackedBars } from '../components/charts';
import { NoDataPage } from '../components/NoDataPage';
import { PrList } from '../components/PrList';
import { StalledLifts } from '../components/StalledLifts';
import { SampleDataBanner } from '../components/SampleDataBanner';
import { RangeControls } from '../components/RangeControls';
import {
  Callout,
  Card,
  LinkButton,
  PageHeader,
  Segmented,
  StatGrid,
  StatTile,
  TextLink,
} from '../components/ui';
import {
  allPrs,
  inRange,
  periodTotals,
  statsByExercise,
  type PeriodTotal,
} from '../domain/analysis';
import { formatDate, toLocalString, weekKey } from '../domain/dates';
import { stalledLifts } from '../domain/stalled';
import { exerciseUnit, formatCompact, formatNumber } from '../domain/units';
import { useChartControls } from '../hooks/useChartControls';
import {
  useAllSets,
  useBodyweights,
  useExercises,
  useSettings,
  useWorkouts,
} from '../hooks/useData';
import { usePref } from '../hooks/usePref';
import { SERIES_COLORS } from '../lib/colors';

type TotalMetric = 'volume' | 'sets' | 'workouts';

/** This week's totals and the average of the four weeks before it. */
function weekSummary(weekly: PeriodTotal[], now = new Date()) {
  const thisWeek = weekKey(toLocalString(now));
  const prior = weekly.filter((w) => w.period < thisWeek).slice(-4);
  const avg = (key: 'volume' | 'sets') =>
    prior.length ? prior.reduce((a, w) => a + w[key], 0) / prior.length : null;
  return {
    current: weekly.find((w) => w.period === thisWeek),
    avgSets: avg('sets'),
    avgVolume: avg('volume'),
  };
}

export default function DashboardPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const workouts = useWorkouts();
  const settings = useSettings();
  const bodyweights = useBodyweights();
  const { range, setRange, start } = useChartControls('dash', { range: '6m', bucket: 'week' });
  const [metric, setMetric] = usePref<TotalMetric>('dash.metric', 'volume');

  const allWeekly = useMemo(
    () => (sets && exercises ? periodTotals(sets, exercises, settings, 'week') : []),
    [sets, exercises, settings],
  );
  const stalled = useMemo(
    () =>
      sets && exercises
        ? stalledLifts(statsByExercise(sets, exercises, settings, bodyweights))
        : [],
    [sets, exercises, settings, bodyweights],
  );
  const prs = useMemo(
    () => (sets && exercises ? allPrs(sets, exercises, settings, bodyweights) : []),
    [sets, exercises, settings, bodyweights],
  );

  if (!sets || !exercises || !workouts) return null;
  if (!sets.length) {
    return (
      <NoDataPage title="Dashboard">
        to start charting your progress. Everything stays in this browser.
      </NoDataPage>
    );
  }

  const weekly = start ? allWeekly.filter((w) => w.period >= start.slice(0, 10)) : allWeekly;
  const { current, avgSets, avgVolume } = weekSummary(allWeekly);
  const lastWorkout = workouts[workouts.length - 1];
  const review = [...exercises.values()].filter(
    (e) => e.muscleSource === 'suggested' || e.muscleSource === 'unassigned',
  ).length;
  const unit = settings.defaultUnit;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <RangeControls range={range} onRange={setRange} />
            <LinkButton to="/import">Import</LinkButton>
          </>
        }
      />

      <SampleDataBanner />
      {review > 0 && (
        <Callout
          className="mb-6"
          tone="info"
          title={`${review} exercise(s) have suggested or missing muscle groups`}
        >
          Muscle charts use suggestions until you confirm them.{' '}
          <TextLink to="/exercises?filter=review">Review exercises</TextLink>
        </Callout>
      )}

      <StatGrid className="mb-6">
        <StatTile
          label="Workouts"
          value={formatNumber(inRange(workouts, start).length, 0)}
          detail={range === 'all' ? 'All time' : `Last ${range.toUpperCase()}`}
        />
        <StatTile
          label="Sets this week"
          value={formatNumber(current?.sets ?? 0, 0)}
          detail={avgSets != null ? `4-wk avg ${formatNumber(avgSets, 0)}` : undefined}
        />
        <StatTile
          label={`Volume this week (${unit})`}
          value={formatNumber(current?.volume ?? 0, 0)}
          detail={avgVolume != null ? `4-wk avg ${formatNumber(avgVolume, 0)}` : undefined}
        />
        <StatTile
          label="Last workout"
          value={
            lastWorkout ? formatDate(lastWorkout.date, { month: 'short', day: 'numeric' }) : '–'
          }
          detail={lastWorkout?.name}
        />
      </StatGrid>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Card
          className="min-w-0 lg:col-span-3"
          title="Weekly training"
          subtitle={metric === 'volume' ? `Volume in ${unit}, assisted lifts excluded` : undefined}
          actions={
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { id: 'volume', label: 'Volume' },
                { id: 'sets', label: 'Sets' },
                { id: 'workouts', label: 'Workouts' },
              ]}
            />
          }
        >
          <StackedBars
            rows={weekly.map((w) => ({ period: w.period, value: w[metric] }))}
            keys={[{ id: 'value', label: 'Total', color: SERIES_COLORS[0] ?? '' }]}
            bucket="week"
            format={(v) => formatCompact(v)}
            height={260}
          />
        </Card>

        <Card
          className="min-w-0 lg:col-span-2"
          title="Recent PRs"
          subtitle="Beats your previous best"
        >
          <PrList
            prs={prs}
            limit={12}
            showExercise
            unitFor={(name) => exerciseUnit(exercises.get(name), unit)}
          />
        </Card>
      </div>

      <div className="mt-6">
        <StalledLifts lifts={stalled} unitFor={(name) => exerciseUnit(exercises.get(name), unit)} />
      </div>
    </>
  );
}
