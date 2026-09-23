import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendChart } from '../components/charts';
import { ExerciseReference } from '../components/exercise/ExerciseReference';
import { ExerciseSettingsForm } from '../components/exercise/ExerciseSettingsForm';
import { SessionHistory } from '../components/exercise/SessionHistory';
import { MetricPicker } from '../components/MetricPicker';
import { MuscleChips, MuscleSourceBadge } from '../components/MuscleChips';
import { PrList } from '../components/PrList';
import { RangeControls } from '../components/RangeControls';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  StatGrid,
  StatTile,
  TextLink,
} from '../components/ui';
import {
  availableMetrics,
  bodyweightLoadFor,
  formatMetric,
  inRange,
  statsForExercise,
} from '../domain/analysis';
import { catalogReferenceFor } from '../domain/catalog/lookup';
import { formatDate } from '../domain/dates';
import {
  bucketSeries,
  detectPrs,
  METRIC_BY_ID,
  type MetricId,
  type SessionStat,
} from '../domain/metrics';
import { exerciseUnit, formatNumber } from '../domain/units';
import { useChartControls } from '../hooks/useChartControls';
import { useBodyweights, useExerciseSets, useExercises, useSettings } from '../hooks/useData';
import { usePref } from '../hooks/usePref';
import { CHART_PRIMARY } from '../lib/colors';

/** Best session by top weight: heaviest normally, least assistance for assisted lifts. */
function bestByWeight(stats: SessionStat[], assisted: boolean): SessionStat | null {
  let best: SessionStat | null = null;
  for (const s of stats) {
    if (s.topWeight == null) continue;
    if (
      !best?.topWeight ||
      (assisted ? s.topWeight < best.topWeight : s.topWeight > best.topWeight)
    )
      best = s;
  }
  return best;
}

export default function ExerciseDetailPage() {
  const name = useParams().name ?? '';
  const sets = useExerciseSets(name);
  const exercises = useExercises();
  const settings = useSettings();
  const bodyweights = useBodyweights();
  const [metricPref, setMetric] = usePref<MetricId>('exercise.metric', 'e1rm');
  const [editing, setEditing] = useState(false);
  const { range, setRange, bucket, setBucket, start } = useChartControls('exercise', {
    range: 'all',
    bucket: 'session',
  });

  const ex = exercises?.get(name);
  const unit = exerciseUnit(ex, settings.defaultUnit);
  const bodyweightLoad = bodyweightLoadFor(ex, bodyweights, unit);
  // With bodyweight applied, an assisted lift reads as an ordinary load again.
  const assisted = (ex?.assisted ?? false) && !bodyweightLoad;
  const stats = useMemo(
    () => (sets ? statsForExercise(sets, ex, settings, undefined, bodyweights) : []),
    [sets, ex, settings, bodyweights],
  );
  const metrics = useMemo(() => availableMetrics(stats), [stats]);
  const metric = metrics.includes(metricPref) ? metricPref : (metrics[0] ?? 'sets');
  const points = useMemo(
    () => bucketSeries(inRange(stats, start), metric, bucket, { assisted }),
    [stats, start, metric, bucket, assisted],
  );
  const prs = useMemo(() => detectPrs(stats, { assisted }).reverse(), [stats, assisted]);

  if (!sets || !exercises) return null;
  if (!ex) {
    return (
      <EmptyState title="Exercise not found">
        <TextLink to="/exercises">Back to exercises</TextLink>
      </EmptyState>
    );
  }

  const bestE1rm = Math.max(0, ...stats.map((s) => s.e1rm ?? 0));
  const best = bestByWeight(stats, assisted);
  const last = stats[stats.length - 1];
  const def = METRIC_BY_ID[metric];
  // Without a catalogue match there is no second card, so PR history takes the full row.
  const hasReference = catalogReferenceFor(ex) !== null;

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Exercises', to: '/exercises' }, { label: ex.name }]} />
        }
        title={ex.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <MuscleChips muscles={ex.muscles} />
            {ex.muscleSource !== 'user' && (
              <MuscleSourceBadge source={ex.muscleSource} confidence={ex.suggestionConfidence} />
            )}
            {assisted && <Badge tone="accent">Assisted: lower is better</Badge>}
          </span>
        }
        actions={
          <Button
            onClick={() => {
              setEditing(true);
            }}
          >
            Exercise settings
          </Button>
        }
      />

      <Modal
        open={editing}
        title="Exercise settings"
        onClose={() => {
          setEditing(false);
        }}
      >
        <ExerciseSettingsForm
          exercise={ex}
          defaultUnit={settings.defaultUnit}
          hasBodyweightLog={bodyweights.length > 0}
          names={[...exercises.keys()]}
          setCount={sets.length}
        />
      </Modal>

      <StatGrid className="mb-6">
        <StatTile
          label="Best est. 1RM"
          value={bestE1rm ? `${formatNumber(bestE1rm)} ${unit}` : '–'}
          detail={settings.e1rmFormula === 'epley' ? 'Epley' : 'Brzycki'}
        />
        <StatTile
          label={assisted ? 'Least assistance' : 'Best weight'}
          value={best?.topWeight != null ? `${formatNumber(best.topWeight)} ${unit}` : '–'}
          detail={
            best
              ? `× ${formatNumber(best.topWeightReps ?? 0, 0)} on ${formatDate(best.date)}`
              : undefined
          }
        />
        <StatTile label="Sessions" value={formatNumber(stats.length, 0)} />
        <StatTile
          label="Last session"
          value={last ? formatDate(last.date, { month: 'short', day: 'numeric' }) : '–'}
          detail={last ? `${last.sets} sets · ${formatNumber(last.reps, 0)} reps` : undefined}
        />
      </StatGrid>

      <Card
        title={def.label}
        subtitle={
          bodyweightLoad
            ? `${def.description}. Weights include your logged bodyweight${
                ex.bodyweightFactor === 1 ? '' : ` at ${Math.round(ex.bodyweightFactor * 100)}%`
              }.`
            : def.description
        }
        actions={
          <RangeControls range={range} onRange={setRange} bucket={bucket} onBucket={setBucket} />
        }
        className="mb-6"
      >
        <div className="mb-3">
          <MetricPicker value={metric} metrics={metrics} onChange={setMetric} />
        </div>
        <TrendChart
          series={[{ id: 'v', label: def.label, color: CHART_PRIMARY, points }]}
          bucket={bucket}
          format={(v) => formatMetric(v, metric, unit, true)}
        />
      </Card>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-2">
        <Card
          title="PR history"
          subtitle="Each time you beat a previous best"
          className={hasReference ? undefined : 'lg:col-span-2'}
        >
          <PrList
            prs={prs}
            unitFor={() => unit}
            className="max-h-96 divide-y divide-border overflow-auto"
          />
        </Card>
        <ExerciseReference exercise={ex} />
      </div>

      <Card title="History" subtitle={`${stats.length} sessions, newest first`}>
        <SessionHistory sets={sets} unit={unit} />
      </Card>
    </>
  );
}
