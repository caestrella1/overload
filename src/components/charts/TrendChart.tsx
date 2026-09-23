import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatPeriod, type Bucket } from '../../domain/dates';
import {
  CHART_MARGIN,
  GRID_PROPS,
  mergeSeries,
  monthTickLabel,
  monthTicks,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  type TimeRow,
} from './axis';
import { ChartFrame, SeriesTable } from './ChartFrame';
import { Legend } from './Legend';
import { TooltipBox } from './TooltipBox';
import type { ChartSeries, ValueFormat } from './types';

/** Above this many points, markers are hidden and only the hover dot shows. */
const MAX_DOTS = 40;

/** Line chart over a time axis; one line per series, with legend when there are several. */
export function TrendChart({
  series,
  bucket,
  format,
  height = 300,
}: {
  series: ChartSeries[];
  bucket: Bucket;
  format: ValueFormat;
  height?: number;
}) {
  const rows = useMemo(() => mergeSeries(series), [series]);
  const ticks = useMemo(() => {
    const first = rows[0]?.t;
    const last = rows[rows.length - 1]?.t;
    if (first == null || last == null) return undefined;
    const t = monthTicks(first, last);
    // Short ranges may contain no month start; let Recharts pick ticks then.
    return t.length >= 2 ? t : undefined;
  }, [rows]);
  const showDots = rows.length <= MAX_DOTS;

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    const row = payload[0]?.payload as TimeRow | undefined;
    if (!active || !row) return null;
    return (
      <TooltipBox
        heading={formatPeriod(row.period, bucket)}
        items={series.flatMap((s) => {
          const v = row[s.id];
          return typeof v === 'number'
            ? [{ label: s.label, color: s.color, value: format(v) }]
            : [];
        })}
      />
    );
  };

  const chart = (
    <>
      {series.length > 1 && <Legend items={series} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={CHART_MARGIN}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              {...X_AXIS_PROPS}
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={monthTickLabel}
              ticks={ticks}
              minTickGap={32}
            />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={format} domain={['auto', 'auto']} />
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

  return (
    <ChartFrame
      empty={!rows.length}
      chart={chart}
      table={
        <SeriesTable
          rows={rows}
          keys={series}
          periodLabel={bucket === 'session' ? 'Date' : 'Period'}
          formatPeriod={(p) => formatPeriod(p, bucket)}
          format={format}
        />
      }
    />
  );
}
