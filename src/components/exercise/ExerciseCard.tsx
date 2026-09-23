import { Link } from 'react-router-dom';
import { formatDate } from '../../domain/dates';
import type { Exercise } from '../../domain/types';
import { exercisePath, formatNumber } from '../../domain/units';
import { MuscleChips, MuscleSourceBadge } from '../MuscleChips';

/**
 * One exercise in the list grid. The whole card is the link, so the target is the card
 * rather than the few characters of its name.
 */
export function ExerciseCard({
  exercise,
  sessions,
  best,
  last,
  unit,
  flagMuscles,
}: {
  exercise: Exercise;
  sessions: number;
  best: number | null;
  last: string | null;
  unit: string;
  /** Show the muscle-source badge, for assignments that still want a look. */
  flagMuscles: boolean;
}) {
  return (
    <Link
      to={exercisePath(exercise.name)}
      className="focus-ring flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-sm font-semibold text-ink">{exercise.name}</h2>
        {flagMuscles && (
          <MuscleSourceBadge
            source={exercise.muscleSource}
            confidence={exercise.suggestionConfidence}
          />
        )}
      </div>

      <MuscleChips muscles={exercise.muscles} />

      <dl className="tabular mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-ink">
        <Figure label="Sessions" value={formatNumber(sessions, 0)} />
        <Figure label="Best e1RM" value={best != null ? `${formatNumber(best)} ${unit}` : '–'} />
        <Figure
          label="Last done"
          value={last ? formatDate(last, { month: 'short', day: 'numeric' }) : '–'}
        />
      </dl>
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-ink-2">{label}</dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
