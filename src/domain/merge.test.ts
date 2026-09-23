import { mergeSetsInto, resolveAlias } from './merge';
import type { WorkoutSet } from './types';

let id = 0;
const set = (partial: Partial<WorkoutSet>): WorkoutSet => {
  id++;
  const date = partial.date ?? '2024-01-01T10:00:00';
  return {
    id,
    key: `k${id}`,
    contentHash: 'h',
    workoutKey: `${date}|W`,
    date,
    exercise: 'Bench Press (Barbell)',
    originSource: 'strong',
    originName: partial.exercise ?? 'Bench Press (Barbell)',
    originImportId: 1,
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
};

describe('mergeSetsInto', () => {
  it('renumbers colliding sets and gives them distinct keys', () => {
    const merged = mergeSetsInto(
      [
        set({ exercise: 'Bench Press', setLabel: '1', setIndex: 1 }),
        set({ exercise: 'Bench Press', setLabel: '2', setIndex: 2 }),
        set({ exercise: 'Bench Press (Barbell)', setLabel: '1', setIndex: 1 }),
      ],
      'Bench Press',
    );
    expect(merged.every((s) => s.exercise === 'Bench Press')).toBe(true);
    expect(merged.map((s) => s.setIndex)).toEqual([1, 2, 3]);
    expect(new Set(merged.map((s) => s.key)).size).toBe(3);
    // The two "set 1" rows differ only by occurrence.
    expect(merged.filter((s) => s.setLabel === '1').map((s) => s.key)).toEqual([
      '2024-01-01T10:00:00|Bench Press|1|1',
      '2024-01-01T10:00:00|Bench Press|1|2',
    ]);
  });

  it('keeps sets in logged order across workouts', () => {
    const merged = mergeSetsInto(
      [
        set({ date: '2024-02-01T10:00:00', exercise: 'A' }),
        set({ date: '2024-01-01T10:00:00', exercise: 'B' }),
      ],
      'A',
    );
    expect(merged.map((s) => s.date)).toEqual(['2024-01-01T10:00:00', '2024-02-01T10:00:00']);
    expect(merged.every((s) => s.setIndex === 1)).toBe(true);
  });

  it('leaves the values alone', () => {
    const [merged] = mergeSetsInto([set({ weight: 135, reps: 8, rpe: 9 })], 'X');
    expect(merged).toMatchObject({ weight: 135, reps: 8, rpe: 9, contentHash: 'h' });
  });
});

describe('resolveAlias', () => {
  it('follows a chain of renames', () => {
    const aliases = new Map([
      ['A', 'B'],
      ['B', 'C'],
    ]);
    expect(resolveAlias(aliases, 'A')).toBe('C');
    expect(resolveAlias(aliases, 'C')).toBe('C');
    expect(resolveAlias(aliases, 'Z')).toBe('Z');
  });

  it('stops on a cycle instead of hanging', () => {
    const aliases = new Map([
      ['A', 'B'],
      ['B', 'A'],
    ]);
    expect(['A', 'B']).toContain(resolveAlias(aliases, 'A'));
  });
});
