import { planImport } from './plan';
import type { ParsedSet } from './types';

const set = (key: string, contentHash: string): ParsedSet => ({
  key,
  contentHash,
  workoutKey: 'w',
  date: '2020-01-01T00:00:00',
  exercise: 'X',
  setLabel: '1',
  setIndex: 1,
  setType: 'normal',
  weight: 1,
  reps: 1,
  distance: null,
  seconds: null,
  rpe: null,
  notes: null,
});

describe('planImport', () => {
  it('classifies new, duplicate and changed sets', () => {
    const existing = new Map([
      ['a', { id: 1, contentHash: 'h1' }],
      ['b', { id: 2, contentHash: 'h2' }],
    ]);
    const plan = planImport([set('a', 'h1'), set('b', 'changed'), set('c', 'h3')], existing);
    expect(plan.duplicates).toBe(1);
    expect(plan.toUpdate).toEqual([{ id: 2, set: set('b', 'changed') }]);
    expect(plan.toAdd.map((s) => s.key)).toEqual(['c']);
  });
});
