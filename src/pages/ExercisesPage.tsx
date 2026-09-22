import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MuscleChips, MuscleSourceBadge } from '../components/MuscleChips';
import { Button, Card, ConfirmDialog, EmptyState, PageHeader, Select } from '../components/ui';
import { db } from '../db/db';
import { confirmSuggestedMuscles } from '../db/repo';
import { groupByExercise, statsForExercise } from '../domain/analysis';
import { formatDate } from '../domain/dates';
import { MUSCLE_GROUPS } from '../domain/muscles';
import { exerciseUnit, formatNumber } from '../domain/units';
import { useAllSets, useExercises, useSettings } from '../hooks/useData';

type Filter = 'all' | 'review' | 'unassigned';
type Sort = 'recent' | 'sessions' | 'name';

export default function ExercisesPage() {
  const sets = useAllSets();
  const exercises = useExercises();
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [confirming, setConfirming] = useState(false);
  const filter = (params.get('filter') ?? 'all') as Filter;

  const rows = useMemo(() => {
    if (!sets || !exercises) return [];
    const groups = groupByExercise(sets);
    return [...exercises.values()].map((ex) => {
      const list = groups.get(ex.name) ?? [];
      const stats = statsForExercise(list, ex, settings);
      const last = stats[stats.length - 1];
      const best = ex.assisted
        ? null
        : stats.reduce<number | null>(
            (b, s) => (s.e1rm != null && s.e1rm > (b ?? 0) ? s.e1rm : b),
            null,
          );
      return { ex, sessions: stats.length, last: last?.date ?? null, best };
    });
  }, [sets, exercises, settings]);

  const visible = rows
    .filter(({ ex }) => {
      if (query && !ex.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (
        filter === 'review' &&
        ex.muscleSource !== 'suggested' &&
        ex.muscleSource !== 'unassigned'
      )
        return false;
      if (filter === 'unassigned' && ex.muscleSource !== 'unassigned') return false;
      if (
        muscle !== 'all' &&
        !ex.muscles.primary.includes(muscle as never) &&
        !ex.muscles.secondary.includes(muscle as never)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'name') return a.ex.name.localeCompare(b.ex.name);
      if (sort === 'sessions') return b.sessions - a.sessions;
      return (b.last ?? '').localeCompare(a.last ?? '');
    });

  if (!exercises) return null;
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
      {!exercises.size ? (
        <EmptyState title="No exercises yet">
          <Link to="/import" className="font-medium text-accent hover:underline">
            Import your data
          </Link>{' '}
          first.
        </EmptyState>
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search exercises"
              aria-label="Search exercises"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-3 sm:max-w-xs"
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
            <Select
              label="Muscle status"
              value={filter}
              onChange={(f) => {
                setParams(f === 'all' ? {} : { filter: f });
              }}
              options={[
                { id: 'all', label: 'Any muscle status' },
                { id: 'review', label: 'Needs review' },
                { id: 'unassigned', label: 'Unassigned' },
              ]}
            />
            <Select
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-2">
                  <th className="px-2 py-2 font-medium">Exercise</th>
                  <th className="px-2 py-2 font-medium">Muscles</th>
                  <th className="px-2 py-2 text-right font-medium">Sessions</th>
                  <th className="px-2 py-2 text-right font-medium">Best e1RM</th>
                  <th className="px-2 py-2 text-right font-medium">Last done</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {visible.map(({ ex, sessions, last, best }) => (
                  <tr key={ex.name} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-2">
                      <Link
                        to={`/exercises/${encodeURIComponent(ex.name)}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {ex.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MuscleChips exercise={ex} />
                        {ex.muscleSource !== 'user' && ex.muscleSource !== 'source' && (
                          <MuscleSourceBadge source={ex.muscleSource} />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-ink">{sessions}</td>
                    <td className="px-2 py-2 text-right text-ink">
                      {best != null
                        ? `${formatNumber(best)} ${exerciseUnit(ex, settings.defaultUnit)}`
                        : '–'}
                    </td>
                    <td className="px-2 py-2 text-right text-ink-2">
                      {last ? formatDate(last) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="py-8 text-center text-sm text-ink-3">No exercises match.</p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
