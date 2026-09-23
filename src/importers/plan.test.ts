import type { WorkoutSet } from '../domain/types';
import { planImport, planSync, syncCandidates } from './plan';
import type { ParsedSet } from './types';

const parsed = (key: string, contentHash: string): ParsedSet => ({
  key,
  contentHash,
  workoutKey: 'w',
  date: '2020-01-01T00:00:00',
  exercise: 'X',
  originName: 'X',
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

const stored = (key: string, date: string, importId: number): WorkoutSet => ({
  ...parsed(key, 'h'),
  originSource: 'strong',
  originImportId: importId,
  id: Number(key.replace(/\D/g, '')) || 1,
  date,
  importId,
});

describe('planImport', () => {
  it('classifies new, duplicate and changed sets', () => {
    const existing = new Map([
      ['a', { id: 1, contentHash: 'h1' }],
      ['b', { id: 2, contentHash: 'h2' }],
    ]);
    const plan = planImport(
      [parsed('a', 'h1'), parsed('b', 'changed'), parsed('c', 'h3')],
      existing,
    );
    expect(plan.duplicates).toBe(1);
    expect(plan.toUpdate).toEqual([{ id: 2, set: parsed('b', 'changed') }]);
    expect(plan.toAdd.map((s) => s.key)).toEqual(['c']);
  });
});

describe('syncCandidates', () => {
  const sets = [
    stored('k1', '2023-12-31T10:00:00', 1),
    stored('k2', '2024-01-01T10:00:00', 1),
    stored('k3', '2024-06-01T10:00:00', 2),
    stored('k4', '2024-06-02T10:00:00', 1),
  ];

  it('keeps only same-source sets at or after the file start', () => {
    const scope = { from: '2024-01-01T10:00:00', importIds: new Set([1]) };
    expect(syncCandidates(sets, scope).map((s) => s.key)).toEqual(['k2', 'k4']);
  });

  it('is empty when the source has no imports', () => {
    expect(syncCandidates(sets, { from: '2000-01-01T00:00:00', importIds: new Set() })).toEqual([]);
  });
});

describe('planSync', () => {
  it('returns candidates missing from the incoming file', () => {
    const candidates = [
      stored('k1', '2024-01-01T10:00:00', 1),
      stored('k2', '2024-01-02T10:00:00', 1),
    ];
    expect(planSync(candidates, new Set(['k1'])).map((s) => s.key)).toEqual(['k2']);
    expect(planSync(candidates, new Set(['k1', 'k2']))).toEqual([]);
  });
});
