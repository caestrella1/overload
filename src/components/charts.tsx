import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatDate, formatPeriod, parseLocal, type Bucket } from '../domain/dates';
import type { SeriesPoint } from '../domain/metrics';
import { cx } from '../lib/cx';
import { Segmented } from './ui';

const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 };

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: SeriesPoint[];
}

type Row = { t: number; period: string } & Record<string, number | string | undefined>;

function mergeSeries(series: ChartSeries[]): Row[] {
  const rows = new Map<string, Row>();
  for (const s of series) {
    for (const p of s.points) {
      let row = rows.get(p.period);
      if (!row) {
        row = { t: parseLocal(p.period).getTime(), period: p.period };
        rows.set(p.period, row);
      }
      row[s.id] = p.value;
    }
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}

function tickDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** Month-start ticks spanning [min, max], thinned to at most `max` ticks so labels never repeat. */
function monthTicks(min: number, max: number, maxTicks = 8): number[] {
  const ticks: number[] = [];
  const d = new Date(min);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < min) d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= max) {
    ticks.push(d.getTime());
    d.setMonth(d.getMonth() + 1);
  }
  const step = Math.ceil(ticks.length / maxTicks);
  return ticks.filter((_, i) => i % step === 0);
}

function TooltipBox({
  heading,
  items,
}: {
  heading: string;
  items: { label: string; color: string; value: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink">{heading}</div>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          <span className="text-ink-2">{it.label}</span>
          <span className="tabular ml-auto pl-3 font-medium text-ink">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

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

export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; align?: 'right' }[];
  rows: Record<string, ReactNode>[];
}) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-surface">
        <tr className="border-b border-border text-left text-xs text-ink-2">
          {columns.map((c) => (
            <th
              key={c.key}
              className={cx('px-2 py-1.5 font-medium', c.align === 'right' && 'text-right')}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular">
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border/60 last:border-0">
            {columns.map((c) => (
              <td
                key={c.key}
                className={cx('px-2 py-1.5 text-ink', c.align === 'right' && 'text-right')}
              >
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrendChart({
  series,
  bucket,
  format,
  height = 300,
}: {
  series: ChartSeries[];
  bucket: Bucket;
  format: (v: number) => string;
  height?: number;
}) {
  const rows = useMemo(() => mergeSeries(series), [series]);
  const showDots = rows.length <= 40;
  const ticks = useMemo(() => {
    const first = rows[0]?.t;
    const last = rows[rows.length - 1]?.t;
    if (first == null || last == null) return undefined;
    const t = monthTicks(first, last);
    // Short ranges may contain no month start; let Recharts pick ticks then.
    return t.length >= 2 ? t : undefined;
  }, [rows]);
  const multi = series.length > 1;

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    const first = payload[0]?.payload as Row | undefined;
    if (!active || !first) return null;
    return (
      <TooltipBox
        heading={formatPeriod(first.period, bucket)}
        items={series
          .filter((s) => typeof first[s.id] === 'number')
          .map((s) => ({ label: s.label, color: s.color, value: format(first[s.id] as number) }))}
      />
    );
  };

  const chart = (
    <>
      {multi && <Legend items={series} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickDate}
              ticks={ticks}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={32}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => format(v)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={tooltip}
              cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
            />
            {series.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                dot={
                  showDots
                    ? { r: 4, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }
                    : false
                }
                activeDot={{ r: 5, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  const table = (
    <DataTable
      columns={[
        { key: 'period', label: bucket === 'session' ? 'Date' : 'Period' },
        ...series.map((s) => ({ key: s.id, label: s.label, align: 'right' as const })),
      ]}
      rows={[...rows].reverse().map((r) => ({
        period: formatPeriod(r.period, bucket),
        ...Object.fromEntries(
          series.map((s) => [s.id, typeof r[s.id] === 'number' ? format(r[s.id] as number) : '–']),
        ),
      }))}
    />
  );

  return <ChartFrame chart={chart} table={table} empty={!rows.length} />;
}

export function StackedBars({
  rows,
  keys,
  bucket,
  format,
  height = 300,
}: {
  rows: ({ period: string } & Record<string, number | string>)[];
  keys: { id: string; label: string; color: string }[];
  bucket: Bucket;
  format: (v: number) => string;
  height?: number;
}) {
  const data = useMemo(
    () =>
      rows.map((r): Record<string, number | string> & { label: string } => ({
        ...r,
        label: formatPeriod(r.period, bucket),
      })),
    [rows, bucket],
  );
  const last = keys.length - 1;

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    const row = payload[0]?.payload as (typeof data)[number] | undefined;
    if (!active || !row) return null;
    const items = keys
      .filter((k) => typeof row[k.id] === 'number' && (row[k.id] as number) > 0)
      .reverse()
      .map((k) => ({ label: k.label, color: k.color, value: format(row[k.id] as number) }));
    const total = keys.reduce((acc, k) => acc + (Number(row[k.id]) || 0), 0);
    return <TooltipBox heading={`${row.label} · ${format(total)}`} items={items} />;
  };

  const chart = (
    <>
      {keys.length > 1 && <Legend items={keys} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(p: string) => formatDate(p, { month: 'short', day: 'numeric' })}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={24}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => format(v)}
            />
            <Tooltip content={tooltip} cursor={{ fill: 'var(--surface-2)' }} />
            {keys.map((k, i) => (
              <Bar
                key={k.id}
                dataKey={k.id}
                name={k.label}
                stackId="stack"
                fill={k.color}
                stroke="var(--surface)"
                strokeWidth={keys.length > 1 ? 1 : 0}
                radius={i === last ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  const table = (
    <DataTable
      columns={[
        { key: 'label', label: 'Period' },
        ...keys.map((k) => ({ key: k.id, label: k.label, align: 'right' as const })),
      ]}
      rows={[...data].reverse().map((r) => ({
        label: r.label,
        ...Object.fromEntries(
          keys.map((k) => [k.id, typeof r[k.id] === 'number' ? format(r[k.id] as number) : '–']),
        ),
      }))}
    />
  );

  return <ChartFrame chart={chart} table={table} empty={!rows.length} />;
}

/** Horizontal magnitude bars in HTML: labels stay readable and every value is printed. */
export function BarList({
  items,
  format,
  selected,
  onSelect,
  wideLabels,
}: {
  items: { id: string; label: string; value: number }[];
  format: (v: number) => string;
  selected?: string;
  onSelect?: (id: string) => void;
  wideLabels?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const content = (
          <>
            <span
              title={it.label}
              className={cx(
                'shrink-0 truncate text-left text-sm text-ink',
                wideLabels ? 'w-36 sm:w-60' : 'w-28 sm:w-32',
              )}
            >
              {it.label}
            </span>
            <span className="relative h-5 flex-1">
              <span
                className="absolute inset-y-0 left-0 rounded-r"
                style={{
                  width: `${max ? (it.value / max) * 100 : 0}%`,
                  minWidth: it.value > 0 ? 2 : 0,
                  background: 'var(--series-1)',
                  opacity: selected && selected !== it.id ? 0.45 : 1,
                }}
              />
            </span>
            <span className="tabular w-16 shrink-0 text-right text-sm text-ink">
              {format(it.value)}
            </span>
          </>
        );
        return (
          <li key={it.id}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => {
                  onSelect(it.id);
                }}
                aria-pressed={selected === it.id}
                className={cx(
                  'flex w-full items-center gap-3 rounded-md px-2 py-1 hover:bg-surface-2',
                  selected === it.id && 'bg-surface-2',
                )}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-2 py-1">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
