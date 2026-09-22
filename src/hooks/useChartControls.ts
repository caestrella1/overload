import { rangeStart, type Bucket, type RangePreset } from '../domain/dates';
import { usePref } from './usePref';

/**
 * Date range + grouping state for a chart page, remembered per `scope`.
 * `start` is the earliest date (inclusive) for the chosen range, or null for all time.
 */
export function useChartControls(scope: string, defaults: { range: RangePreset; bucket: Bucket }) {
  const [range, setRange] = usePref<RangePreset>(`${scope}.range`, defaults.range);
  const [bucket, setBucket] = usePref<Bucket>(`${scope}.bucket`, defaults.bucket);
  return { range, setRange, bucket, setBucket, start: rangeStart(range) };
}
