import type { SeriesKey } from './types';

export function Swatch({ color }: { color: string }) {
  return (
    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden />
  );
}

export function Legend({ items }: { items: Omit<SeriesKey, 'id'>[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <Swatch color={it.color} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
