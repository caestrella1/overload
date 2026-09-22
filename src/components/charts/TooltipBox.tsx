import { Swatch } from './Legend';

export function TooltipBox({
  heading,
  items,
}: {
  heading: string;
  items: { label: string; color: string; value: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink">{heading}</div>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 py-0.5">
          <Swatch color={it.color} />
          <span className="text-ink-2">{it.label}</span>
          <span className="tabular ml-auto pl-3 font-medium text-ink">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
