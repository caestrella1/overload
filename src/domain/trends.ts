import type { MuscleRow } from './metrics';

export interface MuscleTrend {
  muscle: string;
  /** Mean per period over the most recent window. */
  recent: number;
  /** Mean per period over the window immediately before it. */
  previous: number;
  /** Fractional change, or null when the muscle was untrained in the earlier window. */
  percent: number | null;
}

export interface TrendReport {
  /** Periods on each side of the comparison; smaller when there is little history. */
  window: number;
  /** Muscles that went up, biggest relative gain first. */
  trends: MuscleTrend[];
}

export const TREND_WINDOW = 4;

function mean(rows: MuscleRow[], key: string): number {
  if (!rows.length) return 0;
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) / rows.length;
}

/**
 * Compares the mean of the last `window` periods against the `window` before it, per muscle.
 * Periods where a muscle went untrained count as zero, so skipped weeks pull it down rather
 * than being silently dropped.
 *
 * This measures how training volume moved, not how much stronger you got: it says a muscle is
 * getting more work than it used to, nothing more.
 */
export function muscleTrends(
  rows: MuscleRow[],
  groups: string[],
  window = TREND_WINDOW,
): TrendReport {
  const size = Math.min(window, Math.floor(rows.length / 2));
  if (size < 1) return { window: 0, trends: [] };

  const recentRows = rows.slice(-size);
  const previousRows = rows.slice(-2 * size, -size);

  const trends = groups
    .map((muscle): MuscleTrend => {
      const recent = mean(recentRows, muscle);
      const previous = mean(previousRows, muscle);
      return { muscle, recent, previous, percent: previous > 0 ? recent / previous - 1 : null };
    })
    .filter((t) => t.recent > t.previous)
    .sort((a, b) => {
      // A muscle with no earlier training has no ratio to rank by, so it sorts last.
      if ((a.percent == null) !== (b.percent == null)) return a.percent == null ? 1 : -1;
      if (a.percent != null && b.percent != null) return b.percent - a.percent;
      return b.recent - a.recent;
    });

  return { window: size, trends };
}
