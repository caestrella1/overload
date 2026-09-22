import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';

export function TextLink({
  to,
  children,
  subtle,
  className,
}: {
  to: string;
  children: ReactNode;
  /** Ink-colored link for lists; default is the accent color. */
  subtle?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cx(
        'focus-ring rounded-sm font-medium hover:underline',
        subtle ? 'text-ink' : 'text-accent',
        className,
      )}
    >
      {children}
    </Link>
  );
}
