import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../db/db';
import { commitImport, readFlag, undoImport, writeFlag } from '../db/repo';
import { SAMPLE_FILE_NAME } from '../demo/sampleName';
import { parseFile } from '../importers';
import { sha256 } from '../lib/hash';
import { readPref, writePref } from '../lib/storage';

/** Set once the sample has been removed, so it is never seeded back in. */
const SAMPLE_REMOVED = 'sampleRemoved';

/**
 * Auto-seeding is for a first visit only: never after the sample was removed, and never
 * over existing data. The flag lives in IndexedDB beside the data, so it holds up in
 * browsers that block localStorage.
 */
export async function shouldSeedSample(): Promise<boolean> {
  if (await readFlag(db, SAMPLE_REMOVED)) return false;
  return (await db.sets.count()) === 0;
}

/** Generates and imports the sample export through the normal import pipeline. */
export async function importSampleData() {
  const { generateSampleCsv } = await import('../demo/sampleData');
  const text = generateSampleCsv();
  return commitImport(db, parseFile(text), {
    fileName: SAMPLE_FILE_NAME,
    fileHash: await sha256(text),
    updateChanged: true,
  });
}

/** The import record for loaded sample data, if any, plus a way to remove it. */
export function useSampleImport() {
  const record = useLiveQuery(
    () => db.imports.filter((r) => r.fileName === SAMPLE_FILE_NAME).first(),
    [],
  );
  const remove = async () => {
    if (record?.id == null) return 0;
    const removed = await undoImport(db, record.id);
    await writeFlag(db, SAMPLE_REMOVED, true);
    return removed;
  };
  return { record, remove };
}

/**
 * Demo builds (VITE_DEMO=1) load sample data on a visitor's first open so the app shows
 * something immediately. Runs once per browser; removing the sample doesn't re-seed it.
 */
export function useDemoSeed() {
  useEffect(() => {
    if (import.meta.env.VITE_DEMO !== '1' || readPref<boolean>('demo.seeded', false)) return;
    writePref('demo.seeded', true);
    void shouldSeedSample().then((seed) => (seed ? importSampleData() : undefined));
  }, []);
}
