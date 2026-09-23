import { useState, type ReactNode } from 'react';
import { DataTable, Segmented } from '../ui';
import type { PeriodRow, SeriesKey, ValueFormat } from './types';

/** Wraps a chart with a Chart/Table toggle so values are available without color or hover. */
export function ChartFrame({
  chart,
  table,
  empty,
}: {
  chart: ReactNode;
  table: ReactNode;
  empty?: boolean;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  if (empty) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-3">
        No data for this selection.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { id: 'chart', label: 'Chart' },
            { id: 'table', label: 'Table' },
          ]}
        />
      </div>
      {view === 'chart' ? chart : <div className="max-h-80 overflow-auto">{table}</div>}
    </div>
  );
}

/** Newest-first table of per-period values, one column per series. */
export function SeriesTable({
  rows,
  keys,
  periodLabel,
  formatPeriod,
  format,
}: {
  rows: PeriodRow[];
  keys: SeriesKey[];
  periodLabel: string;
  formatPeriod: (period: string) => string;
  format: ValueFormat;
}) {
  return (
    <DataTable
      stickyHeader
      rows={[...rows].reverse()}
      rowKey={(r) => r.period}
      columns={[
        { key: 'period', label: periodLabel, render: (r) => formatPeriod(r.period) },
        ...keys.map((k) => ({
          key: k.id,
          label: k.label,
          align: 'right' as const,
          render: (r: PeriodRow) => {
            const v = r[k.id];
            return typeof v === 'number' ? format(v) : '–';
          },
        })),
      ]}
    />
  );
}
