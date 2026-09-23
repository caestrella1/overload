import type { ReactNode } from 'react';

export interface DescriptionItem {
  term: string;
  value: ReactNode;
}

/** Term/value pairs, stacked on narrow screens and two columns from `sm` up. */
export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {items.map((it) => (
        <div key={it.term} className="contents">
          <dt className="text-ink-2">{it.term}</dt>
          <dd className="min-w-0 text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
