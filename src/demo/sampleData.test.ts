import { parseFile } from '../importers';
import { generateSampleCsv } from './sampleData';

describe('sample data', () => {
  const end = new Date(2026, 0, 1);
  it('is deterministic and parses as a Strong export', () => {
    const csv = generateSampleCsv(12, end);
    expect(generateSampleCsv(12, end)).toBe(csv);
    const parsed = parseFile(csv);
    expect(parsed.importer.id).toBe('strong');
    expect(parsed.warnings).toEqual([]);
    expect(parsed.workouts.length).toBeGreaterThan(25);
    expect(parsed.sets.every((s) => s.date <= '2026-01-01T23:59:59')).toBe(true);
  });
});
