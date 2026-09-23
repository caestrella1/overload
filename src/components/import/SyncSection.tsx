import type { SyncPreview } from '../../db/repo';
import { formatDate } from '../../domain/dates';
import { groupRemovals, isLargeRemoval } from '../../domain/removals';
import { formatNumber } from '../../domain/units';
import { Callout, Checkbox, Muted } from '../ui';

/**
 * Opt-in mirroring: deletes stored sets this export covers but no longer contains.
 * Off by default, and always shows exactly what would go.
 */
export function SyncSection({
  sync,
  enabled,
  onChange,
}: {
  sync: SyncPreview;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const count = sync.toRemove.length;
  const groups = groupRemovals(sync.toRemove);
  const large = isLargeRemoval(count, sync.inScope);

  return (
    <section className="mb-5 rounded-xl border border-border p-3">
      <h3 className="text-sm font-semibold text-ink">Sets deleted in the source app</h3>
      {count === 0 ? (
        <Muted className="mt-1">
          {sync.from
            ? `Everything stored from ${formatDate(sync.from)} onward is still in this export.`
            : 'This file has no sets to compare against.'}
        </Muted>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-2">
            {formatNumber(count, 0)} stored set(s) from {formatDate(sync.from ?? '')} onward are no
            longer in this export, out of {formatNumber(sync.inScope, 0)} it covers. Sets logged
            before that date, or imported from another app, are never touched.
          </p>
          <div className="mt-3">
            <Checkbox checked={enabled} onChange={onChange}>
              Remove {formatNumber(count, 0)} set(s) that are no longer in this export
            </Checkbox>
          </div>
          {large && (
            <Callout className="mt-3" tone="warning" title="That's a large share of this export">
              A partial export looks the same as deleted workouts. Check the list below before
              removing anything.
            </Callout>
          )}
          <details className="mt-3" open={groups.length <= 5}>
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Review {groups.length} affected workout(s)
            </summary>
            <ul className="mt-2 max-h-56 divide-y divide-border overflow-auto text-sm">
              {groups.map((g) => (
                <li key={g.workoutKey} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0">
                    <span className="text-ink">{formatDate(g.date)}</span>{' '}
                    <span className="text-ink-2">{g.name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {g.exercises.join(', ')}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-xs text-ink-2">
                    {formatNumber(g.sets, 0)} set(s)
                  </span>
                </li>
              ))}
            </ul>
          </details>
          <Muted className="mt-2">Undoing this import puts removed sets back.</Muted>
        </>
      )}
    </section>
  );
}
