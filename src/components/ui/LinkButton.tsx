import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClasses, type ButtonVariant } from './buttonClasses';

/** A router link that reads as a button, for actions that are really navigation. */
export function LinkButton({
  to,
  children,
  variant,
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link to={to} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}
