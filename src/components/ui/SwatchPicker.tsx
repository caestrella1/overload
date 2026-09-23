import { cx } from '../../lib/cx';

export interface Swatch<T extends string> {
  id: T;
  label: string;
  /** Any CSS color; usually a token like `var(--accent-green)`. */
  color: string;
}

/**
 * A radio group whose choices are colors. The label is still spoken and shown on hover,
 * so the choice is never color-alone, and the selected ring is drawn in the ink color
 * rather than the swatch so it stays visible against its own fill.
 */
export function SwatchPicker<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Swatch<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          aria-label={o.label}
          title={o.label}
          onClick={() => {
            onChange(o.id);
          }}
          className={cx(
            'focus-ring size-7 rounded-full border transition-transform',
            value === o.id
              ? 'border-ink scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface'
              : 'border-border hover:scale-110',
          )}
          style={{ background: o.color }}
        />
      ))}
    </div>
  );
}
