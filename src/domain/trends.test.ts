import type { MuscleRow } from './metrics';
import { muscleTrends } from './trends';

/** Eight weekly rows; each entry is that week's value for the muscle. */
function rows(values: Record<string, number[]>): MuscleRow[] {
  const length = Math.max(...Object.values(values).map((v) => v.length));
  return Array.from({ length }, (_, i) => {
    const row: MuscleRow = { period: `2024-01-0${i + 1}` };
    for (const [muscle, series] of Object.entries(values)) {
      const v = series[i];
      if (v != null) row[muscle] = v;
    }
    return row;
  });
}

describe('muscleTrends', () => {
  it('compares the last window against the one before it', () => {
    const data = rows({
      Chest: [4, 4, 4, 4, 8, 8, 8, 8],
      Quads: [10, 10, 10, 10, 11, 11, 11, 11],
    });
    const { window, trends } = muscleTrends(data, ['Chest', 'Quads']);
    expect(window).toBe(4);
    expect(trends.map((t) => t.muscle)).toEqual(['Chest', 'Quads']);
    expect(trends[0]).toMatchObject({ recent: 8, previous: 4, percent: 1 });
    expect(trends[1]?.percent).toBeCloseTo(0.1);
  });

  it('leaves out muscles that did not increase', () => {
    const data = rows({ Chest: [8, 8, 8, 8, 4, 4, 4, 4], Lats: [5, 5, 5, 5, 5, 5, 5, 5] });
    expect(muscleTrends(data, ['Chest', 'Lats']).trends).toEqual([]);
  });

  it('counts untrained periods as zero', () => {
    // Trained twice as heavily, but half the recent weeks were skipped: no net gain.
    const data = rows({ Chest: [4, 4, 4, 4, 8, 0, 8, 0] });
    expect(muscleTrends(data, ['Chest']).trends).toEqual([]);
  });

  it('ranks muscles with no earlier training last', () => {
    const data = rows({
      Calves: [0, 0, 0, 0, 6, 6, 6, 6],
      Chest: [4, 4, 4, 4, 9, 9, 9, 9],
    });
    const { trends } = muscleTrends(data, ['Calves', 'Chest']);
    expect(trends.map((t) => t.muscle)).toEqual(['Chest', 'Calves']);
    expect(trends[1]).toMatchObject({ percent: null, previous: 0, recent: 6 });
  });

  it('shrinks the window when history is short, and gives up below two periods', () => {
    expect(muscleTrends(rows({ Chest: [2, 4] }), ['Chest']).window).toBe(1);
    expect(muscleTrends(rows({ Chest: [4] }), ['Chest'])).toEqual({ window: 0, trends: [] });
    expect(muscleTrends([], ['Chest'])).toEqual({ window: 0, trends: [] });
  });
});
