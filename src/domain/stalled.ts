import type { SessionStat } from './metrics';

export interface StalledLift {
  exercise: string;
  /** Best estimated 1RM ever recorded for this lift. */
  best: number;
  /** When that best was set. */
  bestDate: string;
  /** Most recent session date. */
  lastDate: string;
  /** Whole days between the best and the last session. */
  daysSince: number;
  sessionsSince: number;
}

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / DAY));
}

/**
 * Lifts still being trained that have not beaten their own best estimated 1RM for a while.
 *
 * Measured against the lift's own history, so it says "this has not moved lately", not
 * "you are doing it wrong" — a plateau during a cut or a deload is expected.
 */
export function stalledLifts(
  byExercise: Map<string, SessionStat[]>,
  opts: { minSessions?: number; minDays?: number } = {},
): StalledLift[] {
  const minSessions = opts.minSessions ?? 4;
  const minDays = opts.minDays ?? 42;
  const out: StalledLift[] = [];

  for (const [exercise, stats] of byExercise) {
    const withE1rm = stats.filter((s) => s.e1rm != null);
    if (withE1rm.length < minSessions) continue;

    let best = withE1rm[0];
    if (!best) continue;
    for (const s of withE1rm) {
      if ((s.e1rm ?? 0) > (best.e1rm ?? 0)) best = s;
    }
    const last = stats[stats.length - 1];
    if (!last || !best.e1rm) continue;

    const daysSince = daysBetween(best.date, last.date);
    if (daysSince < minDays) continue;

    out.push({
      exercise,
      best: best.e1rm,
      bestDate: best.date,
      lastDate: last.date,
      daysSince,
      sessionsSince: stats.filter((s) => s.date > best.date).length,
    });
  }

  return out.sort((a, b) => b.daysSince - a.daysSince);
}
