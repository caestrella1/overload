import { readCsv } from './csv';
import { guessMapping } from './mapping';
import { parseMapped } from './mapped';

const parse = (text: string, overrides: Partial<Parameters<typeof parseMapped>[1]> = {}) => {
  const csv = readCsv(text);
  return parseMapped(csv.rows, {
    map: guessMapping(csv.headers),
    unit: 'kg',
    dateOrder: 'ymd',
    source: 'custom:test',
    ...overrides,
  });
};

describe('parseMapped', () => {
  const hevyish = [
    'start_time,title,exercise_title,set_index,weight_kg,reps,rpe',
    '2024-03-04 18:00:00,Push Day,Bench Press,1,80,8,7',
    '2024-03-04 18:00:00,Push Day,Bench Press,2,80,7,8',
    '2024-03-04 18:00:00,Push Day,Incline Press,1,30,10,',
    '2024-03-06 18:00:00,Pull Day,Barbell Row,1,60,10,',
  ].join('\n');

  it('parses a guessed mapping into workouts, sets and exercises', () => {
    const result = parse(hevyish);
    expect(result.sets).toHaveLength(4);
    expect(result.workouts.map((w) => w.name)).toEqual(['Push Day', 'Pull Day']);
    expect(result.exercises.map((e) => e.name)).toEqual([
      'Bench Press',
      'Incline Press',
      'Barbell Row',
    ]);
    expect(result.sets[0]).toMatchObject({ weight: 80, reps: 8, rpe: 7, setIndex: 1 });
    expect(result.warnings).toEqual([]);
  });

  it('applies the chosen unit to every exercise', () => {
    expect(parse(hevyish).exercises.every((e) => e.unit === 'kg')).toBe(true);
    expect(parse(hevyish, { unit: 'lb' }).exercises.every((e) => e.unit === 'lb')).toBe(true);
  });

  it('prefers a unit column when the file has one', () => {
    const csv = ['Date,Exercise,Weight,Unit,Reps', '2024-03-04,Squat,100,lb,5'].join('\n');
    expect(parse(csv).exercises[0]?.unit).toBe('lb');
  });

  it('numbers sets by position when there is no set column', () => {
    const csv = [
      'Date,Exercise,Weight,Reps',
      '2024-03-04,Squat,100,5',
      '2024-03-04,Squat,100,5',
      '2024-03-04,Deadlift,140,3',
    ].join('\n');
    const result = parse(csv);
    expect(result.sets.map((s) => s.setLabel)).toEqual(['1', '2', '1']);
    // Identical rows stay distinct, so neither is mistaken for a duplicate.
    expect(new Set(result.sets.map((s) => s.key)).size).toBe(3);
  });

  it('reads warm-up markers when the set column carries them', () => {
    const csv = ['Date,Exercise,Set,Weight,Reps', '2024-03-04,Squat,W,60,10'].join('\n');
    expect(parse(csv).sets[0]?.setType).toBe('warmup');
  });

  it('skips and reports rows it cannot read', () => {
    const csv = [
      'Date,Exercise,Weight,Reps',
      'not a date,Squat,100,5',
      '2024-03-04,,100,5',
      '2024-03-04,Squat,100,5',
    ].join('\n');
    const result = parse(csv);
    expect(result.sets).toHaveLength(1);
    expect(result.skippedRows).toBe(2);
    expect(result.warnings.join(' ')).toMatch(/date column could not be read/);
    expect(result.warnings.join(' ')).toMatch(/no exercise name/);
  });

  it('honours the day/month order for ambiguous dates', () => {
    const csv = ['Date,Exercise,Weight,Reps', '03/04/2024,Squat,100,5'].join('\n');
    expect(parse(csv, { dateOrder: 'dmy' }).sets[0]?.date).toBe('2024-04-03T00:00:00');
    expect(parse(csv, { dateOrder: 'mdy' }).sets[0]?.date).toBe('2024-03-04T00:00:00');
  });

  it('produces stable keys across repeat parses', () => {
    expect(parse(hevyish).sets.map((s) => s.key)).toEqual(parse(hevyish).sets.map((s) => s.key));
  });
});
