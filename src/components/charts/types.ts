import type { SeriesPoint } from '../../domain/metrics';

/** A named, colored series. Color is assigned by the caller so it follows the entity. */
export interface SeriesKey {
  id: string;
  label: string;
  color: string;
}

export interface ChartSeries extends SeriesKey {
  points: SeriesPoint[];
}

/** One x position with a value per series id. */
export type PeriodRow = { period: string } & Record<string, number | string | undefined>;

export type ValueFormat = (v: number) => string;
