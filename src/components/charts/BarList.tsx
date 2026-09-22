import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import type { ValueFormat } from './types';

export interface BarListItem {
  id: string;
  label: string;
  value: number;
}

/** Horizontal magnitude bars in HTML: labels stay readable and every value is printed. */
export function BarList({
  items,
  format,
  selected,
  onSelect,
  wideLabels,
}: {
  items: BarListItem[];
  format: ValueFormat;
  selected?: string;
  onSelect?: (id: string) => void;
  wideLabels?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const content: ReactNode = (
          <>
            <span
              title={it.label}
              className={cx(
                'shrink-0 truncate text-left text-sm text-ink',
                wideLabels ? 'w-36 sm:w-60' : 'w-28 sm:w-32',
              )}
            >
              {it.label}
            </span>
            <span className="relative h-5 flex-1">
              <span
                className="absolute inset-y-0 left-0 rounded-r"
                style={{
                  width: `${max ? (it.value / max) * 100 : 0}%`,
                  minWidth: it.value > 0 ? 2 : 0,
                  background: 'var(--series-1)',
                  opacity: selected && selected !== it.id ? 0.45 : 1,
                }}
              />
            </span>
            <span className="tabular w-16 shrink-0 text-right text-sm text-ink">
              {format(it.value)}
            </span>
          </>
        );
        return (
          <li key={it.id}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => {
                  onSelect(it.id);
                }}
                aria-pressed={selected === it.id}
                className={cx(
                  'focus-ring flex w-full items-center gap-3 rounded-md px-2 py-1 hover:bg-surface-2',
                  selected === it.id && 'bg-surface-2',
                )}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-2 py-1">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
