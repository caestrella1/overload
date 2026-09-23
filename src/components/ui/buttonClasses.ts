import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  secondary: 'border border-border bg-surface text-ink hover:bg-surface-2',
  danger: 'bg-critical text-white hover:opacity-90',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
};

/** Class list for button-looking elements that aren't <button> (e.g. file-picker labels). */
export function buttonClasses(variant: ButtonVariant = 'secondary', className?: string): string {
  return cx(
    'focus-ring inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    className,
  );
}
