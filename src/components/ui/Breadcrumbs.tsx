import { Fragment } from 'react';
import { CrumbIcon } from '../icons';
import { TextLink } from './TextLink';

export interface Crumb {
  label: string;
  /** Omitted on the last crumb, which is the page you are on. */
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
        {items.map((c, i) => (
          <Fragment key={c.label}>
            {i > 0 && (
              <li aria-hidden="true" className="text-ink-3">
                <CrumbIcon width="0.9em" height="0.9em" />
              </li>
            )}
            <li className="min-w-0">
              {c.to ? (
                <TextLink to={c.to} subtle>
                  {c.label}
                </TextLink>
              ) : (
                <span aria-current="page" className="truncate">
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
