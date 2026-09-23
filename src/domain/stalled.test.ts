import type { SessionStat } from './metrics';
import { stalledLifts } from './stalled';

const stat = (date: string, e1rm: number | null): SessionStat => ({
  workoutKey: `${date}|W`,
  date,
  exercise: 'X',
  sets: 3,
  reps: 15,
  volume: 1000,
  e1rm,
  topWeight: 100,
  topWeightReps: 5,
  maxReps: 5,
  avgRpe: null,
  distance: 0,
  duration: 0,
});

/** Weekly sessions starting 2024-01-01, with the given estimated 1RMs. */
function weekly(values: (number | null)[]): SessionStat[] {
  return values.map((v, i) => {
    const day = new Date(2024, 0, 1 + i * 7);
    return stat(`${day.toISOString().slice(0, 10)}T10:00:00`, v);
  });
}

describe('stalledLifts', () => {
  it('flags a lift whose best is long behind it', () => {
    const stats = weekly([100, 105, 110, 108, 107, 109, 106, 108, 107, 105]);
    const [stalled] = stalledLifts(new Map([['Bench', stats]]));
    expect(stalled).toMatchObject({ exercise: 'Bench', best: 110, sessionsSince: 7 });
    expect(stalled?.daysSince).toBe(49);
  });

  it('leaves alone a lift that recently hit a best', () => {
    const stats = weekly([100, 102, 104, 106, 108, 110]);
    expect(stalledLifts(new Map([['Bench', stats]]))).toEqual([]);
  });

  it('ignores lifts with too little history', () => {
    const stats = weekly([100, 90, 90]);
    expect(stalledLifts(new Map([['Bench', stats]]), { minDays: 1 })).toEqual([]);
  });

  it('skips lifts with no estimated 1RM at all', () => {
    const stats = weekly([null, null, null, null, null, null, null, null]);
    expect(stalledLifts(new Map([['Plank', stats]]))).toEqual([]);
  });

  it('puts the longest stall first', () => {
    // Both peak in their first session; the longer log has been stuck for longer.
    const long = weekly([120, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110]);
    const short = weekly([105, 100, 100, 100, 100, 100, 100, 100]);
    const result = stalledLifts(
      new Map([
        ['Short', short],
        ['Long', long],
      ]),
    );
    expect(result.map((r) => r.exercise)).toEqual(['Long', 'Short']);
  });
});
