import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatDate, formatPeriod, type Bucket } from '../../domain/dates';
import { CHART_MARGIN, GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from './axis';
import { ChartFrame, SeriesTable } from './ChartFrame';
import { Legend } from './Legend';
import { TooltipBox } from './TooltipBox';
import type { PeriodRow, SeriesKey, ValueFormat } from './types';

/** Bars per period, stacked by key. With a single key it's a plain bar chart. */
export function StackedBars({
  rows,
  keys,
  bucket,
  format,
  height = 300,
}: {
  rows: PeriodRow[];
  keys: SeriesKey[];
  bucket: Bucket;
  format: ValueFormat;
  height?: number;
}) {
  const last = keys.length - 1;
  const stacked = keys.length > 1;

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    const row = payload[0]?.payload as PeriodRow | undefined;
    if (!active || !row) return null;
    const value = (k: SeriesKey) => Number(row[k.id]) || 0;
    const total = keys.reduce((acc, k) => acc + value(k), 0);
    return (
      <TooltipBox
        heading={`${formatPeriod(row.period, bucket)}${stacked ? ` · ${format(total)}` : ''}`}
        items={keys
          .filter((k) => value(k) > 0)
          .reverse() // match the visual stack order, top first
          .map((k) => ({ label: k.label, color: k.color, value: format(value(k)) }))}
      />
    );
  };

  const chart = (
    <>
      {stacked && <Legend items={keys} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={CHART_MARGIN}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              {...X_AXIS_PROPS}
              dataKey="period"
              tickFormatter={(p: string) => formatDate(p, { month: 'short', day: 'numeric' })}
              minTickGap={24}
            />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={format} />
            <Tooltip content={tooltip} cursor={{ fill: 'var(--surface-2)' }} />
            {keys.map((k, i) => (
              <Bar
                key={k.id}
                dataKey={k.id}
                name={k.label}
                stackId="stack"
                fill={k.color}
                // Surface-colored stroke separates adjacent segments.
                stroke="var(--surface)"
                strokeWidth={stacked ? 1 : 0}
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

  return (
    <ChartFrame
      empty={!rows.length}
      chart={chart}
      table={
        <SeriesTable
          rows={rows}
          keys={keys}
          periodLabel="Period"
          formatPeriod={(p) => formatPeriod(p, bucket)}
          format={format}
        />
      }
    />
  );
}
