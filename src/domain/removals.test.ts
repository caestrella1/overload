import { groupRemovals, isLargeRemoval } from './removals';
import type { WorkoutSet } from './types';

const set = (workoutKey: string, exercise: string, key: string): WorkoutSet => ({
  id: 1,
  key,
  contentHash: 'h',
  workoutKey,
  date: workoutKey.split('|')[0] ?? '',
  exercise,
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
});

describe('groupRemovals', () => {
  it('groups by workout, newest first, listing each exercise once', () => {
    const groups = groupRemovals([
      set('2024-01-01T10:00:00|Push', 'Bench', 'a'),
      set('2024-01-01T10:00:00|Push', 'Bench', 'b'),
      set('2024-01-01T10:00:00|Push', 'Dip', 'c'),
      set('2024-02-01T10:00:00|Legs', 'Squat', 'd'),
    ]);
    expect(groups).toEqual([
      expect.objectContaining({ name: 'Legs', sets: 1, exercises: ['Squat'] }),
      expect.objectContaining({ name: 'Push', sets: 3, exercises: ['Bench', 'Dip'] }),
    ]);
  });

  it('handles workout names containing the separator', () => {
    expect(groupRemovals([set('2024-01-01T10:00:00|Pull|B', 'Row', 'a')])[0]?.name).toBe('Pull|B');
  });
});

describe('isLargeRemoval', () => {
  it('flags removals over a fifth of what the file covers', () => {
    expect(isLargeRemoval(30, 100)).toBe(true);
    expect(isLargeRemoval(10, 100)).toBe(false);
    expect(isLargeRemoval(0, 0)).toBe(false);
  });
});
