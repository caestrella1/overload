import type { MuscleAssignment, Unit } from '../domain/types';
import {
  cell,
  contentHash,
  normalizeDate,
  parseDuration,
  parseMuscleList,
  parseNumber,
  parseUnit,
  setTypeFromLabel,
} from './common';
import { parseFlexibleDate, type DateOrder } from './dates';
import type { FieldMap } from './mapping';
import type { CsvRow, ParseResult, ParsedExercise, ParsedSet, ParsedWorkout } from './types';

export interface MappedOptions {
  map: FieldMap;
  /** Unit for weights, unless the file carries a unit column. */
  unit: Unit;
  dateOrder: DateOrder;
  /** Stable id for this layout, so repeat imports dedupe and sync against each other. */
  source: string;
}

/**
 * Parses any one-row-per-set CSV through a user-supplied column mapping. Same output as a
 * built-in importer, so dedupe, sync and everything downstream work unchanged.
 */
export function parseMapped(rows: CsvRow[], opts: MappedOptions): ParseResult {
  const { map } = opts;
  const workouts = new Map<string, ParsedWorkout>();
  const exercises = new Map<string, ParsedExercise>();
  const sets: ParsedSet[] = [];
  const blockIndex = new Map<string, number>();
  const occurrences = new Map<string, number>();
  const warnings: string[] = [];
  let skippedRows = 0;
  let badDates = 0;
  let missingExercise = 0;
  let restRows = 0;

  for (const row of rows) {
    const rawDate = cell(row, map.date ?? null);
    // An ISO date parses the same under any order; anything else follows the chosen one.
    const date = normalizeDate(rawDate) ?? parseFlexibleDate(rawDate, opts.dateOrder);
    const exercise = cell(row, map.exercise ?? null);
    if (!date || !exercise) {
      if (!date) badDates++;
      else missingExercise++;
      skippedRows++;
      continue;
    }

    const label = cell(row, map.setOrder ?? null);
    if (label && /rest/i.test(label)) {
      restRows++;
      skippedRows++;
      continue;
    }

    const workoutName = cell(row, map.workout ?? null) || 'Workout';
    const workoutKey = `${date}|${workoutName}`;
    let workout = workouts.get(workoutKey);
    if (!workout) {
      workout = {
        key: workoutKey,
        date,
        name: workoutName,
        durationSec: parseDuration(cell(row, map.duration ?? null)),
        notes: null,
      };
      workouts.set(workoutKey, workout);
    }
    const workoutNotes = cell(row, map.workoutNotes ?? null);
    if (workoutNotes && !workout.notes) workout.notes = workoutNotes;

    const blockKey = `${workoutKey}|${exercise}`;
    const setIndex = (blockIndex.get(blockKey) ?? 0) + 1;
    blockIndex.set(blockKey, setIndex);
    // Without a set column, position within the exercise block is the set number.
    const setLabel = label || String(setIndex);

    let ex = exercises.get(exercise);
    if (!ex) {
      ex = { name: exercise };
      exercises.set(exercise, ex);
    }
    const rowUnit = parseUnit(cell(row, map.weightUnit ?? null));
    ex.unit ??= rowUnit ?? opts.unit;
    if (map.muscles && !ex.muscles) {
      const primary = parseMuscleList(cell(row, map.muscles));
      if (primary.length) {
        const muscles: MuscleAssignment = {
          primary,
          secondary: parseMuscleList(cell(row, map.secondaryMuscles ?? null)).filter(
            (m) => !primary.includes(m),
          ),
        };
        ex.muscles = muscles;
      }
    }

    const identity = `${date}|${exercise}|${setLabel}`;
    const occurrence = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, occurrence);

    const distance = parseNumber(cell(row, map.distance ?? null));
    const seconds = parseNumber(cell(row, map.seconds ?? null));
    const base = {
      setType: setTypeFromLabel(setLabel) ?? ('normal' as const),
      weight: parseNumber(cell(row, map.weight ?? null)),
      reps: parseNumber(cell(row, map.reps ?? null)),
      distance: distance === 0 ? null : distance,
      seconds: seconds === 0 ? null : seconds,
      rpe: parseNumber(cell(row, map.rpe ?? null)),
      notes: cell(row, map.notes ?? null) || null,
    };
    sets.push({
      ...base,
      key: `${identity}|${occurrence}`,
      contentHash: contentHash(base),
      workoutKey,
      date,
      exercise,
      setLabel,
      setIndex,
    });
  }

  if (badDates) {
    warnings.push(
      `${badDates} row(s) skipped: the date column could not be read. Check the date format.`,
    );
  }
  if (missingExercise) warnings.push(`${missingExercise} row(s) skipped: no exercise name.`);
  if (restRows) warnings.push(`${restRows} rest row(s) ignored.`);
  if (!sets.length) {
    warnings.push('No sets could be read from this file with the current mapping.');
  }

  return {
    source: opts.source,
    workouts: [...workouts.values()],
    sets,
    exercises: [...exercises.values()],
    rowCount: rows.length,
    skippedRows,
    warnings,
  };
}
