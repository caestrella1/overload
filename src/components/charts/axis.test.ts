import { mergeSeries, monthTickLabel, monthTicks } from './axis';

describe('monthTicks', () => {
  it('returns unique month starts, thinned', () => {
    const min = new Date(2024, 0, 15).getTime();
    const max = new Date(2025, 11, 20).getTime();
    const ticks = monthTicks(min, max, 6);
    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(new Set(ticks.map(monthTickLabel)).size).toBe(ticks.length);
    expect(new Date(ticks[0] ?? 0).getDate()).toBe(1);
    expect(ticks[0]).toBeGreaterThanOrEqual(min);
  });
});

describe('mergeSeries', () => {
  it('joins series on period in time order', () => {
    const rows = mergeSeries([
      { id: 'a', label: 'A', color: '', points: [{ period: '2024-02-01', value: 2 }] },
      {
        id: 'b',
        label: 'B',
        color: '',
        points: [
          { period: '2024-01-01', value: 1 },
          { period: '2024-02-01', value: 3 },
        ],
      },
    ]);
    expect(rows.map((r) => [r.period, r.a, r.b])).toEqual([
      ['2024-01-01', undefined, 1],
      ['2024-02-01', 2, 3],
    ]);
  });
});
