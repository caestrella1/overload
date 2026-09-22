import type { MuscleAssignment, Unit } from '../domain/types';
import {
  cell,
  contentHash,
  headerLookup,
  normalizeDate,
  parseDuration,
  parseMuscleList,
  parseNumber,
  parseUnit,
  setTypeFromLabel,
} from './common';
import type {
  CsvRow,
  Importer,
  ParseResult,
  ParsedExercise,
  ParsedSet,
  ParsedWorkout,
} from './types';

/**
 * Strong (iOS/Android) CSV export.
 *
 * Current format:
 *   Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
 * Older exports use ";" with "Weight Unit", "Distance Unit" and "Workout Duration" columns.
 * Newer exports may label sets "W"/"D"/"F" and include "Rest Timer" rows.
 */
export const strongImporter: Importer = {
  id: 'strong',
  label: 'Strong',
  detect(headers) {
    const h = headerLookup(headers);
    return !!(h('Date') && h('Exercise Name') && h('Set Order') && h('Workout Name'));
  },
  parse(rows, headers) {
    return parseStrong(rows, headers);
  },
};

function parseStrong(rows: CsvRow[], headers: string[]): ParseResult {
  const h = headerLookup(headers);
  const col = {
    date: h('Date'),
    workout: h('Workout Name'),
    duration: h('Duration', 'Workout Duration'),
    exercise: h('Exercise Name'),
    setOrder: h('Set Order'),
    weight: h('Weight'),
    weightUnit: h('Weight Unit'),
    reps: h('Reps'),
    distance: h('Distance'),
    seconds: h('Seconds'),
    notes: h('Notes'),
    workoutNotes: h('Workout Notes'),
    rpe: h('RPE'),
    muscles: h('Muscle Groups', 'Muscle Group', 'Primary Muscles', 'Muscles'),
    secondary: h('Secondary Muscles'),
  };

  const warnings: string[] = [];
  const workouts = new Map<string, ParsedWorkout>();
  const exercises = new Map<string, ParsedExercise>();
  const sets: ParsedSet[] = [];
  const blockIndex = new Map<string, number>();
  const occurrences = new Map<string, number>();
  const rowSeen = new Map<string, number>();
  let skippedRows = 0;
  let restRows = 0;
  let badDates = 0;
  const unknownLabels = new Set<string>();
  let identicalRows = 0;

  for (const row of rows) {
    const date = normalizeDate(cell(row, col.date));
    const exercise = cell(row, col.exercise);
    const label = cell(row, col.setOrder);
    if (!date || !exercise) {
      if (!date) badDates++;
      skippedRows++;
      continue;
    }
    if (/rest/i.test(label)) {
      restRows++;
      skippedRows++;
      continue;
    }
    const setType = setTypeFromLabel(label);
    if (!setType) {
      unknownLabels.add(label || '(blank)');
      skippedRows++;
      continue;
    }

    const rawRow = headers.map((hd) => row[hd] ?? '').join('\u0001');
    const seenCount = rowSeen.get(rawRow) ?? 0;
    if (seenCount > 0) identicalRows++;
    rowSeen.set(rawRow, seenCount + 1);

    const workoutName = cell(row, col.workout) || 'Workout';
    const workoutKey = `${date}|${workoutName}`;
    let workout = workouts.get(workoutKey);
    if (!workout) {
      workout = {
        key: workoutKey,
        date,
        name: workoutName,
        durationSec: parseDuration(cell(row, col.duration)),
        notes: null,
      };
      workouts.set(workoutKey, workout);
    }
    const wNotes = cell(row, col.workoutNotes);
    if (wNotes && !workout.notes) workout.notes = wNotes;

    let ex = exercises.get(exercise);
    if (!ex) {
      ex = { name: exercise };
      exercises.set(exercise, ex);
    }
    const unit: Unit | null = parseUnit(cell(row, col.weightUnit));
    if (unit && !ex.unit) ex.unit = unit;
    if (col.muscles && !ex.muscles) {
      const primary = parseMuscleList(cell(row, col.muscles));
      if (primary.length) {
        const muscles: MuscleAssignment = {
          primary,
          secondary: parseMuscleList(cell(row, col.secondary)).filter((m) => !primary.includes(m)),
        };
        ex.muscles = muscles;
      }
    }

    const blockKey = `${workoutKey}|${exercise}`;
    const setIndex = (blockIndex.get(blockKey) ?? 0) + 1;
    blockIndex.set(blockKey, setIndex);

    const identity = `${date}|${exercise}|${label}`;
    const occurrence = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, occurrence);

    const distance = parseNumber(cell(row, col.distance));
    const seconds = parseNumber(cell(row, col.seconds));
    const base = {
      setType,
      weight: parseNumber(cell(row, col.weight)),
      reps: parseNumber(cell(row, col.reps)),
      distance: distance === 0 ? null : distance,
      seconds: seconds === 0 ? null : seconds,
      rpe: parseNumber(cell(row, col.rpe)),
      notes: cell(row, col.notes) || null,
    };
    sets.push({
      ...base,
      key: `${identity}|${occurrence}`,
      contentHash: contentHash(base),
      workoutKey,
      date,
      exercise,
      setLabel: label,
      setIndex,
    });
  }

  if (badDates) warnings.push(`${badDates} row(s) skipped: missing or unreadable date.`);
  if (restRows) warnings.push(`${restRows} rest-timer row(s) ignored.`);
  if (unknownLabels.size) {
    warnings.push(`Rows with unknown set labels skipped: ${[...unknownLabels].join(', ')}.`);
  }
  if (identicalRows) {
    warnings.push(
      `${identicalRows} row(s) are exact copies of another row in this file. They were kept as separate sets; use Data → Find duplicates if they're mistakes.`,
    );
  }

  return {
    source: 'strong',
    workouts: [...workouts.values()],
    sets,
    exercises: [...exercises.values()],
    rowCount: rows.length,
    skippedRows,
    warnings,
  };
}
