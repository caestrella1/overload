/**
 * Date parsing for files that are not Strong exports. Fitness apps write dates every way
 * imaginable, so the order of day and month is detected where possible and chosen by the
 * user where it is genuinely ambiguous.
 */

export type DateOrder = 'ymd' | 'dmy' | 'mdy';

export interface DateDetection {
  order: DateOrder;
  /** True when day-first and month-first both fit the sample, so the user must decide. */
  ambiguous: boolean;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const pad = (n: number) => String(n).padStart(2, '0');

function assemble(
  y: number,
  m: number,
  d: number,
  h: number,
  mi: number,
  s: number,
): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const year = y < 100 ? 2000 + y : y;
  return `${year}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
}

function parseTime(raw: string): { h: number; mi: number; s: number } {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i.exec(raw);
  if (!m) return { h: 0, mi: 0, s: 0 };
  let h = Number(m[1]);
  const meridiem = m[4]?.toLowerCase();
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  return { h, mi: Number(m[2]), s: Number(m[3] ?? 0) };
}

/** Pulls the three date numbers out of a value, ignoring any time that follows. */
function dateParts(raw: string): [number, number, number] | null {
  const named =
    /(\d{1,2})[\s-]*([a-z]{3,})[a-z]*[\s,-]+(\d{2,4})|([a-z]{3,})[a-z]*[\s-]+(\d{1,2})[\s,-]+(\d{2,4})/i.exec(
      raw,
    );
  if (named) {
    const month = MONTHS.indexOf((named[2] ?? named[4] ?? '').slice(0, 3).toLowerCase());
    if (month >= 0) {
      const day = Number(named[1] ?? named[5]);
      const year = Number(named[3] ?? named[6]);
      return [year, month + 1, day];
    }
  }
  const m = /(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/.exec(raw);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Parses a date cell into a local "YYYY-MM-DDTHH:mm:ss" string, the form the rest of the
 * app stores. Returns null when the value cannot be read.
 */
export function parseFlexibleDate(raw: string, order: DateOrder = 'ymd'): string | null {
  const value = raw.trim();
  if (!value) return null;

  // Unix timestamps, in seconds or milliseconds.
  if (/^\d{10}$/.test(value) || /^\d{13}$/.test(value)) {
    const d = new Date(Number(value) * (value.length === 10 ? 1000 : 1));
    if (Number.isNaN(d.getTime())) return null;
    return assemble(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    );
  }

  const parts = dateParts(value);
  if (!parts) return null;
  const [a, b, c] = parts;
  // Dates never contain a colon, so any clock time in the value is the time part.
  const { h, mi, s } = parseTime(value);

  // A four-digit leading number is unambiguous, whatever the chosen order.
  if (a > 31) return assemble(a, b, c, h, mi, s);
  if (c > 31 || String(c).length === 4) {
    if (order === 'dmy') return assemble(c, b, a, h, mi, s);
    if (order === 'mdy') return assemble(c, a, b, h, mi, s);
    // A named month already resolved to [year, month, day].
    return assemble(a, b, c, h, mi, s) ?? assemble(c, b, a, h, mi, s);
  }
  return assemble(c, b, a, h, mi, s);
}

/** Works out day-first versus month-first from real values in the file. */
export function detectDateOrder(samples: string[]): DateDetection {
  let sawYearFirst = false;
  let firstOver12 = false;
  let secondOver12 = false;

  for (const raw of samples) {
    const parts = dateParts(raw.trim());
    if (!parts) continue;
    const [a, b] = parts;
    if (a > 31) {
      sawYearFirst = true;
      continue;
    }
    if (a > 12) firstOver12 = true;
    if (b > 12) secondOver12 = true;
  }

  if (firstOver12) return { order: 'dmy', ambiguous: false };
  if (secondOver12) return { order: 'mdy', ambiguous: false };
  if (sawYearFirst) return { order: 'ymd', ambiguous: false };
  // Nothing in the sample separates the two readings; the user has to choose.
  return { order: 'mdy', ambiguous: true };
}
