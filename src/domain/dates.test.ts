import { monthKey, weekKey } from './dates';

describe('date buckets', () => {
  it('weeks start on Monday', () => {
    expect(weekKey('2024-01-07T10:00:00')).toBe('2024-01-01'); // Sunday
    expect(weekKey('2024-01-01T00:00:00')).toBe('2024-01-01'); // Monday
    expect(weekKey('2024-01-03T23:59:00')).toBe('2024-01-01');
  });
  it('months use the first day', () => {
    expect(monthKey('2024-02-29T08:00:00')).toBe('2024-02-01');
  });
});
