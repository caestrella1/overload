import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export function StatTile({
  label,
  value,
  detail,
  compact,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** Smaller, borderless variant for use inside cards. */
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'min-w-0 rounded-2xl',
        compact ? 'bg-surface-2 p-3' : 'border border-border bg-surface p-4',
      )}
    >
      <div
        className={cx(
          'text-ink-2',
          compact ? 'text-xs' : 'text-xs font-medium tracking-wide uppercase',
        )}
      >
        {label}
      </div>
      <div className={cx('tabular font-semibold text-ink', compact ? 'text-xl' : 'mt-1 text-2xl')}>
        {value}
      </div>
      {detail && <div className="tabular mt-1 text-xs text-ink-2">{detail}</div>}
    </div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>;
}
