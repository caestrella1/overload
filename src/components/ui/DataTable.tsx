import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface Column<T> {
  key: string;
  label: ReactNode;
  align?: 'right';
  render: (row: T) => ReactNode;
  className?: string;
}

/** Plain, accessible table. Rows scroll horizontally on small screens. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth,
  stickyHeader,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  minWidth?: number;
  stickyHeader?: boolean;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead className={cx(stickyHeader && 'sticky top-0 bg-surface')}>
          <tr className="border-b border-border text-left text-xs text-ink-2">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cx('px-2 py-2 font-medium', c.align === 'right' && 'text-right')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="border-b border-border/60 last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx(
                    'px-2 py-2 text-ink',
                    c.align === 'right' && 'text-right',
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && empty && <p className="py-8 text-center text-sm text-ink-3">{empty}</p>}
    </div>
  );
}
