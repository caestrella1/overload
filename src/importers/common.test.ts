import {
  normalizeDate,
  parseDuration,
  parseMuscleList,
  parseNumber,
  setTypeFromLabel,
} from './common';

describe('parseDuration', () => {
  it.each([
    ['1h 1m', 3660],
    ['55m', 3300],
    ['1h', 3600],
    ['45s', 45],
    ['1:02:03', 3723],
    ['12:30', 750],
    ['', null],
  ])('%s -> %s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });
});

describe('normalizeDate', () => {
  it('accepts Strong format', () => {
    expect(normalizeDate('2019-01-28 12:24:23')).toBe('2019-01-28T12:24:23');
  });
  it('fills missing seconds and time', () => {
    expect(normalizeDate('2019-01-28 12:24')).toBe('2019-01-28T12:24:00');
    expect(normalizeDate('2019-01-28')).toBe('2019-01-28T00:00:00');
  });
  it('rejects garbage', () => {
    expect(normalizeDate('yesterday')).toBeNull();
  });
});

describe('parseNumber', () => {
  it('handles blanks and decimal commas', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('62,5')).toBe(62.5);
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('setTypeFromLabel', () => {
  it('maps labels', () => {
    expect(setTypeFromLabel('3')).toBe('normal');
    expect(setTypeFromLabel('W')).toBe('warmup');
    expect(setTypeFromLabel('D')).toBe('drop');
    expect(setTypeFromLabel('F')).toBe('failure');
    expect(setTypeFromLabel('Rest Timer')).toBeNull();
  });
});

describe('parseMuscleList', () => {
  it('normalizes names and drops unknowns', () => {
    expect(parseMuscleList('Chest, triceps; Delts / wings')).toEqual([
      'Chest',
      'Triceps',
      'Shoulders',
    ]);
  });
});
