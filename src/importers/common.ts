import { normalizeMuscleName } from '../domain/muscles';
import type { MuscleGroup, SetType, Unit } from '../domain/types';
import { fnv1a } from '../lib/hash';
import type { CsvRow, ParsedSet } from './types';

/** Finds the first header matching any alias, case/space-insensitively. */
export function headerLookup(headers: string[]) {
  const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
  const map = new Map(headers.map((h) => [norm(h), h]));
  return (...aliases: string[]): string | null => {
    for (const a of aliases) {
      const h = map.get(norm(a));
      if (h) return h;
    }
    return null;
  };
}

export function cell(row: CsvRow, header: string | null): string {
  if (!header) return '';
  return (row[header] ?? '').trim();
}

export function parseNumber(raw: string): number | null {
  if (!raw) return null;
  // Tolerate decimal commas from some locales.
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "1h 1m", "45m", "30s", "1:02:03" -> seconds. */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) {
    return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
  }
  let total = 0;
  let matched = false;
  for (const [, num, unit] of s.matchAll(/(\d+(?:\.\d+)?)\s*(h|m|s)/g)) {
    matched = true;
    total += Number(num) * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1);
  }
  if (matched) return Math.round(total);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "2019-01-28 12:24:23" -> "2019-01-28T12:24:23". Returns null when unparseable. */
export function normalizeDate(raw: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  if (m) return `${m[1]}T${m[2]}:${m[3]}:${m[4] ?? '00'}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return `${raw.trim()}T00:00:00`;
  return null;
}

export function parseUnit(raw: string): Unit | null {
  const s = raw.trim().toLowerCase();
  if (s === 'kg' || s === 'kgs') return 'kg';
  if (s === 'lb' || s === 'lbs') return 'lb';
  return null;
}

/** Parses "Chest, Triceps" / "Chest; Triceps" / "Chest/Triceps" into known groups. */
export function parseMuscleList(raw: string): MuscleGroup[] {
  return raw
    .split(/[,;/|]/)
    .map((p) => normalizeMuscleName(p))
    .filter((g): g is MuscleGroup => g != null);
}

export function setTypeFromLabel(label: string): SetType | null {
  if (/^\d+$/.test(label)) return 'normal';
  const l = label.toLowerCase();
  if (l === 'w' || l === 'warmup' || l === 'warm-up' || l === 'warm up') return 'warmup';
  if (l === 'd' || l === 'drop' || l === 'dropset' || l === 'drop set') return 'drop';
  if (l === 'f' || l === 'failure') return 'failure';
  return null;
}

export function contentHash(
  s: Pick<ParsedSet, 'weight' | 'reps' | 'distance' | 'seconds' | 'rpe' | 'notes' | 'setType'>,
): string {
  return fnv1a(
    [s.setType, s.weight, s.reps, s.distance, s.seconds, s.rpe, s.notes ?? ''].join('|'),
  );
}
