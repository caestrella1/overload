import { db } from '../db/db';
import { writeFlag } from '../db/repo';
import { SAMPLE_FILE_NAME } from '../demo/sampleName';
import { importSampleData, shouldSeedSample } from './useSampleData';

describe('sample data', () => {
  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it('imports through the normal pipeline, and only once', async () => {
    const first = await importSampleData();
    expect(first.fileName).toBe(SAMPLE_FILE_NAME);
    expect(first.added).toBeGreaterThan(1000);
    const again = await importSampleData();
    expect(again.added).toBe(0);
  });

  it('seeds only an empty database that has never had the sample removed', async () => {
    expect(await shouldSeedSample()).toBe(true);

    await importSampleData();
    expect(await shouldSeedSample()).toBe(false);

    // Removing the sample leaves the database empty but must not invite a re-seed.
    await db.sets.clear();
    await writeFlag(db, 'sampleRemoved', true);
    expect(await shouldSeedSample()).toBe(false);
  });
});
