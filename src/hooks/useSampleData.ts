import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../db/db';
import { commitImport, undoImport } from '../db/repo';
import { SAMPLE_FILE_NAME } from '../demo/sampleName';
import { parseFile } from '../importers';
import { sha256 } from '../lib/hash';
import { readPref, writePref } from '../lib/storage';

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
  const remove = () => (record?.id != null ? undoImport(db, record.id) : Promise.resolve(0));
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
    void db.sets.count().then((n) => (n === 0 ? importSampleData() : undefined));
  }, []);
}
