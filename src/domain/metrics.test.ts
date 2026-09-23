import { describeSet } from './analysis';
import type { Exercise, WorkoutSet } from './types';
import {
  bucketSeries,
  detectPrs,
  estimate1rm,
  muscleContributors,
  muscleCredit,
  muscleSeries,
  sessionStats,
  setVolume,
  totalsByKey,
} from './metrics';

let id = 0;
function s(partial: Partial<WorkoutSet>): WorkoutSet {
  id++;
  return {
    id,
    key: `k${id}`,
    contentHash: 'h',
    workoutKey: `${partial.date ?? '2024-01-01T10:00:00'}|W`,
    date: '2024-01-01T10:00:00',
    exercise: 'Bench Press (Barbell)',
    setLabel: '1',
    setIndex: 1,
    setType: 'normal',
    weight: 100,
    reps: 5,
    distance: null,
    seconds: null,
    rpe: null,
    notes: null,
    importId: 1,
    ...partial,
  };
}

const opts = { includeWarmups: false, formula: 'epley' as const };

describe('estimate1rm', () => {
  it('epley and brzycki', () => {
    expect(estimate1rm(100, 1, 'epley')).toBe(100);
    expect(estimate1rm(100, 10, 'epley')).toBeCloseTo(133.33, 1);
    expect(estimate1rm(100, 10, 'brzycki')).toBeCloseTo(133.33, 1);
    expect(estimate1rm(100, 5, 'brzycki')).toBeCloseTo(112.5, 1);
  });
  it('ignores implausible inputs', () => {
    expect(estimate1rm(0, 5, 'epley')).toBeNull();
    expect(estimate1rm(100, 0, 'epley')).toBeNull();
    expect(estimate1rm(100, 30, 'epley')).toBeNull();
  });
});

describe('sessionStats', () => {
  it('aggregates working sets and excludes warmups', () => {
    const [stat] = sessionStats(
      [
        s({ setType: 'warmup', weight: 45, reps: 10 }),
        s({ weight: 100, reps: 5, rpe: 8 }),
        s({ weight: 110, reps: 3, rpe: 9 }),
        s({ weight: 110, reps: 4 }),
        s({ weight: 120, reps: 0 }), // failed attempt, not a working set
      ],
      opts,
    );
    expect(stat).toMatchObject({ sets: 3, reps: 12, volume: 500 + 330 + 440, topWeight: 110 });
    expect(stat?.topWeightReps).toBe(4);
    expect(stat?.maxReps).toBe(5);
    expect(stat?.avgRpe).toBe(8.5);
    expect(stat?.e1rm).toBeCloseTo(110 * (1 + 4 / 30));
  });

  it('includes warmups when asked', () => {
    const [stat] = sessionStats([s({ setType: 'warmup' }), s({})], {
      ...opts,
      includeWarmups: true,
    });
    expect(stat?.sets).toBe(2);
  });

  it('treats assisted lifts as lower-is-better with no volume or e1RM', () => {
    const [stat] = sessionStats([s({ weight: 70, reps: 11 }), s({ weight: 50, reps: 8 })], {
      ...opts,
      assisted: true,
    });
    expect(stat).toMatchObject({ topWeight: 50, topWeightReps: 8, volume: 0, e1rm: null });
  });

  it('applies a unit scale', () => {
    const [stat] = sessionStats([s({ weight: 100, reps: 1 })], { ...opts, scale: 0.5 });
    expect(stat?.topWeight).toBe(50);
  });
});

describe('bucketSeries', () => {
  const stats = sessionStats(
    [
      s({ date: '2024-01-01T10:00:00', weight: 100, reps: 5 }),
      s({ date: '2024-01-03T10:00:00', weight: 105, reps: 5 }),
      s({ date: '2024-01-10T10:00:00', weight: 110, reps: 5 }),
    ],
    opts,
  );
  it('takes max for strength metrics and sums volume per week', () => {
    expect(bucketSeries(stats, 'topWeight', 'week')).toEqual([
      { period: '2024-01-01', value: 105 },
      { period: '2024-01-08', value: 110 },
    ]);
    expect(bucketSeries(stats, 'volume', 'week')[0]?.value).toBe(1025);
  });
  it('keeps one point per session', () => {
    expect(bucketSeries(stats, 'topWeight', 'session')).toHaveLength(3);
  });
});

describe('detectPrs', () => {
  it('emits events after the baseline session', () => {
    const stats = sessionStats(
      [
        s({ date: '2024-01-01T10:00:00', weight: 100, reps: 5 }),
        s({ date: '2024-01-08T10:00:00', weight: 100, reps: 5 }),
        s({ date: '2024-01-15T10:00:00', weight: 105, reps: 6 }),
      ],
      opts,
    );
    const prs = detectPrs(stats);
    expect(prs.map((p) => p.type).sort()).toEqual(['e1rm', 'reps', 'volume', 'weight']);
    expect(prs.every((p) => p.date === '2024-01-15T10:00:00')).toBe(true);
  });
  it('lower assistance is a PR for assisted lifts', () => {
    const stats = sessionStats(
      [
        s({ date: '2024-01-01T10:00:00', weight: 70, reps: 8 }),
        s({ date: '2024-01-08T10:00:00', weight: 60, reps: 8 }),
      ],
      { ...opts, assisted: true },
    );
    expect(detectPrs(stats, { assisted: true })).toMatchObject([
      { type: 'weight', value: 60, previous: 70 },
    ]);
  });
});

describe('muscleSeries', () => {
  const ex = (name: string, patch: Partial<Exercise>): Exercise => ({
    name,
    baseName: name,
    equipment: null,
    muscles: { primary: [], secondary: [] },
    muscleSource: 'user',
    unit: null,
    assisted: false,
    bodyweight: false,
    bodyweightFactor: 1,
    ...patch,
  });
  const exercises = new Map([
    [
      'Bench',
      ex('Bench', { muscles: { primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] } }),
    ],
    ['Curl', ex('Curl', { unit: 'kg', muscles: { primary: ['Biceps'], secondary: ['Forearms'] } })],
  ]);
  const sets = [
    s({ exercise: 'Bench', weight: 100, reps: 10 }),
    s({ exercise: 'Bench', weight: 100, reps: 10 }),
    s({ exercise: 'Curl', weight: 10, reps: 10 }),
  ];
  const base = {
    ...opts,
    bucket: 'week' as const,
    secondaryWeight: 0.5,
    defaultUnit: 'lb' as const,
  };

  it('counts sets with secondary credit', () => {
    const { rows } = muscleSeries(sets, exercises, { ...base, metric: 'sets', level: 'muscle' });
    expect(rows[0]).toMatchObject({ Chest: 2, Triceps: 1, Shoulders: 1, Biceps: 1, Forearms: 0.5 });
  });

  it('rolls up to regions without double counting', () => {
    const { rows } = muscleSeries(sets, exercises, { ...base, metric: 'sets', level: 'region' });
    // Curl hits Biceps (1) and Forearms (0.5), both Arms: counts once at full credit.
    // Bench adds 0.5 to Arms per set via Triceps.
    expect(rows[0]).toMatchObject({ Chest: 2, Arms: 2, Shoulders: 1 });
  });

  it('converts volume into the default unit', () => {
    const { rows } = muscleSeries(sets, exercises, { ...base, metric: 'volume', level: 'muscle' });
    expect(rows[0]?.Biceps).toBeCloseTo(100 * 2.20462, 2);
    expect(rows[0]?.Chest).toBe(2000);
  });
});

describe('muscle helpers', () => {
  const bench: Exercise = {
    name: 'Bench',
    baseName: 'Bench',
    equipment: null,
    muscles: { primary: ['Chest'], secondary: ['Triceps', 'Biceps'] },
    muscleSource: 'user',
    unit: null,
    assisted: false,
    bodyweight: false,
    bodyweightFactor: 1,
  };

  it('muscleCredit rolls regions up to their best credit', () => {
    expect(Object.fromEntries(muscleCredit(bench, 0.5))).toEqual({
      Chest: 1,
      Triceps: 0.5,
      Biceps: 0.5,
    });
    expect(Object.fromEntries(muscleCredit(bench, 0.5, 'region'))).toEqual({ Chest: 1, Arms: 0.5 });
    expect(muscleCredit(bench, 0).has('Triceps')).toBe(false);
  });

  it('setVolume converts units and ignores assisted lifts', () => {
    const set = s({ weight: 10, reps: 10 });
    expect(setVolume(set, { ...bench, unit: 'kg' }, 'lb')).toBeCloseTo(220.46, 1);
    expect(setVolume(set, { ...bench, assisted: true }, 'lb')).toBe(0);
  });

  it('muscleContributors ranks exercises for a muscle', () => {
    const exercises = new Map([
      ['Bench', bench],
      ['Dip', { ...bench, name: 'Dip', muscles: { primary: ['Triceps'], secondary: [] } }],
    ]);
    const sets = [s({ exercise: 'Bench' }), s({ exercise: 'Dip' }), s({ exercise: 'Dip' })];
    expect(
      muscleContributors(sets, exercises, 'Triceps', {
        ...opts,
        metric: 'sets',
        secondaryWeight: 0.5,
        defaultUnit: 'lb',
      }),
    ).toEqual([
      { exercise: 'Dip', value: 2 },
      { exercise: 'Bench', value: 0.5 },
    ]);
  });

  it('totalsByKey sums, drops zeros and sorts', () => {
    expect(
      totalsByKey(
        [
          { period: 'a', x: 1, y: 0 },
          { period: 'b', x: 2, z: 5 },
        ],
        ['x', 'y', 'z'],
      ),
    ).toEqual([
      { key: 'z', value: 5 },
      { key: 'x', value: 3 },
    ]);
  });
});

describe('describeSet', () => {
  it('formats weight, reps, distance and time', () => {
    expect(describeSet(s({ weight: 135, reps: 8 }), 'lb')).toBe('135 lb × 8 reps');
    expect(describeSet(s({ weight: 0, reps: 12 }), 'kg')).toBe('12 reps');
    expect(describeSet(s({ weight: 0, reps: 0, distance: 1.5, seconds: 600 }), 'lb')).toBe(
      '1.5 dist × 600s',
    );
  });
});

describe('bodyweight loading', () => {
  const at = () => 180;

  it('adds bodyweight to the logged weight', () => {
    const [stat] = sessionStats([s({ weight: 25, reps: 5 })], {
      ...opts,
      bodyweight: { at, factor: 1, assisted: false },
    });
    expect(stat?.topWeight).toBe(205);
    expect(stat?.volume).toBe(1025);
    expect(stat?.e1rm).toBeCloseTo(205 * (1 + 5 / 30));
  });

  it('applies the factor for lifts that carry only part of it', () => {
    const [stat] = sessionStats([s({ weight: 0, reps: 10 })], {
      ...opts,
      bodyweight: { at, factor: 0.65, assisted: false },
    });
    expect(stat?.topWeight).toBe(117);
  });

  it('subtracts assistance, so less help reads as a heavier lift', () => {
    const [light, heavy] = sessionStats(
      [
        s({ date: '2024-01-01T10:00:00', weight: 70, reps: 8 }),
        s({ date: '2024-01-08T10:00:00', weight: 50, reps: 8 }),
      ],
      { ...opts, assisted: true, bodyweight: { at, factor: 1, assisted: true } },
    );
    expect(light?.topWeight).toBe(110);
    expect(heavy?.topWeight).toBe(130);
    // Volume is real work now, not the meaningless assistance total.
    expect(heavy?.volume).toBe(130 * 8);
  });

  it('leaves out a set whose assistance exceeds bodyweight instead of going negative', () => {
    // Only reachable from bad data or a wrong unit; counted as a set, but no load to report.
    const [stat] = sessionStats([s({ weight: 250, reps: 5 })], {
      ...opts,
      assisted: true,
      bodyweight: { at, factor: 1, assisted: true },
    });
    expect(stat).toMatchObject({ sets: 1, topWeight: null, volume: 0, e1rm: null });
  });

  it('falls back to logged weight when no bodyweight covers the date', () => {
    const [stat] = sessionStats([s({ weight: 25, reps: 5 })], {
      ...opts,
      bodyweight: { at: () => null, factor: 1, assisted: false },
    });
    expect(stat?.topWeight).toBe(25);
  });
});
