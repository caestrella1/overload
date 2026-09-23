import { parseLocal } from '../../domain/dates';
import type { ChartSeries, PeriodRow } from './types';

/** Shared axis/grid styling so every chart reads as one system. */
export const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 };
export const X_AXIS_PROPS = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: { stroke: 'var(--border)' },
} as const;
export const Y_AXIS_PROPS = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  width: 56,
} as const;
export const GRID_PROPS = { stroke: 'var(--grid)', vertical: false } as const;
export const CHART_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };

export type TimeRow = PeriodRow & { t: number };

/** Joins series on period into rows keyed by series id, with a timestamp for a time axis. */
export function mergeSeries(series: ChartSeries[]): TimeRow[] {
  const rows = new Map<string, TimeRow>();
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

export function monthTickLabel(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** Month-start ticks spanning [min, max], thinned to at most `maxTicks` so labels never repeat. */
export function monthTicks(min: number, max: number, maxTicks = 8): number[] {
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
