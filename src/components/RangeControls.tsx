import type { Bucket, RangePreset } from '../domain/dates';
import { RANGE_PRESETS } from '../domain/dates';
import { Segmented } from './ui';

const BUCKET_OPTIONS: { id: Bucket; label: string }[] = [
  { id: 'session', label: 'Session' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function RangeControls({
  range,
  onRange,
  bucket,
  onBucket,
  buckets = BUCKET_OPTIONS,
}: {
  range: RangePreset;
  onRange: (r: RangePreset) => void;
  bucket?: Bucket;
  onBucket?: (b: Bucket) => void;
  buckets?: { id: Bucket; label: string }[];
}) {
  return (
    <>
      {bucket && onBucket && (
        <Segmented label="Group by" value={bucket} onChange={onBucket} options={buckets} />
      )}
      <Segmented label="Date range" value={range} onChange={onRange} options={RANGE_PRESETS} />
    </>
  );
}
