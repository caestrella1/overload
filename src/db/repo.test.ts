import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFile } from '../importers';
import { createDb, type OverloadDB } from './db';
import {
  type Backup,
  clearAllData,
  commitImport,
  exportBackup,
  findDuplicateSets,
  loadSettings,
  previewImport,
  restoreBackup,
  saveSettings,
  undoImport,
  updateExercise,
} from './repo';

const sample = readFileSync(
  resolve(__dirname, '../importers/__fixtures__/strong-sample.csv'),
  'utf8',
);

let db: OverloadDB;
let n = 0;
beforeEach(() => {
  db = createDb(`test-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

const importText = async (text: string, hash: string, updateChanged = true) => {
  const parsed = parseFile(text);
  return commitImport(db, parsed, { fileName: 'strong.csv', fileHash: hash, updateChanged });
};

describe('import', () => {
  it('stores sets, workouts and exercises with suggested muscles', async () => {
    const record = await importText(sample, 'h1');
    expect(record.added).toBe(9);
    expect(await db.sets.count()).toBe(9);
    expect(await db.workouts.count()).toBe(2);
    const pullUp = await db.exercises.get('Pull Up (Assisted)');
    expect(pullUp).toMatchObject({
      assisted: true,
      muscleSource: 'suggested',
      equipment: 'Assisted',
    });
    expect(pullUp?.muscles.primary).toEqual(['Lats']);
  });

  it('flags a re-import of the same file and skips duplicate sets', async () => {
    await importText(sample, 'h1');
    const preview = await previewImport(db, parseFile(sample), 'h1');
    expect(preview.sameFile?.fileName).toBe('strong.csv');
    expect(preview.plan.duplicates).toBe(9);
    expect(preview.plan.toAdd).toHaveLength(0);
    expect(preview.newExercises).toHaveLength(0);

    const again = await importText(sample, 'h1');
    expect(again).toMatchObject({ added: 0, duplicates: 9 });
    expect(await db.sets.count()).toBe(9);
  });

  it('updates edited sets only when asked', async () => {
    await importText(sample, 'h1');
    const edited = sample.replace('145.0,6.0', '145.0,7.0');
    const skip = await importText(edited, 'h2', false);
    expect(skip).toMatchObject({ added: 0, updated: 0, duplicates: 9 });
    const upd = await importText(edited, 'h3', true);
    expect(upd).toMatchObject({ added: 0, updated: 1 });
    expect((await db.sets.filter((x) => x.weight === 145).first())?.reps).toBe(7);
  });

  it('keeps user-set muscles over later suggestions', async () => {
    await importText(sample, 'h1');
    await updateExercise(db, 'Running', {
      muscles: { primary: ['Calves'], secondary: [] },
      muscleSource: 'user',
    });
    await importText(sample, 'h2');
    expect((await db.exercises.get('Running'))?.muscles.primary).toEqual(['Calves']);
  });

  it('undo removes the import and orphaned records', async () => {
    const first = await importText(sample, 'h1');
    await undoImport(db, first.id ?? -1);
    expect(await db.sets.count()).toBe(0);
    expect(await db.workouts.count()).toBe(0);
    expect(await db.exercises.count()).toBe(0);
    expect(await db.imports.count()).toBe(0);
  });
});

describe('duplicates', () => {
  it('finds sets recorded twice under different keys', async () => {
    await importText(sample, 'h1');
    const [first] = await db.sets.toArray();
    if (!first) throw new Error('expected sets');
    const copy = { ...first, id: undefined, key: 'other-source|1' };
    await db.sets.add(copy);
    const groups = findDuplicateSets(await db.sets.toArray());
    expect(groups).toHaveLength(1);
    expect(groups[0]?.keep.id).toBe(first.id);
    expect(groups[0]?.extras).toHaveLength(1);
  });
});

describe('clear, backup and restore', () => {
  it('clears data but keeps settings and user-edited exercises', async () => {
    await importText(sample, 'h1');
    await saveSettings(db, { defaultUnit: 'kg' });
    await updateExercise(db, 'Running', { unit: 'kg' });
    await clearAllData(db, { keepSettings: true });
    expect(await db.sets.count()).toBe(0);
    expect(await db.imports.count()).toBe(0);
    expect((await db.exercises.toArray()).map((e) => e.name)).toEqual(['Running']);
    expect((await loadSettings(db)).defaultUnit).toBe('kg');

    await clearAllData(db, { keepSettings: false });
    expect(await db.exercises.count()).toBe(0);
    expect((await loadSettings(db)).defaultUnit).toBe('lb');
  });

  it('round-trips a backup', async () => {
    await importText(sample, 'h1');
    await saveSettings(db, { e1rmFormula: 'brzycki' });
    const backup = await exportBackup(db);
    await clearAllData(db, { keepSettings: false });
    await restoreBackup(db, JSON.parse(JSON.stringify(backup)) as Backup);
    expect(await db.sets.count()).toBe(9);
    expect((await loadSettings(db)).e1rmFormula).toBe('brzycki');
  });
});
