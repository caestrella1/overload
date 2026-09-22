import type { MuscleTrend } from '../../domain/trends';
import type { MuscleGroup } from '../../domain/types';
import { formatCompact } from '../../domain/units';
import { cx } from '../../lib/cx';
import { Card, Muted } from '../ui';

const PERIOD_NOUN = { week: 'week', month: 'month', session: 'session' } as const;

/**
 * The muscles whose share of training grew most. Deliberately framed as "more work than
 * before" rather than progress: rising volume is an input, not a measure of strength.
 */
export function RisingMuscles({
  trends,
  window,
  bucket,
  metricLabel,
  selected,
  onSelect,
}: {
  trends: MuscleTrend[];
  window: number;
  bucket: keyof typeof PERIOD_NOUN;
  metricLabel: string;
  selected: MuscleGroup[];
  onSelect: (muscle: MuscleGroup) => void;
}) {
  const noun = PERIOD_NOUN[bucket];
  const top = trends.slice(0, 3);

  return (
    <Card
      className="mb-6"
      title="Getting more work than before"
      subtitle={
        window
          ? `${metricLabel} over the last ${window} ${noun}${window === 1 ? '' : 's'}, against the ${window} before. More volume isn't automatically better — it's what changed, not proof of progress.`
          : undefined
      }
    >
      {!window ? (
        <Muted>Not enough history in this range to compare two periods.</Muted>
      ) : !top.length ? (
        <Muted>No muscle is getting more work than it was in the previous window.</Muted>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {top.map((t) => {
            const isSelected = selected.includes(t.muscle as MuscleGroup);
            return (
              <li key={t.muscle}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(t.muscle as MuscleGroup);
                  }}
                  aria-pressed={isSelected}
                  className={cx(
                    'focus-ring w-full rounded-xl border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-surface-2 hover:border-accent/50',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{t.muscle}</span>
                    <span className="tabular shrink-0 text-sm font-semibold text-accent">
                      {t.percent == null ? 'new' : `+${Math.round(t.percent * 100)}%`}
                    </span>
                  </div>
                  <div className="tabular mt-1 text-xs text-ink-2">
                    {formatCompact(t.previous, 1)} → {formatCompact(t.recent, 1)} per {noun}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
