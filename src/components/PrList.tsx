import { formatDate } from '../domain/dates';
import { PR_LABELS, type PrEvent } from '../domain/metrics';
import type { Unit } from '../domain/types';
import { formatNumber } from '../domain/units';
import { ExerciseLink } from './ExerciseLink';
import { Muted } from './ui';

/**
 * PR events, newest first as given. With `showExercise`, each row links to its exercise;
 * otherwise the PR type is the row heading.
 */
export function PrList({
  prs,
  unitFor,
  showExercise,
  limit,
  className,
}: {
  prs: PrEvent[];
  unitFor: (exercise: string) => Unit;
  showExercise?: boolean;
  limit?: number;
  className?: string;
}) {
  if (!prs.length) return <Muted>No PRs yet. Your first session sets the baseline.</Muted>;
  return (
    <ul className={className ?? 'divide-y divide-border'}>
      {prs.slice(0, limit).map((p) => {
        const unit = p.type === 'reps' ? '' : ` ${unitFor(p.exercise)}`;
        const meta = `${showExercise ? `${PR_LABELS[p.type]} · ` : ''}${formatDate(p.date)}`;
        return (
          <li key={`${p.exercise}|${p.type}|${p.date}`} className="flex items-baseline gap-3 py-2">
            <div className="min-w-0 flex-1">
              {showExercise ? (
                <ExerciseLink name={p.exercise} className="block truncate text-sm" />
              ) : (
                <div className="text-sm font-medium text-ink">{PR_LABELS[p.type]}</div>
              )}
              <div className="text-xs text-ink-2">{meta}</div>
            </div>
            <div className="tabular text-right text-sm">
              <div className="font-medium text-ink">
                {formatNumber(p.value)}
                {unit}
                {p.reps ? ` × ${p.reps}` : ''}
              </div>
              <div className="text-xs text-ink-3">was {formatNumber(p.previous)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
