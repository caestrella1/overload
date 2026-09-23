# Overload

Track progressive overload from your lifting logs. It's a frontend-only React app. Data lives in your browser's IndexedDB, with no backend and no uploads.

## Features

- **Import**: Strong CSV exports, both the current format and the older `;`-delimited one with unit columns. Parsing runs in the browser.
- **Any other CSV**: a file the app doesn't recognise opens a column mapper instead of being rejected. Columns are guessed from their names, the day/month order is detected from the file's own dates, and the unit is read from the weight column when it names one. Everything is previewed against real rows before it's stored, and the mapping is saved for next time. One-row-per-workout layouts are detected and refused rather than imported wrongly.
- **Dedupe**:
  - Every set gets an identity key (workout time + exercise + set label + occurrence) and a content hash. Re-importing a full export adds only new sets.
  - Sets edited in Strong since your last import are detected, and you choose whether to replace the stored values.
  - Importing a byte-identical file again shows a warning.
  - Rows that appear more than once within the same file are flagged.
  - Settings → Find duplicates scans stored data for sets recorded twice.
- **Sync (optional, off by default)**: treats the export as the full truth for what it covers, so sets you deleted in Strong are deleted here too.
  - Scope: sets from the same import source, logged on or after the file's first set. Older history and data from other apps are never touched.
  - The preview lists every affected workout before anything is removed, and warns when the removals are a large share of the file — the usual sign of a partial export.
  - Undo puts removed sets back, along with any workout that lost all of its sets.
- **Import history**: every import can be undone.
- **Charts**:
  - Per exercise: est. 1RM, top weight, volume, reps, sets, max reps, RPE, distance and duration, by session, week or month.
  - PR history for each exercise.
  - Muscle groups: sets or volume per region (stacked) and per muscle.
  - Compare up to 4 lifts, with an optional index-to-100 view.
  - Every chart has a table view.
- **Muscle groups**:
  - Groups from the import file are used as-is.
  - Otherwise they're suggested from two independent sources: a bundled catalogue of 868 exercises ([free-exercise-db](https://github.com/yuhonas/free-exercise-db), public domain) matched on the name, and our own keyword rules.
  - Each suggestion carries a confidence: **high** when both agree, **medium** when only one had something to say, **low** when they disagree — in which case the rules win and both readings are kept. Bulk accept only takes the confident ones.
  - Every exercise shows how its muscles were guessed, and you can edit any of them.
  - Precedence: set by you > from import > suggested.
- **Provenance**: every set, workout and exercise records the source it came from and the name that source used. Renaming or merging never erases it, so a merged exercise still lists each app's name for the movement.
- **Units**: default is lb and can be switched to kg. Each exercise can override the unit its weights were logged in. Totals across exercises are converted to the default unit.
- **Bodyweight**: log it on the dashboard, and lifts that carry your weight (pull-ups, dips, push-ups) report the load actually moved — bodyweight times the share the movement carries, plus what you added, or minus the assistance taken off. Each set uses the nearest earlier entry.
- **Assisted lifts** (e.g. `Pull Up (Assisted)`): with no bodyweight logged, lower weight counts as progress and they're left out of volume and e1RM. Once bodyweight is logged they become ordinary loads.
- **Rename and merge exercises**: renaming onto an existing name merges the two histories, re-keying sets so nothing collides. The old name is remembered, so later imports follow the rename.
- **Not moving lately**: lifts still in the rotation with no new estimated 1RM in over six weeks.
- **Warm-up sets** are excluded by default. You can include them in Settings.
- **Data controls**: JSON backup/restore, clear all data (optionally keeping preferences and customized exercises), and a request for persistent storage.
- **Installable**: ships as a PWA, so it can be installed on a phone and used offline in the gym.

## Development

```sh
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck + lint + format check + tests
npm test             # vitest
npm run build        # static build in dist/
```

Tooling: Vite, TypeScript (strict), ESLint (typescript-eslint strict type-checked, react-hooks), Prettier, Vitest with jsdom and fake-indexeddb.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. Before the first run, enable it under **Settings → Pages → Source: GitHub Actions**. The app uses hash routing, so deep links work on static hosting.

## Project layout

```
src/
  domain/     pure logic: types, metrics, muscle mapping, dates, units
  domain/catalog/  bundled exercise catalogue and the name matcher
  importers/  CSV parsing; one module per source, registered in importers/index.ts
  db/         Dexie schema and repository (import, undo, dedupe, backup, clear)
  components/ UI primitives and charts
  pages/      routes
```

### Updating the exercise catalogue

`node scripts/build-catalog.mjs` refetches [free-exercise-db](https://github.com/yuhonas/free-exercise-db) and rewrites `src/domain/catalog/catalog.json`, keeping the fields the matcher uses plus the short descriptive ones an exercise page shows — equipment, category, force, mechanic, level (about 19 KB gzipped). Instructions and images are dropped; the instructions alone are 570 KB. It fails if upstream introduces a muscle name we don't map.

The catalogue is a **classification** source only. Identity always stays with the name the import used, because name matching is not reliable enough to decide which sets belong together — a wrong match would silently fuse two lifts' histories.

The same caveat shapes the exercise page's reference card: the catalogue splits a movement into band, machine and barbell variants whose names score almost identically, so the card names the entry it matched, prefers your own logged equipment over the entry's, and says plainly when the muscle groups are still an unaccepted suggestion.

### Themes

`npm run build:themes` regenerates `src/themes.css` — the accent and the tinted neutrals for each of the seven themes. Every theme is a single OKLCH hue: the accent is that hue at full chroma, the surfaces and text are the same hue at a whisper of chroma, so the whole page carries the tint. Lightness is not fixed across hues (a yellow and a blue of equal OKLCH lightness differ wildly in luminance), so each value is searched until it clears its WCAG target against the surface it sits on. The script prints a contrast report and exits non-zero if any theme falls short, so `src/themes.css` is never hand-edited.

Chart series colours are deliberately not themed: they encode data identity and are validated for colour-vision deficiency as a set. Only `--chart-primary`, used where a chart draws a single series, follows the accent.

### Adding an import source

Most formats need no code: drop the CSV in and map its columns. Write an importer only for a format worth recognising automatically.

1. Implement `Importer` (`detect(headers)` and `parse(rows)`) in `src/importers/<source>.ts`.
2. Build set keys with `nextKey` from `src/domain/identity.ts`, and hash values with `contentHash` from `common.ts`.
3. Register it in `src/importers/index.ts`.

## Import model

Each set carries a stable identity (`date | exercise | set label | occurrence`) and a hash of its values, which is what makes repeat imports safe:

| In the source app          | On the next import                                                        |
| -------------------------- | ------------------------------------------------------------------------- |
| Nothing changed            | Skipped as already stored                                                 |
| Set edited                 | Offered as an update, on by default                                       |
| New workout logged         | Added                                                                     |
| Set or workout deleted     | Removed only if you turn sync on                                          |
| Workout start time changed | The old copy is removed only with sync on; without it, both copies remain |

Imports never delete anything unless sync is on, and sync only reaches sets from the same source at or after the file's first date.
