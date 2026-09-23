/** Dates are stored as local "YYYY-MM-DDTHH:mm:ss" strings, exactly as logged. */

export type Bucket = 'session' | 'week' | 'month';

export function parseLocal(date: string): Date {
  const [d = '', t = ''] = date.split('T');
  const [y = 1970, mo = 1, da = 1] = d.split('-').map(Number);
  const [h = 0, mi = 0, s = 0] = t.split(':').map(Number);
  return new Date(y, mo - 1, da, h, mi, s);
}

export function toLocalString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function dayKey(date: string): string {
  return date.slice(0, 10);
}

/** Monday of the week containing `date`, as "YYYY-MM-DD". */
export function weekKey(date: string): string {
  const d = parseLocal(dayKey(date));
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return dayKey(toLocalString(d));
}

export function monthKey(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function bucketKey(date: string, bucket: Bucket): string {
  if (bucket === 'week') return weekKey(date);
  if (bucket === 'month') return monthKey(date);
  return date;
}

export function formatDate(date: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseLocal(date).toLocaleDateString(
    undefined,
    opts ?? { year: 'numeric', month: 'short', day: 'numeric' },
  );
}

export function formatPeriod(key: string, bucket: Bucket): string {
  if (bucket === 'month') return formatDate(key, { year: 'numeric', month: 'short' });
  if (bucket === 'week') return `Wk of ${formatDate(key)}`;
  return formatDate(key);
}

export type RangePreset = '3m' | '6m' | '1y' | '2y' | 'all';

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: '2y', label: '2Y' },
  { id: 'all', label: 'All' },
];

/** Earliest date (inclusive) for a preset, relative to `now`; null means unbounded. */
export function rangeStart(preset: RangePreset, now: Date = new Date()): string | null {
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24, all: 0 }[preset];
  if (!months) return null;
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return toLocalString(d);
}
