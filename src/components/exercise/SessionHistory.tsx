import { useMemo, useState } from 'react';
import { describeSet } from '../../domain/analysis';
import { formatDate } from '../../domain/dates';
import type { Unit, WorkoutSet } from '../../domain/types';
import { cx } from '../../lib/cx';
import { Button } from '../ui';

const PAGE = 10;

/** Sessions newest first, each set as a chip; warm-ups dashed, other set types labeled. */
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
              <div className="tabular flex flex-wrap gap-1.5">
                {list.map((s) => (
                  <SetChip key={s.key} set={s} unit={unit} />
                ))}
              </div>
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

export function SetChip({ set, unit }: { set: WorkoutSet; unit: Unit }) {
  return (
    <span
      title={set.notes ?? undefined}
      className={cx(
        'rounded px-1.5 py-0.5 text-xs',
        set.setType === 'warmup'
          ? 'border border-dashed border-border text-ink-3'
          : 'bg-surface-2 text-ink',
      )}
    >
      {set.setType !== 'normal' && (
        <span className="mr-1 font-semibold">{set.setType[0]?.toUpperCase()}</span>
      )}
      {describeSet(set, unit)}
      {set.rpe != null && <span className="ml-1 text-ink-3">@{set.rpe}</span>}
    </span>
  );
}
