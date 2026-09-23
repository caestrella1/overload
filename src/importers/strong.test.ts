import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFile, UnsupportedFormatError } from '.';

const sample = readFileSync(resolve(__dirname, '__fixtures__/strong-sample.csv'), 'utf8');

describe('Strong importer', () => {
  const result = parseFile(sample);

  it('detects the format', () => {
    expect(result.importer.id).toBe('strong');
  });

  it('groups rows into workouts with duration and notes', () => {
    expect(result.workouts).toHaveLength(2);
    const pull = result.workouts.find((w) => w.name === 'Pull (Back & Biceps)');
    expect(pull).toMatchObject({
      date: '2019-01-28T12:24:23',
      durationSec: 3660,
      notes: 'Log weights by size used, not by total weight.',
    });
  });

  it('parses sets, skipping rest-timer rows', () => {
    expect(result.rowCount).toBe(10);
    expect(result.sets).toHaveLength(9);
    expect(result.skippedRows).toBe(1);
    expect(result.warnings.some((w) => w.includes('rest-timer'))).toBe(true);
  });

  it('reads set types, rpe, notes and cardio fields', () => {
    const bench = result.sets.filter((s) => s.exercise === 'Bench Press (Barbell)');
    expect(bench.map((s) => s.setType)).toEqual(['warmup', 'normal', 'normal']);
    expect(bench.map((s) => s.setIndex)).toEqual([1, 2, 3]);
    expect(bench[2]).toMatchObject({ weight: 145, reps: 6, rpe: 9, notes: 'felt strong' });
    const run = result.sets.find((s) => s.exercise === 'Running');
    expect(run).toMatchObject({ distance: 1.5, seconds: 600, weight: 0 });
  });

  it('builds stable, unique identity keys', () => {
    const keys = result.sets.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(parseFile(sample).sets.map((s) => s.key)).toEqual(keys);
  });

  it('changes content hash when a set is edited', () => {
    const edited = parseFile(sample.replace('145.0,6.0', '145.0,7.0'));
    const a = result.sets.find((s) => s.weight === 145);
    const b = edited.sets.find((s) => s.weight === 145);
    expect(a?.key).toBe(b?.key);
    expect(a?.contentHash).not.toBe(b?.contentHash);
  });

  it('handles the older semicolon format with units', () => {
    const old = [
      'Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;Workout Notes;Workout Duration',
      '2018-05-01 07:00:00;Legs;Squat (Barbell);1;100;kg;5;;;;0;;;45m',
    ].join('\n');
    const r = parseFile(old);
    expect(r.sets[0]).toMatchObject({ weight: 100, reps: 5 });
    expect(r.exercises[0]).toMatchObject({ name: 'Squat (Barbell)', unit: 'kg' });
    expect(r.workouts[0]?.durationSec).toBe(2700);
  });

  it('imports muscle groups as-is when the file provides them', () => {
    const csv = [
      'Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Muscle Groups,Secondary Muscles',
      '2020-01-01 10:00:00,A,Mystery Press,1,50,10,"Shoulders","Triceps, Chest"',
    ].join('\n');
    expect(parseFile(csv).exercises[0]?.muscles).toEqual({
      primary: ['Shoulders'],
      secondary: ['Triceps', 'Chest'],
    });
  });

  it('warns about identical rows', () => {
    const lines = sample.trim().split('\n');
    const dup = [...lines, lines[1] ?? ''].join('\n');
    const r = parseFile(dup);
    expect(r.warnings.some((w) => w.includes('exact copies'))).toBe(true);
  });

  it('rejects unknown formats', () => {
    expect(() => parseFile('a,b,c\n1,2,3')).toThrow(UnsupportedFormatError);
  });
});
