import { db } from '../db/db';
import { SAMPLE_FILE_NAME } from '../demo/sampleName';
import { importSampleData } from './useSampleData';

describe('importSampleData', () => {
  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it('imports the sample through the normal pipeline, and only once', async () => {
    const first = await importSampleData();
    expect(first.fileName).toBe(SAMPLE_FILE_NAME);
    expect(first.added).toBeGreaterThan(1000);
    const again = await importSampleData();
    expect(again.added).toBe(0);
  });
});
