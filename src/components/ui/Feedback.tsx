import type { ComponentType, ReactNode } from 'react';
import { CriticalIcon, GoodIcon, InfoIcon, WarningIcon } from '../icons';
import { cx } from '../../lib/cx';

export type Tone = 'neutral' | 'accent' | 'good' | 'warning' | 'critical';
export type StatusTone = 'info' | 'good' | 'warning' | 'critical';

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  accent: 'bg-accent/15 text-accent',
  good: 'bg-good/15 text-good',
  warning: 'bg-warning/15 text-warning',
  critical: 'bg-critical/15 text-critical',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const STATUS_ICONS: Record<StatusTone, ComponentType<{ className?: string }>> = {
  info: InfoIcon,
  warning: WarningIcon,
  good: GoodIcon,
  critical: CriticalIcon,
};

export function StatusIcon({ tone, className }: { tone: StatusTone; className?: string }) {
  const Glyph = STATUS_ICONS[tone];
  return <Glyph className={cx('h-4 w-4 shrink-0', className)} />;
}

const CALLOUT_TONES: Record<StatusTone, { box: string; icon: string }> = {
  info: { box: 'border-accent/30 bg-accent/5', icon: 'text-accent' },
  warning: { box: 'border-warning/40 bg-warning/10', icon: 'text-warning' },
  good: { box: 'border-good/40 bg-good/10', icon: 'text-good' },
  critical: { box: 'border-critical/40 bg-critical/10', icon: 'text-critical' },
};

/** Status message with an icon and label, so meaning never relies on color alone. */
export function Callout({
  tone,
  title,
  children,
  className,
}: {
  tone: StatusTone;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = CALLOUT_TONES[tone];
  return (
    <div
      role={tone === 'critical' || tone === 'warning' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-xl border p-3 text-sm', t.box, className)}
    >
      <StatusIcon tone={tone} className={cx('mt-0.5', t.icon)} />
      <div className="min-w-0">
        <div className="font-medium text-ink">{title}</div>
        {children && <div className="mt-1 text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
    </div>
  );
}

/** Muted one-line message for empty card bodies. */
export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-sm text-ink-3', className)}>{children}</p>;
}
