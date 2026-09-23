/**
 * Regenerates the bundled exercise catalogue from free-exercise-db.
 *
 *   node scripts/build-catalog.mjs
 *
 * Upstream is public domain (Unlicense), so the data ships with the app and needs no
 * attribution or network access at runtime. Kept are the fields the matcher uses plus the
 * short descriptive ones the app shows on an exercise. Instructions and images are dropped:
 * the instructions alone are 570 KB, more than the whole app bundle.
 */
import { writeFileSync } from 'node:fs';

const SOURCE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUT = new URL('../src/domain/catalog/catalog.json', import.meta.url);

/** Upstream muscle names mapped onto our own groups. */
const MUSCLES = {
  abdominals: 'Abs',
  abductors: 'Abductors',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  lats: 'Lats',
  'lower back': 'Lower Back',
  'middle back': 'Upper Back',
  quadriceps: 'Quads',
  shoulders: 'Shoulders',
  traps: 'Traps',
  triceps: 'Triceps',
  // Upstream has no obliques (folded into abdominals) and no cardio muscle; its
  // `cardio` category supplies that instead. "neck" has no equivalent here.
  neck: null,
};

const mapMuscles = (names) => [...new Set((names ?? []).map((m) => MUSCLES[m]).filter(Boolean))];

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
const upstream = await res.json();

const unknown = new Set();
for (const e of upstream) {
  for (const m of [...(e.primaryMuscles ?? []), ...(e.secondaryMuscles ?? [])]) {
    if (!(m in MUSCLES)) unknown.add(m);
  }
}
if (unknown.size) throw new Error(`Unmapped upstream muscles: ${[...unknown].join(', ')}`);

const entries = upstream
  .map((e) => ({
    id: e.id,
    name: e.name,
    primary: mapMuscles(e.primaryMuscles),
    secondary: mapMuscles(e.secondaryMuscles).filter(
      (m) => !mapMuscles(e.primaryMuscles).includes(m),
    ),
    equipment: e.equipment ?? null,
    category: e.category ?? null,
    force: e.force ?? null,
    mechanic: e.mechanic ?? null,
    level: e.level ?? null,
  }))
  // An entry with no usable muscles can only mislead the matcher.
  .filter((e) => e.primary.length || e.category === 'cardio')
  .sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(
  OUT,
  `${JSON.stringify({ source: 'free-exercise-db', license: 'Unlicense', url: SOURCE, entries }, null, 0)}\n`,
);
console.log(`${entries.length} entries written (${upstream.length} upstream)`);
