import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFile, parseMapped } from '../importers';
import { readCsv } from '../importers/csv';
import { guessMapping } from '../importers/mapping';
import { createDb, type OverloadDB } from './db';
import {
  aliasMap,
  applyAliases,
  type Backup,
  clearAllData,
  commitImport,
  confirmSuggestedMuscles,
  countSuggestions,
  countRemovals,
  exportBackup,
  findDuplicateSets,
  findProfile,
  listProfiles,
  loadSettings,
  previewImport,
  readFlag,
  renameExercise,
  restoreBackup,
  saveProfile,
  saveSettings,
  writeFlag,
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

describe('confirmSuggestedMuscles', () => {
  it('accepts only confident suggestions by default', async () => {
    await importText(sample, 'h1');
    const counts = await countSuggestions(db);
    expect(counts.high).toBeGreaterThan(0);

    const changed = await confirmSuggestedMuscles(db);
    expect(changed).toBe(counts.high);
    // The shakier guesses are left for review rather than quietly adopted.
    expect(await db.exercises.where('muscleSource').equals('suggested').count()).toBe(
      counts.medium + counts.low,
    );
    const accepted = await db.exercises.where('muscleSource').equals('user').first();
    expect(accepted?.suggestionConfidence).toBeNull();
  });

  it('accepts the rest when asked', async () => {
    await importText(sample, 'h1');
    await confirmSuggestedMuscles(db, ['high', 'medium', 'low']);
    expect(await db.exercises.where('muscleSource').equals('suggested').count()).toBe(0);
  });
});

describe('sync imports', () => {
  /** Drops the last two Bench Press sets, as if they were deleted in Strong. */
  const withDeletedSets = sample
    .split('\n')
    .filter((l) => !l.includes('145.0') && !l.includes('135.0'))
    .join('\n');

  it('previews what a newer export no longer contains', async () => {
    await importText(sample, 'h1');
    const preview = await previewImport(db, parseFile(withDeletedSets), 'h2');
    expect(preview.sync.toRemove.map((s) => s.weight)).toEqual([135, 145]);
    expect(preview.sync.inScope).toBe(9);
    expect(preview.sync.from).toBe('2019-01-28T12:24:23');
  });

  it('removes them only when sync is on', async () => {
    await importText(sample, 'h1');
    const skipped = await importText(withDeletedSets, 'h2');
    expect(skipped.removed).toBe(0);
    expect(await db.sets.count()).toBe(9);

    const parsed = parseFile(withDeletedSets);
    const synced = await commitImport(db, parsed, {
      fileName: 'newer.csv',
      fileHash: 'h3',
      updateChanged: true,
      sync: true,
    });
    expect(synced.removed).toBe(2);
    expect(await db.sets.count()).toBe(7);
    expect(await db.sets.filter((s) => s.weight === 145).count()).toBe(0);
  });

  it('leaves sets older than the file, and sets from other sources, alone', async () => {
    await importText(sample, 'h1');
    const older = [
      'Date,Workout Name,Exercise Name,Set Order,Weight,Reps',
      '2018-01-01 10:00:00,Old,Squat (Barbell),1,100,5',
    ].join('\n');
    await importText(older, 'h2');

    // A file covering only 2019 onward must not reach the 2018 set.
    const parsed = parseFile(withDeletedSets);
    await commitImport(db, parsed, {
      fileName: 'newer.csv',
      fileHash: 'h3',
      updateChanged: true,
      sync: true,
    });
    expect(await db.sets.filter((s) => s.date.startsWith('2018')).count()).toBe(1);

    // Sets from a different source are never candidates.
    const other = parseFile(withDeletedSets);
    const preview = await previewImport(db, { ...other, source: 'hevy' }, 'h4');
    expect(preview.sync.toRemove).toHaveLength(0);
    expect(preview.sync.inScope).toBe(0);
  });

  it('undo restores removed sets', async () => {
    await importText(sample, 'h1');
    const synced = await commitImport(db, parseFile(withDeletedSets), {
      fileName: 'newer.csv',
      fileHash: 'h3',
      updateChanged: true,
      sync: true,
    });
    expect(await countRemovals(db, synced.id ?? -1)).toBe(2);

    await undoImport(db, synced.id ?? -1);
    expect(await db.sets.count()).toBe(9);
    expect(await db.sets.filter((s) => s.weight === 145).count()).toBe(1);
    expect(await countRemovals(db, synced.id ?? -1)).toBe(0);
    // The restored workout comes back with its sets.
    expect(await db.workouts.count()).toBe(2);
  });

  it('keeps sync removals in a backup round-trip', async () => {
    await importText(sample, 'h1');
    const synced = await commitImport(db, parseFile(withDeletedSets), {
      fileName: 'newer.csv',
      fileHash: 'h3',
      updateChanged: true,
      sync: true,
    });
    const backup = await exportBackup(db);
    await clearAllData(db, { keepSettings: false });
    await restoreBackup(db, JSON.parse(JSON.stringify(backup)) as Backup);
    await undoImport(db, synced.id ?? -1);
    expect(await db.sets.count()).toBe(9);
  });
});

describe('sync removing a whole workout', () => {
  /** Drops every set of the 2019-01-30 "Push" session. */
  const withoutPush = sample
    .split('\n')
    .filter((l) => !l.startsWith('2019-01-30'))
    .join('\n');

  it('undo restores the workout record along with its sets', async () => {
    await importText(sample, 'h1');
    expect(await db.workouts.count()).toBe(2);

    const synced = await commitImport(db, parseFile(withoutPush), {
      fileName: 'newer.csv',
      fileHash: 'h2',
      updateChanged: true,
      sync: true,
    });
    expect(synced.removed).toBe(4);
    expect(await db.workouts.count()).toBe(1);

    await undoImport(db, synced.id ?? -1);
    expect(await db.sets.count()).toBe(9);
    expect(await db.workouts.count()).toBe(2);
    const push = await db.workouts.get('2019-01-30T18:02:00|Push');
    expect(push?.durationSec).toBe(3300);
  });
});

describe('meta flags', () => {
  it('default to false and survive a settings save', async () => {
    expect(await readFlag(db, 'sampleRemoved')).toBe(false);
    await writeFlag(db, 'sampleRemoved', true);
    await saveSettings(db, { defaultUnit: 'kg' });
    expect(await readFlag(db, 'sampleRemoved')).toBe(true);
    expect((await loadSettings(db)).defaultUnit).toBe('kg');
  });
});

describe('mapping profiles', () => {
  const profile = {
    name: 'Hevy',
    signature: 'date|exercise|reps|weight',
    map: { date: 'start_time', exercise: 'exercise_title' },
    unit: 'kg' as const,
    dateOrder: 'ymd' as const,
  };

  it('saves, finds and replaces by layout signature', async () => {
    const saved = await saveProfile(db, profile);
    expect(saved.id).toBeGreaterThan(0);
    expect((await findProfile(db, profile.signature))?.name).toBe('Hevy');

    const renamed = await saveProfile(db, { ...profile, name: 'Hevy export' });
    expect(renamed.id).toBe(saved.id);
    expect(renamed.createdAt).toBe(saved.createdAt);
    expect(await db.profiles.count()).toBe(1);
    expect(await findProfile(db, 'something else')).toBeNull();
  });

  it('survives a data clear but not a full reset, and round-trips in a backup', async () => {
    await saveProfile(db, profile);
    await clearAllData(db, { keepSettings: true });
    expect(await db.profiles.count()).toBe(1);

    const backup = await exportBackup(db);
    await clearAllData(db, { keepSettings: false });
    expect(await db.profiles.count()).toBe(0);

    await restoreBackup(db, JSON.parse(JSON.stringify(backup)) as Backup);
    expect((await listProfiles(db))[0]?.name).toBe('Hevy');
  });
});

describe('rename and merge exercises', () => {
  it('renames an exercise and carries its sets across', async () => {
    await importText(sample, 'h1');
    const before = await db.sets.filter((s) => s.exercise === 'Running').count();

    const result = await renameExercise(db, 'Running', 'Treadmill Run');
    expect(result).toEqual({ moved: before, merged: false });
    expect(await db.exercises.get('Running')).toBeUndefined();
    expect(await db.exercises.get('Treadmill Run')).toBeTruthy();
    expect(await db.sets.filter((s) => s.exercise === 'Running').count()).toBe(0);
    expect(await db.sets.filter((s) => s.exercise === 'Treadmill Run').count()).toBe(before);
  });

  it('merges into an existing exercise without key collisions', async () => {
    await importText(sample, 'h1');
    const bench = await db.sets.filter((s) => s.exercise === 'Bench Press (Barbell)').count();
    const rows = await db.sets.filter((s) => s.exercise === 'Bent Over Row (Dumbbell)').count();

    const result = await renameExercise(db, 'Bent Over Row (Dumbbell)', 'Bench Press (Barbell)');
    expect(result.merged).toBe(true);
    expect(await db.sets.filter((s) => s.exercise === 'Bench Press (Barbell)').count()).toBe(
      bench + rows,
    );
    const keys = (await db.sets.toArray()).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('re-importing the old name follows the rename instead of recreating it', async () => {
    await importText(sample, 'h1');
    await renameExercise(db, 'Running', 'Treadmill Run');

    const parsed = applyAliases(parseFile(sample), await aliasMap(db));
    expect(parsed.exercises.map((e) => e.name)).toContain('Treadmill Run');
    expect(parsed.exercises.map((e) => e.name)).not.toContain('Running');

    // And the renamed sets are recognised as already stored.
    const preview = await previewImport(db, parsed, 'h2');
    expect(preview.plan.toAdd).toHaveLength(0);
    await commitImport(db, parsed, { fileName: 'again.csv', fileHash: 'h2', updateChanged: true });
    expect(await db.exercises.get('Running')).toBeUndefined();
  });

  it('refuses a no-op rename', async () => {
    await importText(sample, 'h1');
    expect(await renameExercise(db, 'Running', 'Running')).toEqual({ moved: 0, merged: false });
    expect(await renameExercise(db, 'Running', '  ')).toEqual({ moved: 0, merged: false });
  });
});

describe('provenance', () => {
  const otherApp = [
    'Date,Workout,Exercise,Weight,Reps',
    '2020-05-01 09:00:00,Push,Barbell Bench Press,80,5',
  ].join('\n');

  const importOther = async (hash: string) => {
    const csv = readCsv(otherApp);
    const parsed = parseMapped(csv.rows, {
      map: guessMapping(csv.headers),
      unit: 'kg',
      dateOrder: 'ymd',
      source: 'custom:other',
    });
    return commitImport(db, parsed, { fileName: 'other.csv', fileHash: hash, updateChanged: true });
  };

  it('records the source and original name on every set, workout and exercise', async () => {
    const record = await importText(sample, 'h1');
    const set = await db.sets.filter((s) => s.exercise === 'Running').first();
    expect(set).toMatchObject({
      originSource: 'strong',
      originName: 'Running',
      originImportId: record.id,
    });
    const workout = await db.workouts.get('2019-01-30T18:02:00|Push');
    expect(workout).toMatchObject({ originSource: 'strong', originName: 'Push' });
    expect((await db.exercises.get('Running'))?.origins).toEqual([
      { source: 'strong', name: 'Running', importId: record.id, firstSeen: record.importedAt },
    ]);
  });

  it('keeps the first import as the origin when a later one updates the set', async () => {
    const first = await importText(sample, 'h1');
    const second = await importText(sample.replace('145.0,6.0', '145.0,7.0'), 'h2');
    const set = await db.sets.filter((s) => s.weight === 145).first();
    expect(set?.reps).toBe(7);
    expect(set?.importId).toBe(second.id);
    expect(set?.originImportId).toBe(first.id);
  });

  it('survives a rename: sets remember the name they arrived under', async () => {
    await importText(sample, 'h1');
    await renameExercise(db, 'Running', 'Treadmill Run');
    const set = await db.sets.filter((s) => s.exercise === 'Treadmill Run').first();
    expect(set?.originName).toBe('Running');
    expect(set?.originSource).toBe('strong');
  });

  it('keeps every source name after merging across sources', async () => {
    const strong = await importText(sample, 'h1');
    const other = await importOther('h2');

    await renameExercise(db, 'Barbell Bench Press', 'Bench Press (Barbell)');
    const merged = await db.exercises.get('Bench Press (Barbell)');
    expect(merged?.origins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'strong',
          name: 'Bench Press (Barbell)',
          importId: strong.id,
        }),
        expect.objectContaining({
          source: 'custom:other',
          name: 'Barbell Bench Press',
          importId: other.id,
        }),
      ]),
    );

    // Each set still points at the app and the name it came from.
    const bySource = new Map(
      (await db.sets.filter((s) => s.exercise === 'Bench Press (Barbell)').toArray()).map((s) => [
        s.originSource,
        s.originName,
      ]),
    );
    expect(bySource.get('strong')).toBe('Bench Press (Barbell)');
    expect(bySource.get('custom:other')).toBe('Barbell Bench Press');
  });

  it('does not duplicate an origin when the same file is imported twice', async () => {
    await importText(sample, 'h1');
    await importText(sample, 'h2');
    expect((await db.exercises.get('Running'))?.origins).toHaveLength(1);
  });
});
