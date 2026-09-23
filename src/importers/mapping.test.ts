import {
  guessMapping,
  guessUnit,
  headerSignature,
  looksWideFormat,
  missingRequired,
} from './mapping';

describe('guessMapping', () => {
  it('maps a Strong-style header row', () => {
    const map = guessMapping([
      'Date',
      'Workout Name',
      'Duration',
      'Exercise Name',
      'Set Order',
      'Weight',
      'Reps',
      'Notes',
      'RPE',
    ]);
    expect(map).toMatchObject({
      date: 'Date',
      workout: 'Workout Name',
      duration: 'Duration',
      exercise: 'Exercise Name',
      setOrder: 'Set Order',
      weight: 'Weight',
      reps: 'Reps',
      rpe: 'RPE',
      notes: 'Notes',
    });
  });

  it('handles other naming conventions', () => {
    const map = guessMapping([
      'start_time',
      'exercise_title',
      'weight_kg',
      'rep_count',
      'set_index',
    ]);
    expect(map).toMatchObject({
      date: 'start_time',
      exercise: 'exercise_title',
      weight: 'weight_kg',
      reps: 'rep_count',
      setOrder: 'set_index',
    });
  });

  it('never assigns one column to two fields', () => {
    const map = guessMapping(['Date', 'Exercise', 'Notes']);
    const used = Object.values(map);
    expect(new Set(used).size).toBe(used.length);
  });

  it('reports what is still missing', () => {
    expect(missingRequired(guessMapping(['Weight', 'Reps']))).toEqual(['date', 'exercise']);
    expect(missingRequired(guessMapping(['Date', 'Exercise']))).toEqual([]);
  });
});

describe('headerSignature', () => {
  it('ignores order, case and punctuation', () => {
    expect(headerSignature(['Date', 'Exercise Name'])).toBe(
      headerSignature(['exercise_name', 'DATE']),
    );
    expect(headerSignature(['Date'])).not.toBe(headerSignature(['Date', 'Reps']));
  });
});

describe('looksWideFormat', () => {
  it('spots one-row-per-workout layouts', () => {
    expect(looksWideFormat(['Date', 'Set 1 Weight', 'Set 2 Weight', 'Set 3 Weight'])).toBe(true);
    expect(looksWideFormat(['Date', 'Exercise', 'Set Order', 'Weight'])).toBe(false);
  });
});

describe('guessUnit', () => {
  it('reads the unit out of the weight column name', () => {
    expect(guessUnit('weight_kg', 'lb')).toBe('kg');
    expect(guessUnit('Weight (lbs)', 'kg')).toBe('lb');
    expect(guessUnit('Weight', 'lb')).toBe('lb');
    expect(guessUnit(undefined, 'kg')).toBe('kg');
  });
});
