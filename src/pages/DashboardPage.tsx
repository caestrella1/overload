import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StackedBars } from '../components/charts';
import { SERIES_COLORS } from '../lib/colors';
import { RangeControls } from '../components/RangeControls';
import { Callout, Card, EmptyState, PageHeader, Segmented, StatTile } from '../components/ui';
import { allPrs, inRange, periodTotals } from '../domain/analysis';
import { formatDate, rangeStart, toLocalString, weekKey, type RangePreset } from '../domain/dates';
import { PR_LABELS } from '../domain/metrics';
import { exerciseUnit, formatNumber } from '../domain/units';
import { useAllSets, useExercises, useSettings, useWorkouts } from '../hooks/useData';
import { usePref } from '../hooks/usePref';

type TotalMetric = 'volume' | 'sets' | 'workouts';

export default function DashboardPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const workouts = useWorkouts();
  const settings = useSettings();
  const [range, setRange] = usePref<RangePreset>('dash.range', '6m');
  const [metric, setMetric] = usePref<TotalMetric>('dash.metric', 'volume');

  const start = rangeStart(range);
  const ranged = useMemo(() => (sets ? inRange(sets, start) : []), [sets, start]);

  const weekly = useMemo(
    () => (exercises ? periodTotals(ranged, exercises, settings, 'week') : []),
    [ranged, exercises, settings],
  );
  const prs = useMemo(
    () => (sets && exercises ? allPrs(sets, exercises, settings) : []),
    [sets, exercises, settings],
  );

  if (!sets || !exercises || !workouts) return null;
  if (!sets.length) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState title="No workouts yet">
          <Link to="/import" className="font-medium text-accent hover:underline">
            Import a Strong CSV export
          </Link>{' '}
          to start charting your progress. Everything stays in this browser.
        </EmptyState>
      </>
    );
  }

  const thisWeek = weekKey(toLocalString(new Date()));
  const allWeekly = periodTotals(sets, exercises, settings, 'week');
  const current = allWeekly.find((w) => w.period === thisWeek);
  const recent = allWeekly.filter((w) => w.period < thisWeek).slice(-4);
  const avg = (key: 'volume' | 'sets') =>
    recent.length ? recent.reduce((a, w) => a + w[key], 0) / recent.length : null;
  const lastWorkout = workouts[workouts.length - 1];
  const rangedWorkouts = inRange(workouts, start);
  const review = [...exercises.values()].filter(
    (e) => e.muscleSource === 'suggested' || e.muscleSource === 'unassigned',
  ).length;
  const unit = settings.defaultUnit;

  const fmt = (v: number) =>
    metric === 'volume' && v >= 10000 ? `${formatNumber(v / 1000, 1)}k` : formatNumber(v, 0);

  return (
    <>
      <PageHeader title="Dashboard" actions={<RangeControls range={range} onRange={setRange} />} />

      {review > 0 && (
        <div className="mb-6">
          <Callout
            tone="info"
            title={`${review} exercise(s) have suggested or missing muscle groups`}
          >
            Muscle charts use suggestions until you confirm them.{' '}
            <Link to="/exercises?filter=review" className="font-medium text-accent hover:underline">
              Review exercises
            </Link>
          </Callout>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Workouts"
          value={formatNumber(rangedWorkouts.length, 0)}
          detail={range === 'all' ? 'All time' : `Last ${range.toUpperCase()}`}
        />
        <StatTile
          label="Sets this week"
          value={formatNumber(current?.sets ?? 0, 0)}
          detail={avg('sets') != null ? `4-wk avg ${formatNumber(avg('sets'), 0)}` : undefined}
        />
        <StatTile
          label={`Volume this week (${unit})`}
          value={formatNumber(current?.volume ?? 0, 0)}
          detail={avg('volume') != null ? `4-wk avg ${formatNumber(avg('volume'), 0)}` : undefined}
        />
        <StatTile
          label="Last workout"
          value={
            lastWorkout ? formatDate(lastWorkout.date, { month: 'short', day: 'numeric' }) : '–'
          }
          detail={lastWorkout?.name}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
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
            keys={[{ id: 'value', label: metric, color: SERIES_COLORS[0] ?? '' }]}
            bucket="week"
            format={fmt}
            height={260}
          />
        </Card>

        <Card className="lg:col-span-2" title="Recent PRs" subtitle="Beats your previous best">
          {prs.length ? (
            <ul className="divide-y divide-border">
              {prs.slice(0, 12).map((p) => {
                const u = exerciseUnit(exercises.get(p.exercise), unit);
                const isWeight = p.type !== 'reps';
                return (
                  <li
                    key={`${p.exercise}|${p.type}|${p.date}`}
                    className="flex items-baseline gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/exercises/${encodeURIComponent(p.exercise)}`}
                        className="block truncate text-sm font-medium text-ink hover:underline"
                      >
                        {p.exercise}
                      </Link>
                      <div className="text-xs text-ink-2">
                        {PR_LABELS[p.type]} · {formatDate(p.date)}
                      </div>
                    </div>
                    <div className="tabular text-right text-sm">
                      <div className="font-medium text-ink">
                        {formatNumber(p.value)}
                        {isWeight ? ` ${u}` : ''}
                        {p.reps ? ` × ${p.reps}` : ''}
                      </div>
                      <div className="text-xs text-ink-3">was {formatNumber(p.previous)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Log a few more sessions to see PRs.</p>
          )}
        </Card>
      </div>
    </>
  );
}
