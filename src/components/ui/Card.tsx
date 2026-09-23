import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

interface HeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Leading glyph beside the title, from components/icons. */
  icon?: ReactNode;
}

export function Card({
  title,
  subtitle,
  actions,
  icon,
  children,
  className,
}: HeaderProps & { children: ReactNode; className?: string }) {
  return (
    <section
      className={cx('min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5', className)}
    >
      {(title ?? actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                {icon && <span className="text-ink-2">{icon}</span>}
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: HeaderProps & { breadcrumbs?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && <div className="mb-1">{breadcrumbs}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
