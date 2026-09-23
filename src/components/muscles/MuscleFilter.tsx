import type { MuscleGroup } from '../../domain/types';
import { cx } from '../../lib/cx';
import { activeSlots, isFull, MAX_SERIES, type Slots } from '../../lib/slots';
import { Swatch } from '../charts';

/**
 * Chips for choosing which muscles the chart draws. Nothing selected means "all muscles",
 * stacked by region. Each chip carries the color its series uses, so the chart and the
 * filter always agree.
 */
export function MuscleFilter({
  muscles,
  slots,
  colorAt,
  onToggle,
  onClear,
}: {
  muscles: MuscleGroup[];
  slots: Slots<MuscleGroup>;
  colorAt: (index: number) => string;
  onToggle: (muscle: MuscleGroup) => void;
  onClear: () => void;
}) {
  const active = activeSlots(slots);
  const full = isFull(slots);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-ink-2">Show</span>
        <button
          type="button"
          onClick={onClear}
          aria-pressed={active.length === 0}
          className={cx(
            'focus-ring rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            active.length === 0
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-border text-ink-2 hover:bg-surface-2',
          )}
        >
          All muscles
        </button>
        {muscles.map((m) => {
          const index = slots.indexOf(m);
          const selected = index >= 0;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                onToggle(m);
              }}
              aria-pressed={selected}
              disabled={!selected && full}
              title={!selected && full ? `Up to ${MAX_SERIES} muscles at once` : undefined}
              className={cx(
                'focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                selected
                  ? 'border-accent bg-accent/10 text-ink'
                  : 'border-border text-ink-2 hover:bg-surface-2',
              )}
            >
              {selected && <Swatch color={colorAt(index)} />}
              {m}
            </button>
          );
        })}
      </div>
      {full && (
        <p className="mt-2 text-xs text-ink-3">
          Showing the most this chart can tell apart. Remove one to add another.
        </p>
      )}
    </div>
  );
}
