import type { InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import type { Option } from './Segmented';

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  /** Accessible name; visually hidden. */
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        onChange(e.target.value as T);
      }}
      className={cx('field focus-ring max-w-full py-1.5 pr-8 pl-2.5', className)}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <input aria-label={label} {...props} className={cx('field focus-ring min-w-0', className)} />
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer items-start gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="focus-ring mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span>{children}</span>
    </label>
  );
}

/** Label + hint on the left, control on the right; wraps on narrow screens. */
export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0 flex-1 basis-48">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-2">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
