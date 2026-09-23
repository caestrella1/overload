import { useMemo, useState } from 'react';
import { describeSet } from '../../domain/analysis';
import { formatDate } from '../../domain/dates';
import type { SetType, Unit, WorkoutSet } from '../../domain/types';
import { cx } from '../../lib/cx';
import { Badge, Button } from '../ui';

const PAGE = 10;

/** Warm-ups say so through the W in the number column, so they need no second label. */
const TYPE_LABELS: Record<SetType, string | null> = {
  normal: null,
  warmup: null,
  drop: 'Drop',
  failure: 'To failure',
};

/**
 * Numbers the working sets 1, 2, 3 in the order they were logged. Warm-ups keep a W
 * instead of a number, so the numbering reads the way a working set is counted.
 */
function labelSets(list: WorkoutSet[]): { set: WorkoutSet; label: string }[] {
  let working = 0;
  return list.map((set) => {
    if (set.setType === 'warmup') return { set, label: 'W' };
    working += 1;
    return { set, label: String(working) };
  });
}

/** Sessions newest first, one row per set; warm-ups marked W, other set types labeled. */
export function SessionHistory({ sets, unit }: { sets: WorkoutSet[]; unit: Unit }) {
  const [limit, setLimit] = useState(PAGE);
  const sessions = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const list = map.get(s.workoutKey);
      if (list) list.push(s);
      else map.set(s.workoutKey, [s]);
    }
    return [...map.values()]
      .reverse()
      .map((list) => [...list].sort((a, b) => a.setIndex - b.setIndex));
  }, [sets]);

  return (
    <>
      <ul className="divide-y divide-border">
        {sessions.slice(0, limit).map((list) => {
          const first = list[0];
          if (!first) return null;
          return (
            <li key={first.workoutKey} className="py-3">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{formatDate(first.date)}</span>
                <span className="truncate text-xs text-ink-2">
                  {first.workoutKey.split('|').slice(1).join('|')}
                </span>
              </div>
              <ol className="tabular divide-y divide-border/60">
                {labelSets(list).map(({ set, label }) => (
                  <SetRow key={set.key} set={set} label={label} unit={unit} />
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
      {limit < sessions.length && (
        <div className="mt-4 text-center">
          <Button
            onClick={() => {
              setLimit((l) => l + PAGE * 2);
            }}
          >
            Show more
          </Button>
        </div>
      )}
    </>
  );
}

export function SetRow({ set, label, unit }: { set: WorkoutSet; label: string; unit: Unit }) {
  const warmup = set.setType === 'warmup';
  const typeLabel = TYPE_LABELS[set.setType];
  return (
    <li className="flex items-baseline gap-3 py-1 text-sm">
      {/* Working sets carry the theme colour; warm-ups stay muted, so the ones that count stand out. */}
      <span
        className={cx(
          'w-6 shrink-0 text-center text-xs font-semibold',
          warmup ? 'text-ink-3' : 'text-accent',
        )}
      >
        {label}
      </span>
      <span className={cx('min-w-0 shrink-0', warmup ? 'text-ink-3' : 'font-medium text-accent')}>
        {describeSet(set, unit)}
      </span>
      {typeLabel && <span className="shrink-0 text-xs text-ink-2">{typeLabel}</span>}
      {set.rpe != null && <Badge tone="neutral">RPE {set.rpe}</Badge>}
      {set.notes && (
        <span className="ml-auto min-w-0 truncate text-xs text-ink-3" title={set.notes}>
          {set.notes}
        </span>
      )}
    </li>
  );
}
