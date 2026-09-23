import type { MuscleAssignment, MuscleGroup } from '../types';
import catalogData from './catalog.json';

export interface CatalogEntry {
  id: string;
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipment: string | null;
  /** strength, cardio, stretching, plyometrics, powerlifting, olympic weightlifting, strongman. */
  category: string | null;
  /** push, pull or static. */
  force: string | null;
  /** compound or isolation. */
  mechanic: string | null;
  /** beginner, intermediate or expert. */
  level: string | null;
}

interface CatalogFile {
  source: string;
  license: string;
  url: string;
  entries: CatalogEntry[];
}

export const CATALOG = catalogData as CatalogFile;

/**
 * Words that describe the tool rather than the movement. Matching on them pulls
 * "Cable Row" toward every other cable exercise, so they are weighed separately.
 */
const EQUIPMENT_WORDS = new Set([
  'barbell',
  'dumbbell',
  'db',
  'cable',
  'machine',
  'kettlebell',
  'kettlebells',
  'band',
  'bands',
  'smith',
  'bodyweight',
  'body',
  'only',
  'ez',
  'bar',
  'plate',
  'weighted',
  'lever',
  'sled',
]);

const STOP_WORDS = new Set(['the', 'with', 'a', 'to', 'and', 'of', 'on', 'in', 'for', 'your']);

/** Short forms people type that token matching would otherwise never resolve. */
const ABBREVIATIONS: Record<string, string> = {
  rdl: 'romanian deadlift',
  ohp: 'overhead press',
  bb: 'barbell',
  db: 'dumbbell',
  kb: 'kettlebell',
  bw: 'bodyweight',
  sldl: 'stiff leg deadlift',
  bosu: 'bosu ball',
  tricep: 'triceps',
  bicep: 'biceps',
  pulldown: 'pull down',
  pushdown: 'push down',
  pullup: 'pull up',
  chinup: 'chin up',
  pushup: 'push up',
  situp: 'sit up',
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(text: string, dropEquipment: boolean): Set<string> {
  const out = new Set<string>();
  for (const raw of normalize(text).split(' ')) {
    if (!raw || STOP_WORDS.has(raw)) continue;
    for (const word of (ABBREVIATIONS[raw] ?? raw).split(' ')) {
      if (dropEquipment && EQUIPMENT_WORDS.has(word)) continue;
      out.add(word);
    }
  }
  return out;
}

/** Strong-style "Bench Press (Barbell)" splits into movement and equipment. */
export function splitName(name: string): { base: string; equipment: string } {
  const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(name.trim());
  return match?.[1] ? { base: match[1], equipment: match[2] ?? '' } : { base: name, equipment: '' };
}

function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return (2 * shared) / (a.size + b.size);
}

const INDEX = CATALOG.entries.map((entry) => ({
  entry,
  words: words(entry.name, true),
  equipment: normalize(entry.equipment ?? ''),
}));

export interface CatalogMatch {
  entry: CatalogEntry;
  /** 0-1 similarity of the movement words. */
  score: number;
  /** Share of the top candidates that agree on the primary muscles. */
  agreement: number;
}

const CANDIDATES = 5;
/** Below this the best candidate is noise rather than a near miss. */
const FLOOR = 0.5;

/**
 * Best catalogue entry for an imported exercise name, with how much the runners-up
 * agree with it. Agreement matters because the catalogue splits movements by grip and
 * band: landing on the wrong bench press variant is harmless, but a lone confident-looking
 * match with no support behind it usually means the name was misread.
 */
export function matchCatalog(name: string): CatalogMatch | null {
  const { base, equipment } = splitName(name);
  const query = words(base, true);
  if (!query.size) return null;
  const wantedEquipment = normalize(equipment);

  const scored = INDEX.map(({ entry, words: entryWords, equipment: entryEquipment }) => {
    let score = dice(query, entryWords);
    if (wantedEquipment && entryEquipment) {
      const agrees =
        wantedEquipment.includes(entryEquipment) || entryEquipment.includes(wantedEquipment);
      score += agrees ? 0.08 : -0.05;
    }
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < FLOOR) return null;

  const top = scored.slice(0, CANDIDATES);
  const key = (e: CatalogEntry) => e.primary.join('+');
  const agreeing = top.filter((c) => key(c.entry) === key(best.entry)).length;

  return { entry: best.entry, score: best.score, agreement: agreeing / top.length };
}

/** Strong evidence: a close name match with its runners-up behind it. */
const STRONG_SCORE = 0.8;
const STRONG_AGREEMENT = 0.6;

export function isStrongMatch(match: CatalogMatch): boolean {
  return match.score >= STRONG_SCORE && match.agreement >= STRONG_AGREEMENT;
}

export function catalogMuscles(entry: CatalogEntry): MuscleAssignment {
  return { primary: [...entry.primary], secondary: [...entry.secondary] };
}
