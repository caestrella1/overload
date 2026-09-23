import { bodyweightAt, bodyweightChange, isBodyweightName } from './bodyweight';
import type { BodyweightEntry } from './bodyweight';

const log: BodyweightEntry[] = [
  { date: '2024-01-01', weight: 180, unit: 'lb' },
  { date: '2024-03-01', weight: 176, unit: 'lb' },
  { date: '2024-06-01', weight: 172, unit: 'lb' },
];

describe('bodyweightAt', () => {
  it('carries the most recent entry forward', () => {
    expect(bodyweightAt(log, '2024-03-15T10:00:00', 'lb')).toBe(176);
    expect(bodyweightAt(log, '2024-03-01T10:00:00', 'lb')).toBe(176);
    expect(bodyweightAt(log, '2025-01-01T10:00:00', 'lb')).toBe(172);
  });

  it('uses the earliest entry for dates before the log starts', () => {
    expect(bodyweightAt(log, '2023-06-01T10:00:00', 'lb')).toBe(180);
  });

  it('converts into the requested unit', () => {
    expect(bodyweightAt(log, '2024-06-02T10:00:00', 'kg')).toBeCloseTo(78.02, 1);
    expect(
      bodyweightAt([{ date: '2024-01-01', weight: 80, unit: 'kg' }], '2024-02-01', 'lb'),
    ).toBeCloseTo(176.37, 1);
  });

  it('returns null with nothing logged', () => {
    expect(bodyweightAt([], '2024-01-01', 'lb')).toBeNull();
  });
});

describe('isBodyweightName', () => {
  it('spots lifts that move your own weight', () => {
    expect(isBodyweightName('Pull Up (Assisted)')).toBe(true);
    expect(isBodyweightName('Chest Dip')).toBe(true);
    expect(isBodyweightName('Push Up')).toBe(true);
    expect(isBodyweightName('Bench Press (Barbell)')).toBe(false);
    expect(isBodyweightName('Squat (Barbell)')).toBe(false);
  });
});

describe('bodyweightChange', () => {
  it('measures the move across the log', () => {
    expect(bodyweightChange(log)).toMatchObject({ change: -8 });
    expect(bodyweightChange([])).toBeNull();
  });
});
