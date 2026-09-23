import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExerciseLink } from '../components/ExerciseLink';
import { MuscleChips, MuscleSourceBadge } from '../components/MuscleChips';
import { NoDataPage } from '../components/NoDataPage';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  PageHeader,
  Select,
  TextInput,
} from '../components/ui';
import { db } from '../db/db';
import { confirmSuggestedMuscles } from '../db/repo';
import { groupByExercise, statsForExercise } from '../domain/analysis';
import { formatDate } from '../domain/dates';
import { MUSCLE_GROUPS } from '../domain/muscles';
import type { Exercise, MuscleGroup } from '../domain/types';
import { exerciseUnit, formatNumber } from '../domain/units';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';

type StatusFilter = 'all' | 'review' | 'unassigned';
type Sort = 'recent' | 'sessions' | 'name';

interface Row {
  ex: Exercise;
  sessions: number;
  last: string | null;
  best: number | null;
}

const needsReview = (e: Exercise) =>
  e.muscleSource === 'suggested' || e.muscleSource === 'unassigned';

function matches(row: Row, query: string, muscle: string, status: StatusFilter): boolean {
  const { ex } = row;
  if (query && !ex.name.toLowerCase().includes(query.toLowerCase())) return false;
  if (status === 'review' && !needsReview(ex)) return false;
  if (status === 'unassigned' && ex.muscleSource !== 'unassigned') return false;
  if (muscle === 'all') return true;
  const m = muscle as MuscleGroup;
  return ex.muscles.primary.includes(m) || ex.muscles.secondary.includes(m);
}

const SORTERS: Record<Sort, (a: Row, b: Row) => number> = {
  name: (a, b) => a.ex.name.localeCompare(b.ex.name),
  sessions: (a, b) => b.sessions - a.sessions,
  recent: (a, b) => (b.last ?? '').localeCompare(a.last ?? ''),
};

export default function ExercisesPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [confirming, setConfirming] = useState(false);
  const status = (params.get('filter') ?? 'all') as StatusFilter;

  const rows = useMemo<Row[]>(() => {
    if (!sets || !exercises) return [];
    const groups = groupByExercise(sets);
    return [...exercises.values()].map((ex) => {
      const stats = statsForExercise(groups.get(ex.name) ?? [], ex, settings);
      const e1rms = stats.flatMap((s) => (s.e1rm == null ? [] : [s.e1rm]));
      return {
        ex,
        sessions: stats.length,
        last: stats[stats.length - 1]?.date ?? null,
        best: e1rms.length ? Math.max(...e1rms) : null,
      };
    });
  }, [sets, exercises, settings]);

  if (!exercises) return null;
  if (!exercises.size) return <NoDataPage title="Exercises">to see your exercises.</NoDataPage>;

  const visible = rows.filter((r) => matches(r, query, muscle, status)).sort(SORTERS[sort]);
  const suggested = [...exercises.values()].filter((e) => e.muscleSource === 'suggested').length;

  return (
    <>
      <PageHeader
        title="Exercises"
        subtitle={`${formatNumber(exercises.size, 0)} exercises`}
        actions={
          suggested > 0 && (
            <Button
              onClick={() => {
                setConfirming(true);
              }}
            >
              Accept {suggested} suggested muscle mapping(s)
            </Button>
          )
        }
      />
      <ConfirmDialog
        open={confirming}
        title="Accept all suggested muscle groups?"
        confirmLabel="Accept all"
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          void confirmSuggestedMuscles(db);
        }}
      >
        Marks {suggested} suggested mapping(s) as yours. You can still edit any exercise afterwards.
        Unassigned exercises need to be set individually.
      </ConfirmDialog>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TextInput
            type="search"
            label="Search exercises"
            placeholder="Search exercises"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            className="flex-1 sm:max-w-xs"
          />
          <Select
            label="Muscle group"
            value={muscle}
            onChange={setMuscle}
            options={[
              { id: 'all', label: 'All muscles' },
              ...MUSCLE_GROUPS.map((m) => ({ id: m, label: m })),
            ]}
          />
          <Select<StatusFilter>
            label="Muscle status"
            value={status}
            onChange={(f) => {
              setParams(f === 'all' ? {} : { filter: f });
            }}
            options={[
              { id: 'all', label: 'Any muscle status' },
              { id: 'review', label: 'Needs review' },
              { id: 'unassigned', label: 'Unassigned' },
            ]}
          />
          <Select<Sort>
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'recent', label: 'Recently done' },
              { id: 'sessions', label: 'Most sessions' },
              { id: 'name', label: 'Name' },
            ]}
          />
        </div>

        <DataTable
          minWidth={640}
          rows={visible}
          rowKey={(r) => r.ex.name}
          empty="No exercises match."
          columns={[
            { key: 'name', label: 'Exercise', render: (r) => <ExerciseLink name={r.ex.name} /> },
            {
              key: 'muscles',
              label: 'Muscles',
              render: (r) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <MuscleChips muscles={r.ex.muscles} />
                  {needsReview(r.ex) && <MuscleSourceBadge source={r.ex.muscleSource} />}
                </div>
              ),
            },
            { key: 'sessions', label: 'Sessions', align: 'right', render: (r) => r.sessions },
            {
              key: 'best',
              label: 'Best e1RM',
              align: 'right',
              render: (r) =>
                r.best != null
                  ? `${formatNumber(r.best)} ${exerciseUnit(r.ex, settings.defaultUnit)}`
                  : '–',
            },
            {
              key: 'last',
              label: 'Last done',
              align: 'right',
              className: 'text-ink-2',
              render: (r) => (r.last ? formatDate(r.last) : '–'),
            },
          ]}
        />
      </Card>
    </>
  );
}
